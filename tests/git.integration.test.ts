import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { GitService, GitError } from '../src/core/git';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as os from 'os';

/**
 * Integration tests for GitService
 * These tests use real git commands and temporary repositories
 */
describe('GitService Integration Tests', () => {
    let testRepoPath: string;
    let gitService: GitService;

    beforeAll(() => {
        // Create a temporary directory for test repository
        testRepoPath = fs.mkdtempSync(path.join(os.tmpdir(), 'aicmt-test-'));

        // Initialize git repository
        execSync('git init', { cwd: testRepoPath });
        execSync('git config user.name "Test User"', { cwd: testRepoPath });
        execSync('git config user.email "test@example.com"', { cwd: testRepoPath });

        // Create initial commit
        fs.writeFileSync(path.join(testRepoPath, 'README.md'), '# Test Repository\n');
        execSync('git add README.md', { cwd: testRepoPath });
        execSync('git commit -m "Initial commit"', { cwd: testRepoPath });

        gitService = new GitService(testRepoPath);
    });

    afterAll(() => {
        // Clean up test repository
        if (fs.existsSync(testRepoPath)) {
            fs.rmSync(testRepoPath, { recursive: true, force: true });
        }
    });

    describe('initialization', () => {
        it('should initialize successfully in a git repository', () => {
            expect(gitService).toBeDefined();
        });

        it('should throw error when not in a git repository', () => {
            const nonGitPath = fs.mkdtempSync(path.join(os.tmpdir(), 'aicmt-no-git-'));

            try {
                expect(() => new GitService(nonGitPath)).toThrow(GitError);
            } finally {
                fs.rmSync(nonGitPath, { recursive: true, force: true });
            }
        });

        it('should detect git availability', () => {
            expect(GitService.isGitAvailable()).toBe(true);
        });

        it('should get git version', () => {
            const version = gitService.getGitVersion();
            expect(version).toMatch(/^\d+\.\d+\.\d+/);
        });
    });

    describe('getDiff', () => {
        it('should get diff for staged changes', () => {
            // Create a new file and stage it
            fs.writeFileSync(path.join(testRepoPath, 'test.txt'), 'Hello World\n');
            execSync('git add test.txt', { cwd: testRepoPath });

            const diff = gitService.getDiff({ staged: true });

            expect(diff).toContain('diff --git');
            expect(diff).toContain('test.txt');
            expect(diff).toContain('+Hello World');
        });

        it('should throw error when no staged changes', () => {
            // Reset staging area
            try {
                execSync('git reset', { cwd: testRepoPath, stdio: 'ignore' });
            } catch (e) {
                // Ignore errors
            }

            expect(() => gitService.getDiff({ staged: true })).toThrow(GitError);
            expect(() => gitService.getDiff({ staged: true })).toThrow(/No staged changes/);
        });

        it('should get diff for a range', () => {
            // Create and commit a change
            fs.writeFileSync(path.join(testRepoPath, 'range-test.txt'), 'Content\n');
            execSync('git add range-test.txt', { cwd: testRepoPath });
            execSync('git commit -m "Add range test file"', { cwd: testRepoPath });

            const diff = gitService.getDiff({ range: 'HEAD~1..HEAD' });

            expect(diff).toContain('diff --git');
            expect(diff).toContain('range-test.txt');
        });
    });

    describe('getChangedFiles', () => {
        it('should detect added files', () => {
            fs.writeFileSync(path.join(testRepoPath, 'added.txt'), 'New file\n');
            execSync('git add added.txt', { cwd: testRepoPath });

            const files = gitService.getChangedFiles({ staged: true });

            expect(files).toHaveLength(1);
            expect(files[0].path).toBe('added.txt');
            expect(files[0].status).toBe('added');
            expect(files[0].additions).toBeGreaterThan(0);
        });

        it('should detect modified files', () => {
            // Modify README.md
            fs.appendFileSync(path.join(testRepoPath, 'README.md'), '\nAdditional content\n');
            execSync('git add README.md', { cwd: testRepoPath });

            const files = gitService.getChangedFiles({ staged: true });

            const readme = files.find((f) => f.path === 'README.md');
            expect(readme).toBeDefined();
            expect(readme?.status).toBe('modified');
            expect(readme?.additions).toBeGreaterThan(0);
        });

        it('should detect deleted files', () => {
            // Create, commit, then delete a file
            fs.writeFileSync(path.join(testRepoPath, 'to-delete.txt'), 'Delete me\n');
            execSync('git add to-delete.txt', { cwd: testRepoPath });
            execSync('git commit -m "Add file to delete"', { cwd: testRepoPath });

            fs.unlinkSync(path.join(testRepoPath, 'to-delete.txt'));
            execSync('git add to-delete.txt', { cwd: testRepoPath });

            const files = gitService.getChangedFiles({ staged: true });

            const deleted = files.find((f) => f.path === 'to-delete.txt');
            expect(deleted).toBeDefined();
            expect(deleted?.status).toBe('deleted');
        });

        it('should detect renamed files', () => {
            // Create, commit, then rename a file
            fs.writeFileSync(path.join(testRepoPath, 'old-name.txt'), 'Content\n');
            execSync('git add old-name.txt', { cwd: testRepoPath });
            execSync('git commit -m "Add file to rename"', { cwd: testRepoPath });

            execSync('git mv old-name.txt new-name.txt', { cwd: testRepoPath });

            const files = gitService.getChangedFiles({ staged: true });

            const renamed = files.find((f) => f.path === 'new-name.txt');
            expect(renamed).toBeDefined();
            expect(renamed?.status).toBe('renamed');
            expect(renamed?.oldPath).toBe('old-name.txt');
        });
    });

    describe('getCurrentBranch', () => {
        it('should get current branch name', () => {
            const branch = gitService.getCurrentBranch();
            // Could be 'master' or 'main' depending on git config
            expect(branch === 'master' || branch === 'main').toBe(true);
        });

        it('should handle detached HEAD state', () => {
            // Get current commit SHA
            const sha = execSync('git rev-parse HEAD', {
                cwd: testRepoPath,
                encoding: 'utf-8',
            }).trim();

            // Checkout specific commit to create detached HEAD
            execSync(`git checkout ${sha}`, { cwd: testRepoPath, stdio: 'ignore' });

            const branch = gitService.getCurrentBranch();
            // In detached HEAD state, rev-parse --abbrev-ref HEAD returns "HEAD"
            expect(branch).toBe('HEAD');

            // Go back to branch
            execSync('git checkout master || git checkout main', {
                cwd: testRepoPath,
                stdio: 'ignore',
            });
        });
    });

    describe('getFileHistory', () => {
        it('should get commit history for a file', () => {
            const history = gitService.getFileHistory('README.md', 5);

            expect(history.length).toBeGreaterThan(0);
            // History returns commit messages, not full commit info
            expect(typeof history[0]).toBe('string');
        });

        it('should return empty array for new file without history', () => {
            fs.writeFileSync(path.join(testRepoPath, 'no-history.txt'), 'New\n');

            const history = gitService.getFileHistory('no-history.txt');

            expect(history).toEqual([]);
        });

        it('should respect limit parameter', () => {
            const history = gitService.getFileHistory('README.md', 1);

            expect(history.length).toBeLessThanOrEqual(1);
        });
    });

    describe('hasStagedChanges', () => {
        beforeAll(() => {
            // Reset staging area
            try {
                execSync('git reset', { cwd: testRepoPath, stdio: 'ignore' });
            } catch (e) {
                // Ignore
            }
        });

        it('should return false when no staged changes', () => {
            expect(gitService.hasStagedChanges()).toBe(false);
        });

        it('should return true when there are staged changes', () => {
            fs.writeFileSync(path.join(testRepoPath, 'staged.txt'), 'Staged\n');
            execSync('git add staged.txt', { cwd: testRepoPath });

            expect(gitService.hasStagedChanges()).toBe(true);

            // Clean up
            execSync('git reset', { cwd: testRepoPath, stdio: 'ignore' });
        });
    });

    describe('hasUncommittedChanges', () => {
        beforeAll(() => {
            // Clean working directory
            try {
                execSync('git reset --hard', { cwd: testRepoPath, stdio: 'ignore' });
                execSync('git clean -fd', { cwd: testRepoPath, stdio: 'ignore' });
            } catch (e) {
                // Ignore
            }
        });

        it('should return false when working tree is clean', () => {
            expect(gitService.hasUncommittedChanges()).toBe(false);
        });

        it('should return true when there are uncommitted changes', () => {
            fs.writeFileSync(path.join(testRepoPath, 'uncommitted.txt'), 'Uncommitted\n');

            expect(gitService.hasUncommittedChanges()).toBe(true);

            // Clean up
            fs.unlinkSync(path.join(testRepoPath, 'uncommitted.txt'));
        });
    });

    describe('createCommit', () => {
        it('should create a commit with message', () => {
            // Stage a change
            fs.writeFileSync(path.join(testRepoPath, 'commit-test.txt'), 'Test\n');
            execSync('git add commit-test.txt', { cwd: testRepoPath });

            gitService.createCommit({
                message: 'test: add commit test file',
            });

            // Verify commit was created
            const lastCommit = execSync('git log -1 --pretty=%B', {
                cwd: testRepoPath,
                encoding: 'utf-8',
            }).trim();

            expect(lastCommit).toBe('test: add commit test file');
        });

        it('should throw error when nothing to commit', () => {
            // Clean staging area
            try {
                execSync('git reset', { cwd: testRepoPath, stdio: 'ignore' });
            } catch (e) {
                // Ignore
            }

            expect(() =>
                gitService.createCommit({
                    message: 'This should fail',
                })
            ).toThrow(GitError);
        });
    });

    describe('getRepositoryRoot', () => {
        it('should return repository root path', () => {
            const root = gitService.getRepositoryRoot();
            expect(root).toBe(testRepoPath);
        });
    });

    describe('getRemoteUrl', () => {
        it('should return null when no remote exists', () => {
            const url = gitService.getRemoteUrl();
            expect(url).toBeNull();
        });

        it('should return remote URL when remote exists', () => {
            // Add a remote
            execSync('git remote add origin https://github.com/test/repo.git', {
                cwd: testRepoPath,
            });

            const url = gitService.getRemoteUrl();
            expect(url).toBe('https://github.com/test/repo.git');

            // Clean up
            execSync('git remote remove origin', { cwd: testRepoPath });
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

        it('should parse GitLab URL', () => {
            const info = gitService.parseRemoteInfo('https://gitlab.com/owner/repo.git');

            expect(info).toEqual({
                platform: 'gitlab',
                owner: 'owner',
                repo: 'repo',
            });
        });

        it('should return null for invalid URL', () => {
            const info = gitService.parseRemoteInfo('not-a-valid-url');

            expect(info).toBeNull();
        });
    });
});
