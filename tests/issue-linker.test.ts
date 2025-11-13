import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { IssueLinker } from '../src/core/issue-linker';
import { GitService } from '../src/core/git';

// Mock GitService and logger
jest.mock('../src/core/git');
jest.mock('../src/utils/logger');

describe('IssueLinker', () => {
    let linker: IssueLinker;
    let mockGitService: jest.Mocked<GitService>;

    beforeEach(() => {
        mockGitService = {
            getCurrentBranch: jest.fn(),
            getRemoteUrl: jest.fn(),
            parseRemoteInfo: jest.fn(),
        } as any;

        linker = new IssueLinker(mockGitService);
    });

    describe('extractIssue', () => {
        it('should return null when mode is off', () => {
            const result = linker.extractIssue({ mode: 'off' });
            expect(result).toBeNull();
        });

        it('should handle explicit issue ID', () => {
            const result = linker.extractIssue({ mode: 'PROJ-123' });

            expect(result).toEqual({
                id: 'PROJ-123',
                pattern: 'explicit',
                url: undefined,
            });
        });

        it('should generate URL for explicit issue with template', () => {
            const result = linker.extractIssue({
                mode: 'PROJ-123',
                linkTemplate: 'https://jira.example.com/browse/{issue}',
            });

            expect(result).toEqual({
                id: 'PROJ-123',
                pattern: 'explicit',
                url: 'https://jira.example.com/browse/PROJ-123',
            });
        });

        it('should detect issue from branch in auto mode', () => {
            mockGitService.getCurrentBranch.mockReturnValue('feat/123-add-feature');

            const result = linker.extractIssue({ mode: 'auto' });

            expect(result).toEqual({
                id: '123',
                pattern: expect.stringContaining('default'),
                url: undefined,
            });
        });

        it('should return null in auto mode for special branches', () => {
            mockGitService.getCurrentBranch.mockReturnValue('main');

            const result = linker.extractIssue({ mode: 'auto' });

            expect(result).toBeNull();
        });
    });

    describe('branch name parsing', () => {
        it('should detect GitHub/GitLab style: feat/123', () => {
            mockGitService.getCurrentBranch.mockReturnValue('feat/456');

            const result = linker.extractIssue({ mode: 'auto' });

            expect(result?.id).toBe('456');
        });

        it('should detect fix/789 pattern', () => {
            mockGitService.getCurrentBranch.mockReturnValue('fix/789-bug-description');

            const result = linker.extractIssue({ mode: 'auto' });

            expect(result?.id).toBe('789');
        });

        it('should detect JIRA style: PROJ-123', () => {
            mockGitService.getCurrentBranch.mockReturnValue('feature/PROJ-456-description');

            const result = linker.extractIssue({ mode: 'auto' });

            expect(result?.id).toBe('PROJ-456');
        });

        it('should detect issue-123 pattern', () => {
            mockGitService.getCurrentBranch.mockReturnValue('issue-789');

            const result = linker.extractIssue({ mode: 'auto' });

            expect(result?.id).toBe('789');
        });

        it('should detect issue/123 pattern', () => {
            mockGitService.getCurrentBranch.mockReturnValue('issue/321');

            const result = linker.extractIssue({ mode: 'auto' });

            expect(result?.id).toBe('321');
        });

        it('should detect hash style: #123', () => {
            mockGitService.getCurrentBranch.mockReturnValue('feature-name-#999');

            const result = linker.extractIssue({ mode: 'auto' });

            expect(result?.id).toBe('999');
        });

        it('should detect trailing numbers: feature-123', () => {
            mockGitService.getCurrentBranch.mockReturnValue('awesome-feature-555');

            const result = linker.extractIssue({ mode: 'auto' });

            expect(result?.id).toBe('555');
        });

        it('should handle multiple JIRA projects', () => {
            const testCases = [
                ['ABC-123', 'ABC-123'],
                ['feature/XYZ-456', 'XYZ-456'],
                ['BACKEND-789-fix', 'BACKEND-789'],
            ];

            for (const [branchName, expectedId] of testCases) {
                mockGitService.getCurrentBranch.mockReturnValue(branchName);
                const result = linker.extractIssue({ mode: 'auto' });
                expect(result?.id).toBe(expectedId);
            }
        });

        it('should handle case-insensitive type prefixes', () => {
            const testCases = ['FEAT/123', 'Fix/456', 'CHORE/789'];

            for (const branchName of testCases) {
                mockGitService.getCurrentBranch.mockReturnValue(branchName);
                const result = linker.extractIssue({ mode: 'auto' });
                expect(result).not.toBeNull();
                expect(result?.id).toMatch(/\d+/);
            }
        });
    });

    describe('custom patterns', () => {
        it('should use custom regex pattern', () => {
            mockGitService.getCurrentBranch.mockReturnValue('ticket_ABC123');

            const result = linker.extractIssue({
                mode: 'auto',
                patterns: ['ticket_([A-Z0-9]+)'],
            });

            expect(result?.id).toBe('ABC123');
        });

        it('should prioritize custom patterns over defaults', () => {
            mockGitService.getCurrentBranch.mockReturnValue('custom-999-feat/123');

            const result = linker.extractIssue({
                mode: 'auto',
                patterns: ['custom-(\\d+)'],
            });

            // Custom pattern should match first
            expect(result?.id).toBe('999');
        });

        it('should fall back to default patterns if custom fails', () => {
            mockGitService.getCurrentBranch.mockReturnValue('feat/456');

            const result = linker.extractIssue({
                mode: 'auto',
                patterns: ['nomatch-(\\d+)'],
            });

            // Should still match with default pattern
            expect(result?.id).toBe('456');
        });

        it('should handle invalid custom patterns gracefully', () => {
            mockGitService.getCurrentBranch.mockReturnValue('feat/123');

            const result = linker.extractIssue({
                mode: 'auto',
                patterns: ['[invalid(regex'],
            });

            // Should still work with default patterns
            expect(result?.id).toBe('123');
        });
    });

    describe('URL generation', () => {
        it('should generate GitHub issue URL', () => {
            mockGitService.getCurrentBranch.mockReturnValue('feat/123');
            mockGitService.getRemoteUrl.mockReturnValue('https://github.com/owner/repo.git');
            mockGitService.parseRemoteInfo.mockReturnValue({
                platform: 'github',
                owner: 'owner',
                repo: 'repo',
            });

            const result = linker.extractIssue({ mode: 'auto' });

            expect(result?.url).toBe('https://github.com/owner/repo/issues/123');
        });

        it('should generate GitLab issue URL', () => {
            mockGitService.getCurrentBranch.mockReturnValue('fix/456');
            mockGitService.getRemoteUrl.mockReturnValue('https://gitlab.com/group/project.git');
            mockGitService.parseRemoteInfo.mockReturnValue({
                platform: 'gitlab',
                owner: 'group',
                repo: 'project',
            });

            const result = linker.extractIssue({ mode: 'auto' });

            expect(result?.url).toBe('https://gitlab.com/group/project/-/issues/456');
        });

        it('should use custom link template', () => {
            mockGitService.getCurrentBranch.mockReturnValue('PROJ-789');

            const result = linker.extractIssue({
                mode: 'auto',
                linkTemplate: 'https://jira.company.com/browse/{issue}',
            });

            expect(result?.url).toBe('https://jira.company.com/browse/PROJ-789');
        });

        it('should support {id} placeholder in template', () => {
            mockGitService.getCurrentBranch.mockReturnValue('feat/123');

            const result = linker.extractIssue({
                mode: 'auto',
                linkTemplate: 'https://tracker.example.com/issue/{id}',
            });

            expect(result?.url).toBe('https://tracker.example.com/issue/123');
        });

        it('should handle missing remote gracefully', () => {
            mockGitService.getCurrentBranch.mockReturnValue('feat/123');
            mockGitService.getRemoteUrl.mockReturnValue(null);

            const result = linker.extractIssue({ mode: 'auto' });

            expect(result?.id).toBe('123');
            expect(result?.url).toBeUndefined();
        });

        it('should handle unparseable remote URL', () => {
            mockGitService.getCurrentBranch.mockReturnValue('feat/123');
            mockGitService.getRemoteUrl.mockReturnValue('ssh://custom-server/repo.git');
            mockGitService.parseRemoteInfo.mockReturnValue(null);

            const result = linker.extractIssue({ mode: 'auto' });

            expect(result?.id).toBe('123');
            expect(result?.url).toBeUndefined();
        });
    });

    describe('special branches', () => {
        const specialBranches = [
            'main',
            'master',
            'develop',
            'development',
            'staging',
            'production',
            'HEAD',
            'detached at abc123',
        ];

        for (const branch of specialBranches) {
            it(`should skip special branch: ${branch}`, () => {
                mockGitService.getCurrentBranch.mockReturnValue(branch);

                const result = linker.extractIssue({ mode: 'auto' });

                expect(result).toBeNull();
            });
        }
    });

    describe('extractFromText', () => {
        it('should extract issue references from text', () => {
            const text = 'This PR fixes #123 and resolves PROJ-456';

            const issues = linker.extractFromText(text);

            // May find multiple patterns matching - check the IDs are present
            expect(issues.length).toBeGreaterThanOrEqual(2);
            const ids = issues.map(i => i.id);
            expect(ids).toContain('123');
            expect(ids).toContain('PROJ-456');
        });

        it('should extract multiple occurrences', () => {
            const text = 'Fixes #100, #200, and #300';

            const issues = linker.extractFromText(text);

            expect(issues).toHaveLength(3);
            expect(issues.map((i) => i.id)).toEqual(['100', '200', '300']);
        });

        it('should deduplicate issue IDs', () => {
            const text = 'This fixes #123 and also #123 again';

            const issues = linker.extractFromText(text);

            expect(issues).toHaveLength(1);
            expect(issues[0].id).toBe('123');
        });

        it('should work with custom patterns', () => {
            const text = 'Resolves ticket_ABC123 and ticket_XYZ456';

            const issues = linker.extractFromText(text, ['ticket_([A-Z0-9]+)']);

            expect(issues).toHaveLength(2);
            expect(issues[0].id).toBe('ABC123');
            expect(issues[1].id).toBe('XYZ456');
        });

        it('should handle empty text', () => {
            const issues = linker.extractFromText('');

            expect(issues).toEqual([]);
        });
    });

    describe('formatFooter', () => {
        it('should format with URL', () => {
            const issue = {
                id: '123',
                pattern: 'test',
                url: 'https://github.com/owner/repo/issues/123',
            };

            const footer = linker.formatFooter(issue);

            expect(footer).toBe('Closes https://github.com/owner/repo/issues/123');
        });

        it('should format without URL', () => {
            const issue = {
                id: '456',
                pattern: 'test',
            };

            const footer = linker.formatFooter(issue);

            expect(footer).toBe('Closes #456');
        });
    });

    describe('formatPRReference', () => {
        it('should format with URL as markdown link', () => {
            const issue = {
                id: '123',
                pattern: 'test',
                url: 'https://github.com/owner/repo/issues/123',
            };

            const reference = linker.formatPRReference(issue);

            expect(reference).toBe('Resolves [#123](https://github.com/owner/repo/issues/123)');
        });

        it('should format without URL', () => {
            const issue = {
                id: '456',
                pattern: 'test',
            };

            const reference = linker.formatPRReference(issue);

            expect(reference).toBe('Resolves #456');
        });
    });

    describe('edge cases', () => {
        it('should handle branch with no issue', () => {
            mockGitService.getCurrentBranch.mockReturnValue('feature-branch-with-no-numbers');

            const result = linker.extractIssue({ mode: 'auto' });

            expect(result).toBeNull();
        });

        it('should handle very long branch names', () => {
            const longBranch = 'feat/123-' + 'a'.repeat(200);
            mockGitService.getCurrentBranch.mockReturnValue(longBranch);

            const result = linker.extractIssue({ mode: 'auto' });

            expect(result?.id).toBe('123');
        });

        it('should handle branch names with special characters', () => {
            mockGitService.getCurrentBranch.mockReturnValue('feat/123-special_chars@!$');

            const result = linker.extractIssue({ mode: 'auto' });

            expect(result?.id).toBe('123');
        });

        it('should prefer earlier patterns when multiple match', () => {
            // Branch has both JIRA and number patterns
            mockGitService.getCurrentBranch.mockReturnValue('PROJ-456-feat-123');

            const result = linker.extractIssue({ mode: 'auto' });

            // JIRA pattern comes before trailing number pattern
            expect(result?.id).toBe('PROJ-456');
        });
    });
});
