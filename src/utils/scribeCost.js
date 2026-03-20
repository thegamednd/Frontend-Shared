/**
 * Cost estimation for Scribe audio processing.
 * $0.05 USD per minute (rounded up), i.e. $1.00 per 20 minutes.
 */

export function estimateCost(audioDurationSeconds) {
  const wholeMinutes = Math.ceil(audioDurationSeconds / 60);
  return wholeMinutes * 0.05;
}

export function estimateCostFromChunks(chunkCount) {
  // Each chunk is ~30 seconds
  return estimateCost(chunkCount * 30);
}

export function estimateRegenerateCost(audioDurationSeconds) {
  const wholeMinutes = Math.ceil(audioDurationSeconds / 60);
  return wholeMinutes * 0.01;
}

export function formatCost(amount) {
  return `$${amount.toFixed(2)} USD`;
}
