import * as util from 'util';

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    SILENT = 4,
}

export interface LoggerOptions {
    level?: LogLevel;
    useColors?: boolean;
    useJson?: boolean;
    timestamps?: boolean;
}

interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    data?: any;
    duration?: number;
}

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
};

export class Logger {
    private level: LogLevel;
    private useColors: boolean;
    private useJson: boolean;
    private timestamps: boolean;
    private timers: Map<string, number>;

    constructor(options: LoggerOptions = {}) {
        this.level = options.level ?? LogLevel.INFO;
        this.useColors = options.useColors ?? this.shouldUseColors();
        this.useJson = options.useJson ?? this.isCI();
        this.timestamps = options.timestamps ?? false;
        this.timers = new Map();
    }

    /**
     * Determine if colors should be used based on environment
     */
    private shouldUseColors(): boolean {
        // Respect NO_COLOR environment variable
        if (process.env.NO_COLOR) {
            return false;
        }

        // Check if running in a TTY
        return process.stdout.isTTY ?? false;
    }

    /**
     * Check if running in CI environment
     */
    private isCI(): boolean {
        return process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
    }

    /**
     * Format a log message
     */
    private format(level: string, message: string, color: string, data?: any): string {
        if (this.useJson) {
            const entry: LogEntry = {
                timestamp: new Date().toISOString(),
                level: level.toUpperCase(),
                message,
            };

            if (data !== undefined) {
                entry.data = data;
            }

            return JSON.stringify(entry);
        }

        const parts: string[] = [];

        // Timestamp
        if (this.timestamps) {
            const timestamp = new Date().toISOString();
            parts.push(this.colorize(timestamp, colors.gray));
        }

        // Level badge
        const badge = `[${level.toUpperCase()}]`;
        parts.push(this.colorize(badge, color));

        // Message
        parts.push(message);

        // Additional data
        if (data !== undefined) {
            const formatted = typeof data === 'object'
                ? util.inspect(data, { colors: this.useColors, depth: 3 })
                : String(data);
            parts.push(formatted);
        }

        return parts.join(' ');
    }

    /**
     * Apply color to text
     */
    private colorize(text: string, color: string): string {
        if (!this.useColors) {
            return text;
        }
        return `${color}${text}${colors.reset}`;
    }

    /**
     * Log a debug message
     */
    debug(message: string, data?: any): void {
        if (this.level <= LogLevel.DEBUG) {
            const formatted = this.format('debug', message, colors.gray, data);
            console.debug(formatted);
        }
    }

    /**
     * Log an info message
     */
    info(message: string, data?: any): void {
        if (this.level <= LogLevel.INFO) {
            const formatted = this.format('info', message, colors.blue, data);
            console.log(formatted);
        }
    }

    /**
     * Log a success message
     */
    success(message: string, data?: any): void {
        if (this.level <= LogLevel.INFO) {
            const formatted = this.format('success', message, colors.green, data);
            console.log(formatted);
        }
    }

    /**
     * Log a warning message
     */
    warn(message: string, data?: any): void {
        if (this.level <= LogLevel.WARN) {
            const formatted = this.format('warn', message, colors.yellow, data);
            console.warn(formatted);
        }
    }

    /**
     * Log an error message
     */
    error(message: string, error?: Error | any): void {
        if (this.level <= LogLevel.ERROR) {
            const data = error instanceof Error
                ? { message: error.message, stack: error.stack }
                : error;

            const formatted = this.format('error', message, colors.red, data);
            console.error(formatted);
        }
    }

    /**
     * Start a performance timer
     */
    startTimer(label: string): void {
        this.timers.set(label, Date.now());
        this.debug(`Timer started: ${label}`);
    }

    /**
     * End a performance timer and log duration
     */
    endTimer(label: string): number {
        const start = this.timers.get(label);
        if (!start) {
            this.warn(`Timer '${label}' was never started`);
            return 0;
        }

        const duration = Date.now() - start;
        this.timers.delete(label);

        const formatted = `${label}: ${duration}ms`;
        this.debug(formatted);

        return duration;
    }

    /**
     * Log with custom formatting (for progress indicators, etc.)
     */
    raw(message: string): void {
        if (this.level !== LogLevel.SILENT) {
            process.stdout.write(message);
        }
    }

    /**
     * Clear the current line (useful for progress indicators)
     */
    clearLine(): void {
        if (this.level !== LogLevel.SILENT && process.stdout.isTTY) {
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
        }
    }

    /**
     * Create a simple spinner
     */
    spinner(message: string): () => void {
        if (this.level === LogLevel.SILENT || !process.stdout.isTTY) {
            return () => { }; // No-op
        }

        const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        let i = 0;

        const interval = setInterval(() => {
            this.clearLine();
            this.raw(`${frames[i]} ${message}`);
            i = (i + 1) % frames.length;
        }, 80);

        return () => {
            clearInterval(interval);
            this.clearLine();
        };
    }

    /**
     * Set log level
     */
    setLevel(level: LogLevel): void {
        this.level = level;
    }

    /**
     * Get current log level
     */
    getLevel(): LogLevel {
        return this.level;
    }

    /**
     * Enable/disable colors
     */
    setColors(enabled: boolean): void {
        this.useColors = enabled;
    }

    /**
     * Enable/disable JSON output
     */
    setJson(enabled: boolean): void {
        this.useJson = enabled;
    }

    /**
     * Enable/disable timestamps
     */
    setTimestamps(enabled: boolean): void {
        this.timestamps = enabled;
    }

    /**
     * Create a child logger with a prefix
     */
    child(prefix: string): Logger {
        const child = new Logger({
            level: this.level,
            useColors: this.useColors,
            useJson: this.useJson,
            timestamps: this.timestamps,
        });

        // Wrap methods to add prefix
        const originalDebug = child.debug.bind(child);
        const originalInfo = child.info.bind(child);
        const originalWarn = child.warn.bind(child);
        const originalError = child.error.bind(child);

        child.debug = (msg, data?) => originalDebug(`[${prefix}] ${msg}`, data);
        child.info = (msg, data?) => originalInfo(`[${prefix}] ${msg}`, data);
        child.warn = (msg, data?) => originalWarn(`[${prefix}] ${msg}`, data);
        child.error = (msg, err?) => originalError(`[${prefix}] ${msg}`, err);

        return child;
    }
}

// Global logger instance
export const logger = new Logger({
    level: process.env.DEBUG ? LogLevel.DEBUG : LogLevel.INFO,
});
