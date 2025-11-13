import { Command, Flags } from '@oclif/core';
import { GitService } from '../core/git.js';
import { ContextBuilder } from '../core/context.js';
import { PromptBuilder } from '../core/prompt.js';
import { ConfigService } from '../core/config.js';
import { ModelFactory } from '../core/model-factory.js';
import { IssueLinker } from '../core/issue-linker.js';
import { logger } from '../utils/logger.js';
import { writeFileSync } from 'fs';

export default class PR extends Command {
    static description = 'Generate structured PR description';

    static flags = {
        base: Flags.string({ description: 'Target base branch', required: true }),
        head: Flags.string({ description: 'Source branch', default: 'HEAD' }),
        template: Flags.string({ description: 'Custom markdown template path' }),
        out: Flags.string({ description: 'Output file (use - for stdout)' }),
        issue: Flags.string({ description: 'Link issue (id|auto|off)', default: 'off' }),
        'dry-run': Flags.boolean({ description: 'Preview without writing' }),
        model: Flags.string({ description: 'Override model' }),
        'include-diff': Flags.boolean({ description: 'Include diff preview in AI prompt', default: true }),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(PR);

        try {
            // Initialize services
            const config = new ConfigService();
            const git = new GitService();
            const contextBuilder = new ContextBuilder(git);
            const promptBuilder = new PromptBuilder();
            const issueLinker = new IssueLinker(git);

            // Determine range
            const range = `${flags.base}...${flags.head}`;

            this.log(`🔍 Analyzing changes between ${flags.base} and ${flags.head}...`);

            // Get diff
            const diff = git.getDiff({ range });

            if (!diff || diff.trim().length === 0) {
                this.error(`No changes found between ${flags.base} and ${flags.head}`);
            }

            // Build context
            this.log('📊 Building context...');
            const context = await contextBuilder.buildContext({ range });

            // Handle issue linking
            let issueReference: string | undefined;
            if (flags.issue === 'auto') {
                const detected = issueLinker.extractIssue({ mode: 'auto' });
                if (detected) {
                    issueReference = detected.id;
                    this.log(`🔗 Detected issue: ${issueReference}`);
                }
            } else if (flags.issue !== 'off') {
                issueReference = flags.issue;
            }

            // Create model provider
            this.log('🤖 Generating PR description...');
            const provider = flags.model
                ? ModelFactory.createFromString(flags.model)
                : ModelFactory.createFromConfig(config);

            // Build prompt
            const messages = promptBuilder.buildPRPrompt(
                context,
                flags.base,
                flags.head,
                flags['include-diff'] ? diff : undefined
            );

            // Generate PR description
            let prDescription = await provider.complete(messages);

            // Add issue reference if available
            if (issueReference) {
                prDescription += `\n\n---\nRelated: #${issueReference}\n`;
            }

            // Apply template if provided
            if (flags.template) {
                // Template application would go here
                this.log(`ℹ️  Template support not yet implemented`);
            }

            // Display result
            this.log('\n' + '='.repeat(80));
            this.log(prDescription);
            this.log('='.repeat(80) + '\n');

            // Handle dry-run
            if (flags['dry-run']) {
                this.log('✅ Dry-run mode - no file written');
                return;
            }

            // Handle output
            if (flags.out) {
                if (flags.out === '-') {
                    // Already printed above
                    this.log('✅ PR description printed to stdout');
                } else {
                    writeFileSync(flags.out, prDescription, 'utf-8');
                    this.log(`✅ PR description written to: ${flags.out}`);
                }
            } else {
                // Default: write to PR_DESCRIPTION.md
                const defaultFile = 'PR_DESCRIPTION.md';
                writeFileSync(defaultFile, prDescription, 'utf-8');
                this.log(`✅ PR description written to: ${defaultFile}`);
            }
        } catch (error) {
            logger.error('PR command failed', { error });
            if (error instanceof Error) {
                this.error(error.message);
            } else {
                this.error('An unknown error occurred');
            }
        }
    }
}
