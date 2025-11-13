# Installation Guide

This guide will walk you through installing and setting up `aicmt` (Repo-Aware Commit Composer) on your system.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation Methods](#installation-methods)
  - [From Source (Development)](#from-source-development)
  - [npm Global Install (Coming Soon)](#npm-global-install-coming-soon)
  - [npx Usage (Coming Soon)](#npx-usage-coming-soon)
- [Configuration](#configuration)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before installing `aicmt`, ensure you have the following:

### Required

1. **Git ≥ 2.30**
   ```bash
   git --version
   # Should output: git version 2.30.0 or higher
   ```

2. **Node.js ≥ 18.0.0**
   ```bash
   node --version
   # Should output: v18.0.0 or higher
   ```

3. **OpenAI API Key**
   - Sign up at [OpenAI Platform](https://platform.openai.com/)
   - Create an API key from the [API Keys page](https://platform.openai.com/api-keys)
   - Ensure you have available credits

### Recommended

- **npm ≥ 9.0** (usually comes with Node.js 18+)
- **A git repository** to test with
- **Terminal with color support** for best experience

---

## Installation Methods

### From Source (Development)

This method is currently the primary installation approach during development.

#### Step 1: Clone the Repository

```bash
git clone https://github.com/AbdulKhaliqAbdulAzeez/Repo-Aware-Commit-Composer.git
cd Repo-Aware-Commit-Composer
```

#### Step 2: Install Dependencies

```bash
npm install
```

This will install all required dependencies including:
- `@oclif/core` - CLI framework
- `openai` - OpenAI API client
- `js-yaml` - Configuration file parsing
- Development dependencies for TypeScript and testing

#### Step 3: Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

#### Step 4: Link Globally

```bash
npm link
```

This creates a global symlink to the `aicmt` command, making it available system-wide.

#### Verification

```bash
which aicmt
# Should output: /usr/local/bin/aicmt (or similar)

aicmt --version
# Should output: aicmt/1.0.0 (or current version)
```

---

### npm Global Install (Coming Soon)

Once published to npm, you'll be able to install globally:

```bash
npm install -g aicmt
```

This will be the recommended method for most users after v1.0 release.

---

### npx Usage (Coming Soon)

Use `aicmt` without installation:

```bash
npx aicmt commit --stage
```

This is ideal for:
- Trying out the tool before installing
- CI/CD environments
- One-off usage

---

## Configuration

### Step 1: Set OpenAI API Key

The API key is **required** for AI-powered features.

#### Option 1: Environment Variable (Recommended)

Add to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
export OPENAI_API_KEY="sk-your-api-key-here"
```

Then reload your shell:
```bash
source ~/.bashrc  # or ~/.zshrc
```

#### Option 2: Per-Session

Set for current terminal session only:

```bash
export OPENAI_API_KEY="sk-your-api-key-here"
```

#### Option 3: Configuration File

Create `~/.config/aicmt/config.yaml`:

```yaml
openai:
  apiKey: "sk-your-api-key-here"
  model: "gpt-4o-mini"
  temperature: 0.2
  maxTokens: 512
```

### Step 2: Configure Default Model (Optional)

Override the default model:

```bash
export AICMT_MODEL="openai/gpt-4o-mini"
```

Available models:
- `openai/gpt-4o` - Most capable, slower, more expensive
- `openai/gpt-4o-mini` - **Default**, balanced performance
- `openai/gpt-3.5-turbo` - Faster, cheaper, less capable

### Step 3: Project Configuration (Optional)

Create `.aicmt.yaml` in your repository root:

```yaml
# Model configuration
model: "openai/gpt-4o-mini"
temperature: 0.2
maxTokens: 512

# Commit message formatting
format:
  width: 72
  emoji: false
  breaking: true

# Issue linking
issueTracking:
  provider: "github"
  prefixPattern: "^(feat|fix|chore)/(\\d+)-"
  format: "#{number}"

# Redaction (secrets to hide from AI)
redaction:
  enabled: true
  patterns:
    - "api[_-]?key"
    - "secret"
    - "password"
    - "token"
```

---

## Verification

### Test Basic Functionality

1. **Navigate to a git repository:**
   ```bash
   cd /path/to/your/git/repo
   ```

2. **Make some changes and stage them:**
   ```bash
   echo "# Test" > test.md
   git add test.md
   ```

3. **Generate a commit message (dry-run):**
   ```bash
   aicmt commit --dry-run
   ```

4. **Expected output:**
   ```
   [INFO] Analyzing staged changes...
   [INFO] Generating commit message...
   
   Generated commit message:
   
   docs: add test documentation file
   
   Add initial test.md file for documentation purposes.
   ```

### Test Help System

```bash
# General help
aicmt --help

# Command-specific help
aicmt commit --help
aicmt pr --help
aicmt compose --help
aicmt lint-commit --help
```

### Verify Configuration

```bash
# Check if API key is set
echo $OPENAI_API_KEY
# Should output: sk-... (your key)

# Test API connection (will make a real API call)
aicmt commit --dry-run --stage
```

---

## Troubleshooting

### Issue: "Command not found: aicmt"

**Cause:** Global link not created or npm bin directory not in PATH

**Solutions:**

1. **Re-run npm link:**
   ```bash
   cd /path/to/Repo-Aware-Commit-Composer
   npm link
   ```

2. **Check npm bin directory:**
   ```bash
   npm bin -g
   # Add this directory to your PATH if not already
   ```

3. **Add to PATH** (if needed):
   ```bash
   # Add to ~/.bashrc or ~/.zshrc
   export PATH="$PATH:$(npm bin -g)"
   ```

### Issue: "OpenAI API key not found"

**Cause:** API key not set or not accessible

**Solutions:**

1. **Verify environment variable:**
   ```bash
   echo $OPENAI_API_KEY
   ```

2. **Check configuration file:**
   ```bash
   cat ~/.config/aicmt/config.yaml
   ```

3. **Set for current session:**
   ```bash
   export OPENAI_API_KEY="sk-your-key-here"
   ```

### Issue: "Not a git repository"

**Cause:** Running aicmt outside a git repository

**Solution:**

```bash
# Initialize git if needed
git init

# Or navigate to an existing repo
cd /path/to/your/repo
```

### Issue: "No staged changes found"

**Cause:** Using `--stage` flag without staged files

**Solutions:**

1. **Stage your changes:**
   ```bash
   git add .
   ```

2. **Or use a diff range instead:**
   ```bash
   aicmt commit --range HEAD~1..HEAD
   ```

### Issue: "Build errors during npm install"

**Cause:** Node version incompatibility or missing dependencies

**Solutions:**

1. **Check Node.js version:**
   ```bash
   node --version
   # Should be ≥ 18.0.0
   ```

2. **Update Node.js** (if needed):
   ```bash
   # Using nvm
   nvm install 18
   nvm use 18
   
   # Or download from nodejs.org
   ```

3. **Clear cache and reinstall:**
   ```bash
   rm -rf node_modules package-lock.json
   npm cache clean --force
   npm install
   ```

### Issue: "API rate limit exceeded"

**Cause:** Too many requests to OpenAI API

**Solutions:**

1. **Wait a moment** (usually 1 minute)
2. **Check your OpenAI usage** at [platform.openai.com](https://platform.openai.com/usage)
3. **Reduce request frequency**

### Issue: "Module not found" errors

**Cause:** Build not up to date or corrupted

**Solution:**

```bash
cd /path/to/Repo-Aware-Commit-Composer
npm run build
```

---

## Next Steps

- Read the [Quick Start Guide](QUICKSTART.md) for basic usage
- Review the [Configuration Reference](CONFIGURATION.md) for advanced options
- Check the [Command Reference](COMMANDS.md) for all available commands
- See [Examples](EXAMPLES.md) for common workflows

---

## Updating aicmt

### From Source Installation

```bash
cd /path/to/Repo-Aware-Commit-Composer
git pull origin main
npm install
npm run build
```

### npm Global Installation (When Available)

```bash
npm update -g aicmt
```

---

## Uninstallation

### Remove Global Link

```bash
cd /path/to/Repo-Aware-Commit-Composer
npm unlink -g
```

### Remove npm Global Package (When Available)

```bash
npm uninstall -g aicmt
```

### Clean Up Configuration

```bash
rm -rf ~/.config/aicmt
```

---

## Platform-Specific Notes

### Linux

- No special considerations
- Standard installation works on all major distributions
- Tested on: Ubuntu 20.04+, Fedora 35+, Arch Linux

### macOS

- Works on both Intel (x64) and Apple Silicon (ARM)
- If using Homebrew Node.js, ensure it's version 18+
- Terminal.app and iTerm2 fully supported

### Windows

- **WSL (Windows Subsystem for Linux):** Fully supported, recommended approach
- **Native Windows:** Experimental support
  - Use Git Bash or PowerShell
  - Some color output may not work correctly
  - Path handling may differ

---

## Getting Help

- **Issues:** [GitHub Issues](https://github.com/AbdulKhaliqAbdulAzeez/Repo-Aware-Commit-Composer/issues)
- **Discussions:** [GitHub Discussions](https://github.com/AbdulKhaliqAbdulAzeez/Repo-Aware-Commit-Composer/discussions)
- **Documentation:** [docs/](../docs/)

---

**Last Updated:** November 11, 2025  
**Version:** 1.0.0
