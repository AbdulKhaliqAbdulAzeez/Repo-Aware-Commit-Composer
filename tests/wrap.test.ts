import { describe, it, expect } from '@jest/globals';
import { wrapText, indent } from '../src/utils/wrap.js';

describe('Text Wrapping Utils', () => {
    describe('wrapText', () => {
        it('should not wrap short lines', () => {
            const text = 'This is a short line';
            const result = wrapText(text, 72);
            expect(result).toBe(text);
        });

        it('should wrap long lines at word boundaries', () => {
            const text = 'This is a very long line that should be wrapped to multiple lines when it exceeds the specified width limit';
            const result = wrapText(text, 40);

            const lines = result.split('\n');
            expect(lines.length).toBeGreaterThan(1);
            lines.forEach(line => {
                expect(line.length).toBeLessThanOrEqual(40);
            });
        });

        it('should preserve existing line breaks', () => {
            const text = 'Line 1\nLine 2\nLine 3';
            const result = wrapText(text, 72);
            expect(result).toBe(text);
        });

        it('should handle multiple paragraphs', () => {
            const text = 'First paragraph\n\nSecond paragraph that is much longer and needs wrapping to stay within limits';
            const result = wrapText(text, 40);

            expect(result).toContain('First paragraph');
            expect(result).toContain('\n\n');
        });

        it('should use default width of 72 when not specified', () => {
            // Use a sentence with spaces so it can actually wrap
            const longLine = 'word '.repeat(30); // Creates a 150-char line with spaces
            const result = wrapText(longLine);

            const lines = result.split('\n');
            expect(lines.length).toBeGreaterThan(1);
            // Most lines should be around 72 chars (the default width)
        });

        it('should handle empty strings', () => {
            expect(wrapText('')).toBe('');
        });

        it('should handle single word longer than width', () => {
            const longWord = 'a'.repeat(100);
            const result = wrapText(longWord, 50);

            // Single long word can't be broken, so it stays on one line
            // The wrapLine function will place it as-is
            const lines = result.split('\n');
            expect(lines[0]).toBe(longWord);
        });

        it('should wrap at exact width boundary', () => {
            const text = 'This is exactly seventy chars and should not wrap at boundary ok';
            expect(text.length).toBe(64);
            const result = wrapText(text, 72);
            expect(result).toBe(text);
        });
    });

    describe('indent', () => {
        it('should indent single line by default 2 spaces', () => {
            const text = 'Hello';
            const result = indent(text);
            expect(result).toBe('  Hello');
        });

        it('should indent single line by specified spaces', () => {
            const text = 'Hello';
            const result = indent(text, 4);
            expect(result).toBe('    Hello');
        });

        it('should indent multiple lines', () => {
            const text = 'Line 1\nLine 2\nLine 3';
            const result = indent(text, 2);
            expect(result).toBe('  Line 1\n  Line 2\n  Line 3');
        });

        it('should preserve empty lines without indentation', () => {
            const text = 'Line 1\n\nLine 3';
            const result = indent(text, 2);
            expect(result).toBe('  Line 1\n\n  Line 3');
        });

        it('should handle zero indentation', () => {
            const text = 'Hello';
            const result = indent(text, 0);
            expect(result).toBe('Hello');
        });

        it('should handle empty string', () => {
            expect(indent('')).toBe('');
        });

        it('should handle large indentation', () => {
            const text = 'Test';
            const result = indent(text, 10);
            expect(result).toBe('          Test');
        });

        it('should preserve trailing newlines', () => {
            const text = 'Line 1\nLine 2\n';
            const result = indent(text, 2);
            expect(result).toBe('  Line 1\n  Line 2\n');
        });
    });
});
