import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Logger, LogLevel } from '../src/utils/logger.js';

describe('Logger', () => {
    let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
    let consoleDebugSpy: jest.SpiedFunction<typeof console.debug>;
    let consoleWarnSpy: jest.SpiedFunction<typeof console.warn>;
    let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

    beforeEach(() => {
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => { });
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
        consoleDebugSpy.mockRestore();
        consoleWarnSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    describe('constructor', () => {
        it('should create logger with default options', () => {
            const logger = new Logger();
            expect(logger).toBeInstanceOf(Logger);
        });

        it('should create logger with custom log level', () => {
            const logger = new Logger({ level: LogLevel.DEBUG });
            logger.debug('test');
            expect(consoleDebugSpy).toHaveBeenCalled();
        });

        it('should create logger with colors disabled', () => {
            const logger = new Logger({ useColors: false });
            logger.info('test');
            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls[0][0];
            expect(output).not.toContain('\x1b['); // Should not contain ANSI codes
        });

        it('should create logger with JSON output', () => {
            const logger = new Logger({ useJson: true });
            logger.info('test message');
            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls[0][0];
            expect(() => JSON.parse(output)).not.toThrow();
        });

        it('should create logger with timestamps', () => {
            const logger = new Logger({ timestamps: true, useColors: false });
            logger.info('test');
            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls[0][0];
            // Should contain ISO timestamp
            expect(output).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        });
    });

    describe('log levels', () => {
        it('should log debug messages when level is DEBUG', () => {
            const logger = new Logger({ level: LogLevel.DEBUG });
            logger.debug('debug message');
            expect(consoleDebugSpy).toHaveBeenCalled();
        });

        it('should not log debug messages when level is INFO', () => {
            const logger = new Logger({ level: LogLevel.INFO });
            logger.debug('debug message');
            expect(consoleDebugSpy).not.toHaveBeenCalled();
        });

        it('should log info messages when level is INFO', () => {
            const logger = new Logger({ level: LogLevel.INFO });
            logger.info('info message');
            expect(consoleLogSpy).toHaveBeenCalled();
        });

        it('should not log info messages when level is WARN', () => {
            const logger = new Logger({ level: LogLevel.WARN });
            logger.info('info message');
            expect(consoleLogSpy).not.toHaveBeenCalled();
        });

        it('should log warnings when level is WARN', () => {
            const logger = new Logger({ level: LogLevel.WARN });
            logger.warn('warning message');
            expect(consoleWarnSpy).toHaveBeenCalled();
        });

        it('should not log warnings when level is ERROR', () => {
            const logger = new Logger({ level: LogLevel.ERROR });
            logger.warn('warning message');
            expect(consoleWarnSpy).not.toHaveBeenCalled();
        });

        it('should log errors when level is ERROR', () => {
            const logger = new Logger({ level: LogLevel.ERROR });
            logger.error('error message');
            expect(consoleErrorSpy).toHaveBeenCalled();
        });

        it('should not log anything when level is SILENT', () => {
            const logger = new Logger({ level: LogLevel.SILENT });
            logger.debug('debug');
            logger.info('info');
            logger.warn('warn');
            logger.error('error');

            expect(consoleDebugSpy).not.toHaveBeenCalled();
            expect(consoleLogSpy).not.toHaveBeenCalled();
            expect(consoleWarnSpy).not.toHaveBeenCalled();
            expect(consoleErrorSpy).not.toHaveBeenCalled();
        });
    });

    describe('message formatting', () => {
        it('should log messages with level badge', () => {
            const logger = new Logger({ useColors: false });
            logger.info('test message');
            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls[0][0];
            expect(output).toContain('[INFO]');
            expect(output).toContain('test message');
        });

        it('should log messages with additional data', () => {
            const logger = new Logger({ useColors: false });
            logger.info('test', { key: 'value' });
            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls[0][0];
            expect(output).toContain('test');
            expect(output).toContain('key');
        });

        it('should format JSON output correctly', () => {
            const logger = new Logger({ useJson: true });
            logger.info('test message', { extra: 'data' });
            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls[0][0];
            const parsed = JSON.parse(output);

            expect(parsed.level).toBe('INFO');
            expect(parsed.message).toBe('test message');
            expect(parsed.data).toEqual({ extra: 'data' });
            expect(parsed.timestamp).toBeDefined();
        });

        it('should format error objects', () => {
            const logger = new Logger({ useColors: false });
            const error = new Error('Test error');
            logger.error('Error occurred', error);

            expect(consoleErrorSpy).toHaveBeenCalled();
            const output = consoleErrorSpy.mock.calls[0][0];
            expect(output).toContain('Error occurred');
            expect(output).toContain('Test error');
        });
    });

    describe('success method', () => {
        it('should log success messages', () => {
            const logger = new Logger({ level: LogLevel.INFO });
            logger.success('Operation successful');
            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls[0][0];
            expect(output).toContain('SUCCESS');
            expect(output).toContain('Operation successful');
        });

        it('should not log success when level is WARN', () => {
            const logger = new Logger({ level: LogLevel.WARN });
            logger.success('Operation successful');
            expect(consoleLogSpy).not.toHaveBeenCalled();
        });
    });

    describe('timers', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should start and end timers', () => {
            const logger = new Logger({ level: LogLevel.DEBUG });

            logger.startTimer('test-operation');
            expect(consoleDebugSpy).toHaveBeenCalledWith(expect.stringContaining('Timer started: test-operation'));

            jest.advanceTimersByTime(1000);

            const duration = logger.endTimer('test-operation');
            expect(duration).toBeGreaterThan(0);
        });

        it('should warn when ending non-existent timer', () => {
            const logger = new Logger({ level: LogLevel.WARN });
            const duration = logger.endTimer('non-existent');

            expect(consoleWarnSpy).toHaveBeenCalled();
            expect(duration).toBe(0);
        });

        it('should track multiple timers independently', () => {
            const logger = new Logger({ level: LogLevel.DEBUG });

            logger.startTimer('timer1');
            jest.advanceTimersByTime(500);
            logger.startTimer('timer2');
            jest.advanceTimersByTime(500);

            const duration1 = logger.endTimer('timer1');
            const duration2 = logger.endTimer('timer2');

            expect(duration1).toBeGreaterThan(duration2);
        });
    });

    describe('environment detection', () => {
        const originalEnv = process.env;

        beforeEach(() => {
            process.env = { ...originalEnv };
        });

        afterEach(() => {
            process.env = originalEnv;
        });

        it('should respect NO_COLOR environment variable', () => {
            process.env.NO_COLOR = '1';
            const logger = new Logger();
            logger.info('test');

            const output = consoleLogSpy.mock.calls[0][0];
            expect(output).not.toContain('\x1b[');
        });

        it('should detect CI environment', () => {
            process.env.CI = 'true';
            const logger = new Logger();
            logger.info('test');

            const output = consoleLogSpy.mock.calls[0][0];
            // Should output JSON in CI
            expect(() => JSON.parse(output)).not.toThrow();
        });

        it('should detect GitHub Actions', () => {
            process.env.GITHUB_ACTIONS = 'true';
            const logger = new Logger();
            logger.info('test');

            const output = consoleLogSpy.mock.calls[0][0];
            // Should output JSON in GitHub Actions
            expect(() => JSON.parse(output)).not.toThrow();
        });
    });

    describe('color handling', () => {
        it('should include colors when enabled', () => {
            const logger = new Logger({ useColors: true });
            logger.info('test');

            const output = consoleLogSpy.mock.calls[0][0];
            expect(output).toContain('\x1b['); // Should contain ANSI codes
        });

        it('should not include colors when disabled', () => {
            const logger = new Logger({ useColors: false });
            logger.info('test');

            const output = consoleLogSpy.mock.calls[0][0];
            expect(output).not.toContain('\x1b[');
        });

        it('should use different colors for different log levels', () => {
            const logger = new Logger({ useColors: true, level: LogLevel.DEBUG });

            logger.debug('debug');
            logger.info('info');
            logger.warn('warn');
            logger.error('error');

            // Each level should have been called
            expect(consoleDebugSpy).toHaveBeenCalled();
            expect(consoleLogSpy).toHaveBeenCalled();
            expect(consoleWarnSpy).toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalled();
        });
    });
});
