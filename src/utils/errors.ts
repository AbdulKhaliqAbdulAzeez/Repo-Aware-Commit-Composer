import { logger } from './logger.js';
import { GitError } from '../core/git.js';

export interface ErrorContext {
    command?: string;
    file?: string;
    suggestion?: string;
    docsUrl?: string;
}

/**
 * Base error class for application errors
 */
export class ApplicationError extends Error {
    constructor(
        message: string,
        public readonly context?: ErrorContext,
        public readonly exitCode: number = 1
    ) {
        super(message);
        this.name = 'ApplicationError';
    }
}

/**
 * Configuration error
 */
export class ConfigError extends ApplicationError {
    constructor(message: string, context?: ErrorContext) {
        super(message, context, 1);
        this.name = 'ConfigError';
    }
}

/**
 * API error (OpenAI, etc.)
 */
export class APIError extends ApplicationError {
    constructor(
        message: string,
        public readonly statusCode?: number,
        context?: ErrorContext
    ) {
        super(message, context, 1);
        this.name = 'APIError';
    }
}

/**
 * Validation error
 */
export class ValidationError extends ApplicationError {
    constructor(message: string, context?: ErrorContext) {
        super(message, context, 1);
        this.name = 'ValidationError';
    }
}

/**
 * Format error message with context and suggestions
 */
export function formatError(error: Error | ApplicationError): string {
    const parts: string[] = [];

    // Error type
    parts.push(`✗ ${error.name}: ${error.message}`);

    // Context
    if (error instanceof ApplicationError && error.context) {
        const { command, file, suggestion, docsUrl } = error.context;

        if (command) {
            parts.push(`  Command: ${command}`);
        }

        if (file) {
            parts.push(`  File: ${file}`);
        }

        if (suggestion) {
            parts.push(`\n💡 Suggestion: ${suggestion}`);
        }

        if (docsUrl) {
            parts.push(`\n📖 Docs: ${docsUrl}`);
        }
    }

    // Special handling for GitError
    if (error instanceof GitError) {
        parts.push(`  Command: ${error.command}`);

        if (error.exitCode !== 0) {
            parts.push(`  Exit code: ${error.exitCode}`);
        }

        // Add suggestions for common git errors
        const suggestion = getGitErrorSuggestion(error);
        if (suggestion) {
            parts.push(`\n💡 Suggestion: ${suggestion}`);
        }
    }

    return parts.join('\n');
}

/**
 * Get helpful suggestions for common git errors
 */
function getGitErrorSuggestion(error: GitError): string | null {
    const { message, stderr } = error;
    const combined = `${message} ${stderr}`.toLowerCase();

    if (combined.includes('not a git repository')) {
        return 'Run this command from inside a git repository, or initialize one with `git init`';
    }

    if (combined.includes('no staged changes') || combined.includes('nothing to commit')) {
        return 'Stage your changes first with `git add <files>`';
    }

    if (combined.includes('no changes found')) {
        return 'Ensure you have committed or staged changes in the specified range';
    }

    if (combined.includes('detached head')) {
        return 'You are in detached HEAD state. Create a branch with `git checkout -b <branch-name>`';
    }

    if (combined.includes('merge conflict')) {
        return 'Resolve merge conflicts first, then stage the resolved files';
    }

    if (combined.includes('permission denied')) {
        return 'Check file permissions or try running with appropriate access rights';
    }

    return null;
}

/**
 * Get helpful suggestions for API errors
 */
function getAPIErrorSuggestion(error: APIError): string | null {
    const { message, statusCode } = error;
    const lowerMessage = message.toLowerCase();

    if (statusCode === 401 || lowerMessage.includes('unauthorized') || lowerMessage.includes('api key')) {
        return 'Check that your OPENAI_API_KEY environment variable is set correctly';
    }

    if (statusCode === 429 || lowerMessage.includes('rate limit')) {
        return 'You have exceeded the API rate limit. Wait a moment and try again';
    }

    if (statusCode === 500 || statusCode === 502 || statusCode === 503) {
        return 'The API service is experiencing issues. Try again in a few moments';
    }

    if (lowerMessage.includes('timeout')) {
        return 'The request timed out. Check your network connection or try again';
    }

    if (lowerMessage.includes('quota')) {
        return 'You have exceeded your API quota. Check your OpenAI account billing';
    }

    return null;
}

/**
 * Get helpful suggestions for config errors
 */
function getConfigErrorSuggestion(error: ConfigError): string | null {
    const lowerMessage = error.message.toLowerCase();

    if (lowerMessage.includes('yaml') || lowerMessage.includes('parse')) {
        return 'Check your .aicmt.yaml file for syntax errors. Use a YAML validator if needed';
    }

    if (lowerMessage.includes('invalid') || lowerMessage.includes('validation')) {
        return 'Review the configuration documentation and ensure all required fields are present';
    }

    if (lowerMessage.includes('not found') || lowerMessage.includes('missing')) {
        return 'Create a .aicmt.yaml file in your repository root or home directory';
    }

    return null;
}

/**
 * Handle errors gracefully with user-friendly messages
 */
export function handleError(error: unknown, debug: boolean = false): never {
    let formattedError: string;
    let exitCode = 1;

    if (error instanceof ApplicationError) {
        formattedError = formatError(error);
        exitCode = error.exitCode;

        // Add type-specific suggestions
        if (error instanceof APIError) {
            const suggestion = getAPIErrorSuggestion(error);
            if (suggestion && !error.context?.suggestion) {
                formattedError += `\n💡 Suggestion: ${suggestion}`;
            }
        } else if (error instanceof ConfigError) {
            const suggestion = getConfigErrorSuggestion(error);
            if (suggestion && !error.context?.suggestion) {
                formattedError += `\n💡 Suggestion: ${suggestion}`;
            }
        }
    } else if (error instanceof GitError) {
        formattedError = formatError(error);
        exitCode = error.exitCode;
    } else if (error instanceof Error) {
        formattedError = `✗ Error: ${error.message}`;

        if (debug && error.stack) {
            formattedError += `\n\nStack trace:\n${error.stack}`;
        }
    } else {
        formattedError = `✗ Unknown error: ${String(error)}`;
    }

    logger.error(formattedError);

    if (debug && error instanceof Error && error.stack) {
        logger.debug('Full stack trace:', error.stack);
    }

    process.exit(exitCode);
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    debug: boolean = false
): T {
    return (async (...args: any[]) => {
        try {
            return await fn(...args);
        } catch (error) {
            handleError(error, debug);
        }
    }) as T;
}

/**
 * Assert condition and throw error if false
 */
export function assert(
    condition: boolean,
    message: string,
    context?: ErrorContext
): asserts condition {
    if (!condition) {
        throw new ValidationError(message, context);
    }
}

/**
 * Validate that a value is defined
 */
export function assertDefined<T>(
    value: T | null | undefined,
    message: string,
    context?: ErrorContext
): asserts value is T {
    if (value === null || value === undefined) {
        throw new ValidationError(message, context);
    }
}
