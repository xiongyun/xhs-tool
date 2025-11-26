import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// --- 样式修复补丁 ---
// 在应用启动前，强制注入 Tailwind CSS 引擎
// 这能解决因样式加载失败导致的“版式混乱”
(function forceLoadTailwind() {
  // 如果已经有了，就不重复加载
  if (document.getElementById('tailwind-cdn')) return;
  
  const script = document.createElement('script');
  script.id = 'tailwind-cdn';
  // 加载 Tailwind 核心及排版插件
  script.src = "https://cdn.tailwindcss.com?plugins=typography";
  script.async = true; 
  document.head.appendChild(script);
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)