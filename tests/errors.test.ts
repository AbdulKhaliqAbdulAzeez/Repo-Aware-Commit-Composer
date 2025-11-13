import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
    ApplicationError,
    ConfigError,
    APIError,
    ValidationError,
    formatError,
    assert,
    assertDefined,
    withErrorHandling,
} from '../src/utils/errors.js';
import { GitError } from '../src/core/git.js';

describe('Error Utils', () => {
    describe('ApplicationError', () => {
        it('should create error with message', () => {
            const error = new ApplicationError('Test error');
            expect(error.message).toBe('Test error');
            expect(error.name).toBe('ApplicationError');
            expect(error.exitCode).toBe(1);
        });

        it('should create error with context', () => {
            const context = {
                command: 'test-command',
                file: 'test.txt',
                suggestion: 'Try this',
                docsUrl: 'https://docs.example.com',
            };
            const error = new ApplicationError('Test error', context);
            expect(error.context).toEqual(context);
        });

        it('should create error with custom exit code', () => {
            const error = new ApplicationError('Test error', undefined, 2);
            expect(error.exitCode).toBe(2);
        });
    });

    describe('ConfigError', () => {
        it('should create config error', () => {
            const error = new ConfigError('Invalid config');
            expect(error.message).toBe('Invalid config');
            expect(error.name).toBe('ConfigError');
            expect(error.exitCode).toBe(1);
        });

        it('should create config error with context', () => {
            const context = { file: '.aicmt.yaml' };
            const error = new ConfigError('Invalid config', context);
            expect(error.context).toEqual(context);
        });
    });

    describe('APIError', () => {
        it('should create API error', () => {
            const error = new APIError('API failed');
            expect(error.message).toBe('API failed');
            expect(error.name).toBe('APIError');
        });

        it('should create API error with status code', () => {
            const error = new APIError('Unauthorized', 401);
            expect(error.statusCode).toBe(401);
        });

        it('should create API error with context', () => {
            const context = { suggestion: 'Check API key' };
            const error = new APIError('Unauthorized', 401, context);
            expect(error.context).toEqual(context);
        });
    });

    describe('ValidationError', () => {
        it('should create validation error', () => {
            const error = new ValidationError('Invalid input');
            expect(error.message).toBe('Invalid input');
            expect(error.name).toBe('ValidationError');
        });
    });

    describe('formatError', () => {
        it('should format basic error', () => {
            const error = new Error('Test error');
            const formatted = formatError(error);
            expect(formatted).toContain('Error: Test error');
        });

        it('should format ApplicationError with context', () => {
            const error = new ApplicationError('Test error', {
                command: 'test-cmd',
                file: 'test.txt',
                suggestion: 'Try again',
                docsUrl: 'https://docs.example.com',
            });
            const formatted = formatError(error);
            expect(formatted).toContain('ApplicationError: Test error');
            expect(formatted).toContain('Command: test-cmd');
            expect(formatted).toContain('File: test.txt');
            expect(formatted).toContain('Suggestion: Try again');
            expect(formatted).toContain('Docs: https://docs.example.com');
        });

        it('should format GitError with suggestions', () => {
            const error = new GitError('Not a git repository', 'git status', 128, '');
            const formatted = formatError(error);
            expect(formatted).toContain('GitError');
            expect(formatted).toContain('Command: git status');
            expect(formatted).toContain('Exit code: 128');
            expect(formatted).toContain('Run this command from inside a git repository');
        });

        it('should suggest staging changes for empty commits', () => {
            const error = new GitError('nothing to commit', 'git commit', 1, 'nothing to commit');
            const formatted = formatError(error);
            expect(formatted).toContain('Stage your changes first');
        });

        it('should suggest creating branch for detached HEAD', () => {
            const error = new GitError('detached HEAD', 'git commit', 1, 'detached head');
            const formatted = formatError(error);
            expect(formatted).toContain('Create a branch');
        });

        it('should suggest resolving conflicts', () => {
            const error = new GitError('merge conflict', 'git commit', 1, 'merge conflict');
            const formatted = formatError(error);
            expect(formatted).toContain('Resolve merge conflicts');
        });
    });

    describe('assert', () => {
        it('should not throw for truthy conditions', () => {
            expect(() => assert(true, 'Should not throw')).not.toThrow();
            expect(() => assert(1 === 1, 'Should not throw')).not.toThrow();
        });

        it('should throw ValidationError for falsy conditions', () => {
            expect(() => assert(false, 'Test failed')).toThrow(ValidationError);
            expect(() => assert(false, 'Test failed')).toThrow('Test failed');
        });

        it('should throw with context', () => {
            const context = { file: 'test.txt' };
            expect(() => {
                assert(false, 'Test failed', context);
            }).toThrow(ValidationError);

            try {
                assert(false, 'Test failed', context);
            } catch (error) {
                expect(error).toBeInstanceOf(ValidationError);
                expect((error as ValidationError).context).toEqual(context);
            }
        });
    });

    describe('assertDefined', () => {
        it('should not throw for defined values', () => {
            expect(() => assertDefined('value', 'Should not throw')).not.toThrow();
            expect(() => assertDefined(0, 'Should not throw')).not.toThrow();
            expect(() => assertDefined(false, 'Should not throw')).not.toThrow();
        });

        it('should throw for null', () => {
            expect(() => assertDefined(null, 'Value is null')).toThrow(ValidationError);
            expect(() => assertDefined(null, 'Value is null')).toThrow('Value is null');
        });

        it('should throw for undefined', () => {
            expect(() => assertDefined(undefined, 'Value is undefined')).toThrow(ValidationError);
        });

        it('should narrow type after assertion', () => {
            const value: string | null = 'test';
            assertDefined(value, 'Must be defined');
            // Type should be narrowed to string
            const length: number = value.length;
            expect(length).toBe(4);
        });
    });

    describe('withErrorHandling', () => {
        let exitSpy: jest.SpiedFunction<typeof process.exit>;
        let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

        beforeEach(() => {
            // Mock process.exit to prevent test termination
            exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: string | number | null) => {
                throw new Error(`Process exited with code ${code}`);
            }) as any) as jest.SpiedFunction<typeof process.exit>;

            // Mock console.error to suppress error output
            consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        });

        afterEach(() => {
            exitSpy.mockRestore();
            consoleErrorSpy.mockRestore();
        });

        it('should return result for successful function', async () => {
            const fn = async (x: number) => x * 2;
            const wrapped = withErrorHandling(fn);
            const result = await wrapped(5);
            expect(result).toBe(10);
        });

        it('should handle errors and exit', async () => {
            const fn = async () => {
                throw new Error('Test error');
            };
            const wrapped = withErrorHandling(fn);

            await expect(wrapped()).rejects.toThrow('Process exited with code 1');
            expect(exitSpy).toHaveBeenCalledWith(1);
        });

        it('should handle ApplicationError with custom exit code', async () => {
            const fn = async () => {
                throw new ApplicationError('Test error', undefined, 2);
            };
            const wrapped = withErrorHandling(fn);

            await expect(wrapped()).rejects.toThrow('Process exited with code 2');
            expect(exitSpy).toHaveBeenCalledWith(2);
        });

        it('should pass arguments through', async () => {
            const fn = async (a: number, b: number) => a + b;
            const wrapped = withErrorHandling(fn);
            const result = await wrapped(3, 4);
            expect(result).toBe(7);
        });
    });
});
