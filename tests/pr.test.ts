import { describe, it, expect, beforeEach } from '@jest/globals';
import { PRRenderer } from '../src/core/render';

describe('PRRenderer', () => {
    let renderer: PRRenderer;

    beforeEach(() => {
        renderer = new PRRenderer();
    });

    describe('format', () => {
        it('should format PR description with all sections', () => {
            const sections = {
                summary: 'Add new authentication feature',
                changes: '- Implement OAuth2 flow\n- Add JWT token handling',
                breaking: 'API endpoint changed from /auth to /api/auth',
                migration: '1. Update client configuration\n2. Regenerate API tokens',
                testing: 'Run `npm test` to verify changes',
            };

            const formatted = renderer.format(sections);

            expect(formatted).toContain('## Summary');
            expect(formatted).toContain('## Changes');
            expect(formatted).toContain('## Breaking Changes');
            expect(formatted).toContain('## Migration Steps');
            expect(formatted).toContain('## Testing');
        });

        it('should omit empty sections', () => {
            const sections = {
                summary: 'Simple bugfix',
                changes: '- Fix typo in error message',
            };

            const formatted = renderer.format(sections);

            expect(formatted).toContain('## Summary');
            expect(formatted).toContain('## Changes');
            expect(formatted).not.toContain('## Breaking Changes');
            expect(formatted).not.toContain('## Migration Steps');
        });
    });
});
