import { PerformanceMonitor } from '../../utils/PerformanceMonitor.js';

/**
 * Helper to create a monitor with controllable time
 */
function createTestMonitor() {
  const state = { time: 0 };
  const monitor = new PerformanceMonitor(() => state.time);
  const setTime = (ms: number) => { state.time = ms; };
  return { monitor, setTime };
}

describe('PerformanceMonitor', () => {
  describe('startOperation / endOperation', () => {
    it('should track operation timing', () => {
      const { monitor, setTime } = createTestMonitor();
      setTime(0);
      monitor.startOperation('test-op');
      setTime(100);
      const duration = monitor.endOperation('test-op');

      expect(duration).toBe(100);
    });

    it('should return 0 if endOperation called without startOperation', () => {
      const { monitor } = createTestMonitor();
      const duration = monitor.endOperation('unknown-op');
      expect(duration).toBe(0);
    });

    it('should track success by default', () => {
      const { monitor, setTime } = createTestMonitor();
      setTime(0);
      monitor.startOperation('test-op');
      setTime(50);
      monitor.endOperation('test-op');

      const metrics = monitor.getMetrics('test-op');
      expect(metrics?.errorRate).toBe(0);
    });

    it('should track errors when success is false', () => {
      const { monitor, setTime } = createTestMonitor();
      setTime(0);
      monitor.startOperation('test-op');
      setTime(50);
      monitor.endOperation('test-op', false);

      const metrics = monitor.getMetrics('test-op');
      expect(metrics?.errorRate).toBe(100);
    });

    it('should remove start time after endOperation', () => {
      const { monitor, setTime } = createTestMonitor();
      setTime(0);
      monitor.startOperation('test-op');
      setTime(50);
      monitor.endOperation('test-op');

      // Second endOperation should return 0 (no start time)
      const duration = monitor.endOperation('test-op');
      expect(duration).toBe(0);
    });

    it('should handle multiple operations of the same type', () => {
      const { monitor, setTime } = createTestMonitor();
      // First operation: 100ms
      setTime(0);
      monitor.startOperation('test-op');
      setTime(100);
      monitor.endOperation('test-op');

      // Second operation: 150ms
      setTime(200);
      monitor.startOperation('test-op');
      setTime(350);
      monitor.endOperation('test-op');

      const metrics = monitor.getMetrics('test-op');
      expect(metrics?.calls).toBe(2);
      expect(metrics?.totalTime).toBe(250);
      expect(metrics?.minTime).toBe(100);
      expect(metrics?.maxTime).toBe(150);
    });

    it('should handle concurrent different operations', () => {
      const { monitor, setTime } = createTestMonitor();
      setTime(0);
      monitor.startOperation('op1');
      setTime(25);
      monitor.startOperation('op2');
      setTime(50);
      const duration1 = monitor.endOperation('op1'); // 50ms
      setTime(100);
      const duration2 = monitor.endOperation('op2'); // 75ms

      expect(duration1).toBe(50);
      expect(duration2).toBe(75);

      const metrics1 = monitor.getMetrics('op1');
      const metrics2 = monitor.getMetrics('op2');
      expect(metrics1?.totalTime).toBe(50);
      expect(metrics2?.totalTime).toBe(75);
    });
  });

  describe('measureAsync', () => {
    it('should measure async operation duration', async () => {
      const { monitor, setTime } = createTestMonitor();
      setTime(0);
      const result = await monitor.measureAsync('async-op', async () => {
        setTime(200);
        return 'success';
      });

      expect(result).toBe('success');
      const metrics = monitor.getMetrics('async-op');
      expect(metrics?.calls).toBe(1);
      expect(metrics?.totalTime).toBe(200);
      expect(metrics?.errorRate).toBe(0);
    });

    it('should track errors on async operation failure', async () => {
      const { monitor, setTime } = createTestMonitor();
      setTime(0);
      await expect(
        monitor.measureAsync('failing-op', async () => {
          setTime(100);
          throw new Error('Async failure');
        })
      ).rejects.toThrow('Async failure');

      const metrics = monitor.getMetrics('failing-op');
      expect(metrics?.calls).toBe(1);
      expect(metrics?.errorRate).toBe(100);
    });

    it('should return the async operation result', async () => {
      const { monitor } = createTestMonitor();
      const result = await monitor.measureAsync('result-op', async () => {
        return { data: 'test' };
      });

      expect(result).toEqual({ data: 'test' });
    });
  });

  describe('getMetrics', () => {
    it('should return null for unknown operation', () => {
      const { monitor } = createTestMonitor();
      const metrics = monitor.getMetrics('nonexistent');
      expect(metrics).toBeNull();
    });

    it('should return metrics for a specific operation', () => {
      const { monitor, setTime } = createTestMonitor();
      setTime(0);
      monitor.startOperation('test-op');
      setTime(100);
      monitor.endOperation('test-op');

      const metrics = monitor.getMetrics('test-op');
      expect(metrics).toMatchObject({
        operation: 'test-op',
        calls: 1,
        averageTime: 100,
        minTime: 100,
        maxTime: 100,
        totalTime: 100,
        errorRate: 0
      });
    });

    it('should return all metrics sorted by totalTime when no operation specified', () => {
      const { monitor, setTime } = createTestMonitor();
      // Fast operation: 50ms x 2 = 100ms total
      setTime(0);
      monitor.startOperation('fast');
      setTime(50);
      monitor.endOperation('fast');
      setTime(100);
      monitor.startOperation('fast');
      setTime(150);
      monitor.endOperation('fast');

      // Slow operation: 300ms total
      setTime(200);
      monitor.startOperation('slow');
      setTime(500);
      monitor.endOperation('slow');

      const allMetrics = monitor.getMetrics() as any[];
      expect(allMetrics).toHaveLength(2);
      expect(allMetrics[0].operation).toBe('slow'); // Sorted by totalTime desc
      expect(allMetrics[1].operation).toBe('fast');
    });

    it('should return empty array when no metrics exist', () => {
      const { monitor } = createTestMonitor();
      const allMetrics = monitor.getMetrics();
      expect(allMetrics).toEqual([]);
    });

    it('should calculate correct min/max/avg for multiple operations', () => {
      const { monitor, setTime } = createTestMonitor();
      // Operations: 10, 20, 30, 40, 50 = total 150, avg 30
      const times = [10, 20, 30, 40, 50];
      let currentTime = 0;

      for (const duration of times) {
        setTime(currentTime);
        monitor.startOperation('multi');
        currentTime += duration;
        setTime(currentTime);
        monitor.endOperation('multi');
      }

      const metrics = monitor.getMetrics('multi');
      expect(metrics?.calls).toBe(5);
      expect(metrics?.totalTime).toBe(150);
      expect(metrics?.averageTime).toBe(30);
      expect(metrics?.minTime).toBe(10);
      expect(metrics?.maxTime).toBe(50);
    });

    it('should calculate correct error rate with mixed success/failure', () => {
      const { monitor, setTime } = createTestMonitor();
      // 2 successes, 1 failure = 33.33% error rate
      setTime(0);
      monitor.startOperation('mixed');
      setTime(10);
      monitor.endOperation('mixed', true);

      setTime(20);
      monitor.startOperation('mixed');
      setTime(30);
      monitor.endOperation('mixed', false);

      setTime(40);
      monitor.startOperation('mixed');
      setTime(50);
      monitor.endOperation('mixed', true);

      const metrics = monitor.getMetrics('mixed');
      expect(metrics?.calls).toBe(3);
      expect(metrics?.errorRate).toBeCloseTo(33.33, 1);
    });
  });

  describe('getReport', () => {
    it('should return "No performance metrics collected" when empty', () => {
      const { monitor } = createTestMonitor();
      const report = monitor.getReport();
      expect(report).toBe('No performance metrics collected');
    });

    it('should generate formatted report with metrics', () => {
      const { monitor, setTime } = createTestMonitor();
      setTime(0);
      monitor.startOperation('test-op');
      setTime(100);
      monitor.endOperation('test-op');

      const report = monitor.getReport();
      expect(report).toContain('PERFORMANCE REPORT');
      expect(report).toContain('test-op');
      expect(report).toContain('100.00');
    });

    it('should include all operations in report', () => {
      const { monitor, setTime } = createTestMonitor();
      setTime(0);
      monitor.startOperation('op1');
      setTime(50);
      monitor.endOperation('op1');

      setTime(100);
      monitor.startOperation('op2');
      setTime(200);
      monitor.endOperation('op2');

      const report = monitor.getReport();
      expect(report).toContain('op1');
      expect(report).toContain('op2');
    });

    it('should display error rate percentage', () => {
      const { monitor, setTime } = createTestMonitor();
      setTime(0);
      monitor.startOperation('error-op');
      setTime(50);
      monitor.endOperation('error-op', false);

      const report = monitor.getReport();
      expect(report).toContain('100.0%');
    });

    it('should calculate total time and operations', () => {
      const { monitor, setTime } = createTestMonitor();
      setTime(0);
      monitor.startOperation('op');
      setTime(100);
      monitor.endOperation('op');
      setTime(200);
      monitor.startOperation('op');
      setTime(300);
      monitor.endOperation('op');

      const report = monitor.getReport();
      expect(report).toContain('Total Operations: 2');
      expect(report).toContain('Total Time: 200.00ms');
    });
  });

  describe('reset', () => {
    it('should clear all metrics', () => {
      const { monitor, setTime } = createTestMonitor();
      setTime(0);
      monitor.startOperation('test-op');
      setTime(50);
      monitor.endOperation('test-op');

      monitor.reset();

      expect(monitor.getMetrics('test-op')).toBeNull();
      expect(monitor.getMetrics()).toEqual([]);
    });

    it('should clear pending start times', () => {
      const { monitor, setTime } = createTestMonitor();
      setTime(0);
      monitor.startOperation('test-op');
      monitor.reset();

      // Should return 0 since start time was cleared
      const duration = monitor.endOperation('test-op');
      expect(duration).toBe(0);
    });

    it('should allow new operations after reset', () => {
      const { monitor, setTime } = createTestMonitor();
      setTime(0);
      monitor.startOperation('test-op');
      setTime(100);
      monitor.endOperation('test-op');

      monitor.reset();

      setTime(200);
      monitor.startOperation('new-op');
      setTime(250);
      monitor.endOperation('new-op');

      expect(monitor.getMetrics('new-op')).not.toBeNull();
      expect(monitor.getMetrics('new-op')?.totalTime).toBe(50);
    });
  });

  describe('getMemoryUsage', () => {
    it('should return memory usage in Node.js environment', () => {
      const { monitor } = createTestMonitor();
      const memory = monitor.getMemoryUsage();
      expect(memory).not.toBeNull();
      expect(memory?.heapUsed).toMatch(/\d+\.\d+ MB/);
      expect(memory?.heapTotal).toMatch(/\d+\.\d+ MB/);
      expect(memory?.rss).toMatch(/\d+\.\d+ MB/);
      expect(memory?.external).toMatch(/\d+\.\d+ MB/);
    });

    it('should return null when process.memoryUsage is unavailable', () => {
      const { monitor } = createTestMonitor();
      const originalMemoryUsage = process.memoryUsage;
      (process as any).memoryUsage = undefined;

      const memory = monitor.getMemoryUsage();
      expect(memory).toBeNull();

      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('getBottlenecks', () => {
    it('should return empty array when no metrics', () => {
      const { monitor } = createTestMonitor();
      const bottlenecks = monitor.getBottlenecks();
      expect(bottlenecks).toEqual([]);
    });

    it('should return operations sorted by average time (slowest first)', () => {
      const { monitor, setTime } = createTestMonitor();
      // Fast: 50ms
      setTime(0);
      monitor.startOperation('fast');
      setTime(50);
      monitor.endOperation('fast');

      // Medium: 100ms
      setTime(100);
      monitor.startOperation('medium');
      setTime(200);
      monitor.endOperation('medium');

      // Slow: 200ms
      setTime(300);
      monitor.startOperation('slow');
      setTime(500);
      monitor.endOperation('slow');

      const bottlenecks = monitor.getBottlenecks();
      expect(bottlenecks[0].operation).toBe('slow');
      expect(bottlenecks[1].operation).toBe('medium');
      expect(bottlenecks[2].operation).toBe('fast');
    });

    it('should respect limit parameter', () => {
      const { monitor, setTime } = createTestMonitor();
      let currentTime = 0;
      for (let i = 0; i < 10; i++) {
        setTime(currentTime);
        monitor.startOperation(`op-${i}`);
        currentTime += i * 10;
        setTime(currentTime);
        monitor.endOperation(`op-${i}`);
      }

      const bottlenecks = monitor.getBottlenecks(3);
      expect(bottlenecks).toHaveLength(3);
    });

    it('should default to 5 results', () => {
      const { monitor, setTime } = createTestMonitor();
      let currentTime = 0;
      for (let i = 0; i < 10; i++) {
        setTime(currentTime);
        monitor.startOperation(`op-${i}`);
        currentTime += i * 10;
        setTime(currentTime);
        monitor.endOperation(`op-${i}`);
      }

      const bottlenecks = monitor.getBottlenecks();
      expect(bottlenecks).toHaveLength(5);
    });

    it('should format output with ms suffix', () => {
      const { monitor, setTime } = createTestMonitor();
      setTime(0);
      monitor.startOperation('test-op');
      setTime(123.456);
      monitor.endOperation('test-op');

      const bottlenecks = monitor.getBottlenecks();
      expect(bottlenecks[0].averageTime).toBe('123.46ms');
      expect(bottlenecks[0].maxTime).toBe('123.46ms');
    });

    it('should return fewer items if total operations is less than limit', () => {
      const { monitor, setTime } = createTestMonitor();
      setTime(0);
      monitor.startOperation('op1');
      setTime(100);
      monitor.endOperation('op1');

      setTime(200);
      monitor.startOperation('op2');
      setTime(400);
      monitor.endOperation('op2');

      const bottlenecks = monitor.getBottlenecks(10);
      expect(bottlenecks).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    it('should handle zero duration operation', () => {
      const { monitor, setTime } = createTestMonitor();
      setTime(100);
      monitor.startOperation('instant');
      // Same time - duration is 0
      const duration = monitor.endOperation('instant');

      expect(duration).toBe(0);
      const metrics = monitor.getMetrics('instant');
      expect(metrics?.averageTime).toBe(0);
    });

    it('should handle very small durations', () => {
      const { monitor, setTime } = createTestMonitor();
      setTime(0);
      monitor.startOperation('tiny');
      setTime(0.001);
      const duration = monitor.endOperation('tiny');

      expect(duration).toBe(0.001);
    });

    it('should handle very large durations', () => {
      const { monitor, setTime } = createTestMonitor();
      setTime(0);
      monitor.startOperation('slow');
      setTime(1000000); // 1000 seconds
      const duration = monitor.endOperation('slow');

      expect(duration).toBe(1000000);
    });

    it('should handle operation names with special characters', () => {
      const { monitor, setTime } = createTestMonitor();
      const opName = 'op:with/special.chars-123';
      setTime(0);
      monitor.startOperation(opName);
      setTime(50);
      monitor.endOperation(opName);

      const metrics = monitor.getMetrics(opName);
      expect(metrics?.operation).toBe(opName);
    });

    it('should handle empty operation name', () => {
      const { monitor, setTime } = createTestMonitor();
      setTime(0);
      monitor.startOperation('');
      setTime(10);
      monitor.endOperation('');

      const metrics = monitor.getMetrics('');
      expect(metrics?.calls).toBe(1);
    });

    it('should initialize min time correctly for first operation', () => {
      const { monitor, setTime } = createTestMonitor();
      setTime(0);
      monitor.startOperation('test');
      setTime(50);
      monitor.endOperation('test');

      const metrics = monitor.getMetrics('test');
      // minTime should be 50, not Infinity
      expect(metrics?.minTime).toBe(50);
      expect(Number.isFinite(metrics?.minTime)).toBe(true);
    });

    it('should track min time correctly across multiple operations', () => {
      const { monitor, setTime } = createTestMonitor();
      // First operation: 200ms
      setTime(0);
      monitor.startOperation('test');
      setTime(200);
      monitor.endOperation('test');

      // Second operation: 50ms (new min)
      setTime(300);
      monitor.startOperation('test');
      setTime(350);
      monitor.endOperation('test');

      // Third operation: 100ms
      setTime(400);
      monitor.startOperation('test');
      setTime(500);
      monitor.endOperation('test');

      const metrics = monitor.getMetrics('test');
      expect(metrics?.minTime).toBe(50);
      expect(metrics?.maxTime).toBe(200);
    });

    it('should overwrite start time if startOperation called twice', () => {
      const { monitor, setTime } = createTestMonitor();
      setTime(0);
      monitor.startOperation('test');
      setTime(100);
      monitor.startOperation('test'); // Overwrites previous start
      setTime(150);
      const duration = monitor.endOperation('test');

      // Should be 50ms (from second start), not 150ms
      expect(duration).toBe(50);
    });
  });

  describe('constructor', () => {
    it('should use performance.now by default when no provider given', () => {
      // Create monitor without time provider
      const monitor = new PerformanceMonitor();

      // Operations should work with real time
      monitor.startOperation('real-time-op');
      const duration = monitor.endOperation('real-time-op');

      // Duration should be a small positive number (real elapsed time)
      expect(duration).toBeGreaterThanOrEqual(0);
      expect(duration).toBeLessThan(100); // Should be fast
    });
  });
});
