import { execSync } from 'child_process';
import { logger } from '../utils/logger.js';

export interface DiffOptions {
    staged?: boolean;
    range?: string;
    contextLines?: number;
}

export interface FileChange {
    path: string;
    additions: number;
    deletions: number;
    status: 'added' | 'modified' | 'deleted' | 'renamed';
    oldPath?: string; // For renamed files
}

export interface CommitOptions {
    message: string;
    noVerify?: boolean;
    amend?: boolean;
    allowEmpty?: boolean;
}

export class GitError extends Error {
    constructor(
        message: string,
        public readonly command: string,
        public readonly exitCode: number,
        public readonly stderr: string
    ) {
        super(message);
        this.name = 'GitError';
    }
}

export class GitService {
    private cwd: string;

    constructor(cwd: string = process.cwd()) {
        this.cwd = cwd;
        this.validateGitRepository();
    }

    /**
     * Validate that the current directory is a git repository
     */
    private validateGitRepository(): void {
        try {
            this.exec(['rev-parse', '--git-dir'], { silent: true });
        } catch (error) {
            throw new GitError(
                'Not a git repository. Run this command from inside a git repository.',
                'git rev-parse --git-dir',
                1,
                'fatal: not a git repository'
            );
        }
    }

    /**
     * Check if git is installed and accessible
     */
    static isGitAvailable(): boolean {
        try {
            execSync('git --version', { stdio: 'ignore' });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get git version
     */
    getGitVersion(): string {
        const output = this.exec(['--version']);
        const match = output.match(/git version (\d+\.\d+\.\d+)/);
        return match ? match[1] : 'unknown';
    }

    /**
     * Get diff content based on options
     */
    getDiff(options: DiffOptions = {}): string {
        const args = ['diff', '--no-color'];

        // Add context lines (default to 0 for compact diffs)
        const contextLines = options.contextLines ?? 0;
        args.push(`-U${contextLines}`);

        if (options.staged) {
            args.push('--staged');
        } else if (options.range) {
            args.push(options.range);
        }

        const output = this.exec(args, { allowEmpty: true });

        if (!output.trim()) {
            if (options.staged) {
                throw new GitError(
                    'No staged changes found. Use `git add` to stage files first.',
                    'git diff --staged',
                    0,
                    ''
                );
            } else if (options.range) {
                throw new GitError(
                    `No changes found in range: ${options.range}`,
                    `git diff ${options.range}`,
                    0,
                    ''
                );
            }
        }

        return output;
    }

    /**
     * Get list of changed files with detailed status
     */
    getChangedFiles(options: DiffOptions = {}): FileChange[] {
        // Use --name-status for status and --numstat for line counts
        const statusArgs = ['diff', '--name-status'];
        const numstatArgs = ['diff', '--numstat'];

        if (options.staged) {
            statusArgs.push('--staged');
            numstatArgs.push('--staged');
        } else if (options.range) {
            statusArgs.push(options.range);
            numstatArgs.push(options.range);
        }

        const statusOutput = this.exec(statusArgs, { allowEmpty: true });
        const numstatOutput = this.exec(numstatArgs, { allowEmpty: true });

        if (!statusOutput.trim()) {
            return [];
        }

        const statusMap = this.parseNameStatus(statusOutput);
        const numstatMap = this.parseNumstat(numstatOutput);

        // Merge the two maps
        const files: FileChange[] = [];
        for (const [filePath, status] of Object.entries(statusMap)) {
            const stats = numstatMap.get(filePath) || { additions: 0, deletions: 0 };
            files.push({
                path: filePath,
                status: status.status,
                oldPath: status.oldPath,
                additions: stats.additions,
                deletions: stats.deletions,
            });
        }

        return files;
    }

    /**
     * Get recent commit messages for a file
     */
    getFileHistory(filePath: string, limit: number = 5): string[] {
        // Check if file exists in git history
        try {
            const output = this.exec([
                'log',
                '-n',
                String(limit),
                '--pretty=format:%s',
                '--follow', // Follow renames
                '--',
                filePath,
            ], { allowEmpty: true });

            return output.split('\n').filter(Boolean);
        } catch (error) {
            // File might not have history yet
            return [];
        }
    }

    /**
     * Get current branch name
     */
    getCurrentBranch(): string {
        try {
            return this.exec(['rev-parse', '--abbrev-ref', 'HEAD']).trim();
        } catch (error) {
            // Might be in detached HEAD state
            try {
                const sha = this.exec(['rev-parse', 'HEAD']).trim();
                return `detached at ${sha.substring(0, 7)}`;
            } catch {
                throw new GitError(
                    'Unable to determine current branch',
                    'git rev-parse --abbrev-ref HEAD',
                    1,
                    'fatal: not a valid ref'
                );
            }
        }
    }

    /**
     * Check if repository has uncommitted changes
     */
    hasUncommittedChanges(): boolean {
        try {
            const output = this.exec(['status', '--porcelain'], { allowEmpty: true });
            return output.trim().length > 0;
        } catch {
            return false;
        }
    }

    /**
     * Check if there are staged changes
     */
    hasStagedChanges(): boolean {
        try {
            const output = this.exec(['diff', '--staged', '--name-only'], { allowEmpty: true });
            return output.trim().length > 0;
        } catch {
            return false;
        }
    }

    /**
     * Create a commit with the given message
     */
    createCommit(options: CommitOptions): void {
        const args = ['commit', '-F', '-'];

        if (options.noVerify) {
            args.push('--no-verify');
        }

        if (options.amend) {
            args.push('--amend');
        }

        if (options.allowEmpty) {
            args.push('--allow-empty');
        }

        try {
            this.exec(args, { input: options.message });
        } catch (error: any) {
            // Check if it's a GitError and contains "nothing to commit" in stderr
            if (error instanceof GitError && error.stderr?.includes('nothing to commit')) {
                throw new GitError(
                    'Nothing to commit. Stage your changes with `git add` first.',
                    'git commit',
                    1,
                    'nothing to commit, working tree clean'
                );
            }
            // Or if it's a raw error with the message
            if (error.message?.includes('nothing to commit')) {
                throw new GitError(
                    'Nothing to commit. Stage your changes with `git add` first.',
                    'git commit',
                    1,
                    'nothing to commit, working tree clean'
                );
            }
            throw error;
        }
    }

    /**
     * Get repository root directory
     */
    getRepositoryRoot(): string {
        return this.exec(['rev-parse', '--show-toplevel']).trim();
    }

    /**
     * Get remote URL for a given remote name
     */
    getRemoteUrl(remoteName: string = 'origin'): string | null {
        try {
            return this.exec(['remote', 'get-url', remoteName], { allowEmpty: true }).trim();
        } catch {
            return null;
        }
    }

    /**
     * Parse GitHub/GitLab repository info from remote URL
     */
    parseRemoteInfo(remoteUrl: string): { owner: string; repo: string; platform: string } | null {
        // GitHub SSH: git@github.com:owner/repo.git
        // GitHub HTTPS: https://github.com/owner/repo.git
        // GitLab SSH: git@gitlab.com:owner/repo.git
        // GitLab HTTPS: https://gitlab.com/owner/repo.git

        const patterns = [
            /git@(github|gitlab)\.com:(.+?)\/(.+?)\.git$/,
            /https:\/\/(github|gitlab)\.com\/(.+?)\/(.+?)(\.git)?$/,
        ];

        for (const pattern of patterns) {
            const match = remoteUrl.match(pattern);
            if (match) {
                return {
                    platform: match[1],
                    owner: match[2],
                    repo: match[3].replace(/\.git$/, ''),
                };
            }
        }

        return null;
    }

    /**
     * Execute git command with error handling
     */
    private exec(
        args: string[],
        options: { input?: string; silent?: boolean; allowEmpty?: boolean } = {}
    ): string {
        const cmd = `git ${args.join(' ')}`;

        try {
            const result = execSync(cmd, {
                cwd: this.cwd,
                input: options.input,
                encoding: 'utf-8',
                stdio: options.input ? 'pipe' : undefined,
                maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large diffs
            });

            return result.toString();
        } catch (error: any) {
            const stderr = error.stderr?.toString() || error.message || '';
            const exitCode = error.status || 1;

            if (options.allowEmpty && exitCode === 0) {
                return '';
            }

            if (!options.silent) {
                throw new GitError(
                    `Git command failed: ${cmd}`,
                    cmd,
                    exitCode,
                    stderr
                );
            }

            throw error;
        }
    }

    /**
     * Parse git name-status output
     */
    private parseNameStatus(output: string): Record<string, { status: FileChange['status']; oldPath?: string }> {
        const lines = output.split('\n').filter(Boolean);
        const result: Record<string, { status: FileChange['status']; oldPath?: string }> = {};

        for (const line of lines) {
            const parts = line.split('\t');

            // Validate we have at least status and path
            if (parts.length < 2) {
                logger.warn('Malformed git name-status line (insufficient parts):', line);
                continue;
            }

            const statusCode = parts[0];

            let status: FileChange['status'];
            let filePath: string;
            let oldPath: string | undefined;

            if (statusCode.startsWith('R')) {
                // Renamed file: R100  old-path  new-path
                if (parts.length < 3) {
                    logger.warn('Malformed git name-status line (renamed file missing paths):', line);
                    continue;
                }
                status = 'renamed';
                oldPath = parts[1];
                filePath = parts[2];
            } else if (statusCode === 'A') {
                status = 'added';
                filePath = parts[1];
            } else if (statusCode === 'D') {
                status = 'deleted';
                filePath = parts[1];
            } else {
                status = 'modified';
                filePath = parts[1];
            }

            result[filePath] = { status, oldPath };
        }

        return result;
    }

    /**
     * Parse git numstat output
     */
    private parseNumstat(output: string): Map<string, { additions: number; deletions: number }> {
        const lines = output.split('\n').filter(Boolean);
        const result = new Map<string, { additions: number; deletions: number }>();

        for (const line of lines) {
            const parts = line.split('\t');
            if (parts.length < 3) continue;

            const [additions, deletions, ...pathParts] = parts;
            const filePath = pathParts.join('\t'); // Handle filenames with tabs

            result.set(filePath, {
                additions: additions === '-' ? 0 : parseInt(additions, 10),
                deletions: deletions === '-' ? 0 : parseInt(deletions, 10),
            });
        }

        return result;
    }
}
