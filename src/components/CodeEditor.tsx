import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { useState } from 'react'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function CodeEditor({ value, onChange, placeholder, disabled }: CodeEditorProps) {
  const [focused, setFocused] = useState(false)
  
  const lines = value.split('\n').length
  const characters = value.length
  
  return (
    <Card className={`p-0 overflow-hidden transition-all ${focused ? 'ring-2 ring-ring' : ''}`}>
      <div className="bg-muted px-4 py-2 border-b border-border flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground font-mono">CODE EDITOR</span>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>{lines} lines</span>
          <span>{characters} characters</span>
        </div>
      </div>
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder || "// Write your code here..."}
          disabled={disabled}
          className="font-mono text-sm min-h-[400px] border-0 rounded-none resize-none focus-visible:ring-0"
          id="code-input"
        />
      </div>
    </Card>
  )
}
