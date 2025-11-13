export interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface ModelProvider {
    complete(messages: Message[]): Promise<string>;
}

export interface ModelConfig {
    provider: string;
    name: string;
    maxTokens?: number;
    temperature?: number;
}
