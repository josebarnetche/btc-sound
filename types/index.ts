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

export interface ConnectionState {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastUpdate: number | null;
  reconnectAttempts: number;
}

// Visualization types
export type VisualizationMode = 'waveform' | 'frequency' | 'off';
