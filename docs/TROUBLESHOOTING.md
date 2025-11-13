# Troubleshooting Guide

Solutions to common issues and debugging tips for `aicmt`.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Configuration Issues](#configuration-issues)
- [Git Issues](#git-issues)
- [API Issues](#api-issues)
- [Runtime Errors](#runtime-errors)
- [Performance Issues](#performance-issues)
- [FAQ](#faq)

---

## Installation Issues

### Command Not Found

**Symptom:**
```bash
$ aicmt --version
bash: aicmt: command not found
```

**Causes & Solutions:**

1. **npm link not run**
   ```bash
   cd /path/to/Repo-Aware-Commit-Composer
   npm link
   ```

2. **npm bin directory not in PATH**
   ```bash
   # Check where npm bins are
   npm bin -g
   
   # Add to PATH (add to ~/.bashrc or ~/.zshrc)
   export PATH="$PATH:$(npm bin -g)"
   
   # Reload shell
   source ~/.bashrc
   ```

3. **Wrong directory**
   ```bash
   # Must be in project root
   cd Repo-Aware-Commit-Composer
   npm link
   ```

---

### Build Errors

**Symptom:**
```bash
$ npm run build
Error: Cannot find module 'typescript'
```

**Solution:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
npm run build
```

**Symptom:**
```bash
TS2307: Cannot find module '@oclif/core'
```

**Solution:**
```bash
# Ensure all dependencies are installed
npm install
npm run build
```

---

### Node Version Issues

**Symptom:**
```bash
npm ERR! engine Unsupported engine
```

**Solution:**
```bash
# Check Node version
node --version

# Should be >= 18.0.0
# Update Node using nvm:
nvm install 18
nvm use 18

# Or download from nodejs.org
```

---

## Configuration Issues

### API Key Not Found

**Symptom:**
```
✗ Error: OpenAI API key not configured
💡 Suggestion: Check that your OPENAI_API_KEY environment variable is set correctly
```

**Solutions:**

1. **Check if set:**
   ```bash
   echo $OPENAI_API_KEY
   ```

2. **Set for session:**
   ```bash
   export OPENAI_API_KEY="sk-your-key-here"
   ```

3. **Set permanently:**
   ```bash
   # Add to ~/.bashrc or ~/.zshrc
   echo 'export OPENAI_API_KEY="sk-your-key-here"' >> ~/.bashrc
   source ~/.bashrc
   ```

4. **Verify it's correct:**
   - Should start with `sk-`
   - Check for typos
   - Verify it's active at [OpenAI Platform](https://platform.openai.com/api-keys)

---

### Invalid Configuration File

**Symptom:**
```
✗ ConfigError: Invalid YAML syntax in .aicmt.yaml
```

**Solutions:**

1. **Validate YAML syntax:**
   ```bash
   # Use a YAML validator
   python -c "import yaml; yaml.safe_load(open('.aicmt.yaml'))"
   ```

2. **Common YAML mistakes:**
   ```yaml
   # ❌ Wrong: Inconsistent indentation
   style:
     width: 72
       emoji: false
   
   # ✅ Correct: Consistent 2-space indentation
   style:
     width: 72
     emoji: false
   ```

3. **Check for tabs:**
   ```bash
   # YAML doesn't allow tabs
   grep -P '\t' .aicmt.yaml
   # If output: replace tabs with spaces
   ```

4. **Start with minimal config:**
   ```yaml
   # .aicmt.yaml
   model:
     name: "gpt-4o-mini"
   ```

---

### Configuration Not Loading

**Symptom:**
Settings in `.aicmt.yaml` seem to be ignored.

**Debugging:**

1. **Check file location:**
   ```bash
   # Must be in repository root
   ls -la .aicmt.yaml
   ```

2. **Check file permissions:**
   ```bash
   chmod 644 .aicmt.yaml
   ```

3. **Enable debug logging:**
   ```bash
   # See what config is loaded
   aicmt commit --dry-run 2>&1 | grep -i config
   ```

4. **Verify precedence:**
   Remember: CLI flags > env vars > user config > project config > defaults

---

## Git Issues

### Not a Git Repository

**Symptom:**
```
✗ GitError: Not a git repository
💡 Suggestion: Run this command from inside a git repository, or initialize one with `git init`
```

**Solutions:**

1. **Initialize git:**
   ```bash
   git init
   ```

2. **Check current directory:**
   ```bash
   pwd
   ls -la .git  # Should exist
   ```

3. **Navigate to repo:**
   ```bash
   cd /path/to/your/repo
   ```

---

### No Staged Changes

**Symptom:**
```
✗ GitError: No staged changes found
💡 Suggestion: Stage your changes first with `git add <files>`
```

**Solutions:**

1. **Stage files:**
   ```bash
   git add .
   # or
   git add specific-file.js
   ```

2. **Check status:**
   ```bash
   git status
   ```

3. **Use range instead:**
   ```bash
   # Generate from last commit instead of staged
   aicmt commit --range HEAD~1..HEAD
   ```

---

### Invalid Diff Range

**Symptom:**
```
✗ GitError: Invalid revision range: abc123..def456
```

**Solutions:**

1. **Verify commits exist:**
   ```bash
   git log --oneline -10
   ```

2. **Use correct syntax:**
   ```bash
   # ✅ Correct
   git diff HEAD~3..HEAD
   git diff main..feature-branch
   git diff abc123..def456
   
   # ❌ Wrong
   git diff HEAD~3-HEAD
   git diff main...feature-branch  # Note: ... (3 dots) is different
   ```

3. **Check branch exists:**
   ```bash
   git branch -a
   ```

---

### Detached HEAD State

**Symptom:**
```
✗ GitError: Currently in detached HEAD state
💡 Suggestion: Create a branch with `git checkout -b <branch-name>`
```

**Solutions:**

1. **Create branch:**
   ```bash
   git checkout -b my-branch-name
   ```

2. **Return to branch:**
   ```bash
   git checkout main
   ```

3. **Use range mode:**
   ```bash
   # Still works in detached HEAD
   aicmt commit --range HEAD~1..HEAD
   ```

---

### Merge Conflicts

**Symptom:**
```
✗ GitError: Merge conflict detected
💡 Suggestion: Resolve merge conflicts first, then stage the resolved files
```

**Solutions:**

1. **Resolve conflicts:**
   ```bash
   # Edit conflicted files
   vim conflicted-file.js
   
   # Mark as resolved
   git add conflicted-file.js
   ```

2. **Or abort merge:**
   ```bash
   git merge --abort
   ```

---

## API Issues

### Unauthorized (401)

**Symptom:**
```
✗ APIError: Unauthorized request to OpenAI API
💡 Suggestion: Check that your OPENAI_API_KEY environment variable is set correctly
```

**Solutions:**

1. **Verify API key:**
   ```bash
   echo $OPENAI_API_KEY
   # Should start with sk-
   ```

2. **Check key is active:**
   - Go to [OpenAI Platform - API Keys](https://platform.openai.com/api-keys)
   - Verify key exists and is enabled
   - Regenerate if needed

3. **Check for typos:**
   ```bash
   # Set again carefully
   export OPENAI_API_KEY="sk-your-exact-key-here"
   ```

---

### Rate Limit Exceeded (429)

**Symptom:**
```
✗ APIError: Rate limit exceeded
💡 Suggestion: You have exceeded the API rate limit. Wait a moment and try again
```

**Solutions:**

1. **Wait 60 seconds:**
   ```bash
   sleep 60
   aicmt commit --dry-run
   ```

2. **Check usage:**
   - Visit [OpenAI Platform - Usage](https://platform.openai.com/usage)
   - Review your rate limits

3. **Reduce frequency:**
   - Don't run aicmt in a loop
   - Use `--dry-run` for testing

---

### Service Unavailable (503)

**Symptom:**
```
✗ APIError: Service temporarily unavailable
💡 Suggestion: The API service is experiencing issues. Try again in a few moments
```

**Solutions:**

1. **Wait and retry:**
   ```bash
   sleep 30
   aicmt commit
   ```

2. **Check OpenAI status:**
   - Visit [OpenAI Status Page](https://status.openai.com/)

3. **Use cached message:**
   ```bash
   # Save dry-run output for later
   aicmt commit --dry-run > message.txt
   ```

---

### Quota Exceeded

**Symptom:**
```
✗ APIError: You exceeded your current quota
```

**Solutions:**

1. **Check billing:**
   - Go to [OpenAI Platform - Billing](https://platform.openai.com/account/billing)
   - Add credits or upgrade plan

2. **Use cheaper model:**
   ```bash
   # Switch to GPT-3.5 (cheaper)
   aicmt commit --model openai/gpt-3.5-turbo
   ```

---

### Network Timeout

**Symptom:**
```
✗ APIError: Request timed out
💡 Suggestion: Check your network connection or try again
```

**Solutions:**

1. **Check internet connection:**
   ```bash
   ping 8.8.8.8
   curl https://api.openai.com
   ```

2. **Retry:**
   ```bash
   aicmt commit
   ```

3. **Check firewall:**
   - Ensure HTTPS traffic is allowed
   - Check corporate proxy settings

---

## Runtime Errors

### Module Not Found

**Symptom:**
```
Error: Cannot find module './git.js'
```

**Solutions:**

1. **Rebuild:**
   ```bash
   npm run build
   ```

2. **Check dist directory:**
   ```bash
   ls -la dist/
   # Should contain compiled .js files
   ```

3. **Reinstall:**
   ```bash
   npm install
   npm run build
   npm link
   ```

---

### Permission Denied

**Symptom:**
```
Error: EACCES: permission denied, open '.git/COMMIT_EDITMSG'
```

**Solutions:**

1. **Check git repository permissions:**
   ```bash
   ls -la .git/
   # Should be writable by your user
   ```

2. **Fix permissions:**
   ```bash
   chmod -R u+w .git/
   ```

3. **Check if repo is owned by another user:**
   ```bash
   # Run from outside git repo temporarily
   cd ..
   aicmt commit --range HEAD~1..HEAD
   ```

---

### Unexpected Token

**Symptom:**
```
SyntaxError: Unexpected token '?'
```

**Solutions:**

1. **Check Node version:**
   ```bash
   node --version
   # Must be >= 18.0.0
   ```

2. **Update Node:**
   ```bash
   nvm install 18
   nvm use 18
   ```

---

## Performance Issues

### Slow Response Times

**Symptom:**
Command takes > 10 seconds to complete.

**Causes & Solutions:**

1. **Large diff:**
   ```bash
   # Check diff size
   git diff --staged --stat
   
   # Solution: Commit in smaller chunks
   git add specific-files.js
   aicmt commit
   ```

2. **Slow model:**
   ```bash
   # Use faster model
   aicmt commit --model openai/gpt-3.5-turbo
   ```

3. **Network latency:**
   ```bash
   # Test network speed to OpenAI
   curl -w "@curl-format.txt" -o /dev/null -s https://api.openai.com
   ```

---

### High Memory Usage

**Symptom:**
Process uses > 500MB RAM.

**Solutions:**

1. **Reduce diff size:**
   - Commit smaller changesets
   - Use `--range` with limited commits

2. **Check for memory leaks:**
   ```bash
   # Monitor memory
   node --max-old-space-size=512 $(which aicmt) commit
   ```

---

## FAQ

### Q: Can aicmt work offline?

**A:** No. AI generation requires an internet connection to OpenAI's API. However, you can:
- Use `--dry-run` mode to test without API calls (uses cached/mocked responses)
- Generate messages ahead of time when online

---

### Q: Why is the generated message not perfect?

**A:** AI suggestions are starting points. You can:
- Override with `--type`, `--scope` flags
- Use `--dry-run` and edit manually
- Try different models with `--model`
- Provide better commit messages as examples (future feature)

---

### Q: Does aicmt modify my files?

**A:** No. aicmt only:
- Reads git diff output
- Creates commit messages
- Never modifies source files or staging area

---

### Q: Can I use aicmt without an OpenAI account?

**A:** Currently no. OpenAI API key is required. Future versions may support:
- Local models (LLaMA, GPT4All)
- Other providers (Anthropic Claude, etc.)

---

### Q: Is my code sent to OpenAI?

**A:** Yes, diffs are sent to OpenAI for analysis. However:
- Secrets are automatically redacted (see [Configuration](CONFIGURATION.md))
- Only diff content is sent, not full file contents
- You can review what's sent with `--dry-run` + debug mode

**Privacy considerations:**
- Don't use on highly confidential code
- Review redaction patterns
- Consider self-hosted alternatives (future)

---

### Q: Why does it sometimes suggest the wrong type?

**A:** Type detection is based on diff analysis. Common reasons:
- Mixed changes (feat + fix in same commit)
- Unclear diff context
- Refactoring that looks like a feature

**Solutions:**
- Use `--type` flag to override
- Split changes into multiple commits
- Use more descriptive file names

---

### Q: Can I use aicmt in a CI/CD pipeline?

**A:** Yes, but carefully:

```yaml
# GitHub Actions example
- name: Validate commit messages
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  run: |
    aicmt lint-commit .git/COMMIT_EDITMSG
```

**Considerations:**
- Set API key as secret
- Use `lint-commit` for validation
- Avoid auto-committing in CI (use `--dry-run`)

---

## Getting More Help

### Enable Debug Mode

```bash
# Set debug level logging
export LOG_LEVEL=debug

# Run command
aicmt commit --dry-run

# Look for detailed output
```

### Collect Diagnostic Information

```bash
# System info
echo "Node: $(node --version)"
echo "npm: $(npm --version)"
echo "Git: $(git --version)"
echo "aicmt: $(aicmt --version)"

# Configuration
echo "Config: $(cat .aicmt.yaml 2>/dev/null || echo 'none')"
echo "API Key set: $([ -n "$OPENAI_API_KEY" ] && echo 'yes' || echo 'no')"

# Git state
echo "Git status: $(git status --short)"
echo "Current branch: $(git branch --show-current)"
```

### Report Issues

When reporting bugs, include:

1. **Environment:**
   - OS and version
   - Node.js version
   - aicmt version

2. **Command:**
   - Exact command run
   - Flags used

3. **Error:**
   - Full error message
   - Stack trace (if available)

4. **Repository state:**
   - Git status
   - Staged files (if relevant)

**Where to report:**
- [GitHub Issues](https://github.com/AbdulKhaliqAbdulAzeez/Repo-Aware-Commit-Composer/issues)
- [GitHub Discussions](https://github.com/AbdulKhaliqAbdulAzeez/Repo-Aware-Commit-Composer/discussions)

---

**Last Updated:** November 11, 2025  
**Version:** 1.0.0
