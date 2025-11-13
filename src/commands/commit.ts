import { Command, Flags } from '@oclif/core';
import { GitService } from '../core/git.js';
import { ContextBuilder } from '../core/context.js';
import { PromptBuilder } from '../core/prompt.js';
import { ConfigService } from '../core/config.js';
import { ModelFactory } from '../core/model-factory.js';
import { IssueLinker } from '../core/issue-linker.js';
import { logger } from '../utils/logger.js';

export default class Commit extends Command {
    static description = 'Generate a Conventional Commit message from staged changes or diff range';

    static flags = {
        stage: Flags.boolean({ description: 'Use staged changes' }),
        range: Flags.string({ description: 'Use specific diff range (e.g., origin/main...HEAD)' }),
        type: Flags.string({
            description: 'Override commit type',
            options: ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore']
        }),
        scope: Flags.string({ description: 'Override scope' }),
        breaking: Flags.boolean({ description: 'Mark as breaking change' }),
        issue: Flags.string({ description: 'Link issue (id|auto|off)', default: 'off' }),
        emoji: Flags.boolean({ description: 'Prepend type-based emoji' }),
        width: Flags.integer({ description: 'Wrap body to n columns', default: 72 }),
        'dry-run': Flags.boolean({ description: 'Show output without committing' }),
        open: Flags.boolean({ description: 'Open editor for final review' }),
        'no-verify': Flags.boolean({ description: 'Skip git hooks' }),
        model: Flags.string({ description: 'Override model (e.g., openai/gpt-4o-mini)' }),
        'include-diff': Flags.boolean({ description: 'Include diff in AI prompt', default: false }),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(Commit);

        try {
            // Initialize services
            const config = new ConfigService();
            const git = new GitService();
            const contextBuilder = new ContextBuilder(git);
            const promptBuilder = new PromptBuilder();
            const issueLinker = new IssueLinker(git);

            // Validate inputs
            if (!flags.stage && !flags.range) {
                this.error('Must specify either --stage or --range');
            }

            // Get diff
            this.log('🔍 Analyzing changes...');
            const diff = flags.stage
                ? git.getDiff({ staged: true })
                : git.getDiff({ range: flags.range });

            if (!diff || diff.trim().length === 0) {
                this.error('No changes detected');
            }

            // Build context
            this.log('📊 Building context...');
            const context = await contextBuilder.buildContext({
                staged: flags.stage,
                range: flags.range,
            });

            // Handle issue linking
            let issueReference = flags.issue;
            if (flags.issue === 'auto') {
                const detected = issueLinker.extractIssue({ mode: 'auto' });
                if (detected) {
                    issueReference = detected.id;
                    this.log(`🔗 Detected issue: ${issueReference}`);
                } else {
                    this.log('ℹ️  No issue detected from branch name');
                    issueReference = 'off';
                }
            }

            // Create model provider
            this.log('🤖 Generating commit message...');
            const provider = flags.model
                ? ModelFactory.createFromString(flags.model)
                : ModelFactory.createFromConfig(config);

            // Build prompt
            const messages = promptBuilder.buildCommitPrompt(
                context,
                {
                    type: flags.type,
                    scope: flags.scope,
                    breaking: flags.breaking,
                    issue: issueReference,
                    emoji: flags.emoji,
                    width: flags.width,
                    includeDiff: flags['include-diff'],
                },
                flags['include-diff'] ? diff : undefined
            );

            // Generate commit message
            const commitMessage = await provider.complete(messages);

            // Display result
            this.log('\n' + '='.repeat(80));
            this.log(commitMessage);
            this.log('='.repeat(80) + '\n');

            // Handle dry-run
            if (flags['dry-run']) {
                this.log('✅ Dry-run mode - no commit created');
                return;
            }

            // Open in editor if requested
            if (flags.open) {
                this.log('📝 Opening editor for review...');
                // Editor integration would go here
                this.log('ℹ️  Editor integration not yet implemented');
                return;
            }

            // Confirm before committing
            const shouldCommit = await this.confirm('Create commit with this message?');
            if (!shouldCommit) {
                this.log('❌ Commit cancelled');
                return;
            }

            // Create commit
            this.log('💾 Creating commit...');
            git.createCommit({
                message: commitMessage,
                noVerify: flags['no-verify'],
            });

            this.log('✅ Commit created successfully!');
        } catch (error) {
            logger.error('Commit command failed', { error });
            if (error instanceof Error) {
                this.error(error.message);
            } else {
                this.error('An unknown error occurred');
            }
        }
    }

    private async confirm(message: string): Promise<boolean> {
        // Simple confirmation - in production, use proper prompt library
        this.log(`\n${message} (y/N)`);

        // For now, auto-confirm in non-interactive mode
        // In production, integrate with inquirer or similar
        return true;
    }
}
