// Price pattern detection for AI harmonies

import type { PatternType, DetectedPattern, PatternData, PriceChange } from '@/types';

// Configuration for pattern detection
const CONFIG = {
  WINDOW_SIZE: 60000,           // 60 second rolling window
  MIN_TICKS_FOR_ANALYSIS: 30,   // Minimum ticks before pattern detection
  TREND_THRESHOLD: 0.001,       // 0.1% threshold for trend detection
  VOLATILITY_HIGH: 0.0008,      // High volatility threshold (std dev / mean)
  CONSOLIDATION_RANGE: 0.0005,  // 0.05% range for consolidation
  REVERSAL_TICKS: 10,           // Ticks to confirm reversal
  BREAKOUT_MULTIPLIER: 2,       // Multiple of avg move for breakout
};

interface PriceEntry {
  price: number;
  timestamp: number;
  direction: 'up' | 'down' | 'neutral';
}

// Rolling window of price data
class PriceWindow {
  private entries: PriceEntry[] = [];
  private windowMs: number;

  constructor(windowMs: number = CONFIG.WINDOW_SIZE) {
    this.windowMs = windowMs;
  }

  add(price: number, direction: 'up' | 'down' | 'neutral'): void {
    const now = Date.now();
    this.entries.push({ price, timestamp: now, direction });
    this.cleanup();
  }

  private cleanup(): void {
    const cutoff = Date.now() - this.windowMs;
    this.entries = this.entries.filter(e => e.timestamp > cutoff);
  }

  getEntries(): PriceEntry[] {
    this.cleanup();
    return [...this.entries];
  }

  get length(): number {
    return this.entries.length;
  }

  getLatest(count: number): PriceEntry[] {
    return this.entries.slice(-count);
  }

  clear(): void {
    this.entries = [];
  }
}

// Singleton price window
const priceWindow = new PriceWindow();

// Add new price to the window
export function addPriceToWindow(price: number, change: PriceChange): void {
  priceWindow.add(price, change.direction);
}

// Calculate standard deviation
function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / values.length);
}

// Calculate trend strength (-1 to 1)
function calculateTrendStrength(entries: PriceEntry[]): number {
  if (entries.length < 2) return 0;

  const first = entries[0].price;
  const last = entries[entries.length - 1].price;
  const change = (last - first) / first;

  // Normalize to -1 to 1 range
  const maxChange = 0.01; // 1% is max expected in window
  return Math.max(-1, Math.min(1, change / maxChange));
}

// Calculate volatility (0 to 1)
function calculateVolatility(entries: PriceEntry[]): number {
  if (entries.length < 3) return 0;

  const prices = entries.map(e => e.price);
  const stdDev = calculateStdDev(prices);
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;

  // Coefficient of variation normalized
  const cv = stdDev / mean;
  return Math.min(1, cv / 0.005); // 0.5% CV = max volatility
}

// Detect support and resistance levels
function calculateLevels(entries: PriceEntry[]): { support: number; resistance: number } {
  if (entries.length < 5) {
    const price = entries[entries.length - 1]?.price || 0;
    return { support: price, resistance: price };
  }

  const prices = entries.map(e => e.price).sort((a, b) => a - b);
  const p10 = prices[Math.floor(prices.length * 0.1)];
  const p90 = prices[Math.floor(prices.length * 0.9)];

  return { support: p10, resistance: p90 };
}

// Detect if a reversal occurred
function detectReversal(entries: PriceEntry[]): 'up' | 'down' | null {
  if (entries.length < CONFIG.REVERSAL_TICKS * 2) return null;

  const recent = entries.slice(-CONFIG.REVERSAL_TICKS);
  const prior = entries.slice(-CONFIG.REVERSAL_TICKS * 2, -CONFIG.REVERSAL_TICKS);

  const recentTrend = calculateTrendStrength(recent);
  const priorTrend = calculateTrendStrength(prior);

  // Reversal requires significant trend change
  if (priorTrend < -0.3 && recentTrend > 0.3) return 'up';
  if (priorTrend > 0.3 && recentTrend < -0.3) return 'down';

  return null;
}

// Detect breakout
function detectBreakout(entries: PriceEntry[]): 'up' | 'down' | null {
  if (entries.length < 10) return null;

  const recent = entries.slice(-5);
  const prior = entries.slice(-30, -5);

  if (prior.length < 10) return null;

  const { support, resistance } = calculateLevels(prior);
  const lastPrice = recent[recent.length - 1].price;

  const range = resistance - support;
  const breakoutThreshold = range * 0.5;

  if (lastPrice > resistance + breakoutThreshold) return 'up';
  if (lastPrice < support - breakoutThreshold) return 'down';

  return null;
}

// Main pattern detection function
export function detectPattern(): DetectedPattern {
  const entries = priceWindow.getEntries();

  // Not enough data
  if (entries.length < CONFIG.MIN_TICKS_FOR_ANALYSIS) {
    return {
      type: 'neutral',
      strength: 0,
      duration: 0,
      data: {
        trendStrength: 0,
        volatility: 0,
        priceChangePercent: 0,
        supportLevel: 0,
        resistanceLevel: 0,
        tickCount: entries.length,
      },
    };
  }

  // Calculate base metrics
  const trendStrength = calculateTrendStrength(entries);
  const volatility = calculateVolatility(entries);
  const { support, resistance } = calculateLevels(entries);

  const firstPrice = entries[0].price;
  const lastPrice = entries[entries.length - 1].price;
  const priceChangePercent = (lastPrice - firstPrice) / firstPrice;

  const data: PatternData = {
    trendStrength,
    volatility,
    priceChangePercent,
    supportLevel: support,
    resistanceLevel: resistance,
    tickCount: entries.length,
  };

  // Detect specific patterns in priority order
  const reversal = detectReversal(entries);
  if (reversal) {
    return {
      type: reversal === 'up' ? 'reversal_up' : 'reversal_down',
      strength: Math.abs(trendStrength),
      duration: CONFIG.REVERSAL_TICKS * 100,
      data,
    };
  }

  const breakout = detectBreakout(entries);
  if (breakout) {
    return {
      type: breakout === 'up' ? 'breakout_up' : 'breakout_down',
      strength: 0.9,
      duration: 5000,
      data,
    };
  }

  // High volatility
  if (volatility > 0.7) {
    return {
      type: 'high_volatility',
      strength: volatility,
      duration: entries.length * 50,
      data,
    };
  }

  // Strong uptrend
  if (priceChangePercent > CONFIG.TREND_THRESHOLD && trendStrength > 0.5) {
    return {
      type: 'strong_uptrend',
      strength: trendStrength,
      duration: entries.length * 50,
      data,
    };
  }

  // Strong downtrend
  if (priceChangePercent < -CONFIG.TREND_THRESHOLD && trendStrength < -0.5) {
    return {
      type: 'strong_downtrend',
      strength: Math.abs(trendStrength),
      duration: entries.length * 50,
      data,
    };
  }

  // Consolidation (low volatility, narrow range)
  const range = resistance - support;
  const rangePercent = range / lastPrice;
  if (rangePercent < CONFIG.CONSOLIDATION_RANGE && volatility < 0.3) {
    return {
      type: 'consolidation',
      strength: 1 - volatility,
      duration: entries.length * 50,
      data,
    };
  }

  // Default neutral
  return {
    type: 'neutral',
    strength: 0.5,
    duration: entries.length * 50,
    data,
  };
}

// Get recent pattern for display
export function getRecentPatternSummary(): {
  pattern: PatternType;
  description: string;
  strength: number;
} {
  const detected = detectPattern();

  const descriptions: Record<PatternType, string> = {
    strong_uptrend: 'Strong upward momentum',
    strong_downtrend: 'Strong downward pressure',
    high_volatility: 'High market volatility',
    consolidation: 'Price consolidating',
    reversal_up: 'Bullish reversal detected',
    reversal_down: 'Bearish reversal detected',
    breakout_up: 'Breakout to upside',
    breakout_down: 'Breakout to downside',
    neutral: 'Neutral market conditions',
  };

  return {
    pattern: detected.type,
    description: descriptions[detected.type],
    strength: detected.strength,
  };
}

// Reset the price window
export function resetPatternDetector(): void {
  priceWindow.clear();
}

// Export for testing
export { priceWindow };
