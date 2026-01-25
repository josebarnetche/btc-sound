'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import type {
  AudioState,
  SoundMode,
  ScaleType,
  LayerVolumes,
  PriceChange,
  SoundPackType,
  VisualizationMode,
  PatternType,
} from '@/types';
import {
  AUDIO_CONFIG,
  TICK_LAYER_CONFIG,
  BASS_LAYER_CONFIG,
  PAD_LAYER_CONFIG,
  EFFECTS_CONFIG,
  DEFAULT_LAYER_VOLUMES,
  getLayerVolumes,
  calculateFinalVolume,
} from '@/lib/audioConfig';
import {
  priceToMidi,
  updatePriceTracker,
  getAutoDuckMultiplier,
  getNoteDuration,
  getBassNote,
} from '@/lib/priceToMusic';
import { midiToNoteName, getPadChordNotes, getTrendChordType } from '@/lib/scales';
import {
  addToPattern,
  shouldPlayPercussion,
} from '@/lib/melodyGenerator';
import { getSoundPack } from '@/lib/soundPacks';
import { addPriceToWindow, detectPattern } from '@/lib/patternDetector';
import { generateHarmonyResponse, getHarmonyDescription } from '@/lib/harmonyRules';

interface UseMelodicEngineReturn {
  audioState: AudioState;
  isReady: boolean;
  ticksPerSecond: number;
  currentSoundPack: SoundPackType;
  currentPattern: PatternType;
  harmonyDescription: string;
  enableAudio: () => Promise<void>;
  disableAudio: () => void;
  setMasterVolume: (volume: number) => void;
  setLayerVolume: (layer: keyof LayerVolumes, volume: number) => void;
  setSoundMode: (mode: SoundMode) => void;
  setScale: (scale: ScaleType) => void;
  setSoundPack: (pack: SoundPackType) => void;
  toggleMute: () => void;
  playTick: (price: number, change: PriceChange) => void;
  // Analyser methods for visualization
  getWaveformData: () => Float32Array | null;
  getFrequencyData: () => Float32Array | null;
  visualizerMode: VisualizationMode;
  setVisualizerMode: (mode: VisualizationMode) => void;
}

const DEFAULT_AUDIO_STATE: AudioState = {
  enabled: false,
  volume: 0.7,
  muted: false,
  soundMode: 'full',
  scale: 'pentatonic',
  layerVolumes: { ...DEFAULT_LAYER_VOLUMES },
};

export function useMelodicEngine(): UseMelodicEngineReturn {
  const [audioState, setAudioState] = useState<AudioState>(DEFAULT_AUDIO_STATE);
  const [isReady, setIsReady] = useState(false);
  const [ticksPerSecond, setTicksPerSecond] = useState(0);
  const [currentSoundPack, setCurrentSoundPack] = useState<SoundPackType>('default');
  const [currentPattern, setCurrentPattern] = useState<PatternType>('neutral');
  const [harmonyDescription, setHarmonyDescription] = useState('');
  const [visualizerMode, setVisualizerModeState] = useState<VisualizationMode>('off');

  // Tone.js reference
  const toneRef = useRef<typeof import('tone') | null>(null);

  // Synth references
  const tickSynthRef = useRef<import('tone').PolySynth | null>(null);
  const bassSynthRef = useRef<import('tone').MonoSynth | null>(null);
  const padSynthRef = useRef<import('tone').PolySynth | null>(null);
  const percSynthRef = useRef<import('tone').NoiseSynth | null>(null);
  const harmonySynthRef = useRef<import('tone').PolySynth | null>(null);

  // Effects references
  const reverbRef = useRef<import('tone').Reverb | null>(null);
  const delayRef = useRef<import('tone').FeedbackDelay | null>(null);
  const compressorRef = useRef<import('tone').Compressor | null>(null);
  const limiterRef = useRef<import('tone').Limiter | null>(null);

  // Analyser references for visualization
  const waveformAnalyserRef = useRef<import('tone').Analyser | null>(null);
  const fftAnalyserRef = useRef<import('tone').Analyser | null>(null);

  // State tracking
  const tickTimestampsRef = useRef<number[]>([]);
  const lastBassUpdateRef = useRef(0);
  const lastPadUpdateRef = useRef(0);
  const lastHarmonyUpdateRef = useRef(0);
  const lastDirectionRef = useRef<'up' | 'down' | 'neutral'>('neutral');
  const currentBassNoteRef = useRef<string | null>(null);
  const currentPadNotesRef = useRef<string[]>([]);
  const currentHarmonyNotesRef = useRef<string[]>([]);
  const activeVoicesRef = useRef(0);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved preferences
  useEffect(() => {
    try {
      const savedVolume = localStorage.getItem('btc-melodic-volume');
      const savedMuted = localStorage.getItem('btc-melodic-muted');
      const savedMode = localStorage.getItem('btc-melodic-mode');
      const savedScale = localStorage.getItem('btc-melodic-scale');
      const savedLayers = localStorage.getItem('btc-melodic-layers');
      const savedPack = localStorage.getItem('btc-melodic-pack');
      const savedVisualizer = localStorage.getItem('btc-visualizer-mode');

      setAudioState(prev => ({
        ...prev,
        volume: savedVolume !== null ? parseFloat(savedVolume) : prev.volume,
        muted: savedMuted === 'true',
        soundMode: (savedMode as SoundMode) || prev.soundMode,
        scale: (savedScale as ScaleType) || prev.scale,
        layerVolumes: savedLayers ? JSON.parse(savedLayers) : prev.layerVolumes,
      }));

      if (savedPack) setCurrentSoundPack(savedPack as SoundPackType);
      if (savedVisualizer) setVisualizerModeState(savedVisualizer as VisualizationMode);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Save preferences
  useEffect(() => {
    try {
      localStorage.setItem('btc-melodic-volume', audioState.volume.toString());
      localStorage.setItem('btc-melodic-muted', audioState.muted.toString());
      localStorage.setItem('btc-melodic-mode', audioState.soundMode);
      localStorage.setItem('btc-melodic-scale', audioState.scale);
      localStorage.setItem('btc-melodic-layers', JSON.stringify(audioState.layerVolumes));
      localStorage.setItem('btc-melodic-pack', currentSoundPack);
      localStorage.setItem('btc-visualizer-mode', visualizerMode);
    } catch {
      // Ignore localStorage errors
    }
  }, [audioState, currentSoundPack, visualizerMode]);

  // Update tick stats periodically
  useEffect(() => {
    if (isReady) {
      statsIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const oneSecondAgo = now - 1000;
        const recentTicks = tickTimestampsRef.current.filter(t => t > oneSecondAgo);
        setTicksPerSecond(recentTicks.length);

        // Clean up old timestamps
        tickTimestampsRef.current = recentTicks;

        // Update pattern detection
        const pattern = detectPattern();
        setCurrentPattern(pattern.type);
        setHarmonyDescription(getHarmonyDescription());
      }, 250);
    }

    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
  }, [isReady]);

  // Create synths with sound pack configuration
  const createSynths = useCallback(async (
    Tone: typeof import('tone'),
    packType: SoundPackType,
    reverb: import('tone').Reverb,
    delay: import('tone').FeedbackDelay,
    compressor: import('tone').Compressor
  ) => {
    const pack = getSoundPack(packType);

    // Create tick synth based on pack configuration
    let tickSynth: import('tone').PolySynth;
    if (pack.tick.oscillatorType.startsWith('fm')) {
      tickSynth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: pack.tick.harmonicity || 2,
        modulationIndex: pack.tick.modulationIndex || 3,
        envelope: pack.tick.envelope,
        modulation: { type: 'sine' },
        modulationEnvelope: {
          attack: 0.01,
          decay: 0.1,
          sustain: 0.2,
          release: 0.1,
        },
      });
    } else {
      tickSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: pack.tick.oscillatorType as OscillatorType },
        envelope: pack.tick.envelope,
      });
    }
    tickSynth.maxPolyphony = AUDIO_CONFIG.MAX_VOICES;
    tickSynth.connect(delay);

    // Create bass synth
    const bassSynth = new Tone.MonoSynth({
      oscillator: { type: pack.bass.oscillatorType as OscillatorType },
      envelope: pack.bass.envelope,
      filterEnvelope: {
        attack: 0.2,
        decay: 0.3,
        sustain: 0.5,
        release: 0.5,
        baseFrequency: 100,
        octaves: 1,
      },
    });
    bassSynth.portamento = BASS_LAYER_CONFIG.portamento;
    bassSynth.connect(reverb);

    // Create pad synth
    let padSynth: import('tone').PolySynth;
    if (pack.pad.oscillatorType.startsWith('fm')) {
      padSynth = new Tone.PolySynth(Tone.FMSynth, {
        envelope: pack.pad.envelope,
        harmonicity: 1,
        modulationIndex: 2,
      });
    } else {
      padSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: pack.pad.oscillatorType as OscillatorType },
        envelope: pack.pad.envelope,
      });
    }
    padSynth.maxPolyphony = 8;
    padSynth.connect(reverb);

    // Create percussion synth (noise-based)
    const percSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: {
        attack: 0.001,
        decay: 0.05,
        sustain: 0,
        release: 0.03,
      },
    });
    percSynth.connect(compressor);

    // Create harmony synth for AI harmonies (softer pad-like)
    const harmonySynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.5,
        decay: 0.3,
        sustain: 0.6,
        release: 1.5,
      },
    });
    harmonySynth.maxPolyphony = 8;
    harmonySynth.connect(reverb);

    return { tickSynth, bassSynth, padSynth, percSynth, harmonySynth };
  }, []);

  const enableAudio = useCallback(async () => {
    try {
      // Dynamically import Tone.js
      const Tone = await import('tone');
      toneRef.current = Tone;

      // Start audio context
      await Tone.start();

      // Create limiter first (end of chain, connects to destination)
      const limiter = new Tone.Limiter(EFFECTS_CONFIG.limiter.threshold).toDestination();
      limiterRef.current = limiter;

      // Create analysers and connect to limiter
      const waveformAnalyser = new Tone.Analyser('waveform', 256);
      const fftAnalyser = new Tone.Analyser('fft', 256);
      waveformAnalyserRef.current = waveformAnalyser;
      fftAnalyserRef.current = fftAnalyser;

      // Connect limiter to analysers (analysers auto-connect to destination)
      limiter.connect(waveformAnalyser);
      limiter.connect(fftAnalyser);

      const compressor = new Tone.Compressor({
        threshold: EFFECTS_CONFIG.compressor.threshold,
        ratio: EFFECTS_CONFIG.compressor.ratio,
        attack: EFFECTS_CONFIG.compressor.attack,
        release: EFFECTS_CONFIG.compressor.release,
      }).connect(limiter);
      compressorRef.current = compressor;

      const reverb = new Tone.Reverb({
        decay: EFFECTS_CONFIG.reverb.decay,
        wet: EFFECTS_CONFIG.reverb.wet,
        preDelay: EFFECTS_CONFIG.reverb.preDelay,
      }).connect(compressor);
      await reverb.generate();
      reverbRef.current = reverb;

      const delay = new Tone.FeedbackDelay({
        delayTime: EFFECTS_CONFIG.delay.delayTime,
        feedback: EFFECTS_CONFIG.delay.feedback,
        wet: EFFECTS_CONFIG.delay.wet,
      }).connect(reverb);
      delayRef.current = delay;

      // Create synths with current sound pack
      const synths = await createSynths(Tone, currentSoundPack, reverb, delay, compressor);
      tickSynthRef.current = synths.tickSynth;
      bassSynthRef.current = synths.bassSynth;
      padSynthRef.current = synths.padSynth;
      percSynthRef.current = synths.percSynth;
      harmonySynthRef.current = synths.harmonySynth;

      // Set initial volumes
      updateAllVolumes(
        audioState.volume,
        audioState.layerVolumes,
        audioState.muted
      );

      setAudioState(prev => ({ ...prev, enabled: true }));
      setIsReady(true);
    } catch (error) {
      console.error('Failed to initialize melodic audio engine:', error);
    }
  }, [audioState.volume, audioState.layerVolumes, audioState.muted, currentSoundPack, createSynths]);

  const updateAllVolumes = useCallback((
    masterVolume: number,
    layers: LayerVolumes,
    muted: boolean
  ) => {
    if (muted) {
      if (tickSynthRef.current) tickSynthRef.current.volume.value = -Infinity;
      if (bassSynthRef.current) bassSynthRef.current.volume.value = -Infinity;
      if (padSynthRef.current) padSynthRef.current.volume.value = -Infinity;
      if (percSynthRef.current) percSynthRef.current.volume.value = -Infinity;
      if (harmonySynthRef.current) harmonySynthRef.current.volume.value = -Infinity;
      return;
    }

    const tickDb = calculateFinalVolume(masterVolume, layers.tick);
    const bassDb = calculateFinalVolume(masterVolume, layers.bass);
    const padDb = calculateFinalVolume(masterVolume, layers.pad);
    const percDb = calculateFinalVolume(masterVolume, layers.percussion);
    const harmonyDb = calculateFinalVolume(masterVolume, layers.pad * 0.7); // Harmony is softer

    if (tickSynthRef.current) tickSynthRef.current.volume.value = tickDb;
    if (bassSynthRef.current) bassSynthRef.current.volume.value = bassDb;
    if (padSynthRef.current) padSynthRef.current.volume.value = padDb;
    if (percSynthRef.current) percSynthRef.current.volume.value = percDb;
    if (harmonySynthRef.current) harmonySynthRef.current.volume.value = harmonyDb;
  }, []);

  const disableAudio = useCallback(() => {
    // Release all playing notes
    if (currentBassNoteRef.current && bassSynthRef.current) {
      bassSynthRef.current.triggerRelease();
    }
    if (currentPadNotesRef.current.length > 0 && padSynthRef.current) {
      padSynthRef.current.releaseAll();
    }
    if (currentHarmonyNotesRef.current.length > 0 && harmonySynthRef.current) {
      harmonySynthRef.current.releaseAll();
    }

    // Dispose synths
    tickSynthRef.current?.dispose();
    bassSynthRef.current?.dispose();
    padSynthRef.current?.dispose();
    percSynthRef.current?.dispose();
    harmonySynthRef.current?.dispose();

    // Dispose effects
    reverbRef.current?.dispose();
    delayRef.current?.dispose();
    compressorRef.current?.dispose();
    limiterRef.current?.dispose();

    // Dispose analysers
    waveformAnalyserRef.current?.dispose();
    fftAnalyserRef.current?.dispose();

    // Clear references
    tickSynthRef.current = null;
    bassSynthRef.current = null;
    padSynthRef.current = null;
    percSynthRef.current = null;
    harmonySynthRef.current = null;
    reverbRef.current = null;
    delayRef.current = null;
    compressorRef.current = null;
    limiterRef.current = null;
    waveformAnalyserRef.current = null;
    fftAnalyserRef.current = null;
    currentBassNoteRef.current = null;
    currentPadNotesRef.current = [];
    currentHarmonyNotesRef.current = [];
    tickTimestampsRef.current = [];

    setAudioState(prev => ({ ...prev, enabled: false }));
    setIsReady(false);
  }, []);

  // Switch sound pack
  const setSoundPack = useCallback(async (pack: SoundPackType) => {
    setCurrentSoundPack(pack);

    if (!isReady || !toneRef.current) return;

    const Tone = toneRef.current;

    // Release all playing notes
    if (currentBassNoteRef.current && bassSynthRef.current) {
      bassSynthRef.current.triggerRelease();
      currentBassNoteRef.current = null;
    }
    if (currentPadNotesRef.current.length > 0 && padSynthRef.current) {
      padSynthRef.current.releaseAll();
      currentPadNotesRef.current = [];
    }
    if (currentHarmonyNotesRef.current.length > 0 && harmonySynthRef.current) {
      harmonySynthRef.current.releaseAll();
      currentHarmonyNotesRef.current = [];
    }

    // Dispose old synths
    tickSynthRef.current?.dispose();
    bassSynthRef.current?.dispose();
    padSynthRef.current?.dispose();
    percSynthRef.current?.dispose();
    harmonySynthRef.current?.dispose();

    // Create new synths with new pack
    if (reverbRef.current && delayRef.current && compressorRef.current) {
      const synths = await createSynths(
        Tone,
        pack,
        reverbRef.current,
        delayRef.current,
        compressorRef.current
      );
      tickSynthRef.current = synths.tickSynth;
      bassSynthRef.current = synths.bassSynth;
      padSynthRef.current = synths.padSynth;
      percSynthRef.current = synths.percSynth;
      harmonySynthRef.current = synths.harmonySynth;

      // Restore volumes
      updateAllVolumes(audioState.volume, audioState.layerVolumes, audioState.muted);
    }
  }, [isReady, createSynths, audioState.volume, audioState.layerVolumes, audioState.muted, updateAllVolumes]);

  const setMasterVolume = useCallback((volume: number) => {
    setAudioState(prev => {
      const newState = { ...prev, volume };
      updateAllVolumes(volume, prev.layerVolumes, prev.muted);
      return newState;
    });
  }, [updateAllVolumes]);

  const setLayerVolume = useCallback((layer: keyof LayerVolumes, volume: number) => {
    setAudioState(prev => {
      const newLayers = { ...prev.layerVolumes, [layer]: volume };
      const newState = { ...prev, layerVolumes: newLayers };
      updateAllVolumes(prev.volume, newLayers, prev.muted);
      return newState;
    });
  }, [updateAllVolumes]);

  const setSoundMode = useCallback((mode: SoundMode) => {
    const newLayers = getLayerVolumes(mode);
    setAudioState(prev => {
      const newState = { ...prev, soundMode: mode, layerVolumes: newLayers };
      updateAllVolumes(prev.volume, newLayers, prev.muted);
      return newState;
    });
  }, [updateAllVolumes]);

  const setScale = useCallback((scale: ScaleType) => {
    setAudioState(prev => ({ ...prev, scale }));
  }, []);

  const toggleMute = useCallback(() => {
    setAudioState(prev => {
      const newMuted = !prev.muted;
      updateAllVolumes(prev.volume, prev.layerVolumes, newMuted);
      return { ...prev, muted: newMuted };
    });
  }, [updateAllVolumes]);

  const setVisualizerMode = useCallback((mode: VisualizationMode) => {
    setVisualizerModeState(mode);
  }, []);

  // Get waveform data for visualization
  const getWaveformData = useCallback((): Float32Array | null => {
    if (!waveformAnalyserRef.current) return null;
    const values = waveformAnalyserRef.current.getValue();
    if (values instanceof Float32Array) return values;
    // Handle array of Float32Array (shouldn't happen with our config but TypeScript wants it)
    if (Array.isArray(values) && values.length > 0) {
      return values[0] instanceof Float32Array ? values[0] : new Float32Array(values.flat() as unknown as number[]);
    }
    return null;
  }, []);

  // Get frequency data for visualization
  const getFrequencyData = useCallback((): Float32Array | null => {
    if (!fftAnalyserRef.current) return null;
    const values = fftAnalyserRef.current.getValue();
    if (values instanceof Float32Array) return values;
    // Handle array of Float32Array (shouldn't happen with our config but TypeScript wants it)
    if (Array.isArray(values) && values.length > 0) {
      return values[0] instanceof Float32Array ? values[0] : new Float32Array(values.flat() as unknown as number[]);
    }
    return null;
  }, []);

  const playTick = useCallback((price: number, change: PriceChange) => {
    if (!isReady || audioState.muted || !audioState.enabled) {
      return;
    }

    const now = Date.now();
    const Tone = toneRef.current;
    if (!Tone) return;

    // Update tracking
    tickTimestampsRef.current.push(now);
    updatePriceTracker(price);
    addToPattern(price, change.direction);
    addPriceToWindow(price, change);

    // Calculate current tick rate and ducking
    const recentTicks = tickTimestampsRef.current.filter(t => t > now - 1000);
    const tickRate = recentTicks.length;
    const duckMultiplier = getAutoDuckMultiplier(tickRate);
    const noteDuration = getNoteDuration(tickRate);

    // Get note from price
    const midiNote = priceToMidi(price, audioState.scale);
    const noteName = midiToNoteName(midiNote);

    // Play tick note
    if (tickSynthRef.current && audioState.layerVolumes.tick > 0) {
      // Voice stealing check
      if (activeVoicesRef.current >= AUDIO_CONFIG.VOICE_STEAL_THRESHOLD) {
        tickSynthRef.current.releaseAll();
        activeVoicesRef.current = 0;
      }

      // Calculate velocity from magnitude
      const velocity = TICK_LAYER_CONFIG.minVelocity +
        change.magnitude * (TICK_LAYER_CONFIG.maxVelocity - TICK_LAYER_CONFIG.minVelocity);

      // Apply ducking to tick volume
      const duckedVolume = calculateFinalVolume(
        audioState.volume,
        audioState.layerVolumes.tick,
        duckMultiplier
      );
      tickSynthRef.current.volume.value = duckedVolume;

      // Play the note
      tickSynthRef.current.triggerAttackRelease(noteName, noteDuration, undefined, velocity);
      activeVoicesRef.current++;

      // Track voice release
      setTimeout(() => {
        activeVoicesRef.current = Math.max(0, activeVoicesRef.current - 1);
      }, noteDuration * 1000 + 100);
    }

    // Update bass drone (every 500ms)
    if (now - lastBassUpdateRef.current > BASS_LAYER_CONFIG.updateInterval) {
      lastBassUpdateRef.current = now;

      if (bassSynthRef.current && audioState.layerVolumes.bass > 0) {
        const bassMidi = getBassNote(price, audioState.scale);
        const bassNoteName = midiToNoteName(bassMidi);

        // Glide to new note if already playing
        if (currentBassNoteRef.current) {
          bassSynthRef.current.setNote(bassNoteName);
        } else {
          bassSynthRef.current.triggerAttack(bassNoteName);
        }
        currentBassNoteRef.current = bassNoteName;
      }
    }

    // Update ambient pad (every 2000ms)
    if (now - lastPadUpdateRef.current > PAD_LAYER_CONFIG.updateInterval) {
      lastPadUpdateRef.current = now;

      if (padSynthRef.current && audioState.layerVolumes.pad > 0) {
        // Release previous chord
        if (currentPadNotesRef.current.length > 0) {
          padSynthRef.current.triggerRelease(currentPadNotesRef.current);
        }

        // Get chord based on trend
        const chordType = getTrendChordType(change.percentChange);
        const rootMidi = priceToMidi(price, audioState.scale) - 12; // One octave below tick
        const chordMidiNotes = getPadChordNotes(rootMidi, chordType);
        const chordNames = chordMidiNotes.map(m => midiToNoteName(m));

        padSynthRef.current.triggerAttack(chordNames, undefined, 0.3);
        currentPadNotesRef.current = chordNames;
      }
    }

    // Update AI harmony layer (every 3000ms based on pattern)
    if (now - lastHarmonyUpdateRef.current > 3000) {
      lastHarmonyUpdateRef.current = now;

      const pattern = detectPattern();

      // Only play harmony for non-neutral patterns
      if (pattern.type !== 'neutral' && harmonySynthRef.current && audioState.layerVolumes.pad > 0) {
        // Release previous harmony
        if (currentHarmonyNotesRef.current.length > 0) {
          harmonySynthRef.current.triggerRelease(currentHarmonyNotesRef.current);
        }

        // Get harmony based on pattern
        const harmonyResponse = generateHarmonyResponse(pattern, midiNote - 12);
        const harmonyNames = harmonyResponse.chordNotes.map(m => midiToNoteName(m));

        // Play with intensity-based velocity
        const harmonyVelocity = 0.2 + harmonyResponse.intensity * 0.3;
        harmonySynthRef.current.triggerAttack(harmonyNames, undefined, harmonyVelocity);
        currentHarmonyNotesRef.current = harmonyNames;
      }
    }

    // Play percussion on direction change
    if (shouldPlayPercussion(change.direction, lastDirectionRef.current)) {
      if (percSynthRef.current && audioState.layerVolumes.percussion > 0) {
        percSynthRef.current.triggerAttackRelease('16n', undefined, 0.5);
      }
    }

    lastDirectionRef.current = change.direction;
  }, [isReady, audioState]);

  return {
    audioState,
    isReady,
    ticksPerSecond,
    currentSoundPack,
    currentPattern,
    harmonyDescription,
    enableAudio,
    disableAudio,
    setMasterVolume,
    setLayerVolume,
    setSoundMode,
    setScale,
    setSoundPack,
    toggleMute,
    playTick,
    getWaveformData,
    getFrequencyData,
    visualizerMode,
    setVisualizerMode,
  };
}
