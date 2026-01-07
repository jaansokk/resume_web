# Interactive Resume App Architecture

This directory contains the interactive resume application, structured as maintainable, reusable React components.

## Structure

```
components/
├── App.tsx                      # Main app orchestrator (state management & routing)
├── types.ts                     # Shared TypeScript types and constants
│
├── shared/                      # Shared components used across views
│   ├── Header.tsx              # Site header with navigation
│   └── BackgroundOverlay.tsx   # Background image with overlays
│
├── views/                       # Top-level view components
│   ├── HandshakeView.tsx       # Landing page with hero and quick replies
│   ├── ChatView.tsx            # Single-column chat view
│   └── SplitView.tsx           # Split view with artifacts and chat
│
├── chat/                        # Chat-related components
│   ├── ChatMessage.tsx         # Individual message bubble
│   ├── ChatInput.tsx           # Text input with send button
│   ├── LoadingIndicator.tsx   # Three bouncing dots
│   └── ChipList.tsx            # Follow-up suggestion chips
│
├── handshake/                   # Handshake-specific components
│   └── QuickReplyGrid.tsx      # 2x2 grid of quick reply buttons
│
├── artifacts/                   # Artifact panel components
│   ├── ArtifactsPanel.tsx      # Container with tabs and content
│   ├── FitBriefTab.tsx         # Fit brief sections
│   └── ExperienceTab.tsx       # Relevant experience items
│
└── modals/                      # Modal dialogs
    └── ShareModal.tsx           # Two-step share modal
```

## Component Hierarchy

### Main App (App.tsx)
- **Responsibilities**: State management, API calls, view routing
- **Props**: None (root component)
- **State**: conversationId, messages, viewMode, artifacts, etc.
- **Exports**: Default export as `App`

### View Components
Each view is self-contained and receives all necessary props from the main app:

#### HandshakeView
- Hero text with animated subline
- Quick reply grid (4 buttons)
- Free text input

#### ChatView
- Scrollable message list
- Auto-scroll to bottom
- Fixed input at bottom
- Dynamic centering based on content overflow
- Follow-up chips

#### SplitView
- Left: Artifacts panel with tabs (Fit Brief / Relevant Experience)
- Right: Chat panel with messages and input
- Share modal integration

## Key Benefits

1. **Separation of Concerns**: Each component has a single, clear responsibility
2. **Reusability**: Components like `ChatMessage`, `ChatInput`, and `LoadingIndicator` are used across multiple views
3. **Maintainability**: Easy to find and update specific functionality
4. **Type Safety**: Shared types in `types.ts` ensure consistency
5. **Testability**: Smaller components are easier to test in isolation
6. **Readability**: Clear component hierarchy and responsibilities

## Props Flow

```
App (state management) 
  ↓
[HandshakeView | ChatView | SplitView] (view logic & layout)
  ↓
[ChatMessage, ChatInput, etc.] (presentational components)
```

## Component Guidelines

### Naming Conventions
- **Views**: Descriptive names ending in `View` (e.g., `ChatView`)
- **UI Components**: Descriptive names for their purpose (e.g., `ChatInput`, `LoadingIndicator`)
- **Containers**: Descriptive names ending in `Panel` or `Container` (e.g., `ArtifactsPanel`)

### File Organization
- One component per file
- Component name matches filename
- Related components grouped in directories
- Shared types in `types.ts`

### Import Conventions
- Relative imports within the components directory
- Utility imports from `../utils/`
- Type imports using `type` keyword when importing only types

## Usage

The main app component is imported in `pages/index.astro`:

```tsx
import App from '../components/App';

// In the page:
<App client:load />
```

## Functional Coverage

All functionality from the original implementation is preserved:
- ✅ Handshake animations and transitions
- ✅ Chat message rendering and auto-scroll
- ✅ Split view with tabs and artifacts
- ✅ Share modal (deferred functionality preserved)
- ✅ API integration and state management
- ✅ All styling and animations
- ✅ Responsive layout and transitions

## Development

### Adding a New View
1. Create a new component in `views/`
2. Define props interface
3. Import and use existing components from `chat/`, `shared/`, etc.
4. Add routing logic in `App.tsx`

### Adding a New Feature
1. Determine which component(s) it affects
2. Add state to `App.tsx` if needed
3. Pass state/handlers down through props
4. Keep components focused on presentation when possible

### Modifying Styles
- Global styles are in `pages/index.astro`
- Component-specific styles use Tailwind classes
- CSS variables defined in `:root` for theming
