import { execSync, ExecSyncOptions } from 'child_process';

export interface ShellOptions extends ExecSyncOptions {
    silent?: boolean;
}

/**
 * Execute a shell command
 */
export function exec(command: string, options: ShellOptions = {}): string {
    const { silent, ...execOptions } = options;

    try {
        const result = execSync(command, {
            encoding: 'utf-8',
            ...execOptions,
        });

        return result.toString().trim();
    } catch (error: any) {
        if (!silent) {
            throw new Error(`Command failed: ${command}\n${error.message}`);
        }
        return '';
    }
}

/**
 * Check if a command exists
 */
export function commandExists(command: string): boolean {
    try {
        const testCmd = process.platform === 'win32' ? `where ${command}` : `which ${command}`;
        exec(testCmd, { silent: true });
        return true;
    } catch {
        return false;
    }
}
