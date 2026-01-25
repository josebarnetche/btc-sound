// Rule-based harmony system for AI-driven chord progressions

import type {
  PatternType,
  DetectedPattern,
  ChordQuality,
  HarmonyState,
  HarmonyRule,
} from '@/types';

// Chord intervals (semitones from root)
export const CHORD_INTERVALS: Record<ChordQuality, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  major7: [0, 4, 7, 11],
  minor7: [0, 3, 7, 10],
  dominant7: [0, 4, 7, 10],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8],
  suspended: [0, 5, 7],
};

// Common chord progressions (intervals from root)
const PROGRESSIONS = {
  // I-IV-V-I in major
  majorResolution: [0, 5, 7, 0],
  // i-iv-V-i in minor
  minorResolution: [0, 5, 7, 0],
  // ii-V-I jazz progression
  jazzCadence: [2, 7, 0],
  // I-V-vi-IV pop progression
  popProgression: [0, 7, 9, 5],
  // i-VII-VI-VII epic minor
  epicMinor: [0, 10, 8, 10],
  // I-vi-IV-V classic
  classicMajor: [0, 9, 5, 7],
  // Chromatic descent
  chromaticDown: [0, -1, -2, -3],
  // Ascending fifths
  fifthsUp: [0, 7, 2, 9],
};

// Harmony rules for each pattern type
const HARMONY_RULES: Record<PatternType, HarmonyRule> = {
  strong_uptrend: {
    pattern: 'strong_uptrend',
    chordQualities: ['major7', 'major', 'augmented'],
    progression: PROGRESSIONS.majorResolution,
    rhythm: 'medium',
    arpeggioDirection: 'up',
  },
  strong_downtrend: {
    pattern: 'strong_downtrend',
    chordQualities: ['minor7', 'minor', 'diminished'],
    progression: PROGRESSIONS.epicMinor,
    rhythm: 'medium',
    arpeggioDirection: 'down',
  },
  high_volatility: {
    pattern: 'high_volatility',
    chordQualities: ['dominant7', 'augmented', 'diminished'],
    progression: PROGRESSIONS.chromaticDown,
    rhythm: 'fast',
    arpeggioDirection: 'random',
  },
  consolidation: {
    pattern: 'consolidation',
    chordQualities: ['suspended', 'major', 'minor'],
    progression: [0, 0, 0, 0], // Hold same chord
    rhythm: 'slow',
    arpeggioDirection: 'none',
  },
  reversal_up: {
    pattern: 'reversal_up',
    chordQualities: ['dominant7', 'major'],
    progression: PROGRESSIONS.jazzCadence,
    rhythm: 'medium',
    arpeggioDirection: 'up',
  },
  reversal_down: {
    pattern: 'reversal_down',
    chordQualities: ['minor7', 'diminished'],
    progression: PROGRESSIONS.minorResolution,
    rhythm: 'medium',
    arpeggioDirection: 'down',
  },
  breakout_up: {
    pattern: 'breakout_up',
    chordQualities: ['major', 'augmented', 'major7'],
    progression: PROGRESSIONS.fifthsUp,
    rhythm: 'fast',
    arpeggioDirection: 'up',
  },
  breakout_down: {
    pattern: 'breakout_down',
    chordQualities: ['minor', 'diminished', 'minor7'],
    progression: PROGRESSIONS.chromaticDown,
    rhythm: 'fast',
    arpeggioDirection: 'down',
  },
  neutral: {
    pattern: 'neutral',
    chordQualities: ['major', 'minor', 'suspended'],
    progression: PROGRESSIONS.popProgression,
    rhythm: 'slow',
    arpeggioDirection: 'none',
  },
};

// Current harmony state
let harmonyState: HarmonyState = {
  currentChord: 'major',
  chordRoot: 60, // Middle C
  progression: [0],
  progressionIndex: 0,
  intensity: 0.5,
};

// Get harmony rule for a pattern
export function getHarmonyRule(pattern: PatternType): HarmonyRule {
  return HARMONY_RULES[pattern];
}

// Get chord MIDI notes for current state
export function getChordNotes(
  rootMidi: number,
  quality: ChordQuality,
  voicing: 'close' | 'spread' = 'close'
): number[] {
  const intervals = CHORD_INTERVALS[quality];

  if (voicing === 'close') {
    return intervals.map(i => rootMidi + i);
  }

  // Spread voicing - distribute across octaves
  return intervals.map((interval, index) => {
    const octaveOffset = index % 2 === 0 ? 0 : 12;
    return rootMidi + interval + octaveOffset;
  });
}

// Update harmony based on detected pattern
export function updateHarmony(pattern: DetectedPattern, basePitch: number): HarmonyState {
  const rule = getHarmonyRule(pattern.type);

  // Select chord quality based on pattern strength
  const qualityIndex = Math.min(
    Math.floor(pattern.strength * rule.chordQualities.length),
    rule.chordQualities.length - 1
  );
  const newChordQuality = rule.chordQualities[qualityIndex];

  // Advance through progression
  const newProgressionIndex = (harmonyState.progressionIndex + 1) % rule.progression.length;
  const progressionInterval = rule.progression[newProgressionIndex];

  // Calculate new root from base pitch + progression interval
  const newRoot = basePitch + progressionInterval;

  // Update intensity based on pattern strength and type
  let intensity = pattern.strength;
  if (pattern.type === 'breakout_up' || pattern.type === 'breakout_down') {
    intensity = Math.min(1, intensity + 0.3);
  } else if (pattern.type === 'consolidation') {
    intensity = Math.max(0.2, intensity - 0.2);
  }

  harmonyState = {
    currentChord: newChordQuality,
    chordRoot: newRoot,
    progression: rule.progression,
    progressionIndex: newProgressionIndex,
    intensity,
  };

  return { ...harmonyState };
}

// Get current harmony state
export function getHarmonyState(): HarmonyState {
  return { ...harmonyState };
}

// Get arpeggio notes based on pattern
export function getArpeggioNotes(
  rootMidi: number,
  quality: ChordQuality,
  direction: 'up' | 'down' | 'random' | 'none',
  count: number = 4
): number[] {
  if (direction === 'none') return [];

  const baseNotes = getChordNotes(rootMidi, quality, 'spread');

  // Extend notes across octaves
  const extendedNotes: number[] = [];
  for (let octave = -1; octave <= 1; octave++) {
    baseNotes.forEach(note => {
      extendedNotes.push(note + octave * 12);
    });
  }

  // Sort and filter to MIDI range
  const validNotes = extendedNotes
    .filter(n => n >= 36 && n <= 96)
    .sort((a, b) => a - b);

  // Select notes based on direction
  switch (direction) {
    case 'up':
      return validNotes.slice(0, count);
    case 'down':
      return validNotes.slice(-count).reverse();
    case 'random':
      return shuffleArray(validNotes).slice(0, count);
    default:
      return [];
  }
}

// Get rhythm timing based on pattern
export function getRhythmTiming(rhythm: 'slow' | 'medium' | 'fast'): number {
  const timings = {
    slow: 4000,    // 4 seconds per chord
    medium: 2000,  // 2 seconds per chord
    fast: 1000,    // 1 second per chord
  };
  return timings[rhythm];
}

// Generate harmony response for a pattern
export function generateHarmonyResponse(
  pattern: DetectedPattern,
  currentPitch: number
): {
  chordNotes: number[];
  arpeggioNotes: number[];
  quality: ChordQuality;
  timing: number;
  intensity: number;
} {
  const rule = getHarmonyRule(pattern.type);
  const state = updateHarmony(pattern, currentPitch);

  const chordNotes = getChordNotes(state.chordRoot, state.currentChord, 'spread');
  const arpeggioNotes = getArpeggioNotes(
    state.chordRoot,
    state.currentChord,
    rule.arpeggioDirection
  );

  return {
    chordNotes,
    arpeggioNotes,
    quality: state.currentChord,
    timing: getRhythmTiming(rule.rhythm),
    intensity: state.intensity,
  };
}

// Reset harmony state
export function resetHarmony(): void {
  harmonyState = {
    currentChord: 'major',
    chordRoot: 60,
    progression: [0],
    progressionIndex: 0,
    intensity: 0.5,
  };
}

// Utility: shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Get description of current harmony for UI
export function getHarmonyDescription(): string {
  const state = getHarmonyState();
  const chordNames: Record<ChordQuality, string> = {
    major: 'Major',
    minor: 'Minor',
    major7: 'Maj7',
    minor7: 'Min7',
    dominant7: 'Dom7',
    diminished: 'Dim',
    augmented: 'Aug',
    suspended: 'Sus4',
  };

  return `${chordNames[state.currentChord]} chord (intensity: ${Math.round(state.intensity * 100)}%)`;
}
