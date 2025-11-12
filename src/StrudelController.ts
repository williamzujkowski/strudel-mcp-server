import { chromium, Browser, Page } from 'playwright';
import { AudioAnalyzer } from './AudioAnalyzer.js';

export class StrudelController {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private analyzer: AudioAnalyzer;
  private isHeadless: boolean;

  constructor(headless: boolean = false) {
    this.isHeadless = headless;
    this.analyzer = new AudioAnalyzer();
  }

  async initialize(): Promise<string> {
    if (this.browser) {
      return 'Already initialized';
    }

    this.browser = await chromium.launch({
      headless: this.isHeadless,
      args: ['--use-fake-ui-for-media-stream'],
    });

    const context = await this.browser.newContext({
      permissions: ['microphone'],
    });

    this.page = await context.newPage();

    await this.page.goto('https://strudel.cc/', {
      waitUntil: 'networkidle',
    });

    await this.page.waitForSelector('.cm-content', { timeout: 10000 });

    await this.analyzer.inject(this.page);

    return 'Strudel initialized successfully';
  }

  async writePattern(pattern: string): Promise<string> {
    if (!this.page) throw new Error('Not initialized');

    await this.page.click('.cm-content');
    await this.page.keyboard.press('ControlOrMeta+A');

    // Use insertText with the full pattern including newlines
    // insertText doesn't trigger individual keypress events, avoiding auto-pairing
    // and preserving all whitespace including newlines
    await this.page.keyboard.insertText(pattern);

    return `Pattern written (${pattern.length} chars)`;
  }

  async getCurrentPattern(): Promise<string> {
    if (!this.page) throw new Error('Not initialized');

    return await this.page.evaluate(() => {
      const editor = document.querySelector('.cm-content');
      return editor?.textContent || '';
    });
  }

  async play(): Promise<string> {
    if (!this.page) throw new Error('Not initialized');

    try {
      await this.page.click('button[title*="play" i]', { timeout: 1000 });
    } catch {
      await this.page.keyboard.press('ControlOrMeta+Enter');
    }

    await this.page.waitForTimeout(500);

    return 'Playing';
  }

  async stop(): Promise<string> {
    if (!this.page) throw new Error('Not initialized');

    try {
      await this.page.click('button[title*="stop" i]', { timeout: 1000 });
    } catch {
      await this.page.keyboard.press('ControlOrMeta+Period');
    }

    return 'Stopped';
  }

  async analyzeAudio(): Promise<any> {
    if (!this.page) throw new Error('Not initialized');

    return await this.analyzer.getAnalysis(this.page);
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}
