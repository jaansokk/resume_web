# Interactive Resume App Architecture

This directory contains the interactive resume site UI, organized to mirror the site IA (routes) while keeping shared features and UI primitives reusable.

## Structure

```
components/
├── routes/                      # Route-level entrypoints (mirror site IA)
│   ├── resume/                  # Mounted at `/` (interactive resume)
│   │   ├── ResumeApp.tsx        # Orchestrator (state management & routing)
│   │   └── views/               # Route-specific top-level views
│   │       ├── HandshakeView.tsx
│   │       ├── ChatView.tsx
│   │       └── SplitView.tsx
│   ├── cv/                      # Mounted on `/cv`
│   │   └── CVChatWidget.tsx     # Floating chat widget on the CV page
│   ├── contact/                 # Mounted on `/contact`
│   │   └── ContactView.tsx
│   └── share/                   # Mounted on `/c/*` (shared snapshot)
│       └── SharedConversationApp.tsx
│
├── features/                    # Reusable cross-route features
│   ├── chat/                    # Chat UI building blocks
│   ├── artifacts/               # FitBrief/RelevantExperience panel + tabs
│   ├── handshake/               # Quick reply UI for handshake
│   └── share/                   # Share modal flow
│
├── ui/                          # Reusable UI primitives / app chrome
│   ├── Header.tsx
│   ├── BackgroundOverlay.tsx
│   └── Modal.tsx
│
├── astro/                       # Astro-only components used by Astro pages
│   └── KeyProjectAccordion.astro
│
└── domain/                      # Shared types/constants used across features/routes
    └── types.ts
```

## Component Hierarchy

### Main App (`routes/resume/ResumeApp.tsx`)
- **Responsibilities**: State management, API calls, view routing for the interactive resume on `/`.
- **State**: conversationId, messages, viewMode, artifacts, etc.

### View Components
Each route-level view is self-contained and receives all necessary props from the route app/orchestrator:

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
ResumeApp (state management)
  ↓
[HandshakeView | ChatView | SplitView] (view logic & layout)
  ↓
[features/*] (chat/artifacts/share/handshake)
  ↓
[ui/*] (Header/Modal/BackgroundOverlay) + small presentational components
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
- Shared types in `domain/types.ts`

### Import Conventions
- Relative imports within the components directory
- Utility imports from `../utils/`
- Type imports using `type` keyword when importing only types

## Usage

The resume app is imported in `pages/index.astro`:

```tsx
import ResumeApp from '../components/routes/resume/ResumeApp';

// In the page:
<ResumeApp client:load />
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
