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
