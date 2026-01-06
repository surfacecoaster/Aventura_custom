<script lang="ts">
  import { story } from '$lib/stores/story.svelte';
  import { Plus, MapPin, Eye, EyeOff, Navigation, Trash2, Pencil } from 'lucide-svelte';
  import type { Location } from '$lib/types';

  let showAddForm = $state(false);
  let newName = $state('');
  let newDescription = $state('');
  let confirmingDeleteId = $state<string | null>(null);
  let editingId = $state<string | null>(null);
  let editName = $state('');
  let editDescription = $state('');

  async function addLocation() {
    if (!newName.trim()) return;
    const makeCurrent = story.locations.length === 0;
    await story.addLocation(newName.trim(), newDescription.trim() || undefined, makeCurrent);
    newName = '';
    newDescription = '';
    showAddForm = false;
  }

  async function goToLocation(locationId: string) {
    await story.setCurrentLocation(locationId);
  }

  async function toggleVisited(locationId: string) {
    await story.toggleLocationVisited(locationId);
  }

  async function deleteLocation(locationId: string) {
    await story.deleteLocation(locationId);
    confirmingDeleteId = null;
  }

  function startEdit(location: Location) {
    editingId = location.id;
    editName = location.name;
    editDescription = location.description ?? '';
  }

  function cancelEdit() {
    editingId = null;
    editName = '';
    editDescription = '';
  }

  async function saveEdit(location: Location) {
    const name = editName.trim();
    if (!name) return;
    await story.updateLocation(location.id, {
      name,
      description: editDescription.trim() || null,
    });
    cancelEdit();
  }
</script>

<div class="space-y-3">
  <div class="flex items-center justify-between">
    <h3 class="font-medium text-surface-200">Locations</h3>
    <button
      class="btn-ghost rounded p-1"
      onclick={() => showAddForm = !showAddForm}
      title="Add location"
    >
      <Plus class="h-4 w-4" />
    </button>
  </div>

  {#if showAddForm}
    <div class="card space-y-2">
      <input
        type="text"
        bind:value={newName}
        placeholder="Location name"
        class="input text-sm"
      />
      <textarea
        bind:value={newDescription}
        placeholder="Description (optional)"
        class="input text-sm"
        rows="2"
      ></textarea>
      <div class="flex justify-end gap-2">
        <button class="btn btn-secondary text-xs" onclick={() => showAddForm = false}>
          Cancel
        </button>
        <button class="btn btn-primary text-xs" onclick={addLocation} disabled={!newName.trim()}>
          Add
        </button>
      </div>
    </div>
  {/if}

  <!-- Current Location -->
  {#if story.currentLocation}
    <div class="card border-accent-500/50 bg-accent-500/10 p-2">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 text-accent-400">
          <Navigation class="h-4 w-4" />
          <span class="text-sm font-medium">Current Location</span>
        </div>
        <button
          class="btn-ghost rounded p-1.5 text-surface-500 hover:text-surface-200 sm:p-1"
          onclick={() => startEdit(story.currentLocation)}
          title="Edit location"
        >
          <Pencil class="h-3.5 w-3.5" />
        </button>
      </div>
      <h4 class="mt-1 break-words font-medium text-surface-100">{story.currentLocation.name}</h4>
      {#if story.currentLocation.description}
        <p class="mt-1 break-words text-sm text-surface-400">{story.currentLocation.description}</p>
      {/if}
      {#if editingId === story.currentLocation.id}
        <div class="mt-3 space-y-2">
          <input
            type="text"
            bind:value={editName}
            placeholder="Location name"
            class="input text-sm"
          />
          <textarea
            bind:value={editDescription}
            placeholder="Description (optional)"
            class="input text-sm"
            rows="2"
          ></textarea>
          <div class="flex justify-end gap-2">
            <button class="btn btn-secondary text-xs" onclick={cancelEdit}>
              Cancel
            </button>
            <button
              class="btn btn-primary text-xs"
              onclick={() => saveEdit(story.currentLocation)}
              disabled={!editName.trim()}
            >
              Save
            </button>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  {#if story.locations.length === 0}
    <p class="py-4 text-center text-sm text-surface-500">
      No locations yet
    </p>
  {:else}
    <div class="space-y-2">
      {#each story.locations.filter(l => !l.current) as location (location.id)}
        <div class="card p-2">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <div class="rounded-full bg-surface-700 p-1.5">
                <MapPin class="h-4 w-4 text-surface-400" />
              </div>
              <span class="break-words font-medium text-surface-100">{location.name}</span>
              <button
                class="ml-2 text-xs transition-colors {location.visited ? 'text-surface-500 hover:text-surface-300' : 'text-surface-600 hover:text-surface-400'}"
                onclick={() => toggleVisited(location.id)}
                title={location.visited ? 'Click to mark as unvisited' : 'Click to mark as visited'}
              >
                {#if location.visited}
                  <Eye class="inline h-3 w-3" /> visited
                {:else}
                  <EyeOff class="inline h-3 w-3" /> unvisited
                {/if}
              </button>
            </div>
            <div class="flex items-center gap-1">
              {#if confirmingDeleteId === location.id}
                <button
                  class="btn-ghost rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/20"
                  onclick={() => deleteLocation(location.id)}
                >
                  Confirm
                </button>
                <button
                  class="btn-ghost rounded px-2 py-1 text-xs"
                  onclick={() => confirmingDeleteId = null}
                >
                  Cancel
                </button>
              {:else}
                <button
                  class="btn-ghost rounded p-1.5 text-surface-500 hover:text-surface-200 sm:p-1"
                  onclick={() => startEdit(location)}
                  title="Edit location"
                >
                  <Pencil class="h-3.5 w-3.5" />
                </button>
                <button
                  class="btn-ghost rounded px-2 py-1 text-xs"
                  onclick={() => goToLocation(location.id)}
                >
                  Go
                </button>
                <button
                  class="btn-ghost rounded p-1.5 text-surface-500 hover:text-red-400 sm:p-1"
                  onclick={() => confirmingDeleteId = location.id}
                  title="Delete location"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              {/if}
            </div>
          </div>
          {#if editingId === location.id}
            <div class="mt-3 space-y-2">
              <input
                type="text"
                bind:value={editName}
                placeholder="Location name"
                class="input text-sm"
              />
              <textarea
                bind:value={editDescription}
                placeholder="Description (optional)"
                class="input text-sm"
                rows="2"
              ></textarea>
              <div class="flex justify-end gap-2">
                <button class="btn btn-secondary text-xs" onclick={cancelEdit}>
                  Cancel
                </button>
                <button
                  class="btn btn-primary text-xs"
                  onclick={() => saveEdit(location)}
                  disabled={!editName.trim()}
                >
                  Save
                </button>
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
