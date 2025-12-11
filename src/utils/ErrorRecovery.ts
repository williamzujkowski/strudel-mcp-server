/**
 * ErrorRecovery - Provides graceful error handling and recovery mechanisms
 * Ensures the MCP server can recover from browser crashes, network issues, and pattern errors
 */

import { Logger } from './Logger.js';

export interface RecoveryStrategy {
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff: boolean;
  fallbackAction?: () => Promise<any>;
}

export class ErrorRecovery {
  private logger: Logger;
  private errorHistory: Map<string, number[]> = new Map();
  private readonly ERROR_WINDOW = 60000; // 1 minute window for error tracking

  constructor() {
    this.logger = new Logger();
  }

  /**
   * Executes an operation with automatic retry logic
   * @param operation - Async function to execute
   * @param operationName - Name for logging
   * @param strategy - Recovery strategy configuration
   * @returns Result of the operation
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    strategy: RecoveryStrategy = {
      maxRetries: 3,
      retryDelay: 1000,
      exponentialBackoff: true
    }
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= strategy.maxRetries; attempt++) {
      try {
        this.logger.debug(`Executing ${operationName} (attempt ${attempt + 1}/${strategy.maxRetries + 1})`);
        const result = await operation();

        // Success - clear error history for this operation
        this.clearErrorHistory(operationName);
        return result;

      } catch (error: any) {
        lastError = error;
        this.recordError(operationName);

        this.logger.warn(
          `${operationName} failed (attempt ${attempt + 1}/${strategy.maxRetries + 1})`,
          { error: error.message }
        );

        // Don't retry on last attempt
        if (attempt < strategy.maxRetries) {
          const delay = strategy.exponentialBackoff
            ? strategy.retryDelay * Math.pow(2, attempt)
            : strategy.retryDelay;

          this.logger.debug(`Waiting ${delay}ms before retry`);
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    this.logger.error(`${operationName} failed after ${strategy.maxRetries + 1} attempts`);

    // Try fallback if available
    if (strategy.fallbackAction) {
      this.logger.info(`Executing fallback for ${operationName}`);
      try {
        return await strategy.fallbackAction();
      } catch (fallbackError: any) {
        this.logger.error(`Fallback failed for ${operationName}`, fallbackError);
      }
    }

    throw new Error(
      `${operationName} failed after ${strategy.maxRetries + 1} attempts: ${lastError?.message}`
    );
  }

  /**
   * Wraps an operation with timeout protection
   * @param operation - Async function to execute
   * @param timeout - Timeout in milliseconds
   * @param operationName - Name for error messages
   * @returns Result of the operation
   */
  async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeout: number,
    operationName: string
  ): Promise<T> {
    return Promise.race([
      operation(),
      this.createTimeout<T>(timeout, operationName)
    ]);
  }

  /**
   * Combines retry logic with timeout protection
   * @param operation - Async function to execute
   * @param operationName - Name for logging
   * @param timeout - Timeout per attempt in milliseconds
   * @param strategy - Recovery strategy
   * @returns Result of the operation
   */
  async executeWithRetryAndTimeout<T>(
    operation: () => Promise<T>,
    operationName: string,
    timeout: number,
    strategy?: RecoveryStrategy
  ): Promise<T> {
    return this.executeWithRetry(
      () => this.executeWithTimeout(operation, timeout, operationName),
      operationName,
      strategy
    );
  }

  /**
   * Gracefully handles browser initialization errors
   * @param initFunction - Browser initialization function
   * @returns Initialization result
   */
  async handleBrowserInit(initFunction: () => Promise<string>): Promise<string> {
    return this.executeWithRetryAndTimeout(
      initFunction,
      'Browser Initialization',
      30000, // 30 second timeout
      {
        maxRetries: 2,
        retryDelay: 2000,
        exponentialBackoff: true,
        fallbackAction: async () => {
          this.logger.warn('Browser initialization failed, suggesting headless mode');
          return 'Browser initialization failed. Try setting headless:true in config.json';
        }
      }
    );
  }

  /**
   * Handles pattern write errors with validation
   * @param writeFunction - Pattern write function
   * @param pattern - Pattern to write
   * @returns Write result
   */
  async handlePatternWrite(
    writeFunction: (pattern: string) => Promise<string>,
    pattern: string
  ): Promise<string> {
    return this.executeWithRetry(
      () => writeFunction(pattern),
      'Pattern Write',
      {
        maxRetries: 2,
        retryDelay: 500,
        exponentialBackoff: false,
        fallbackAction: async () => {
          // Try writing a simplified version
          const simplified = this.simplifyPattern(pattern);
          this.logger.info('Attempting to write simplified pattern');
          return writeFunction(simplified);
        }
      }
    );
  }

  /**
   * Checks if an operation is experiencing repeated failures
   * @param operationName - Name of operation to check
   * @param threshold - Number of errors to consider "frequent"
   * @returns True if operation is failing frequently
   */
  isFrequentlyFailing(operationName: string, threshold: number = 3): boolean {
    const errors = this.errorHistory.get(operationName) || [];
    const now = Date.now();

    // Count errors within the time window
    const recentErrors = errors.filter(timestamp => now - timestamp < this.ERROR_WINDOW);

    return recentErrors.length >= threshold;
  }

  /**
   * Gets error statistics for monitoring
   * @returns Error statistics by operation
   */
  getErrorStats(): Record<string, { count: number; lastError: Date | null }> {
    const stats: Record<string, { count: number; lastError: Date | null }> = {};
    const now = Date.now();

    this.errorHistory.forEach((timestamps, operation) => {
      const recentErrors = timestamps.filter(ts => now - ts < this.ERROR_WINDOW);
      stats[operation] = {
        count: recentErrors.length,
        lastError: recentErrors.length > 0 ? new Date(Math.max(...recentErrors)) : null
      };
    });

    return stats;
  }

  /**
   * Clears error history for a specific operation
   * @param operationName - Operation to clear
   */
  clearErrorHistory(operationName: string): void {
    this.errorHistory.delete(operationName);
  }

  /**
   * Clears all error history
   */
  clearAllErrorHistory(): void {
    this.errorHistory.clear();
  }

  /**
   * Records an error occurrence
   * @param operationName - Name of the operation
   */
  private recordError(operationName: string): void {
    const errors = this.errorHistory.get(operationName) || [];
    errors.push(Date.now());

    // Keep only recent errors
    const now = Date.now();
    const recentErrors = errors.filter(ts => now - ts < this.ERROR_WINDOW);

    this.errorHistory.set(operationName, recentErrors);
  }

  /**
   * Creates a timeout promise
   * @param ms - Timeout in milliseconds
   * @param operationName - Name for error message
   * @returns Promise that rejects after timeout
   */
  private createTimeout<T>(ms: number, operationName: string): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${operationName} timed out after ${ms}ms`));
      }, ms);
    });
  }

  /**
   * Sleep utility
   * @param ms - Milliseconds to sleep
   * @returns Promise that resolves after delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Simplifies a pattern by removing complex modifiers
   * @param pattern - Original pattern
   * @returns Simplified pattern
   */
  private simplifyPattern(pattern: string): string {
    // Remove complex modifiers but keep core structure
    let simplified = pattern;

    // Remove effect chains but keep basic sound/note calls
    simplified = simplified.replace(/\.(delay|reverb|room|lpf|hpf|bpf)\([^)]*\)/g, '');

    // Remove complex transformations
    simplified = simplified.replace(/\.(jux|iter|chop|striate|scramble)\([^)]*\)/g, '');

    // Remove conditional modifications
    simplified = simplified.replace(/\.(sometimes|often|rarely|every)\([^)]*\)/g, '');

    this.logger.debug('Pattern simplified', {
      original: pattern.substring(0, 50) + '...',
      simplified: simplified.substring(0, 50) + '...'
    });

    return simplified;
  }

  /**
   * Handles network-related errors
   * @param operation - Operation that may fail due to network
   * @param operationName - Name for logging
   * @returns Operation result
   */
  async handleNetworkOperation<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    return this.executeWithRetry(
      operation,
      operationName,
      {
        maxRetries: 5,
        retryDelay: 2000,
        exponentialBackoff: true,
        fallbackAction: async () => {
          throw new Error(`Network operation ${operationName} failed - check internet connection`);
        }
      }
    );
  }

  /**
   * Creates a circuit breaker for operations that fail frequently
   * @param operation - Operation to protect
   * @param operationName - Name for tracking
   * @param threshold - Number of failures before circuit opens
   * @returns Protected operation
   */
  createCircuitBreaker<T>(
    operation: () => Promise<T>,
    operationName: string,
    threshold: number = 5
  ): () => Promise<T> {
    return async () => {
      if (this.isFrequentlyFailing(operationName, threshold)) {
        throw new Error(
          `Circuit breaker open for ${operationName} - operation disabled due to repeated failures`
        );
      }

      return operation();
    };
  }
}
