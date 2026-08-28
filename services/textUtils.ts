// Utility to split text into chunks respecting word boundaries (spaces)
// This prevents words from being cut in the middle (e.g., "데이" + "터")
export const splitTextIntoChunks = (text: string, maxChars: number = 45): string[] => {
  if (!text) return [];
  
  // Split by whitespace (spaces, newlines, tabs)
  const words = text.trim().split(/\s+/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const word of words) {
    // Check if adding the next word exceeds maxChars
    // +1 accounts for the space we would add
    const potentialLength = currentChunk.length + (currentChunk ? 1 : 0) + word.length;
    
    if (potentialLength <= maxChars) {
      currentChunk += (currentChunk ? " " : "") + word;
    } else {
      // Push the current chunk if not empty
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      // Start a new chunk with the current word
      currentChunk = word;
    }
  }
  
  // Push the final chunk
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
};

// Calculates which chunk should be displayed at a specific progress (0.0 - 1.0)
// based on the length of characters in each chunk relative to the total length.
// This provides better lip-sync approximation than equal time distribution.
export const getChunkIndexByCharacterCount = (chunks: string[], progress: number): number => {
  if (chunks.length === 0) return 0;
  if (progress >= 1) return chunks.length - 1;
  if (progress <= 0) return 0;

  // Calculate total characters (weight)
  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  
  // Find target character position
  const targetCharIndex = progress * totalLength;
  
  let runningCount = 0;
  for (let i = 0; i < chunks.length; i++) {
    runningCount += chunks[i].length;
    // If the running count exceeds the target, this is our chunk
    // We add a small buffer logic or just return i
    if (runningCount >= targetCharIndex) {
      return i;
    }
  }
  
  return chunks.length - 1;
};