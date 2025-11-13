// Delegate to the JS-based test to avoid TypeScript mock typing friction
// commands.test.ts intentionally left blank; JS implementation lives in commands.test.js
// This file prevents TypeScript from attempting to compile a complex mock-heavy TS test.
// @ts-nocheck
// Command tests migrated from JS to this TS file but type-checking is disabled
// to avoid complex jest mock typing friction. Uses Jest globals provided by the
// test environment (do not re-declare them here).

// Command classes will be required after mocks are configured to ensure the
// modules pick up the mocked dependencies.
let CommitCommand;
let PRCommand;
let ComposeCommand;

// Mock dependent modules used by commands
jest.mock('../src/core/config');
jest.mock('../src/core/git');
jest.mock('../src/core/context');
jest.mock('../src/core/prompt');
jest.mock('../src/core/model-factory');
jest.mock('../src/core/issue-linker');
jest.mock('../src/utils/logger');

const { GitService } = require('../src/core/git');
const { ContextBuilder } = require('../src/core/context');
const { PromptBuilder } = require('../src/core/prompt');
const { ModelFactory } = require('../src/core/model-factory');
const { IssueLinker } = require('../src/core/issue-linker');

describe('CLI Commands', () => {
    let mockGit;
    let mockContextBuilder;
    let mockPromptBuilder;
    let mockProvider;

    beforeEach(() => {
        jest.resetAllMocks();

        // GitService mock
        mockGit = new GitService();
        mockGit.getDiff = jest.fn();
        mockGit.getChangedFiles = jest.fn();
        mockGit.createCommit = jest.fn();

        GitService.mockImplementation(() => mockGit);

        // ContextBuilder mock
        const contextResult = {
            files: [],
            type: { type: 'feat', confidence: 1, reasons: [] },
            scope: { scopes: ['api'], confidence: 1, reasons: [] },
            breaking: false,
            summary: 'Test summary',
            totalAdditions: 10,
            totalDeletions: 2,
        };

        mockContextBuilder = { buildContext: jest.fn().mockResolvedValue(contextResult) };
        ContextBuilder.mockImplementation(() => mockContextBuilder);

        // PromptBuilder mock
        mockPromptBuilder = new PromptBuilder();
        mockPromptBuilder.buildCommitPrompt = jest.fn().mockReturnValue([{ role: 'user', content: 'prompt' }]);
        mockPromptBuilder.buildPRPrompt = jest.fn().mockReturnValue([{ role: 'user', content: 'pr-prompt' }]);
        PromptBuilder.mockImplementation(() => mockPromptBuilder);

        // Provider mock
        mockProvider = { complete: jest.fn().mockResolvedValue('feat(api): add feature\n\nDetails') };
        jest.spyOn(ModelFactory, 'createFromConfig').mockReturnValue(mockProvider);
        jest.spyOn(ModelFactory, 'createFromString').mockReturnValue(mockProvider);		// IssueLinker mock
        const mockIssue = new IssueLinker();
        mockIssue.extractIssue = jest.fn().mockReturnValue({ id: '123' });
        IssueLinker.mockImplementation(() => mockIssue);

        // Require command classes after mocks are in place
        CommitCommand = require('../src/commands/commit').default;
        PRCommand = require('../src/commands/pr').default;
        ComposeCommand = require('../src/commands/compose').default;
    });

    describe('commit command', () => {
        it('errors when neither --stage nor --range is provided', async () => {
            const cmd = new CommitCommand();
            // mock parse to return empty flags
            jest.spyOn(cmd, 'parse').mockResolvedValue({ flags: {} });

            await expect(cmd.run()).rejects.toThrow(/Must specify either --stage or --range/);
        });

        it('runs and performs dry-run without creating commit', async () => {
            const cmd = new CommitCommand();
            jest.spyOn(cmd, 'parse').mockResolvedValue({ flags: { stage: true, 'dry-run': true } });

            // git.getDiff should return non-empty diff
            mockGit.getDiff.mockReturnValue('diff content');

            await expect(cmd.run()).resolves.toBeUndefined();

            expect(mockPromptBuilder.buildCommitPrompt).toHaveBeenCalled();
            expect(mockProvider.complete).toHaveBeenCalled();
            expect(mockGit.createCommit).not.toHaveBeenCalled();
        });

        it('opens editor when --open flag provided and returns', async () => {
            const cmd = new CommitCommand();
            jest.spyOn(cmd, 'parse').mockResolvedValue({ flags: { stage: true, open: true } });
            mockGit.getDiff.mockReturnValue('diff');

            await expect(cmd.run()).resolves.toBeUndefined();

            // Should not create commit because open path returns early
            expect(mockGit.createCommit).not.toHaveBeenCalled();
        });
    });

    describe('pr command', () => {
        it('errors when no changes between base and head', async () => {
            const cmd = new PRCommand();
            jest.spyOn(cmd, 'parse').mockResolvedValue({ flags: { base: 'main', head: 'feature' } });

            mockGit.getDiff.mockReturnValue('');

            await expect(cmd.run()).rejects.toThrow(/No changes found between/);
        });

        it('generates PR description and writes to default file on non-dry run', async () => {
            const writeSpy = jest.spyOn(require('fs'), 'writeFileSync').mockImplementation(() => { });

            const cmd = new PRCommand();
            jest.spyOn(cmd, 'parse').mockResolvedValue({ flags: { base: 'main', head: 'feature', 'dry-run': false } });

            mockGit.getDiff.mockReturnValue('diff');

            await expect(cmd.run()).resolves.toBeUndefined();

            expect(mockPromptBuilder.buildPRPrompt).toHaveBeenCalled();
            expect(mockProvider.complete).toHaveBeenCalled();
            expect(writeSpy).toHaveBeenCalled();

            writeSpy.mockRestore();
        });
    });

    describe('compose command', () => {
        it('errors when --pr is set without --base', async () => {
            const cmd = new ComposeCommand();
            jest.spyOn(cmd, 'parse').mockResolvedValue({ flags: { pr: true, stage: true } });

            mockGit.getDiff.mockReturnValue('diff');

            await expect(cmd.run()).rejects.toThrow(/Must specify --base when using --pr/);
        });

        it('runs full compose flow with dry-run and does not create commit', async () => {
            const cmd = new ComposeCommand();
            jest.spyOn(cmd, 'parse').mockResolvedValue({ flags: { stage: true, 'dry-run': true } });

            mockGit.getDiff.mockReturnValue('diff');

            await expect(cmd.run()).resolves.toBeUndefined();

            expect(mockPromptBuilder.buildCommitPrompt).toHaveBeenCalled();
            expect(mockProvider.complete).toHaveBeenCalled();
            expect(mockGit.createCommit).not.toHaveBeenCalled();
        });
    });
});

