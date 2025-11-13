import { describe, it, expect } from '@jest/globals';

// Since lint-commit uses internal linting logic, we'll test the validation behavior
// through the lens of what a valid/invalid commit message looks like

interface LintResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

// Extracted linting logic from lint-commit command
function lintMessage(message: string, flags: { 'max-length': number; 'allow-emoji': boolean }): LintResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const lines = message.trim().split('\n');
    const subject = lines[0];
    const body = lines.slice(2).join('\n');

    // Subject validation
    if (subject.length === 0) {
        errors.push('Subject line is empty');
        return { valid: false, errors, warnings };
    }

    if (subject.length > flags['max-length']) {
        errors.push(`Subject line too long (${subject.length} > ${flags['max-length']} characters)`);
    }

    if (subject.endsWith('.')) {
        errors.push('Subject line should not end with a period');
    }

    const conventionalRegex = /^(feat|fix|docs|style|refactor|perf|test|chore|build|ci|revert)(\([a-z0-9\-\/]+\))?(!)?:\s+.+/;
    const emojiRegex = /^(🚀|🐛|📝|♻️|✅|⚡|🧹|🔧|🔨|⏪)\s+/;

    let subjectToCheck = subject;

    if (flags['allow-emoji'] && emojiRegex.test(subject)) {
        subjectToCheck = subject.replace(emojiRegex, '');
    }

    if (!conventionalRegex.test(subjectToCheck)) {
        errors.push(
            'Subject does not follow Conventional Commit format: ' +
            '<type>(<scope>): <description> or <type>: <description>'
        );
    } else {
        const match = subjectToCheck.match(conventionalRegex);
        if (match) {
            const scope = match[2];
            const breaking = match[3];
            const description = subjectToCheck.split(': ')[1];

            if (description && /^[A-Z]/.test(description)) {
                warnings.push('Subject description should start with lowercase letter');
            }

            if (description) {
                const badStarts = ['added', 'adding', 'adds', 'fixed', 'fixing', 'fixes', 'updated', 'updating', 'updates'];
                const firstWord = description.split(' ')[0].toLowerCase();
                if (badStarts.includes(firstWord)) {
                    warnings.push(`Use imperative mood: "${firstWord}" should be "${firstWord.replace(/e?d$/, '').replace(/ing$/, '').replace(/es$/, '').replace(/s$/, '')}"`);
                }
            }

            if (scope && !/^\([a-z0-9\-\/]+\)$/.test(scope)) {
                warnings.push('Scope should be lowercase with hyphens');
            }

            if (breaking && !body.includes('BREAKING CHANGE:')) {
                warnings.push('Breaking change marker (!) present but no BREAKING CHANGE: footer found');
            }
        }
    }

    // Body validation
    if (body.length > 0) {
        if (lines.length > 1 && lines[1].trim() !== '') {
            errors.push('Body must be separated from subject by a blank line');
        }

        const bodyLines = lines.slice(2);
        bodyLines.forEach((line, idx) => {
            if (line.length > 100 && !line.startsWith('http')) {
                warnings.push(`Body line ${idx + 3} is too long (${line.length} > 100 characters)`);
            }
        });

        if (body.includes('BREAKING CHANGE:')) {
            const breakingMatch = body.match(/BREAKING CHANGE:\s*(.+)/);
            if (breakingMatch && breakingMatch[1].trim().length === 0) {
                errors.push('BREAKING CHANGE: footer must have a description');
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

describe('Lint Commit Message Validation', () => {
    const defaultFlags = { 'max-length': 72, 'allow-emoji': false };

    describe('valid commit messages', () => {
        it('should pass for valid conventional commit', () => {
            const result = lintMessage('feat: add new feature', defaultFlags);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should pass for commit with scope', () => {
            const result = lintMessage('fix(auth): resolve login issue', defaultFlags);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should pass for commit with breaking change', () => {
            const message = `feat(api)!: change response format\n\nBREAKING CHANGE: API now returns data in different format`;
            const result = lintMessage(message, defaultFlags);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should pass for commit with body', () => {
            const message = `fix: resolve memory leak\n\nThis fixes the memory leak in the data processing module\nby properly disposing of resources.`;
            const result = lintMessage(message, defaultFlags);
            expect(result.valid).toBe(true);
        });

        it('should pass for different commit types', () => {
            const types = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'build', 'ci', 'revert'];

            for (const type of types) {
                const result = lintMessage(`${type}: update something`, defaultFlags);
                expect(result.valid).toBe(true);
            }
        });
    });

    describe('invalid commit messages', () => {
        it('should fail for empty message', () => {
            const result = lintMessage('', defaultFlags);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Subject line is empty');
        });

        it('should fail for subject ending with period', () => {
            const result = lintMessage('feat: add new feature.', defaultFlags);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Subject line should not end with a period');
        });

        it('should fail for subject too long', () => {
            const message = 'feat: ' + 'a'.repeat(100);
            const result = lintMessage(message, defaultFlags);
            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('Subject line too long');
        });

        it('should fail for non-conventional format', () => {
            const result = lintMessage('Add new feature', defaultFlags);
            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('Conventional Commit format');
        });

        it('should fail for invalid type', () => {
            const result = lintMessage('invalid: do something', defaultFlags);
            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('Conventional Commit format');
        });

        it('should fail for missing description', () => {
            const result = lintMessage('feat:', defaultFlags);
            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('Conventional Commit format');
        });

        it('should fail when body not separated by blank line', () => {
            // In the implementation, lines[1] would be "Body without blank line" which is not blank
            // Body is lines.slice(2), so we need at least 3 lines to have a body
            const messageWithBody = 'feat: add feature\nBody without blank line\nMore content';
            const result = lintMessage(messageWithBody, defaultFlags);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Body must be separated from subject by a blank line');
        });

        it('should respect custom max-length', () => {
            const message = 'feat: ' + 'a'.repeat(50); // 56 chars total

            // Should fail with max-length of 50
            const result1 = lintMessage(message, { 'max-length': 50, 'allow-emoji': false });
            expect(result1.valid).toBe(false);

            // Should pass with increased max-length
            const result2 = lintMessage(message, { 'max-length': 100, 'allow-emoji': false });
            expect(result2.valid).toBe(true);
        });

        it('should handle allow-emoji flag', () => {
            const message = '🚀 feat: add feature';

            // Should fail without allow-emoji
            const result1 = lintMessage(message, defaultFlags);
            expect(result1.valid).toBe(false);

            // Should pass with allow-emoji
            const result2 = lintMessage(message, { 'max-length': 72, 'allow-emoji': true });
            expect(result2.valid).toBe(true);
        });
    });
});
