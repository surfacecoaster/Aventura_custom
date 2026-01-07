<script lang="ts">
  import { story } from '$lib/stores/story.svelte';
  import { ui } from '$lib/stores/ui.svelte';
  import { settings } from '$lib/stores/settings.svelte';
  import { aiService } from '$lib/services/ai';
  import { countTokens } from '$lib/services/tokenizer';
  import { Book, Loader2, Send, X, Slash, ChevronDown, ChevronRight, Pencil } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import StoryEntry from './StoryEntry.svelte';
  import StreamingEntry from './StreamingEntry.svelte';
  
  let novelCanvas: HTMLDivElement;
  let instructionText = $state('');
  let isGenerating = $state(false);
  let showInstructionHint = $state(true);
  let collapsedYouCards = $state<Set<string>>(new Set());
  let collapsedInstructionCards = $state<Set<string>>(new Set());
  let editingInstructionId = $state<string | null>(null);
  let editInstructionText = $state('');
  
  // Track submitted instructions as cards
  let instructionCards = $state<Array<{
    id: string;
    text: string;
    generatedEntryId?: string;
  }>>([]);
  
  // Toggle collapse state for a "you" card
  function toggleCollapse(entryId: string) {
    const newSet = new Set(collapsedYouCards);
    if (newSet.has(entryId)) {
      newSet.delete(entryId);
    } else {
      newSet.add(entryId);
    }
    collapsedYouCards = newSet;
  }
  
  // Check if a "you" card is collapsed
  function isCollapsed(entryId: string): boolean {
    return collapsedYouCards.has(entryId);
  }
  
  // Toggle collapse state for an instruction card
  function toggleInstructionCollapse(cardId: string) {
    const newSet = new Set(collapsedInstructionCards);
    if (newSet.has(cardId)) {
      newSet.delete(cardId);
    } else {
      newSet.add(cardId);
    }
    collapsedInstructionCards = newSet;
  }
  
  // Check if an instruction card is collapsed
  function isInstructionCollapsed(cardId: string): boolean {
    return collapsedInstructionCards.has(cardId);
  }
  
  // Start editing an instruction card
  function startEditInstruction(cardId: string, currentText: string) {
    editingInstructionId = cardId;
    editInstructionText = currentText;
  }
  
  // Save edited instruction
  async function saveEditInstruction(cardId: string) {
    const cardIndex = instructionCards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;
    
    instructionCards[cardIndex].text = editInstructionText.trim();
    editingInstructionId = null;
    editInstructionText = '';
  }
  
  // Cancel editing instruction
  function cancelEditInstruction() {
    editingInstructionId = null;
    editInstructionText = '';
  }
  
  // Handle keyboard shortcuts
  function handleKeyDown(event: KeyboardEvent) {
    // Check if we're in Novel Mode
    if (story.storyMode !== 'novel') return;
    
    // Handle '/' key to show instruction card
    if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !editingInstructionId) {
      event.preventDefault();
      // Create a new instruction card
      const newCard = {
        id: crypto.randomUUID(),
        text: ''
      };
      instructionCards = [...instructionCards, newCard];
      instructionText = '';
      showInstructionHint = false;
      
      // Focus on the new instruction text area
      setTimeout(() => {
        const textarea = document.getElementById(`instruction-textarea-${newCard.id}`) as HTMLTextAreaElement;
        if (textarea) {
          textarea.focus();
        }
      }, 100);
    }
    
    // Handle Escape key to close editing
    if (event.key === 'Escape' && editingInstructionId) {
      event.preventDefault();
      cancelEditInstruction();
    }
  }
  
  // Handle instruction submission
  async function handleInstructionSubmit(cardId: string) {
    const card = instructionCards.find(c => c.id === cardId);
    if (!card || !card.text.trim() || isGenerating) return;
    
    isGenerating = true;
    const instruction = card.text.trim();
    
    try {
      // Get current story context
      const contextEntries = story.visibleEntries;
      const context = contextEntries.map(entry => entry.content).join('\n\n');
      
      // Prepare prompt for AI
      const prompt = `INSTRUCTION: ${instruction}\n\nCONTEXT:\n${context}`;
      
      // Generate AI response
      const response = await aiService.generateStoryContinuation(
        story.currentStory!.id,
        prompt,
        {
          mode: 'novel',
          instruction: instruction,
          contextEntries: contextEntries
        }
      );
      
      // Add the AI-generated content as a new entry
      const tokenCount = countTokens(response.content);
      const newEntry = await story.addEntry('narration', response.content, {
        source: 'ai',
        tokenCount,
        instructionUsed: instruction
      });
      
      // Update the card with the generated entry ID
      const cardIndex = instructionCards.findIndex(c => c.id === cardId);
      if (cardIndex !== -1) {
        instructionCards[cardIndex].generatedEntryId = newEntry.id;
      }
      
      // Collapse the instruction card after generation
      collapsedInstructionCards.add(cardId);
      collapsedInstructionCards = collapsedInstructionCards;
      
    } catch (error) {
      console.error('Failed to generate story continuation:', error);
      // Show error to user
      ui.showNotification({
        type: 'error',
        message: 'Failed to generate story continuation. Please try again.'
      });
    } finally {
      isGenerating = false;
    }
  }
  
  // Lifecycle hooks
  onMount(() => {
    window.addEventListener('keydown', handleKeyDown);
  });
  
</script>

<div class="flex h-full flex-col">
  <!-- Novel Mode Header -->
  <div class="border-b border-surface-700 p-3 sm:p-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Book class="h-5 w-5 text-accent-400" />
        <h3 class="text-lg font-semibold text-surface-100">Novel Mode</h3>
        <span class="text-sm text-surface-400">Collaborative Writing Canvas</span>
      </div>
      <div class="flex items-center gap-2">
        {#if isGenerating}
          <div class="flex items-center gap-1 text-sm text-surface-400">
            <Loader2 class="h-4 w-4 animate-spin" />
            <span>AI is writing...</span>
          </div>
        {/if}
      </div>
    </div>
  </div>
  
  <!-- Main Canvas -->
  <div
    bind:this={novelCanvas}
    class="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4"
  >
    <div class="mx-auto max-w-3xl space-y-3 sm:space-y-4">
      {#if story.entries.length === 0 && instructionCards.length === 0 && !ui.isStreaming}
        <div class="flex flex-col items-center justify-center py-12 sm:py-20 text-center px-2">
          <p class="text-base sm:text-lg text-surface-400">Your novel begins here...</p>
          <p class="mt-2 text-sm text-surface-500">
            Start writing or press <kbd class="px-2 py-1 rounded bg-surface-700 text-xs">/</kbd> for AI instructions
          </p>
        </div>
      {:else}
        <!-- Helper function to find instruction card that generated a specific entry -->
        {@const getInstructionCardForEntry = (entryId: string) => instructionCards.find(c => c.generatedEntryId === entryId)}
        
        <!-- Story entries rendered as cards (like Creative Writing mode) -->
        {#each story.entries as entry (entry.id)}
          <!-- Check if there's an instruction card that will generate this entry - show BEFORE the entry -->
          {@const cardForEntry = getInstructionCardForEntry(entry.id)}
          {#if cardForEntry}
            <!-- Instruction card shown BEFORE the generated entry -->
            <div class="rounded-lg border border-accent-500/50 bg-accent-500/5 p-3 sm:p-4">
              <div class="flex items-start gap-3">
                <button
                  onclick={() => toggleInstructionCollapse(cardForEntry.id)}
                  class="mt-1 rounded p-1 text-accent-400 hover:bg-accent-500/20 hover:text-accent-300 cursor-pointer"
                  title={isInstructionCollapsed(cardForEntry.id) ? 'Expand' : 'Collapse'}
                >
                  {#if isInstructionCollapsed(cardForEntry.id)}
                    <ChevronRight class="h-4 w-4" />
                  {:else}
                    <ChevronDown class="h-4 w-4" />
                  {/if}
                </button>
                <div class="flex-1">
                  <p class="text-xs font-medium text-accent-400 mb-1">Instruction</p>
                  {#if !isInstructionCollapsed(cardForEntry.id)}
                    {#if editingInstructionId === cardForEntry.id}
                      <div class="space-y-2">
                        <textarea
                          id="instruction-textarea-{cardForEntry.id}"
                          bind:value={editInstructionText}
                          class="w-full p-2 bg-surface-900 border border-surface-700 rounded text-surface-200 min-h-[80px] resize-y text-sm"
                          onkeydown={(e) => {
                            if (e.key === 'Enter' && e.ctrlKey) {
                              e.preventDefault();
                              saveEditInstruction(cardForEntry.id);
                            }
                            if (e.key === 'Escape') {
                              cancelEditInstruction();
                            }
                          }}
                        ></textarea>
                        <div class="flex gap-2">
                          <button
                            onclick={() => saveEditInstruction(cardForEntry.id)}
                            class="btn btn-primary px-3 py-1 text-sm"
                          >
                            Save
                          </button>
                          <button
                            onclick={cancelEditInstruction}
                            class="btn btn-secondary px-3 py-1 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    {:else}
                      <div class="story-text prose-content text-sm">
                        {@html cardForEntry.text}
                      </div>
                      <button
                        onclick={() => startEditInstruction(cardForEntry.id, cardForEntry.text)}
                        class="mt-2 text-xs text-accent-400 hover:text-accent-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Pencil class="h-3 w-3" />
                        Edit
                      </button>
                    {/if}
                  {:else}
                    <p class="text-xs text-accent-400/70 italic">
                      {cardForEntry.text.slice(0, 80)}{cardForEntry.text.length > 80 ? '...' : ''}
                    </p>
                  {/if}
                </div>
              </div>
            </div>
          {/if}
          
          <!-- The story entry itself -->
          {#if entry.type === 'user_action'}
            <!-- Collapsible "you" card -->
            <div class="rounded-lg border-l-4 border-l-accent-500 bg-accent-500/5 p-3 sm:p-4">
              <div class="flex items-start gap-3">
                <button
                  onclick={() => toggleCollapse(entry.id)}
                  class="mt-1 rounded p-1 text-surface-400 hover:bg-surface-600 hover:text-surface-200 cursor-pointer"
                  title={isCollapsed(entry.id) ? 'Expand' : 'Collapse'}
                >
                  {#if isCollapsed(entry.id)}
                    <ChevronRight class="h-4 w-4" />
                  {:else}
                    <ChevronDown class="h-4 w-4" />
                  {/if}
                </button>
                <div class="flex-1">
                  <p class="user-action mb-1 text-sm font-medium">You</p>
                  {#if !isCollapsed(entry.id)}
                    <div class="story-text prose-content">
                      {@html entry.content}
                    </div>
                  {:else}
                    <p class="text-sm text-surface-500 italic">
                      {entry.content.slice(0, 100)}{entry.content.length > 100 ? '...' : ''}
                    </p>
                  {/if}
                </div>
              </div>
            </div>
          {:else}
            <!-- Non-"you" entries use StoryEntry component -->
            <StoryEntry {entry} />
          {/if}
        {/each}

        <!-- Show streaming entry while generating -->
        {#if ui.isStreaming}
          <StreamingEntry />
        {/if}

        <!-- New Instruction Card -->
        {#each instructionCards as card (card.id)}
          {#if !card.generatedEntryId}
            <div class="rounded-lg border border-accent-500/50 bg-accent-500/5 p-4 shadow-lg">
              <div class="flex items-center justify-between mb-3">
                <h4 class="font-medium text-accent-100">AI Instructions</h4>
                <button
                  class="text-surface-400 hover:text-surface-200 cursor-pointer"
                  onclick={() => {
                    instructionCards = instructionCards.filter(c => c.id !== card.id);
                  }}
                >
                  <X class="h-4 w-4" />
                </button>
              </div>

              <textarea
                id="instruction-textarea-{card.id}"
                bind:value={card.text}
                placeholder="Describe what you want the AI to write next..."
                class="w-full p-2 bg-surface-900 border border-surface-700 rounded text-surface-200 min-h-[100px] resize-y"
                onkeydown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    handleInstructionSubmit(card.id);
                  }
                }}
              ></textarea>

              <div class="mt-3 flex justify-end gap-2">
                <button
                  class="btn btn-primary px-3 py-1 text-sm flex items-center gap-1 cursor-pointer"
                  onclick={() => handleInstructionSubmit(card.id)}
                  disabled={!card.text.trim() || isGenerating}
                >
                  {#if isGenerating}
                    <Loader2 class="h-3 w-3 animate-spin" />
                    Generating...
                  {:else}
                    <Send class="h-3 w-3" />
                    Generate
                  {/if}
                </button>
              </div>

              <div class="mt-2 text-xs text-surface-500">
                <p>Press <kbd class="px-1 py-0.5 rounded bg-surface-700">Ctrl+Enter</kbd> to submit</p>
              </div>
            </div>
          {/if}
        {/each}
      {/if}
      
      <!-- Instruction Hint (only shown initially) -->
      {#if showInstructionHint && story.entries.length > 0 && instructionCards.length === 0}
        <div class="mt-8 text-center text-surface-500 text-sm italic">
          <p>Press <kbd class="px-2 py-1 rounded bg-surface-700">/</kbd> to give instructions to the AI</p>
        </div>
      {/if}
    </div>
  </div>
  
  
  <!-- Bottom Status Bar -->
  <div class="border-t border-surface-700 bg-surface-800 p-3 sm:p-4">
    <div class="flex items-center justify-between">
      <div class="text-sm text-surface-400">
        {story.wordCount} words • {story.entries.length} sections
      </div>
      <div class="flex items-center gap-2">
        <button
          class="btn btn-secondary px-3 py-1 text-sm flex items-center gap-1 cursor-pointer"
          onclick={() => {
            const newCard = {
              id: crypto.randomUUID(),
              text: ''
            };
            instructionCards = [...instructionCards, newCard];
            showInstructionHint = false;
          }}
        >
          <Slash class="h-3 w-3" />
          Instructions
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .story-text {
    font-family: var(--font-story);
    font-size: var(--font-size-lg, 1.125rem);
    line-height: 1.7;
    color: var(--text-secondary);
  }
  
  kbd {
    font-family: monospace;
    background-color: var(--bg-tertiary);
    border-radius: 4px;
    padding: 2px 6px;
    border: 1px solid var(--border-primary);
  }
</style>
