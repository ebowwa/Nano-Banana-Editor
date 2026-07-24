import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

/**
 * A reusable client for interacting with the Google Gemini API.
 */
export const geminiClient = {
  /**
   * Generates content with a JSON response, typically for structured data extraction.
   * @param model The model to use (e.g., 'gemini-2.5-flash').
   * @param prompt The text prompt.
   * @param dataParts An array of data parts (image, video, etc.) for the model to analyze.
   * @param schema The JSON schema the response should conform to.
   * @returns The raw GenerateContentResponse from the API.
   */
  async generateJson(
    model: string,
    prompt: string,
    dataParts: any[],
    schema?: any
  ): Promise<GenerateContentResponse> {
    try {
      return await ai.models.generateContent({
        model,
        contents: { parts: [{ text: prompt }, ...dataParts] },
        config: {
          responseMimeType: schema ? "application/json" : undefined,
          responseSchema: schema,
        },
      });
    } catch (error) {
      console.error(`Error calling Gemini API (${model}) for JSON generation:`, error);
      throw new Error(`Gemini API call failed for model ${model}.`);
    }
  },

  /**
   * Generates an image based on a prompt that can include text and other images.
   * @param model The model to use (e.g., 'gemini-2.5-flash-image-preview').
   * @param parts An array of content parts (text and images).
   * @returns The raw GenerateContentResponse from the API.
   */
  async generateImage(
    model: string,
    parts: any[]
  ): Promise<GenerateContentResponse> {
    try {
      return await ai.models.generateContent({
        model,
        contents: { parts },
        config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
      });
    } catch (error) {
      console.error(`Error calling Gemini API (${model}) for image generation:`, error);
      throw new Error(`Gemini API call failed for model ${model}.`);
    }
  },
};