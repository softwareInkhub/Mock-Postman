import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal } from 'lucide-react'
import { useTheme } from '../ThemeContext'
import useStore from '../store'

function ts(iso) {
  const d = new Date(iso)
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2,'0')).join(':')
}

export default function Console() {
  const { t } = useTheme()
  const logs        = useStore((s) => s.logs)
  const activeTabId = useStore((s) => s.activeTabId)
  const ref         = useRef(null)
  const filtered    = logs.filter((l) => l.tabId === activeTabId)

  useEffect(() => { ref.current?.scrollIntoView({ behavior: 'smooth' }) }, [filtered.length])

  const LVL = {
    info:  { color: t.textMuted, badge: t.cyan,  bg: t.cyanSub,  label: 'INFO' },
    warn:  { color: t.amber,     badge: t.amber,  bg: t.amberSub, label: 'WARN' },
    error: { color: t.red,       badge: t.red,    bg: t.redSub,   label: 'ERR ' },
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column',
      background: t.bgPanel }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', flexShrink: 0,
        borderBottom: `1px solid ${t.border}`,
        background: t.bgCard }}>
        <Terminal size={13} color={t.accent} />
        <span style={{ fontSize: 11, fontWeight: 600, color: t.text }}>
          Console
        </span>
        <span style={{ fontSize: 11, color: t.textDim, marginLeft: 4 }}>— session logs</span>
        {filtered.length > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 7px', borderRadius: 10,
            background: t.accentSub, color: t.accent, fontWeight: 600 }}>
            {filtered.length}
          </span>
        )}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 12px',
        fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5 }}>
        <AnimatePresence initial={false}>
          {filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ color: t.textDim, paddingTop: 4 }}>
              › No logs for this session.
            </motion.div>
          ) : filtered.map((log) => {
            const l = LVL[log.level] || LVL.info
            return (
              <motion.div key={log.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '2px 0' }}>
                <span style={{ color: t.textDim, flexShrink: 0 }}>{ts(log.timestamp)}</span>
                <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, flexShrink: 0,
                  background: l.bg, color: l.badge, lineHeight: '16px' }}>{l.label}</span>
                <span style={{ color: l.color }}>{log.message}</span>
              </motion.div>
            )
          })}
        </AnimatePresence>
        <div ref={ref} />
      </div>
    </div>
  )
}
