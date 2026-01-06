<script lang="ts">
  import { ui } from '$lib/stores/ui.svelte';
  import { story } from '$lib/stores/story.svelte';
  import { aiService } from '$lib/services/ai';
  import { Lightbulb, Send, X } from 'lucide-svelte';
  import { onMount } from 'svelte';

  let instructionInput = $state('');
  let isGenerating = $state(false);
  let cardRef: HTMLDivElement;

  // Position the card based on UI store state
  onMount(() => {
    if (cardRef) {
      const { x, y } = ui.novelInstructionCardPosition;
      cardRef.style.left = `${x}px`;
      cardRef.style.top = `${y}px`;
    }
  });

  // Reactive statement to update position when UI store changes
  $effect(() => {
    if (cardRef && ui.novelInstructionCardVisible) {
      const { x, y } = ui.novelInstructionCardPosition;
      cardRef.style.left = `${x}px`;
      cardRef.style.top = `${y}px`;
    }
  });

  async function handleSubmit() {
    if (!instructionInput.trim() || !story.currentStory || isGenerating) return;

    isGenerating = true;
    
    try {
      // Call the AI service to generate story continuation
      const result = await aiService.generateStoryContinuation(story.currentStory.id, instructionInput, {
        mode: 'novel',
        instruction: instructionInput,
        contextEntries: story.entries,
        worldState: {
          characters: story.characters,
          locations: story.locations,
          items: story.items,
          storyBeats: story.storyBeats,
        }
      });

      // Add the generated content to the story
      // This would be handled by the story store's addEntry method
      // For now, we'll just log it and close the card
      console.log('Generated story continuation:', result.content);

      // Close the instruction card
      ui.hideNovelInstructionCard();
      instructionInput = '';
    } catch (error) {
      console.error('Failed to generate story continuation:', error);
      // Show error to user (would be implemented in UI)
    } finally {
      isGenerating = false;
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    } else if (event.key === 'Escape') {
      ui.hideNovelInstructionCard();
    }
  }

  // Position the card to be visible on screen
  function getCardPosition() {
    const { x, y } = ui.novelInstructionCardPosition;
    
    // Ensure card stays within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let left = Math.min(x, viewportWidth - 350); // Card width is ~350px
    let top = Math.min(y, viewportHeight - 250); // Card height is ~250px
    
    // Ensure minimum position
    left = Math.max(10, left);
    top = Math.max(10, top);
    
    return { left: `${left}px`, top: `${top}px` };
  }
</script>

<!-- Instruction Card -->
{#if ui.novelInstructionCardVisible}
  <div
    class="fixed z-50 w-80 max-w-[90vw] rounded-lg bg-surface-800 border border-surface-700 shadow-xl"
    bind:this={cardRef}
    style="left: {getCardPosition().left}; top: {getCardPosition().top};"
    onkeydown={handleKeyDown}
  >
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-surface-700 p-3">
      <div class="flex items-center gap-2">
        <Lightbulb class="h-4 w-4 text-accent-400" />
        <h3 class="text-sm font-medium text-surface-100">Novel Instruction</h3>
      </div>
      <button
        class="btn-ghost rounded p-1 text-surface-400 hover:text-surface-200"
        onclick={() => ui.hideNovelInstructionCard()}
        title="Close"
        aria-label="Close instruction card"
      >
        <X class="h-4 w-4" />
      </button>
    </div>

    <!-- Instruction Input -->
    <div class="p-3">
      <p class="text-xs text-surface-400 mb-2">
        What should happen next? Describe the scene, action, or dialogue you want.
      </p>
      <textarea
        bind:value={instructionInput}
        placeholder="e.g., 'The detective finds a hidden clue in the study...'"
        class="input w-full min-h-[80px] resize-none text-sm"
        disabled={isGenerating}
      />
    </div>

    <!-- Footer with controls -->
    <div class="border-t border-surface-700 p-3 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <kbd class="text-xs px-1.5 py-0.5 rounded bg-surface-700 text-surface-400">↵</kbd>
        <span class="text-xs text-surface-500">to submit</span>
        <kbd class="text-xs px-1.5 py-0.5 rounded bg-surface-700 text-surface-400">Esc</kbd>
        <span class="text-xs text-surface-500">to cancel</span>
      </div>
      <button
        class="btn btn-primary text-xs flex items-center gap-1"
        onclick={handleSubmit}
        disabled={!instructionInput.trim() || isGenerating}
      >
        {#if isGenerating}
          <span class="h-3 w-3 animate-spin rounded-full border-2 border-surface-400 border-t-transparent"></span>
          Generating...
        {:else}
          <Send class="h-3 w-3" />
          Continue Story
        {/if}
      </button>
    </div>
  </div>
{/if}

<style>
  /* Ensure the card appears above other elements */
  :global(body) {
    /* Prevent scrolling when instruction card is open */
    overflow: hidden;
  }

  /* Focus styles for the textarea */
  textarea:focus {
    outline: none;
    border-color: var(--accent-500);
    box-shadow: 0 0 0 2px rgba(var(--accent-500-rgb), 0.2);
  }

  /* Animation for card appearance */
  @keyframes slide-in {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  div[class*="fixed z-50"] {
    animation: slide-in 0.15s ease-out;
  }
</style>