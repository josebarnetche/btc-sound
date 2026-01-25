// Sound pack configurations for different instrument presets

import type { SoundPackType, SoundPackConfig } from '@/types';

// Default pack - FM Bell tick, Sine Drone bass, Soft Synth pad
const defaultPack: SoundPackConfig = {
  name: 'Default',
  description: 'FM bell ticks with sine drone bass and soft synth pads',
  tick: {
    oscillatorType: 'fmsine',
    harmonicity: 2,
    modulationIndex: 3,
    envelope: {
      attack: 0.002,
      decay: 0.03,
      sustain: 0,
      release: 0.05,
    },
  },
  bass: {
    oscillatorType: 'sine',
    envelope: {
      attack: 0.1,
      decay: 0.3,
      sustain: 0.8,
      release: 0.5,
    },
  },
  pad: {
    oscillatorType: 'sine',
    envelope: {
      attack: 1.0,
      decay: 0.5,
      sustain: 0.7,
      release: 2.0,
    },
  },
};

// Piano pack - Piano-like tick, Deep sine bass, String pad
const pianoPack: SoundPackConfig = {
  name: 'Piano',
  description: 'Piano-like tones with deep bass and string pads',
  tick: {
    oscillatorType: 'triangle',
    harmonicity: 1,
    modulationIndex: 0.5,
    envelope: {
      attack: 0.001,
      decay: 0.15,
      sustain: 0.1,
      release: 0.3,
    },
  },
  bass: {
    oscillatorType: 'sine',
    envelope: {
      attack: 0.05,
      decay: 0.4,
      sustain: 0.6,
      release: 0.8,
    },
  },
  pad: {
    oscillatorType: 'sawtooth',
    envelope: {
      attack: 1.5,
      decay: 0.8,
      sustain: 0.5,
      release: 3.0,
    },
  },
};

// Synth pack - Square/Saw lead, Sub bass, Lush pad
const synthPack: SoundPackConfig = {
  name: 'Synth',
  description: 'Electronic synth leads with sub bass and lush pads',
  tick: {
    oscillatorType: 'sawtooth',
    envelope: {
      attack: 0.001,
      decay: 0.05,
      sustain: 0.3,
      release: 0.1,
    },
  },
  bass: {
    oscillatorType: 'triangle',
    envelope: {
      attack: 0.02,
      decay: 0.2,
      sustain: 0.9,
      release: 0.3,
    },
  },
  pad: {
    oscillatorType: 'fmsawtooth',
    envelope: {
      attack: 0.8,
      decay: 0.4,
      sustain: 0.8,
      release: 2.5,
    },
  },
};

// Bells pack - Metallic FM tick, Sine bass, Bell wash pad
const bellsPack: SoundPackConfig = {
  name: 'Bells',
  description: 'Ethereal metallic bells with soft bass and bell wash',
  tick: {
    oscillatorType: 'fmsine',
    harmonicity: 4,
    modulationIndex: 8,
    envelope: {
      attack: 0.001,
      decay: 0.2,
      sustain: 0,
      release: 0.8,
    },
  },
  bass: {
    oscillatorType: 'sine',
    envelope: {
      attack: 0.2,
      decay: 0.5,
      sustain: 0.6,
      release: 1.0,
    },
  },
  pad: {
    oscillatorType: 'fmsine',
    envelope: {
      attack: 2.0,
      decay: 1.0,
      sustain: 0.4,
      release: 4.0,
    },
  },
};

// 8-bit pack - Square wave tick, Triangle bass, PWM pad
const eightBitPack: SoundPackConfig = {
  name: '8-bit',
  description: 'Retro gaming sounds with square waves and chiptune vibes',
  tick: {
    oscillatorType: 'square',
    envelope: {
      attack: 0.001,
      decay: 0.02,
      sustain: 0.4,
      release: 0.02,
    },
  },
  bass: {
    oscillatorType: 'triangle',
    envelope: {
      attack: 0.01,
      decay: 0.1,
      sustain: 0.8,
      release: 0.1,
    },
  },
  pad: {
    oscillatorType: 'pulse',
    envelope: {
      attack: 0.3,
      decay: 0.2,
      sustain: 0.6,
      release: 0.5,
    },
  },
};

// Techno/Chaos pack - Aggressive, punchy, reactive to every tick
const technoPack: SoundPackConfig = {
  name: 'Techno',
  description: 'Aggressive chaos mode - hard-hitting kicks and acid stabs',
  tick: {
    oscillatorType: 'fmsquare',
    harmonicity: 3,
    modulationIndex: 12,
    envelope: {
      attack: 0.001,
      decay: 0.08,
      sustain: 0.2,
      release: 0.05,
    },
  },
  bass: {
    oscillatorType: 'sawtooth',
    envelope: {
      attack: 0.001,
      decay: 0.15,
      sustain: 0.7,
      release: 0.08,
    },
  },
  pad: {
    oscillatorType: 'fmsawtooth',
    envelope: {
      attack: 0.01,
      decay: 0.1,
      sustain: 0.9,
      release: 0.15,
    },
  },
};

// All sound packs
export const SOUND_PACKS: Record<SoundPackType, SoundPackConfig> = {
  default: defaultPack,
  piano: pianoPack,
  synth: synthPack,
  bells: bellsPack,
  '8bit': eightBitPack,
  techno: technoPack,
};

// Get sound pack by type
export function getSoundPack(type: SoundPackType): SoundPackConfig {
  return SOUND_PACKS[type];
}

// List of all sound pack types for UI
export const SOUND_PACK_LIST: { value: SoundPackType; label: string; description: string }[] = [
  { value: 'default', label: 'Default', description: 'FM bells & soft synth' },
  { value: 'piano', label: 'Piano', description: 'Classical feel' },
  { value: 'synth', label: 'Synth', description: 'Electronic vibes' },
  { value: 'bells', label: 'Bells', description: 'Ethereal & metallic' },
  { value: '8bit', label: '8-bit', description: 'Retro gaming' },
  { value: 'techno', label: 'Techno', description: 'Chaos mode' },
];

// Map our oscillator type to Tone.js compatible type
export function mapOscillatorType(type: string): string {
  // Tone.js uses different naming for some types
  const mapping: Record<string, string> = {
    'fmsine': 'fmsine',
    'fmsquare': 'fmsquare',
    'fmsawtooth': 'fmsawtooth',
    'fmtriangle': 'fmtriangle',
    'amsine': 'amsine',
    'amsquare': 'amsquare',
    'amsawtooth': 'amsawtooth',
    'amtriangle': 'amtriangle',
    'pulse': 'pulse',
    'pwm': 'pwm',
  };
  return mapping[type] || type;
}
