'use client';

import { useCallback, useRef, useState, useEffect } from 'react';

interface BellAudioState {
  enabled: boolean;
  volume: number;
  muted: boolean;
}

interface VirtualPosition {
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  entryRsi: number;
  entryTime: number;
}

interface TradeInfo {
  inPosition: boolean;
  position: VirtualPosition | null;
  currentRsi: number;
  unrealizedPnlPercent: number;
  totalTrades: number;
  wins: number;
  losses: number;
}

interface UseBellAudioReturn {
  audioState: BellAudioState;
  isReady: boolean;
  enableAudio: () => Promise<void>;
  disableAudio: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  onPriceTick: (price: number) => void;
  getWaveformData: () => Float32Array | null;
  getFrequencyData: () => Float32Array | null;
  getTradeInfo: () => TradeInfo;
}

// RSI Strategy Parameters (matching the bot)
const RSI_PERIOD = 14;
const RSI_OVERSOLD = 20;   // Enter LONG
const RSI_OVERBOUGHT = 80; // Enter SHORT
const RSI_EXIT = 50;       // Exit at mean

// Bell frequency range
const FREQ_MIN = 150;      // Deep loss
const FREQ_CENTER = 440;   // Entry (0% PnL)
const FREQ_MAX = 1400;     // Big profit

// Max PnL% for full pitch range
const MAX_PNL_PERCENT = 1.0; // 1% = max pitch shift

const DEFAULT_STATE: BellAudioState = {
  enabled: false,
  volume: 0.7,
  muted: false,
};

// Calculate RSI from price array
function calculateRsi(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) {
    return 50.0; // Neutral if not enough data
  }

  const deltas: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    deltas.push(prices[i] - prices[i - 1]);
  }

  const recentDeltas = deltas.slice(-period);
  const gains = recentDeltas.map(d => (d > 0 ? d : 0));
  const losses = recentDeltas.map(d => (d < 0 ? -d : 0));

  const avgGain = gains.reduce((a, b) => a + b, 0) / period;
  const avgLoss = losses.reduce((a, b) => a + b, 0) / period;

  if (avgLoss === 0) return 100.0;

  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
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

  // RSI & Position tracking
  const priceHistoryRef = useRef<number[]>([]);
  const currentRsiRef = useRef<number>(50);
  const positionRef = useRef<VirtualPosition | null>(null);
  const lastPnlPercentRef = useRef<number>(0);

  // Stats
  const totalTradesRef = useRef<number>(0);
  const winsRef = useRef<number>(0);
  const lossesRef = useRef<number>(0);

  // Throttle sound to avoid too many bells
  const lastSoundTimeRef = useRef<number>(0);
  const SOUND_THROTTLE_MS = 150;

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
      // Ignore
    }
  }, []);

  // Save preferences
  useEffect(() => {
    try {
      localStorage.setItem('btc-bell-volume', audioState.volume.toString());
      localStorage.setItem('btc-bell-muted', audioState.muted.toString());
    } catch {
      // Ignore
    }
  }, [audioState.volume, audioState.muted]);

  // Map PnL% to frequency
  const pnlToFrequency = useCallback((pnlPercent: number): number => {
    // Normalize to -1 to 1
    const normalized = Math.max(-1, Math.min(1, pnlPercent / MAX_PNL_PERCENT));

    if (normalized >= 0) {
      // Profit: center to max
      return FREQ_CENTER + (FREQ_MAX - FREQ_CENTER) * Math.pow(normalized, 0.7);
    } else {
      // Loss: center to min
      return FREQ_CENTER - (FREQ_CENTER - FREQ_MIN) * Math.pow(-normalized, 0.7);
    }
  }, []);

  const enableAudio = useCallback(async () => {
    try {
      const Tone = await import('tone');
      toneRef.current = Tone;

      await Tone.start();

      const limiter = new Tone.Limiter(-3).toDestination();
      limiterRef.current = limiter;

      const waveformAnalyser = new Tone.Analyser('waveform', 256);
      const fftAnalyser = new Tone.Analyser('fft', 256);
      waveformAnalyserRef.current = waveformAnalyser;
      fftAnalyserRef.current = fftAnalyser;
      limiter.connect(waveformAnalyser);
      limiter.connect(fftAnalyser);

      const reverb = new Tone.Reverb({
        decay: 1.8,
        wet: 0.3,
        preDelay: 0.01,
      }).connect(limiter);
      await reverb.generate();
      reverbRef.current = reverb;

      const bellSynth = new Tone.Synth({
        oscillator: {
          type: 'fmsine',
          modulationType: 'sine',
          modulationIndex: 4,
          harmonicity: 3.5,
        } as import('tone').OmniOscillatorOptions,
        envelope: {
          attack: 0.001,
          decay: 0.35,
          sustain: 0,
          release: 0.6,
        },
      }).connect(reverb);
      bellSynthRef.current = bellSynth;

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

  const playBell = useCallback((pnlPercent: number) => {
    if (!isReady || audioState.muted || !audioState.enabled || !bellSynthRef.current) {
      return;
    }

    const now = Date.now();
    if (now - lastSoundTimeRef.current < SOUND_THROTTLE_MS) {
      return;
    }
    lastSoundTimeRef.current = now;

    const frequency = pnlToFrequency(pnlPercent);
    const synth = bellSynthRef.current;

    // Adjust envelope based on profit/loss
    if (pnlPercent > 0.3) {
      synth.envelope.attack = 0.001;
      synth.envelope.decay = 0.25;
    } else if (pnlPercent < -0.3) {
      synth.envelope.attack = 0.01;
      synth.envelope.decay = 0.5;
    } else {
      synth.envelope.attack = 0.005;
      synth.envelope.decay = 0.35;
    }

    synth.triggerAttackRelease(frequency, '16n');
  }, [isReady, audioState.muted, audioState.enabled, pnlToFrequency]);

  const onPriceTick = useCallback((price: number) => {
    // Add to price history
    priceHistoryRef.current.push(price);
    // Keep last 100 prices
    if (priceHistoryRef.current.length > 100) {
      priceHistoryRef.current = priceHistoryRef.current.slice(-100);
    }

    // Calculate RSI
    const rsi = calculateRsi(priceHistoryRef.current, RSI_PERIOD);
    currentRsiRef.current = rsi;

    const position = positionRef.current;

    // Check for exit first
    if (position) {
      let shouldExit = false;
      let pnlPercent = 0;

      if (position.side === 'LONG') {
        pnlPercent = ((price - position.entryPrice) / position.entryPrice) * 100;
        if (rsi >= RSI_EXIT) {
          shouldExit = true;
        }
      } else {
        pnlPercent = ((position.entryPrice - price) / position.entryPrice) * 100;
        if (rsi <= RSI_EXIT) {
          shouldExit = true;
        }
      }

      lastPnlPercentRef.current = pnlPercent;

      if (shouldExit) {
        // Close position
        totalTradesRef.current += 1;
        if (pnlPercent > 0) {
          winsRef.current += 1;
        } else {
          lossesRef.current += 1;
        }
        positionRef.current = null;
        lastPnlPercentRef.current = 0;
        // Don't play sound on exit, just stop
        return;
      }

      // In position - play bell based on PnL
      playBell(pnlPercent);
      return;
    }

    // Check for entry signals (no position)
    if (rsi <= RSI_OVERSOLD) {
      // Enter LONG
      positionRef.current = {
        side: 'LONG',
        entryPrice: price,
        entryRsi: rsi,
        entryTime: Date.now(),
      };
      lastPnlPercentRef.current = 0;
      playBell(0); // Neutral pitch on entry
    } else if (rsi >= RSI_OVERBOUGHT) {
      // Enter SHORT
      positionRef.current = {
        side: 'SHORT',
        entryPrice: price,
        entryRsi: rsi,
        entryTime: Date.now(),
      };
      lastPnlPercentRef.current = 0;
      playBell(0); // Neutral pitch on entry
    }
    // No position and no signal = no sound
  }, [playBell]);

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

  const getTradeInfo = useCallback((): TradeInfo => {
    return {
      inPosition: positionRef.current !== null,
      position: positionRef.current,
      currentRsi: currentRsiRef.current,
      unrealizedPnlPercent: lastPnlPercentRef.current,
      totalTrades: totalTradesRef.current,
      wins: winsRef.current,
      losses: lossesRef.current,
    };
  }, []);

  return {
    audioState,
    isReady,
    enableAudio,
    disableAudio,
    setVolume,
    toggleMute,
    onPriceTick,
    getWaveformData,
    getFrequencyData,
    getTradeInfo,
  };
}
