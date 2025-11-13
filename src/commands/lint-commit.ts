import { Command, Args, Flags } from '@oclif/core';
import { readFileSync, existsSync } from 'fs';
import { logger } from '../utils/logger.js';

interface LintResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export default class LintCommit extends Command {
    static description = 'Lint a commit message file according to Conventional Commit standards';

    static args = {
        file: Args.string({ description: 'Path to commit message file', required: true }),
    };

    static flags = {
        strict: Flags.boolean({ description: 'Enable strict mode (warnings become errors)', default: false }),
        'max-length': Flags.integer({ description: 'Maximum subject line length', default: 72 }),
        'allow-emoji': Flags.boolean({ description: 'Allow emojis in commit message', default: true }),
    };

    async run(): Promise<void> {
        const { args, flags } = await this.parse(LintCommit);

        try {
            if (!existsSync(args.file)) {
                this.error(`File not found: ${args.file}`);
            }

            const message = readFileSync(args.file, 'utf-8');
            const result = this.lintMessage(message, flags);

            // Display warnings
            if (result.warnings.length > 0) {
                this.log('⚠️  Warnings:');
                result.warnings.forEach(warning => this.log(`  - ${warning}`));
                this.log('');
            }

            // Handle errors
            if (result.errors.length > 0) {
                this.log('❌ Errors:');
                result.errors.forEach(error => this.log(`  - ${error}`));
                this.log('');
                this.error(`Commit message has ${result.errors.length} error(s)`);
            }

            // In strict mode, warnings become errors
            if (flags.strict && result.warnings.length > 0) {
                this.error(`Strict mode: ${result.warnings.length} warning(s) treated as errors`);
            }

            this.log('✅ Commit message is valid');
        } catch (error) {
            logger.error('Lint commit command failed', { error });
            if (error instanceof Error && !error.message.includes('EEXIT')) {
                this.error(error.message);
            }
            throw error;
        }
    }

    private lintMessage(message: string, flags: any): LintResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Parse message
        const lines = message.trim().split('\n');
        const subject = lines[0];
        const body = lines.slice(2).join('\n'); // Skip blank line after subject

        // === Subject Line Validation ===

        // Length check
        if (subject.length === 0) {
            errors.push('Subject line is empty');
            return { valid: false, errors, warnings };
        }

        if (subject.length > flags['max-length']) {
            errors.push(`Subject line too long (${subject.length} > ${flags['max-length']} characters)`);
        }

        // Period check
        if (subject.endsWith('.')) {
            errors.push('Subject line should not end with a period');
        }

        // Conventional Commit format
        const conventionalRegex = /^(feat|fix|docs|style|refactor|perf|test|chore|build|ci|revert)(\([a-z0-9\-\/]+\))?(!)?:\s+.+/;
        const emojiRegex = /^(🚀|🐛|📝|♻️|✅|⚡|🧹|🔧|🔨|⏪)\s+/;

        let subjectToCheck = subject;

        // Handle emoji prefix if allowed
        if (flags['allow-emoji'] && emojiRegex.test(subject)) {
            subjectToCheck = subject.replace(emojiRegex, '');
        }

        if (!conventionalRegex.test(subjectToCheck)) {
            errors.push(
                'Subject does not follow Conventional Commit format: ' +
                '<type>(<scope>): <description> or <type>: <description>'
            );
        } else {
            // Extract type and validate
            const match = subjectToCheck.match(conventionalRegex);
            if (match) {
                const scope = match[2];
                const breaking = match[3];
                const description = subjectToCheck.split(': ')[1];

                // Check description starts with lowercase
                if (description && /^[A-Z]/.test(description)) {
                    warnings.push('Subject description should start with lowercase letter');
                }

                // Check for imperative mood (common violations)
                if (description) {
                    const badStarts = ['added', 'adding', 'adds', 'fixed', 'fixing', 'fixes', 'updated', 'updating', 'updates'];
                    const firstWord = description.split(' ')[0].toLowerCase();
                    if (badStarts.includes(firstWord)) {
                        warnings.push(`Use imperative mood: "${firstWord}" should be "${firstWord.replace(/e?d$/, '').replace(/ing$/, '').replace(/es$/, '').replace(/s$/, '')}"`);
                    }
                }

                // Check scope format
                if (scope && !/^\([a-z0-9\-\/]+\)$/.test(scope)) {
                    warnings.push('Scope should be lowercase with hyphens');
                }

                // Warn if breaking change marker but no BREAKING CHANGE footer
                if (breaking && !body.includes('BREAKING CHANGE:')) {
                    warnings.push('Breaking change marker (!) present but no BREAKING CHANGE: footer found');
                }
            }
        }

        // === Body Validation ===

        if (body.length > 0) {
            // Check blank line after subject
            if (lines.length > 1 && lines[1].trim() !== '') {
                errors.push('Body must be separated from subject by a blank line');
            }

            // Check line length in body
            const bodyLines = lines.slice(2);
            bodyLines.forEach((line, idx) => {
                if (line.length > 100 && !line.startsWith('http')) {
                    warnings.push(`Body line ${idx + 3} is too long (${line.length} > 100 characters)`);
                }
            });

            // Check for BREAKING CHANGE footer format
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
}
