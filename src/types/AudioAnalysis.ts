/**
 * Type definitions for advanced audio analysis
 */

export interface TempoAnalysis {
  bpm: number;
  confidence: number;
  method?: 'autocorrelation' | 'onset' | 'spectral';
}

export interface KeyAnalysis {
  key: string;
  scale: 'major' | 'minor' | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian' | 'locrian';
  confidence: number;
  alternatives?: Array<{ key: string; scale: string; confidence: number }>;
}

export interface RhythmAnalysis {
  pattern: string;
  complexity: number; // 0-1 scale
  density: number; // events per second
  syncopation: number; // 0-1 scale
  onsets: number[];
  isRegular: boolean;
}

export interface AdvancedAudioAnalysis {
  tempo?: TempoAnalysis;
  key?: KeyAnalysis;
  rhythm?: RhythmAnalysis;
  timestamp: number;
}

/**
 * Basic audio analysis features from frequency spectrum
 */
export interface AudioAnalysisFeatures {
  average: number;
  peak: number;
  peakFrequency: number;
  centroid: number;
  bass: number;
  lowMid: number;
  mid: number;
  highMid: number;
  treble: number;
  isPlaying: boolean;
  isSilent: boolean;
  bassToTrebleRatio: number | string;
  brightness: 'bright' | 'balanced' | 'dark';
}

/**
 * Audio analysis result with connection status
 */
export interface AudioAnalysisResult {
  connected: boolean;
  timestamp?: number;
  features?: AudioAnalysisFeatures;
  error?: string;
}

/**
 * Pattern statistics
 */
export interface PatternStats {
  lines: number;
  chars: number;
  sounds: number;
  notes: number;
  effects: number;
  functions: number;
}

/**
 * Error statistics by operation
 */
export interface ErrorStats {
  count: number;
  lastError: Date | null;
}

/**
 * Browser diagnostics information
 */
export interface BrowserDiagnostics {
  browserConnected: boolean;
  pageLoaded: boolean;
  editorReady: boolean;
  audioConnected: boolean;
  cacheStatus: {
    hasCache: boolean;
    cacheAge: number;
  };
  errorStats: Record<string, ErrorStats>;
}
