const HASH_SIZE = 8; // Create an 8x8 hash

/**
 * Loads a base64 image and returns its pixel data after resizing.
 * @param base64 - The base64 encoded image data URL.
 * @param width - The target width to resize to.
 * @param height - The target height to resize to.
 * @returns A promise that resolves to the ImageData object.
 */
const getImageData = (base64: string, width: number, height: number): Promise<ImageData> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d');
            if (!context) {
                return reject(new Error('Could not get canvas context.'));
            }
            context.drawImage(image, 0, 0, width, height);
            resolve(context.getImageData(0, 0, width, height));
        };
        image.onerror = () => reject(new Error('Failed to load image for hashing.'));
        image.src = base64;
    });
};

/**
 * Generates a 64-bit perceptual hash (aHash) for an image.
 * @param imageData - The pixel data of the image (should be resized to HASH_SIZE x HASH_SIZE).
 * @returns A 64-character binary string representing the hash.
 */
const generateAHash = (imageData: ImageData): string => {
    const grayscaleValues: number[] = [];
    let totalLuminance = 0;

    // Convert to grayscale and calculate average luminance
    for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        grayscaleValues.push(luminance);
        totalLuminance += luminance;
    }

    const averageLuminance = totalLuminance / (HASH_SIZE * HASH_SIZE);

    // Build the hash string
    const hash = grayscaleValues.map(luminance => (luminance >= averageLuminance) ? '1' : '0').join('');

    return hash;
};

/**
 * Calculates the Hamming distance between two binary hash strings.
 * The strings must be of equal length.
 * @param hash1 - The first binary hash string.
 * @param hash2 - The second binary hash string.
 * @returns The number of positions at which the bits are different.
 */
const calculateHammingDistance = (hash1: string, hash2: string): number => {
    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] !== hash2[i]) {
            distance++;
        }
    }
    return distance;
};

/**
 * Calculates the visual similarity between two images using a fast perceptual hash (aHash) algorithm.
 * This is suitable for detecting duplicate or near-duplicate frames.
 * @param imageA - The first image as a base64 encoded data URL.
 * @param imageB - The second image as a base64 encoded data URL.
 * @returns A promise that resolves to a similarity score between 0 and 1.
 */
export const calculatePixelSimilarity = async (imageA: string, imageB: string): Promise<number> => {
    try {
        const [imageDataA, imageDataB] = await Promise.all([
            getImageData(imageA, HASH_SIZE, HASH_SIZE),
            getImageData(imageB, HASH_SIZE, HASH_SIZE),
        ]);

        const hashA = generateAHash(imageDataA);
        const hashB = generateAHash(imageDataB);

        const distance = calculateHammingDistance(hashA, hashB);
        const maxDistance = HASH_SIZE * HASH_SIZE; // 64

        // The score is 1.0 for identical hashes (distance 0), and decreases as distance grows.
        const similarity = (maxDistance - distance) / maxDistance;
        
        return similarity;

    } catch (error) {
        console.error("Error calculating pixel similarity:", error);
        // Return 0 similarity in case of an error (e.g., image failed to load)
        return 0;
    }
};
