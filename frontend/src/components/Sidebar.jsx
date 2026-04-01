import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe, ShoppingBag, Cloud, Settings,
  Sun, Moon, ChevronRight, X,
  Layers, GitBranch, Package, Cpu, Shield, Bell, HelpCircle, Zap,
} from 'lucide-react'
import { useTheme } from '../ThemeContext'
import useStore from '../store'

// ── Panel content per nav item ──────────────────────────────────────────────
const PANELS = {
  namespace: {
    title: 'BRMH Namespace',
    sections: [
      {
        heading: 'Active Namespaces',
        items: [
          { icon: Layers,    label: 'brmh-core',       sub: 'v2.4.1 · Active',    badge: 'live',    badgeColor: '#10b981' },
          { icon: GitBranch, label: 'brmh-staging',    sub: 'v2.3.9 · Staging',   badge: 'staging', badgeColor: '#f59e0b' },
          { icon: Package,   label: 'brmh-dev',        sub: 'v2.5.0-beta · Dev',  badge: 'dev',     badgeColor: '#6366f1' },
        ],
      },
      {
        heading: 'Quick Actions',
        items: [
          { icon: Zap,    label: 'Deploy Namespace',  sub: 'Push to production' },
          { icon: Shield, label: 'Access Control',    sub: 'Manage permissions' },
          { icon: Bell,   label: 'Alerts & Monitors', sub: '3 active alerts' },
        ],
      },
    ],
  },
  playstore: {
    title: 'BRMH Playstore',
    sections: [
      {
        heading: 'Installed Apps',
        items: [
          { icon: Cpu,        label: 'Schema Forge',    sub: 'AI schema builder',    badge: 'v1.2', badgeColor: '#6366f1' },
          { icon: GitBranch,  label: 'API Mapper',      sub: 'Route visualizer',     badge: 'v0.9', badgeColor: '#06b6d4' },
          { icon: Layers,     label: 'Data Lens',       sub: 'Query explorer',       badge: 'v2.0', badgeColor: '#10b981' },
        ],
      },
      {
        heading: 'Recommended',
        items: [
          { icon: Package, label: 'Mock Studio',    sub: 'Generate mock data' },
          { icon: Shield,  label: 'Auth Manager',   sub: 'JWT & OAuth flows' },
          { icon: Bell,    label: 'Event Stream',   sub: 'Real-time webhooks' },
        ],
      },
    ],
  },
  aws: {
    title: 'AWS Services',
    sections: [
      {
        heading: 'Connected Services',
        items: [
          { icon: Cloud,   label: 'S3 Buckets',      sub: '4 buckets · us-east-1',  badge: 'OK',  badgeColor: '#10b981' },
          { icon: Cpu,     label: 'Lambda Functions', sub: '12 functions · active',  badge: 'OK',  badgeColor: '#10b981' },
          { icon: Layers,  label: 'DynamoDB',         sub: '3 tables · provisioned', badge: 'OK',  badgeColor: '#10b981' },
        ],
      },
      {
        heading: 'Infrastructure',
        items: [
          { icon: Shield,    label: 'IAM Roles',      sub: '8 roles configured' },
          { icon: GitBranch, label: 'VPC Networks',   sub: '2 VPCs · 6 subnets' },
          { icon: Bell,      label: 'CloudWatch',     sub: '5 alarms active' },
        ],
      },
    ],
  },
  settings: {
    title: 'Settings',
    sections: [
      {
        heading: 'Workspace',
        items: [
          { icon: Layers,  label: 'Editor Preferences', sub: 'Font, theme, keybinds' },
          { icon: Shield,  label: 'API Keys',            sub: '3 keys configured' },
          { icon: Bell,    label: 'Notifications',       sub: 'Email & Slack alerts' },
        ],
      },
      {
        heading: 'Account',
        items: [
          { icon: Package,   label: 'Profile',         sub: 'dev@brmh.ai' },
          { icon: GitBranch, label: 'Integrations',    sub: 'GitHub, Jira, Slack' },
          { icon: HelpCircle,label: 'Documentation',   sub: 'Guides & API reference' },
        ],
      },
    ],
  },
}

const NAV = [
  { id: 'namespace', icon: Globe,       color: '#06b6d4', label: 'Namespace'    },
  { id: 'playstore', icon: ShoppingBag, color: '#6366f1', label: 'Playstore'    },
  { id: 'aws',       icon: Cloud,       color: '#10b981', label: 'AWS Services' },
  { id: 'settings',  icon: Settings,    color: '#f59e0b', label: 'Settings'     },
]

function PanelContent({ id, t }) {
  const panel = PANELS[id]
  if (!panel) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Panel header */}
      <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${t.border}` }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
          color: t.textMuted, marginBottom: 2 }}>BRMH</p>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: t.text, letterSpacing: '-0.02em' }}>{panel.title}</h2>
      </div>

      {/* Sections */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {panel.sections.map((sec) => (
          <div key={sec.heading} style={{ marginBottom: 4 }}>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: t.textDim, padding: '8px 16px 4px' }}>
              {sec.heading}
            </p>
            {sec.items.map((item) => {
              const Icon = item.icon
              return (
                <motion.button key={item.label} whileHover={{ backgroundColor: t.bgHover }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 16px', border: 'none', background: 'transparent',
                    cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                    background: t.bgCard, border: `1px solid ${t.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={14} color={t.textMuted} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: t.text, whiteSpace: 'nowrap',
                      overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</p>
                    <p style={{ fontSize: 11, color: t.textMuted, marginTop: 1 }}>{item.sub}</p>
                  </div>
                  {item.badge && (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                      background: `${item.badgeColor}18`, color: item.badgeColor, flexShrink: 0 }}>
                      {item.badge}
                    </span>
                  )}
                </motion.button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Sidebar() {
  const { t, mode, toggle: toggleTheme } = useTheme()
  const active  = useStore((s) => s.activeSidebarItem)
  const setItem = useStore((s) => s.setActiveSidebarItem)

  const drawerOpen = active !== null
  const DRAWER_W   = 240

  return (
    <div style={{ display: 'flex', height: '100%', flexShrink: 0 }}>
      {/* ── Icon strip ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        width: 48, height: '100%', flexShrink: 0,
        background: t.bgSurface, borderRight: `1px solid ${t.border}`,
        paddingTop: 8, paddingBottom: 8, gap: 2,
      }}>
        {/* Logo */}
        <div style={{ width: 32, height: 32, borderRadius: 8, marginBottom: 8,
          background: 'linear-gradient(135deg,#6366f1,#06b6d4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Zap size={16} color="white" />
        </div>

        {/* Nav icons */}
        {NAV.map(({ id, icon: Icon, color, label }) => {
          const on = active === id
          return (
            <motion.button key={id} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
              onClick={() => setItem(on ? null : id)} title={label}
              style={{
                width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: on ? `${color}18` : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', transition: 'all 0.15s',
              }}>
              <Icon size={18} color={on ? color : t.textDim} strokeWidth={on ? 2 : 1.5} />
              {on && (
                <motion.div layoutId="strip-pip"
                  style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                    width: 3, height: 18, borderRadius: '0 3px 3px 0', background: color }} />
              )}
            </motion.button>
          )
        })}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Theme toggle */}
        <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
          onClick={toggleTheme} title={mode === 'dark' ? 'Light mode' : 'Dark mode'}
          style={{ width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {mode === 'dark'
            ? <Sun size={17} color={t.textDim} strokeWidth={1.5} />
            : <Moon size={17} color={t.textDim} strokeWidth={1.5} />}
        </motion.button>
      </div>

      {/* ── Inline drawer (pushes workspace) ── */}
      <AnimatePresence initial={false}>
        {drawerOpen && (
          <motion.div
            key="drawer"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: DRAWER_W, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            style={{
              height: '100%', overflow: 'hidden', flexShrink: 0,
              background: t.bgPanel, borderRight: `1px solid ${t.border}`,
              boxShadow: t.shadow,
            }}
          >
            {/* Close button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 8px 0' }}>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={() => setItem(null)}
                style={{ width: 24, height: 24, borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: t.bgHover, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={13} color={t.textMuted} />
              </motion.button>
            </div>
            <div style={{ width: DRAWER_W, height: 'calc(100% - 36px)' }}>
              <PanelContent id={active} t={t} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
