// Algorithmic melody generation based on price patterns

import { getScaleNotes, quantizeToScale, getPadChordNotes, getTrendChordType } from './scales';
import type { ScaleType, TickStats } from '@/types';

// Recent price history for pattern detection
interface PricePattern {
  prices: number[];
  timestamps: number[];
  directions: ('up' | 'down' | 'neutral')[];
}

const patternHistory: PricePattern = {
  prices: [],
  timestamps: [],
  directions: [],
};

const MAX_PATTERN_LENGTH = 50;

// Add a price to the pattern history
export function addToPattern(price: number, direction: 'up' | 'down' | 'neutral'): void {
  const now = Date.now();

  patternHistory.prices.push(price);
  patternHistory.timestamps.push(now);
  patternHistory.directions.push(direction);

  // Trim to max length
  if (patternHistory.prices.length > MAX_PATTERN_LENGTH) {
    patternHistory.prices = patternHistory.prices.slice(-MAX_PATTERN_LENGTH);
    patternHistory.timestamps = patternHistory.timestamps.slice(-MAX_PATTERN_LENGTH);
    patternHistory.directions = patternHistory.directions.slice(-MAX_PATTERN_LENGTH);
  }
}

// Calculate tick statistics
export function calculateTickStats(): TickStats {
  const now = Date.now();
  const oneSecondAgo = now - 1000;
  const twoSecondsAgo = now - 2000;

  // Ticks per second
  const recentTicks = patternHistory.timestamps.filter(t => t > oneSecondAgo);
  const ticksPerSecond = recentTicks.length;

  // Average price
  const recentPrices = patternHistory.prices.slice(-20);
  const averagePrice = recentPrices.length > 0
    ? recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length
    : 0;

  // Volatility (standard deviation of recent price changes)
  let volatility = 0;
  if (recentPrices.length > 1) {
    const changes = [];
    for (let i = 1; i < recentPrices.length; i++) {
      changes.push(Math.abs(recentPrices[i] - recentPrices[i - 1]) / recentPrices[i - 1]);
    }
    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
    const squaredDiffs = changes.map(c => Math.pow(c - avgChange, 2));
    volatility = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length);
  }

  // Trend direction and strength
  const twoSecondPrices = patternHistory.prices.filter((_, i) =>
    patternHistory.timestamps[i] > twoSecondsAgo
  );

  let trendDirection: 'up' | 'down' | 'neutral' = 'neutral';
  let trendStrength = 0;

  if (twoSecondPrices.length >= 2) {
    const first = twoSecondPrices[0];
    const last = twoSecondPrices[twoSecondPrices.length - 1];
    const change = (last - first) / first;

    if (Math.abs(change) < 0.0001) {
      trendDirection = 'neutral';
    } else {
      trendDirection = change > 0 ? 'up' : 'down';
    }

    // Trend strength: 0-1 based on consistency of direction
    const ups = patternHistory.directions.slice(-10).filter(d => d === 'up').length;
    const downs = patternHistory.directions.slice(-10).filter(d => d === 'down').length;
    trendStrength = Math.abs(ups - downs) / 10;
  }

  return {
    ticksPerSecond,
    averagePrice,
    priceVolatility: volatility,
    trendDirection,
    trendStrength,
  };
}

// Detect if we're in a lateral (consolidation) period
export function isLateralMovement(): boolean {
  const stats = calculateTickStats();
  return stats.trendDirection === 'neutral' || stats.trendStrength < 0.3;
}

// Generate arpeggio notes for trending periods
export function generateArpeggio(
  baseNote: number,
  direction: 'up' | 'down',
  scale: ScaleType,
  length: number = 4
): number[] {
  const scaleNotes = getScaleNotes(scale, 0, baseNote - 12, baseNote + 24);
  const baseIndex = scaleNotes.findIndex(n => n >= baseNote);

  if (baseIndex === -1) return [baseNote];

  const notes: number[] = [];
  for (let i = 0; i < length; i++) {
    const index = direction === 'up'
      ? baseIndex + i
      : baseIndex - i;

    if (index >= 0 && index < scaleNotes.length) {
      notes.push(scaleNotes[index]);
    }
  }

  return notes;
}

// Generate melody phrase from recent price pattern
export function generateMelodicPhrase(
  scale: ScaleType,
  length: number = 4
): number[] {
  if (patternHistory.prices.length < length) {
    return [];
  }

  const recentPrices = patternHistory.prices.slice(-length);
  const notes: number[] = [];

  for (const price of recentPrices) {
    // Map price to MIDI range (simplified, assumes price is already tracked)
    const normalizedPrice = price;
    const baseNote = 60; // Middle C as base

    // Create variation based on price
    const variation = Math.floor((normalizedPrice % 1000) / 100) - 5;
    const note = quantizeToScale(baseNote + variation, scale, 0);
    notes.push(note);
  }

  return notes;
}

// Get ambient pad chord based on current trend
export function getAmbientChord(
  baseNote: number,
  percentChange: number
): number[] {
  const chordType = getTrendChordType(percentChange);
  return getPadChordNotes(baseNote, chordType);
}

// Get filter frequency for pad based on volatility
// Higher volatility = higher filter cutoff (brighter sound)
export function getPadFilterFrequency(volatility: number): number {
  const MIN_FREQ = 200;
  const MAX_FREQ = 2000;

  // Normalize volatility (typical range 0-0.001)
  const normalizedVol = Math.min(volatility / 0.001, 1);

  return MIN_FREQ + normalizedVol * (MAX_FREQ - MIN_FREQ);
}

// Get LFO rate for pad filter based on volatility
// Higher volatility = faster LFO
export function getPadLFORate(volatility: number): number {
  const MIN_RATE = 0.1;  // Hz
  const MAX_RATE = 2.0;  // Hz

  const normalizedVol = Math.min(volatility / 0.001, 1);

  return MIN_RATE + normalizedVol * (MAX_RATE - MIN_RATE);
}

// Get percussion pattern for lateral movement
export function getPercussionPattern(): { interval: number; velocity: number }[] {
  // 60 BPM = 1 beat per second = 1000ms intervals
  return [
    { interval: 0, velocity: 0.5 },
    { interval: 500, velocity: 0.3 },
    { interval: 1000, velocity: 0.5 },
    { interval: 1500, velocity: 0.3 },
  ];
}

// Determine if a percussion hit should play on direction change
export function shouldPlayPercussion(
  currentDirection: 'up' | 'down' | 'neutral',
  previousDirection: 'up' | 'down' | 'neutral'
): boolean {
  if (currentDirection === 'neutral' || previousDirection === 'neutral') {
    return false;
  }
  return currentDirection !== previousDirection;
}

// Reset pattern history
export function resetPatternHistory(): void {
  patternHistory.prices = [];
  patternHistory.timestamps = [];
  patternHistory.directions = [];
}

// Get tick sound character based on direction
export function getTickCharacter(direction: 'up' | 'down' | 'neutral'): {
  attack: number;
  decay: number;
  brightness: number;
} {
  switch (direction) {
    case 'up':
      // Bright bell tone, snappy attack
      return { attack: 0.002, decay: 0.03, brightness: 1.0 };
    case 'down':
      // Darker pluck, slightly softer
      return { attack: 0.005, decay: 0.05, brightness: 0.6 };
    default:
      // Softer, more ambient
      return { attack: 0.01, decay: 0.08, brightness: 0.4 };
  }
}
