/**
 * Converts a base64 data URL into an object suitable for the Gemini API's `inlineData` part.
 * @param data The base64 data URL string (e.g., "data:image/jpeg;base64,...").
 * @returns An object with `inlineData` containing the mimeType and base64 data.
 */
export const base64ToPart = (data: string) => {
    const mimeType = data.substring(5, data.indexOf(';'));
    const base64Data = data.substring(data.indexOf(',') + 1);
    return {
        inlineData: {
            mimeType,
            data: base64Data,
        }
    };
};

/**
 * Converts a File object into a Gemini API `Part` object with inlineData.
 * @param file The file to convert.
 * @returns A promise that resolves to the Gemini Part object.
 */
export const fileToPart = async (file: File) => {
    const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    return {
        inlineData: {
            mimeType: file.type,
            data: base64Data.substring(base64Data.indexOf(',') + 1),
        }
    };
};