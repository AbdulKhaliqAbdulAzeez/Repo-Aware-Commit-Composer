import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ConfigService } from '../src/core/config';
import { ConfigError } from '../src/utils/errors';
import * as fs from 'fs';

// Mock modules
jest.mock('fs');
jest.mock('../src/utils/logger');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('ConfigService', () => {
    let configService: ConfigService;
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();
        configService = new ConfigService();
        originalEnv = { ...process.env };

        // Default mocks - these will be used unless a test overrides them
        mockFs.existsSync.mockReturnValue(false);
        mockFs.readFileSync.mockReturnValue('');
    });

    afterEach(() => {
        // Restore original environment by clearing all AICMT_* variables and restoring original
        Object.keys(process.env).forEach((key) => {
            if (key.startsWith('AICMT_')) {
                delete process.env[key];
            }
        });
        Object.keys(originalEnv).forEach((key) => {
            if (key.startsWith('AICMT_') && originalEnv[key]) {
                process.env[key] = originalEnv[key];
            }
        });
    });

    describe('getDefaults', () => {
        it('should return default configuration', () => {
            const config = configService.load({ skipValidation: true, envOverrides: false });

            expect(config.style).toEqual({
                conventional: true,
                width: 72,
                emoji: false,
                tense: 'present',
                bullet: '- ',
            });

            expect(config.scope).toEqual({
                infer: true,
                map: {},
            });

            expect(config.issues).toEqual({
                mode: 'off',
                patterns: [],
            });

            expect(config.model?.provider).toBe('openai');
            expect(config.model?.temperature).toBe(0.2);
        });
    });

    describe('loadProjectConfig', () => {
        it('should load project config from .aicmt.yaml', () => {
            mockFs.existsSync.mockImplementation((path: any) => {
                return path.toString().endsWith('.aicmt.yaml');
            });

            mockFs.readFileSync.mockReturnValue(
                `style:
  width: 80
  emoji: true
model:
  name: gpt-4`
            );

            const config = configService.load({ skipValidation: true, envOverrides: false });

            expect(config.style?.width).toBe(80);
            expect(config.style?.emoji).toBe(true);
            expect(config.model?.name).toBe('gpt-4');
        });

        it('should return empty config if no project file exists', () => {
            mockFs.existsSync.mockReturnValue(false);

            const config = configService.load({ skipValidation: true, envOverrides: false });

            // Should still have defaults
            expect(config.style?.width).toBe(72);
        });

        it('should throw ConfigError on invalid YAML', () => {
            mockFs.existsSync.mockImplementation((path: any) => {
                return path.toString().endsWith('.aicmt.yaml');
            });

            mockFs.readFileSync.mockReturnValue('invalid: yaml: content:');

            expect(() => configService.load({ envOverrides: false })).toThrow(ConfigError);
        });
    });

    describe('loadUserConfig', () => {
        it('should load user config from ~/.config/aicmt/config.yaml', () => {
            mockFs.existsSync.mockImplementation((path: any) => {
                return path.toString().includes('.config/aicmt/config.yaml');
            });

            mockFs.readFileSync.mockReturnValue(
                `style:
  width: 100
model:
  temperature: 0.5`
            );

            const config = configService.load({ skipValidation: true, envOverrides: false });

            expect(config.style?.width).toBe(100);
            expect(config.model?.temperature).toBe(0.5);
        });

        it('should not throw if user config fails to load', () => {
            mockFs.existsSync.mockImplementation((path: any) => {
                return path.toString().includes('.config/aicmt/config.yaml');
            });

            mockFs.readFileSync.mockImplementation(() => {
                throw new Error('Permission denied');
            });

            // Should not throw, just warn
            expect(() => configService.load({ skipValidation: true, envOverrides: false })).not.toThrow();
        });
    });

    describe('loadEnvConfig', () => {
        it('should load model config from environment variables', () => {
            process.env.AICMT_MODEL = 'gpt-4-turbo';
            process.env.AICMT_TEMPERATURE = '0.7';
            process.env.AICMT_MAX_TOKENS = '1024';

            const config = configService.load({ skipValidation: true });

            expect(config.model?.name).toBe('gpt-4-turbo');
            expect(config.model?.temperature).toBe(0.7);
            expect(config.model?.max_tokens).toBe(1024);
        });

        it('should load style config from environment variables', () => {
            process.env.AICMT_EMOJI = 'true';
            process.env.AICMT_WIDTH = '80';

            const config = configService.load({ skipValidation: true });

            expect(config.style?.emoji).toBe(true);
            expect(config.style?.width).toBe(80);
        });

        it('should load issue mode from environment variable', () => {
            process.env.AICMT_ISSUE_MODE = 'auto';

            const config = configService.load({ skipValidation: true });

            expect(config.issues?.mode).toBe('auto');
        });

        it('should ignore invalid numeric environment variables', () => {
            process.env.AICMT_TEMPERATURE = 'invalid';
            process.env.AICMT_MAX_TOKENS = 'not-a-number';
            process.env.AICMT_WIDTH = 'abc';

            const config = configService.load({ skipValidation: true });

            // Should use defaults
            expect(config.model?.temperature).toBe(0.2);
            expect(config.model?.max_tokens).toBe(512);
            expect(config.style?.width).toBe(72);
        });

        it('should skip env overrides when envOverrides is false', () => {
            // AGGRESSIVELY reset mocks to avoid pollution
            mockFs.existsSync.mockReset();
            mockFs.readFileSync.mockReset();
            mockFs.existsSync.mockReturnValue(false);
            mockFs.readFileSync.mockReturnValue('');

            // Create fresh instance
            const freshConfig = new ConfigService();

            // Set environment variable
            process.env.AICMT_MODEL = 'from-env-gpt-4';

            // Load with envOverrides explicitly false
            const configWithoutEnv = freshConfig.load({
                skipValidation: true,
                envOverrides: false
            });

            // Should use default name, NOT the env var value
            expect(configWithoutEnv.model?.name).toBe('gpt-4o-mini');

            // Verify env var was actually set
            expect(process.env.AICMT_MODEL).toBe('from-env-gpt-4');

            // Now load WITH env overrides to verify env var works
            mockFs.existsSync.mockReset();
            mockFs.readFileSync.mockReset();
            mockFs.existsSync.mockReturnValue(false);
            mockFs.readFileSync.mockReturnValue('');

            const configWithEnv = new ConfigService().load({
                skipValidation: true,
                envOverrides: true
            });

            expect(configWithEnv.model?.name).toBe('from-env-gpt-4');
        });
    });

    describe('config precedence', () => {
        it('should merge configs with correct precedence: env > user > project > defaults', () => {
            // Project config
            mockFs.existsSync.mockImplementation((path: any) => {
                const pathStr = path.toString();
                return pathStr.endsWith('.aicmt.yaml') || pathStr.includes('.config/aicmt/config.yaml');
            });

            (mockFs.readFileSync as any).mockImplementation((path: any) => {
                const pathStr = path.toString();
                if (pathStr.endsWith('.aicmt.yaml')) {
                    return 'style:\n  width: 80\nmodel:\n  name: gpt-4';
                }
                if (pathStr.includes('.config/aicmt/config.yaml')) {
                    return 'style:\n  width: 90\n  emoji: true';
                }
                return '';
            });

            // Environment config
            process.env.AICMT_WIDTH = '100';

            const config = configService.load({ skipValidation: true });

            // Env should win
            expect(config.style?.width).toBe(100);
            // User config should override project
            expect(config.style?.emoji).toBe(true);
            // Project config should override defaults
            expect(config.model?.name).toBe('gpt-4');
            // Defaults should fill in gaps
            expect(config.style?.conventional).toBe(true);
        });
    });

    describe('validate', () => {
        it('should accept valid configuration', () => {
            mockFs.existsSync.mockImplementation((path: any) => {
                return path.toString().endsWith('.aicmt.yaml');
            });

            mockFs.readFileSync.mockReturnValue(
                `style:
  width: 80
  tense: present
model:
  temperature: 0.5
  max_tokens: 512
issues:
  mode: auto`
            );

            expect(() => configService.load({ envOverrides: false })).not.toThrow();
        });

        it('should reject invalid style.width', () => {
            mockFs.existsSync.mockImplementation((path: any) => {
                return path.toString().endsWith('.aicmt.yaml');
            });

            mockFs.readFileSync.mockReturnValue('style:\n  width: 30');

            expect(() => configService.load({ envOverrides: false })).toThrow(ConfigError);
            expect(() => configService.load({ envOverrides: false })).toThrow(/width must be between 50 and 120/);
        });

        it('should reject invalid style.tense', () => {
            mockFs.existsSync.mockImplementation((path: any) => {
                return path.toString().endsWith('.aicmt.yaml');
            });

            mockFs.readFileSync.mockReturnValue('style:\n  tense: future');

            expect(() => configService.load({ envOverrides: false })).toThrow(ConfigError);
            expect(() => configService.load({ envOverrides: false })).toThrow(/tense must be either/);
        });

        it('should reject invalid model.temperature', () => {
            mockFs.existsSync.mockImplementation((path: any) => {
                return path.toString().endsWith('.aicmt.yaml');
            });

            mockFs.readFileSync.mockReturnValue('model:\n  temperature: 3.0');

            expect(() => configService.load({ envOverrides: false })).toThrow(ConfigError);
            expect(() => configService.load({ envOverrides: false })).toThrow(/temperature must be between 0 and 2/);
        });

        it('should reject invalid model.max_tokens', () => {
            mockFs.existsSync.mockImplementation((path: any) => {
                return path.toString().endsWith('.aicmt.yaml');
            });

            mockFs.readFileSync.mockReturnValue('model:\n  max_tokens: 5000');

            expect(() => configService.load({ envOverrides: false })).toThrow(ConfigError);
            expect(() => configService.load({ envOverrides: false })).toThrow(/max_tokens must be between/);
        });

        it('should reject invalid issues.mode', () => {
            mockFs.existsSync.mockImplementation((path: any) => {
                return path.toString().endsWith('.aicmt.yaml');
            });

            mockFs.readFileSync.mockReturnValue('issues:\n  mode: always');

            expect(() => configService.load({ envOverrides: false })).toThrow(ConfigError);
            expect(() => configService.load({ envOverrides: false })).toThrow(/mode must be either/);
        });

        it('should reject invalid regex patterns', () => {
            mockFs.existsSync.mockImplementation((path: any) => {
                return path.toString().endsWith('.aicmt.yaml');
            });

            mockFs.readFileSync.mockReturnValue('issues:\n  patterns:\n    - "[invalid"');

            expect(() => configService.load({ envOverrides: false })).toThrow(ConfigError);
            expect(() => configService.load({ envOverrides: false })).toThrow(/Invalid regex pattern/);
        });

        it('should skip validation when skipValidation is true', () => {
            mockFs.existsSync.mockImplementation((path: any) => {
                return path.toString().endsWith('.aicmt.yaml');
            });

            mockFs.readFileSync.mockReturnValue('style:\n  width: 30'); // Invalid

            expect(() => configService.load({ skipValidation: true, envOverrides: false })).not.toThrow();
        });
    });

    describe('get', () => {
        it('should return loaded config', () => {
            configService.load({ skipValidation: true, envOverrides: false });
            const config = configService.get();

            expect(config).toBeDefined();
            expect(config.style).toBeDefined();
        });

        it('should auto-load config if not loaded', () => {
            const config = configService.get();

            expect(config).toBeDefined();
            expect(configService.isLoaded()).toBe(true);
        });
    });

    describe('getValue', () => {
        it('should get specific config value', () => {
            configService.load({ skipValidation: true, envOverrides: false });

            const styleConfig = configService.getValue('style');
            expect(styleConfig).toBeDefined();
            expect(styleConfig?.width).toBe(72);
        });
    });

    describe('set', () => {
        it('should override config values', () => {
            configService.load({ skipValidation: true, envOverrides: false });

            configService.set({
                style: { width: 100 },
                model: { name: 'custom-model' },
            });

            const config = configService.get();
            expect(config.style?.width).toBe(100);
            expect(config.model?.name).toBe('custom-model');
            // Should preserve other values
            expect(config.style?.conventional).toBe(true);
        });
    });

    describe('reset', () => {
        it('should reset config to defaults', () => {
            configService.load({ skipValidation: true, envOverrides: false });
            configService.set({ style: { width: 100 } });

            configService.reset();

            expect(configService.isLoaded()).toBe(false);

            const config = configService.get();
            expect(config.style?.width).toBe(72); // Back to default
        });
    });

    describe('isLoaded', () => {
        it('should return false before loading', () => {
            expect(configService.isLoaded()).toBe(false);
        });

        it('should return true after loading', () => {
            configService.load({ skipValidation: true, envOverrides: false });
            expect(configService.isLoaded()).toBe(true);
        });
    });
});
