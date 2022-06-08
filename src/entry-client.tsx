// 客户端入口文件
import React from "react"
import ReactDOM from "react-dom"
import "./index.css"
import App from "./App"

// 水合服务端预取的数据
// @ts-ignore
const data = window.__SSR_DATA__

ReactDOM.hydrate(
  <React.StrictMode>
    <App data={data} />
  </React.StrictMode>,
  document.getElementById("root")
)

async function fetchData() {
  // 客户端获取数据
}

async function hydrate() {
  let data
  if (window.__SSR_DATA__) {
    data = window.__SSR_DATA__
  } else {
    // 降级逻辑
    data = await fetchData()
  }
}
