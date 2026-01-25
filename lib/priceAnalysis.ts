import type { PriceChange } from '@/types';

// Minimum percentage change for non-neutral classification
const NEUTRAL_THRESHOLD = 0.000001; // 0.0001%

// Maximum percentage change for magnitude normalization (0.5%)
const MAX_THRESHOLD = 0.005;

// EMA for smoothed price tracking (used for trend analysis, not tick triggering)
let emaPrice: number | null = null;
const EMA_ALPHA = 0.3;

// Analyze price change IMMEDIATELY - no debouncing, no throttling
// This is called for every single WebSocket tick
export function analyzePriceChangeImmediate(
  currentPrice: number,
  previousPrice: number | null
): PriceChange {
  // First tick - treat as neutral with the price as reference
  if (previousPrice === null) {
    // Update EMA
    emaPrice = currentPrice;
    return {
      direction: 'neutral',
      magnitude: 0,
      percentChange: 0,
    };
  }

  // Update EMA for trend tracking
  if (emaPrice === null) {
    emaPrice = currentPrice;
  } else {
    emaPrice = EMA_ALPHA * currentPrice + (1 - EMA_ALPHA) * emaPrice;
  }

  // Calculate percentage change from previous tick
  const percentChange = (currentPrice - previousPrice) / previousPrice;
  const absChange = Math.abs(percentChange);

  // Determine direction
  let direction: 'up' | 'down' | 'neutral';
  if (absChange < NEUTRAL_THRESHOLD) {
    direction = 'neutral';
  } else {
    direction = percentChange > 0 ? 'up' : 'down';
  }

  // Calculate normalized magnitude (0-1)
  // Even tiny changes get a small magnitude for soft sounds
  const magnitude = Math.min(absChange / MAX_THRESHOLD, 1);

  return {
    direction,
    magnitude,
    percentChange,
  };
}

// Legacy function for backwards compatibility (with debouncing)
// Only used if needed for other parts of the app
const DEBOUNCE_MS = 100;
let lastTriggerTime = 0;

export function analyzePriceChange(
  currentPrice: number,
  previousPrice: number | null
): PriceChange | null {
  const now = Date.now();

  // Debounce check
  if (now - lastTriggerTime < DEBOUNCE_MS) {
    return null;
  }

  lastTriggerTime = now;
  return analyzePriceChangeImmediate(currentPrice, previousPrice);
}

export function resetPriceAnalysis(): void {
  lastTriggerTime = 0;
  emaPrice = null;
}

export function formatPrice(price: number): string {
  return price.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPercentChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${(change * 100).toFixed(4)}%`;
}

// Get smoothed price (EMA)
export function getSmoothedPrice(): number | null {
  return emaPrice;
}
