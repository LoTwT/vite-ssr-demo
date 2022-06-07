// 后端服务
import express from "express"

async function createServer() {
  const app = express()

  app.listen(3000, () => {
    console.log(`server is running at http://localhost:3000`)
  })
}

createServer()
