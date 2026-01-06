# Novel Mode Design Document

## Overview
Novel Mode is a new story mode that provides a collaborative writing experience where both the user and AI write on a single canvas, without the traditional card-based separation of user actions and AI narration.

## Key Features

### 1. Single Canvas Layout
- **No separate user/AI cards**: Unlike Adventure and Creative Writing modes, Novel Mode uses a single continuous text area where both user and AI contributions appear seamlessly.
- **No bottom text input**: The traditional action input area at the bottom is removed in Novel Mode.
- **Inline editing**: Users can click anywhere in the text to make edits or additions.

### 2. Setup Process
- **Same steps as Creative Writing mode**: Novel Mode follows the identical setup wizard flow as Creative Writing mode, including:
  - Genre selection
  - Setting description and expansion
  - Character creation (protagonist and supporting characters)
  - Writing style configuration (POV, tense, tone)
  - Opening scene generation with optional guidance

### 2. Instruction Card System
- **Trigger**: Pressing `/` while writing brings up an instruction card.
- **Purpose**: Allows users to provide guidance to the AI about how the story should proceed.
- **Design**: A bounded text box that appears at the cursor position or as a floating card.
- **Actions**: Users can type instructions and press "Generate" to have the AI continue writing.

### 3. Collaborative Writing Flow
1. User starts writing directly on the canvas
2. When user presses `/`, instruction card appears
3. User provides guidance (e.g., "Write a dramatic confrontation scene")
4. User clicks "Generate" or presses Enter
5. AI writes directly on the canvas, continuing from where the user left off
6. Process repeats collaboratively

## Technical Implementation

### Type System Updates

**File**: `src/lib/types/index.ts`
```typescript
// Update StoryMode type
export type StoryMode = 'adventure' | 'creative-writing' | 'novel';
```

### UI Components

#### 1. NovelView.svelte
**Location**: `src/lib/components/story/NovelView.svelte`
**Purpose**: Main component for Novel Mode's single canvas interface

**Key Features**:
- Full-screen editable text area
- No separate entry cards
- Keyboard shortcut handling for `/`
- Integration with instruction card

#### 2. InstructionCard.svelte
**Location**: `src/lib/components/story/InstructionCard.svelte`
**Purpose**: Floating card for AI instructions

**Key Features**:
- Textarea for user instructions
- Generate button
- Close/cancel functionality
- Positioning relative to cursor or centered

### Setup Wizard Updates

**File**: `src/lib/components/wizard/SetupWizard.svelte`

**Changes**:
1. Add third mode option in Step 1 (Mode Selection)
2. Update grid layout to accommodate three columns (sm:grid-cols-3)
3. Add Novel Mode card with appropriate icon and description
4. **Novel Mode follows the same setup steps as Creative Writing mode** (all 7 steps)

**Novel Mode Card**:
```svelte
<button
  class="card p-6 text-left transition-all hover:border-tertiary-500/50"
  class:ring-2={selectedMode === 'novel'}
  class:ring-tertiary-500={selectedMode === 'novel'}
  onclick={() => selectedMode = 'novel'}
>
  <div class="flex items-center gap-4 mb-3">
    <div class="rounded-lg bg-tertiary-900/50 p-3">
      <Book class="h-6 w-6 text-tertiary-400" />
    </div>
    <span class="text-lg font-semibold text-surface-100">Novel Mode</span>
  </div>
  <p class="text-sm text-surface-400">
    <strong>Collaborative writing canvas.</strong> Write together with the AI on a single
    continuous canvas. Use instructions to guide the AI's contributions.
  </p>
</button>
```

### Story View Updates

**File**: `src/lib/components/story/StoryView.svelte`

**Changes**:
1. Add conditional rendering for Novel Mode
2. Replace traditional entry system with NovelView component
3. Handle mode-specific keyboard shortcuts

### Keyboard Shortcut Handling

**Implementation**:
- Add event listener for keydown events
- Detect `/` key press
- Show instruction card at cursor position
- Handle Escape to close instruction card

### AI Generation Flow

**Sequence**:
1. User types `/` to open instruction card
2. User provides guidance text
3. User clicks "Generate" or presses Enter
4. System sends instruction + current context to AI
5. AI generates continuation text
6. Generated text is inserted at cursor position
7. Instruction card closes
8. User can continue writing or add more instructions

### State Management

**UI Store Updates**:
- Add `isInstructionCardVisible` state
- Add `instructionText` state
- Add `instructionCardPosition` state
- Add mode-specific keyboard handlers

## Visual Design

### Novel Mode Card (Setup Wizard)
```
+---------------------+
| Icon    Novel Mode  |
+---------------------+
| Collaborative writing canvas. Write together with the AI on a single continuous canvas. Use instructions to guide the AI's contributions. |
+---------------------+
```

### Instruction Card
```
+-----------------------------------+
| [Instruction Card]               |
|                                   |
| [Text area for instructions...]   |
|                                   |
| [Generate Button] [Cancel]        |
+-----------------------------------+
```

### Novel View Layout
```
+-----------------------------------+
| [Single Canvas Text Area]        |
|                                   |
| (User and AI text mixed)          |
|                                   |
| (Cursor position determines      |
|  where new text is inserted)      |
+-----------------------------------+
```

## Implementation Plan

### Phase 1: Foundation
1. Update StoryMode type
2. Create NovelView.svelte skeleton
3. Create InstructionCard.svelte skeleton
4. Add Novel Mode to SetupWizard

### Phase 2: Core Functionality
1. Implement single canvas editing
2. Add keyboard shortcut handling
3. Implement instruction card functionality
4. Connect to AI generation

### Phase 3: Integration
1. Update StoryView to handle Novel Mode
2. Add mode-specific UI elements
3. Test collaborative writing flow
4. Fix any bugs

### Phase 4: Polish
1. Add animations and transitions
2. Improve visual design
3. Add help/tooltips
4. Final testing

## Success Criteria

1. Novel Mode appears as a third option in the setup wizard
2. Novel Mode provides a single continuous writing canvas
3. Pressing `/` opens the instruction card
4. AI generates text based on user instructions
5. Generated text appears seamlessly in the canvas
6. User can continue writing after AI generation
7. All functionality works smoothly on mobile devices

## Open Questions

1. Should Novel Mode support chapters or sections?
2. How should we handle versioning/revisions in Novel Mode?
3. Should there be a word count or progress indicator?
4. How should we handle formatting (bold, italics, etc.) in the single canvas?
5. Should we provide templates or starting prompts for Novel Mode?

## Next Steps

1. Create a new git branch for Novel Mode development
2. Implement the type system updates
3. Create the basic UI components
4. Implement the core functionality
5. Test and iterate based on feedback