import { Page } from 'playwright';

export class AudioAnalyzer {
  async inject(page: Page) {
    await page.evaluate(() => {
      (window as any).strudelAudioAnalyzer = {
        analyser: null as AnalyserNode | null,
        dataArray: null as Uint8Array | null,
        isConnected: false,
        
        connect() {
          const originalGainConnect = GainNode.prototype.connect as any;
          let intercepted = false;
          
          (GainNode.prototype as any).connect = function(this: GainNode, ...args: any[]) {
            if (!intercepted && args[0] && args[0].context) {
              intercepted = true;
              
              const ctx = args[0].context as AudioContext;
              (window as any).strudelAudioAnalyzer.analyser = ctx.createAnalyser();
              (window as any).strudelAudioAnalyzer.analyser.fftSize = 2048;
              (window as any).strudelAudioAnalyzer.dataArray = new Uint8Array(
                (window as any).strudelAudioAnalyzer.analyser.frequencyBinCount
              );
              
              const result = originalGainConnect.apply(this, args);
              originalGainConnect.call(this, (window as any).strudelAudioAnalyzer.analyser);
              (window as any).strudelAudioAnalyzer.isConnected = true;
              
              console.log('Audio analyzer connected to Strudel');
              return result;
            }
            return originalGainConnect.apply(this, args);
          };
        },
        
        analyze() {
          if (!this.analyser || !this.isConnected) {
            return {
              connected: false,
              error: 'Analyzer not connected'
            };
          }
          
          this.analyser.getByteFrequencyData(this.dataArray);
          const data: number[] = Array.from(this.dataArray);
          
          const sum = data.reduce((a, b) => a + b, 0);
          const average = sum / data.length;
          
          const bass = data.slice(0, 8).reduce((a, b) => a + b, 0) / 8;
          const lowMid = data.slice(8, 32).reduce((a, b) => a + b, 0) / 24;
          const mid = data.slice(32, 128).reduce((a, b) => a + b, 0) / 96;
          const highMid = data.slice(128, 256).reduce((a, b) => a + b, 0) / 128;
          const treble = data.slice(256, 512).reduce((a, b) => a + b, 0) / 256;
          
          const peak = Math.max(...data);
          const peakIndex = data.indexOf(peak);
          const peakFreq = (peakIndex / data.length) * 22050;
          
          let weightedSum = 0;
          let magnitudeSum = 0;
          data.forEach((mag, i) => {
            weightedSum += i * mag;
            magnitudeSum += mag;
          });
          const centroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
          
          const isPlaying = average > 5;
          const isSilent = average < 1;
          
          return {
            connected: true,
            timestamp: Date.now(),
            features: {
              average: Math.round(average * 10) / 10,
              peak,
              peakFrequency: Math.round(peakFreq),
              centroid: Math.round(centroid * 10) / 10,
              
              bass: Math.round(bass),
              lowMid: Math.round(lowMid),
              mid: Math.round(mid),
              highMid: Math.round(highMid),
              treble: Math.round(treble),
              
              isPlaying,
              isSilent,
              
              bassToTrebleRatio: treble > 0 ? (bass / treble).toFixed(2) : 'N/A',
              brightness: centroid > 500 ? 'bright' : centroid > 200 ? 'balanced' : 'dark'
            }
          };
        }
      };
      
      (window as any).strudelAudioAnalyzer.connect();
    });
  }

  async getAnalysis(page: Page): Promise<any> {
    return await page.evaluate(() => {
      if ((window as any).strudelAudioAnalyzer) {
        return (window as any).strudelAudioAnalyzer.analyze();
      }
      return { error: 'Analyzer not initialized' };
    });
  }
}