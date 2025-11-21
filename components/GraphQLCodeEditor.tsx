'use client';

import { Editor } from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface GraphQLCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function GraphQLCodeEditor({
  value,
  onChange,
  disabled = false,
  placeholder = 'subscription { messageAdded { id content } }',
}: GraphQLCodeEditorProps) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-[200px] w-full rounded-md border border-slate-200/60 dark:border-slate-700/40 bg-background px-3 py-2 text-sm font-mono flex items-center text-muted-foreground">
        {placeholder}
      </div>
    );
  }

  // Determine if dark theme should be used
  const isDark = resolvedTheme === 'dark';

  return (
    <div className="border border-slate-200/60 dark:border-slate-700/40 rounded-md overflow-hidden">
      <Editor
        height="200px"
        language="graphql"
        value={value || ''}
        onChange={(val) => onChange(val || '')}
        theme={isDark ? 'vs-dark' : 'vs'}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "var(--font-jost), 'Fira Code', 'Courier New', monospace",
          lineNumbers: 'on',
          lineNumbersMinChars: 3,
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          readOnly: disabled,
          placeholder: placeholder,
          tabSize: 2,
          automaticLayout: true,
          padding: { top: 12, bottom: 12 },
          suggest: {
            showKeywords: true,
            showSnippets: true,
          },
          bracketPairColorization: {
            enabled: true,
          },
          colorDecorators: true,
        }}
      />
    </div>
  );
}
