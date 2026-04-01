import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'
import useStore from '../store'

beforeEach(() => {
  const tabId = crypto.randomUUID()
  useStore.setState({
    tabs: [{ id: tabId, label: 'Welcome', type: 'blank', output: null }],
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

describe('App integration (task 11.7)', () => {
  it('renders without crashing', () => {
    render(<App />)
    expect(document.getElementById('root') || document.body).toBeTruthy()
  })

  it('adds a new tab when + is clicked', () => {
    render(<App />)
    const addBtn = screen.getByText('+')
    fireEvent.click(addBtn)
    expect(useStore.getState().tabs).toHaveLength(2)
  })

  it('schema engine generates output and logs appear in console', async () => {
    const mockSchema = { tables: [{ name: 'users', columns: [] }] }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ schema: mockSchema }),
    }))
    render(<App />)
    // Open schema engine
    const schemaBtn = screen.getByText('Schema Engine')
    fireEvent.click(schemaBtn)
    // Fill prompt
    const textarea = screen.getByPlaceholderText('Describe your schema...')
    fireEvent.change(textarea, { target: { value: 'e-commerce app' } })
    // Click generate
    const generateBtn = screen.getByText('Generate Schema')
    fireEvent.click(generateBtn)
    // Wait for output
    await waitFor(() => {
      const state = useStore.getState()
      const activeTab = state.tabs.find(t => t.id === state.activeTabId)
      expect(activeTab?.output).toEqual(mockSchema)
    })
    // Verify logs
    const logs = useStore.getState().logs
    expect(logs.some(l => l.message === 'Generating schema...')).toBe(true)
    expect(logs.some(l => l.message === 'Schema generated')).toBe(true)
  })
})
