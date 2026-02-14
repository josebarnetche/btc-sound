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
  playBell: (price: number) => void;
  getWaveformData: () => Float32Array | null;
  getFrequencyData: () => Float32Array | null;
  getVwapInfo: () => { vwap: number; deviation: number } | null;
}

// Bell frequency range (Hz)
// Low pitch (far below VWAP) to high pitch (far above VWAP)
const FREQ_MIN = 150;   // Deep low bell
const FREQ_MAX = 1400;  // Bright high bell
const FREQ_CENTER = 440; // A4 - neutral center

// VWAP window settings
const VWAP_WINDOW_MS = 60000; // 1 minute rolling window
const MAX_DEVIATION_PERCENT = 0.5; // 0.5% deviation = max pitch shift

const DEFAULT_STATE: BellAudioState = {
  enabled: false,
  volume: 0.7,
  muted: false,
};

// Price tracking for VWAP calculation
interface PriceEntry {
  price: number;
  volume: number;
  timestamp: number;
}

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

  // VWAP tracking
  const priceHistoryRef = useRef<PriceEntry[]>([]);
  const currentVwapRef = useRef<number | null>(null);
  const lastDeviationRef = useRef<number>(0);

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

  // Calculate VWAP from price history
  const calculateVwap = useCallback(() => {
    const now = Date.now();
    const cutoff = now - VWAP_WINDOW_MS;

    // Clean old entries
    priceHistoryRef.current = priceHistoryRef.current.filter(e => e.timestamp > cutoff);

    if (priceHistoryRef.current.length === 0) {
      return null;
    }

    // Calculate VWAP: sum(price * volume) / sum(volume)
    let sumPV = 0;
    let sumV = 0;

    for (const entry of priceHistoryRef.current) {
      sumPV += entry.price * entry.volume;
      sumV += entry.volume;
    }

    return sumV > 0 ? sumPV / sumV : null;
  }, []);

  // Map deviation to frequency
  // deviation: -1 to 1 (normalized), where -1 = far below VWAP, 1 = far above VWAP
  const deviationToFrequency = useCallback((deviation: number): number => {
    // Clamp deviation to -1 to 1
    const clampedDev = Math.max(-1, Math.min(1, deviation));

    if (clampedDev >= 0) {
      // Above VWAP: center to max frequency (exponential for more dramatic highs)
      const t = clampedDev;
      return FREQ_CENTER + (FREQ_MAX - FREQ_CENTER) * Math.pow(t, 0.7);
    } else {
      // Below VWAP: center to min frequency (exponential for more dramatic lows)
      const t = -clampedDev;
      return FREQ_CENTER - (FREQ_CENTER - FREQ_MIN) * Math.pow(t, 0.7);
    }
  }, []);

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
        decay: 2.0,
        wet: 0.35,
        preDelay: 0.01,
      }).connect(limiter);
      await reverb.generate();
      reverbRef.current = reverb;

      // Create FM synth for bell tones
      const bellSynth = new Tone.Synth({
        oscillator: {
          type: 'fmsine',
          modulationType: 'sine',
          modulationIndex: 4,
          harmonicity: 3.5,
        } as import('tone').OmniOscillatorOptions,
        envelope: {
          attack: 0.001,
          decay: 0.4,
          sustain: 0,
          release: 0.8,
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

    // Reset VWAP tracking
    priceHistoryRef.current = [];
    currentVwapRef.current = null;

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

  const playBell = useCallback((price: number) => {
    if (!isReady || audioState.muted || !audioState.enabled || !bellSynthRef.current) {
      return;
    }

    const now = Date.now();

    // Add price to history (using 1 as volume since we don't have real volume data)
    priceHistoryRef.current.push({
      price,
      volume: 1,
      timestamp: now,
    });

    // Calculate VWAP
    const vwap = calculateVwap();
    currentVwapRef.current = vwap;

    // If we don't have enough data yet, use a neutral tone
    if (vwap === null) {
      bellSynthRef.current.triggerAttackRelease(FREQ_CENTER, '8n');
      return;
    }

    // Calculate deviation as percentage from VWAP
    const deviationPercent = ((price - vwap) / vwap) * 100;

    // Normalize deviation to -1 to 1 range
    const normalizedDeviation = deviationPercent / MAX_DEVIATION_PERCENT;
    lastDeviationRef.current = normalizedDeviation;

    // Get frequency based on deviation
    const frequency = deviationToFrequency(normalizedDeviation);

    // Adjust envelope based on deviation intensity
    // More extreme = longer decay for dramatic effect
    const intensity = Math.abs(normalizedDeviation);
    const synth = bellSynthRef.current;

    // Higher pitches get shorter, brighter attack; lower pitches get longer, softer attack
    if (normalizedDeviation > 0.3) {
      // High/winning sound - quick bright attack
      synth.envelope.attack = 0.001;
      synth.envelope.decay = 0.3 + intensity * 0.2;
    } else if (normalizedDeviation < -0.3) {
      // Low/sad sound - slightly slower attack, longer decay
      synth.envelope.attack = 0.01;
      synth.envelope.decay = 0.5 + intensity * 0.3;
    } else {
      // Neutral
      synth.envelope.attack = 0.005;
      synth.envelope.decay = 0.4;
    }

    // Play the bell at calculated frequency
    bellSynthRef.current.triggerAttackRelease(frequency, '8n');
  }, [isReady, audioState.muted, audioState.enabled, calculateVwap, deviationToFrequency]);

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

  const getVwapInfo = useCallback(() => {
    if (currentVwapRef.current === null) return null;
    return {
      vwap: currentVwapRef.current,
      deviation: lastDeviationRef.current,
    };
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
    getVwapInfo,
  };
}
