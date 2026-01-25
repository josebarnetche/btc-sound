// Musical scale definitions and utilities for melodic sonification

// MIDI note numbers for middle C octave
export const MIDI_NOTES = {
  C: 0,
  'C#': 1,
  D: 2,
  'D#': 3,
  E: 4,
  F: 5,
  'F#': 6,
  G: 7,
  'G#': 8,
  A: 9,
  'A#': 10,
  B: 11,
} as const;

// Scale intervals (semitones from root)
export const SCALE_INTERVALS = {
  pentatonic: [0, 2, 4, 7, 9],        // C, D, E, G, A - always pleasant
  major: [0, 2, 4, 5, 7, 9, 11],      // C, D, E, F, G, A, B
  minor: [0, 2, 3, 5, 7, 8, 10],      // Natural minor
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
} as const;

export type ScaleType = keyof typeof SCALE_INTERVALS;

// Note names for display
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

// Convert MIDI note number to frequency (A4 = 440Hz = MIDI 69)
export function midiToFrequency(midiNote: number): number {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

// Convert MIDI note number to note name with octave (e.g., "C4")
export function midiToNoteName(midiNote: number): string {
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = NOTE_NAMES[midiNote % 12];
  return `${noteName}${octave}`;
}

// Convert note name with octave to MIDI note number
export function noteNameToMidi(noteName: string): number {
  const match = noteName.match(/^([A-G]#?)(\d+)$/);
  if (!match) return 60; // Default to middle C

  const [, note, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);
  const noteIndex = NOTE_NAMES.indexOf(note as typeof NOTE_NAMES[number]);

  return (octave + 1) * 12 + noteIndex;
}

// Quantize a MIDI note to the nearest note in a scale
export function quantizeToScale(midiNote: number, scale: ScaleType, rootNote: number = 0): number {
  const intervals = SCALE_INTERVALS[scale];
  const octave = Math.floor(midiNote / 12);
  const noteInOctave = midiNote % 12;

  // Adjust for root note
  const adjustedNote = (noteInOctave - rootNote + 12) % 12;

  // Find closest interval in scale
  let closestInterval: number = intervals[0];
  let minDistance = Infinity;

  for (const interval of intervals) {
    const distance = Math.abs(adjustedNote - interval);
    const wrapDistance = Math.abs(adjustedNote - (interval + 12));
    const actualDistance = Math.min(distance, wrapDistance);

    if (actualDistance < minDistance) {
      minDistance = actualDistance;
      closestInterval = interval;
    }
  }

  // Reconstruct the MIDI note
  const quantizedNote = octave * 12 + ((closestInterval + rootNote) % 12);

  // Handle octave boundary edge cases
  if (quantizedNote > midiNote + 6) {
    return quantizedNote - 12;
  }
  if (quantizedNote < midiNote - 6) {
    return quantizedNote + 12;
  }

  return quantizedNote;
}

// Get all notes in a scale within a MIDI range
export function getScaleNotes(
  scale: ScaleType,
  rootNote: number,
  minMidi: number,
  maxMidi: number
): number[] {
  const notes: number[] = [];
  const intervals = SCALE_INTERVALS[scale];

  // Start from the octave containing minMidi
  const startOctave = Math.floor(minMidi / 12);
  const endOctave = Math.floor(maxMidi / 12) + 1;

  for (let octave = startOctave; octave <= endOctave; octave++) {
    for (const interval of intervals) {
      const midiNote = octave * 12 + ((interval + rootNote) % 12);
      if (midiNote >= minMidi && midiNote <= maxMidi) {
        notes.push(midiNote);
      }
    }
  }

  return notes.sort((a, b) => a - b);
}

// Get chord notes for a given root in a scale (triad)
export function getChordNotes(
  rootMidi: number,
  scale: ScaleType,
  chordType: 'major' | 'minor' | 'suspended' = 'major'
): number[] {
  const intervals = {
    major: [0, 4, 7],      // Root, major 3rd, perfect 5th
    minor: [0, 3, 7],      // Root, minor 3rd, perfect 5th
    suspended: [0, 5, 7],  // Root, perfect 4th, perfect 5th
  };

  return intervals[chordType].map(interval => rootMidi + interval);
}

// Get pad chord notes (4-voice voicing)
export function getPadChordNotes(
  rootMidi: number,
  chordType: 'major' | 'minor' | 'suspended' = 'major'
): number[] {
  const intervals = {
    major: [0, 4, 7, 12],      // Root, major 3rd, 5th, octave
    minor: [0, 3, 7, 12],      // Root, minor 3rd, 5th, octave
    suspended: [0, 5, 7, 14],  // Root, 4th, 5th, 9th
  };

  return intervals[chordType].map(interval => rootMidi + interval);
}

// Determine chord type based on price trend
export function getTrendChordType(
  percentChange: number
): 'major' | 'minor' | 'suspended' {
  if (Math.abs(percentChange) < 0.0001) {
    return 'suspended'; // Lateral movement
  }
  return percentChange > 0 ? 'major' : 'minor';
}

// Get the octave emphasis based on trend direction
export function getOctaveOffset(direction: 'up' | 'down' | 'neutral'): number {
  switch (direction) {
    case 'up':
      return 12; // Higher octave for upward movement
    case 'down':
      return -12; // Lower octave for downward movement
    default:
      return 0;
  }
}
