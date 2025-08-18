export class Logger {
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  info(message: string, data?: any) {
    console.error(`[${this.getTimestamp()}] INFO: ${message}`, data ? JSON.stringify(data) : '');
  }

  error(message: string, error?: any) {
    console.error(`[${this.getTimestamp()}] ERROR: ${message}`, error?.message || error);
  }

  warn(message: string, data?: any) {
    console.error(`[${this.getTimestamp()}] WARN: ${message}`, data ? JSON.stringify(data) : '');
  }

  debug(message: string, data?: any) {
    if (process.env.DEBUG) {
      console.error(`[${this.getTimestamp()}] DEBUG: ${message}`, data ? JSON.stringify(data) : '');
    }
  }
}