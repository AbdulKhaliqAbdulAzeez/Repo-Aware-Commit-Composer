import { describe, it, expect, beforeEach } from '@jest/globals';
import { CommitRenderer } from '../src/core/render';

describe('CommitRenderer', () => {
    let renderer: CommitRenderer;

    beforeEach(() => {
        renderer = new CommitRenderer();
    });

    describe('format', () => {
        it('should wrap long lines to specified width', () => {
            const longMessage = 'feat: this is a very long commit message that should be wrapped to the specified width limit';
            const formatted = renderer.format(longMessage, 72);

            const lines = formatted.split('\n');
            lines.forEach((line) => {
                expect(line.length).toBeLessThanOrEqual(72);
            });
        });

        it('should preserve short lines', () => {
            const message = 'feat: short message';
            const formatted = renderer.format(message, 72);

            expect(formatted).toBe(message);
        });
    });

    describe('validate', () => {
        it('should accept valid conventional commit', () => {
            const message = 'feat(auth): add login functionality';
            const result = renderer.validate(message);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject subject with trailing period', () => {
            const message = 'feat: add feature.';
            const result = renderer.validate(message);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Subject should not end with period');
        });

        it('should reject subject longer than 72 characters', () => {
            const message = 'feat: this is a very long subject line that exceeds the maximum allowed length of seventy-two characters';
            const result = renderer.validate(message);

            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.includes('too long'))).toBe(true);
        });

        it('should reject non-conventional format', () => {
            const message = 'this is not a conventional commit';
            const result = renderer.validate(message);

            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.includes('Conventional Commit'))).toBe(true);
        });
    });
});
