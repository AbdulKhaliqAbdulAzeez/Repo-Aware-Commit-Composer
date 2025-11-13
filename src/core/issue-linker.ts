import { GitService } from './git.js';
import { logger } from '../utils/logger.js';

/**
 * Issue information extracted from branch name
 */
export interface IssueInfo {
    id: string;
    pattern: string; // Which pattern matched
    url?: string;
}

/**
 * Options for issue linking
 */
export interface IssueLinkOptions {
    mode: 'auto' | 'off' | string; // 'auto', 'off', or explicit issue ID
    patterns?: string[]; // Custom regex patterns
    linkTemplate?: string; // URL template
}

/**
 * IssueLinker extracts issue references from branch names
 * and generates URLs for issue trackers
 */
export class IssueLinker {
    private defaultPatterns = [
        // GitHub/GitLab style: feat/123, fix/456
        /(?:feat|fix|chore|docs|refactor|perf|test|style)\/(\d+)/i,

        // JIRA style: PROJ-123, ABC-456
        /([A-Z]+-\d+)/,

        // Issue prefix: issue-123, issue/456
        /issue[-\/](\d+)/i,

        // Hash style: #123
        /#(\d+)/,

        // Simple numbers at end: feature-name-123
        /[-_](\d+)$/,
    ];

    constructor(private git: GitService) { }

    /**
     * Extract issue information based on options
     */
    extractIssue(options: IssueLinkOptions): IssueInfo | null {
        // Handle explicit mode (off)
        if (options.mode === 'off') {
            return null;
        }

        // Handle explicit issue ID
        if (options.mode && options.mode !== 'auto') {
            return {
                id: options.mode,
                pattern: 'explicit',
                url: this.generateUrl(options.mode, options.linkTemplate),
            };
        }

        // Auto mode: detect from branch name
        if (options.mode === 'auto') {
            return this.detectFromBranch(options.patterns, options.linkTemplate);
        }

        return null;
    }

    /**
     * Detect issue from current branch name
     */
    private detectFromBranch(
        customPatterns?: string[],
        linkTemplate?: string
    ): IssueInfo | null {
        const branchName = this.git.getCurrentBranch();
        logger.debug('Detecting issue from branch', { branchName });

        // Skip special branches
        if (this.isSpecialBranch(branchName)) {
            logger.debug('Skipping special branch', { branchName });
            return null;
        }

        // Build pattern list
        const patterns = this.buildPatterns(customPatterns);

        // Try each pattern
        for (const pattern of patterns) {
            const match = branchName.match(pattern.regex);
            if (match && match[1]) {
                const issueId = match[1];
                logger.debug('Issue detected', { issueId, pattern: pattern.source });

                return {
                    id: issueId,
                    pattern: pattern.source,
                    url: this.generateUrl(issueId, linkTemplate),
                };
            }
        }

        logger.debug('No issue detected from branch name');
        return null;
    }

    /**
     * Build list of patterns to try
     */
    private buildPatterns(customPatterns?: string[]): Array<{ regex: RegExp; source: string }> {
        const patterns: Array<{ regex: RegExp; source: string }> = [];

        // Add custom patterns first (higher priority)
        if (customPatterns && customPatterns.length > 0) {
            for (const pattern of customPatterns) {
                try {
                    patterns.push({
                        regex: new RegExp(pattern),
                        source: `custom: ${pattern}`,
                    });
                } catch (error) {
                    logger.warn(`Invalid custom pattern: ${pattern}`, error);
                }
            }
        }

        // Add default patterns
        for (let i = 0; i < this.defaultPatterns.length; i++) {
            patterns.push({
                regex: this.defaultPatterns[i],
                source: `default-${i}`,
            });
        }

        return patterns;
    }

    /**
     * Generate issue URL from template
     */
    private generateUrl(issueId: string, template?: string): string | undefined {
        if (!template) {
            // Try to infer from git remote
            return this.inferUrlFromRemote(issueId);
        }

        // Replace placeholders in template
        return template.replace(/\{issue\}/g, issueId).replace(/\{id\}/g, issueId);
    }

    /**
     * Infer issue URL from git remote
     */
    private inferUrlFromRemote(issueId: string): string | undefined {
        const remoteUrl = this.git.getRemoteUrl();
        if (!remoteUrl) {
            return undefined;
        }

        const info = this.git.parseRemoteInfo(remoteUrl);
        if (!info) {
            return undefined;
        }

        // Generate URL based on platform
        switch (info.platform) {
            case 'github':
                return `https://github.com/${info.owner}/${info.repo}/issues/${issueId}`;
            case 'gitlab':
                return `https://gitlab.com/${info.owner}/${info.repo}/-/issues/${issueId}`;
            default:
                return undefined;
        }
    }

    /**
     * Check if branch is a special branch (main, master, develop, etc.)
     */
    private isSpecialBranch(branchName: string): boolean {
        const specialBranches = [
            'main',
            'master',
            'develop',
            'development',
            'staging',
            'production',
            'HEAD',
        ];

        return specialBranches.some(
            (special) =>
                branchName === special || branchName.startsWith(`detached at`)
        );
    }

    /**
     * Extract all issue references from text (for PR body, commit messages, etc.)
     */
    extractFromText(text: string, customPatterns?: string[]): IssueInfo[] {
        const issues: IssueInfo[] = [];
        const seenIds = new Set<string>();
        const patterns = this.buildPatterns(customPatterns);

        for (const pattern of patterns) {
            const matches = text.matchAll(new RegExp(pattern.regex.source, 'g'));

            for (const match of matches) {
                if (match[1] && !seenIds.has(match[1])) {
                    seenIds.add(match[1]);
                    issues.push({
                        id: match[1],
                        pattern: pattern.source,
                    });
                }
            }
        }

        return issues;
    }

    /**
     * Format issue reference for commit footer
     */
    formatFooter(issue: IssueInfo): string {
        if (issue.url) {
            return `Closes ${issue.url}`;
        }
        return `Closes #${issue.id}`;
    }

    /**
     * Format issue reference for PR description
     */
    formatPRReference(issue: IssueInfo): string {
        if (issue.url) {
            return `Resolves [#${issue.id}](${issue.url})`;
        }
        return `Resolves #${issue.id}`;
    }
}
