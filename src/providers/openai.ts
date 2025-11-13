import OpenAI from 'openai';
import { ModelProvider, Message } from '../core/model.js';
import { logger } from '../utils/logger.js';

export interface OpenAIProviderOptions {
    apiKey?: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
    maxRetries?: number;
    timeout?: number;
}

export class OpenAIProvider implements ModelProvider {
    private client: OpenAI;
    private model: string;
    private temperature: number;
    private maxTokens: number;

    constructor(opts: OpenAIProviderOptions) {
        const apiKey = opts.apiKey || process.env.OPENAI_API_KEY;

        if (!apiKey) {
            throw new Error(
                'OpenAI API key is required. Set OPENAI_API_KEY environment variable or pass apiKey option.'
            );
        }

        this.client = new OpenAI({
            apiKey,
            maxRetries: opts.maxRetries ?? 3,
            timeout: opts.timeout ?? 60000, // 60 seconds
        });
        this.model = opts.model || 'gpt-4o-mini';
        this.temperature = opts.temperature ?? 0.2;
        this.maxTokens = opts.maxTokens ?? 512;

        logger.debug('OpenAI provider initialized', {
            model: this.model,
            temperature: this.temperature,
            maxTokens: this.maxTokens,
        });
    }

    async complete(messages: Message[]): Promise<string> {
        if (!messages || messages.length === 0) {
            throw new Error('Messages array cannot be empty');
        }

        // Validate message structure
        for (const msg of messages) {
            if (!msg.role || !msg.content) {
                throw new Error('Each message must have role and content');
            }
            if (!['system', 'user', 'assistant'].includes(msg.role)) {
                throw new Error(`Invalid message role: ${msg.role}`);
            }
        }

        try {
            logger.debug(`Calling OpenAI API with model: ${this.model}`);

            const response = await this.client.chat.completions.create({
                model: this.model,
                temperature: this.temperature,
                max_tokens: this.maxTokens,
                messages: messages.map((m) => ({
                    role: m.role,
                    content: m.content,
                })),
            });

            const content = response.choices[0]?.message?.content;

            if (!content) {
                throw new Error('No content received from OpenAI API');
            }

            logger.debug('OpenAI API call successful', {
                tokens: response.usage?.total_tokens || 0,
                model: response.model,
            });

            return content.trim();
        } catch (error) {
            return this.handleError(error);
        }
    }

    private handleError(error: unknown): never {
        if (error instanceof OpenAI.APIError) {
            const status = (error as any).status || error.status;
            const code = (error as any).code || error.code;

            logger.error('OpenAI API error', {
                status,
                message: error.message,
                code,
            });

            // Handle specific error types
            if (status === 401) {
                throw new Error('Invalid OpenAI API key. Check your OPENAI_API_KEY environment variable.');
            }

            if (status === 429) {
                throw new Error('OpenAI API rate limit exceeded. Please try again later.');
            }

            if (status === 503) {
                throw new Error('OpenAI API is temporarily unavailable. Please try again later.');
            }

            if (code === 'model_not_found') {
                throw new Error(`Model '${this.model}' not found. Check your model name.`);
            }

            if (code === 'context_length_exceeded') {
                throw new Error(
                    'Input is too long for the model. Try reducing the diff size or context.'
                );
            }

            // Generic API error
            throw new Error(`OpenAI API error: ${error.message}`);
        }

        // Network or other errors
        if (error instanceof Error) {
            logger.error('Unexpected error during OpenAI API call', { error: error.message });
            throw new Error(`Failed to call OpenAI API: ${error.message}`);
        }

        throw new Error('Unknown error occurred during OpenAI API call');
    }
}
