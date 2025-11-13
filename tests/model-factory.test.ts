import { ModelFactory } from '../src/core/model-factory.js';
import { OpenAIProvider } from '../src/providers/openai.js';
import { ConfigService } from '../src/core/config.js';

// Mock dependencies
jest.mock('../src/providers/openai.js');
jest.mock('../src/core/config.js');

describe('ModelFactory', () => {
    beforeEach(() => {
        process.env.OPENAI_API_KEY = 'test-key';
        jest.clearAllMocks();
    });

    afterEach(() => {
        delete process.env.OPENAI_API_KEY;
    });

    describe('parseModelString', () => {
        it('should parse provider/model format', () => {
            const result = ModelFactory.parseModelString('openai/gpt-4');
            expect(result).toEqual({ provider: 'openai', model: 'gpt-4' });
        });

        it('should assume openai for model-only string', () => {
            const result = ModelFactory.parseModelString('gpt-4o-mini');
            expect(result).toEqual({ provider: 'openai', model: 'gpt-4o-mini' });
        });

        it('should handle different providers', () => {
            const result = ModelFactory.parseModelString('anthropic/claude-3');
            expect(result).toEqual({ provider: 'anthropic', model: 'claude-3' });
        });

        it('should throw error for invalid format', () => {
            expect(() => {
                ModelFactory.parseModelString('openai/gpt/4/extra');
            }).toThrow('Invalid model string format');
        });
    });

    describe('create', () => {
        it('should create OpenAI provider', () => {
            const provider = ModelFactory.create('openai', {
                model: 'gpt-4o-mini',
                temperature: 0.3,
                maxTokens: 1000,
            });

            expect(OpenAIProvider).toHaveBeenCalledWith({
                model: 'gpt-4o-mini',
                temperature: 0.3,
                maxTokens: 1000,
                apiKey: undefined,
            });
            expect(provider).toBeDefined();
        });

        it('should create OpenAI provider with API key', () => {
            ModelFactory.create('openai', {
                model: 'gpt-4',
                apiKey: 'custom-key',
            });

            expect(OpenAIProvider).toHaveBeenCalledWith(
                expect.objectContaining({
                    apiKey: 'custom-key',
                })
            );
        });

        it('should be case-insensitive for provider name', () => {
            ModelFactory.create('OpenAI', {
                model: 'gpt-4o-mini',
            });

            expect(OpenAIProvider).toHaveBeenCalled();
        });

        it('should throw error for unsupported provider', () => {
            expect(() => {
                ModelFactory.create('unsupported', {
                    model: 'some-model',
                });
            }).toThrow('Unsupported model provider: unsupported');
        });
    });

    describe('createFromString', () => {
        it('should create provider from model string', () => {
            const provider = ModelFactory.createFromString('openai/gpt-4o-mini');

            expect(OpenAIProvider).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: 'gpt-4o-mini',
                })
            );
            expect(provider).toBeDefined();
        });

        it('should apply options when creating from string', () => {
            ModelFactory.createFromString('openai/gpt-4', {
                temperature: 0.7,
                maxTokens: 2000,
                apiKey: 'test-key',
            });

            expect(OpenAIProvider).toHaveBeenCalledWith({
                model: 'gpt-4',
                temperature: 0.7,
                maxTokens: 2000,
                apiKey: 'test-key',
            });
        });

        it('should handle model-only string', () => {
            ModelFactory.createFromString('gpt-4o-mini');

            expect(OpenAIProvider).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: 'gpt-4o-mini',
                })
            );
        });
    });

    describe('createFromConfig', () => {
        it('should create provider from config service', () => {
            const mockConfig = {
                getValue: jest.fn().mockReturnValue({
                    provider: 'openai',
                    name: 'gpt-4o-mini',
                    temperature: 0.3,
                    max_tokens: 800,
                }),
            } as any;

            const provider = ModelFactory.createFromConfig(mockConfig);

            expect(mockConfig.getValue).toHaveBeenCalledWith('model');
            expect(OpenAIProvider).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: 'gpt-4o-mini',
                    temperature: 0.3,
                    maxTokens: 800,
                })
            );
            expect(provider).toBeDefined();
        });

        it('should use default values when not in config', () => {
            const mockConfig = {
                getValue: jest.fn().mockReturnValue({
                    name: 'gpt-4',
                }),
            } as any;

            ModelFactory.createFromConfig(mockConfig);

            expect(OpenAIProvider).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: 'gpt-4',
                    temperature: 0.2,
                    maxTokens: 512,
                })
            );
        });

        it('should create new ConfigService if not provided', () => {
            (ConfigService as jest.MockedClass<typeof ConfigService>).mockImplementation(() => ({
                getValue: jest.fn().mockReturnValue({
                    provider: 'openai',
                    name: 'gpt-4o-mini',
                }),
            } as any));

            const provider = ModelFactory.createFromConfig();

            expect(ConfigService).toHaveBeenCalled();
            expect(provider).toBeDefined();
        });

        it('should throw error if model config is missing', () => {
            const mockConfig = {
                getValue: jest.fn().mockReturnValue(undefined),
            } as any;

            expect(() => {
                ModelFactory.createFromConfig(mockConfig);
            }).toThrow('Model configuration is required');
        });

        it('should use default provider name if not specified', () => {
            const mockConfig = {
                getValue: jest.fn().mockReturnValue({
                    name: 'gpt-4',
                }),
            } as any;

            ModelFactory.createFromConfig(mockConfig);

            expect(OpenAIProvider).toHaveBeenCalled();
        });

        it('should use default model name if not specified', () => {
            const mockConfig = {
                getValue: jest.fn().mockReturnValue({
                    provider: 'openai',
                }),
            } as any;

            ModelFactory.createFromConfig(mockConfig);

            expect(OpenAIProvider).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: 'gpt-4o-mini',
                })
            );
        });
    });
});
