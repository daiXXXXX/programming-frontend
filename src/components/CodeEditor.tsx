'use client'

import { useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { Monaco, OnMount } from '@monaco-editor/react'
import { Spin } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then(module => module.default),
  {
    ssr: false,
  }
)

// 语言名称 → Monaco 语言标识映射
const LANGUAGE_MAP: Record<string, string> = {
  'JavaScript': 'javascript',
  'C': 'c',
  'C++': 'cpp',
  'Python': 'python',
  'Java': 'java',
  'Go': 'go',
  'TypeScript': 'typescript',
}

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  language?: string
  height?: string | number
  placeholder?: string
}

export function CodeEditor({ 
  value, 
  onChange, 
  language = 'JavaScript', 
  height = '400px',
  placeholder 
}: CodeEditorProps) {
  const monacoLanguage = LANGUAGE_MAP[language] || 'plaintext'

  // handleBeforeMount 在实例创建前注册统一主题，确保代码高亮与缩进样式稳定。
  const handleBeforeMount = useCallback((monaco: Monaco) => {
    monaco.editor.defineTheme('programming-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', foreground: 'E2E8F0', background: '0F172A' },
        { token: 'comment', foreground: '64748B' },
        { token: 'keyword', foreground: 'C084FC' },
        { token: 'string', foreground: '34D399' },
        { token: 'number', foreground: 'FBBF24' },
        { token: 'type.identifier', foreground: '60A5FA' },
      ],
      colors: {
        'editor.background': '#0F172A',
        'editor.foreground': '#E2E8F0',
        'editorLineNumber.foreground': '#475569',
        'editorLineNumber.activeForeground': '#CBD5E1',
        'editorCursor.foreground': '#F8FAFC',
        'editor.selectionBackground': '#1D4ED866',
        'editor.inactiveSelectionBackground': '#33415555',
        'editor.lineHighlightBackground': '#1E293B66',
        'editorIndentGuide.background1': '#334155',
        'editorIndentGuide.activeBackground1': '#64748B',
      },
    })
  }, [])

  // handleEditorMount 在挂载后聚焦编辑器，并保留未来扩展 Monaco 实例配置的入口。
  const handleEditorMount: OnMount = useCallback((editor) => {
    editor.focus()
  }, [])

  const handleChange = useCallback((val: string | undefined) => {
    onChange(val ?? '')
  }, [onChange])

  return (
    <div className="code-editor-shell" style={{ border: '1px solid #1e293b', borderRadius: 8, overflow: 'hidden', backgroundColor: '#0f172a' }}>
      <MonacoEditor
        beforeMount={handleBeforeMount}
        onMount={handleEditorMount}
        height={height}
        language={monacoLanguage}
        value={value}
        onChange={handleChange}
        theme="programming-dark"
        loading={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Spin indicator={<LoadingOutlined spin />} tip="Loading Editor..." />
          </div>
        }
        options={{
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
          fontLigatures: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          detectIndentation: false,
          wordWrap: 'off',
          lineNumbers: 'on',
          renderWhitespace: 'selection',
          renderControlCharacters: false,
          renderLineHighlight: 'line',
          guides: {
            indentation: true,
            highlightActiveIndentation: true,
          },
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
          folding: true,
          bracketPairColorization: { enabled: true },
          autoClosingBrackets: 'always',
          autoClosingQuotes: 'always',
          formatOnPaste: true,
          formatOnType: true,
          padding: { top: 12, bottom: 12 },
          placeholder,
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
        }}
      />
    </div>
  )
}
