# Tasks

## Task List

- [x] 1. Project setup and dependencies
  - [x] 1.1 Add zustand to frontend/package.json and install dependencies
  - [x] 1.2 Configure Vite proxy to forward /api requests to localhost:4000
  - [x] 1.3 Ensure Tailwind CSS is available (CDN or npm) in the frontend

- [x] 2. Zustand global store
  - [x] 2.1 Create frontend/src/store.js with full AppState shape: tabs, activeTabId, logs, sidebarExpanded, activeSidebarItem, activeEngine, engineLoading, promptHistory
  - [x] 2.2 Implement tab actions: addTab, removeTab, setActiveTab, setTabOutput
  - [x] 2.3 Implement log action: addLog
  - [x] 2.4 Implement sidebar actions: toggleSidebar, setActiveSidebarItem
  - [x] 2.5 Implement engine actions: setActiveEngine, generateSchema (POST /api/schema/generate), sendRequest (POST /api/requests/send)
  - [x] 2.6 Implement prompt action: submitPromptCommand

- [x] 3. Root layout — App.jsx
  - [x] 3.1 Replace frontend/src/main.jsx entry point to mount App
  - [x] 3.2 Implement App.jsx with full-screen fixed layout (100vh, overflow hidden), 75/25 horizontal split, mounting all child components

- [x] 4. Sidebar component
  - [x] 4.1 Create frontend/src/components/Sidebar.jsx
  - [x] 4.2 Implement collapsed (icon-only) and expanded (floating absolute panel) states driven by store.sidebarExpanded
  - [x] 4.3 Render four nav items (Namespace, Playstore, AWS Services, Settings) with Lucide icons and framer-motion expand/collapse animation
  - [x] 4.4 Wire toggle and active item click to store actions

- [x] 5. Tabs component
  - [x] 5.1 Create frontend/src/components/Tabs.jsx
  - [x] 5.2 Render tab list with active highlight, "+" add button, and "×" close button per tab
  - [x] 5.3 Wire addTab, removeTab, setActiveTab to store actions
  - [x] 5.4 Enable horizontal overflow scroll when tabs overflow the bar width

- [x] 6. Preview component
  - [x] 6.1 Create frontend/src/components/Preview.jsx
  - [x] 6.2 Read activeTabId and tabs from store; render active tab output as formatted JSON (JSON.stringify with indentation)
  - [x] 6.3 Render placeholder empty state when output is null
  - [x] 6.4 Fill remaining vertical space between Tabs and Console

- [x] 7. Console component
  - [x] 7.1 Create frontend/src/components/Console.jsx
  - [x] 7.2 Filter logs by activeTabId and render with timestamp, level, and message in monospace dark terminal style
  - [x] 7.3 Implement auto-scroll to bottom on new log entry using a ref
  - [x] 7.4 Fix height (180px) so it does not affect Preview layout

- [x] 8. Engines component
  - [x] 8.1 Create frontend/src/components/Engines.jsx
  - [x] 8.2 Render Schema Engine and API Engine toggle buttons with accordion behavior (only one expanded at a time)
  - [x] 8.3 Implement Schema Engine form: prompt textarea, optional domain field, Generate button; disable button when engineLoading is true or prompt is empty
  - [x] 8.4 Implement API Engine form: method selector (GET/POST/PUT/DELETE/PATCH), URL input, headers textarea, body textarea, Send button
  - [x] 8.5 Wire Generate to store.generateSchema and Send to store.sendRequest

- [x] 9. Prompt component
  - [x] 9.1 Create frontend/src/components/Prompt.jsx
  - [x] 9.2 Render terminal-styled input (dark bg, monospace, blinking cursor) with scrollable command history above
  - [x] 9.3 Wire Enter key submission to store.submitPromptCommand; guard against empty/whitespace-only input
  - [x] 9.4 Display command response in history after submission

- [x] 10. Styling and polish
  - [x] 10.1 Apply consistent dark theme (gray-950 background, gray-800 borders) across all components
  - [x] 10.2 Ensure Sidebar floating panel has elevated z-index and does not reflow layout
  - [x] 10.3 Verify responsive overflow behavior in Tabs and Console scroll areas

- [x] 11. Tests
  - [x] 11.1 Write unit tests for store tab actions (addTab, removeTab, setActiveTab) verifying activeTabId invariant (Property 1, 4, 5)
  - [x] 11.2 Write unit tests for addLog verifying referential integrity (Property 2)
  - [x] 11.3 Write unit tests for generateSchema and sendRequest with mocked fetch verifying engineLoading reset (Property 3) and output assignment (Property 9)
  - [x] 11.4 Write property-based tests using fast-check for: activeTabId validity across arbitrary add/remove sequences (Property 1), whitespace prompt no-op (Property 10), accordion exclusivity (Property 11)
  - [x] 11.5 Write unit test for submitPromptCommand verifying prompt appended before async work (Property 6) and whitespace guard (Property 10)
  - [x] 11.6 Write unit test for toggleSidebar verifying pure boolean complement (Property 7)
  - [x] 11.7 Write integration test mounting App with mocked fetch: open tab → trigger Schema Engine → verify Preview renders output and Console shows logs
