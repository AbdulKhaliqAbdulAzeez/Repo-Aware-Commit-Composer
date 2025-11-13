import { ModelProvider } from './model.js';
import { OpenAIProvider } from '../providers/openai.js';
import { ConfigService } from './config.js';
import { logger } from '../utils/logger.js';

export class ModelFactory {
    /**
     * Create a model provider from configuration
     */
    static createFromConfig(config?: ConfigService): ModelProvider {
        const cfg = config || new ConfigService();
        const modelConfig = cfg.getValue('model');

        if (!modelConfig) {
            throw new Error('Model configuration is required');
        }

        const provider = modelConfig.provider || 'openai';
        const modelName = modelConfig.name || 'gpt-4o-mini';
        const temperature = modelConfig.temperature ?? 0.2;
        const maxTokens = modelConfig.max_tokens ?? 512;

        logger.debug('Creating model provider', {
            provider,
            model: modelName,
            temperature,
            maxTokens,
        });

        return ModelFactory.create(provider, {
            model: modelName,
            temperature,
            maxTokens,
        });
    }

    /**
     * Create a model provider from explicit parameters
     */
    static create(
        provider: string,
        options: {
            model: string;
            temperature?: number;
            maxTokens?: number;
            apiKey?: string;
        }
    ): ModelProvider {
        switch (provider.toLowerCase()) {
            case 'openai':
                return new OpenAIProvider({
                    model: options.model,
                    temperature: options.temperature,
                    maxTokens: options.maxTokens,
                    apiKey: options.apiKey,
                });

            default:
                throw new Error(
                    `Unsupported model provider: ${provider}. Supported providers: openai`
                );
        }
    }

    /**
     * Parse model string in format "provider/model-name"
     */
    static parseModelString(modelString: string): { provider: string; model: string } {
        const parts = modelString.split('/');

        if (parts.length === 1) {
            // Just model name - assume OpenAI
            return { provider: 'openai', model: parts[0] };
        }

        if (parts.length === 2) {
            return { provider: parts[0], model: parts[1] };
        }

        throw new Error(
            `Invalid model string format: ${modelString}. Expected "provider/model" or "model"`
        );
    }

    /**
     * Create provider from model string
     */
    static createFromString(
        modelString: string,
        options?: {
            temperature?: number;
            maxTokens?: number;
            apiKey?: string;
        }
    ): ModelProvider {
        const { provider, model } = ModelFactory.parseModelString(modelString);

        return ModelFactory.create(provider, {
            model,
            temperature: options?.temperature,
            maxTokens: options?.maxTokens,
            apiKey: options?.apiKey,
        });
    }
}
