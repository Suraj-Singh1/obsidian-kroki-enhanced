/**
 * Debug levels for logging
 */
export enum DebugLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

/**
 * Interface for debug log entry
 */
export interface DebugLogEntry {
  timestamp: Date;
  level: DebugLevel;
  category: string;
  message: string;
  data?: any;
}

/**
 * Interface for debug statistics
 */
export interface DebugStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cacheHits: number;
  cacheMisses: number;
  averageResponseTime: number;
  errorsByType: Record<string, number>;
}

/**
 * Class for managing debug logging and diagnostics
 */
export class DebugManager {
  private logs: DebugLogEntry[] = [];
  private maxLogEntries: number;
  private currentLevel: DebugLevel;
  private stats: DebugStats;
  private requestTimes: number[] = [];

  /**
   * Create a new DebugManager
   * @param maxLogEntries - Maximum number of log entries to keep
   * @param level - Current debug level
   */
  constructor(maxLogEntries = 1000, level = DebugLevel.INFO) {
    this.maxLogEntries = maxLogEntries;
    this.currentLevel = level;
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      errorsByType: {}
    };
  }

  /**
   * Set the debug level
   * @param level - New debug level
   */
  setLevel(level: DebugLevel): void {
    this.currentLevel = level;
  }

  /**
   * Log an error message
   * @param category - Category of the log entry
   * @param message - Log message
   * @param data - Optional additional data
   */
  error(category: string, message: string, data?: any): void {
    this.log(DebugLevel.ERROR, category, message, data);
    
    // Track error statistics
    if (!this.stats.errorsByType[category]) {
      this.stats.errorsByType[category] = 0;
    }
    this.stats.errorsByType[category]++;
  }

  /**
   * Log a warning message
   * @param category - Category of the log entry
   * @param message - Log message
   * @param data - Optional additional data
   */
  warn(category: string, message: string, data?: any): void {
    this.log(DebugLevel.WARN, category, message, data);
  }

  /**
   * Log an info message
   * @param category - Category of the log entry
   * @param message - Log message
   * @param data - Optional additional data
   */
  info(category: string, message: string, data?: any): void {
    this.log(DebugLevel.INFO, category, message, data);
  }

  /**
   * Log a debug message
   * @param category - Category of the log entry
   * @param message - Log message
   * @param data - Optional additional data
   */
  debug(category: string, message: string, data?: any): void {
    this.log(DebugLevel.DEBUG, category, message, data);
  }

  /**
   * Log a message at the specified level
   * @param level - Debug level
   * @param category - Category of the log entry
   * @param message - Log message
   * @param data - Optional additional data
   */
  private log(level: DebugLevel, category: string, message: string, data?: any): void {
    // Only log if the level is at or below the current level
    if (level <= this.currentLevel) {
      const entry: DebugLogEntry = {
        timestamp: new Date(),
        level,
        category,
        message,
        data
      };

      // Add to logs
      this.logs.push(entry);

      // Trim logs if necessary
      if (this.logs.length > this.maxLogEntries) {
        this.logs = this.logs.slice(-this.maxLogEntries);
      }

      // Also log to console for immediate visibility
      const consoleMessage = `[Kroki Enhanced] [${category}] ${message}`;
      switch (level) {
        case DebugLevel.ERROR:
          console.error(consoleMessage, data);
          break;
        case DebugLevel.WARN:
          console.warn(consoleMessage, data);
          break;
        case DebugLevel.INFO:
          console.info(consoleMessage, data);
          break;
        case DebugLevel.DEBUG:
          console.debug(consoleMessage, data);
          break;
      }
    }
  }

  /**
   * Record a successful request
   * @param responseTime - Response time in milliseconds
   */
  recordSuccessfulRequest(responseTime: number): void {
    this.stats.totalRequests++;
    this.stats.successfulRequests++;
    this.recordResponseTime(responseTime);
  }

  /**
   * Record a failed request
   */
  recordFailedRequest(): void {
    this.stats.totalRequests++;
    this.stats.failedRequests++;
  }

  /**
   * Record a cache hit
   */
  recordCacheHit(): void {
    this.stats.cacheHits++;
  }

  /**
   * Record a cache miss
   */
  recordCacheMiss(): void {
    this.stats.cacheMisses++;
  }

  /**
   * Record response time
   * @param responseTime - Response time in milliseconds
   */
  private recordResponseTime(responseTime: number): void {
    this.requestTimes.push(responseTime);
    
    // Keep only the last 100 response times for average calculation
    if (this.requestTimes.length > 100) {
      this.requestTimes = this.requestTimes.slice(-100);
    }
    
    // Calculate average response time
    this.stats.averageResponseTime = this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length;
  }

  /**
   * Get all log entries
   * @param level - Optional filter by level
   * @param category - Optional filter by category
   * @returns Array of log entries
   */
  getLogs(level?: DebugLevel, category?: string): DebugLogEntry[] {
    let filteredLogs = this.logs;

    if (level !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }

    if (category) {
      filteredLogs = filteredLogs.filter(log => log.category === category);
    }

    return filteredLogs;
  }

  /**
   * Get debug statistics
   * @returns Debug statistics object
   */
  getStats(): DebugStats {
    return { ...this.stats };
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Clear all statistics
   */
  clearStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      errorsByType: {}
    };
    this.requestTimes = [];
  }

  /**
   * Export logs as JSON string
   * @returns JSON string of all logs
   */
  exportLogs(): string {
    return JSON.stringify({
      logs: this.logs,
      stats: this.stats,
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Get a formatted string representation of recent logs
   * @param count - Number of recent logs to include
   * @returns Formatted log string
   */
  getRecentLogsFormatted(count = 50): string {
    const recentLogs = this.logs.slice(-count);
    
    return recentLogs.map(log => {
      const timestamp = log.timestamp.toISOString();
      const levelName = DebugLevel[log.level];
      const dataStr = log.data ? ` | Data: ${JSON.stringify(log.data)}` : '';
      
      return `[${timestamp}] [${levelName}] [${log.category}] ${log.message}${dataStr}`;
    }).join('\n');
  }

  /**
   * Perform system diagnostics
   * @returns Object with diagnostic information
   */
  async performDiagnostics(): Promise<Record<string, any>> {
    const diagnostics: Record<string, any> = {};

    // Browser information
    diagnostics.browser = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    };

    // Memory information (if available)
    if ('memory' in performance) {
      diagnostics.memory = (performance as any).memory;
    }

    // Network connectivity test
    try {
      const startTime = Date.now();
      const response = await fetch('https://kroki.io/health', { 
        method: 'HEAD',
        mode: 'no-cors'
      });
      const endTime = Date.now();
      
      diagnostics.connectivity = {
        krokiReachable: true,
        responseTime: endTime - startTime
      };
    } catch (error) {
      diagnostics.connectivity = {
        krokiReachable: false,
        error: error.message
      };
    }

    // Plugin statistics
    diagnostics.pluginStats = this.getStats();

    // Recent errors
    const recentErrors = this.getLogs(DebugLevel.ERROR).slice(-10);
    diagnostics.recentErrors = recentErrors.map(log => ({
      timestamp: log.timestamp,
      category: log.category,
      message: log.message
    }));

    return diagnostics;
  }
}
