import { ContextAnalysis } from './context.js';
import { Message } from './model.js';
import { RedactionService } from './redact.js';
import { logger } from '../utils/logger.js';

export interface PromptOptions {
    width?: number;
    emoji?: boolean;
    type?: string;
    scope?: string;
    breaking?: boolean;
    issue?: string;
    includeDiff?: boolean;
    maxDiffLines?: number;
}

export class PromptBuilder {
    private redactionService: RedactionService;

    constructor() {
        this.redactionService = new RedactionService();
    }

    /**
     * Build commit message prompt
     */
    buildCommitPrompt(context: ContextAnalysis, options: PromptOptions, diff?: string): Message[] {
        const systemMessage = this.getCommitSystemPrompt(options);
        const userMessage = this.getCommitUserMessage(context, options, diff);

        return [
            { role: 'system', content: systemMessage },
            { role: 'user', content: userMessage },
        ];
    }

    /**
     * Build PR description prompt
     */
    buildPRPrompt(
        context: ContextAnalysis,
        baseBranch: string,
        headBranch: string,
        diff?: string
    ): Message[] {
        const systemMessage = this.getPRSystemPrompt();
        const userMessage = this.getPRUserMessage(context, baseBranch, headBranch, diff);

        return [
            { role: 'system', content: systemMessage },
            { role: 'user', content: userMessage },
        ];
    }

    private getCommitSystemPrompt(options: PromptOptions): string {
        return `You are an expert at writing Conventional Commit messages.

Generate a commit message following these rules:
1. Format: <type>(<scope>): <subject>
2. Types: feat, fix, docs, style, refactor, perf, test, chore
3. Subject line max ${options.width || 72} characters
4. No period at end of subject
5. Use imperative mood (e.g., "add" not "added")
6. Body should explain what and why, not how
7. Wrap body at ${options.width || 72} characters
${options.breaking ? '8. Include BREAKING CHANGE: footer if applicable' : ''}
${options.emoji ? '9. Prepend emoji: feat 🚀, fix 🐛, docs 📝, refactor ♻️, test ✅, perf ⚡, chore 🧹' : ''}

Return only the commit message, no explanation.`;
    }

    private getCommitUserMessage(context: ContextAnalysis, options: PromptOptions, diff?: string): string {
        let message = `Generate a commit message for these changes:\n\n`;
        message += `Summary: ${context.summary}\n\n`;

        if (options.type) {
            message += `Type: ${options.type}\n`;
        } else if (context.type) {
            message += `Detected type: ${context.type.type} (confidence: ${(context.type.confidence * 100).toFixed(0)}%)\n`;
        }

        if (options.scope) {
            message += `Scope: ${options.scope}\n`;
        } else if (context.scope.scopes.length > 0) {
            message += `Detected scope: ${context.scope.scopes.join(', ')}\n`;
        }

        message += `\nFiles changed (${context.files.length}):\n`;
        context.files.forEach((file) => {
            message += `- ${file.path} (+${file.additions}/-${file.deletions}) [${file.magnitude}]`;
            if (file.keywords.length > 0) {
                message += ` - keywords: ${file.keywords.slice(0, 3).join(', ')}`;
            }
            message += `\n`;
        });

        // Include breaking change info
        if (context.breaking) {
            message += `\n⚠️ Breaking changes detected\n`;
        }

        // Include diff if provided and requested
        if (diff && options.includeDiff) {
            const redactedDiff = this.redactionService.redactDiff(diff);
            const truncatedDiff = this.truncateDiff(redactedDiff, options.maxDiffLines || 100);
            message += `\nDiff preview:\n\`\`\`diff\n${truncatedDiff}\n\`\`\`\n`;
            logger.debug(`Included ${truncatedDiff.split('\n').length} lines of diff in prompt`);
        }

        if (options.issue && options.issue !== 'off') {
            message += `\nLinked issue: ${options.issue}\n`;
        }

        return message;
    }

    private getPRSystemPrompt(): string {
        return `You are an expert at writing PR descriptions.

Generate a structured PR description with these sections:
1. Summary - Executive summary of changes
2. Changes - Detailed bullet list of modifications
3. Breaking Changes - Any breaking changes and why
4. Migration Steps - If applicable, how to migrate
5. Testing - How to test these changes

Use markdown formatting. Be concise but complete.`;
    }

    private getPRUserMessage(
        context: ContextAnalysis,
        base: string,
        head: string,
        diff?: string
    ): string {
        let message = `Generate a PR description for merging ${head} into ${base}:\n\n`;
        message += `Summary: ${context.summary}\n\n`;

        message += `Change type: ${context.type.type}\n`;
        if (context.breaking) {
            message += `⚠️ Contains breaking changes\n`;
        }

        message += `\nFiles changed (${context.files.length}):\n`;

        context.files.forEach((file) => {
            message += `- ${file.path} (+${file.additions}/-${file.deletions}) [${file.magnitude}]\n`;
            if (file.summary) {
                message += `  ${file.summary}\n`;
            }
        });

        // Include diff preview if available
        if (diff) {
            const redactedDiff = this.redactionService.redactDiff(diff);
            const truncatedDiff = this.truncateDiff(redactedDiff, 150);
            message += `\nDiff preview:\n\`\`\`diff\n${truncatedDiff}\n\`\`\`\n`;
        }

        return message;
    }

    /**
     * Truncate diff to specified number of lines
     */
    private truncateDiff(diff: string, maxLines: number): string {
        const lines = diff.split('\n');

        if (lines.length <= maxLines) {
            return diff;
        }

        const truncated = lines.slice(0, maxLines);
        const remaining = lines.length - maxLines;
        truncated.push(`\n... (${remaining} more lines omitted)`);

        return truncated.join('\n');
    }
}
