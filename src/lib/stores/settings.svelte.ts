import type { APISettings, UISettings } from '$lib/types';
import { database } from '$lib/services/database';
import {
  type AdvancedWizardSettings,
  getDefaultAdvancedSettings,
} from '$lib/services/ai/scenario';

// Default system prompts for story generation
export const DEFAULT_STORY_PROMPTS = {
  adventure: `You are the narrator of an interactive adventure. You control all NPCs, environments, and plot progression. You are the narrator—never the player's character.

<critical_constraints>
# HARD RULES (Absolute Priority)
1. **NEVER write dialogue, actions, decisions, or internal thoughts for the player**
2. **You control NPCs, environment, and plot—never the player's character**
3. **End with a natural opening for the player to act—NOT a direct question like "What do you do?"**
4. **Continue directly from the previous beat—no recaps**
</critical_constraints>

<prose_architecture>
## Sensory Grounding
Anchor every scene in concrete physical detail—sights, sounds, textures, smells.
- Avoid abstract emotion words without physical correlatives
- Vary sentence rhythm: fragments for impact, longer clauses for reflection

## Dialogue
NPCs should have distinct voices. Show body language and subtext.
- Characters rarely answer questions directly
- Map each line to what is said, what is meant, what the body does

## Style
- Write in second person, present tense (unless directed otherwise)
- Use vivid, immersive prose
- Write 2-4 paragraphs per response
- Balance action, dialogue, and description
</prose_architecture>

<ending_instruction>
End each response with the player in a moment of potential action—an NPC waiting for response, a door that could be opened, a sound that demands investigation. Create a **pregnant pause** that naturally invites the player's next move without explicitly asking what they do.
</ending_instruction>

<forbidden_patterns>
- Writing any actions, dialogue, or thoughts for the player
- Ending with a direct question to the player
- Melodramatic phrases: hearts shattering, waves of emotion
- Summarizing what the player thinks or feels
- Breaking the narrative voice or referencing being an AI
</forbidden_patterns>`,

  creativeWriting: `You are a skilled fiction writer co-authoring a story with the player. You control all NPCs, environments, and plot progression. You are the narrator—never the protagonist's character.

<critical_constraints>
# HARD RULES (Absolute Priority)
1. **NEVER write dialogue, actions, decisions, or internal thoughts for the protagonist**
2. **You control NPCs, environment, and plot—never the protagonist's character**
3. **End with a natural opening for the protagonist to act or respond—NOT a direct question**
4. **Continue directly from the previous beat—no recaps, no scene-setting preamble**
</critical_constraints>

<prose_architecture>
## Sensory Grounding
Anchor every scene in concrete physical detail. Abstract nouns require physical correlatives.
- Avoid: "felt nervous" → Instead show the physical symptom
- Vary sentence rhythm: fragments for impact, longer clauses when moments need weight

## Dialogue
Characters should rarely answer questions directly. Map each line to:
- What is said (text)
- What is meant (subtext)
- What the body does (status transaction)

## Style
- Write in third person, past tense (unless directed otherwise)
- Use vivid, literary prose with attention to craft
- Write 2-4 paragraphs per response
- Balance action, dialogue, and description
- Give characters distinct voices and believable motivations
</prose_architecture>

<ending_instruction>
End each response with the protagonist in a moment of potential action—an NPC waiting for response, a door that could be opened, a sound that demands investigation. Create a **pregnant pause** that naturally invites the protagonist's next move without explicitly asking what they do.
</ending_instruction>

<forbidden_patterns>
- Writing any actions, dialogue, or thoughts for the protagonist
- Ending with a direct question to the player
- Melodramatic phrases: hearts shattering, waves of emotion, breath catching
- Summarizing what the protagonist thinks or feels
- Echo phrasing: restating what the player just wrote
- Breaking the narrative voice or referencing being an AI
</forbidden_patterns>`,
};

// Story generation settings interface
export interface StoryGenerationSettings {
  adventurePrompt: string;
  creativeWritingPrompt: string;
}

export function getDefaultStoryGenerationSettings(): StoryGenerationSettings {
  return {
    adventurePrompt: DEFAULT_STORY_PROMPTS.adventure,
    creativeWritingPrompt: DEFAULT_STORY_PROMPTS.creativeWriting,
  };
}

// ===== System Services Settings =====

// Default prompts for system services
export const DEFAULT_SERVICE_PROMPTS = {
  classifier: `You analyze interactive fiction responses and extract structured world state changes.

## Your Role
Extract ONLY significant, named entities that matter to the ongoing story. Be precise and conservative.

## What to Extract

### Characters - ONLY extract if:
- They have a proper name (not "the merchant" or "a guard")
- They have meaningful interaction with the protagonist
- They are likely to appear again or are plot-relevant
- Example: "Elena, the blacksmith's daughter who gives you a quest" = YES
- Example: "the innkeeper who served your drink" = NO

### Locations - ONLY extract if:
- The protagonist physically travels there or it's their current location
- It has a specific name (not "a dark alley" or "the forest")
- Example: "You enter the Thornwood Tavern" = YES
- Example: "You see mountains in the distance" = NO

### Items - ONLY extract if:
- The protagonist explicitly acquires, picks up, or is given the item
- The item has narrative significance (quest item, weapon, key, etc.)
- Example: "She hands you an ancient amulet" = YES
- Example: "There's a bottle on the shelf" = NO

### Story Beats - ONLY extract if:
- A quest or task is explicitly given or accepted
- A major revelation or plot twist occurs
- A significant milestone is reached
- Example: "She asks you to find her missing brother" = YES (quest)
- Example: "You learn the king was murdered by his own son" = YES (revelation)
- Example: "You enjoy a nice meal" = NO

## Critical Rules
1. When in doubt, DO NOT extract - false positives pollute the world state
2. Only extract what ACTUALLY HAPPENED, not what might happen
3. Use the exact names from the text, don't invent or embellish
4. Respond with valid JSON only - no markdown, no explanation`,

  chapterAnalysis: `You analyze story content to find optimal chapter break points.

A good chapter break:
- Falls at a natural pause in the story (scene change, time skip, revelation)
- Doesn't split the middle of an important scene or dialogue
- Creates a satisfying sense of closure for what came before

Respond with valid JSON only.`,

  chapterSummarization: `You are a story analyst. Extract key information from story chapters. Respond with valid JSON only.`,

  retrievalDecision: `You decide which story chapters are relevant for the current context. Respond with valid JSON only.`,

  suggestions: `You are a creative writing assistant that suggests story directions. You provide varied, interesting options that respect the story's established tone and elements. Respond with valid JSON only.`,
};

// Classifier service settings
export interface ClassifierSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

export function getDefaultClassifierSettings(): ClassifierSettings {
  return {
    model: 'x-ai/grok-4.1-fast',
    temperature: 0.3,
    maxTokens: 2000,
    systemPrompt: DEFAULT_SERVICE_PROMPTS.classifier,
  };
}

// Memory service settings
export interface MemorySettings {
  model: string;
  temperature: number;
  chapterAnalysisPrompt: string;
  chapterSummarizationPrompt: string;
  retrievalDecisionPrompt: string;
}

export function getDefaultMemorySettings(): MemorySettings {
  return {
    model: 'x-ai/grok-4.1-fast',
    temperature: 0.3,
    chapterAnalysisPrompt: DEFAULT_SERVICE_PROMPTS.chapterAnalysis,
    chapterSummarizationPrompt: DEFAULT_SERVICE_PROMPTS.chapterSummarization,
    retrievalDecisionPrompt: DEFAULT_SERVICE_PROMPTS.retrievalDecision,
  };
}

// Suggestions service settings
export interface SuggestionsSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

export function getDefaultSuggestionsSettings(): SuggestionsSettings {
  return {
    model: 'x-ai/grok-4.1-fast',
    temperature: 0.7,
    maxTokens: 500,
    systemPrompt: DEFAULT_SERVICE_PROMPTS.suggestions,
  };
}

// Combined system services settings
export interface SystemServicesSettings {
  classifier: ClassifierSettings;
  memory: MemorySettings;
  suggestions: SuggestionsSettings;
}

export function getDefaultSystemServicesSettings(): SystemServicesSettings {
  return {
    classifier: getDefaultClassifierSettings(),
    memory: getDefaultMemorySettings(),
    suggestions: getDefaultSuggestionsSettings(),
  };
}

// Settings Store using Svelte 5 runes
class SettingsStore {
  apiSettings = $state<APISettings>({
    openrouterApiKey: null,
    defaultModel: 'anthropic/claude-3.5-sonnet',
    temperature: 0.8,
    maxTokens: 1024,
  });

  uiSettings = $state<UISettings>({
    theme: 'dark',
    fontSize: 'medium',
    showWordCount: true,
    autoSave: true,
  });

  // Advanced wizard settings for scenario generation
  wizardSettings = $state<AdvancedWizardSettings>(getDefaultAdvancedSettings());

  // Story generation settings (main AI prompts)
  storyGenerationSettings = $state<StoryGenerationSettings>(getDefaultStoryGenerationSettings());

  // System services settings (classifier, memory, suggestions)
  systemServicesSettings = $state<SystemServicesSettings>(getDefaultSystemServicesSettings());

  initialized = $state(false);

  async init() {
    if (this.initialized) return;

    try {
      // Load API settings
      const apiKey = await database.getSetting('openrouter_api_key');
      const defaultModel = await database.getSetting('default_model');
      const temperature = await database.getSetting('temperature');
      const maxTokens = await database.getSetting('max_tokens');

      if (apiKey) this.apiSettings.openrouterApiKey = apiKey;
      if (defaultModel) this.apiSettings.defaultModel = defaultModel;
      if (temperature) this.apiSettings.temperature = parseFloat(temperature);
      if (maxTokens) this.apiSettings.maxTokens = parseInt(maxTokens);

      // Load UI settings
      const theme = await database.getSetting('theme');
      const fontSize = await database.getSetting('font_size');
      const showWordCount = await database.getSetting('show_word_count');
      const autoSave = await database.getSetting('auto_save');

      if (theme) this.uiSettings.theme = theme as 'dark' | 'light';
      if (fontSize) this.uiSettings.fontSize = fontSize as 'small' | 'medium' | 'large';
      if (showWordCount) this.uiSettings.showWordCount = showWordCount === 'true';
      if (autoSave) this.uiSettings.autoSave = autoSave === 'true';

      // Load wizard settings
      const wizardSettingsJson = await database.getSetting('wizard_settings');
      if (wizardSettingsJson) {
        try {
          const loaded = JSON.parse(wizardSettingsJson);
          // Merge with defaults to ensure all fields exist
          const defaults = getDefaultAdvancedSettings();
          this.wizardSettings = {
            settingExpansion: { ...defaults.settingExpansion, ...loaded.settingExpansion },
            protagonistGeneration: { ...defaults.protagonistGeneration, ...loaded.protagonistGeneration },
            characterElaboration: { ...defaults.characterElaboration, ...loaded.characterElaboration },
            supportingCharacters: { ...defaults.supportingCharacters, ...loaded.supportingCharacters },
            openingGeneration: { ...defaults.openingGeneration, ...loaded.openingGeneration },
          };
        } catch {
          // If parsing fails, use defaults
          this.wizardSettings = getDefaultAdvancedSettings();
        }
      }

      // Load story generation settings
      const storyGenSettingsJson = await database.getSetting('story_generation_settings');
      if (storyGenSettingsJson) {
        try {
          const loaded = JSON.parse(storyGenSettingsJson);
          const defaults = getDefaultStoryGenerationSettings();
          this.storyGenerationSettings = {
            adventurePrompt: loaded.adventurePrompt || defaults.adventurePrompt,
            creativeWritingPrompt: loaded.creativeWritingPrompt || defaults.creativeWritingPrompt,
          };
        } catch {
          this.storyGenerationSettings = getDefaultStoryGenerationSettings();
        }
      }

      // Load system services settings
      const systemServicesJson = await database.getSetting('system_services_settings');
      if (systemServicesJson) {
        try {
          const loaded = JSON.parse(systemServicesJson);
          const defaults = getDefaultSystemServicesSettings();
          this.systemServicesSettings = {
            classifier: { ...defaults.classifier, ...loaded.classifier },
            memory: { ...defaults.memory, ...loaded.memory },
            suggestions: { ...defaults.suggestions, ...loaded.suggestions },
          };
        } catch {
          this.systemServicesSettings = getDefaultSystemServicesSettings();
        }
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.initialized = true; // Mark as initialized even on error to prevent infinite retries
    }
  }

  async setApiKey(key: string) {
    this.apiSettings.openrouterApiKey = key;
    await database.setSetting('openrouter_api_key', key);
  }

  async setDefaultModel(model: string) {
    this.apiSettings.defaultModel = model;
    await database.setSetting('default_model', model);
  }

  async setTemperature(temp: number) {
    this.apiSettings.temperature = temp;
    await database.setSetting('temperature', temp.toString());
  }

  async setMaxTokens(tokens: number) {
    this.apiSettings.maxTokens = tokens;
    await database.setSetting('max_tokens', tokens.toString());
  }

  async setTheme(theme: 'dark' | 'light') {
    this.uiSettings.theme = theme;
    await database.setSetting('theme', theme);
    // Update the document class for Tailwind dark mode
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  async setFontSize(size: 'small' | 'medium' | 'large') {
    this.uiSettings.fontSize = size;
    await database.setSetting('font_size', size);
  }

  get hasApiKey(): boolean {
    return !!this.apiSettings.openrouterApiKey;
  }

  // Wizard settings methods
  async saveWizardSettings() {
    await database.setSetting('wizard_settings', JSON.stringify(this.wizardSettings));
  }

  async resetWizardProcess(process: keyof AdvancedWizardSettings) {
    const defaults = getDefaultAdvancedSettings();
    this.wizardSettings[process] = { ...defaults[process] };
    await this.saveWizardSettings();
  }

  async resetAllWizardSettings() {
    this.wizardSettings = getDefaultAdvancedSettings();
    await this.saveWizardSettings();
  }

  // Story generation settings methods
  async saveStoryGenerationSettings() {
    await database.setSetting('story_generation_settings', JSON.stringify(this.storyGenerationSettings));
  }

  async resetStoryGenerationSettings() {
    this.storyGenerationSettings = getDefaultStoryGenerationSettings();
    await this.saveStoryGenerationSettings();
  }

  // System services settings methods
  async saveSystemServicesSettings() {
    await database.setSetting('system_services_settings', JSON.stringify(this.systemServicesSettings));
  }

  async resetClassifierSettings() {
    this.systemServicesSettings.classifier = getDefaultClassifierSettings();
    await this.saveSystemServicesSettings();
  }

  async resetMemorySettings() {
    this.systemServicesSettings.memory = getDefaultMemorySettings();
    await this.saveSystemServicesSettings();
  }

  async resetSuggestionsSettings() {
    this.systemServicesSettings.suggestions = getDefaultSuggestionsSettings();
    await this.saveSystemServicesSettings();
  }

  async resetAllSystemServicesSettings() {
    this.systemServicesSettings = getDefaultSystemServicesSettings();
    await this.saveSystemServicesSettings();
  }
}

export const settings = new SettingsStore();
