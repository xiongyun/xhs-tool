import React, { useState, useEffect, useRef } from 'react';

// --- 1. 没有任何外部依赖的图标组件 (直接画 SVG) ---
const Icon = ({ path, size = 20, className = '' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {path}
  </svg>
);

const Icons = {
  Image: <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />,
  ImageCircle: (
    <>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </>
  ),
  Download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </>
  ),
  Copy: (
    <>
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </>
  ),
  Trash: (
    <>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </>
  ),
  Split: (
    <>
      <path d="M5 8V5c0-1 1-2 2-2h10c1 0 2 1 2 2v3" />
      <path d="M19 16v3c0 1-1 2-2 2H7c-1 0-2-1-2-2v-3" />
      <line x1="4" x2="20" y1="12" y2="12" />
    </>
  ),
  Check: <polyline points="20 6 9 17 4 12" />,
  Loader: <path d="M21 12a9 9 0 1 1-6.219-8.56" />,
  Type: (
    <>
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" x2="15" y1="20" y2="20" />
      <line x1="12" x2="12" y1="4" y2="20" />
    </>
  ),
  Layout: (
    <>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <line x1="3" x2="21" y1="9" y2="9" />
      <line x1="9" x2="9" y1="21" y2="9" />
    </>
  ),
};

// --- 2. 核心功能组件 ---
export default function XhsMarkdownEditor() {
  const [status, setStatus] = useState('initializing'); // initializing, ready, error
  const [markdown, setMarkdown] = useState(() => {
    try {
      return localStorage.getItem('xhs_content') || DEFAULT_MARKDOWN;
    } catch {
      return DEFAULT_MARKDOWN;
    }
  });
  const [theme, setTheme] = useState('minimal');
  const [fontSize, setFontSize] = useState(16);
  const [showGuides, setShowGuides] = useState(true);
  const [html, setHtml] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const previewRef = useRef(null);

  // 3. 注入 Tailwind 和依赖库 (无需本地安装)
  useEffect(() => {
    const loadScript = (src, id) => {
      return new Promise((resolve, reject) => {
        if (document.getElementById(id)) return resolve();
        const script = document.createElement('script');
        script.src = src;
        script.id = id;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    const init = async () => {
      try {
        // 加载 Tailwind CSS (含 Typography 插件)
        if (!document.getElementById('tailwind-cdn')) {
          const twScript = document.createElement('script');
          twScript.id = 'tailwind-cdn';
          twScript.src = 'https://cdn.tailwindcss.com?plugins=typography';
          document.head.appendChild(twScript);
          // 给 Tailwind 一点时间初始化
          await new Promise((r) => setTimeout(r, 1000));
        }

        // 加载 Markdown 解析器
        await loadScript(
          'https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js',
          'marked-js'
        );
        // 加载 截图库
        await loadScript(
          'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
          'html2canvas-js'
        );

        setStatus('ready');
      } catch (err) {
        console.error('资源加载失败', err);
        setStatus('error');
      }
    };

    init();
  }, []);

  // 4. 解析 Markdown
  useEffect(() => {
    if (status === 'ready' && window.marked) {
      // 自动保存
      localStorage.setItem('xhs_content', markdown);

      // 智能换行处理: 连续两个换行符转为 <br>
      const processed = markdown.replace(/\n{2,}/g, (match) => {
        return '\n' + '<br>'.repeat(match.length - 1) + '\n';
      });

      window.marked.setOptions({ breaks: true, gfm: true });
      setHtml(window.marked.parse(processed));
    }
  }, [markdown, status]);

  // 5. 截图功能
  const capture = async () => {
    if (!previewRef.current || !window.html2canvas) return null;
    const originalGuides = showGuides;
    setShowGuides(false); // 截图时隐藏参考线
    await new Promise((r) => setTimeout(r, 200)); // 等待重绘

    try {
      const canvas = await window.html2canvas(previewRef.current, {
        scale: 3, // 高清
        useCORS: true,
        backgroundColor: null,
      });
      setShowGuides(originalGuides);
      return canvas;
    } catch (e) {
      console.error(e);
      setShowGuides(originalGuides);
      alert('生成图片出错');
      return null;
    }
  };

  const handleDownload = async (split) => {
    setIsProcessing(true);
    const canvas = await capture();
    if (!canvas) {
      setIsProcessing(false);
      return;
    }

    const timestamp = Date.now();
    if (!split) {
      const link = document.createElement('a');
      link.download = `xhs-${timestamp}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } else {
      // 分割为 3:4 图片
      const pageH = canvas.width * (4 / 3);
      const totalPages = Math.ceil(canvas.height / pageH);
      for (let i = 0; i < totalPages; i++) {
        const c = document.createElement('canvas');
        c.width = canvas.width;
        c.height = pageH;
        const ctx = c.getContext('2d');
        // 填充背景
        ctx.fillStyle = THEMES[theme].bgCode;
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(
          canvas,
          0,
          i * pageH,
          canvas.width,
          pageH,
          0,
          0,
          canvas.width,
          pageH
        );

        const link = document.createElement('a');
        link.download = `xhs-${timestamp}-${i + 1}.png`;
        link.href = c.toDataURL('image/png');
        link.click();
      }
    }
    setIsProcessing(false);
  };

  if (status === 'initializing') {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500 gap-2">
        正在初始化引擎...
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex h-screen items-center justify-center text-red-500">
        网络资源加载失败，请刷新重试
      </div>
    );
  }

  const currentTheme = THEMES[theme];

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-800 font-sans overflow-hidden">
      {/* 顶部栏 */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-2 font-bold text-gray-700">
          <span className="bg-red-500 text-white p-1 rounded">
            <Icon path={Icons.ImageCircle} />
          </span>
          <span className="hidden sm:inline">小红书排版助手</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (confirm('清空?')) setMarkdown('');
            }}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full"
            title="清空"
          >
            <Icon path={Icons.Trash} size={18} />
          </button>
          <div className="h-6 w-px bg-gray-200"></div>

          {/* 字体大小 */}
          <div className="hidden md:flex items-center gap-2 bg-gray-100 px-2 py-1 rounded">
            <Icon path={Icons.Type} size={14} className="text-gray-500" />
            <input
              type="range"
              min="12"
              max="24"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-20 accent-red-500"
            />
          </div>

          {/* 主题切换 */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded">
            {Object.keys(THEMES).map((k) => (
              <button
                key={k}
                onClick={() => setTheme(k)}
                className={`w-6 h-6 rounded border ${
                  theme === k
                    ? 'border-red-500 scale-110'
                    : 'border-transparent'
                }`}
                style={{ background: THEMES[k].preview }}
              />
            ))}
          </div>

          <button
            onClick={() => setShowGuides(!showGuides)}
            className={`p-2 rounded ${
              showGuides ? 'text-red-500 bg-red-50' : 'text-gray-400'
            }`}
            title="辅助线"
          >
            <Icon path={Icons.Layout} />
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => handleDownload(false)}
              disabled={isProcessing}
              className="flex items-center gap-1 bg-gray-800 text-white px-3 py-1.5 rounded hover:bg-gray-700 text-sm"
            >
              {isProcessing ? (
                <Icon path={Icons.Loader} className="animate-spin" />
              ) : (
                <Icon path={Icons.Download} />
              )}
              <span className="hidden sm:inline">保存</span>
            </button>
            <button
              onClick={() => handleDownload(true)}
              disabled={isProcessing}
              className="flex items-center gap-1 bg-red-500 text-white px-3 py-1.5 rounded hover:bg-red-600 text-sm shadow-sm"
            >
              {isProcessing ? (
                <Icon path={Icons.Loader} className="animate-spin" />
              ) : (
                <Icon path={Icons.Split} />
              )}
              <span className="hidden sm:inline">分割</span>
            </button>
          </div>
        </div>
      </header>

      {/* 主界面 */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* 输入区 */}
        <div className="flex-1 bg-white border-r relative flex flex-col">
          <textarea
            className="flex-1 w-full p-6 resize-none outline-none font-mono text-gray-700 leading-relaxed"
            placeholder="# 标题&#10;开始写作..."
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
          />
          <div className="px-4 py-2 bg-gray-50 text-xs text-gray-400 flex justify-between">
            <span>支持 Markdown</span>
            <span>{markdown.length} 字</span>
          </div>
        </div>

        {/* 预览区 */}
        <div className="flex-1 bg-gray-100 overflow-y-auto p-4 md:p-8 flex justify-center">
          <div className="relative w-[375px] bg-gray-800 rounded-[40px] border-[8px] border-gray-800 shadow-2xl shrink-0 mb-10">
            {/* 手机顶栏 */}
            <div className="h-8 flex justify-center items-center pointer-events-none">
              <div className="w-20 h-5 bg-black rounded-b-xl"></div>
            </div>

            {/* 内容画布 */}
            <div
              ref={previewRef}
              className={`min-h-[600px] w-full ${currentTheme.bgClass} transition-colors relative`}
              style={{ borderRadius: '0 0 32px 32px' }}
            >
              {showGuides && (
                <div className="absolute inset-0 z-10 pointer-events-none opacity-30 mix-blend-multiply overflow-hidden">
                  <div
                    className="w-full h-full border-b border-dashed border-red-500"
                    style={{
                      background:
                        'repeating-linear-gradient(to bottom, transparent 0, transparent 499px, red 500px)',
                    }}
                  />
                  <div className="absolute top-4 right-2 text-[10px] text-red-500 bg-white/80 px-1 rounded">
                    3:4 参考线
                  </div>
                </div>
              )}

              <div
                className={`p-6 md:p-8 ${currentTheme.textClass} prose-custom`}
                style={{ fontSize: fontSize }}
              >
                <div
                  className="prose prose-sm max-w-none break-words"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
                {!html && (
                  <div className="text-center py-20 text-gray-300 italic">
                    预览区域
                  </div>
                )}
              </div>

              <div className="h-12 w-full"></div>
            </div>
            {/* Home条 */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-600 rounded-full opacity-50 pointer-events-none"></div>
          </div>
        </div>
      </div>

      <style>{`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        .prose h1 { font-size: 1.8em; margin: 0.6em 0 0.4em; font-weight: 800; line-height: 1.2; }
        .prose h2 { font-size: 1.4em; margin: 1.2em 0 0.6em; font-weight: 700; padding-left: 0.5em; border-left: 4px solid #ef4444; }
        .prose p { margin: 0.6em 0; line-height: 1.75; text-align: justify; }
        .prose ul { padding-left: 1em; list-style: disc; margin: 0.5em 0; }
        .prose img { border-radius: 8px; width: 100%; margin: 1em 0; }
        .prose blockquote { border-left: 3px solid currentColor; padding-left: 1em; margin: 1em 0; font-style: italic; opacity: 0.8; }
        .prose br { display: block; margin-top: 1em; content: ""; }
      `}</style>
    </div>
  );
}

const DEFAULT_MARKDOWN = `# 小红书排版神器 

✨ **无需安装任何依赖，复制即用！**

## 主要功能
* 🎨 **自动加载样式**：基于 CDN
* 📱 **手机预览**：3:4 比例参考
* ✂️ **自动分割**：长图转多图

## 试一试
连按回车...


就能产生空行！
`;

const THEMES = {
  minimal: {
    preview: '#fff',
    bgClass: 'bg-white',
    textClass: 'text-gray-800',
    bgCode: '#ffffff',
  },
  warm: {
    preview: '#fff7ed',
    bgClass: 'bg-orange-50',
    textClass: 'text-stone-800',
    bgCode: '#fff7ed',
  },
  cool: {
    preview: '#f1f5f9',
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-800',
    bgCode: '#f1f5f9',
  },
  dark: {
    preview: '#1f2937',
    bgClass: 'bg-gray-900',
    textClass: 'text-gray-100',
    bgCode: '#111827',
  },
};
