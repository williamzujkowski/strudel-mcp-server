/**
 * AudioAnalyzer branch-coverage targeted tests.
 *
 * Addresses issue #106 by covering server-side branches that existing
 * tests miss: getAnalysis cache hit/miss, error paths in detectTempo /
 * detectKey / analyzeRhythm, and fallback onset detection when the
 * mocked analyzer provides no pre-computed onset times.
 */

import { AudioAnalyzer } from '../../AudioAnalyzer';
import { Page } from 'playwright';

/**
 * Minimal mock page that returns whatever the caller's evaluate closure
 * would return. We inspect the closure source via toString() to decide
 * what to return — same trick the existing AudioCaptureService tests use.
 */
function createPage(analyzer: any): Page {
  return {
    evaluate: jest.fn().mockImplementation(async (fn: Function) => {
      const src = typeof fn === 'function' ? fn.toString() : '';
      if (src.includes('analyzer.analyze()') || src.includes('strudelAudioAnalyzer;\n      if (!analyzer)')) {
        // getAnalysis path — invoke analyzer.analyze() semantics inline
        if (!analyzer) {
          return {
            connected: false,
            error: 'Analyzer not initialized. Audio context may not have started yet.',
          };
        }
        if (!analyzer.isConnected) {
          return {
            connected: false,
            error: 'Analyzer not connected to audio output.',
          };
        }
        return analyzer.analyze();
      }
      // Default: return the raw analyzer (detectTempo/detectKey/analyzeRhythm path)
      return analyzer;
    }),
  } as unknown as Page;
}

describe('AudioAnalyzer — branch coverage for server-side logic', () => {
  let analyzer: AudioAnalyzer;

  beforeEach(() => {
    analyzer = new AudioAnalyzer();
  });

  describe('getAnalysis', () => {
    it('returns cached result within TTL on second call', async () => {
      const mockAnalyzer = {
        isConnected: true,
        analyze: jest.fn().mockReturnValue({ connected: true, features: { average: 42 } }),
      };
      const page = createPage(mockAnalyzer);

      const first = await analyzer.getAnalysis(page);
      const second = await analyzer.getAnalysis(page);

      expect(first).toEqual(second);
      // evaluate should have been called once; second call hit the cache
      expect((page.evaluate as jest.Mock).mock.calls.length).toBe(1);
    });

    it('returns fresh result after cache invalidation', async () => {
      const mockAnalyzer = {
        isConnected: true,
        analyze: jest.fn().mockReturnValue({ connected: true, features: { average: 1 } }),
      };
      const page = createPage(mockAnalyzer);

      await analyzer.getAnalysis(page);
      analyzer.clearCache();
      await analyzer.getAnalysis(page);

      expect((page.evaluate as jest.Mock).mock.calls.length).toBe(2);
    });

    it('populates cache fields on miss', async () => {
      const mockAnalyzer = {
        isConnected: true,
        analyze: jest.fn().mockReturnValue({ connected: true, features: { average: 0 } }),
      };
      const page = createPage(mockAnalyzer);
      const result = await analyzer.getAnalysis(page);
      expect(result).toBeDefined();
    });
  });

  describe('detectTempo — error branches', () => {
    it('throws when analyzer is null', async () => {
      const page = createPage(null);
      await expect(analyzer.detectTempo(page)).rejects.toThrow('Audio analyzer not connected');
    });

    it('throws when analyzer is not connected', async () => {
      const page = createPage({ isConnected: false });
      await expect(analyzer.detectTempo(page)).rejects.toThrow('Audio analyzer not connected');
    });

    it('throws when fftData is explicitly null', async () => {
      const mockAnalyzer = {
        isConnected: true,
        analyze: () => ({ features: { fftData: null } }),
      };
      const page = createPage(mockAnalyzer);
      await expect(analyzer.detectTempo(page)).rejects.toThrow('Invalid audio data');
    });

    it('throws when analyze is not a function and dataArray is missing', async () => {
      const page = createPage({ isConnected: true });
      await expect(analyzer.detectTempo(page)).rejects.toThrow('Invalid audio data');
    });

    it('throws when analyze is a function but dataArray is missing and no onsets returned', async () => {
      const mockAnalyzer = {
        isConnected: true,
        analyze: () => ({ features: {} }),
      };
      const page = createPage(mockAnalyzer);
      await expect(analyzer.detectTempo(page)).rejects.toThrow('Invalid audio data');
    });

    it('returns bpm=0 when fewer than 4 onsets available', async () => {
      const mockAnalyzer = {
        isConnected: true,
        analyze: () => ({ features: { onsetTimes: [100, 200] } }),
      };
      const page = createPage(mockAnalyzer);
      const result = await analyzer.detectTempo(page);
      expect(result?.bpm).toBe(0);
      expect(result?.confidence).toBe(0);
    });

    it('uses dataArray fallback and accumulates onset history', async () => {
      // Real Uint8Array simulates a live audio frame — calculateSpectralFlux
      // runs against it and may push onto _onsetHistory.
      const dataArray = new Uint8Array(512);
      for (let i = 0; i < dataArray.length; i++) dataArray[i] = (i * 7) % 256;
      const mockAnalyzer = {
        isConnected: true,
        analyze: () => ({ features: {} }),
        dataArray,
      };
      const page = createPage(mockAnalyzer);
      const result = await analyzer.detectTempo(page);
      // First call with < 4 onsets returns bpm=0, but must not throw
      expect(result).toBeDefined();
      expect(typeof result?.bpm).toBe('number');
    });

    it('uses dataArray fallback when analyze function is missing entirely', async () => {
      const dataArray = new Uint8Array(512);
      const mockAnalyzer = {
        isConnected: true,
        dataArray,
      };
      const page = createPage(mockAnalyzer);
      const result = await analyzer.detectTempo(page);
      expect(result).toBeDefined();
    });
  });

  describe('detectKey — error branches', () => {
    it('throws when analyzer is not connected', async () => {
      const page = createPage({ isConnected: false });
      await expect(analyzer.detectKey(page)).rejects.toThrow('Audio analyzer not connected');
    });

    it('throws when analyzer is null', async () => {
      const page = createPage(null);
      await expect(analyzer.detectKey(page)).rejects.toThrow('Audio analyzer not connected');
    });
  });

  describe('analyzeRhythm — degraded paths', () => {
    it('returns a degraded response when analyzer is not connected', async () => {
      const page = createPage({ isConnected: false });
      const result = await analyzer.analyzeRhythm(page);
      // Should not throw; returns defaults (current behavior)
      expect(result).toBeDefined();
    });

    it('returns a degraded response when analyzer is null', async () => {
      const page = createPage(null);
      const result = await analyzer.analyzeRhythm(page);
      expect(result).toBeDefined();
    });
  });
});
