import { OpenAIProvider } from '../src/providers/openai.js';
import { Message } from '../src/core/model.js';
import OpenAI from 'openai';

// Mock the OpenAI module
jest.mock('openai');

describe('OpenAIProvider', () => {
    let mockCreate: jest.Mock;
    let originalEnv: string | undefined;

    beforeEach(() => {
        // Save original env
        originalEnv = process.env.OPENAI_API_KEY;
        process.env.OPENAI_API_KEY = 'test-api-key';

        // Setup mock
        mockCreate = jest.fn();
        (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
            chat: {
                completions: {
                    create: mockCreate,
                },
            },
        } as any));
    });

    afterEach(() => {
        // Restore env
        if (originalEnv) {
            process.env.OPENAI_API_KEY = originalEnv;
        } else {
            delete process.env.OPENAI_API_KEY;
        }
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with environment API key', () => {
            const provider = new OpenAIProvider({ model: 'gpt-4o-mini' });
            expect(provider).toBeDefined();
        });

        it('should accept API key as option', () => {
            const provider = new OpenAIProvider({
                apiKey: 'custom-key',
                model: 'gpt-4',
            });
            expect(provider).toBeDefined();
        });

        it('should throw error if no API key provided', () => {
            delete process.env.OPENAI_API_KEY;

            expect(() => {
                new OpenAIProvider({ model: 'gpt-4o-mini' });
            }).toThrow('OpenAI API key is required');
        });

        it('should use default model if not specified', () => {
            const provider = new OpenAIProvider({ model: 'gpt-4o-mini' });
            expect(provider).toBeDefined();
        });

        it('should accept custom temperature and maxTokens', () => {
            const provider = new OpenAIProvider({
                model: 'gpt-4',
                temperature: 0.5,
                maxTokens: 1000,
            });
            expect(provider).toBeDefined();
        });

        it('should accept custom retry and timeout settings', () => {
            const provider = new OpenAIProvider({
                model: 'gpt-4',
                maxRetries: 5,
                timeout: 30000,
            });
            expect(provider).toBeDefined();
        });
    });

    describe('complete', () => {
        let provider: OpenAIProvider;

        beforeEach(() => {
            provider = new OpenAIProvider({ model: 'gpt-4o-mini' });
        });

        it('should successfully complete a request', async () => {
            const mockResponse = {
                choices: [
                    {
                        message: {
                            content: 'Generated commit message',
                        },
                    },
                ],
                usage: {
                    total_tokens: 150,
                },
                model: 'gpt-4o-mini',
            };

            mockCreate.mockResolvedValue(mockResponse);

            const messages: Message[] = [
                { role: 'system', content: 'You are a commit message generator' },
                { role: 'user', content: 'Generate commit for changes' },
            ];

            const result = await provider.complete(messages);

            expect(result).toBe('Generated commit message');
            expect(mockCreate).toHaveBeenCalledTimes(1);
            expect(mockCreate).toHaveBeenCalledWith({
                model: 'gpt-4o-mini',
                temperature: 0.2,
                max_tokens: 512,
                messages: [
                    { role: 'system', content: 'You are a commit message generator' },
                    { role: 'user', content: 'Generate commit for changes' },
                ],
            });
        });

        it('should trim whitespace from response', async () => {
            mockCreate.mockResolvedValue({
                choices: [{ message: { content: '  \n  commit message  \n  ' } }],
                usage: { total_tokens: 10 },
                model: 'gpt-4o-mini',
            });

            const messages: Message[] = [{ role: 'user', content: 'test' }];
            const result = await provider.complete(messages);

            expect(result).toBe('commit message');
        });

        it('should throw error for empty messages array', async () => {
            await expect(provider.complete([])).rejects.toThrow('Messages array cannot be empty');
        });

        it('should validate message structure', async () => {
            const invalidMessages = [{ role: 'user' }] as Message[];

            await expect(provider.complete(invalidMessages)).rejects.toThrow(
                'Each message must have role and content'
            );
        });

        it('should validate message role', async () => {
            const invalidMessages = [
                { role: 'invalid' as any, content: 'test' },
            ];

            await expect(provider.complete(invalidMessages)).rejects.toThrow('Invalid message role');
        });

        it('should handle missing content in response', async () => {
            mockCreate.mockResolvedValue({
                choices: [{ message: {} }],
            });

            const messages: Message[] = [{ role: 'user', content: 'test' }];

            await expect(provider.complete(messages)).rejects.toThrow(
                'No content received from OpenAI API'
            );
        });

        it('should handle empty choices array', async () => {
            mockCreate.mockResolvedValue({
                choices: [],
            });

            const messages: Message[] = [{ role: 'user', content: 'test' }];

            await expect(provider.complete(messages)).rejects.toThrow(
                'No content received from OpenAI API'
            );
        });
    });

    describe('error handling', () => {
        let provider: OpenAIProvider;

        beforeEach(() => {
            provider = new OpenAIProvider({ model: 'gpt-4o-mini' });
        });

        it('should handle 401 authentication error', async () => {
            const error = Object.assign(
                new OpenAI.APIError(
                    401,
                    { error: { message: 'Invalid API key' } },
                    'Unauthorized',
                    {}
                ),
                { status: 401 }
            );
            mockCreate.mockRejectedValue(error);

            const messages: Message[] = [{ role: 'user', content: 'test' }];

            await expect(provider.complete(messages)).rejects.toThrow(
                'Invalid OpenAI API key'
            );
        });

        it('should handle 429 rate limit error', async () => {
            const error = Object.assign(
                new OpenAI.APIError(
                    429,
                    { error: { message: 'Rate limit exceeded' } },
                    'Too Many Requests',
                    {}
                ),
                { status: 429 }
            );
            mockCreate.mockRejectedValue(error);

            const messages: Message[] = [{ role: 'user', content: 'test' }];

            await expect(provider.complete(messages)).rejects.toThrow(
                'OpenAI API rate limit exceeded'
            );
        });

        it('should handle 503 service unavailable error', async () => {
            const error = Object.assign(
                new OpenAI.APIError(
                    503,
                    { error: { message: 'Service unavailable' } },
                    'Service Unavailable',
                    {}
                ),
                { status: 503 }
            );
            mockCreate.mockRejectedValue(error);

            const messages: Message[] = [{ role: 'user', content: 'test' }];

            await expect(provider.complete(messages)).rejects.toThrow(
                'OpenAI API is temporarily unavailable'
            );
        });

        it('should handle model not found error', async () => {
            const error = new OpenAI.APIError(
                404,
                { error: { message: 'Model not found', code: 'model_not_found' } },
                'Not Found',
                {}
            );
            (error as any).code = 'model_not_found';
            mockCreate.mockRejectedValue(error);

            const messages: Message[] = [{ role: 'user', content: 'test' }];

            await expect(provider.complete(messages)).rejects.toThrow('Model');
            await expect(provider.complete(messages)).rejects.toThrow('not found');
        });

        it('should handle context length exceeded error', async () => {
            const error = new OpenAI.APIError(
                400,
                { error: { message: 'Context too long', code: 'context_length_exceeded' } },
                'Bad Request',
                {}
            );
            (error as any).code = 'context_length_exceeded';
            mockCreate.mockRejectedValue(error);

            const messages: Message[] = [{ role: 'user', content: 'test' }];

            await expect(provider.complete(messages)).rejects.toThrow('Input is too long');
        });

        it('should handle generic API errors', async () => {
            const error = new OpenAI.APIError(
                500,
                { error: { message: 'Internal server error' } },
                'Internal Server Error',
                {}
            );
            mockCreate.mockRejectedValue(error);

            const messages: Message[] = [{ role: 'user', content: 'test' }];

            await expect(provider.complete(messages)).rejects.toThrow('OpenAI API error');
        });

        it('should handle network errors', async () => {
            mockCreate.mockRejectedValue(new Error('Network timeout'));

            const messages: Message[] = [{ role: 'user', content: 'test' }];

            await expect(provider.complete(messages)).rejects.toThrow(
                'Failed to call OpenAI API'
            );
        });

        it('should handle unknown errors', async () => {
            mockCreate.mockRejectedValue('unknown error');

            const messages: Message[] = [{ role: 'user', content: 'test' }];

            await expect(provider.complete(messages)).rejects.toThrow(
                'Unknown error occurred'
            );
        });
    });

    describe('message formatting', () => {
        let provider: OpenAIProvider;

        beforeEach(() => {
            provider = new OpenAIProvider({ model: 'gpt-4o-mini' });
            mockCreate.mockResolvedValue({
                choices: [{ message: { content: 'response' } }],
                usage: { total_tokens: 10 },
                model: 'gpt-4o-mini',
            });
        });

        it('should handle multiple messages', async () => {
            const messages: Message[] = [
                { role: 'system', content: 'System prompt' },
                { role: 'user', content: 'User message 1' },
                { role: 'assistant', content: 'Assistant response' },
                { role: 'user', content: 'User message 2' },
            ];

            await provider.complete(messages);

            expect(mockCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    messages: [
                        { role: 'system', content: 'System prompt' },
                        { role: 'user', content: 'User message 1' },
                        { role: 'assistant', content: 'Assistant response' },
                        { role: 'user', content: 'User message 2' },
                    ],
                })
            );
        });

        it('should preserve message content exactly', async () => {
            const messages: Message[] = [
                {
                    role: 'user',
                    content: 'Multi\nline\ncontent with special chars: @#$%^&*()',
                },
            ];

            await provider.complete(messages);

            expect(mockCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    messages: [
                        {
                            role: 'user',
                            content: 'Multi\nline\ncontent with special chars: @#$%^&*()',
                        },
                    ],
                })
            );
        });
    });
});
