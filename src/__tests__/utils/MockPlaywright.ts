import { Page, Browser, BrowserContext } from 'playwright';

export class MockPage implements Partial<Page> {
  private content: string = '';
  private isPlayingState: boolean = false;
  private evaluateHandlers: Map<string, Function> = new Map();
  private url: string = '';

  async goto(url: string, options?: any): Promise<any> {
    this.url = url;
    return {};
  }

  async waitForSelector(selector: string, options?: any): Promise<any> {
    return {};
  }

  async waitForTimeout(timeout: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, Math.min(timeout, 10)));
  }

  async click(selector: string, options?: any): Promise<void> {
    if (selector.includes('play')) {
      this.isPlayingState = true;
    } else if (selector.includes('stop')) {
      this.isPlayingState = false;
    }
  }

  async type(text: string, options?: any): Promise<void> {
    this.content += text;
  }

  async route(url: string, handler: Function): Promise<void> {
    // Mock route interception
  }

  keyboard = {
    press: async (key: string): Promise<void> => {
      if (key.includes('Enter')) {
        this.isPlayingState = true;
      } else if (key.includes('Period')) {
        this.isPlayingState = false;
      } else if (key.includes('A')) {
        this.content = '';
      }
    },
    type: async (text: string): Promise<void> => {
      this.content += text;
    }
  };

  async evaluate(fn: Function, ...args: any[]): Promise<any> {
    // Simulate common evaluate calls
    const fnString = fn.toString();

    if (fnString.includes('strudelAudioAnalyzer')) {
      if (fnString.includes('connect()')) {
        return undefined;
      }
      if (fnString.includes('analyze()')) {
        return {
          connected: true,
          timestamp: Date.now(),
          features: {
            average: 50,
            peak: 100,
            peakFrequency: 440,
            centroid: 250,
            bass: 60,
            lowMid: 50,
            mid: 40,
            highMid: 30,
            treble: 20,
            isPlaying: this.isPlayingState,
            isSilent: !this.isPlayingState,
            bassToTrebleRatio: '3.00',
            brightness: 'balanced'
          }
        };
      }
    }

    if (fnString.includes('.cm-content')) {
      if (fnString.includes('textContent')) {
        return this.content;
      }
      if (fnString.includes('dispatch')) {
        const newContent = args[0];
        if (typeof newContent === 'string') {
          this.content = newContent;
        }
        return undefined;
      }
    }

    // Allow custom handlers
    for (const [key, handler] of this.evaluateHandlers.entries()) {
      if (fnString.includes(key)) {
        return handler(...args);
      }
    }

    return undefined;
  }

  setEvaluateHandler(key: string, handler: Function): void {
    this.evaluateHandlers.set(key, handler);
  }

  getContent(): string {
    return this.content;
  }

  setContent(content: string): void {
    this.content = content;
  }

  isPlaying(): boolean {
    return this.isPlayingState;
  }
}

export class MockBrowserContext implements Partial<BrowserContext> {
  async newPage(): Promise<any> {
    return new MockPage();
  }
}

export class MockBrowser implements Partial<Browser> {
  private closed: boolean = false;

  async newContext(options?: any): Promise<any> {
    return new MockBrowserContext();
  }

  async close(): Promise<void> {
    this.closed = true;
  }

  isClosed(): boolean {
    return this.closed;
  }
}

export const createMockBrowser = (): MockBrowser => {
  return new MockBrowser();
};

export const createMockPage = (): MockPage => {
  return new MockPage();
};
