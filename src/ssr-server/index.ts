// 后端服务
import express, { RequestHandler, Express } from "express"
import { ViteDevServer } from "vite"
import path from "node:path"
import { renderToString } from "react-dom/server"
import React from "react"
import fs from "node:fs"
import serve from "serve-static"

const isProd = process.env.NODE_ENV === "production"
const cwd = process.cwd()

// 加载服务端入口模块
async function loadSsrEntryModule(vite: ViteDevServer | null) {
  // 生产模式下直接 require 打包后的产物
  if (isProd) {
    const entryPath = path.join(cwd, "dist/server/entry-server.js")
    return require(entryPath)
  }
  // 开发环境下通过 no-bundle 方式加载
  else {
    const entryPath = path.join(cwd, "src/entry-server.tsx")
    return vite?.ssrLoadModule(entryPath)
  }
}

function resolveTemplatePath() {
  return path.join(cwd, isProd ? "dist/client/index.html" : "index.html")
}

// 过滤出页面请求
function matchPageUrl(url: string) {
  if (url === "/") return true
  return false
}

async function createSsrMiddleware(app: Express): Promise<RequestHandler> {
  let vite: ViteDevServer | null = null

  if (!isProd) {
    vite = await (
      await import("vite")
    ).createServer({
      root: cwd,
      server: {
        middlewareMode: "ssr",
      },
    })

    // 注册 Vite Middlewares
    // 主要用来处理客户端资源
    app.use(vite.middlewares)
  }

  return async (req, res, next) => {
    try {
      // 跳过 SSR
      if (req.query?.csr) {
        // 响应 CSR 模板内容
        return
      }

      const url = req.originalUrl

      if (!matchPageUrl(url)) {
        // 走静态资源的处理
        return await next()
      }

      // SSR 的逻辑
      // 1. 加载服务端入口模块
      const { ServerEntry, fetchData } = await loadSsrEntryModule(vite)

      // 2. 数据预取
      const data = await fetchData()

      // 3. 渲染组件
      const appHtml = renderToString(React.createElement(ServerEntry, { data }))

      // 4. 拼接 HTML 返回响应
      const templatePath = resolveTemplatePath()
      let template = fs.readFileSync(templatePath, "utf-8")

      // 开发模式下需要注入 HMR 、环境变量相关代码，因此需要调用 vite.transformIndexHtml
      if (!isProd && vite) {
        template = await vite.transformIndexHtml(url, template)
      }

      const html = template
        .replace("<!-- SSR_APP -->", appHtml)
        // 注入数据标签，用于客户端 hydrate
        .replace(
          "<!-- SSR_DATA -->",
          `<script>window.__SSR_DATA__=${JSON.stringify(data)}</script>`
        )

      res.status(200).setHeader("Content-Type", "text/html").end(html)
    } catch (e: any) {
      vite?.ssrFixStacktrace(e)
      console.error(e)
      res.status(500).end(e.message)
      // 服务器执行出错，返回浏览器 CSR 模板内容
    }
  }
}

async function createServer() {
  const app = express()

  // 加入 Vite SSR 中间件
  app.use(await createSsrMiddleware(app))

  // 注册中间件，生产环境端处理客户端资源
  if (isProd) {
    app.use(serve(path.join(cwd, "dist/client")))
  }

  app.listen(3000, () => {
    console.log(`server is running at http://localhost:3000`)
  })
}

createServer()
