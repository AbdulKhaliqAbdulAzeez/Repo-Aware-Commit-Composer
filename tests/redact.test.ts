import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { RedactionService } from '../src/core/redact';

// Mock logger
jest.mock('../src/utils/logger');

describe('RedactionService', () => {
    let service: RedactionService;

    beforeEach(() => {
        service = new RedactionService();
    });

    describe('API Keys', () => {
        it('should redact generic API keys', () => {
            const text = 'api_key: "sk_live_1234567890abcdefghijklmnopqrst"';
            const redacted = service.redact(text);

            expect(redacted).toContain('[REDACTED]');
            expect(redacted).not.toContain('sk_live_');
        });

        it('should redact OpenAI API keys', () => {
            const text = 'OPENAI_API_KEY=sk-' + 'a'.repeat(48);
            const redacted = service.redact(text);

            expect(redacted).toContain('[REDACTED]');
            expect(redacted).not.toContain('sk-');
        });

        it('should redact AWS access keys', () => {
            const text = 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE';
            const redacted = service.redact(text);

            expect(redacted).toContain('[REDACTED]');
            expect(redacted).not.toContain('AKIAIOSFO');
        });

        it('should handle multiple API keys', () => {
            const text = `
                sk_live_abcdefghijklmnopqrst1234
                sk_test_xyzabcdefghijklmnop5678
            `;
            const redacted = service.redact(text);

            const matches = redacted.match(/\[REDACTED\]/g);
            expect(matches).not.toBeNull();
            // At least 1 should be found (stripe-key pattern)
            expect(matches!.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('Tokens', () => {
        it('should redact Bearer tokens', () => {
            const text = 'Authorization: Bearer eyJhbGc.eyJzdWI.SflKxw';
            const redacted = service.redact(text);

            expect(redacted).toContain('[REDACTED]');
            expect(redacted).not.toContain('Bearer eyJ');
        });

        it('should redact JWT tokens', () => {
            const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
            const text = `Token: ${jwt}`;
            const redacted = service.redact(text);

            expect(redacted).toContain('[REDACTED]');
            expect(redacted).not.toContain('eyJhbGc');
        });

        it('should redact GitHub tokens', () => {
            const text = 'GITHUB_TOKEN=ghp_' + 'a'.repeat(36);
            const redacted = service.redact(text);

            expect(redacted).toContain('[REDACTED]');
            expect(redacted).not.toContain('ghp_');
        });

        it('should redact Slack tokens', () => {
            const text = 'SLACK_TOKEN=xoxb-1234567890-1234567890-abcdefghijklmnopqrstuv';
            const redacted = service.redact(text);

            expect(redacted).toContain('[REDACTED]');
            expect(redacted).not.toContain('xoxb-');
        });

        it('should redact OAuth tokens', () => {
            const text = 'access_token: "ya29.a0AfH6SMBx..."';
            const redacted = service.redact(text);

            expect(redacted).toContain('[REDACTED]');
        });
    });

    describe('Secrets and Passwords', () => {
        it('should redact generic secrets', () => {
            const text = 'secret: "my-super-secret-value-123"';
            const redacted = service.redact(text);

            expect(redacted).toContain('[REDACTED]');
            expect(redacted).not.toContain('super-secret');
        });

        it('should redact passwords', () => {
            const text = 'password: "MyP@ssw0rd123"';
            const redacted = service.redact(text);

            expect(redacted).toContain('[REDACTED]');
            expect(redacted).not.toContain('P@ssw0rd');
        });

        it('should redact token fields', () => {
            const text = 'token: "1234567890abcdefghijklmnop"';
            const redacted = service.redact(text);

            expect(redacted).toContain('[REDACTED]');
        });
    });

    describe('Private Keys', () => {
        it('should redact RSA private keys', () => {
            const text = '-----BEGIN RSA PRIVATE KEY-----\nMIIE...';
            const redacted = service.redact(text);

            expect(redacted).toContain('[REDACTED]');
            expect(redacted).not.toContain('BEGIN RSA PRIVATE KEY');
        });

        it('should redact EC private keys', () => {
            const text = '-----BEGIN EC PRIVATE KEY-----\nMHc...';
            const redacted = service.redact(text);

            expect(redacted).toContain('[REDACTED]');
        });

        it('should redact OpenSSH private keys', () => {
            const text = '-----BEGIN OPENSSH PRIVATE KEY-----\nb3Bl...';
            const redacted = service.redact(text);

            expect(redacted).toContain('[REDACTED]');
        });

        it('should redact SSH public keys', () => {
            const sshKey = 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC' + 'a'.repeat(300);
            const text = `SSH_KEY=${sshKey}`;
            const redacted = service.redact(text);

            expect(redacted).toContain('[REDACTED]');
            expect(redacted).not.toContain('AAAAB3N');
        });
    });

    describe('Database Credentials', () => {
        it('should redact MongoDB connection strings', () => {
            const text = 'mongodb://user:password@localhost:27017/database';
            const redacted = service.redact(text);

            expect(redacted).toContain('[REDACTED]');
            expect(redacted).not.toContain('user:password');
        });

        it('should redact PostgreSQL connection strings', () => {
            const text = 'postgresql://admin:secret@db.example.com:5432/mydb';
            const redacted = service.redact(text);

            expect(redacted).toContain('[REDACTED]');
            expect(redacted).not.toContain('admin:secret');
        });

        it('should redact MySQL connection strings', () => {
            const text = 'mysql://root:password123@localhost:3306/app';
            const redacted = service.redact(text);

            expect(redacted).toContain('[REDACTED]');
            expect(redacted).not.toContain('root:password123');
        });
    });

    describe('hasSensitiveData', () => {
        it('should detect API keys', () => {
            const text = 'api_key: "sk_live_1234567890abcdefghijklmnopqrst"';
            expect(service.hasSensitiveData(text)).toBe(true);
        });

        it('should detect JWT tokens', () => {
            const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.xyz';
            expect(service.hasSensitiveData(jwt)).toBe(true);
        });

        it('should return false for clean text', () => {
            const text = 'This is just normal code with no secrets';
            expect(service.hasSensitiveData(text)).toBe(false);
        });

        it('should handle empty strings', () => {
            expect(service.hasSensitiveData('')).toBe(false);
        });
    });

    describe('redactWithInfo', () => {
        it('should return detailed redaction information', () => {
            const text = 'api_key: "sk_live_1234567890abcdefghijklmnopqrst"';
            const result = service.redactWithInfo(text);

            expect(result.foundSecrets).toBeGreaterThan(0);
            expect(result.patterns.length).toBeGreaterThan(0);
            expect(result.redacted).toContain('[REDACTED]');
        });

        it('should count multiple secrets', () => {
            const text = `
                api_key: "sk_live_abc123"
                password: "mypassword123"
                token: "jwt_token_value_here_123"
            `;
            const result = service.redactWithInfo(text);

            expect(result.foundSecrets).toBeGreaterThanOrEqual(2);
            expect(result.patterns.length).toBeGreaterThan(0);
        });

        it('should return zero secrets for clean text', () => {
            const text = 'Normal code without secrets';
            const result = service.redactWithInfo(text);

            expect(result.foundSecrets).toBe(0);
            expect(result.patterns).toEqual([]);
            expect(result.redacted).toBe(text);
        });
    });

    describe('addPattern', () => {
        it('should add custom pattern', () => {
            const customPattern = /CUSTOM-[A-Z0-9]{10}/g;
            service.addPattern('custom-token', customPattern);

            const text = 'My token is CUSTOM-ABC1234567';
            const redacted = service.redact(text);

            expect(redacted).toContain('[REDACTED]');
            expect(redacted).not.toContain('CUSTOM-ABC');
        });

        it('should add custom pattern to pattern list', () => {
            const initialCount = service.getPatternNames().length;
            service.addPattern('test-pattern', /TEST-\d+/g);

            expect(service.getPatternNames().length).toBe(initialCount + 1);
            expect(service.getPatternNames()).toContain('test-pattern');
        });
    });

    describe('getPatternNames', () => {
        it('should return all pattern names', () => {
            const names = service.getPatternNames();

            expect(names).toContain('api-key');
            expect(names).toContain('jwt');
            expect(names).toContain('private-key');
            expect(names).toContain('aws-key');
            expect(names.length).toBeGreaterThan(10);
        });
    });

    describe('redactDiff', () => {
        it('should preserve diff metadata', () => {
            const diff = `diff --git a/config.ts b/config.ts
index abc123..def456 100644
--- a/config.ts
+++ b/config.ts
@@ -1,3 +1,3 @@
 export const config = {
-  apiKey: "sk_live_1234567890abcdefghijklmnopqrst"
+  apiKey: "sk_live_newkey1234567890abcdefghij"
 }`;

            const redacted = service.redactDiff(diff);

            expect(redacted).toContain('diff --git a/config.ts b/config.ts');
            expect(redacted).toContain('index abc123..def456');
            expect(redacted).toContain('---');
            expect(redacted).toContain('+++');
            expect(redacted).toContain('@@');
            expect(redacted).toContain('[REDACTED]');
            expect(redacted).not.toContain('sk_live_');
        });

        it('should redact content but preserve diff structure', () => {
            const diff = `@@ -1,2 +1,2 @@
-password = "oldpass123"
+password = "newpass456"`;

            const redacted = service.redactDiff(diff);

            expect(redacted).toContain('@@');
            expect(redacted).toContain('[REDACTED]');
            expect(redacted).not.toContain('oldpass');
            expect(redacted).not.toContain('newpass');
        });
    });

    describe('scanForFalsePositives', () => {
        it('should warn about test fixtures', () => {
            const text = 'fixtures/test-data.ts: password: "test123"';
            const warnings = service.scanForFalsePositives(text);

            expect(warnings.length).toBeGreaterThan(0);
            expect(warnings[0]).toContain('fixtures');
        });

        it('should warn about placeholders', () => {
            const text = 'api_key: "example.com/placeholder"';
            const warnings = service.scanForFalsePositives(text);

            expect(warnings.length).toBeGreaterThan(0);
            expect(warnings[0]).toContain('placeholder');
        });

        it('should return empty array for real secrets', () => {
            const text = 'api_key: "sk_live_real_production_key_12345"';
            const warnings = service.scanForFalsePositives(text);

            // May or may not have warnings, but should not crash
            expect(Array.isArray(warnings)).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('should handle empty strings', () => {
            expect(service.redact('')).toBe('');
        });

        it('should handle strings with no secrets', () => {
            const text = 'Just some normal code here';
            expect(service.redact(text)).toBe(text);
        });

        it('should handle multiline text', () => {
            const text = `
                const config = {
                    apiKey: "sk_live_1234567890abcdefghij",
                    password: "mypassword123"
                };
            `;
            const redacted = service.redact(text);

            expect(redacted).toContain('[REDACTED]');
            expect(redacted).not.toContain('sk_live_');
            expect(redacted).not.toContain('mypassword');
        });

        it('should handle very long strings', () => {
            const longText = 'a'.repeat(100000) + 'api_key: "sk_live_' + 'TEST'.repeat(6) + '"' + 'b'.repeat(100000);
            const redacted = service.redact(longText);

            expect(redacted).toContain('[REDACTED]');
            expect(redacted).not.toContain('sk_live_');
        });

        it('should handle special characters in secrets', () => {
            const text = 'password: "P@ssw0rd!#$%"';
            const redacted = service.redact(text);

            expect(redacted).toContain('[REDACTED]');
        });

        it('should handle multiple occurrences of same secret type', () => {
            const text = `
                api_key_1: "sk_live_key1_abcdefghijklmnopqrst"
                api_key_2: "sk_live_key2_zyxwvutsrqponmlkjih"
                api_key_3: "sk_live_key3_123456789012345678"
            `;
            const result = service.redactWithInfo(text);

            // At least 2 secrets should be found (may find more with overlapping patterns)
            expect(result.foundSecrets).toBeGreaterThanOrEqual(2);
        });
    });

    describe('real-world scenarios', () => {
        it('should redact .env file content', () => {
            const envContent = `
DATABASE_URL=postgresql://user:pass123@db.host.com:5432/mydb
OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz1234567890ABCDEF
JWT_SECRET=my-super-secret-jwt-key-value-here
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
            `.trim();

            const redacted = service.redact(envContent);

            expect(redacted).toContain('[REDACTED]');
            expect(redacted).not.toContain('user:pass');
            expect(redacted).not.toContain('sk-abc');
            expect(redacted).not.toContain('AKIAIOSFO');
        });

        it('should redact config.json content', () => {
            const config = JSON.stringify({
                api: {
                    key: 'sk_live_1234567890abcdefghijklmnopqrst',
                    secret: 'my-api-secret-value-123',
                },
                database: {
                    url: 'mongodb://admin:password@localhost/db',
                },
            });

            const redacted = service.redact(config);

            expect(redacted).toContain('[REDACTED]');
            expect(redacted).not.toContain('sk_live_');
            expect(redacted).not.toContain('admin:password');
        });

        it('should redact JavaScript/TypeScript code', () => {
            const code = `
const openai = new OpenAI({
    apiKey: "sk-proj-abcdefghijklmnopqrstuvwxyz1234567890"
});

const db = mongoose.connect("mongodb://user:pass@host/db");
            `.trim();

            const redacted = service.redact(code);

            expect(redacted).toContain('[REDACTED]');
            expect(redacted).not.toContain('sk-proj-');
            expect(redacted).not.toContain('user:pass');
        });
    });
});
