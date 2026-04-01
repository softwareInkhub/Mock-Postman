import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Terminal } from 'lucide-react'
import { useTheme } from '../ThemeContext'
import useStore from '../store'

const HINTS = [
  'generate schema for e-commerce',
  'send GET /api/health',
  'describe users table',
  'list all endpoints',
  'create mock data for orders',
]

export default function Prompt() {
  const { t } = useTheme()
  const [input, setInput]     = useState('')
  const [focused, setFocused] = useState(false)
  const [hints, setHints]     = useState([])
  const promptHistory         = useStore((s) => s.promptHistory)
  const submit                = useStore((s) => s.submitPromptCommand)
  const bottomRef             = useRef(null)
  const inputRef              = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [promptHistory.length])

  const onKey = (e) => {
    if (e.key === 'Enter' && input.trim()) { submit(input); setInput(''); setHints([]) }
    if (e.key === 'Escape') setHints([])
  }
  const onChange = (e) => {
    const v = e.target.value; setInput(v)
    setHints(v.trim() ? HINTS.filter((h) => h.includes(v.toLowerCase())) : [])
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column',
      background: t.bgSurface }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', flexShrink: 0,
        borderBottom: `1px solid ${t.border}`, background: t.bgCard }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0,
          background: `linear-gradient(135deg,${t.accent},${t.violet})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={12} color="white" />
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>AI Terminal</span>
        <span style={{ fontSize: 11, color: t.textDim, marginLeft: 4 }}>— prompt & automation</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: t.textDim,
          padding: '2px 7px', borderRadius: 6, background: t.bgHover }}>↵ run</span>
      </div>

      {/* History */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px',
        fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
        <AnimatePresence initial={false}>
          {promptHistory.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ color: t.textDim, paddingTop: 2 }}>
              › Ready. Type a command.
            </motion.div>
          )}
          {promptHistory.map((cmd) => (
            <motion.div key={cmd.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ color: t.accent }}>❯</span>
                <span style={{ color: t.text }}>{cmd.input}</span>
              </div>
              {cmd.response && (
                <div style={{ display: 'flex', gap: 8, paddingLeft: 16, marginTop: 2 }}>
                  <span style={{ color: t.textDim }}>→</span>
                  <span style={{ color: t.textMuted }}>{cmd.response}</span>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <AnimatePresence>
          {hints.length > 0 && focused && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
              style={{ position: 'absolute', bottom: '100%', left: 0, right: 0,
                background: t.bgPanel, border: `1px solid ${t.border}`,
                borderRadius: '8px 8px 0 0', overflow: 'hidden', boxShadow: t.shadow }}>
              {hints.map((h) => (
                <button key={h} onMouseDown={() => { setInput(h); setHints([]); inputRef.current?.focus() }}
                  style={{ width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none',
                    background: 'transparent', color: t.accent, fontSize: 12, cursor: 'pointer',
                    fontFamily: 'JetBrains Mono, monospace',
                    borderBottom: `1px solid ${t.borderSub}` }}
                  onMouseEnter={(e) => e.currentTarget.style.background = t.bgHover}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ color: t.textDim }}>❯ </span>{h}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
          borderTop: `1px solid ${focused ? t.accent + '55' : t.border}`,
          background: focused ? t.accentSub : 'transparent', transition: 'all 0.15s' }}>
          <Terminal size={12} color={focused ? t.accent : t.textDim} />
          <input ref={inputRef} type="text" value={input} onChange={onChange} onKeyDown={onKey}
            onFocus={() => setFocused(true)} onBlur={() => { setFocused(false); setTimeout(() => setHints([]), 150) }}
            placeholder="Enter command or query…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: t.text, fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
              caretColor: t.accent }}
          />
          {focused && <span className="blink" style={{ color: t.accent, fontSize: 14 }}>█</span>}
        </div>
      </div>
    </div>
  )
}
