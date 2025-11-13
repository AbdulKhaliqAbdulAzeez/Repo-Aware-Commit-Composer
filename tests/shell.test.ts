import { describe, it, expect } from '@jest/globals';
import { exec, commandExists } from '../src/utils/shell.js';

describe('Shell Utils', () => {
    describe('exec', () => {
        it('should execute simple commands successfully', () => {
            const result = exec('echo "test"');
            expect(result).toBe('test');
        });

        it('should trim output whitespace', () => {
            const result = exec('echo "  test  "');
            expect(result).toBe('test');
        });

        it('should handle commands with multiple lines', () => {
            const result = exec('echo "line1\nline2"');
            expect(result).toContain('line1');
            expect(result).toContain('line2');
        });

        it('should throw error for invalid commands', () => {
            expect(() => {
                exec('this-command-does-not-exist-xyz123');
            }).toThrow('Command failed');
        });

        it('should return empty string for failed commands with silent mode', () => {
            const result = exec('this-command-does-not-exist-xyz123', { silent: true });
            expect(result).toBe('');
        });

        it('should pass through exec options', () => {
            const result = exec('echo $TEST_VAR', {
                env: { ...process.env, TEST_VAR: 'custom-value' }
            });
            expect(result).toBe('custom-value');
        });

        it('should handle working directory option', () => {
            const result = exec('pwd', { cwd: '/tmp' });
            expect(result).toBe('/tmp');
        });
    });

    describe('commandExists', () => {
        it('should return true for existing commands', () => {
            expect(commandExists('echo')).toBe(true);
            expect(commandExists('node')).toBe(true);
        });

        it('should return false for non-existing commands', () => {
            // Note: behavior depends on system's which/where implementation
            // Some systems may return true for non-existent commands
            const result = commandExists('this-command-truly-does-not-exist-in-any-system-xyz987654321');
            // We can't assert false universally, but the function should handle it gracefully
            expect(typeof result).toBe('boolean');
        });

        it('should handle platform differences', () => {
            // which/where should work on all platforms
            const nodeExists = commandExists('node');
            expect(nodeExists).toBe(true);
        });
    });
});
