import { create } from 'zustand'

const initialTabId = crypto.randomUUID()

const useStore = create((set, get) => ({
  // State
  sidebarExpanded: false,
  activeSidebarItem: null,
  tabs: [{ id: initialTabId, label: 'Welcome', type: 'blank', output: null }],
  activeTabId: initialTabId,
  logs: [],
  activeEngine: null,
  engineLoading: false,
  promptHistory: [],

  // Sidebar actions
  toggleSidebar: () =>
    set((state) => ({ sidebarExpanded: !state.sidebarExpanded })),

  setActiveSidebarItem: (id) => set({ activeSidebarItem: id }),

  // Tab actions
  addTab: (label, type) => {
    const id = crypto.randomUUID()
    set((state) => ({
      tabs: [...state.tabs, { id, label, type, output: null }],
      activeTabId: id,
    }))
  },

  removeTab: (id) => {
    const { tabs, activeTabId } = get()
    const index = tabs.findIndex((t) => t.id === id)
    const filtered = tabs.filter((t) => t.id !== id)

    let newActiveTabId = activeTabId
    if (filtered.length === 0) {
      newActiveTabId = null
    } else if (activeTabId === id) {
      newActiveTabId = filtered[Math.max(0, index - 1)].id
    }

    set({ tabs: filtered, activeTabId: newActiveTabId })
  },

  setActiveTab: (id) => set({ activeTabId: id }),

  setTabOutput: (tabId, output) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, output } : t)),
    })),

  // Log action
  addLog: ({ tabId, level, message }) =>
    set((state) => ({
      logs: [
        ...state.logs,
        {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          tabId,
          level,
          message,
        },
      ],
    })),

  // Engine actions
  setActiveEngine: (engine) => set({ activeEngine: engine }),

  generateSchema: async (payload) => {
    const { activeTabId, addLog, setTabOutput } = get()
    set({ engineLoading: true })
    addLog({ tabId: activeTabId, level: 'info', message: 'Generating schema...' })
    try {
      const res = await fetch('/api/schema/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      setTabOutput(activeTabId, result.schema || result)
      addLog({ tabId: activeTabId, level: 'info', message: 'Schema generated' })
    } catch (err) {
      addLog({ tabId: activeTabId, level: 'error', message: err.message })
    } finally {
      set({ engineLoading: false })
    }
  },

  sendRequest: async (payload) => {
    const { activeTabId, addLog, setTabOutput } = get()
    set({ engineLoading: true })
    addLog({
      tabId: activeTabId,
      level: 'info',
      message: `Sending ${payload.method} ${payload.url}`,
    })
    try {
      const res = await fetch('/api/requests/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      setTabOutput(activeTabId, result)
      addLog({ tabId: activeTabId, level: 'info', message: 'Response received' })
    } catch (err) {
      addLog({ tabId: activeTabId, level: 'error', message: err.message })
    } finally {
      set({ engineLoading: false })
    }
  },

  // Prompt action
  submitPromptCommand: (input) => {
    if (input.trim() === '') return
    const { activeTabId, addLog } = get()
    const command = {
      id: crypto.randomUUID(),
      input: input.trim(),
      timestamp: new Date().toISOString(),
      response: null,
    }
    set((state) => ({ promptHistory: [...state.promptHistory, command] }))
    addLog({ tabId: activeTabId, level: 'info', message: '[Prompt] ' + input })
    set((state) => ({
      promptHistory: state.promptHistory.map((c) =>
        c.id === command.id
          ? { ...c, response: 'Command received: ' + input }
          : c
      ),
    }))
  },
}))

export default useStore
