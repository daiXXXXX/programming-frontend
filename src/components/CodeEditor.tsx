'use client'

import { useCallback } from 'react'
import Editor, { OnMount } from '@monaco-editor/react'
import { Spin } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'

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

  const handleEditorMount: OnMount = useCallback((editor) => {
    editor.focus()
  }, [])

  const handleChange = useCallback((val: string | undefined) => {
    onChange(val ?? '')
  }, [onChange])

  return (
    <div style={{ border: '1px solid #d9d9d9', borderRadius: 8, overflow: 'hidden' }}>
      <Editor
        height={height}
        language={monacoLanguage}
        value={value}
        onChange={handleChange}
        onMount={handleEditorMount}
        theme="vs-dark"
        loading={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Spin indicator={<LoadingOutlined spin />} tip="Loading Editor..." />
          </div>
        }
        options={{
          fontSize: 14,
          fontFamily: "'Fira Code', 'Cascadia Code', Menlo, Monaco, 'Courier New', monospace",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          lineNumbers: 'on',
          renderLineHighlight: 'line',
          suggestOnTriggerCharacters: true,
          folding: true,
          bracketPairColorization: { enabled: true },
          padding: { top: 12, bottom: 12 },
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
        }}
      />
    </div>
  )
}
