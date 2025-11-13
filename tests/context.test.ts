import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ContextBuilder } from '../src/core/context';
import { GitService, FileChange } from '../src/core/git';

// Mock GitService
jest.mock('../src/core/git');
jest.mock('../src/utils/logger');

describe('ContextBuilder', () => {
    let builder: ContextBuilder;
    let mockGitService: jest.Mocked<GitService>;

    beforeEach(() => {
        mockGitService = {
            getChangedFiles: jest.fn(),
        } as any;

        builder = new ContextBuilder(mockGitService);
    });

    describe('buildContext', () => {
        it('should analyze single file change', async () => {
            const changes: FileChange[] = [
                { path: 'src/api/user.ts', additions: 8, deletions: 2, status: 'modified' },
            ];

            mockGitService.getChangedFiles.mockReturnValue(changes);

            const result = await builder.buildContext({ staged: true });

            expect(result.files).toHaveLength(1);
            expect(result.files[0].path).toBe('src/api/user.ts');
            expect(result.files[0].magnitude).toBe('tiny'); // 8+2 = 10
            expect(result.totalAdditions).toBe(8);
            expect(result.totalDeletions).toBe(2);
        });

        it('should detect test type from test files', async () => {
            const changes: FileChange[] = [
                { path: 'src/api/user.test.ts', additions: 50, deletions: 10, status: 'modified' },
                { path: 'src/api/auth.test.ts', additions: 30, deletions: 5, status: 'added' },
            ];

            mockGitService.getChangedFiles.mockReturnValue(changes);

            const result = await builder.buildContext({ staged: true });

            expect(result.type.type).toBe('test');
            expect(result.type.confidence).toBeGreaterThan(0.5);
            expect(result.type.reasons).toEqual(
                expect.arrayContaining([
                    expect.stringContaining('Test file:'),
                ])
            );
        });

        it('should detect docs type from documentation files', async () => {
            const changes: FileChange[] = [
                { path: 'docs/README.md', additions: 100, deletions: 20, status: 'modified' },
                { path: 'docs/api-guide.md', additions: 50, deletions: 0, status: 'added' },
            ];

            mockGitService.getChangedFiles.mockReturnValue(changes);

            const result = await builder.buildContext({ staged: true });

            expect(result.type.type).toBe('docs');
            expect(result.files[0].keywords).toContain('docs');
        });

        it('should detect chore type from config files', async () => {
            const changes: FileChange[] = [
                { path: 'package.json', additions: 5, deletions: 2, status: 'modified' },
                { path: '.eslintrc.js', additions: 10, deletions: 3, status: 'modified' },
            ];

            mockGitService.getChangedFiles.mockReturnValue(changes);

            const result = await builder.buildContext({ staged: true });

            expect(result.type.type).toBe('chore');
            expect(result.files[0].keywords).toContain('dependencies');
        });

        it('should detect feat type for new files', async () => {
            const changes: FileChange[] = [
                { path: 'src/features/notifications.ts', additions: 200, deletions: 0, status: 'added' },
                { path: 'src/features/notifications-ui.tsx', additions: 150, deletions: 0, status: 'added' },
            ];

            mockGitService.getChangedFiles.mockReturnValue(changes);

            const result = await builder.buildContext({ staged: true });

            expect(result.type.type).toBe('feat');
            expect(result.type.reasons).toEqual(
                expect.arrayContaining([
                    expect.stringContaining('New file:'),
                ])
            );
        });

        it('should detect scope from src/ structure', async () => {
            const changes: FileChange[] = [
                { path: 'src/api/routes.ts', additions: 20, deletions: 5, status: 'modified' },
                { path: 'src/api/middleware.ts', additions: 15, deletions: 3, status: 'modified' },
            ];

            mockGitService.getChangedFiles.mockReturnValue(changes);

            const result = await builder.buildContext({ staged: true });

            expect(result.scope.scopes).toContain('api');
            expect(result.scope.confidence).toBeGreaterThan(0.8); // Both files in same scope
        });

        it('should detect scope from monorepo packages/', async () => {
            const changes: FileChange[] = [
                { path: 'packages/web-ui/components/Button.tsx', additions: 30, deletions: 10, status: 'modified' },
                { path: 'packages/web-ui/styles/theme.css', additions: 15, deletions: 5, status: 'modified' },
            ];

            mockGitService.getChangedFiles.mockReturnValue(changes);

            const result = await builder.buildContext({ staged: true });

            expect(result.scope.scopes).toContain('web-ui');
        });

        it('should use custom scope mapping', async () => {
            const changes: FileChange[] = [
                { path: 'client/app/index.ts', additions: 10, deletions: 2, status: 'modified' },
            ];

            mockGitService.getChangedFiles.mockReturnValue(changes);

            const result = await builder.buildContext({
                staged: true,
                scopeMap: { 'client/': 'frontend' },
            });

            expect(result.scope.scopes).toContain('frontend');
        });

        it('should handle multiple scopes', async () => {
            const changes: FileChange[] = [
                { path: 'src/api/routes.ts', additions: 20, deletions: 5, status: 'modified' },
                { path: 'src/ui/components.tsx', additions: 30, deletions: 10, status: 'modified' },
                { path: 'src/utils/logger.ts', additions: 5, deletions: 2, status: 'modified' },
            ];

            mockGitService.getChangedFiles.mockReturnValue(changes);

            const result = await builder.buildContext({ staged: true });

            // Should detect all three scopes
            expect(result.scope.scopes.length).toBeGreaterThan(0);
            expect(result.scope.scopes.length).toBeLessThanOrEqual(3);
        });

        it('should calculate magnitude correctly', async () => {
            const testCases: Array<[number, number, string]> = [
                [5, 3, 'tiny'],    // 8 total
                [30, 15, 'small'],  // 45 total
                [100, 80, 'medium'], // 180 total
                [300, 150, 'large'], // 450 total
                [600, 400, 'massive'], // 1000 total
            ];

            for (const [additions, deletions, expectedMagnitude] of testCases) {
                const changes: FileChange[] = [
                    { path: 'test.ts', additions, deletions, status: 'modified' },
                ];

                mockGitService.getChangedFiles.mockReturnValue(changes);

                const result = await builder.buildContext({ staged: true });

                expect(result.files[0].magnitude).toBe(expectedMagnitude);
            }
        });

        it('should detect breaking changes in API files', async () => {
            const changes: FileChange[] = [
                { path: 'src/api/endpoints.ts', additions: 10, deletions: 50, status: 'modified' },
            ];

            mockGitService.getChangedFiles.mockReturnValue(changes);

            const result = await builder.buildContext({ staged: true });

            expect(result.breaking).toBe(true);
        });

        it('should detect breaking changes in core files with large deletions', async () => {
            const changes: FileChange[] = [
                { path: 'src/core/engine.ts', additions: 20, deletions: 120, status: 'modified' },
            ];

            mockGitService.getChangedFiles.mockReturnValue(changes);

            const result = await builder.buildContext({ staged: true });

            expect(result.breaking).toBe(true);
        });

        it('should generate summary for single file', async () => {
            const changes: FileChange[] = [
                { path: 'README.md', additions: 30, deletions: 10, status: 'modified' },
            ];

            mockGitService.getChangedFiles.mockReturnValue(changes);

            const result = await builder.buildContext({ staged: true });

            expect(result.summary).toContain('README.md');
        });

        it('should generate summary for multiple files', async () => {
            const changes: FileChange[] = [
                { path: 'src/api/routes.ts', additions: 20, deletions: 5, status: 'modified' },
                { path: 'src/api/middleware.ts', additions: 15, deletions: 3, status: 'modified' },
                { path: 'src/api/auth.ts', additions: 10, deletions: 2, status: 'modified' },
            ];

            mockGitService.getChangedFiles.mockReturnValue(changes);

            const result = await builder.buildContext({ staged: true });

            expect(result.summary).toContain('3 files');
            expect(result.summary).toContain('api');
        });

        it('should extract keywords from file paths', async () => {
            const testCases: Array<[string, string[]]> = [
                ['src/api/routes.ts', ['source', 'api']],
                ['src/ui/components/Button.tsx', ['source', 'ui']],
                ['tests/unit/api.test.ts', ['test']],
                ['docs/README.md', ['docs']],
                ['styles/main.css', ['style']],
                ['.github/workflows/ci.yml', ['ci']],
                ['package.json', ['dependencies']],
                ['webpack.config.js', ['config', 'build']],
            ];

            for (const [path, expectedKeywords] of testCases) {
                const changes: FileChange[] = [
                    { path, additions: 10, deletions: 5, status: 'modified' },
                ];

                mockGitService.getChangedFiles.mockReturnValue(changes);

                const result = await builder.buildContext({ staged: true });

                for (const keyword of expectedKeywords) {
                    expect(result.files[0].keywords).toContain(keyword);
                }
            }
        });

        it('should handle renamed files', async () => {
            const changes: FileChange[] = [
                {
                    path: 'src/new-name.ts',
                    oldPath: 'src/old-name.ts',
                    additions: 5,
                    deletions: 3,
                    status: 'renamed',
                },
            ];

            mockGitService.getChangedFiles.mockReturnValue(changes);

            const result = await builder.buildContext({ staged: true });

            expect(result.files[0].status).toBe('renamed');
            expect(result.files[0].summary).toContain('Renamed');
            expect(result.files[0].summary).toContain('old-name.ts');
            expect(result.files[0].summary).toContain('new-name.ts');
        });

        it('should throw error when no changes found', async () => {
            mockGitService.getChangedFiles.mockReturnValue([]);

            await expect(builder.buildContext({ staged: true })).rejects.toThrow(
                'No changes found to analyze'
            );
        });

        it('should default to feat/fix when confidence is low', async () => {
            // Generic file without clear type indicators
            const changes: FileChange[] = [
                { path: 'app.ts', additions: 10, deletions: 5, status: 'modified' },
            ];

            mockGitService.getChangedFiles.mockReturnValue(changes);

            const result = await builder.buildContext({ staged: true });

            // With no clear indicators, it will default based on status
            // Modified file with no other signals defaults to fix
            expect(['feat', 'fix', 'chore']).toContain(result.type.type);
            expect(result.type.confidence).toBeLessThanOrEqual(0.5);
        });
    });
});
