'use client';

import { useCallback, useRef, useState, useEffect } from 'react';

interface BellAudioState {
  enabled: boolean;
  volume: number;
  muted: boolean;
}

interface UseBellAudioReturn {
  audioState: BellAudioState;
  isReady: boolean;
  enableAudio: () => Promise<void>;
  disableAudio: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  playBell: (direction: 'up' | 'down' | 'neutral') => void;
  getWaveformData: () => Float32Array | null;
  getFrequencyData: () => Float32Array | null;
}

// Bell frequencies for different states
// UP: Bright, ascending, casino-like winning sound
// DOWN: Deep, sad, somber sound
// NEUTRAL: Middle tone
const BELL_CONFIG = {
  up: {
    baseFreq: 880,      // A5 - bright and high
    harmonicity: 5,     // More metallic harmonics
    modulationIndex: 4,
    attack: 0.001,
    decay: 0.3,
    release: 0.8,
  },
  down: {
    baseFreq: 220,      // A3 - deep and low
    harmonicity: 2,
    modulationIndex: 2,
    attack: 0.01,
    decay: 0.5,
    release: 1.2,
  },
  neutral: {
    baseFreq: 440,      // A4 - middle
    harmonicity: 3,
    modulationIndex: 3,
    attack: 0.005,
    decay: 0.4,
    release: 1.0,
  },
};

const DEFAULT_STATE: BellAudioState = {
  enabled: false,
  volume: 0.7,
  muted: false,
};

export function useBellAudio(): UseBellAudioReturn {
  const [audioState, setAudioState] = useState<BellAudioState>(DEFAULT_STATE);
  const [isReady, setIsReady] = useState(false);

  // Tone.js references
  const toneRef = useRef<typeof import('tone') | null>(null);
  const bellSynthRef = useRef<import('tone').Synth | null>(null);
  const reverbRef = useRef<import('tone').Reverb | null>(null);
  const limiterRef = useRef<import('tone').Limiter | null>(null);
  const waveformAnalyserRef = useRef<import('tone').Analyser | null>(null);
  const fftAnalyserRef = useRef<import('tone').Analyser | null>(null);

  // Load saved preferences
  useEffect(() => {
    try {
      const savedVolume = localStorage.getItem('btc-bell-volume');
      const savedMuted = localStorage.getItem('btc-bell-muted');

      setAudioState(prev => ({
        ...prev,
        volume: savedVolume !== null ? parseFloat(savedVolume) : prev.volume,
        muted: savedMuted === 'true',
      }));
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Save preferences
  useEffect(() => {
    try {
      localStorage.setItem('btc-bell-volume', audioState.volume.toString());
      localStorage.setItem('btc-bell-muted', audioState.muted.toString());
    } catch {
      // Ignore localStorage errors
    }
  }, [audioState.volume, audioState.muted]);

  const enableAudio = useCallback(async () => {
    try {
      const Tone = await import('tone');
      toneRef.current = Tone;

      await Tone.start();

      // Create limiter (end of chain)
      const limiter = new Tone.Limiter(-3).toDestination();
      limiterRef.current = limiter;

      // Create analysers for visualization
      const waveformAnalyser = new Tone.Analyser('waveform', 256);
      const fftAnalyser = new Tone.Analyser('fft', 256);
      waveformAnalyserRef.current = waveformAnalyser;
      fftAnalyserRef.current = fftAnalyser;
      limiter.connect(waveformAnalyser);
      limiter.connect(fftAnalyser);

      // Create reverb for bell-like decay
      const reverb = new Tone.Reverb({
        decay: 2.5,
        wet: 0.4,
        preDelay: 0.01,
      }).connect(limiter);
      await reverb.generate();
      reverbRef.current = reverb;

      // Create FM synth for bell tones
      const bellSynth = new Tone.Synth({
        oscillator: {
          type: 'fmsine',
          modulationType: 'sine',
          modulationIndex: 3,
          harmonicity: 3,
        } as import('tone').OmniOscillatorOptions,
        envelope: {
          attack: 0.005,
          decay: 0.4,
          sustain: 0,
          release: 1.0,
        },
      }).connect(reverb);
      bellSynthRef.current = bellSynth;

      // Set initial volume
      updateVolume(audioState.volume, audioState.muted);

      setAudioState(prev => ({ ...prev, enabled: true }));
      setIsReady(true);
    } catch (error) {
      console.error('Failed to initialize bell audio:', error);
    }
  }, [audioState.volume, audioState.muted]);

  const updateVolume = useCallback((volume: number, muted: boolean) => {
    if (!bellSynthRef.current) return;

    if (muted) {
      bellSynthRef.current.volume.value = -Infinity;
    } else {
      // Convert linear 0-1 to dB (-40 to 0)
      const db = volume > 0 ? -40 + (volume * 40) : -Infinity;
      bellSynthRef.current.volume.value = db;
    }
  }, []);

  const disableAudio = useCallback(() => {
    bellSynthRef.current?.dispose();
    reverbRef.current?.dispose();
    limiterRef.current?.dispose();
    waveformAnalyserRef.current?.dispose();
    fftAnalyserRef.current?.dispose();

    bellSynthRef.current = null;
    reverbRef.current = null;
    limiterRef.current = null;
    waveformAnalyserRef.current = null;
    fftAnalyserRef.current = null;

    setAudioState(prev => ({ ...prev, enabled: false }));
    setIsReady(false);
  }, []);

  const setVolume = useCallback((volume: number) => {
    setAudioState(prev => {
      updateVolume(volume, prev.muted);
      return { ...prev, volume };
    });
  }, [updateVolume]);

  const toggleMute = useCallback(() => {
    setAudioState(prev => {
      const newMuted = !prev.muted;
      updateVolume(prev.volume, newMuted);
      return { ...prev, muted: newMuted };
    });
  }, [updateVolume]);

  const playBell = useCallback((direction: 'up' | 'down' | 'neutral') => {
    if (!isReady || audioState.muted || !audioState.enabled || !bellSynthRef.current) {
      return;
    }

    const config = BELL_CONFIG[direction];
    const synth = bellSynthRef.current;

    // Update envelope for this bell type
    synth.envelope.attack = config.attack;
    synth.envelope.decay = config.decay;
    synth.envelope.release = config.release;

    // Play the bell
    // For "up" direction, play ascending arpeggio (casino-like)
    // For "down" direction, play single deep tone
    // For "neutral" direction, play single middle tone

    if (direction === 'up') {
      // Casino winning sound: quick ascending notes
      const now = toneRef.current?.now() || 0;
      synth.triggerAttackRelease(config.baseFreq * 0.75, '16n', now);
      synth.triggerAttackRelease(config.baseFreq, '16n', now + 0.08);
      synth.triggerAttackRelease(config.baseFreq * 1.25, '8n', now + 0.16);
    } else if (direction === 'down') {
      // Sad descending sound
      const now = toneRef.current?.now() || 0;
      synth.triggerAttackRelease(config.baseFreq * 1.5, '16n', now);
      synth.triggerAttackRelease(config.baseFreq, '4n', now + 0.1);
    } else {
      // Neutral: single tone
      synth.triggerAttackRelease(config.baseFreq, '8n');
    }
  }, [isReady, audioState.muted, audioState.enabled]);

  const getWaveformData = useCallback((): Float32Array | null => {
    if (!waveformAnalyserRef.current) return null;
    const values = waveformAnalyserRef.current.getValue();
    if (values instanceof Float32Array) return values;
    if (Array.isArray(values) && values.length > 0 && values[0] instanceof Float32Array) {
      return values[0];
    }
    return null;
  }, []);

  const getFrequencyData = useCallback((): Float32Array | null => {
    if (!fftAnalyserRef.current) return null;
    const values = fftAnalyserRef.current.getValue();
    if (values instanceof Float32Array) return values;
    if (Array.isArray(values) && values.length > 0 && values[0] instanceof Float32Array) {
      return values[0];
    }
    return null;
  }, []);

  return {
    audioState,
    isReady,
    enableAudio,
    disableAudio,
    setVolume,
    toggleMute,
    playBell,
    getWaveformData,
    getFrequencyData,
  };
}
