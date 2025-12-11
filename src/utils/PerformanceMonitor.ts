export class PerformanceMonitor {
  private metrics: Map<string, {
    count: number;
    totalTime: number;
    minTime: number;
    maxTime: number;
    errors: number;
  }> = new Map();

  private startTimes: Map<string, number> = new Map();

  startOperation(operationName: string): void {
    this.startTimes.set(operationName, performance.now());
  }

  endOperation(operationName: string, success: boolean = true): number {
    const startTime = this.startTimes.get(operationName);
    if (!startTime) return 0;

    const duration = performance.now() - startTime;
    this.startTimes.delete(operationName);

    const metric = this.metrics.get(operationName) || {
      count: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0,
      errors: 0
    };

    metric.count++;
    metric.totalTime += duration;
    metric.minTime = Math.min(metric.minTime, duration);
    metric.maxTime = Math.max(metric.maxTime, duration);
    if (!success) metric.errors++;

    this.metrics.set(operationName, metric);

    return duration;
  }

  async measureAsync<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    this.startOperation(operationName);
    try {
      const result = await operation();
      this.endOperation(operationName, true);
      return result;
    } catch (error) {
      this.endOperation(operationName, false);
      throw error;
    }
  }

  getMetrics(operationName?: string) {
    if (operationName) {
      const metric = this.metrics.get(operationName);
      if (!metric) return null;

      return {
        operation: operationName,
        calls: metric.count,
        averageTime: metric.totalTime / metric.count,
        minTime: metric.minTime,
        maxTime: metric.maxTime,
        totalTime: metric.totalTime,
        errorRate: (metric.errors / metric.count) * 100
      };
    }

    const allMetrics: any[] = [];
    this.metrics.forEach((metric, name) => {
      allMetrics.push({
        operation: name,
        calls: metric.count,
        averageTime: metric.totalTime / metric.count,
        minTime: metric.minTime,
        maxTime: metric.maxTime,
        totalTime: metric.totalTime,
        errorRate: (metric.errors / metric.count) * 100
      });
    });

    return allMetrics.sort((a, b) => b.totalTime - a.totalTime);
  }

  getReport(): string {
    const metrics = this.getMetrics() as any[];
    if (!metrics || metrics.length === 0) {
      return 'No performance metrics collected';
    }

    let report = '\n=== PERFORMANCE REPORT ===\n\n';
    report += 'Operation'.padEnd(30) + 'Calls'.padEnd(10) + 'Avg(ms)'.padEnd(12) + 'Min(ms)'.padEnd(12) + 'Max(ms)'.padEnd(12) + 'Errors\n';
    report += '-'.repeat(86) + '\n';

    metrics.forEach(m => {
      report += m.operation.padEnd(30) +
                m.calls.toString().padEnd(10) +
                m.averageTime.toFixed(2).padEnd(12) +
                m.minTime.toFixed(2).padEnd(12) +
                m.maxTime.toFixed(2).padEnd(12) +
                `${m.errorRate.toFixed(1)}%\n`;
    });

    const totalCalls = metrics.reduce((sum, m) => sum + m.calls, 0);
    const totalTime = metrics.reduce((sum, m) => sum + m.totalTime, 0);

    report += '\n';
    report += `Total Operations: ${totalCalls}\n`;
    report += `Total Time: ${totalTime.toFixed(2)}ms\n`;
    report += `Average per Operation: ${(totalTime / totalCalls).toFixed(2)}ms\n`;

    return report;
  }

  reset() {
    this.metrics.clear();
    this.startTimes.clear();
  }

  // Memory usage tracking
  getMemoryUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return {
        heapUsed: (usage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
        heapTotal: (usage.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
        rss: (usage.rss / 1024 / 1024).toFixed(2) + ' MB',
        external: (usage.external / 1024 / 1024).toFixed(2) + ' MB'
      };
    }
    return null;
  }

  // Get top slowest operations
  getBottlenecks(limit: number = 5) {
    const metrics = this.getMetrics() as any[];
    return metrics
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, limit)
      .map(m => ({
        operation: m.operation,
        averageTime: m.averageTime.toFixed(2) + 'ms',
        maxTime: m.maxTime.toFixed(2) + 'ms',
        calls: m.calls
      }));
  }
}
