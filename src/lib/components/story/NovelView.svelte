<script lang="ts">
  import { story } from '$lib/stores/story.svelte';
  import { ui } from '$lib/stores/ui.svelte';
  import { settings } from '$lib/stores/settings.svelte';
  import { aiService } from '$lib/services/ai';
  import { countTokens } from '$lib/services/tokenizer';
  import { Book, Loader2, Send, X, Slash } from 'lucide-svelte';
  import { onMount, effect } from 'svelte';
  
  let novelCanvas: HTMLDivElement;
  let instructionCard: HTMLDivElement;
  let instructionText = $state('');
  let isInstructionCardVisible = $state(false);
  let isGenerating = $state(false);
  let showInstructionHint = $state(true);
  
  // Get the current story content
  const storyContent = $derived.by(() => {
    return story.entries.map(entry => entry.content).join('\n\n');
  });
  
  // Handle keyboard shortcuts
  function handleKeyDown(event: KeyboardEvent) {
    // Check if we're in Novel Mode
    if (story.storyMode !== 'novel') return;
    
    // Handle '/' key to show instruction card
    if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      isInstructionCardVisible = true;
      showInstructionHint = false;
      
      // Focus on instruction text area
      setTimeout(() => {
        const textarea = document.getElementById('instruction-textarea') as HTMLTextAreaElement;
        if (textarea) {
          textarea.focus();
        }
      }, 100);
    }
    
    // Handle Escape key to close instruction card
    if (event.key === 'Escape' && isInstructionCardVisible) {
      event.preventDefault();
      isInstructionCardVisible = false;
    }
  }
  
  // Handle instruction submission
  async function handleInstructionSubmit() {
    if (!instructionText.trim() || isGenerating) return;
    
    isGenerating = true;
    const instruction = instructionText.trim();
    
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
      await story.addEntry('narration', response.content, {
        source: 'ai',
        tokenCount,
        instructionUsed: instruction
      });
      
      // Clear instruction and close card
      instructionText = '';
      isInstructionCardVisible = false;
      
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
  
  // Handle direct editing in the canvas
  function handleCanvasClick() {
    if (showInstructionHint) {
      showInstructionHint = false;
    }
  }
  
  // Position instruction card near cursor
  function positionInstructionCard(event: MouseEvent) {
    if (!instructionCard || !isInstructionCardVisible) return;
    
    const cursorX = event.clientX;
    const cursorY = event.clientY;
    
    // Position the card near the cursor
    instructionCard.style.position = 'absolute';
    instructionCard.style.left = `${cursorX}px`;
    instructionCard.style.top = `${cursorY + 20}px`; // 20px below cursor
  }
  
  // Lifecycle hooks
  onMount(() => {
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleCanvasClick);
  });
  
  // Reactive effect to handle instruction card visibility (replaces afterUpdate)
  effect(() => {
    if (isInstructionCardVisible && instructionCard) {
      // Ensure card is visible and properly positioned
      instructionCard.style.display = 'block';
    } else if (instructionCard) {
      instructionCard.style.display = 'none';
    }
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
    class="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4 relative"
    on:click={handleCanvasClick}
    on:mousemove={positionInstructionCard}
  >
    <div class="mx-auto max-w-3xl prose prose-invert prose-lg">
      {#if story.entries.length === 0}
        <div class="flex flex-col items-center justify-center py-12 sm:py-20 text-center px-2">
          <p class="text-base sm:text-lg text-surface-400">Your novel begins here...</p>
          <p class="mt-2 text-sm text-surface-500">
            Start writing or press <kbd class="px-2 py-1 rounded bg-surface-700 text-xs">/</kbd> for AI instructions
          </p>
        </div>
      {:else}
        <!-- Story content rendered as a single continuous text -->
        <div class="story-text whitespace-pre-wrap">
          {@html storyContent}
        </div>
      {/if}
      
      <!-- Instruction Hint (only shown initially) -->
      {#if showInstructionHint && story.entries.length > 0}
        <div class="mt-8 text-center text-surface-500 text-sm italic">
          <p>Press <kbd class="px-2 py-1 rounded bg-surface-700">/</kbd> to give instructions to the AI</p>
        </div>
      {/if}
    </div>
    
    <!-- Instruction Card (floating) -->
    <div
      bind:this={instructionCard}
      class="fixed z-10 w-80 bg-surface-800 border border-surface-600 rounded-lg p-4 shadow-lg"
      style="display: none;"
    >
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-medium text-surface-100">AI Instructions</h4>
        <button
          class="text-surface-400 hover:text-surface-200"
          on:click={() => isInstructionCardVisible = false}
        >
          <X class="h-4 w-4" />
        </button>
      </div>
      
      <textarea
        id="instruction-textarea"
        bind:value={instructionText}
        placeholder="Describe what you want the AI to write next..."
        class="w-full p-2 bg-surface-900 border border-surface-700 rounded text-surface-200 min-h-[100px] resize-y"
        on:keydown={(e) => {
          if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            handleInstructionSubmit();
          }
        }}
      ></textarea>
      
      <div class="mt-3 flex justify-end gap-2">
        <button
          class="btn btn-secondary px-3 py-1 text-sm"
          on:click={() => isInstructionCardVisible = false}
          disabled={isGenerating}
        >
          Cancel
        </button>
        <button
          class="btn btn-primary px-3 py-1 text-sm flex items-center gap-1"
          on:click={handleInstructionSubmit}
          disabled={!instructionText.trim() || isGenerating}
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
  </div>
  
  <!-- Bottom Status Bar -->
  <div class="border-t border-surface-700 bg-surface-800 p-3 sm:p-4">
    <div class="flex items-center justify-between">
      <div class="text-sm text-surface-400">
        {story.wordCount} words • {story.entries.length} sections
      </div>
      <div class="flex items-center gap-2">
        <button
          class="btn btn-secondary px-3 py-1 text-sm flex items-center gap-1"
          on:click={() => isInstructionCardVisible = true}
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
  
  /* Ensure the instruction card stays within viewport */
  #instruction-card {
    max-width: 90vw;
    max-height: 80vh;
    overflow-y: auto;
  }
</style>