# Creative Writing POV Enhancement Plan

## Overview
Extend Creative Writing mode to support all three POVs (first, second, third person) with dynamic system prompt generation.

## Current Limitations
- Creative Writing mode only offers third person POV
- System prompts hardcode third person instructions
- POV selection is automatically enforced as third person

## Implementation Plan

### 1. SetupWizard.svelte Changes

#### Location: `src/lib/components/wizard/SetupWizard.svelte`

**Current Code (lines 137-147):**
```svelte
const povOptions = $derived.by((): { id: POV; label: string; example: string }[] => {
  if (selectedMode === 'creative-writing') {
    return [
      { id: 'third', label: '3rd Person', example: 'They walk into the room...' },
    ];
  }
  return [
    { id: 'first', label: '1st Person', example: 'I walk into the room...' },
    { id: 'third', label: '3rd Person', example: 'They walk into the room...' },
  ];
});
```

**Required Change:**
```svelte
const povOptions = $derived.by((): { id: POV; label: string; example: string }[] => {
  if (selectedMode === 'creative-writing') {
    return [
      { id: 'first', label: '1st Person', example: 'I walk into the room...' },
      { id: 'second', label: '2nd Person', example: 'You walk into the room...' },
      { id: 'third', label: '3rd Person', example: 'They walk into the room...' },
    ];
  }
  return [
    { id: 'first', label: '1st Person', example: 'I walk into the room...' },
    { id: 'third', label: '3rd Person', example: 'They walk into the room...' },
  ];
});
```

**Current Code (lines 168-176):**
```svelte
$effect(() => {
  if (selectedMode === 'creative-writing') {
    selectedPOV = 'third';
    selectedTense = 'past';
  } else {
    selectedPOV = 'first';
    selectedTense = 'present';
  }
});
```

**Required Change:**
```svelte
$effect(() => {
  if (selectedMode === 'creative-writing') {
    // Keep past tense as default for Creative Writing (literary standard)
    selectedTense = 'past';
    // Don't override POV - let user choose
  } else {
    selectedPOV = 'first';
    selectedTense = 'present';
  }
});
```

### 2. scenario.ts Changes

#### Location: `src/lib/services/ai/scenario.ts`

**Current Code (lines 792-808):**
```typescript
} else if (mode === 'creative-writing') {
  // Creative writing mode: The user is the AUTHOR, not the protagonist
  // The AI can and should write the protagonist's actions, thoughts, and dialogue
  systemPrompt = `You are crafting the opening scene of a ${genreLabel} story in collaboration with an author.

<critical_understanding>
The person reading this opening is the AUTHOR, not a character. They sit outside the story, directing what happens. The protagonist (${userName}) is a fictional character you write—not a stand-in for the author.
</critical_understanding>

<style>
- POV: Third person limited (through ${userName}'s perspective)
- ${tenseInstruction}
- Tone: ${writingStyle.tone || 'immersive and engaging'}
- 2-3 paragraphs of literary prose
- Concrete sensory details grounded in character perception
- Reach past the first cliché; invisible prose serves the story better than showy prose
</style>
```

**Required Change:**
```typescript
} else if (mode === 'creative-writing') {
  // Creative writing mode: The user is the AUTHOR, not the protagonist
  // The AI can and should write the protagonist's actions, thoughts, and dialogue
  
  // Generate POV instruction based on selected POV
  let povInstruction = '';
  switch (writingStyle.pov) {
    case 'first':
      povInstruction = `First person from ${userName}'s perspective ("I see...", "I feel...")`;
      break;
    case 'second':
      povInstruction = `Second person addressing ${userName} as "you" ("You see...", "You feel...")`;
      break;
    case 'third':
      povInstruction = `Third person limited (through ${userName}'s perspective)`;
      break;
  }
  
  systemPrompt = `You are crafting the opening scene of a ${genreLabel} story in collaboration with an author.

<critical_understanding>
The person reading this opening is the AUTHOR, not a character. They sit outside the story, directing what happens. The protagonist (${userName}) is a fictional character you write—not a stand-in for the author.
</critical_understanding>

<style>
- POV: ${povInstruction}
- ${tenseInstruction}
- Tone: ${writingStyle.tone || 'immersive and engaging'}
- 2-3 paragraphs of literary prose
- Concrete sensory details grounded in character perception
- Reach past the first cliché; invisible prose serves the story better than showy prose
</style>
```

**Current Code (lines 827-828):**
```typescript
NEVER use second person ("you"). Always use "${userName}" or "he/she/they".
```

**Required Change:**
```typescript
${writingStyle.pov === 'second' ? 
  'Use second person ("you") to address the protagonist directly.' : 
  writingStyle.pov === 'first' ? 
  'Use first person ("I") from the protagonist\'s perspective.' : 
  'NEVER use second person ("you"). Always use "${userName}" or "he/she/they".'}
```

### 3. Streaming Opening Generation

**Current Code (lines 1090-1091):**
```typescript
- POV: Third person limited (through ${userName}'s perspective)
```

**Required Change:**
```typescript
- POV: ${povInstruction}
```

### 4. buildSystemPrompt Method

**Current Code (lines 1322-1401):**
The Creative Writing section needs to use the dynamic POV instruction instead of hardcoded third person.

**Required Change:**
Update the Creative Writing system prompt to use the `povInstruction` variable that's already generated.

## Testing Plan

1. **UI Testing**: Verify all three POV options appear in Creative Writing mode
2. **POV Selection**: Ensure selected POV is preserved through the wizard
3. **System Prompt Generation**: Check that generated system prompts contain correct POV instructions
4. **Story Generation**: Test that stories are generated in the correct POV
5. **Edge Cases**: Test switching between modes, changing POV mid-wizard

## Implementation Order

1. First modify SetupWizard.svelte to enable POV selection
2. Then update scenario.ts to handle dynamic POV in system prompts
3. Finally test the complete flow

This approach ensures the UI changes work before implementing the backend logic.