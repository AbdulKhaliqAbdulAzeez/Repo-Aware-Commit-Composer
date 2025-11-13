#!/usr/bin/env node

import { fileURLToPath } from 'url';
import path from 'path';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up the project root
const projectRoot = path.join(__dirname, '..');

async function main() {
    const { execute } = await import('@oclif/core');
    await execute({ development: true, dir: projectRoot });
}

main();
