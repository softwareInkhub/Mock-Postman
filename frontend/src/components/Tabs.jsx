import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Database, Zap, FileCode } from 'lucide-react'
import { useTheme } from '../ThemeContext'
import useStore from '../store'

const TYPE_COLOR = { schema: '#06b6d4', api: '#6366f1', blank: null }
const TYPE_ICON  = { schema: Database,  api: Zap,       blank: FileCode }

export default function Tabs() {
  const { t } = useTheme()
  const tabs        = useStore((s) => s.tabs)
  const activeTabId = useStore((s) => s.activeTabId)
  const setActiveTab = useStore((s) => s.setActiveTab)
  const addTab      = useStore((s) => s.addTab)
  const removeTab   = useStore((s) => s.removeTab)

  return (
    <div style={{
      display: 'flex', alignItems: 'stretch', flexShrink: 0,
      background: t.bgSurface, borderBottom: `1px solid ${t.border}`,
      overflowX: 'auto', overflowY: 'hidden', height: 36,
    }}>
      <AnimatePresence initial={false}>
        {tabs.map((tab) => {
          const on    = tab.id === activeTabId
          const color = TYPE_COLOR[tab.type] || t.accent
          const Icon  = TYPE_ICON[tab.type]  || FileCode
          return (
            <motion.div key={tab.id}
              initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.15 }}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px',
                cursor: 'pointer', flexShrink: 0, position: 'relative', userSelect: 'none',
                background: on ? t.bg : 'transparent',
                borderRight: `1px solid ${t.border}`,
                borderTop: `2px solid ${on ? color : 'transparent'}`,
              }}
            >
              <Icon size={12} color={on ? color : t.textDim} />
              <span style={{ fontSize: 12, fontWeight: on ? 500 : 400,
                color: on ? t.text : t.textMuted, whiteSpace: 'nowrap' }}>
                {tab.label}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); removeTab(tab.id) }}
                style={{ width: 16, height: 16, borderRadius: 3, border: 'none', background: 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: t.textDim, cursor: 'pointer', opacity: 0, transition: 'opacity 0.1s' }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
              >
                <X size={10} />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>

      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
        onClick={() => addTab('New Tab', 'blank')}
        style={{ width: 28, height: 28, margin: 'auto 4px', borderRadius: 6,
          border: `1px solid ${t.border}`, background: 'transparent',
          color: t.textDim, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0 }}>
        <Plus size={13} />
      </motion.button>
    </div>
  )
}
