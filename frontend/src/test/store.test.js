import { describe, it, expect, beforeEach } from 'vitest'
import useStore from '../store'

// Reset store before each test
beforeEach(() => {
  useStore.setState({
    sidebarExpanded: false,
    activeSidebarItem: null,
    tabs: [],
    activeTabId: null,
    logs: [],
    activeEngine: null,
    engineLoading: false,
    promptHistory: [],
  })
})

describe('Tab actions', () => {
  it('addTab: new tab becomes active and tabs.length increases by 1 (Property 5)', () => {
    const { addTab } = useStore.getState()
    addTab('Test', 'blank')
    const { tabs, activeTabId } = useStore.getState()
    expect(tabs).toHaveLength(1)
    expect(activeTabId).toBe(tabs[0].id)
  })

  it('removeTab: removes tab and activates adjacent (Property 4)', () => {
    const { addTab, removeTab } = useStore.getState()
    addTab('Tab1', 'blank')
    addTab('Tab2', 'blank')
    const { tabs } = useStore.getState()
    const firstId = tabs[0].id
    const secondId = tabs[1].id
    // second is active; remove it
    removeTab(secondId)
    const state = useStore.getState()
    expect(state.tabs).toHaveLength(1)
    expect(state.activeTabId).toBe(firstId)
  })

  it('removeTab: last tab sets activeTabId to null (Property 1)', () => {
    const { addTab, removeTab } = useStore.getState()
    addTab('Only', 'blank')
    const { tabs } = useStore.getState()
    removeTab(tabs[0].id)
    const state = useStore.getState()
    expect(state.tabs).toHaveLength(0)
    expect(state.activeTabId).toBeNull()
  })

  it('setActiveTab: updates activeTabId to given id', () => {
    const { addTab, setActiveTab } = useStore.getState()
    addTab('A', 'blank')
    addTab('B', 'blank')
    const { tabs } = useStore.getState()
    setActiveTab(tabs[0].id)
    expect(useStore.getState().activeTabId).toBe(tabs[0].id)
  })
})

describe('addLog (Property 2)', () => {
  it('appends log entry with correct fields', () => {
    const { addTab, addLog } = useStore.getState()
    addTab('T', 'blank')
    const { activeTabId } = useStore.getState()
    addLog({ tabId: activeTabId, level: 'info', message: 'hello' })
    const { logs } = useStore.getState()
    expect(logs).toHaveLength(1)
    expect(logs[0].tabId).toBe(activeTabId)
    expect(logs[0].level).toBe('info')
    expect(logs[0].message).toBe('hello')
    expect(logs[0].id).toBeDefined()
    expect(logs[0].timestamp).toBeDefined()
  })
})

describe('submitPromptCommand (Property 6, 10)', () => {
  it('appends command to promptHistory synchronously (Property 6)', () => {
    const { addTab, submitPromptCommand } = useStore.getState()
    addTab('T', 'blank')
    submitPromptCommand('test command')
    const { promptHistory } = useStore.getState()
    expect(promptHistory).toHaveLength(1)
    expect(promptHistory[0].input).toBe('test command')
  })

  it('whitespace-only input is a no-op (Property 10)', () => {
    const { submitPromptCommand } = useStore.getState()
    submitPromptCommand('   ')
    expect(useStore.getState().promptHistory).toHaveLength(0)
  })

  it('empty string is a no-op (Property 10)', () => {
    const { submitPromptCommand } = useStore.getState()
    submitPromptCommand('')
    expect(useStore.getState().promptHistory).toHaveLength(0)
  })
})

describe('toggleSidebar (Property 7)', () => {
  it('toggles sidebarExpanded to boolean complement', () => {
    const { toggleSidebar } = useStore.getState()
    expect(useStore.getState().sidebarExpanded).toBe(false)
    toggleSidebar()
    expect(useStore.getState().sidebarExpanded).toBe(true)
    toggleSidebar()
    expect(useStore.getState().sidebarExpanded).toBe(false)
  })
})
