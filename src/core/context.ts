import { GitService, FileChange } from './git.js';
import { logger } from '../utils/logger.js';

/**
 * Represents analysis of changes for a single file
 */
export interface FileAnalysis {
    path: string;
    status: 'added' | 'modified' | 'deleted' | 'renamed';
    additions: number;
    deletions: number;
    magnitude: 'tiny' | 'small' | 'medium' | 'large' | 'massive';
    keywords: string[];
    functions: string[];
    classes: string[];
    summary: string;
}

/**
 * Represents detected commit type and confidence
 */
export interface TypeDetection {
    type: 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'perf' | 'test' | 'chore';
    confidence: number; // 0-1
    reasons: string[];
}

/**
 * Represents detected scope and confidence
 */
export interface ScopeDetection {
    scopes: string[];
    confidence: number; // 0-1
    reasons: string[];
}

/**
 * Complete context analysis result
 */
export interface ContextAnalysis {
    files: FileAnalysis[];
    type: TypeDetection;
    scope: ScopeDetection;
    breaking: boolean;
    summary: string;
    totalAdditions: number;
    totalDeletions: number;
}

/**
 * Options for context building
 */
export interface ContextOptions {
    staged?: boolean;
    range?: string;
    scopeMap?: Record<string, string>;
}

/**
 * ContextBuilder analyzes git diffs to extract meaningful context
 * for AI-powered commit message generation
 */
export class ContextBuilder {
    constructor(private git: GitService) { }

    /**
     * Build comprehensive context from current changes
     */
    async buildContext(options: ContextOptions = {}): Promise<ContextAnalysis> {
        logger.debug('Building context from git changes', options);

        // Get changed files
        const changes = this.git.getChangedFiles({
            staged: options.staged,
            range: options.range,
        });

        if (changes.length === 0) {
            throw new Error('No changes found to analyze');
        }

        // Analyze each file
        const files = await Promise.all(
            changes.map((change) => this.analyzeFile(change))
        );

        // Calculate totals
        const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
        const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);

        // Detect type
        const type = this.detectType(files);

        // Detect scope
        const scope = this.detectScope(files, options.scopeMap);

        // Check for breaking changes
        const breaking = this.detectBreakingChanges(files);

        // Generate summary
        const summary = this.generateSummary(files, type, scope);

        logger.debug('Context built successfully', {
            fileCount: files.length,
            type: type.type,
            scope: scope.scopes,
            breaking,
        });

        return {
            files,
            type,
            scope,
            breaking,
            summary,
            totalAdditions,
            totalDeletions,
        };
    }

    /**
     * Analyze a single file change
     */
    private async analyzeFile(change: FileChange): Promise<FileAnalysis> {
        const keywords = this.extractKeywords(change.path);
        const magnitude = this.calculateMagnitude(change.additions, change.deletions);

        // Extract function and class names from diff
        // For now, returning empty arrays - will enhance in next iteration
        const functions: string[] = [];
        const classes: string[] = [];

        const summary = this.summarizeFileChange(change);

        return {
            path: change.path,
            status: change.status,
            additions: change.additions,
            deletions: change.deletions,
            magnitude,
            keywords,
            functions,
            classes,
            summary,
        };
    }

    /**
     * Extract meaningful keywords from file path
     */
    private extractKeywords(filePath: string): string[] {
        const keywords: string[] = [];
        const path = filePath.toLowerCase();

        // File type keywords
        if (path.endsWith('.test.ts') || path.endsWith('.test.js') || path.endsWith('.spec.ts')) {
            keywords.push('test');
        }
        if (path.endsWith('.md') || path.includes('docs/') || path.includes('documentation/')) {
            keywords.push('docs');
        }
        if (path.endsWith('.css') || path.endsWith('.scss') || path.endsWith('.less')) {
            keywords.push('style');
        }
        if (path.includes('config') || path.endsWith('.config.js') || path.endsWith('.config.ts')) {
            keywords.push('config');
        }

        // Directory-based keywords
        if (path.includes('src/')) keywords.push('source');
        if (path.includes('lib/')) keywords.push('library');
        if (path.includes('api/')) keywords.push('api');
        if (path.includes('ui/') || path.includes('components/')) keywords.push('ui');
        if (path.includes('utils/') || path.includes('helpers/')) keywords.push('utils');
        if (path.includes('core/')) keywords.push('core');
        if (path.includes('tests/')) keywords.push('test');

        // Package management
        if (path === 'package.json' || path === 'package-lock.json') {
            keywords.push('dependencies');
        }
        if (path === 'yarn.lock' || path === 'pnpm-lock.yaml') {
            keywords.push('dependencies');
        }

        // Build/CI
        if (path.includes('.github/') || path.includes('.gitlab/')) {
            keywords.push('ci');
        }
        if (path.includes('webpack') || path.includes('vite') || path.includes('rollup')) {
            keywords.push('build');
        }

        return keywords;
    }

    /**
     * Calculate change magnitude
     */
    private calculateMagnitude(
        additions: number,
        deletions: number
    ): 'tiny' | 'small' | 'medium' | 'large' | 'massive' {
        const total = additions + deletions;

        if (total <= 10) return 'tiny';
        if (total <= 50) return 'small';
        if (total <= 200) return 'medium';
        if (total <= 500) return 'large';
        return 'massive';
    }

    /**
     * Generate a summary for a file change
     */
    private summarizeFileChange(change: FileChange): string {
        const { path, status, additions, deletions } = change;

        switch (status) {
            case 'added':
                return `Added ${path}`;
            case 'deleted':
                return `Deleted ${path}`;
            case 'renamed':
                return `Renamed ${change.oldPath} to ${path}`;
            case 'modified':
                if (additions > deletions * 2) {
                    return `Expanded ${path} (+${additions} lines)`;
                } else if (deletions > additions * 2) {
                    return `Reduced ${path} (-${deletions} lines)`;
                } else {
                    return `Modified ${path} (+${additions}, -${deletions})`;
                }
            default:
                return `Changed ${path}`;
        }
    }

    /**
     * Detect commit type from file analysis
     */
    private detectType(files: FileAnalysis[]): TypeDetection {
        const scores = {
            feat: 0,
            fix: 0,
            docs: 0,
            style: 0,
            refactor: 0,
            perf: 0,
            test: 0,
            chore: 0,
        };

        const reasons: string[] = [];

        for (const file of files) {
            // Test files
            if (file.keywords.includes('test')) {
                scores.test += 3;
                reasons.push(`Test file: ${file.path}`);
            }

            // Documentation
            if (file.keywords.includes('docs')) {
                scores.docs += 3;
                reasons.push(`Documentation: ${file.path}`);
            }

            // Style files
            if (file.keywords.includes('style')) {
                scores.style += 2;
                reasons.push(`Style file: ${file.path}`);
            }

            // Config/dependencies
            if (file.keywords.includes('config') || file.keywords.includes('dependencies')) {
                scores.chore += 2;
                reasons.push(`Configuration/dependencies: ${file.path}`);
            }

            // CI/build
            if (file.keywords.includes('ci') || file.keywords.includes('build')) {
                scores.chore += 2;
                reasons.push(`CI/build: ${file.path}`);
            }

            // New files suggest features
            if (file.status === 'added' && !file.keywords.includes('test')) {
                scores.feat += 2;
                reasons.push(`New file: ${file.path}`);
            }

            // Large refactors
            if (file.magnitude === 'large' || file.magnitude === 'massive') {
                scores.refactor += 1;
            }
        }

        // Find highest scoring type
        let maxScore = 0;
        let detectedType: TypeDetection['type'] = 'chore';

        for (const [type, score] of Object.entries(scores)) {
            if (score > maxScore) {
                maxScore = score;
                detectedType = type as TypeDetection['type'];
            }
        }

        // Calculate confidence (0-1)
        const totalScore = Object.values(scores).reduce((sum, s) => sum + s, 0);
        const confidence = totalScore > 0 ? maxScore / totalScore : 0.5;

        // If confidence is low, default to feat for new code, fix for modifications
        if (confidence < 0.4) {
            const hasNewFiles = files.some((f) => f.status === 'added');
            detectedType = hasNewFiles ? 'feat' : 'fix';
            reasons.push(
                `Low confidence (${(confidence * 100).toFixed(0)}%), defaulting to ${detectedType}`
            );
        }

        return {
            type: detectedType,
            confidence,
            reasons: reasons.slice(0, 5), // Limit to top 5 reasons
        };
    }

    /**
     * Detect scope from file paths
     */
    private detectScope(
        files: FileAnalysis[],
        scopeMap?: Record<string, string>
    ): ScopeDetection {
        const scopeCounts = new Map<string, number>();
        const reasons: string[] = [];

        for (const file of files) {
            const scopes = this.inferScopeFromPath(file.path, scopeMap);

            for (const scope of scopes) {
                scopeCounts.set(scope, (scopeCounts.get(scope) || 0) + 1);
                if (scopeCounts.get(scope) === 1) {
                    reasons.push(`Scope '${scope}' from ${file.path}`);
                }
            }
        }

        // Get scopes sorted by frequency
        const sortedScopes = Array.from(scopeCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([scope]) => scope);

        // Calculate confidence based on scope concentration
        const totalFiles = files.length;
        const maxScopeCount = Math.max(...Array.from(scopeCounts.values()));
        const confidence = totalFiles > 0 ? maxScopeCount / totalFiles : 0;

        return {
            scopes: sortedScopes.slice(0, 3), // Max 3 scopes
            confidence,
            reasons: reasons.slice(0, 5),
        };
    }

    /**
     * Infer scope from file path
     */
    private inferScopeFromPath(path: string, scopeMap?: Record<string, string>): string[] {
        const scopes: string[] = [];

        // Check custom scope map first
        if (scopeMap) {
            for (const [pattern, scope] of Object.entries(scopeMap)) {
                if (path.includes(pattern)) {
                    scopes.push(scope);
                }
            }
        }

        // Extract from path structure
        const parts = path.split('/');

        // For src/module/file.ts structure
        if (parts.length >= 2 && parts[0] === 'src') {
            scopes.push(parts[1]);
        }

        // For packages/package-name/ monorepo structure
        if (parts.length >= 2 && parts[0] === 'packages') {
            scopes.push(parts[1]);
        }

        // For apps/app-name/ structure
        if (parts.length >= 2 && parts[0] === 'apps') {
            scopes.push(parts[1]);
        }

        // Common directory names as scopes
        const commonScopes = ['api', 'ui', 'core', 'utils', 'auth', 'config', 'db', 'models'];
        for (const part of parts) {
            if (commonScopes.includes(part.toLowerCase())) {
                scopes.push(part.toLowerCase());
            }
        }

        return [...new Set(scopes)]; // Remove duplicates
    }

    /**
     * Detect breaking changes
     */
    private detectBreakingChanges(files: FileAnalysis[]): boolean {
        // Check for API changes (simplified - real implementation would parse diffs)
        for (const file of files) {
            if (file.path.includes('api/') && file.deletions > file.additions) {
                return true;
            }

            // Large deletions in core files might be breaking
            if (
                file.keywords.includes('core') &&
                file.deletions > 50 &&
                file.deletions > file.additions * 2
            ) {
                return true;
            }
        }

        return false;
    }

    /**
     * Generate overall summary
     */
    private generateSummary(
        files: FileAnalysis[],
        type: TypeDetection,
        scope: ScopeDetection
    ): string {
        const fileCount = files.length;
        const scopeStr = scope.scopes.length > 0 ? scope.scopes.join(', ') : 'multiple areas';

        if (fileCount === 1) {
            return files[0].summary;
        }

        const verb = type.type === 'feat' ? 'Add' : type.type === 'fix' ? 'Fix' : 'Update';

        return `${verb} changes across ${fileCount} files in ${scopeStr}`;
    }
}
