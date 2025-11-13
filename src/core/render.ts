export class CommitRenderer {
    /**
     * Format commit message with proper wrapping
     */
    format(message: string, width: number = 72): string {
        const lines = message.split('\n');
        const formatted: string[] = [];

        for (const line of lines) {
            if (line.length <= width || line.startsWith('#')) {
                formatted.push(line);
            } else {
                formatted.push(...this.wrapLine(line, width));
            }
        }

        return formatted.join('\n');
    }

    /**
     * Validate commit message format
     */
    validate(message: string): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        const lines = message.split('\n');
        const subject = lines[0];

        // Subject validations
        if (subject.length > 72) {
            errors.push('Subject line too long (max 72 characters)');
        }

        if (subject.endsWith('.')) {
            errors.push('Subject should not end with period');
        }

        const conventionalRegex = /^(feat|fix|docs|style|refactor|perf|test|chore)(\(.+\))?!?: .+/;
        if (!conventionalRegex.test(subject)) {
            errors.push('Subject does not follow Conventional Commit format');
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    private wrapLine(line: string, width: number): string[] {
        const words = line.split(' ');
        const wrapped: string[] = [];
        let current = '';

        for (const word of words) {
            if ((current + ' ' + word).trim().length <= width) {
                current = current ? `${current} ${word}` : word;
            } else {
                if (current) wrapped.push(current);
                current = word;
            }
        }

        if (current) wrapped.push(current);
        return wrapped;
    }
}

export class PRRenderer {
    /**
     * Format PR description with proper markdown
     */
    format(sections: Record<string, string>): string {
        const parts: string[] = [];

        if (sections.summary) {
            parts.push('## Summary\n');
            parts.push(sections.summary);
            parts.push('');
        }

        if (sections.changes) {
            parts.push('## Changes\n');
            parts.push(sections.changes);
            parts.push('');
        }

        if (sections.breaking) {
            parts.push('## Breaking Changes\n');
            parts.push(sections.breaking);
            parts.push('');
        }

        if (sections.migration) {
            parts.push('## Migration Steps\n');
            parts.push(sections.migration);
            parts.push('');
        }

        if (sections.testing) {
            parts.push('## Testing\n');
            parts.push(sections.testing);
            parts.push('');
        }

        return parts.join('\n');
    }
}
