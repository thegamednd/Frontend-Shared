/**
 * Cost estimation for Scribe audio processing.
 * $0.02 USD per minute (rounded up), i.e. $1.00 per 50 minutes.
 */

export function estimateCost(audioDurationSeconds) {
  const wholeMinutes = Math.ceil(audioDurationSeconds / 60);
  return wholeMinutes * 0.02;
}

export function estimateCostFromChunks(chunkCount) {
  // Each chunk is ~30 seconds
  return estimateCost(chunkCount * 30);
}

export function estimateRegenerateCost(audioDurationSeconds) {
  const wholeMinutes = Math.ceil(audioDurationSeconds / 60);
  return wholeMinutes * 0.004;
}

export function formatCost(amount) {
  return `$${amount.toFixed(2)} USD`;
}
