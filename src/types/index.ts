export interface AudioFeatures {
  connected: boolean;
  timestamp?: number;
  error?: string;
  features?: {
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
    bassToTrebleRatio: string;
    brightness: string;
    // Advanced features
    spectralRolloff?: number;
    spectralFlux?: number;
    zeroCrossingRate?: number;
    mfcc?: number[];
    tempo?: number;
    key?: string;
  };
}

export interface Pattern {
  name: string;
  content: string;
  tags: string[];
  timestamp: string;
  audioFeatures?: AudioFeatures;
  version?: number;
  parent?: string;
}

export interface Session {
  id: string;
  patterns: Pattern[];
  currentPattern: number;
  history: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MusicTheoryConfig {
  root: string;
  scale: string;
  chordProgression?: string[];
  tempo?: number;
}

export interface GeneratorConfig {
  style: string;
  complexity?: number;
  key?: string;
  bpm?: number;
  variations?: number;
}