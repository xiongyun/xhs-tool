import React, { useState, useEffect, useRef } from 'react';

// --- 1. 图标组件 (无外部依赖) ---
const Icon = ({ path, size = 20, className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" 
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
    className={className}
  >
    {path}
  </svg>
);

const Icons = {
  Image: <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />,
  ImageCircle: <><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></>,
  Download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></>,
  Copy: <><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></>,
  Trash: <><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></>,
  Split: <><path d="M5 8V5c0-1 1-2 2-2h10c1 0 2 1 2 2v3" /><path d="M19 16v3c0 1-1 2-2 2H7c-1 0-2-1-2-2v-3" /><line x1="4" x2="20" y1="12" y2="12" /></>,
  Check: <polyline points="20 6 9 17 4 12" />,
  Loader: <path d="M21 12a9 9 0 1 1-6.219-8.56" />,
  Type: <><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" x2="15" y1="20" y2="20" /><line x1="12" x2="12" y1="4" y2="20" /></>,
  Layout: <><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><line x1="3" x2="21" y1="9" y2="9" /><line x1="9" x2="9" y1="21" y2="9" /></>
};

// --- 2. 核心配置常量 ---
const CONFIG = {
  targetWidth: 1300,
  targetHeight: 2160,
  get aspectRatio() { return this.targetWidth / this.targetHeight; }
};

// --- 3. 核心功能组件 ---
export default function XhsMarkdownEditor() {
  const [status, setStatus] = useState('initializing'); 
  const [markdown, setMarkdown] = useState(() => {
    try { return localStorage.getItem('xhs_content') || DEFAULT_MARKDOWN; } catch { return DEFAULT_MARKDOWN; }
  });
  const [theme, setTheme] = useState('minimal');
  const [fontSize, setFontSize] = useState(16);
  const [showGuides, setShowGuides] = useState(true);
  const [html, setHtml] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copyLabel, setCopyLabel] = useState('复制'); 
  const previewRef = useRef(null);

  // 3. 注入依赖库 (包含 KaTeX)
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

    const loadCSS = (href, id) => {
      if (document.getElementById(id)) return;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.id = id;
      document.head.appendChild(link);
    };

    const init = async () => {
      try {
        // 加载样式
        loadCSS('https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css', 'katex-css');
        
        // 加载脚本
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js', 'marked-js');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'html2canvas-js');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js', 'katex-js');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/auto-render.min.js', 'katex-auto-render');

        setStatus('ready');
      } catch (err) {
        console.error("资源加载失败", err);
        setStatus('error');
      }
    };
    init();
  }, []);

  // 4. 解析 Markdown 和 数学公式
  useEffect(() => {
    if (status === 'ready' && window.marked) {
      localStorage.setItem('xhs_content', markdown);
      
      const parts = markdown.split(/(```[\s\S]*?```)/g);
      const processed = parts.map(part => {
        if (part.startsWith('```')) return part;
        
        // 智能换行逻辑：3个回车才算一个空行
        let temp = part.replace(/\n{3,}/g, (match) => {
          return '\n\n' + '<br>'.repeat(match.length - 2) + '\n\n';
        });

        // --- 强力加粗修复 (关键修改) ---
        // 直接将 **内容** 替换为 <strong>内容</strong> 标签
        // 这样无论后面跟的是中文引号 “ 还是英文引号 "，浏览器都能正确识别加粗
        // 正则解释：匹配成对的 **，且内部不含换行符或星号
        temp = temp.replace(/(?<!\\)\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');

        return temp;
      }).join('');

      window.marked.setOptions({ breaks: true, gfm: true });
      try {
        setHtml(window.marked.parse(processed));
      } catch (e) {
        console.error("Markdown parse error:", e);
      }
    }
  }, [markdown, status]);

  // 5. 渲染完成后触发 KaTeX 渲染
  useEffect(() => {
    if (status === 'ready' && window.renderMathInElement && previewRef.current) {
      try {
        window.renderMathInElement(previewRef.current, {
          delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\(', right: '\\)', display: false},
            {left: '\\[', right: '\\]', display: true}
          ],
          throwOnError: false
        });
      } catch (e) {
        console.error("KaTeX render error:", e);
      }
    }
  }, [html, status]);

  // 6. 截图核心逻辑
  const capture = async () => {
    if (!previewRef.current || !window.html2canvas) return null;
    const originalGuides = showGuides;
    setShowGuides(false); 
    // 等待 KaTeX 字体渲染
    await new Promise(r => setTimeout(r, 300)); 

    try {
      const elementWidth = previewRef.current.offsetWidth;
      const scale = CONFIG.targetWidth / elementWidth;

      const canvas = await window.html2canvas(previewRef.current, {
        scale: scale, 
        useCORS: true,
        backgroundColor: null,
        width: elementWidth, 
        windowWidth: elementWidth,
      });
      
      setShowGuides(originalGuides);
      return canvas;
    } catch (e) {
      console.error(e);
      setShowGuides(originalGuides);
      return null;
    }
  };

  const handleCopy = async () => {
    setIsProcessing(true);
    setCopyLabel('处理中...');

    try {
      if (typeof ClipboardItem === 'undefined' || !navigator.clipboard || !navigator.clipboard.write) {
        throw new Error("浏览器不支持，请使用下载功能");
      }

      const canvas = await capture();
      if (!canvas) throw new Error("生成失败");

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error("转换失败");

      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopyLabel('已复制!');
      setTimeout(() => setCopyLabel('复制'), 2000);
    } catch (err) {
      alert(`复制失败: ${err.message}`);
      setCopyLabel('复制');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async (split) => {
    setIsProcessing(true);
    const canvas = await capture();
    if (!canvas) { setIsProcessing(false); return; }

    const timestamp = Date.now();
    
    if (!split) {
      const link = document.createElement('a');
      link.download = `xhs-${timestamp}-full.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } else {
      const sourceW = canvas.width;
      const pageHeight = CONFIG.targetHeight; 
      const totalPages = Math.ceil(canvas.height / pageHeight);

      for (let i = 0; i < totalPages; i++) {
        const c = document.createElement('canvas');
        c.width = CONFIG.targetWidth;
        c.height = CONFIG.targetHeight;
        const ctx = c.getContext('2d');
        ctx.fillStyle = THEMES[theme].bgCode;
        ctx.fillRect(0, 0, c.width, c.height);
        
        ctx.drawImage(
          canvas, 
          0, i * pageHeight, sourceW, pageHeight, 
          0, 0, CONFIG.targetWidth, CONFIG.targetHeight
        );
        
        const link = document.createElement('a');
        link.download = `xhs-${timestamp}-${i+1}.png`;
        link.href = c.toDataURL('image/png');
        link.click();
      }
    }
    setIsProcessing(false);
  };

  const getGuideStyle = () => {
    const previewWidth = 375; 
    const guideHeight = previewWidth / CONFIG.aspectRatio;
    return {
      background: `repeating-linear-gradient(to bottom, transparent 0, transparent ${guideHeight - 1}px, #ef4444 ${guideHeight}px)`
    };
  };

  if (status === 'initializing') return <div className="flex h-screen items-center justify-center text-gray-500 gap-2">正在初始化引擎...</div>;
  if (status === 'error') return <div className="flex h-screen items-center justify-center text-red-500">网络资源加载失败，请刷新重试</div>;

  const currentTheme = THEMES[theme];

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-800 font-sans overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-2 font-bold text-gray-700">
          <span className="bg-red-500 text-white p-1 rounded"><Icon path={Icons.ImageCircle} /></span>
          <span className="hidden sm:inline">小红书排版助手</span>
        </div>
        
        <div className="flex items-center gap-3">
           <button onClick={() => {if(confirm('清空?')) setMarkdown('')}} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full" title="清空"><Icon path={Icons.Trash} size={18}/></button>
           <div className="h-6 w-px bg-gray-200"></div>
           
           <div className="hidden md:flex items-center gap-2 bg-gray-100 px-2 py-1 rounded">
             <Icon path={Icons.Type} size={14} className="text-gray-500"/>
             <input type="range" min="12" max="24" value={fontSize} onChange={e=>setFontSize(Number(e.target.value))} className="w-20 accent-red-500"/>
           </div>

           <div className="flex gap-1 bg-gray-100 p-1 rounded">
             {Object.keys(THEMES).map(k => (
               <button key={k} onClick={()=>setTheme(k)} className={`w-6 h-6 rounded border ${theme===k ? 'border-red-500 scale-110' : 'border-transparent'}`} style={{background: THEMES[k].preview}} />
             ))}
           </div>

           <button onClick={()=>setShowGuides(!showGuides)} className={`p-2 rounded ${showGuides ? 'text-red-500 bg-red-50' : 'text-gray-400'}`} title="辅助线"><Icon path={Icons.Layout} /></button>
           
           <div className="flex gap-2">
             <button onClick={handleCopy} disabled={isProcessing} className="flex items-center gap-1 bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-50 text-sm">
               {isProcessing ? <Icon path={Icons.Loader} className="animate-spin"/> : copyLabel === '已复制!' ? <Icon path={Icons.Check}/> : <Icon path={Icons.Copy}/>}
               <span className="hidden sm:inline">{copyLabel}</span>
             </button>

             <button onClick={()=>handleDownload(false)} disabled={isProcessing} className="flex items-center gap-1 bg-gray-800 text-white px-3 py-1.5 rounded hover:bg-gray-700 text-sm">
               {isProcessing ? <Icon path={Icons.Loader} className="animate-spin"/> : <Icon path={Icons.Download}/>}
               <span className="hidden sm:inline">长图</span>
             </button>
             <button onClick={()=>handleDownload(true)} disabled={isProcessing} className="flex items-center gap-1 bg-red-500 text-white px-3 py-1.5 rounded hover:bg-red-600 text-sm shadow-sm">
               {isProcessing ? <Icon path={Icons.Loader} className="animate-spin"/> : <Icon path={Icons.Split}/>}
               <span className="hidden sm:inline">分割</span>
             </button>
           </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 bg-white border-r relative flex flex-col">
          <textarea 
            className="flex-1 w-full p-6 resize-none outline-none font-mono text-gray-700 leading-relaxed"
            placeholder="# 标题&#10;开始写作..."
            value={markdown}
            onChange={e => setMarkdown(e.target.value)}
          />
          <div className="px-4 py-2 bg-gray-50 text-xs text-gray-400 flex justify-between">
            <span>支持 Markdown & LaTeX (例如 $\rightarrow$)</span>
            <span>{markdown.length} 字</span>
          </div>
        </div>

        <div className="flex-1 bg-gray-100 overflow-y-auto p-4 md:p-8 flex justify-center">
          <div className="relative w-[375px] bg-gray-800 rounded-[40px] border-[8px] border-gray-800 shadow-2xl shrink-0 mb-10">
            <div className="h-8 flex justify-center items-center pointer-events-none"><div className="w-20 h-5 bg-black rounded-b-xl"></div></div>
            
            {/* 内容画布 */}
            <div ref={previewRef} className={`min-h-[600px] w-full ${currentTheme.bgClass} transition-colors relative`} style={{borderRadius: '0 0 32px 32px'}}>
              {showGuides && (
                <div 
                  className="absolute inset-0 z-10 pointer-events-none opacity-30 mix-blend-multiply overflow-hidden"
                >
                  <div className="w-full h-full border-b border-dashed border-red-500" style={getGuideStyle()} />
                  <div className="absolute top-4 right-2 text-[10px] text-red-500 bg-white/80 px-1 rounded shadow-sm border border-red-100">
                    1300 x 2160 (9.6:16)
                  </div>
                </div>
              )}
              
              <div className={`p-6 md:p-8 ${currentTheme.textClass} prose-custom`} style={{fontSize: fontSize}}>
                <div className="prose prose-sm max-w-none break-words" dangerouslySetInnerHTML={{__html: html}} />
                {!html && <div className="text-center py-20 text-gray-300 italic">预览区域</div>}
              </div>
              <div className="h-12 w-full"></div>
            </div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-600 rounded-full opacity-50 pointer-events-none"></div>
          </div>
        </div>
      </div>

      <style>{`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        .prose h1 { font-size: 1.8em; margin: 0.6em 0 0.4em; font-weight: 800; line-height: 1.2; }
        .prose h2 { font-size: 1.4em; margin: 1.2em 0 0.6em; font-weight: 700; padding-left: 0.5em; border-left: 4px solid #ef4444; }
        .prose h3 { font-size: 1.2em; margin: 1em 0 0.5em; font-weight: 700; }
        .prose p { margin: 0.6em 0; line-height: 1.75; text-align: justify; }
        .prose ul { padding-left: 1em; list-style: disc; margin: 0.5em 0; }
        .prose ol { padding-left: 1em; list-style: decimal; margin: 0.5em 0; }
        
        .prose pre { 
          background-color: #1e293b; color: #e2e8f0; padding: 1em; border-radius: 8px; 
          overflow-x: auto; margin: 1em 0; font-family: monospace;
        }
        .prose code { 
          font-family: monospace; background-color: rgba(0,0,0,0.05); padding: 0.2em 0.4em; border-radius: 4px; font-size: 0.9em;
        }
        .prose pre code { background-color: transparent; padding: 0; color: inherit; }
        .prose blockquote { border-left: 3px solid currentColor; padding-left: 1em; margin: 1em 0; font-style: italic; opacity: 0.8; }
        .prose img { border-radius: 8px; width: 100%; margin: 1em 0; }
      `}</style>
    </div>
  );
}

const DEFAULT_MARKDOWN = `# 小红书排版助手

## 中文符号测试
现在 **加粗**“引号” 也能正常显示了！

## 数学公式
$$E=mc^2$$

## 分割线升级
* 尺寸锁定：1300 x 2160 像素
* 比例锁定：9.6 : 16
`;

const THEMES = {
  minimal: { preview: '#fff', bgClass: 'bg-white', textClass: 'text-gray-800', bgCode: '#ffffff' },
  warm:    { preview: '#fff7ed', bgClass: 'bg-orange-50', textClass: 'text-stone-800', bgCode: '#fff7ed' },
  cool:    { preview: '#f1f5f9', bgClass: 'bg-slate-100', textClass: 'text-slate-800', bgCode: '#f1f5f9' },
  dark:    { preview: '#1f2937', bgClass: 'bg-gray-900', textClass: 'text-gray-100', bgCode: '#111827' }
};