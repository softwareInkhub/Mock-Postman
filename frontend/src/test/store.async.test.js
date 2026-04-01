import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import useStore from '../store'

beforeEach(() => {
  const tabId = crypto.randomUUID()
  useStore.setState({
    tabs: [{ id: tabId, label: 'Test', type: 'blank', output: null }],
    activeTabId: tabId,
    logs: [],
    engineLoading: false,
    promptHistory: [],
    sidebarExpanded: false,
    activeSidebarItem: null,
    activeEngine: null,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('generateSchema (Property 3, 9)', () => {
  it('sets output on success and resets engineLoading (Property 3, 9)', async () => {
    const mockSchema = { tables: [{ name: 'users' }] }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ schema: mockSchema }),
    }))
    const { generateSchema } = useStore.getState()
    await generateSchema({ prompt: 'e-commerce' })
    const state = useStore.getState()
    expect(state.engineLoading).toBe(false)
    const activeTab = state.tabs.find(t => t.id === state.activeTabId)
    expect(activeTab.output).toEqual(mockSchema)
  })

  it('resets engineLoading on error (Property 3)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    const { generateSchema } = useStore.getState()
    await generateSchema({ prompt: 'test' })
    expect(useStore.getState().engineLoading).toBe(false)
    const errorLog = useStore.getState().logs.find(l => l.level === 'error')
    expect(errorLog).toBeDefined()
  })
})

describe('sendRequest (Property 3)', () => {
  it('resets engineLoading after success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ status: 200, data: {} }),
    }))
    const { sendRequest } = useStore.getState()
    await sendRequest({ method: 'GET', url: 'https://example.com' })
    expect(useStore.getState().engineLoading).toBe(false)
  })

  it('resets engineLoading after failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fail')))
    const { sendRequest } = useStore.getState()
    await sendRequest({ method: 'GET', url: 'https://example.com' })
    expect(useStore.getState().engineLoading).toBe(false)
  })
})
