import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GitService, GitError } from '../src/core/git';
import { execSync } from 'child_process';

// Mock child_process
jest.mock('child_process');
const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

describe('GitService', () => {
    let gitService: GitService;
    const mockCwd = '/mock/repo';

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock successful git repo validation
        mockExecSync.mockReturnValueOnce(Buffer.from('.git\n'));
        gitService = new GitService(mockCwd);
    });

    describe('constructor', () => {
        it('should validate git repository on initialization', () => {
            expect(mockExecSync).toHaveBeenCalledWith(
                'git rev-parse --git-dir',
                expect.objectContaining({
                    cwd: mockCwd,
                })
            );
        });

        it('should throw GitError if not a git repository', () => {
            mockExecSync.mockReset();
            mockExecSync.mockImplementationOnce(() => {
                const error: any = new Error('fatal: not a git repository');
                error.status = 128;
                throw error;
            });

            expect(() => new GitService(mockCwd)).toThrow(GitError);
            expect(() => new GitService(mockCwd)).toThrow(
                /Not a git repository/
            );
        });
    });

    describe('isGitAvailable', () => {
        it('should return true if git is installed', () => {
            mockExecSync.mockReturnValueOnce(Buffer.from('git version 2.39.0\n'));
            expect(GitService.isGitAvailable()).toBe(true);
        });

        it('should return false if git is not installed', () => {
            mockExecSync.mockImplementationOnce(() => {
                throw new Error('command not found: git');
            });
            expect(GitService.isGitAvailable()).toBe(false);
        });
    });

    describe('getGitVersion', () => {
        it('should return git version', () => {
            mockExecSync.mockReturnValueOnce(Buffer.from('git version 2.39.0\n'));
            expect(gitService.getGitVersion()).toBe('2.39.0');
        });

        it('should return unknown for invalid version string', () => {
            mockExecSync.mockReturnValueOnce(Buffer.from('invalid\n'));
            expect(gitService.getGitVersion()).toBe('unknown');
        });
    });

    describe('getDiff', () => {
        it('should get staged diff', () => {
            const mockDiff = 'diff --git a/file.txt b/file.txt\n+new line';
            mockExecSync.mockReturnValueOnce(Buffer.from(mockDiff));

            const result = gitService.getDiff({ staged: true });

            expect(result).toBe(mockDiff);
            expect(mockExecSync).toHaveBeenCalledWith(
                'git diff --no-color -U0 --staged',
                expect.any(Object)
            );
        });

        it('should get diff for range', () => {
            const mockDiff = 'diff --git a/file.txt b/file.txt\n+new line';
            mockExecSync.mockReturnValueOnce(Buffer.from(mockDiff));

            const result = gitService.getDiff({ range: 'main...HEAD' });

            expect(result).toBe(mockDiff);
            expect(mockExecSync).toHaveBeenCalledWith(
                'git diff --no-color -U0 main...HEAD',
                expect.any(Object)
            );
        });

        it('should throw error when no staged changes', () => {
            mockExecSync.mockReturnValue(Buffer.from(''));

            expect(() => gitService.getDiff({ staged: true })).toThrow(GitError);
            expect(() => gitService.getDiff({ staged: true })).toThrow(
                /No staged changes found/
            );
        });

        it('should use custom context lines', () => {
            const mockDiff = 'diff content';
            mockExecSync.mockReturnValueOnce(Buffer.from(mockDiff));

            gitService.getDiff({ staged: true, contextLines: 3 });

            expect(mockExecSync).toHaveBeenCalledWith(
                'git diff --no-color -U3 --staged',
                expect.any(Object)
            );
        });
    });

    describe('getChangedFiles', () => {
        it('should parse modified files', () => {
            const statusOutput = 'M\tsrc/file1.ts\nA\tsrc/file2.ts';
            const numstatOutput = '10\t5\tsrc/file1.ts\n20\t0\tsrc/file2.ts';

            mockExecSync
                .mockReturnValueOnce(Buffer.from(statusOutput))
                .mockReturnValueOnce(Buffer.from(numstatOutput));

            const files = gitService.getChangedFiles({ staged: true });

            expect(files).toHaveLength(2);
            expect(files[0]).toEqual({
                path: 'src/file1.ts',
                status: 'modified',
                oldPath: undefined,
                additions: 10,
                deletions: 5,
            });
            expect(files[1]).toEqual({
                path: 'src/file2.ts',
                status: 'added',
                oldPath: undefined,
                additions: 20,
                deletions: 0,
            });
        });

        it('should handle renamed files', () => {
            const statusOutput = 'R100\told/path.ts\tnew/path.ts';
            const numstatOutput = '0\t0\tnew/path.ts';

            mockExecSync
                .mockReturnValueOnce(Buffer.from(statusOutput))
                .mockReturnValueOnce(Buffer.from(numstatOutput));

            const files = gitService.getChangedFiles({ staged: true });

            expect(files).toHaveLength(1);
            expect(files[0]).toEqual({
                path: 'new/path.ts',
                status: 'renamed',
                oldPath: 'old/path.ts',
                additions: 0,
                deletions: 0,
            });
        });

        it('should handle deleted files', () => {
            const statusOutput = 'D\tdeleted.ts';
            const numstatOutput = '0\t50\tdeleted.ts';

            mockExecSync
                .mockReturnValueOnce(Buffer.from(statusOutput))
                .mockReturnValueOnce(Buffer.from(numstatOutput));

            const files = gitService.getChangedFiles({ staged: true });

            expect(files).toHaveLength(1);
            expect(files[0]).toEqual({
                path: 'deleted.ts',
                status: 'deleted',
                oldPath: undefined,
                additions: 0,
                deletions: 50,
            });
        });

        it('should return empty array when no changes', () => {
            mockExecSync
                .mockReturnValueOnce(Buffer.from(''))
                .mockReturnValueOnce(Buffer.from(''));

            const files = gitService.getChangedFiles({ staged: true });

            expect(files).toEqual([]);
        });

        it('should handle binary files', () => {
            const statusOutput = 'M\timage.png';
            const numstatOutput = '-\t-\timage.png';

            mockExecSync
                .mockReturnValueOnce(Buffer.from(statusOutput))
                .mockReturnValueOnce(Buffer.from(numstatOutput));

            const files = gitService.getChangedFiles({ staged: true });

            expect(files[0]).toEqual({
                path: 'image.png',
                status: 'modified',
                oldPath: undefined,
                additions: 0,
                deletions: 0,
            });
        });
    });

    describe('getFileHistory', () => {
        it('should return commit messages for a file', () => {
            const commitMessages = 'feat: add feature\nfix: bug fix\nchore: update deps';
            mockExecSync.mockReturnValueOnce(Buffer.from(commitMessages));

            const history = gitService.getFileHistory('src/file.ts', 3);

            expect(history).toEqual([
                'feat: add feature',
                'fix: bug fix',
                'chore: update deps',
            ]);
            expect(mockExecSync).toHaveBeenCalledWith(
                'git log -n 3 --pretty=format:%s --follow -- src/file.ts',
                expect.any(Object)
            );
        });

        it('should return empty array for new file', () => {
            mockExecSync.mockImplementationOnce(() => {
                throw new Error('does not have any commits yet');
            });

            const history = gitService.getFileHistory('new-file.ts');

            expect(history).toEqual([]);
        });

        it('should use default limit of 5', () => {
            mockExecSync.mockReturnValueOnce(Buffer.from('commit1\ncommit2'));

            gitService.getFileHistory('file.ts');

            expect(mockExecSync).toHaveBeenCalledWith(
                expect.stringContaining('-n 5'),
                expect.any(Object)
            );
        });
    });

    describe('getCurrentBranch', () => {
        it('should return current branch name', () => {
            mockExecSync.mockReturnValueOnce(Buffer.from('main\n'));

            const branch = gitService.getCurrentBranch();

            expect(branch).toBe('main');
        });

        it('should handle detached HEAD state', () => {
            mockExecSync
                .mockImplementationOnce(() => {
                    throw new Error('HEAD is not a symbolic ref');
                })
                .mockReturnValueOnce(Buffer.from('abc123def456\n'));

            const branch = gitService.getCurrentBranch();

            expect(branch).toBe('detached at abc123d');
        });

        it('should throw error if unable to determine branch', () => {
            mockExecSync.mockImplementation(() => {
                throw new Error('fatal: not a valid ref');
            });

            expect(() => gitService.getCurrentBranch()).toThrow(GitError);
        });
    });

    describe('hasStagedChanges', () => {
        it('should return true when there are staged changes', () => {
            mockExecSync.mockReturnValueOnce(Buffer.from('file1.ts\nfile2.ts\n'));

            expect(gitService.hasStagedChanges()).toBe(true);
        });

        it('should return false when there are no staged changes', () => {
            mockExecSync.mockReturnValueOnce(Buffer.from(''));

            expect(gitService.hasStagedChanges()).toBe(false);
        });
    });

    describe('hasUncommittedChanges', () => {
        it('should return true when there are uncommitted changes', () => {
            mockExecSync.mockReturnValueOnce(Buffer.from(' M file.ts\n?? new.ts\n'));

            expect(gitService.hasUncommittedChanges()).toBe(true);
        });

        it('should return false when working tree is clean', () => {
            mockExecSync.mockReturnValueOnce(Buffer.from(''));

            expect(gitService.hasUncommittedChanges()).toBe(false);
        });
    });

    describe('createCommit', () => {
        it('should create commit with message', () => {
            mockExecSync.mockReturnValueOnce(Buffer.from('[main abc123] feat: add feature\n'));

            gitService.createCommit({ message: 'feat: add feature' });

            expect(mockExecSync).toHaveBeenCalledWith(
                'git commit -F -',
                expect.objectContaining({
                    input: 'feat: add feature',
                })
            );
        });

        it('should create commit with --no-verify flag', () => {
            mockExecSync.mockReturnValueOnce(Buffer.from('[main abc123] commit\n'));

            gitService.createCommit({ message: 'commit', noVerify: true });

            expect(mockExecSync).toHaveBeenCalledWith(
                'git commit -F - --no-verify',
                expect.any(Object)
            );
        });

        it('should create commit with --amend flag', () => {
            mockExecSync.mockReturnValueOnce(Buffer.from('[main abc123] commit\n'));

            gitService.createCommit({ message: 'amended', amend: true });

            expect(mockExecSync).toHaveBeenCalledWith(
                'git commit -F - --amend',
                expect.any(Object)
            );
        });

        it('should throw helpful error when nothing to commit', () => {
            mockExecSync.mockImplementation(() => {
                const error: any = new Error('nothing to commit');
                error.stderr = 'nothing to commit, working tree clean';
                error.status = 1;
                throw error;
            });

            expect(() => gitService.createCommit({ message: 'test' })).toThrow(GitError);
            expect(() => gitService.createCommit({ message: 'test' })).toThrow(
                /Nothing to commit/
            );
        });
    });

    describe('getRepositoryRoot', () => {
        it('should return repository root path', () => {
            mockExecSync.mockReturnValueOnce(Buffer.from('/path/to/repo\n'));

            const root = gitService.getRepositoryRoot();

            expect(root).toBe('/path/to/repo');
        });
    });

    describe('getRemoteUrl', () => {
        it('should return origin remote URL', () => {
            mockExecSync.mockReturnValueOnce(
                Buffer.from('https://github.com/user/repo.git\n')
            );

            const url = gitService.getRemoteUrl();

            expect(url).toBe('https://github.com/user/repo.git');
        });

        it('should return null if remote does not exist', () => {
            mockExecSync.mockImplementationOnce(() => {
                throw new Error('fatal: No such remote');
            });

            const url = gitService.getRemoteUrl('nonexistent');

            expect(url).toBeNull();
        });

        it('should handle custom remote name', () => {
            mockExecSync.mockReturnValueOnce(
                Buffer.from('https://gitlab.com/user/repo.git\n')
            );

            gitService.getRemoteUrl('upstream');

            expect(mockExecSync).toHaveBeenCalledWith(
                'git remote get-url upstream',
                expect.any(Object)
            );
        });
    });

    describe('parseRemoteInfo', () => {
        it('should parse GitHub HTTPS URL', () => {
            const info = gitService.parseRemoteInfo('https://github.com/owner/repo.git');

            expect(info).toEqual({
                platform: 'github',
                owner: 'owner',
                repo: 'repo',
            });
        });

        it('should parse GitHub SSH URL', () => {
            const info = gitService.parseRemoteInfo('git@github.com:owner/repo.git');

            expect(info).toEqual({
                platform: 'github',
                owner: 'owner',
                repo: 'repo',
            });
        });

        it('should parse GitLab HTTPS URL', () => {
            const info = gitService.parseRemoteInfo('https://gitlab.com/owner/repo.git');

            expect(info).toEqual({
                platform: 'gitlab',
                owner: 'owner',
                repo: 'repo',
            });
        });

        it('should parse GitLab SSH URL', () => {
            const info = gitService.parseRemoteInfo('git@gitlab.com:owner/repo.git');

            expect(info).toEqual({
                platform: 'gitlab',
                owner: 'owner',
                repo: 'repo',
            });
        });

        it('should handle URLs without .git extension', () => {
            const info = gitService.parseRemoteInfo('https://github.com/owner/repo');

            expect(info).toEqual({
                platform: 'github',
                owner: 'owner',
                repo: 'repo',
            });
        });

        it('should return null for invalid URL', () => {
            const info = gitService.parseRemoteInfo('invalid-url');

            expect(info).toBeNull();
        });
    });
});
