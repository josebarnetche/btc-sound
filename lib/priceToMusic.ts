// Price-to-frequency conversion with pentatonic scale quantization

import { quantizeToScale, midiToFrequency, midiToNoteName, getScaleNotes } from './scales';
import type { ScaleType } from '@/types';

// Default price range for BTC (will be dynamically adjusted)
const DEFAULT_PRICE_RANGE = {
  min: 90000,
  max: 110000,
};

// MIDI note range: 2 octaves centered around middle C
const MIDI_RANGE = {
  min: 48,  // C3
  max: 72,  // C5
};

// Dynamic price tracker for adaptive range
interface PriceTracker {
  prices: number[];
  lastUpdate: number;
  currentMin: number;
  currentMax: number;
}

const priceTracker: PriceTracker = {
  prices: [],
  lastUpdate: 0,
  currentMin: DEFAULT_PRICE_RANGE.min,
  currentMax: DEFAULT_PRICE_RANGE.max,
};

const TRACKER_WINDOW_MS = 60000; // 1 minute window
const MAX_TRACKED_PRICES = 1000;

// Update price tracker with new price
export function updatePriceTracker(price: number): void {
  const now = Date.now();

  // Add new price
  priceTracker.prices.push(price);

  // Remove old prices
  const cutoff = now - TRACKER_WINDOW_MS;
  priceTracker.prices = priceTracker.prices.slice(-MAX_TRACKED_PRICES);

  // Update min/max with some padding
  if (priceTracker.prices.length > 10) {
    const sortedPrices = [...priceTracker.prices].sort((a, b) => a - b);
    const p5 = sortedPrices[Math.floor(sortedPrices.length * 0.05)];
    const p95 = sortedPrices[Math.floor(sortedPrices.length * 0.95)];

    // Smooth transition to new range
    const alpha = 0.1;
    priceTracker.currentMin = alpha * p5 + (1 - alpha) * priceTracker.currentMin;
    priceTracker.currentMax = alpha * p95 + (1 - alpha) * priceTracker.currentMax;

    // Ensure minimum range
    const minRange = priceTracker.currentMin * 0.002; // 0.2% minimum range
    if (priceTracker.currentMax - priceTracker.currentMin < minRange) {
      const mid = (priceTracker.currentMax + priceTracker.currentMin) / 2;
      priceTracker.currentMin = mid - minRange / 2;
      priceTracker.currentMax = mid + minRange / 2;
    }
  }

  priceTracker.lastUpdate = now;
}

// Convert price to MIDI note number (before scale quantization)
export function priceToRawMidi(price: number): number {
  const { currentMin, currentMax } = priceTracker;

  // Clamp price to range
  const clampedPrice = Math.max(currentMin, Math.min(currentMax, price));

  // Linear interpolation to MIDI range
  const ratio = (clampedPrice - currentMin) / (currentMax - currentMin);
  const midiNote = MIDI_RANGE.min + ratio * (MIDI_RANGE.max - MIDI_RANGE.min);

  return Math.round(midiNote);
}

// Convert price to quantized MIDI note in scale
export function priceToMidi(price: number, scale: ScaleType = 'pentatonic'): number {
  const rawMidi = priceToRawMidi(price);
  return quantizeToScale(rawMidi, scale, 0); // C root
}

// Convert price to frequency in Hz
export function priceToFrequency(price: number, scale: ScaleType = 'pentatonic'): number {
  const midiNote = priceToMidi(price, scale);
  return midiToFrequency(midiNote);
}

// Convert price to note name (e.g., "C4", "G4")
export function priceToNoteName(price: number, scale: ScaleType = 'pentatonic'): string {
  const midiNote = priceToMidi(price, scale);
  return midiToNoteName(midiNote);
}

// Get velocity (0-1) based on price change magnitude
export function getVelocityFromMagnitude(magnitude: number): number {
  // Map magnitude to velocity range 0.1-0.8
  // Small changes = quiet, large changes = loud
  return 0.1 + magnitude * 0.7;
}

// Get all available notes in current price range for a scale
export function getAvailableNotes(scale: ScaleType = 'pentatonic'): number[] {
  return getScaleNotes(scale, 0, MIDI_RANGE.min, MIDI_RANGE.max);
}

// Get bass note (lower octave) for current price region
export function getBassNote(price: number, scale: ScaleType = 'pentatonic'): number {
  const midiNote = priceToMidi(price, scale);
  // Get root note of the current octave, shifted down one octave
  const octave = Math.floor(midiNote / 12);
  const rootNote = (octave - 1) * 12; // C of lower octave
  return quantizeToScale(rootNote, scale, 0);
}

// Calculate tick rate based on recent activity
export function calculateTickRate(tickTimestamps: number[]): number {
  if (tickTimestamps.length < 2) return 0;

  const now = Date.now();
  const oneSecondAgo = now - 1000;

  // Count ticks in the last second
  const recentTicks = tickTimestamps.filter(t => t > oneSecondAgo);
  return recentTicks.length;
}

// Get auto-duck multiplier based on tick rate
// Returns 0-1 where 1 is full volume, lower values duck the volume
export function getAutoDuckMultiplier(tickRate: number): number {
  const DUCK_THRESHOLD = 50; // Start ducking above 50 ticks/sec
  const MAX_DUCK_RATE = 150; // Maximum ducking at 150+ ticks/sec
  const MIN_MULTIPLIER = 0.3; // Don't go below 30% volume

  if (tickRate <= DUCK_THRESHOLD) {
    return 1.0;
  }

  const duckAmount = (tickRate - DUCK_THRESHOLD) / (MAX_DUCK_RATE - DUCK_THRESHOLD);
  const multiplier = 1.0 - (duckAmount * (1.0 - MIN_MULTIPLIER));

  return Math.max(MIN_MULTIPLIER, Math.min(1.0, multiplier));
}

// Get note duration based on tick rate (shorter notes for higher rates)
export function getNoteDuration(tickRate: number): number {
  const MIN_DURATION = 0.01;  // 10ms
  const MAX_DURATION = 0.08;  // 80ms
  const RATE_THRESHOLD = 100;

  if (tickRate <= 1) {
    return MAX_DURATION;
  }

  // Faster ticks = shorter notes
  const ratio = Math.min(tickRate / RATE_THRESHOLD, 1);
  return MAX_DURATION - ratio * (MAX_DURATION - MIN_DURATION);
}

// Get current price range info
export function getPriceRangeInfo(): { min: number; max: number; range: number } {
  return {
    min: priceTracker.currentMin,
    max: priceTracker.currentMax,
    range: priceTracker.currentMax - priceTracker.currentMin,
  };
}

// Reset price tracker (for testing or reinitialization)
export function resetPriceTracker(): void {
  priceTracker.prices = [];
  priceTracker.lastUpdate = 0;
  priceTracker.currentMin = DEFAULT_PRICE_RANGE.min;
  priceTracker.currentMax = DEFAULT_PRICE_RANGE.max;
}
