# Examples

Real-world usage examples and sample configurations for `aicmt`.

## Table of Contents

- [Configuration Examples](#configuration-examples)
- [Workflow Examples](#workflow-examples)
- [Team Setups](#team-setups)
- [Integration Examples](#integration-examples)
- [Advanced Use Cases](#advanced-use-cases)

---

## Configuration Examples

### Minimal Configuration

For quick setup with defaults:

```yaml
# .aicmt.yaml
model:
  name: "gpt-4o-mini"
```

**When to use:**
- Getting started
- Personal projects
- Testing aicmt

---

### Team Standard Configuration

Enforce consistent commit style across team:

```yaml
# .aicmt.yaml (project root - committed to repo)
style:
  conventional: true
  width: 72
  emoji: false
  tense: "imperative"
  bullet: "-"

scope:
  infer: true
  map:
    "src/api/": "api"
    "src/ui/": "ui"
    "src/db/": "database"
    "tests/": "test"
    "docs/": "docs"

issues:
  mode: "auto"
  patterns:
    - "JIRA-\\d+"
    - "#\\d+"
  link_template: "https://jira.company.com/browse/{issue}"
```

**Benefits:**
- Consistent format across team
- Auto-scope detection
- Automatic issue linking
- Committed to repo ensures everyone uses same config

---

### Personal Preferences Configuration

User-level overrides for personal style:

```yaml
# ~/.config/aicmt/config.yaml (user home - not committed)
model:
  name: "gpt-4o"  # Prefer better model
  temperature: 0.3  # More deterministic

style:
  emoji: true  # I like emojis
  width: 80  # Wider messages

redaction:
  enabled: true
  patterns:
    - "password.*=.*"
    - "api[_-]?key.*=.*"
    - "[a-zA-Z0-9]{32,}"  # Likely tokens
```

**Use case:**
- Personal preferences override team defaults
- Extra security patterns
- Different model choice

---

### Multi-Project Setup

Different configs for different project types:

**Frontend Project:**
```yaml
# frontend-app/.aicmt.yaml
model:
  name: "gpt-4o-mini"

scope:
  map:
    "src/components/": "component"
    "src/pages/": "page"
    "src/hooks/": "hook"
    "src/utils/": "util"
    "src/styles/": "style"

issues:
  link_template: "https://github.com/company/frontend/issues/{issue}"
```

**Backend API:**
```yaml
# backend-api/.aicmt.yaml
model:
  name: "gpt-4o"  # More complex, use better model

scope:
  map:
    "src/routes/": "api"
    "src/models/": "model"
    "src/services/": "service"
    "src/middleware/": "middleware"
    "src/db/": "database"

issues:
  patterns:
    - "JIRA-\\d+"
  link_template: "https://jira.company.com/browse/{issue}"
```

**Infrastructure:**
```yaml
# infra/.aicmt.yaml
model:
  name: "gpt-4o"

scope:
  map:
    "terraform/": "infra"
    "kubernetes/": "k8s"
    "docker/": "docker"
    "scripts/": "script"

redaction:
  enabled: true  # Critical for infra
  patterns:
    - "password.*"
    - "secret.*"
    - "token.*"
    - "key.*"
```

---

### Maximum Security Configuration

For sensitive codebases:

```yaml
# .aicmt.yaml
model:
  provider: "openai"
  name: "gpt-4o-mini"

redaction:
  enabled: true
  patterns:
    # API Keys
    - "api[_-]?key[\\s]*[:=][\\s]*['\"]?([\\w-]+)['\"]?"
    - "sk-[a-zA-Z0-9]{32,}"
    
    # Passwords
    - "password[\\s]*[:=][\\s]*['\"]?([^'\"\\s]+)['\"]?"
    - "pwd[\\s]*[:=][\\s]*['\"]?([^'\"\\s]+)['\"]?"
    
    # Tokens
    - "token[\\s]*[:=][\\s]*['\"]?([\\w.-]+)['\"]?"
    - "bearer[\\s]+([\\w.-]+)"
    
    # Private Keys
    - "-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----"
    - "-----BEGIN OPENSSH PRIVATE KEY-----"
    
    # Database URLs
    - "postgres://[^\\s]+"
    - "mysql://[^\\s]+"
    - "mongodb://[^\\s]+"
    
    # AWS Keys
    - "AKIA[0-9A-Z]{16}"
    - "aws_secret_access_key.*"
    
    # Generic Secrets
    - "[a-zA-Z0-9_-]{32,}"  # Long random strings
    
    # Email addresses (optional)
    - "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}"

style:
  conventional: true
  width: 72
```

**When to use:**
- Financial software
- Healthcare applications
- Security-focused projects
- Compliance requirements

---

## Workflow Examples

### 1. Feature Development

**Scenario:** Adding user authentication feature

```bash
# Create feature branch
git checkout -b feature/user-auth

# Make changes
vim src/auth/login.ts
vim src/auth/signup.ts
vim tests/auth.test.ts

# Stage changes
git add src/auth/ tests/auth.test.ts

# Generate commit
aicmt commit

# Output:
# ✓ Analyzed 3 files (2 added, 1 modified)
# ✓ Generated commit message
# 
# feat(auth): add user authentication with JWT
# 
# - Implement login endpoint with email/password validation
# - Add signup endpoint with password hashing
# - Create authentication middleware for protected routes
# - Add comprehensive auth test coverage
# 
# Commit with this message? (y/n): y
# ✓ Committed successfully

# Push
git push origin feature/user-auth
```

---

### 2. Bug Fix with Issue Reference

**Scenario:** Fixing bug tracked as JIRA-456

```bash
# Create bug fix branch
git checkout -b fix/JIRA-456-memory-leak

# Make fix
vim src/cache/manager.ts

# Stage fix
git add src/cache/manager.ts

# Generate commit (auto-detects JIRA-456 from branch)
aicmt commit

# Output:
# ✓ Detected issue: JIRA-456
# ✓ Generated commit message
# 
# fix(cache): resolve memory leak in cache cleanup
# 
# - Fix memory leak by properly clearing interval timers
# - Add cleanup on cache manager destruction
# - Update tests to verify timer cleanup
# 
# Closes: JIRA-456
# 
# Commit? (y/n): y
```

---

### 3. Documentation Update

**Scenario:** Updating README

```bash
# Make changes
vim README.md
vim docs/INSTALLATION.md

# Stage
git add README.md docs/INSTALLATION.md

# Generate commit
aicmt commit --type docs

# Output:
# docs(docs): update installation and usage documentation
# 
# - Add troubleshooting section to README
# - Expand installation guide with platform-specific notes
# - Include examples for common use cases
```

---

### 4. Multi-File Refactoring

**Scenario:** Restructuring project organization

```bash
# Move files
git mv src/utils/helper.ts src/utils/string.ts
git mv src/utils/formatter.ts src/utils/format.ts

# Update imports
vim src/index.ts
vim tests/utils.test.ts

# Stage all
git add -A

# Generate commit
aicmt commit --scope refactor

# Output:
# refactor(refactor): reorganize utility modules for clarity
# 
# - Rename helper.ts to string.ts for clearer purpose
# - Rename formatter.ts to format.ts for consistency
# - Update all import statements across codebase
# - Ensure tests reflect new module structure
```

---

### 5. Pull Request Generation

**Scenario:** Create PR for completed feature

```bash
# Ensure all commits are made
git log --oneline -5

# Generate PR description
aicmt pr --target main --output pr.md

# Output saved to pr.md:
# ## Summary
# Add user authentication with JWT tokens
# 
# ## Changes
# - feat(auth): add user authentication with JWT
# - test(auth): add authentication test coverage
# - docs(auth): document authentication flow
# 
# ## Testing
# - All existing tests passing
# - Added 15 new authentication tests
# - Manual testing completed for login/signup flows

# Create PR using GitHub CLI
gh pr create --title "feat: user authentication" --body-file pr.md
```

---

### 6. One-Shot Compose (Commit + PR)

**Scenario:** Quick feature completion

```bash
# All changes done
git add .

# Commit and generate PR in one command
aicmt compose --target main

# Output:
# ✓ Generated commit message
# ✓ Committed successfully
# ✓ Generated PR description
# 
# PR Description saved to: .git/PR_DESCRIPTION.md
# 
# Next steps:
#   git push origin feature/my-feature
#   gh pr create --body-file .git/PR_DESCRIPTION.md
```

---

### 7. Commit Range Analysis

**Scenario:** Analyze what changed in last sprint

```bash
# Generate message for last 10 commits
aicmt commit --range HEAD~10..HEAD --dry-run

# Output:
# refactor(api): modernize authentication and data layers
# 
# - Migrate from JWT to OAuth2 authentication
# - Replace REST API with GraphQL endpoints
# - Implement caching layer for database queries
# - Refactor error handling across all services
# - Update tests for new authentication flow
# - Add performance benchmarks for API endpoints
```

---

## Team Setups

### Small Team (2-5 developers)

**Setup:**

```yaml
# .aicmt.yaml (committed)
model:
  name: "gpt-4o-mini"  # Cost-effective

style:
  conventional: true
  width: 72
  emoji: false  # Keep professional

scope:
  infer: true

issues:
  mode: "auto"
  patterns: ["#\\d+"]
  link_template: "https://github.com/team/repo/issues/{issue}"
```

**Workflow:**
- Everyone uses same config
- GitHub issues for tracking
- Simple, consistent style

---

### Medium Team (6-20 developers)

**Setup:**

```yaml
# .aicmt.yaml (committed)
model:
  name: "gpt-4o-mini"

style:
  conventional: true
  width: 72
  emoji: false
  tense: "imperative"
  bullet: "-"

scope:
  infer: true
  map:
    "src/frontend/": "ui"
    "src/backend/": "api"
    "src/shared/": "shared"
    "infrastructure/": "infra"

issues:
  mode: "auto"
  patterns:
    - "JIRA-\\d+"
  link_template: "https://jira.company.com/browse/{issue}"

redaction:
  enabled: true
```

**Git Hooks:**

```bash
# .git/hooks/commit-msg
#!/bin/bash
aicmt lint-commit "$1" || exit 1
```

**Benefits:**
- Enforced message format
- JIRA integration
- Auto-scope by component
- Secret protection

---

### Large Team (20+ developers)

**Setup:**

```yaml
# .aicmt.yaml (committed - team defaults)
model:
  name: "gpt-4o-mini"

style:
  conventional: true
  width: 72
  emoji: false
  tense: "imperative"
  bullet: "-"

scope:
  infer: true
  map:
    "packages/core/": "core"
    "packages/ui/": "ui"
    "packages/api/": "api"
    "packages/shared/": "shared"
    "apps/web/": "web"
    "apps/mobile/": "mobile"
    "apps/admin/": "admin"

issues:
  mode: "auto"
  patterns:
    - "JIRA-[A-Z]+-\\d+"
  link_template: "https://jira.company.com/browse/{issue}"

redaction:
  enabled: true
  patterns:
    - "password.*"
    - "secret.*"
    - "api[_-]?key.*"
```

**CI/CD Integration:**

```yaml
# .github/workflows/pr-validation.yml
name: PR Validation

on:
  pull_request:
    branches: [main, develop]

jobs:
  validate-commits:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'
      
      - name: Install aicmt
        run: npm install -g aicmt
      
      - name: Validate all PR commits
        run: |
          git log --format=%H origin/${{ github.base_ref }}..HEAD | while read commit; do
            git log --format=%B -n 1 $commit > /tmp/msg.txt
            aicmt lint-commit /tmp/msg.txt || exit 1
          done
```

**Benefits:**
- Monorepo support
- Strict validation
- CI enforcement
- Standardization at scale

---

## Integration Examples

### Git Hooks

**Pre-commit hook (prevent bad commits):**

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Ensure no secrets in staged changes
git diff --staged | aicmt commit --dry-run > /dev/null 2>&1

if [ $? -ne 0 ]; then
  echo "⚠️  Warning: Potential secrets detected in staged changes"
  echo "Review redaction warnings before committing"
  exit 1
fi
```

**Commit-msg hook (validate messages):**

```bash
#!/bin/bash
# .git/hooks/commit-msg

aicmt lint-commit "$1"

if [ $? -ne 0 ]; then
  echo ""
  echo "💡 Tip: Use 'aicmt commit' to generate a valid message"
  exit 1
fi
```

**Install hooks:**

```bash
# Make executable
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/commit-msg
```

---

### VS Code Integration

**Task configuration:**

```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Generate Commit",
      "type": "shell",
      "command": "aicmt commit",
      "problemMatcher": [],
      "group": {
        "kind": "build",
        "isDefault": true
      }
    },
    {
      "label": "Generate PR",
      "type": "shell",
      "command": "aicmt pr --output .git/PR_DESCRIPTION.md",
      "problemMatcher": []
    }
  ]
}
```

**Keyboard shortcut:**

```json
// .vscode/keybindings.json
[
  {
    "key": "ctrl+shift+c",
    "command": "workbench.action.tasks.runTask",
    "args": "Generate Commit"
  }
]
```

---

### Shell Aliases

```bash
# Add to ~/.bashrc or ~/.zshrc

# Quick commit
alias gc='aicmt commit'

# Dry run (review before commit)
alias gcd='aicmt commit --dry-run'

# Commit with specific type
alias gcf='aicmt commit --type feat'
alias gcx='aicmt commit --type fix'
alias gcd='aicmt commit --type docs'

# Generate PR
alias gpr='aicmt pr --output .git/PR.md && cat .git/PR.md'

# Compose (commit + PR)
alias gcp='aicmt compose'
```

---

## Advanced Use Cases

### 1. Custom AI Prompts (Future)

**Scenario:** Add custom instructions for AI

```yaml
# .aicmt.yaml
model:
  name: "gpt-4o"
  prompt_template: |
    You are generating a commit message for {repository_name}.
    
    Style guide:
    - Use present tense for type 'feat'
    - Use past tense for type 'fix'
    - Always mention performance impact if applicable
    
    Context: {context}
    Diff: {diff}
```

---

### 2. Multi-Repository Workflow

**Scenario:** Multiple related repos

```bash
# Update frontend
cd ~/projects/app-frontend
git add .
aicmt commit --scope ui
git push

# Update backend
cd ~/projects/app-backend
git add .
aicmt commit --scope api
git push

# Update shared library
cd ~/projects/app-shared
git add .
aicmt commit --scope shared
git push

# Generate coordinated release notes
aicmt pr --range v1.0.0..HEAD > frontend-changes.md
cd ~/projects/app-backend
aicmt pr --range v1.0.0..HEAD > backend-changes.md
cd ~/projects/app-shared
aicmt pr --range v1.0.0..HEAD > shared-changes.md

# Combine for release
cat *-changes.md > RELEASE_NOTES.md
```

---

### 3. Conventional Changelog Generation

**Script:**

```bash
#!/bin/bash
# generate-changelog.sh

# Get current version
CURRENT_VERSION=$(git describe --tags --abbrev=0)

# Generate messages for all commits since last tag
aicmt commit --range $CURRENT_VERSION..HEAD --dry-run > changes.txt

# Parse into changelog format
cat > CHANGELOG.md << EOF
# Changelog

## [Unreleased]

$(cat changes.txt)

## [$CURRENT_VERSION] - $(date +%Y-%m-%d)

$(git log $CURRENT_VERSION --format="- %s" --no-merges)
EOF
```

---

### 4. Semantic Release Integration

**Configuration:**

```json
// .releaserc.json
{
  "branches": ["main"],
  "plugins": [
    ["@semantic-release/commit-analyzer", {
      "preset": "conventionalcommits"
    }],
    ["@semantic-release/release-notes-generator", {
      "preset": "conventionalcommits"
    }],
    "@semantic-release/npm",
    "@semantic-release/github"
  ]
}
```

**Workflow:**

```bash
# Develop feature
git checkout -b feature/new-thing
# ... make changes ...
git add .
aicmt commit  # Generates: feat(scope): description

# Fix bug
git checkout -b fix/bug
# ... make fix ...
git add .
aicmt commit  # Generates: fix(scope): description

# Merge to main (triggers semantic-release)
# - Analyzes commits (feat = minor, fix = patch)
# - Generates changelog
# - Creates release
# - Publishes to npm
```

---

### 5. Monorepo Management

**Configuration:**

```yaml
# .aicmt.yaml (root)
scope:
  map:
    "packages/auth/": "auth"
    "packages/api/": "api"
    "packages/ui/": "ui"
    "packages/shared/": "shared"
    "apps/web/": "app-web"
    "apps/mobile/": "app-mobile"
```

**Workflow:**

```bash
# Work on specific package
cd packages/auth
vim src/login.ts
git add .
aicmt commit  # Auto-detects scope: auth

# Work across packages
cd ../..  # Back to root
git add packages/auth packages/shared
aicmt commit --scope "auth,shared"
```

---

## Tips & Best Practices

### 1. Start with Dry Run

Always review before committing:

```bash
aicmt commit --dry-run
# Review output
# If good:
aicmt commit
```

---

### 2. Use Specific Scopes

Override auto-detection when needed:

```bash
aicmt commit --scope "auth,api"  # Multiple scopes
aicmt commit --scope "breaking"  # Breaking change
```

---

### 3. Custom Types for Special Cases

```bash
aicmt commit --type "perf"  # Performance improvement
aicmt commit --type "revert"  # Revert previous commit
aicmt commit --type "build"  # Build system changes
```

---

### 4. Combine with Git Aliases

```bash
git config alias.ac '!git add . && aicmt commit'
git config alias.acd '!git add . && aicmt commit --dry-run'

# Usage:
git ac  # Stage all + generate commit
```

---

### 5. Review Sensitive Data

Before committing sensitive repos:

```bash
# Enable debug to see what's sent to AI
export LOG_LEVEL=debug
aicmt commit --dry-run 2>&1 | grep -A 50 "Prompt:"
```

---

## More Examples

See also:
- [Quick Start Guide](QUICKSTART.md) - Common workflows
- [Commands Reference](COMMANDS.md) - All command options
- [Configuration Guide](CONFIGURATION.md) - Detailed config options

---

**Last Updated:** November 11, 2025  
**Version:** 1.0.0
