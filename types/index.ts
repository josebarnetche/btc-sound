export interface TradeData {
  e: string;      // Event type
  E: number;      // Event time
  s: string;      // Symbol
  t: number;      // Trade ID
  p: string;      // Price
  q: string;      // Quantity
  T: number;      // Trade time
  m: boolean;     // Is buyer the market maker
  M: boolean;     // Ignore
}

export interface PricePoint {
  time: number;
  price: number;
}

export interface PriceChange {
  direction: 'up' | 'down' | 'neutral';
  magnitude: number;  // 0-1 normalized
  percentChange: number;
}

export interface TickData {
  price: number;
  previousPrice: number | null;
  timestamp: number;
  change: PriceChange;
}

// Sound modes for the melodic engine
export type SoundMode = 'minimal' | 'standard' | 'full' | 'ambient';

// Scale types available
export type ScaleType = 'pentatonic' | 'major' | 'minor' | 'chromatic';

// Layer volumes for multi-layer sound
export interface LayerVolumes {
  tick: number;      // 0-1: Individual tick notes
  bass: number;      // 0-1: Bass drone layer
  pad: number;       // 0-1: Ambient pad layer
  percussion: number; // 0-1: Percussion/click layer
}

// Extended audio state for melodic engine
export interface AudioState {
  enabled: boolean;
  volume: number;      // Master volume 0-1
  muted: boolean;
  soundMode: SoundMode;
  scale: ScaleType;
  layerVolumes: LayerVolumes;
}

// Simple audio state for backwards compatibility
export interface SimpleAudioState {
  enabled: boolean;
  volume: number;
  muted: boolean;
}

export interface ConnectionState {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastUpdate: number | null;
  reconnectAttempts: number;
}

// Tick statistics for auto-ducking
export interface TickStats {
  ticksPerSecond: number;
  averagePrice: number;
  priceVolatility: number;
  trendDirection: 'up' | 'down' | 'neutral';
  trendStrength: number; // 0-1
}

// Voice for polyphonic synth
export interface Voice {
  id: number;
  note: number;
  startTime: number;
  velocity: number;
  active: boolean;
}

// Sound pack types for custom instrument presets
export type SoundPackType = 'default' | 'piano' | 'synth' | 'bells' | '8bit' | 'techno';

export interface SoundPackConfig {
  name: string;
  description: string;
  tick: {
    oscillatorType: OscillatorType;
    harmonicity?: number;
    modulationIndex?: number;
    envelope: EnvelopeConfig;
  };
  bass: {
    oscillatorType: OscillatorType;
    envelope: EnvelopeConfig;
  };
  pad: {
    oscillatorType: OscillatorType;
    envelope: EnvelopeConfig;
  };
}

export type OscillatorType =
  | 'sine' | 'square' | 'sawtooth' | 'triangle'
  | 'fmsine' | 'fmsquare' | 'fmsawtooth' | 'fmtriangle'
  | 'amsine' | 'amsquare' | 'amsawtooth' | 'amtriangle'
  | 'pulse' | 'pwm';

export interface EnvelopeConfig {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

// Pattern detection types for AI harmonies
export type PatternType =
  | 'strong_uptrend'
  | 'strong_downtrend'
  | 'high_volatility'
  | 'consolidation'
  | 'reversal_up'
  | 'reversal_down'
  | 'breakout_up'
  | 'breakout_down'
  | 'neutral';

export interface DetectedPattern {
  type: PatternType;
  strength: number;     // 0-1 confidence/intensity
  duration: number;     // How long pattern has been active (ms)
  data: PatternData;
}

export interface PatternData {
  trendStrength: number;        // -1 to 1
  volatility: number;           // 0-1 normalized
  priceChangePercent: number;   // Overall % change in window
  supportLevel: number;
  resistanceLevel: number;
  tickCount: number;
}

// Harmony rule types
export type ChordQuality =
  | 'major' | 'minor' | 'major7' | 'minor7'
  | 'dominant7' | 'diminished' | 'augmented' | 'suspended';

export interface HarmonyState {
  currentChord: ChordQuality;
  chordRoot: number;          // MIDI note number
  progression: number[];      // Array of chord roots in current progression
  progressionIndex: number;
  intensity: number;          // 0-1 overall harmonic intensity
}

export interface HarmonyRule {
  pattern: PatternType;
  chordQualities: ChordQuality[];
  progression: number[];        // Intervals from root (0, 5, 7, etc.)
  rhythm: 'slow' | 'medium' | 'fast';
  arpeggioDirection: 'up' | 'down' | 'random' | 'none';
}

// Visualization types
export type VisualizationMode = 'waveform' | 'frequency' | 'off';

export interface VisualizerState {
  mode: VisualizationMode;
  sensitivity: number;       // 0-1
  colorScheme: 'price' | 'rainbow' | 'mono';
}
