# Quick Start Guide

Get up and running with `aicmt` in 5 minutes.

## Prerequisites

Before starting, ensure you have:
- ✅ Git installed (version 2.30+)
- ✅ Node.js installed (version 18+)
- ✅ OpenAI API key

If you haven't installed `aicmt` yet, see the [Installation Guide](INSTALLATION.md).

---

## Step 1: Set Your API Key

```bash
export OPENAI_API_KEY="sk-your-api-key-here"
```

💡 **Tip:** Add this to your `~/.bashrc` or `~/.zshrc` to make it permanent.

---

## Step 2: Navigate to a Git Repository

```bash
cd /path/to/your/project
```

Or initialize a new repository:

```bash
mkdir my-project
cd my-project
git init
```

---

## Step 3: Make Some Changes

```bash
# Create a new file
echo "# My Project" > README.md
echo "console.log('Hello');" > index.js

# Stage the changes
git add README.md index.js
```

---

## Step 4: Generate Your First Commit

### Basic Usage

```bash
aicmt commit
```

This will:
1. Analyze your staged changes
2. Generate a Conventional Commit message
3. Create the commit automatically

**Example output:**
```
[INFO] Analyzing staged changes...
[INFO] Building context from 2 files...
[INFO] Generating commit message...

✓ Commit created successfully!

feat: initialize project with basic structure

Add README.md with project title and index.js with hello world example.
```

### Dry-Run Mode (Preview First)

```bash
aicmt commit --dry-run
```

This shows the generated message **without creating a commit**.

---

## Common Workflows

### Workflow 1: Generate Commit from Staged Changes

```bash
# Make changes
echo "export default {}" > config.js
git add config.js

# Generate commit
aicmt commit 

# Output: "feat: add default configuration file"
```

### Workflow 2: Generate Commit from Range

```bash
# Generate message for last 3 commits
aicmt commit --range HEAD~3..HEAD --dry-run
```

### Workflow 3: Override Type and Scope

```bash
# Make a fix
sed -i 's/Hello/Hi/' index.js
git add index.js

# Force type and scope
aicmt commit --type fix --scope greeting
```

**Output:**
```
fix(greeting): update greeting message from hello to hi
```

### Workflow 4: Auto-Link Issues from Branch

```bash
# Create feature branch with issue number
git checkout -b feat/123-add-login

# Make changes
echo "function login() {}" > auth.js
git add auth.js

# Auto-detect issue from branch name
aicmt commit --issue auto
```

**Output:**
```
feat(auth): add login function

Implement basic login function for user authentication.

Resolves #123
```

### Workflow 5: Generate PR Description

```bash
# After multiple commits on a branch
git checkout feat/awesome-feature

# Generate PR description
aicmt pr --base main --head feat/awesome-feature
```

**Output:**
```
# Feature: Awesome Feature

## Summary
This PR introduces awesome new functionality...

## Changes
- Add feature X
- Update component Y
- Refactor module Z

## Breaking Changes
None

## Testing
- Unit tests added
- Manual testing completed
```

### Workflow 6: One-Shot Commit + PR

```bash
# Generate both commit and PR description
aicmt compose --pr

# Creates commit and writes PR-DESCRIPTION.md
```

---

## Understanding Command Flags

### Essential Flags

| Flag        | Purpose                          | Example                             |
| ----------- | -------------------------------- | ----------------------------------- |
| `--dry-run` | Preview without committing       | `aicmt commit --dry-run`            |
| `--range`   | Use diff range instead of staged | `aicmt commit --range HEAD~2..HEAD` |
| `--type`    | Override commit type             | `aicmt commit --type fix`           |
| `--scope`   | Set scope manually               | `aicmt commit --scope auth`         |
| `--issue`   | Link issue number                | `aicmt commit --issue 123`          |

### Advanced Flags

| Flag          | Purpose                 | Example                              |
| ------------- | ----------------------- | ------------------------------------ |
| `--model`     | Use different AI model  | `aicmt commit --model openai/gpt-4o` |
| `--emoji`     | Add emoji prefix        | `aicmt commit --emoji`               |
| `--breaking`  | Mark as breaking change | `aicmt commit --breaking`            |
| `--no-verify` | Skip git hooks          | `aicmt commit --no-verify`           |

---

## Practical Examples

### Example 1: Bug Fix

```bash
# Fix a bug in user validation
git checkout -b fix/validate-email
sed -i 's/@/@gmail\.com/' validate.js
git add validate.js

# Generate commit
aicmt commit --type fix --scope validation

# Output: "fix(validation): correct email domain validation pattern"
```

### Example 2: Documentation Update

```bash
# Update README
echo "## Installation" >> README.md
git add README.md

# Generate commit
aicmt commit

# Output: "docs: add installation section to README"
```

### Example 3: Refactoring

```bash
# Refactor code structure
mkdir src/utils
mv helper.js src/utils/
git add -A

# Generate commit
aicmt commit --type refactor

# Output: "refactor: reorganize helper utilities into utils directory"
```

### Example 4: Breaking Change

```bash
# Change API signature
sed -i 's/getUser(/getUserById(/' api.js
git add api.js

# Generate commit with breaking change
aicmt commit --breaking

# Output:
# feat!: rename getUser to getUserById
# 
# BREAKING CHANGE: getUser() has been renamed to getUserById() for clarity.
```

### Example 5: Multiple File Changes

```bash
# Make related changes across files
echo "export const API_URL = '...'" > config.js
sed -i 's/localhost/api.example.com/' app.js
git add config.js app.js

# Generate commit
aicmt commit

# Output:
# feat: configure API endpoint
# 
# - Add API_URL constant to config
# - Update app.js to use new endpoint
```

---

## Tips & Best Practices

### 💡 Stage Related Changes Together

Group related changes in a single commit:

```bash
# Good: Related changes
git add login.js logout.js session.js
aicmt commit  # Generates: "feat(auth): implement session management"

# Bad: Unrelated changes
git add login.js README.md package.json
aicmt commit  # Generates confusing mixed-purpose message
```

### 💡 Use Dry-Run for Verification

Always preview before committing to production:

```bash
aicmt commit --dry-run  # Check the message first
aicmt commit            # Commit if satisfied
```

### 💡 Leverage Issue Auto-Detection

Use branch naming conventions:

```bash
# Patterns recognized:
# feat/123-description
# fix/PROJ-456-description  
# chore/789-description

git checkout -b feat/42-add-auth
# ... make changes ...
aicmt commit --issue auto  # Automatically adds "Resolves #42"
```

### 💡 Override When Needed

AI suggestions are good, but you know your project best:

```bash
# Override type if AI gets it wrong
aicmt commit --type chore --scope deps --dry-run

# Check if it looks better
aicmt commit --type chore --scope deps
```

### 💡 Use PR Command for Reviews

Generate comprehensive PR descriptions:

```bash
# Before creating a PR
aicmt pr --stdout | pbcopy  # macOS
aicmt pr --stdout | xclip   # Linux

# Then paste into GitHub/GitLab PR form
```

---

## Common Questions

### Q: Can I edit the generated message?

Yes! Use the `--open` flag (coming soon):

```bash
aicmt commit --open
# Opens your $EDITOR with the generated message
```

For now, use `--dry-run` and create the commit manually:

```bash
# Preview
aicmt commit --dry-run

# Copy the message and create commit manually
git commit -m "feat: your message"
```

### Q: Does it work without internet?

No. AI generation requires an active internet connection to OpenAI's API.

### Q: How much does it cost?

Costs depend on OpenAI pricing:
- Typical commit: ~$0.001-0.002 (very cheap)
- gpt-4o-mini (default): ~$0.0001 per commit
- gpt-4o: ~$0.001 per commit

### Q: Can I use it in CI/CD?

Yes! Set `OPENAI_API_KEY` in your CI environment:

```yaml
# GitHub Actions example
- name: Generate commit
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  run: aicmt commit --dry-run
```

### Q: What if I don't like the generated message?

1. Use `--dry-run` to preview
2. Override with `--type`, `--scope` flags
3. Try a different model with `--model`
4. Edit manually if needed

---

## Next Steps

Now that you're up and running:

1. ✅ Read the [Configuration Reference](CONFIGURATION.md) for customization
2. ✅ Check the [Command Reference](COMMANDS.md) for all options
3. ✅ Review [Best Practices](BEST_PRACTICES.md) for team usage
4. ✅ Explore [Examples](EXAMPLES.md) for advanced workflows

---

## Getting Help

Stuck? We're here to help:

- 📖 **Documentation:** [docs/](../docs/)
- 🐛 **Bug Reports:** [GitHub Issues](https://github.com/AbdulKhaliqAbdulAzeez/Repo-Aware-Commit-Composer/issues)
- 💬 **Questions:** [GitHub Discussions](https://github.com/AbdulKhaliqAbdulAzeez/Repo-Aware-Commit-Composer/discussions)
- 📧 **Email:** support@example.com

---

**Happy committing! 🚀**
