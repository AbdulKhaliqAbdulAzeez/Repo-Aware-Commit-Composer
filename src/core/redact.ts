import { logger } from '../utils/logger.js';

export interface RedactionResult {
    redacted: string;
    foundSecrets: number;
    patterns: string[];
}

export class RedactionService {
    private patterns: Array<{ name: string; regex: RegExp }> = [
        // API keys - various formats (more permissive)
        { name: 'stripe-key', regex: /sk_(live|test)_[\w]{24,}/g },
        { name: 'api-key', regex: /['\"]?api[_-]?key['\"]?\s*[:=]\s*['\"][\w\-]{20,}['\"]?/gi },
        { name: 'openai-key', regex: /sk-[\w]{20,}/g },
        { name: 'aws-key', regex: /AKIA[0-9A-Z]{16}/g },

        // Bearer tokens
        { name: 'bearer-token', regex: /bearer\s+[\w\-\.]+/gi },

        // Generic secrets
        { name: 'generic-secret', regex: /['\"]?secret['\"]?\s*[:=]\s*['\"][\w\-]{8,}['\"]?/gi },
        { name: 'password', regex: /['\"]?password['\"]?\s*[:=]\s*['\"][\w\-@!#$%^&*()+=]{6,}['\"]?/gi },
        { name: 'token', regex: /['\"]?token['\"]?\s*[:=]\s*['\"][\w\-]{20,}['\"]?/gi },

        // JWT tokens
        { name: 'jwt', regex: /eyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+/g },

        // Private keys
        { name: 'private-key', regex: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
        { name: 'ssh-key', regex: /ssh-(rsa|dsa|ed25519)\s+[A-Za-z0-9+\/]{100,}/g },

        // Database connection strings
        { name: 'db-connection', regex: /(mongodb|mysql|postgresql|postgres):\/\/[^\s'"]+:[^\s'"]+@[^\s'"]+/gi },

        // OAuth tokens
        { name: 'oauth', regex: /['\"]?access_token['\"]?\s*[:=]\s*['\"][\w\-\.]+['\"]?/gi },

        // GitHub tokens
        { name: 'github-token', regex: /gh[pousr]_[A-Za-z0-9]{36}/g },

        // Slack tokens
        { name: 'slack-token', regex: /xox[baprs]-[0-9]+-[0-9]+-[a-zA-Z0-9]+/g },

        // Generic credentials pattern
        { name: 'credentials', regex: /['\"]?credentials?['\"]?\s*[:=]\s*\{[^}]{10,}\}/gi },
    ];    /**
     * Redact sensitive information from text
     */
    redact(text: string): string {
        let redacted = text;

        for (const { regex } of this.patterns) {
            // Reset regex state to prevent lastIndex corruption
            regex.lastIndex = 0;
            redacted = redacted.replace(regex, '[REDACTED]');
        }

        return redacted;
    }

    /**
     * Redact with detailed information about what was found
     */
    redactWithInfo(text: string): RedactionResult {
        let redacted = text;
        let foundSecrets = 0;
        const matchedPatterns: string[] = [];

        for (const { name, regex } of this.patterns) {
            // Reset regex state to prevent lastIndex corruption
            regex.lastIndex = 0;
            const matches = text.match(regex);
            if (matches && matches.length > 0) {
                foundSecrets += matches.length;
                matchedPatterns.push(name);
                // Reset again before replace
                regex.lastIndex = 0;
                redacted = redacted.replace(regex, '[REDACTED]');
                logger.debug(`Redacted ${matches.length} instance(s) of ${name}`);
            }
        }

        return {
            redacted,
            foundSecrets,
            patterns: matchedPatterns,
        };
    }

    /**
     * Check if text contains sensitive information
     */
    hasSensitiveData(text: string): boolean {
        return this.patterns.some(({ regex }) => {
            // Reset regex state for testing
            regex.lastIndex = 0;
            return regex.test(text);
        });
    }

    /**
     * Add custom redaction pattern
     */
    addPattern(name: string, pattern: RegExp): void {
        this.patterns.push({ name, regex: pattern });
        logger.debug(`Added custom redaction pattern: ${name}`);
    }

    /**
     * Get list of pattern names
     */
    getPatternNames(): string[] {
        return this.patterns.map(({ name }) => name);
    }

    /**
     * Redact a git diff safely while preserving structure
     */
    redactDiff(diff: string): string {
        const lines = diff.split('\n');
        const redactedLines = lines.map((line) => {
            // Don't redact diff metadata lines
            if (
                line.startsWith('diff --git') ||
                line.startsWith('index ') ||
                line.startsWith('---') ||
                line.startsWith('+++') ||
                line.startsWith('@@')
            ) {
                return line;
            }

            // Redact actual content lines
            return this.redact(line);
        });

        return redactedLines.join('\n');
    }

    /**
     * Scan for common false positives and provide warnings
     */
    scanForFalsePositives(text: string): string[] {
        const warnings: string[] = [];

        // Example: check if "password" appears in test fixtures
        if (text.includes('fixtures') && text.match(/password/i)) {
            warnings.push('Found "password" in fixtures - may be test data');
        }

        // Check for common placeholder patterns
        if (text.match(/example\.com|test\.com|placeholder|<.*>/)) {
            warnings.push('Found placeholder patterns - some matches may be examples');
        }

        return warnings;
    }
}

