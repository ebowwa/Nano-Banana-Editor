// services/promptService.ts

let prompts: Record<string, string> = {};
let promptsLoaded = false;
let loadingPromise: Promise<void> | null = null;

/**
 * Loads prompts from the JSON file
 */
async function loadPrompts(): Promise<void> {
  if (promptsLoaded) return;
  if (loadingPromise) return loadingPromise;
  
  loadingPromise = (async () => {
    const response = await fetch('/prompts.json');
    if (!response.ok) {
      throw new Error("Failed to load prompts.json configuration from server.");
    }
    prompts = await response.json();
    promptsLoaded = true;
  })();
  
  return loadingPromise;
}

/**
 * An abstract system for retrieving and formatting prompts.
 */
export const promptService = {
  /**
   * Gets a prompt template by key and formats it with the provided variables.
   * @param key The key of the prompt in prompts.json (e.g., 'editFrame').
   * @param variables An optional object of key-value pairs to replace placeholders (e.g., {{key}}).
   * @returns The formatted prompt string.
   * @throws An error if the prompt key is not found.
   */
  async get(key: string, variables?: Record<string, string>): Promise<string> {
    await loadPrompts();
    
    const template = prompts[key];

    if (typeof template !== 'string') {
      throw new Error(`Prompt with key "${key}" not found or is not a string in prompts.json.`);
    }

    if (!variables) {
      return template;
    }

    // Replace all instances of {{variableName}} with the corresponding value.
    let formattedPrompt = template;
    for (const [variableName, value] of Object.entries(variables)) {
      // Using a regex with 'g' flag to replace all occurrences.
      const placeholder = new RegExp(`\\{\\{${variableName}\\}\\}`, 'g');
      formattedPrompt = formattedPrompt.replace(placeholder, String(value));
    }
    return formattedPrompt;
  }
};