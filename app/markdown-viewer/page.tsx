'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ArrowLeft, BookOpen, Maximize2, Minimize2, Copy, Download } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import ReactMarkdown from 'react-markdown';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import remarkGfm from 'remark-gfm';

const defaultMarkdown = `# Welcome to Markdown Viewer!

This is a real-time markdown editor. Start typing on the left, and see your markdown rendered on the right.

### Features
- **Real-time** rendering
- **GFM support** via \`remark-gfm\` (Tables, Task Lists, Strikethrough)
- Built with React & Tailwind CSS

### Code Example
\`\`\`javascript
function helloWorld() {
  console.log("Hello, World!");
}
\`\`\`

### Mermaid Diagram
\`\`\`mermaid
flowchart LR
  A[Start] --> B{Decision}
  B -- Yes --> C[Do it]
  B -- No --> D[Skip it]
  C --> E[End]
  D --> E
\`\`\`

### Task List
- [x] Create Markdown Viewer page
- [x] Add real-time parsing
- [ ] Add syntax highlighting support

### Table Example
| Feature   | Status |
|-----------|--------|
| Rendering | ✅     |
| Editing   | ✅     |
`;

// ── Mermaid chart renderer (client-side only, SSR-safe) ──────────────────────
// Per-theme mermaid config + container styles
const MERMAID_CONFIGS: Record<
  PreviewTheme,
  (isDark: boolean) => {
    theme: string;
    vars: Record<string, string>;
    wrapperClass: string;
    headerClass: string;
    dotClass: string;
  }
> = {
  default: (isDark: boolean) => ({
    theme: isDark ? 'dark' : 'base',
    vars: isDark
      ? {
          primaryColor: '#1e293b',
          primaryTextColor: '#f8fafc',
          primaryBorderColor: '#334155',
          lineColor: '#94a3b8',
          secondaryColor: '#0f172a',
          tertiaryColor: '#020617',
          background: '#0f172a',
          mainBkg: '#1e293b',
          nodeBorder: '#475569',
          clusterBkg: '#020617',
          clusterBorder: '#334155',
          titleColor: '#e2e8f0',
          edgeLabelBackground: '#1e293b',
          textColor: '#f8fafc',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
          fontSize: '11px',
        }
      : {
          primaryColor: '#f9f6f0',
          primaryTextColor: '#4a3320',
          primaryBorderColor: '#c59f70',
          lineColor: '#c59f70',
          secondaryColor: '#fcfaf6',
          tertiaryColor: '#f4ede1',
          background: '#f4ede1',
          mainBkg: '#f9f6f0',
          nodeBorder: '#c59f70',
          clusterBkg: '#fcfaf6',
          clusterBorder: '#d4b791',
          titleColor: '#4a3320',
          edgeLabelBackground: '#f4ede1',
          textColor: '#4a3320',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
          fontSize: '11px',
        },
    wrapperClass:
      'border-0 bg-[#f4ede1] dark:bg-slate-900 shadow-2xl rounded-2xl ring-1 ring-black/5 dark:ring-white/10 mx-auto mt-0 mb-8 overflow-hidden max-w-4xl',
    headerClass: 'bg-[#f0e6d6] dark:bg-slate-950 border-b border-[#e6d8c3] dark:border-slate-800/80 px-5 py-3',
    dotClass: 'bg-[#d8a361] dark:bg-slate-700',
  }),
  obsidian: (isDark: boolean) => ({
    theme: 'base',
    vars: {
      primaryColor: '#1e103d',
      primaryTextColor: '#c4b5fd',
      primaryBorderColor: '#7c3aed',
      lineColor: '#8b5cf6',
      secondaryColor: '#16082e',
      tertiaryColor: '#0e0620',
      background: '#12121f',
      mainBkg: '#1e103d',
      nodeBorder: '#7c3aed',
      clusterBkg: '#16082e',
      clusterBorder: '#5b21b6',
      titleColor: '#c4b5fd',
      edgeLabelBackground: '#1e103d',
      textColor: '#ddd6fe',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: '11px',
    },
    wrapperClass:
      'border border-violet-900/50 bg-gradient-to-b from-[#130d26] to-[#0f0a1e] shadow-lg shadow-violet-950/40 mx-auto mt-0 mb-8 overflow-hidden max-w-4xl rounded-2xl ring-1 ring-violet-900/20',
    headerClass: 'bg-[#0f0a1e] border-b border-violet-900/50 px-5 py-3',
    dotClass: 'bg-violet-500/80',
  }),
  nord: (isDark: boolean) => ({
    theme: 'base',
    vars: {
      primaryColor: '#3b4252',
      primaryTextColor: '#eceff4',
      primaryBorderColor: '#88c0d0',
      lineColor: '#81a1c1',
      secondaryColor: '#434c5e',
      tertiaryColor: '#4c566a',
      background: '#2e3440',
      mainBkg: '#3b4252',
      nodeBorder: '#88c0d0',
      clusterBkg: '#434c5e',
      clusterBorder: '#5e81ac',
      titleColor: '#88c0d0',
      edgeLabelBackground: '#3b4252',
      textColor: '#d8dee9',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: '11px',
    },
    wrapperClass:
      'border border-[#4c566a] bg-gradient-to-b from-[#2e3440] to-[#272c38] shadow-lg shadow-[#1e2228]/60 mx-auto mt-0 mb-8 overflow-hidden max-w-4xl rounded-2xl ring-1 ring-[#4c566a]/20',
    headerClass: 'bg-[#252a33] border-b border-[#4c566a] px-5 py-3',
    dotClass: 'bg-[#88c0d0]/80',
  }),
};

function MermaidChart({ chart, theme }: { chart: string; theme: PreviewTheme }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const id = useId().replace(/:/g, '');
  const ref = useRef<HTMLDivElement>(null);
  const cfg = MERMAID_CONFIGS[theme](isDark);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mermaid = (await import('mermaid')).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: cfg.theme as any,
        themeVariables: cfg.vars,
        themeCSS: `
          .node rect, .node path, .node polygon, .node circle { rx: 8px; ry: 8px; stroke-linejoin: round; stroke-linecap: round; }
          .edgeLabel { border-radius: 6px !important; }
          .cluster rect { rx: 12px; ry: 12px; }
        `,
        flowchart: { curve: 'basis', padding: 20 },
        sequence: { actorMargin: 50 },
      });
      try {
        const { svg } = await mermaid.render(`mmd-${id}`, chart);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          const svgEl = ref.current.querySelector('svg');
          if (svgEl) {
            svgEl.removeAttribute('width');
            svgEl.removeAttribute('height');
            svgEl.style.width = '100%';
            svgEl.style.maxWidth = '100%';
            svgEl.style.height = 'auto';
          }
        }
      } catch (err) {
        if (!cancelled && ref.current) {
          ref.current.innerHTML = `<pre style="color:#f87171;font-size:11px;padding:12px">${String(err)}</pre>`;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chart, theme, id, cfg]);

  return (
    <div className={`overflow-hidden rounded-2xl ${cfg.wrapperClass}`}>
      {/* Toolbar bar */}
      <div className={`flex items-center justify-between px-5 py-3 ${cfg.headerClass}`}>
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <div className={`w-3 h-3 rounded-full ${cfg.dotClass}`} />
            <div className={`w-3 h-3 rounded-full ${cfg.dotClass} opacity-60`} />
            <div className={`w-3 h-3 rounded-full ${cfg.dotClass} opacity-30`} />
          </div>
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white drop-shadow-sm ml-2">
            diagram
          </span>
        </div>
      </div>
      {/* SVG render area */}
      <div className="px-8 py-10 overflow-x-auto">
        <div ref={ref} className="w-full flex justify-center" />
      </div>
    </div>
  );
}

type PreviewTheme = 'default' | 'obsidian' | 'nord';

const THEMES: Record<
  PreviewTheme,
  {
    label: string;
    dot: string;
    prose: string;
    codeHeader: string;
    codeBorder: string;
  }
> = {
  default: {
    label: 'Default',
    dot: 'bg-amber-500',
    prose: `prose-slate dark:prose-invert
      prose-headings:text-slate-900 dark:prose-headings:text-slate-50
      prose-h1:border-slate-200 dark:prose-h1:border-slate-700
      prose-h2:border-slate-200/60 dark:prose-h2:border-slate-700/60
      prose-p:text-slate-600 dark:prose-p:text-slate-300
      prose-a:text-amber-600 hover:prose-a:text-amber-700 dark:prose-a:text-amber-400
      prose-strong:text-slate-900 dark:prose-strong:text-slate-50
      prose-li:text-slate-600 dark:prose-li:text-slate-300
      prose-ul:marker:text-slate-400 dark:prose-ul:marker:text-slate-500
      prose-blockquote:border-amber-500/70 prose-blockquote:bg-amber-50/50 dark:prose-blockquote:bg-amber-900/10
      prose-blockquote:text-slate-700 dark:prose-blockquote:text-slate-300
      prose-code:text-amber-700 dark:prose-code:text-amber-400
      prose-code:bg-amber-50 dark:prose-code:bg-amber-900/20
      prose-code:border-amber-100 dark:prose-code:border-amber-900/30
      prose-table:ring-slate-200 dark:prose-table:ring-white/10
      prose-th:bg-slate-100/50 dark:prose-th:bg-white/[0.02]
      prose-tr:border-b prose-tr:border-slate-200 dark:prose-tr:border-white/10 last:prose-tr:border-b-0
      prose-hr:border-slate-200 dark:prose-hr:border-slate-700`,
    codeHeader: 'bg-slate-900 border-slate-800',
    codeBorder: 'border-slate-200/80 dark:border-slate-800/80',
  },
  obsidian: {
    label: 'Obsidian',
    dot: 'bg-violet-500',
    prose: `prose-invert
      prose-headings:text-violet-300
      prose-h1:border-violet-800/60
      prose-h2:border-violet-800/40
      prose-p:text-slate-300
      prose-a:text-cyan-400 hover:prose-a:text-cyan-300
      prose-strong:text-violet-200
      prose-li:text-slate-300
      prose-ul:marker:text-violet-500
      prose-blockquote:border-violet-500 prose-blockquote:bg-violet-950/40
      prose-blockquote:text-slate-300
      prose-code:text-green-400
      prose-code:bg-[#1a1a2e] prose-code:border-violet-900/50
      prose-table:ring-violet-900/40
      prose-th:bg-white/[0.02]
      prose-tr:border-b prose-tr:border-violet-900/40 last:prose-tr:border-b-0
      prose-hr:border-violet-800/60`,
    codeHeader: 'bg-[#0f0f1a] border-violet-900/60',
    codeBorder: 'border-violet-900/40',
  },
  nord: {
    label: 'Nord',
    dot: 'bg-[#88c0d0]',
    prose: `prose-invert
      prose-headings:text-[#88c0d0]
      prose-h1:border-[#3b4252]
      prose-h2:border-[#3b4252]/60
      prose-p:text-[#d8dee9]
      prose-a:text-[#81a1c1] hover:prose-a:text-[#88c0d0]
      prose-strong:text-[#eceff4]
      prose-li:text-[#d8dee9]
      prose-ul:marker:text-[#4c566a]
      prose-blockquote:border-[#81a1c1] prose-blockquote:bg-[#2e3440]/80
      prose-blockquote:text-[#d8dee9]
      prose-code:text-[#a3be8c]
      prose-code:bg-[#2e3440] prose-code:border-[#3b4252]
      prose-table:border-[#3b4252]/40
      prose-th:bg-[#2e3440]/40
      prose-tr:border-b prose-tr:border-[#3b4252]/40 last:prose-tr:border-b-0
      prose-td:border-0
      prose-hr:border-[#3b4252]`,
    codeHeader: 'bg-[#242933] border-[#3b4252]',
    codeBorder: 'border-[#3b4252]',
  },
};

const BASE_PROSE = `prose prose-sm max-w-none w-full mx-auto
  prose-headings:font-semibold prose-headings:tracking-tight
  prose-h1:text-3xl prose-h1:pb-3 prose-h1:border-b-2 prose-h1:mb-8 prose-h1:mt-3
  prose-h2:text-xl prose-h2:pb-2 prose-h2:border-b prose-h2:mt-10 prose-h2:mb-5
  prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-0
  prose-h4:mt-6 prose-h4:mb-2
  prose-p:text-[0.78rem] prose-p:leading-6 prose-p:mb-5
  prose-a:font-medium prose-a:underline-offset-4 prose-a:transition-colors
  prose-strong:font-bold
  prose-ul:list-disc prose-ul:pl-5 prose-ul:mb-5 prose-ul:mt-2
  prose-ol:list-decimal prose-ol:pl-5 prose-ol:mb-5 prose-ol:mt-2
  prose-li:my-1.5 prose-li:leading-6 prose-li:text-[0.78rem]
  prose-blockquote:border-l-4 prose-blockquote:px-5 prose-blockquote:py-3
  prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:my-6
  prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0
  prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-[0.75em]
  prose-code:rounded prose-code:border
  prose-code:before:content-none prose-code:after:content-none
  prose-table:border-separate prose-table:border-spacing-0 prose-table:w-full prose-table:text-[0.75rem] !prose-table:mt-0 !prose-table:mb-8
  prose-table:rounded-[8px] prose-table:overflow-hidden prose-table:border-[1px]
  prose-th:px-5 prose-th:py-3 prose-td:px-5 prose-td:py-3 prose-th:text-left prose-th:font-semibold prose-th:uppercase prose-th:tracking-[0.1em] prose-th:text-[0.7rem]
  prose-th:text-slate-500 dark:prose-th:text-slate-400
  prose-img:rounded-xl prose-img:shadow-lg prose-img:my-7
  prose-hr:my-8
  mt-5`;

export default function MarkdownViewerPage() {
  const [markdownInput, setMarkdownInput] = useState<string>(defaultMarkdown);
  const [previewTheme, setPreviewTheme] = useState<PreviewTheme>('default');
  const [expanded, setExpanded] = useState(false);
  const [copying, setCopying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const exportPng = async (mode: 'copy' | 'download') => {
    if (!previewRef.current) return;
    if (mode === 'copy') setCopying(true);
    else setDownloading(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(previewRef.current, { cacheBust: true, pixelRatio: 2 });
      if (mode === 'download') {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'markdown-preview.png';
        a.click();
      } else {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      }
    } catch {
      // clipboard copy failed — fall back to download
      if (mode === 'copy') {
        try {
          const { toPng } = await import('html-to-image');
          const dataUrl = await toPng(previewRef.current!, { cacheBust: true, pixelRatio: 2 });
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = 'markdown-preview.png';
          a.click();
        } catch {
          /* ignore */
        }
      }
    } finally {
      setCopying(false);
      setDownloading(false);
    }
  };

  const theme = THEMES[previewTheme];

  const previewBg: Record<PreviewTheme, string> = {
    default: '',
    obsidian: 'bg-[#12121f]',
    nord: 'bg-[#2e3440]',
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 relative selection:bg-orange-200 dark:selection:bg-orange-900 animate-in fade-in duration-300">
      <div className="absolute inset-0 z-0 h-full w-full bg-slate-50 dark:bg-slate-950 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-orange-400 dark:bg-orange-600 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 h-full w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8 flex flex-col">
        <div className="mb-4 sm:mb-6 flex-shrink-0 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg flex-shrink-0">
                <BookOpen className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Markdown Viewer</h1>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">
                  Draft and preview your markdown documents in real-time
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link href="/">
                <Button
                  variant="outline"
                  size="icon"
                  className="border-2 border-slate-300 dark:border-slate-600 bg-background hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 transition-all h-10 w-10"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="sr-only">Home</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <div className={`grid gap-4 lg:gap-6 h-full ${expanded ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
            {/* Editor */}
            {!expanded && (
              <Card className="rounded-3xl border border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl h-full flex flex-col min-h-0 transition-all duration-500">
                <CardHeader className="pb-4 flex-shrink-0 border-b border-slate-200/40 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/40">
                  <CardTitle className="text-xl sm:text-2xl text-slate-900 dark:text-white font-bold">
                    Raw Markdown
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    Write or paste your markdown content here
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden min-h-0 flex flex-col pt-4">
                  <Textarea
                    value={markdownInput}
                    onChange={(e) => setMarkdownInput(e.target.value)}
                    placeholder="Type your markdown here..."
                    className="flex-1 min-h-[300px] font-mono text-xs leading-relaxed resize-none bg-white/50 dark:bg-slate-950/50 border-slate-200/60 dark:border-slate-800/60 focus-visible:ring-orange-500/50 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </CardContent>
              </Card>
            )}

            {/* Preview */}
            <Card className="rounded-3xl border border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl h-full flex flex-col min-h-0 transition-all duration-500">
              <CardHeader className="pb-3 flex-shrink-0 border-b border-slate-200/40 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/40">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <CardTitle className="text-xl sm:text-2xl text-slate-900 dark:text-white font-bold">
                      Preview
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                      Live rendered output
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Theme picker */}
                    <div className="flex items-center gap-1">
                      {(Object.entries(THEMES) as [PreviewTheme, (typeof THEMES)[PreviewTheme]][]).map(([id, t]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setPreviewTheme(id)}
                          title={t.label}
                          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all border ${
                            previewTheme === id
                              ? 'border-slate-400 dark:border-slate-500 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm'
                              : 'border-transparent text-slate-500 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <span className={`h-2.5 w-2.5 rounded-full ${t.dot}`} />
                          {t.label}
                        </button>
                      ))}
                    </div>
                    {/* Action buttons */}
                    <button
                      type="button"
                      onClick={() => exportPng('copy')}
                      disabled={copying || downloading}
                      title="Copy as PNG"
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copying ? 'Copying…' : 'Copy PNG'}
                    </button>
                    <button
                      type="button"
                      onClick={() => exportPng('download')}
                      disabled={copying || downloading}
                      title="Download as PNG"
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {downloading ? 'Saving…' : 'Download PNG'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpanded((v) => !v)}
                      title={expanded ? 'Collapse preview' : 'Expand to full width'}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                      {expanded ? 'Collapse' : 'Expand'}
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent
                className={`flex-1 overflow-auto min-h-0 pt-0 pb-6 px-2 sm:px-6 transition-colors duration-300 ${previewBg[previewTheme]}`}
              >
                <article ref={previewRef} data-md-theme={previewTheme} className={`${BASE_PROSE} ${theme.prose}`}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        const lang = match?.[1];
                        if (!inline && lang === 'mermaid') {
                          return <MermaidChart chart={String(children).replace(/\n$/, '')} theme={previewTheme} />;
                        }
                        if (!inline && lang) {
                          return (
                            <div className={`overflow-hidden rounded-xl border shadow-lg my-6 ${theme.codeBorder}`}>
                              <div
                                className={`flex items-center justify-between px-4 py-2.5 border-b ${theme.codeHeader}`}
                              >
                                <div className="flex gap-1.5">
                                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/90" />
                                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/90" />
                                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/90" />
                                </div>
                                <div className="text-[10px] font-mono font-medium text-slate-400 uppercase tracking-wider select-none bg-black/30 px-2 py-0.5 rounded border border-white/10">
                                  {lang}
                                </div>
                              </div>
                              <CodeMirror
                                value={String(children).replace(/\n$/, '')}
                                extensions={[javascript()]}
                                theme={oneDark}
                                readOnly={true}
                                editable={false}
                                basicSetup={{
                                  lineNumbers: true,
                                  foldGutter: false,
                                  highlightActiveLine: false,
                                  highlightActiveLineGutter: false,
                                  highlightSelectionMatches: false,
                                }}
                                className="text-[12px]"
                              />
                            </div>
                          );
                        }
                        return (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {markdownInput}
                  </ReactMarkdown>
                </article>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
