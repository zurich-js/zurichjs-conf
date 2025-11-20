/**
 * Structured Logging System
 *
 * Centralized, type-safe logging that replaces all console.log statements.
 * Integrates with PostHog for error tracking and analytics.
 *
 * Features:
 * - Multiple log levels (debug, info, warn, error)
 * - Structured metadata
 * - Context-aware logging
 * - PostHog integration for errors
 * - Development vs production behavior
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *
 *   logger.info('User logged in', { userId: '123' })
 *   logger.error('Payment failed', error, { orderId: 'abc' })
 *   logger.debug('Processing webhook', { eventType: 'checkout.completed' })
 */

import { analytics } from '@/lib/analytics/client'
import { serverAnalytics } from '@/lib/analytics/server'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type LogContext = {
  /** Module or component name */
  module?: string
  /** Function or method name */
  function?: string
  /** User ID if available */
  userId?: string
  /** Request ID for tracing */
  requestId?: string
  /** Additional metadata */
  [key: string]: unknown
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

export type ErrorType = 'validation' | 'network' | 'payment' | 'auth' | 'system' | 'unknown'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: LogContext
  error?: {
    name?: string
    message?: string
    stack?: string
  }
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private isServer = typeof window === 'undefined'
  private minLevel: LogLevel = this.isDevelopment ? 'debug' : 'info'

  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  }

  private levelEmoji: Record<LogLevel, string> = {
    debug: '🔍',
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
  }

  /**
   * Log a debug message (development only)
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, undefined, context)
  }

  /**
   * Log an informational message
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, undefined, context)
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, undefined, context)
  }

  /**
   * Log an error message
   *
   * Automatically tracks in PostHog for production monitoring
   */
  error(
    message: string,
    error?: Error | unknown,
    context?: LogContext & {
      severity?: ErrorSeverity
      type?: ErrorType
      code?: string
    }
  ): void {
    const errorObj = error instanceof Error ? error : undefined
    this.log('error', message, errorObj, context)

    // Track errors in PostHog for monitoring
    this.trackError(message, errorObj, context)
  }

  /**
   * Create a scoped logger with default context
   *
   * @example
   * const log = logger.scope('WebhookHandler', { requestId: 'abc' })
   * log.info('Processing webhook')
   * log.error('Failed to process', error)
   */
  scope(module: string, defaultContext?: LogContext): ScopedLogger {
    return new ScopedLogger(this, module, defaultContext)
  }

  /**
   * Log with specific level
   */
  private log(
    level: LogLevel,
    message: string,
    error?: Error,
    context?: LogContext
  ): void {
    // Check if we should log based on level
    if (this.levelPriority[level] < this.levelPriority[this.minLevel]) {
      return
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    }

    // Output to console
    this.outputToConsole(entry)

    // In production, could also send to external logging service
    // if (!this.isDevelopment) {
    //   this.sendToLoggingService(entry)
    // }
  }

  /**
   * Output log entry to console with formatting
   */
  private outputToConsole(entry: LogEntry): void {
    const emoji = this.levelEmoji[entry.level]
    const prefix = entry.context?.module
      ? `[${entry.context.module}]`
      : '[App]'

    const logFn = this.getConsoleMethod(entry.level)

    if (this.isDevelopment) {
      // Rich formatting for development
      const contextStr = entry.context
        ? Object.keys(entry.context)
            .filter((k) => k !== 'module' && k !== 'function')
            .map((k) => `${k}=${JSON.stringify(entry.context![k])}`)
            .join(', ')
        : ''

      logFn(
        `${emoji} ${prefix} ${entry.message}`,
        contextStr ? `\n  Context: ${contextStr}` : '',
        entry.error ? `\n  Error:` : '',
        entry.error || ''
      )
    } else {
      // JSON format for production (easier to parse)
      const logData = {
        level: entry.level,
        message: entry.message,
        timestamp: entry.timestamp,
        module: entry.context?.module,
        context: entry.context,
        error: entry.error,
      }

      logFn(JSON.stringify(logData))
    }
  }

  /**
   * Get appropriate console method for log level
   */
  private getConsoleMethod(level: LogLevel): (...args: unknown[]) => void {
    switch (level) {
      case 'debug':
        return console.debug
      case 'info':
        return console.info
      case 'warn':
        return console.warn
      case 'error':
        return console.error
      default:
        return console.log
    }
  }

  /**
   * Track error in PostHog
   */
  private trackError(
    message: string,
    error?: Error,
    context?: LogContext & {
      severity?: ErrorSeverity
      type?: ErrorType
      code?: string
    }
  ): void {
    if (this.isDevelopment) {
      return // Don't track development errors
    }

    const errorType = context?.type || this.inferErrorType(message, error)
    const severity = context?.severity || this.inferSeverity(errorType)

    if (this.isServer) {
      // Server-side error tracking
      const distinctId = context?.userId || 'anonymous'
      serverAnalytics.error(distinctId, message, {
        type: errorType,
        severity,
        code: context?.code,
        stack: error?.stack,
        ...context,
      })
    } else {
      // Client-side error tracking
      analytics.error(message, error, {
        type: errorType,
        severity,
        code: context?.code,
        ...context,
      })
    }
  }

  /**
   * Infer error type from message and error
   */
  private inferErrorType(message: string, error?: Error): ErrorType {
    const lowerMessage = message.toLowerCase()

    if (
      lowerMessage.includes('payment') ||
      lowerMessage.includes('stripe') ||
      lowerMessage.includes('charge')
    ) {
      return 'payment'
    }

    if (
      lowerMessage.includes('auth') ||
      lowerMessage.includes('login') ||
      lowerMessage.includes('unauthorized') ||
      lowerMessage.includes('forbidden')
    ) {
      return 'auth'
    }

    if (
      lowerMessage.includes('network') ||
      lowerMessage.includes('fetch') ||
      lowerMessage.includes('request') ||
      error?.message.includes('NetworkError')
    ) {
      return 'network'
    }

    if (
      lowerMessage.includes('validation') ||
      lowerMessage.includes('invalid') ||
      lowerMessage.includes('required')
    ) {
      return 'validation'
    }

    return 'unknown'
  }

  /**
   * Infer severity from error type
   */
  private inferSeverity(type: ErrorType): ErrorSeverity {
    switch (type) {
      case 'payment':
      case 'auth':
        return 'critical'
      case 'system':
        return 'high'
      case 'network':
        return 'medium'
      case 'validation':
        return 'low'
      default:
        return 'medium'
    }
  }
}

/**
 * Scoped logger with default context
 */
class ScopedLogger {
  constructor(
    private logger: Logger,
    private module: string,
    private defaultContext?: LogContext
  ) {}

  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, this.mergeContext(context))
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(message, this.mergeContext(context))
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, this.mergeContext(context))
  }

  error(
    message: string,
    error?: Error | unknown,
    context?: LogContext & {
      severity?: ErrorSeverity
      type?: ErrorType
      code?: string
    }
  ): void {
    this.logger.error(message, error, this.mergeContext(context))
  }

  private mergeContext(context?: LogContext): LogContext {
    return {
      module: this.module,
      ...this.defaultContext,
      ...context,
    }
  }
}

// Export singleton instance
export const logger = new Logger()

// Export scoped logger class for typing
export type { ScopedLogger }
