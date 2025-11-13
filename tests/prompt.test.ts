import { PromptBuilder } from '../src/core/prompt.js';
import { ContextAnalysis } from '../src/core/context.js';

describe('PromptBuilder', () => {
    let builder: PromptBuilder;

    beforeEach(() => {
        builder = new PromptBuilder();
    });

    describe('buildCommitPrompt', () => {
        const mockContext: ContextAnalysis = {
            files: [
                {
                    path: 'src/auth/login.ts',
                    status: 'modified',
                    additions: 15,
                    deletions: 3,
                    magnitude: 'small',
                    keywords: ['login', 'authenticate', 'jwt'],
                    functions: ['handleLogin', 'verifyToken'],
                    classes: [],
                    summary: 'Added JWT token validation',
                },
                {
                    path: 'tests/auth.test.ts',
                    status: 'modified',
                    additions: 8,
                    deletions: 0,
                    magnitude: 'tiny',
                    keywords: ['test', 'auth'],
                    functions: [],
                    classes: [],
                    summary: 'Added authentication tests',
                },
            ],
            type: {
                type: 'feat',
                confidence: 0.85,
                reasons: ['New authentication logic added'],
            },
            scope: {
                scopes: ['auth'],
                confidence: 0.9,
                reasons: ['Files are in auth directory'],
            },
            breaking: false,
            summary: 'Add JWT authentication to login endpoint',
            totalAdditions: 23,
            totalDeletions: 3,
        };

        it('should create basic commit prompt with system and user messages', () => {
            const messages = builder.buildCommitPrompt(mockContext, {});

            expect(messages).toHaveLength(2);
            expect(messages[0].role).toBe('system');
            expect(messages[1].role).toBe('user');
        });

        it('should include Conventional Commit rules in system prompt', () => {
            const messages = builder.buildCommitPrompt(mockContext, {});

            expect(messages[0].content).toContain('Conventional Commit');
            expect(messages[0].content).toContain('feat, fix, docs, style, refactor');
            expect(messages[0].content).toContain('imperative mood');
        });

        it('should include context summary in user message', () => {
            const messages = builder.buildCommitPrompt(mockContext, {});

            expect(messages[1].content).toContain('Add JWT authentication');
            expect(messages[1].content).toContain('src/auth/login.ts');
            expect(messages[1].content).toContain('+15/-3');
        });

        it('should include detected type with confidence', () => {
            const messages = builder.buildCommitPrompt(mockContext, {});

            expect(messages[1].content).toContain('Detected type: feat');
            expect(messages[1].content).toContain('85%');
        });

        it('should override type when explicitly provided', () => {
            const messages = builder.buildCommitPrompt(mockContext, { type: 'fix' });

            expect(messages[1].content).toContain('Type: fix');
            expect(messages[1].content).not.toContain('Detected type');
        });

        it('should include detected scope', () => {
            const messages = builder.buildCommitPrompt(mockContext, {});

            expect(messages[1].content).toContain('Detected scope: auth');
        });

        it('should override scope when explicitly provided', () => {
            const messages = builder.buildCommitPrompt(mockContext, { scope: 'api' });

            expect(messages[1].content).toContain('Scope: api');
            expect(messages[1].content).not.toContain('Detected scope');
        });

        it('should include file magnitude and keywords', () => {
            const messages = builder.buildCommitPrompt(mockContext, {});

            expect(messages[1].content).toContain('[small]');
            expect(messages[1].content).toContain('login, authenticate, jwt');
        });

        it('should indicate breaking changes', () => {
            const breakingContext = { ...mockContext, breaking: true };
            const messages = builder.buildCommitPrompt(breakingContext, {});

            expect(messages[1].content).toContain('Breaking changes detected');
        });

        it('should include issue reference', () => {
            const messages = builder.buildCommitPrompt(mockContext, { issue: 'PROJ-123' });

            expect(messages[1].content).toContain('Linked issue: PROJ-123');
        });

        it('should not include issue when set to off', () => {
            const messages = builder.buildCommitPrompt(mockContext, { issue: 'off' });

            expect(messages[1].content).not.toContain('issue');
        });

        it('should respect custom line width in system prompt', () => {
            const messages = builder.buildCommitPrompt(mockContext, { width: 50 });

            expect(messages[0].content).toContain('50 characters');
            expect(messages[0].content).toContain('Wrap body at 50');
        });

        it('should include emoji instructions when enabled', () => {
            const messages = builder.buildCommitPrompt(mockContext, { emoji: true });

            expect(messages[0].content).toContain('Prepend emoji');
            expect(messages[0].content).toContain('feat 🚀');
            expect(messages[0].content).toContain('fix 🐛');
        });

        it('should include breaking change footer instruction when flagged', () => {
            const messages = builder.buildCommitPrompt(mockContext, { breaking: true });

            expect(messages[0].content).toContain('BREAKING CHANGE:');
        });

        it('should include diff when provided and requested', () => {
            const diff = `diff --git a/src/auth/login.ts b/src/auth/login.ts
index abc123..def456 100644
--- a/src/auth/login.ts
+++ b/src/auth/login.ts
@@ -10,6 +10,8 @@ export function login(credentials) {
+  const token = jwt.sign(payload);
+  return { token };
 }`;
            const messages = builder.buildCommitPrompt(mockContext, { includeDiff: true }, diff);

            expect(messages[1].content).toContain('Diff preview:');
            expect(messages[1].content).toContain('```diff');
            expect(messages[1].content).toContain('jwt.sign');
        });

        it('should not include diff when includeDiff is false', () => {
            const diff = 'some diff content';
            const messages = builder.buildCommitPrompt(mockContext, { includeDiff: false }, diff);

            expect(messages[1].content).not.toContain('Diff');
        });

        it('should truncate large diffs', () => {
            const largeDiff = Array(200)
                .fill('+ line of code')
                .join('\n');
            const messages = builder.buildCommitPrompt(
                mockContext,
                { includeDiff: true, maxDiffLines: 50 },
                largeDiff
            );

            expect(messages[1].content).toContain('more lines omitted');
        });

        it('should redact sensitive data from diff', () => {
            const diffWithSecret = `diff --git a/config.ts b/config.ts
index abc123..def456 100644
--- a/config.ts
+++ b/config.ts
@@ -1,3 +1,5 @@
+const api_key = "sk-proj-abc123secretkey12345";
+const password = "mypassword123";
 const CONFIG = {};`;
            const messages = builder.buildCommitPrompt(mockContext, { includeDiff: true }, diffWithSecret);

            expect(messages[1].content).toContain('[REDACTED]');
            expect(messages[1].content).not.toContain('sk-proj-abc123secretkey12345');
            expect(messages[1].content).not.toContain('mypassword123');
        });
    });

    describe('buildPRPrompt', () => {
        const mockContext: ContextAnalysis = {
            files: [
                {
                    path: 'src/api/users.ts',
                    status: 'modified',
                    additions: 45,
                    deletions: 12,
                    magnitude: 'medium',
                    keywords: ['api', 'users', 'endpoint'],
                    functions: ['getUsers', 'createUser'],
                    classes: [],
                    summary: 'Refactored user API endpoints',
                },
            ],
            type: {
                type: 'refactor',
                confidence: 0.75,
                reasons: ['Code restructuring detected'],
            },
            scope: {
                scopes: ['api'],
                confidence: 0.8,
                reasons: ['Changes in api directory'],
            },
            breaking: false,
            summary: 'Refactor user API for better performance',
            totalAdditions: 45,
            totalDeletions: 12,
        };

        it('should create PR prompt with system and user messages', () => {
            const messages = builder.buildPRPrompt(mockContext, 'main', 'feature/refactor-api');

            expect(messages).toHaveLength(2);
            expect(messages[0].role).toBe('system');
            expect(messages[1].role).toBe('user');
        });

        it('should include PR structure requirements in system prompt', () => {
            const messages = builder.buildPRPrompt(mockContext, 'main', 'feature/refactor-api');

            expect(messages[0].content).toContain('PR description');
            expect(messages[0].content).toContain('Summary');
            expect(messages[0].content).toContain('Changes');
            expect(messages[0].content).toContain('Breaking Changes');
            expect(messages[0].content).toContain('Migration Steps');
            expect(messages[0].content).toContain('Testing');
        });

        it('should include branch names in user message', () => {
            const messages = builder.buildPRPrompt(mockContext, 'main', 'feature/refactor-api');

            expect(messages[1].content).toContain('merging feature/refactor-api into main');
        });

        it('should include change type', () => {
            const messages = builder.buildPRPrompt(mockContext, 'main', 'feature/refactor-api');

            expect(messages[1].content).toContain('Change type: refactor');
        });

        it('should indicate breaking changes in PR', () => {
            const breakingContext = { ...mockContext, breaking: true };
            const messages = builder.buildPRPrompt(breakingContext, 'main', 'feature/breaking');

            expect(messages[1].content).toContain('Contains breaking changes');
        });

        it('should include file summaries', () => {
            const messages = builder.buildPRPrompt(mockContext, 'main', 'feature/refactor-api');

            expect(messages[1].content).toContain('src/api/users.ts');
            expect(messages[1].content).toContain('Refactored user API endpoints');
        });

        it('should include diff preview when provided', () => {
            const diff = 'some diff content';
            const messages = builder.buildPRPrompt(mockContext, 'main', 'feature/refactor-api', diff);

            expect(messages[1].content).toContain('Diff preview:');
        });

        it('should truncate PR diff to 150 lines by default', () => {
            const largeDiff = Array(300)
                .fill('+ line')
                .join('\n');
            const messages = builder.buildPRPrompt(mockContext, 'main', 'feature/refactor-api', largeDiff);

            expect(messages[1].content).toContain('more lines omitted');
        });

        it('should redact secrets from PR diff', () => {
            const diffWithSecret = `diff --git a/.env b/.env
--- a/.env
+++ b/.env
@@ -1,0 +1,2 @@
+api_key="sk-abcdefghijklmnopqrstuvwxyz123456"
+password="hunter2secret"`;
            const messages = builder.buildPRPrompt(mockContext, 'main', 'feature/api', diffWithSecret);

            expect(messages[1].content).toContain('[REDACTED]');
            expect(messages[1].content).not.toContain('sk-abcdefghijklmnopqrstuvwxyz123456');
            expect(messages[1].content).not.toContain('hunter2secret');
        });
    });

    describe('edge cases', () => {
        it('should handle empty file list', () => {
            const emptyContext: ContextAnalysis = {
                files: [],
                type: { type: 'chore', confidence: 0.5, reasons: [] },
                scope: { scopes: [], confidence: 0, reasons: [] },
                breaking: false,
                summary: 'No changes',
                totalAdditions: 0,
                totalDeletions: 0,
            };

            const messages = builder.buildCommitPrompt(emptyContext, {});
            expect(messages[1].content).toContain('Files changed (0)');
        });

        it('should handle files without keywords', () => {
            const context: ContextAnalysis = {
                files: [
                    {
                        path: 'file.txt',
                        status: 'added',
                        additions: 1,
                        deletions: 0,
                        magnitude: 'tiny',
                        keywords: [],
                        functions: [],
                        classes: [],
                        summary: '',
                    },
                ],
                type: { type: 'chore', confidence: 0.5, reasons: [] },
                scope: { scopes: [], confidence: 0, reasons: [] },
                breaking: false,
                summary: 'Add file',
                totalAdditions: 1,
                totalDeletions: 0,
            };

            const messages = builder.buildCommitPrompt(context, {});
            expect(messages[1].content).toContain('file.txt');
        });

        it('should handle undefined diff gracefully', () => {
            const context: ContextAnalysis = {
                files: [],
                type: { type: 'chore', confidence: 0.5, reasons: [] },
                scope: { scopes: [], confidence: 0, reasons: [] },
                breaking: false,
                summary: 'Test',
                totalAdditions: 0,
                totalDeletions: 0,
            };

            const messages = builder.buildCommitPrompt(context, { includeDiff: true }, undefined);
            expect(messages[1].content).not.toContain('Diff');
        });
    });
});
