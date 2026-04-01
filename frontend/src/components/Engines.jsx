import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Database, Zap, ChevronDown, Send, Cpu, Loader2 } from 'lucide-react'
import { useTheme } from '../ThemeContext'
import useStore from '../store'

const safeJson = (s) => { try { return JSON.parse(s) } catch { return {} } }

function Field({ as: Tag = 'input', label, focusColor, t, containerStyle, ...props }) {
  const [f, setF] = useState(false)
  const fc = focusColor || t.accent
  return (
    <div style={containerStyle}>
      {label && <p style={{ fontSize: 11, fontWeight: 500, color: t.textMuted, marginBottom: 4 }}>{label}</p>}
      <Tag {...props}
        style={{
          width: '100%', background: t.bgCard, border: `1px solid ${f ? fc : t.border}`,
          borderRadius: 7, padding: '8px 10px', color: t.text, outline: 'none', resize: 'none',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
          boxShadow: f ? `0 0 0 3px ${fc}20` : 'none', transition: 'all 0.15s',
        }}
        onFocus={() => setF(true)} onBlur={() => setF(false)}
      />
    </div>
  )
}

function Btn({ children, loading, disabled, onClick, color, t }) {
  return (
    <motion.button whileHover={!disabled ? { scale: 1.01 } : {}} whileTap={!disabled ? { scale: 0.98 } : {}}
      onClick={onClick} disabled={disabled}
      style={{
        width: '100%', padding: '9px 0', borderRadius: 8,
        border: `1px solid ${disabled ? t.border : color}`,
        background: disabled ? t.bgCard : color,
        color: disabled ? t.textDim : '#fff',
        fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'all 0.15s', opacity: disabled ? 0.5 : 1,
      }}>
      {loading ? <><Loader2 size={13} className="spin" /> Processing…</> : children}
    </motion.button>
  )
}

function SchemaForm({ t }) {
  const [prompt, setPrompt] = useState('')
  const [domain, setDomain] = useState('')
  const { engineLoading, generateSchema } = useStore()
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10,
        borderBottom: `1px solid ${t.border}` }}>
        <Field as="textarea" rows={4} t={t} focusColor={t.cyan}
          placeholder="Describe your data model… e.g. 'E-commerce with users, products, orders'"
          value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <Field t={t} focusColor={t.cyan} placeholder="Domain hint (optional) — e.g. fintech"
          value={domain} onChange={(e) => setDomain(e.target.value)} />
        <Btn t={t} color={t.cyan} loading={engineLoading} disabled={engineLoading || !prompt.trim()}
          onClick={() => generateSchema({ prompt, domain: domain.trim() || undefined })}>
          <Database size={13} /> Generate Schema
        </Btn>
      </div>
    </motion.div>
  )
}

function ApiForm({ t }) {
  const [method, setMethod] = useState('GET')
  const [url, setUrl]       = useState('')
  const [headers, setHeaders] = useState('{}')
  const [body, setBody]     = useState('{}')
  const { engineLoading, sendRequest } = useStore()
  const MC = { GET: t.green, POST: t.cyan, PUT: t.amber, DELETE: t.red, PATCH: t.violet }
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10,
        borderBottom: `1px solid ${t.border}` }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={method} onChange={(e) => setMethod(e.target.value)}
            style={{ width: 82, padding: '8px 6px', borderRadius: 7,
              border: `1px solid ${MC[method]}55`, background: `${MC[method]}15`,
              color: MC[method], fontFamily: 'JetBrains Mono,monospace', fontSize: 11,
              fontWeight: 700, outline: 'none', cursor: 'pointer' }}>
            {['GET','POST','PUT','DELETE','PATCH'].map((m) => (
              <option key={m} value={m} style={{ background: t.bgCard, color: MC[m] }}>{m}</option>
            ))}
          </select>
          <Field t={t} focusColor={t.accent} placeholder="https://api.example.com/endpoint"
            value={url} onChange={(e) => setUrl(e.target.value)} containerStyle={{ flex: 1 }} />
        </div>
        <Field as="textarea" rows={2} t={t} label="Headers" focusColor={t.accent}
          placeholder={'{"Authorization":"Bearer …"}'} value={headers} onChange={(e) => setHeaders(e.target.value)} />
        <Field as="textarea" rows={3} t={t} label="Body" focusColor={t.accent}
          placeholder={'{"key":"value"}'} value={body} onChange={(e) => setBody(e.target.value)} />
        <Btn t={t} color={t.accent} loading={engineLoading} disabled={engineLoading || !url.trim()}
          onClick={() => sendRequest({ method, url, headers: safeJson(headers), body: safeJson(body) })}>
          <Send size={13} /> Send Request
        </Btn>
      </div>
    </motion.div>
  )
}

const ENGINES = [
  { id: 'schema', label: 'Schema Engine', sub: 'AI-powered data modeling', icon: Database, colorKey: 'cyan',   Form: SchemaForm },
  { id: 'api',    label: 'API Engine',    sub: 'HTTP client · Mock Postman', icon: Zap,     colorKey: 'accent', Form: ApiForm    },
]

export default function Engines() {
  const { t } = useTheme()
  const { activeEngine, setActiveEngine } = useStore()

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', flexShrink: 0,
        borderBottom: `1px solid ${t.border}` }}>
        <Cpu size={13} color={t.textDim} />
        <span style={{ fontSize: 11, fontWeight: 600, color: t.textMuted }}>Engines</span>
        <div className="pulse-dot" style={{ marginLeft: 'auto', width: 6, height: 6,
          borderRadius: '50%', background: t.green }} />
      </div>

      {ENGINES.map(({ id, label, sub, icon: Icon, colorKey, Form }) => {
        const open  = activeEngine === id
        const color = t[colorKey]
        return (
          <div key={id} style={{ borderBottom: `1px solid ${t.borderSub}` }}>
            <motion.button whileHover={{ backgroundColor: t.bgHover }}
              onClick={() => setActiveEngine(open ? null : id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                background: open ? t.bgHover : 'transparent', transition: 'background 0.12s' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: open ? `${color}18` : t.bgCard, border: `1px solid ${open ? `${color}40` : t.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                <Icon size={15} color={open ? color : t.textDim} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: open ? color : t.text }}>{label}</p>
                <p style={{ fontSize: 11, color: t.textMuted }}>{sub}</p>
              </div>
              <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={14} color={t.textDim} />
              </motion.div>
            </motion.button>
            <AnimatePresence>{open && <Form t={t} />}</AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
