'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ArrowLeft, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
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

export default function MarkdownViewerPage() {
  const [markdownInput, setMarkdownInput] = useState<string>(defaultMarkdown);

  return (
    <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 relative selection:bg-orange-200 dark:selection:bg-orange-900 animate-in fade-in duration-300">
      {/* Background decoration matching home page */}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 h-full">
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

            <Card className="rounded-3xl border border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl h-full flex flex-col min-h-0 transition-all duration-500">
              <CardHeader className="pb-4 flex-shrink-0 border-b border-slate-200/40 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/40">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl sm:text-2xl text-slate-900 dark:text-white font-bold">
                      Preview
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                      Live rendered output
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto min-h-0 p-0 m-4 bg-white/50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/60 rounded-xl">
                <article className="prose prose-sm prose-slate dark:prose-invert max-w-none p-6 md:p-8 [&>*:not(:last-child)]:mb-6 prose-headings:font-semibold prose-headings:mt-8 prose-headings:mb-4 prose-p:leading-relaxed prose-a:text-orange-600 dark:prose-a:text-orange-400 prose-pre:bg-slate-900 prose-pre:text-slate-50 dark:prose-pre:bg-[#0d1117] prose-pre:border prose-pre:border-slate-800 dark:prose-pre:border-slate-800/50 prose-pre:rounded-xl prose-pre:shadow-lg prose-pre:p-5 [&_:not(pre)>code]:text-orange-700 dark:[&_:not(pre)>code]:text-orange-400 [&_:not(pre)>code]:bg-orange-100/80 dark:[&_:not(pre)>code]:bg-orange-950/40 [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:rounded-md prose-code:before:content-none prose-code:after:content-none prose-blockquote:border-l-orange-500 prose-blockquote:bg-orange-50/50 dark:prose-blockquote:bg-orange-950/10 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-table:border-collapse prose-table:w-full prose-th:border prose-th:border-slate-200 dark:prose-th:border-slate-800 prose-th:bg-slate-50 dark:prose-th:bg-slate-900/50 prose-td:border prose-td:border-slate-200 dark:prose-td:border-slate-800 prose-li:my-2">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdownInput}</ReactMarkdown>
                </article>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
