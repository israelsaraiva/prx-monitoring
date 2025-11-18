"use client"

import { Editor } from "@monaco-editor/react"
import { useEffect, useState } from "react"
import { useTheme } from "next-themes"

interface JsonViewerProps {
  value: string
  maxHeight?: string
}

export function JsonViewer({
  value,
  maxHeight = "300px"
}: JsonViewerProps) {
  const [mounted, setMounted] = useState(false)
  const [formattedJson, setFormattedJson] = useState("")
  const { theme, resolvedTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Try to format JSON, fallback to original if not valid JSON
    try {
      const parsed = JSON.parse(value)
      setFormattedJson(JSON.stringify(parsed, null, 2))
    } catch {
      // If not valid JSON, just use the original value
      setFormattedJson(value)
    }
  }, [value])

  if (!mounted) {
    return (
      <div className="min-h-[100px] w-full rounded-md border border-slate-200/60 dark:border-slate-700/40 bg-background px-3 py-2 text-sm font-mono text-muted-foreground overflow-auto">
        <pre className="whitespace-pre-wrap">{value}</pre>
      </div>
    )
  }

  // Determine if dark theme should be used
  const isDark = resolvedTheme === 'dark'

  return (
    <div className="border border-slate-200/60 dark:border-slate-700/40 rounded-md overflow-hidden">
      <Editor
        height={maxHeight}
        language="json"
        value={formattedJson}
        theme={isDark ? "vs-dark" : "light"}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 12,
          fontFamily: "var(--font-jost), 'Fira Code', 'Courier New', monospace",
          lineNumbers: "on",
          lineNumbersMinChars: 3,
          scrollBeyondLastLine: false,
          wordWrap: "on",
          tabSize: 2,
          automaticLayout: true,
          padding: { top: 8, bottom: 8 },
          folding: true,
          contextmenu: false,
          scrollbar: {
            vertical: "auto",
            horizontal: "auto",
            verticalScrollbarSize: 12,
            horizontalScrollbarSize: 12,
          },
        }}
      />
    </div>
  )
}
