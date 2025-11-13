import { Command, Flags } from '@oclif/core';
import { GitService } from '../core/git.js';
import { ContextBuilder } from '../core/context.js';
import { PromptBuilder } from '../core/prompt.js';
import { ConfigService } from '../core/config.js';
import { ModelFactory } from '../core/model-factory.js';
import { IssueLinker } from '../core/issue-linker.js';
import { logger } from '../utils/logger.js';
import { writeFileSync } from 'fs';

export default class Compose extends Command {
    static description = 'One-shot workflow to generate both commit message and PR description';

    static flags = {
        // Commit flags
        stage: Flags.boolean({ description: 'Use staged changes' }),
        range: Flags.string({ description: 'Use specific diff range (e.g., origin/main...HEAD)' }),
        type: Flags.string({
            description: 'Override commit type',
            options: ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore']
        }),
        scope: Flags.string({ description: 'Override scope' }),
        breaking: Flags.boolean({ description: 'Mark as breaking change' }),
        emoji: Flags.boolean({ description: 'Prepend type-based emoji to commit' }),
        width: Flags.integer({ description: 'Wrap commit body to n columns', default: 72 }),
        'no-verify': Flags.boolean({ description: 'Skip git hooks when committing' }),

        // PR flags
        pr: Flags.boolean({ description: 'Also generate PR description', default: false }),
        base: Flags.string({ description: 'Target base branch for PR' }),
        'pr-out': Flags.string({ description: 'PR output file', default: 'PR_DESCRIPTION.md' }),

        // Common flags
        issue: Flags.string({ description: 'Link issue (id|auto|off)', default: 'off' }),
        model: Flags.string({ description: 'Override model (e.g., openai/gpt-4o-mini)' }),
        'dry-run': Flags.boolean({ description: 'Show output without creating commit/files' }),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(Compose);

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

            if (flags.pr && !flags.base) {
                this.error('Must specify --base when using --pr');
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
                    issueReference = 'off';
                }
            }

            // Create model provider
            const provider = flags.model
                ? ModelFactory.createFromString(flags.model)
                : ModelFactory.createFromConfig(config);

            // Generate commit message
            this.log('🤖 Generating commit message...');
            const commitMessages = promptBuilder.buildCommitPrompt(
                context,
                {
                    type: flags.type,
                    scope: flags.scope,
                    breaking: flags.breaking,
                    issue: issueReference,
                    emoji: flags.emoji,
                    width: flags.width,
                }
            );
            const commitMessage = await provider.complete(commitMessages);

            this.log('\n📝 Commit Message:');
            this.log('='.repeat(80));
            this.log(commitMessage);
            this.log('='.repeat(80) + '\n');

            // Generate PR description if requested
            let prDescription: string | undefined;
            if (flags.pr && flags.base) {
                this.log('🤖 Generating PR description...');
                const prMessages = promptBuilder.buildPRPrompt(
                    context,
                    flags.base,
                    'HEAD',
                    diff
                );
                prDescription = await provider.complete(prMessages);

                if (issueReference && issueReference !== 'off') {
                    prDescription += `\n\n---\nRelated: #${issueReference}\n`;
                }

                this.log('\n📋 PR Description:');
                this.log('='.repeat(80));
                this.log(prDescription);
                this.log('='.repeat(80) + '\n');
            }

            // Handle dry-run
            if (flags['dry-run']) {
                this.log('✅ Dry-run mode - no commit or files created');
                return;
            }

            // Create commit
            this.log('💾 Creating commit...');
            git.createCommit({
                message: commitMessage,
                noVerify: flags['no-verify'],
            });
            this.log('✅ Commit created successfully!');

            // Write PR description if generated
            if (prDescription && flags['pr-out']) {
                writeFileSync(flags['pr-out'], prDescription, 'utf-8');
                this.log(`✅ PR description written to: ${flags['pr-out']}`);
            }

            this.log('\n🎉 Compose workflow completed!');
        } catch (error) {
            logger.error('Compose command failed', { error });
            if (error instanceof Error) {
                this.error(error.message);
            } else {
                this.error('An unknown error occurred');
            }
        }
    }
}
