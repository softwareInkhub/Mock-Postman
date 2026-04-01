import { useTheme } from './ThemeContext'
import Sidebar from './components/Sidebar'
import Tabs from './components/Tabs'
import Preview from './components/Preview'
import Console from './components/Console'
import Engines from './components/Engines'
import Prompt from './components/Prompt'

export default function App() {
  const { t } = useTheme()

  return (
    <div style={{
      display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden',
      background: t.bg, color: t.text, fontFamily: 'Inter, sans-serif',
    }}>
      {/* ── SIDEBAR (icon strip + inline drawer) ── */}
      <Sidebar />

      {/* ── MAIN AREA ── */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>

        {/* Middle row: workspace + right engines panel */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

          {/* Left workspace: tabs + preview + console */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden',
            borderRight: `1px solid ${t.border}` }}>
            <Tabs />
            <Preview />
            {/* Console — bottom of workspace */}
            <div style={{ flexShrink: 0, height: 280, borderTop: `1px solid ${t.border}`, overflow: 'hidden' }}>
              <Console />
            </div>
          </div>

          {/* Right control panel: engines + AI terminal stacked */}
          <div style={{ display: 'flex', flexDirection: 'column', width: 300, flexShrink: 0,
            background: t.bgSurface, overflow: 'hidden' }}>
            <Engines />
            {/* AI Terminal — bottom of right panel */}
            <div style={{ flexShrink: 0, height: 220, borderTop: `1px solid ${t.border}`, overflow: 'hidden' }}>
              <Prompt />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
