import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import useStore from '../store'

beforeEach(() => {
  useStore.setState({
    tabs: [],
    activeTabId: null,
    logs: [],
    sidebarExpanded: false,
    activeSidebarItem: null,
    activeEngine: null,
    engineLoading: false,
    promptHistory: [],
  })
})

describe('Property 1: activeTabId validity across arbitrary add/remove sequences', () => {
  it('activeTabId always references an existing tab or is null when empty', () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.constant('add'), fc.constant('remove')), { minLength: 1, maxLength: 20 }),
        (ops) => {
          useStore.setState({ tabs: [], activeTabId: null })
          for (const op of ops) {
            const state = useStore.getState()
            if (op === 'add') {
              useStore.getState().addTab('Tab', 'blank')
            } else if (state.tabs.length > 0) {
              const randomTab = state.tabs[Math.floor(Math.random() * state.tabs.length)]
              useStore.getState().removeTab(randomTab.id)
            }
            const { tabs, activeTabId } = useStore.getState()
            if (tabs.length === 0) {
              expect(activeTabId).toBeNull()
            } else {
              expect(tabs.some(t => t.id === activeTabId)).toBe(true)
            }
          }
        }
      )
    )
  })
})

describe('Property 10: whitespace prompt is a no-op', () => {
  it('submitPromptCommand with whitespace-only strings never appends to promptHistory', () => {
    fc.assert(
      fc.property(
        fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 20 }),
        (whitespace) => {
          useStore.setState({
            promptHistory: [],
            tabs: [{ id: 'x', label: 'T', type: 'blank', output: null }],
            activeTabId: 'x',
            logs: [],
          })
          useStore.getState().submitPromptCommand(whitespace)
          expect(useStore.getState().promptHistory).toHaveLength(0)
        }
      )
    )
  })
})

describe('Property 11: accordion engine exclusivity', () => {
  it('setActiveEngine ensures at most one engine is active', () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.constant('schema'), fc.constant('api'), fc.constant(null)), { minLength: 1, maxLength: 10 }),
        (engines) => {
          for (const engine of engines) {
            useStore.getState().setActiveEngine(engine)
            expect(useStore.getState().activeEngine).toBe(engine)
          }
        }
      )
    )
  })
})
