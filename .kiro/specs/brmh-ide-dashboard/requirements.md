# Requirements Document

## Introduction

The BRMH IDE Dashboard is a fully rebuilt React frontend that replaces the existing single-page schema studio. It provides a browser-based IDE-style interface with a split-pane workspace, collapsible sidebar, Safari-style tab system, live preview panel, console log area, a right-side control panel housing Schema and API engines, and an AI-style prompt terminal. All communication flows to the existing backend at `localhost:4000` via two POST endpoints.

## Glossary

- **Dashboard**: The root React application rendered by `App.jsx`
- **Sidebar**: The collapsible icon drawer on the left edge of the workspace
- **Tabs**: The Safari-style horizontal tab bar managing open service sessions
- **Tab**: A single session entry with an id, label, type, and output slot
- **Preview**: The main content area rendering the active tab's output
- **Console**: The scrollable log panel anchored to the bottom of the left section
- **Engines**: The right-panel component housing Schema Engine and API Engine forms
- **Schema_Engine**: The form within Engines that triggers schema generation via `POST /api/schema/generate`
- **API_Engine**: The form within Engines that triggers API requests via `POST /api/requests/send`
- **Prompt**: The AI-style terminal input at the bottom of the right panel
- **Store**: The Zustand global state store (`useStore`)
- **LogEntry**: An append-only log record with id, tabId, timestamp, level, and message
- **PromptCommand**: An append-only prompt history record with id, input, timestamp, and response

---

## Requirements

### Requirement 1: Root Layout

**User Story:** As a developer, I want a full-screen IDE-style layout, so that I have a stable, distraction-free workspace that uses the entire viewport.

#### Acceptance Criteria

1. THE Dashboard SHALL render a fixed full-screen layout occupying 100vh with overflow hidden and no body scroll
2. THE Dashboard SHALL divide the viewport into a left section occupying 75% of the width and a right section occupying 25% of the width
3. THE Dashboard SHALL mount Sidebar, Tabs, Preview, and Console within the left section
4. THE Dashboard SHALL mount Engines and Prompt within the right section

---

### Requirement 2: Sidebar Navigation

**User Story:** As a developer, I want a collapsible sidebar, so that I can access navigation items without losing workspace space.

#### Acceptance Criteria

1. THE Sidebar SHALL render in a collapsed state by default, showing only icons
2. WHEN the sidebar toggle is activated, THE Sidebar SHALL switch between collapsed (icon-only strip) and expanded (floating overlay panel) states
3. WHEN the sidebar is expanded, THE Sidebar SHALL float over the left section content using absolute positioning without pushing or resizing the layout
4. THE Sidebar SHALL render exactly four navigation items: Namespace, Playstore, AWS Services, and Settings
5. WHEN a navigation item is clicked, THE Sidebar SHALL communicate the active item id to the Store

---

### Requirement 3: Tab Management

**User Story:** As a developer, I want a Safari-style tab bar, so that I can manage multiple open service sessions simultaneously.

#### Acceptance Criteria

1. THE Tabs component SHALL render all open tabs with a visual highlight on the active tab
2. WHEN the "+" button is clicked, THE Tabs component SHALL add a new blank tab to the Store and set it as the active tab
3. WHEN a tab's "×" button is clicked and more than one tab is open, THE Tabs component SHALL remove that tab from the Store and set the nearest adjacent tab as the active tab
4. WHEN the last remaining tab's "×" button is clicked, THE Tabs component SHALL remove the tab and set activeTabId to null in the Store
5. WHEN a tab is clicked, THE Tabs component SHALL set that tab as the active tab in the Store
6. WHEN more tabs are open than fit the tab bar width, THE Tabs component SHALL enable horizontal overflow scrolling

---

### Requirement 4: Preview Panel

**User Story:** As a developer, I want a live preview panel, so that I can see the output of the active tab's engine operation.

#### Acceptance Criteria

1. WHEN the active tab has a non-null output value, THE Preview SHALL render it as formatted JSON with indentation
2. WHEN the active tab has a null output value, THE Preview SHALL render a placeholder empty state
3. WHEN the active tab changes, THE Preview SHALL immediately re-render with the new active tab's output
4. THE Preview SHALL fill the remaining vertical space between the tab bar and the Console

---

### Requirement 5: Console Log Panel

**User Story:** As a developer, I want a per-tab console log, so that I can trace the activity and errors for each open session independently.

#### Acceptance Criteria

1. THE Console SHALL display only LogEntry records whose tabId matches the current activeTabId
2. WHEN a new LogEntry is added to the active tab, THE Console SHALL auto-scroll to the bottom of the log list
3. THE Console SHALL render with a fixed height that does not affect the layout of Preview above it
4. WHEN the active tab changes, THE Console SHALL immediately re-render showing only logs for the newly active tab

---

### Requirement 6: Schema Engine

**User Story:** As a developer, I want a Schema Engine form, so that I can generate data schemas by submitting a prompt to the backend.

#### Acceptance Criteria

1. THE Engines component SHALL render a "Schema Engine" toggle button that expands the Schema Engine form inline within the right panel
2. WHEN the Schema Engine form is expanded and the API Engine form is also expanded, THE Engines component SHALL collapse the API Engine form (accordion behavior)
3. THE Schema_Engine form SHALL contain a prompt textarea, an optional domain field, and a Generate button
4. WHEN the Generate button is clicked with a non-empty prompt and a non-null activeTabId, THE Store SHALL set engineLoading to true, append an info LogEntry, and dispatch a POST to `/api/schema/generate`
5. WHEN the schema generation request succeeds, THE Store SHALL set the active tab's output to the returned schema object and append an info LogEntry
6. WHEN the schema generation request fails, THE Store SHALL append an error-level LogEntry and reset engineLoading to false
7. WHEN the Generate button is clicked with an empty prompt, THE Schema_Engine SHALL prevent submission
8. THE Store SHALL reset engineLoading to false after the generateSchema promise settles regardless of outcome

---

### Requirement 7: API Engine

**User Story:** As a developer, I want an API Engine form, so that I can send HTTP requests through the backend proxy and inspect responses.

#### Acceptance Criteria

1. THE Engines component SHALL render an "API Engine" toggle button that expands the API Engine form inline within the right panel
2. WHEN the API Engine form is expanded and the Schema Engine form is also expanded, THE Engines component SHALL collapse the Schema Engine form (accordion behavior)
3. THE API_Engine form SHALL contain a method selector (GET, POST, PUT, DELETE, PATCH), a URL input, a headers area, a body textarea, and a Send button
4. WHEN the Send button is clicked with a non-empty URL and a valid HTTP method, THE Store SHALL set engineLoading to true, append an info LogEntry, and dispatch a POST to `/api/requests/send`
5. WHEN the API request succeeds, THE Store SHALL set the active tab's output to the response object and append an info LogEntry
6. WHEN the API request fails, THE Store SHALL append an error-level LogEntry and reset engineLoading to false
7. THE Store SHALL reset engineLoading to false after the sendRequest promise settles regardless of outcome

---

### Requirement 8: Prompt Terminal

**User Story:** As a developer, I want an AI-style prompt terminal, so that I can issue free-text automation commands and review command history.

#### Acceptance Criteria

1. THE Prompt component SHALL render a terminal-styled input area with a dark background, monospace font, and blinking cursor
2. THE Prompt component SHALL display a scrollable command history above the input line
3. WHEN a non-empty, non-whitespace-only command is submitted, THE Store SHALL append a PromptCommand entry to promptHistory before any async work begins
4. WHEN a non-empty command is submitted, THE Prompt component SHALL append an info LogEntry to the active tab's console
5. WHEN an empty or whitespace-only command is submitted, THE Prompt component SHALL be a no-op and not append to promptHistory
6. WHEN a command is submitted, THE Prompt component SHALL display a response in the command history

---

### Requirement 9: Global Store Invariants

**User Story:** As a developer, I want the global state to remain consistent at all times, so that the UI never enters an invalid or undefined state.

#### Acceptance Criteria

1. FOR ALL tab operations, THE Store SHALL ensure activeTabId references a tab that exists in the tabs array, or is null only when the tabs array is empty
2. FOR ALL addLog calls, THE Store SHALL ensure the LogEntry's tabId references a tab that existed at the time the log was created
3. THE Store SHALL treat the logs array as append-only; no LogEntry SHALL be mutated after creation
4. THE Store SHALL treat the promptHistory array as append-only; no PromptCommand SHALL be mutated after creation
5. WHEN addTab is called, THE Store SHALL increase tabs.length by exactly 1 and set activeTabId to the new tab's id
6. WHEN removeTab is called, THE Store SHALL decrease tabs.length by exactly 1

---

### Requirement 10: Backend Integration

**User Story:** As a developer, I want all engine actions to communicate with the existing backend, so that real schema generation and API proxying work without additional configuration.

#### Acceptance Criteria

1. WHEN generateSchema is dispatched, THE Store SHALL send a POST request to `/api/schema/generate` with the prompt and optional domain payload
2. WHEN sendRequest is dispatched, THE Store SHALL send a POST request to `/api/requests/send` with the method, url, headers, and body payload
3. THE Dashboard SHALL proxy all `/api` requests to `localhost:4000` via the Vite dev server configuration
4. IF a network request returns a non-2xx status, THEN THE Store SHALL treat it as a failure and follow the error handling path defined in Requirements 6.6 and 7.6
