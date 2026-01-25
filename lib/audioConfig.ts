// Multi-layer audio configuration for melodic sonification

import type { SoundMode, LayerVolumes } from '@/types';

// Master configuration
export const AUDIO_CONFIG = {
  // Base volume in dB
  BASE_VOLUME: -12,

  // Volume range for scaling (dB)
  VOLUME_RANGE: 12,

  // Maximum concurrent voices for tick layer
  MAX_VOICES: 32,

  // Voice stealing threshold
  VOICE_STEAL_THRESHOLD: 28,

  // Sample rate for Web Audio
  SAMPLE_RATE: 44100,
} as const;

// Tick Rain Layer Configuration
export const TICK_LAYER_CONFIG = {
  // Synth settings for FM bell/pluck
  synth: {
    oscillator: {
      type: 'fmsine' as const,
      modulationType: 'sine' as const,
      modulationIndex: 3,
      harmonicity: 2,
    },
    envelope: {
      attack: 0.002,   // 2ms - instant
      decay: 0.03,     // 30ms
      sustain: 0,
      release: 0.05,   // 50ms
    },
  },

  // Note duration range (seconds)
  minDuration: 0.01,  // 10ms
  maxDuration: 0.08,  // 80ms

  // Velocity range
  minVelocity: 0.1,
  maxVelocity: 0.8,

  // Auto-duck settings
  duckThreshold: 50,     // Start ducking above 50 ticks/sec
  duckMaxRate: 150,      // Full duck at 150 ticks/sec
  duckMinVolume: 0.3,    // Don't go below 30%

  // Default volume
  defaultVolume: 0.7,
} as const;

// Bass Drone Layer Configuration
export const BASS_LAYER_CONFIG = {
  // Synth settings for sine bass
  synth: {
    oscillator: {
      type: 'sine' as const,
    },
    envelope: {
      attack: 0.1,
      decay: 0.3,
      sustain: 0.8,
      release: 0.5,
    },
    filterEnvelope: {
      attack: 0.2,
      decay: 0.3,
      sustain: 0.5,
      release: 0.5,
      baseFrequency: 100,
      octaves: 1,
    },
  },

  // Update interval (ms)
  updateInterval: 500,

  // Portamento/glide time (seconds)
  portamento: 0.3,

  // Default volume
  defaultVolume: 0.5,

  // Octave offset from tick notes
  octaveOffset: -2,  // 2 octaves below
} as const;

// Ambient Pad Layer Configuration
export const PAD_LAYER_CONFIG = {
  // 4-voice pad synth
  synth: {
    oscillator: {
      type: 'sine' as const,
    },
    envelope: {
      attack: 1.0,     // Slow attack
      decay: 0.5,
      sustain: 0.7,
      release: 2.0,    // Long release
    },
  },

  // Filter settings
  filter: {
    type: 'lowpass' as const,
    frequency: 800,
    Q: 1,
  },

  // LFO for filter modulation
  lfo: {
    type: 'sine' as const,
    minRate: 0.1,
    maxRate: 2.0,
    depth: 200,  // Hz modulation range
  },

  // Reverb settings
  reverb: {
    decay: 3.0,
    wet: 0.5,
  },

  // Chord update interval (ms)
  updateInterval: 2000,

  // Default volume
  defaultVolume: 0.4,
} as const;

// Percussion Layer Configuration
export const PERCUSSION_LAYER_CONFIG = {
  // Soft click/hi-hat sound
  synth: {
    oscillator: {
      type: 'square' as const,
    },
    envelope: {
      attack: 0.001,
      decay: 0.02,
      sustain: 0,
      release: 0.02,
    },
    filterEnvelope: {
      attack: 0.001,
      decay: 0.01,
      sustain: 0,
      release: 0.01,
      baseFrequency: 8000,
      octaves: -2,
    },
  },

  // Noise component for hi-hat character
  noise: {
    type: 'white' as const,
    playbackRate: 2,
  },

  // Default volume
  defaultVolume: 0.3,

  // Lateral movement pattern (BPM)
  lateralBPM: 60,
} as const;

// Effects chain configuration
export const EFFECTS_CONFIG = {
  // Master reverb
  reverb: {
    decay: 2.5,
    wet: 0.3,
    preDelay: 0.01,
  },

  // Delay for tick notes
  delay: {
    delayTime: 0.25,
    feedback: 0.2,
    wet: 0.15,
  },

  // Master compressor
  compressor: {
    threshold: -20,
    ratio: 4,
    attack: 0.003,
    release: 0.25,
  },

  // Limiter to prevent clipping
  limiter: {
    threshold: -3,
  },
} as const;

// Sound mode presets
export const SOUND_MODE_PRESETS: Record<SoundMode, LayerVolumes> = {
  minimal: {
    tick: 0.6,
    bass: 0,
    pad: 0,
    percussion: 0,
  },
  standard: {
    tick: 0.7,
    bass: 0.4,
    pad: 0,
    percussion: 0.2,
  },
  full: {
    tick: 0.7,
    bass: 0.5,
    pad: 0.4,
    percussion: 0.3,
  },
  ambient: {
    tick: 0.3,
    bass: 0.6,
    pad: 0.7,
    percussion: 0.1,
  },
} as const;

// Default layer volumes
export const DEFAULT_LAYER_VOLUMES: LayerVolumes = {
  tick: 0.7,
  bass: 0.5,
  pad: 0.4,
  percussion: 0.3,
};

// Get layer volumes for a sound mode
export function getLayerVolumes(mode: SoundMode): LayerVolumes {
  return { ...SOUND_MODE_PRESETS[mode] };
}

// Convert linear volume (0-1) to dB
export function linearToDb(linear: number): number {
  if (linear <= 0) return -Infinity;
  return 20 * Math.log10(linear);
}

// Convert dB to linear volume (0-1)
export function dbToLinear(db: number): number {
  if (db === -Infinity) return 0;
  return Math.pow(10, db / 20);
}

// Calculate final volume in dB from master and layer volumes
export function calculateFinalVolume(
  masterVolume: number,
  layerVolume: number,
  duckMultiplier: number = 1
): number {
  const linear = masterVolume * layerVolume * duckMultiplier;
  return AUDIO_CONFIG.BASE_VOLUME + linearToDb(linear) + AUDIO_CONFIG.VOLUME_RANGE;
}
