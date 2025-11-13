import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { ConfigError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface StyleConfig {
    conventional?: boolean;
    width?: number;
    emoji?: boolean;
    tense?: 'present' | 'past';
    bullet?: string;
}

export interface ScopeConfig {
    infer?: boolean;
    map?: Record<string, string>;
}

export interface IssuesConfig {
    mode?: 'auto' | 'off';
    patterns?: string[];
    link_template?: string;
}

export interface ModelConfig {
    provider?: string;
    name?: string;
    max_tokens?: number;
    temperature?: number;
}

export interface Config {
    style?: StyleConfig;
    scope?: ScopeConfig;
    issues?: IssuesConfig;
    model?: ModelConfig;
}

export interface ConfigOptions {
    cwd?: string;
    skipValidation?: boolean;
    envOverrides?: boolean;
}

export class ConfigService {
    private config: Config = {};
    private loaded: boolean = false;

    /**
     * Load configuration from all sources with proper precedence
     * Precedence: CLI flags > env vars > user config > project config > defaults
     */
    load(options: ConfigOptions = {}): Config {
        const cwd = options.cwd || process.cwd();
        const envOverrides = options.envOverrides !== false;

        logger.debug('Loading configuration', { cwd, envOverrides });

        // 1. Start with defaults
        const defaults = this.getDefaults();

        // 2. Load project config
        const projectConfig = this.loadProjectConfig(cwd);

        // 3. Load user config
        const userConfig = this.loadUserConfig();

        // 4. Load environment variables
        const envConfig = envOverrides ? this.loadEnvConfig() : {};

        // 5. Merge all configs
        this.config = this.merge(defaults, projectConfig, userConfig, envConfig);

        // 6. Validate config
        if (!options.skipValidation) {
            this.validate(this.config);
        }

        this.loaded = true;
        logger.debug('Configuration loaded successfully', this.config);

        return this.config;
    }

    /**
     * Get current config
     */
    get(): Config {
        if (!this.loaded) {
            logger.warn('Config not loaded yet, loading with defaults');
            this.load();
        }
        return this.config;
    }

    /**
     * Get a specific config value with type safety
     */
    getValue<K extends keyof Config>(key: K): Config[K] {
        return this.get()[key];
    }

    /**
     * Set config values (useful for CLI overrides)
     */
    set(overrides: Partial<Config>): void {
        this.config = this.merge(this.config, overrides);
        logger.debug('Config updated with overrides', overrides);
    }

    /**
     * Check if config has been loaded
     */
    isLoaded(): boolean {
        return this.loaded;
    }

    /**
     * Reset config to defaults
     */
    reset(): void {
        this.config = this.getDefaults();
        this.loaded = false;
        logger.debug('Config reset to defaults');
    }

    /**
     * Load environment variable overrides
     */
    private loadEnvConfig(): Config {
        const envConfig: Config = {};

        // Model configuration from env
        if (process.env.AICMT_MODEL) {
            envConfig.model = { name: process.env.AICMT_MODEL };
        }

        if (process.env.AICMT_TEMPERATURE) {
            const temp = parseFloat(process.env.AICMT_TEMPERATURE);
            if (!isNaN(temp)) {
                envConfig.model = { ...envConfig.model, temperature: temp };
            }
        }

        if (process.env.AICMT_MAX_TOKENS) {
            const tokens = parseInt(process.env.AICMT_MAX_TOKENS, 10);
            if (!isNaN(tokens)) {
                envConfig.model = { ...envConfig.model, max_tokens: tokens };
            }
        }

        // Style configuration from env
        if (process.env.AICMT_EMOJI) {
            envConfig.style = { emoji: process.env.AICMT_EMOJI === 'true' };
        }

        if (process.env.AICMT_WIDTH) {
            const width = parseInt(process.env.AICMT_WIDTH, 10);
            if (!isNaN(width)) {
                envConfig.style = { ...envConfig.style, width };
            }
        }

        // Issue mode from env
        if (process.env.AICMT_ISSUE_MODE) {
            envConfig.issues = { mode: process.env.AICMT_ISSUE_MODE as 'auto' | 'off' };
        }

        return envConfig;
    }

    /**
     * Validate configuration
     */
    private validate(config: Config): void {
        const errors: string[] = [];

        // Validate style config
        if (config.style) {
            if (config.style.width !== undefined) {
                if (config.style.width < 50 || config.style.width > 120) {
                    errors.push('style.width must be between 50 and 120');
                }
            }

            if (config.style.tense && !['present', 'past'].includes(config.style.tense)) {
                errors.push('style.tense must be either "present" or "past"');
            }
        }

        // Validate model config
        if (config.model) {
            if (config.model.temperature !== undefined) {
                if (config.model.temperature < 0 || config.model.temperature > 2) {
                    errors.push('model.temperature must be between 0 and 2');
                }
            }

            if (config.model.max_tokens !== undefined) {
                if (config.model.max_tokens < 1 || config.model.max_tokens > 4096) {
                    errors.push('model.max_tokens must be between 1 and 4096');
                }
            }
        }

        // Validate issues config
        if (config.issues) {
            if (config.issues.mode && !['auto', 'off'].includes(config.issues.mode)) {
                errors.push('issues.mode must be either "auto" or "off"');
            }

            if (config.issues.patterns) {
                for (const pattern of config.issues.patterns) {
                    try {
                        new RegExp(pattern);
                    } catch (error) {
                        errors.push(`Invalid regex pattern in issues.patterns: ${pattern}`);
                    }
                }
            }
        }

        if (errors.length > 0) {
            throw new ConfigError(
                'Configuration validation failed:\n' + errors.map((e) => `  - ${e}`).join('\n'),
                {
                    suggestion: 'Check your .aicmt.yaml file and fix the validation errors',
                    docsUrl: 'https://github.com/AbdulKhaliqAbdulAzeez/Repo-Aware-Commit-Composer#configuration',
                }
            );
        }
    }

    private loadProjectConfig(cwd: string): Config {
        const configPath = path.join(cwd, '.aicmt.yaml');

        try {
            if (fs.existsSync(configPath)) {
                logger.debug(`Loading project config from ${configPath}`);
                const content = fs.readFileSync(configPath, 'utf-8');
                const config = yaml.load(content) as Config;
                return config || {};
            }
        } catch (error: any) {
            throw new ConfigError(`Failed to load project config: ${error.message}`, {
                file: configPath,
                suggestion: 'Check your .aicmt.yaml file for YAML syntax errors',
            });
        }

        return {};
    }

    private loadUserConfig(): Config {
        const homeDir = process.env.HOME || process.env.USERPROFILE || '';
        const configPath = path.join(homeDir, '.config', 'aicmt', 'config.yaml');

        try {
            if (fs.existsSync(configPath)) {
                logger.debug(`Loading user config from ${configPath}`);
                const content = fs.readFileSync(configPath, 'utf-8');
                const config = yaml.load(content) as Config;
                return config || {};
            }
        } catch (error: any) {
            logger.warn(`Failed to load user config: ${error.message}`);
            // User config is optional, so don't throw
        }

        return {};
    }

    private getDefaults(): Config {
        return {
            style: {
                conventional: true,
                width: 72,
                emoji: false,
                tense: 'present',
                bullet: '- ',
            },
            scope: {
                infer: true,
                map: {},
            },
            issues: {
                mode: 'off',
                patterns: [],
            },
            model: {
                provider: 'openai',
                name: 'gpt-4o-mini',
                max_tokens: 512,
                temperature: 0.2,
            },
        };
    }

    private merge(...configs: Config[]): Config {
        return configs.reduce((acc, config) => {
            return {
                ...acc,
                ...config,
                style: { ...acc.style, ...config.style },
                scope: { ...acc.scope, ...config.scope },
                issues: { ...acc.issues, ...config.issues },
                model: { ...acc.model, ...config.model },
            };
        }, {});
    }
}
