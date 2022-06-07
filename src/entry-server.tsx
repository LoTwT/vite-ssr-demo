// 导出 SSR 组件入口
import App from "./App"
import "./index.css"

function ServerEntry(props: any) {
  return <App />
}

export { ServerEntry }

// 获取数据函数，实现服务端的数据预取
export async function fetchData() {
  return { user: "pre-fetch user" }
}
