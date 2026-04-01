import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Database, Zap } from 'lucide-react'
import { useTheme } from '../ThemeContext'
import useStore from '../store'

function highlight(json, t) {
  return json
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (m) => {
        if (/^".*":$/.test(m)) return `<span style="color:${t.cyan}">${m}</span>`
        if (/^"/.test(m))       return `<span style="color:${t.green}">${m}</span>`
        if (/true|false/.test(m)) return `<span style="color:${t.violet}">${m}</span>`
        if (/null/.test(m))     return `<span style="color:${t.red}">${m}</span>`
        return `<span style="color:${t.amber}">${m}</span>`
      }
    )
}

function EmptyState({ t }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', gap: 20, padding: 40 }}>
      <div style={{ position: 'relative' }}>
        <motion.div animate={{ scale: [1,1.18,1], opacity: [0.15,0.35,0.15] }}
          transition={{ duration: 4, repeat: Infinity }}
          style={{ position: 'absolute', inset: -20, borderRadius: '50%',
            background: `radial-gradient(circle, ${t.accent}40, transparent)`, filter: 'blur(12px)' }} />
        <div style={{ position: 'relative', width: 72, height: 72, borderRadius: 18,
          background: t.bgCard, border: `1px solid ${t.border}`,
          boxShadow: t.shadowSm, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={30} color={t.accent} />
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: t.text, letterSpacing: '-0.03em', marginBottom: 8 }}>
          BRMH Workspace
        </h3>
        <p style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.65, maxWidth: 300 }}>
          Use the engines on the right to generate schemas or send API requests. Output renders here.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {[{ icon: Database, label: 'Schema Engine', color: t.cyan },
          { icon: Zap,      label: 'API Engine',    color: t.accent }].map(({ icon: Icon, label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px',
            borderRadius: 8, fontSize: 12, fontWeight: 500,
            background: t.bgCard, border: `1px solid ${t.border}`, color: t.textMuted }}>
            <Icon size={13} color={color} /> {label}
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export default function Preview() {
  const { t } = useTheme()
  const activeTabId = useStore((s) => s.activeTabId)
  const tabs        = useStore((s) => s.tabs)
  const activeTab   = tabs.find((tab) => tab.id === activeTabId)
  const hasOutput   = activeTab?.output != null

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', background: t.bg, display: 'flex', flexDirection: 'column' }}>
      <AnimatePresence mode="wait">
        {!hasOutput ? (
          <motion.div key="empty" style={{ flex: 1, overflow: 'hidden' }}>
            <EmptyState t={t} />
          </motion.div>
        ) : (
          <motion.div key={activeTabId} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', flexShrink: 0,
              borderBottom: `1px solid ${t.border}`, background: t.bgSurface }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: t.green }} />
              <span style={{ fontSize: 11, color: t.textMuted, fontFamily: 'JetBrains Mono, monospace' }}>
                {activeTab?.label} · output
              </span>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
              <pre style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, lineHeight: 1.75,
                color: t.textMuted, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                dangerouslySetInnerHTML={{ __html: highlight(JSON.stringify(activeTab.output, null, 2), t) }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
