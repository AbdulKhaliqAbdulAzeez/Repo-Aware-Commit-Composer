# Configuration Reference

Complete guide to configuring `aicmt` for your project and team.

## Table of Contents

- [Configuration Files](#configuration-files)
- [Configuration Precedence](#configuration-precedence)
- [Configuration Schema](#configuration-schema)
- [Environment Variables](#environment-variables)
- [Examples](#examples)

---

## Configuration Files

`aicmt` supports multiple configuration file locations:

### Project Configuration

**Location:** `.aicmt.yaml` in repository root

**Purpose:** Project-specific settings shared with team

**Example:**
```yaml
style:
  conventional: true
  width: 72
  emoji: false
  
scope:
  infer: true
  map:
    src/api: api
    src/web: web
    src/db: database
```

### User Configuration

**Location:** `~/.config/aicmt/config.yaml`

**Purpose:** Personal preferences across all projects

**Example:**
```yaml
model:
  provider: openai
  name: gpt-4o-mini
  temperature: 0.2
  max_tokens: 512

style:
  emoji: true  # Personal preference
```

---

## Configuration Precedence

Configuration is merged with the following precedence (highest to lowest):

1. **CLI Flags** - Highest priority
   ```bash
   aicmt commit --type feat --scope api
   ```

2. **Environment Variables**
   ```bash
   export AICMT_MODEL="openai/gpt-4o"
   export OPENAI_API_KEY="sk-..."
   ```

3. **User Config** - `~/.config/aicmt/config.yaml`

4. **Project Config** - `.aicmt.yaml`

5. **Defaults** - Built-in defaults (lowest priority)

**Example:**

```yaml
# .aicmt.yaml (project)
style:
  width: 72
  emoji: false

# ~/.config/aicmt/config.yaml (user)
style:
  emoji: true

# Result: emoji = true (user config overrides project config)
```

---

## Configuration Schema

### Complete Configuration Structure

```yaml
# Model configuration
model:
  provider: "openai"
  name: "gpt-4o-mini"
  max_tokens: 512
  temperature: 0.2

# Commit message style
style:
  conventional: true
  width: 72
  emoji: false
  tense: "present"
  bullet: "-"

# Scope detection and mapping
scope:
  infer: true
  map:
    "src/": "core"
    "tests/": "test"
    "docs/": "docs"

# Issue tracking integration
issues:
  mode: "auto"  # auto | off
  patterns:
    - "^(feat|fix|chore)/(\\d+)-"
    - "^(feat|fix|chore)/([A-Z]+-\\d+)-"
  link_template: "Resolves #{number}"

# Secret redaction
redaction:
  enabled: true
  patterns:
    - "api[_-]?key"
    - "secret"
    - "password"
    - "token"
    - "bearer"
    - "authorization"
```

---

## Configuration Options

### Model Configuration

Controls AI model behavior and selection.

#### `model.provider`

**Type:** `string`  
**Default:** `"openai"`  
**Description:** AI provider to use

**Supported values:**
- `openai` - OpenAI (GPT-3.5, GPT-4)

**Example:**
```yaml
model:
  provider: "openai"
```

#### `model.name`

**Type:** `string`  
**Default:** `"gpt-4o-mini"`  
**Description:** Specific model to use

**Supported values:**
- `gpt-4o` - Most capable, expensive
- `gpt-4o-mini` - Balanced (recommended)
- `gpt-3.5-turbo` - Fast, cheap

**Example:**
```yaml
model:
  name: "gpt-4o"
```

#### `model.max_tokens`

**Type:** `number`  
**Default:** `512`  
**Range:** `1` - `4096`  
**Description:** Maximum tokens in response

**Example:**
```yaml
model:
  max_tokens: 1024
```

#### `model.temperature`

**Type:** `number`  
**Default:** `0.2`  
**Range:** `0.0` - `2.0`  
**Description:** Creativity/randomness (0 = deterministic, 2 = very creative)

**Recommendations:**
- `0.0-0.3` - Consistent, factual (recommended for commits)
- `0.4-0.7` - Balanced
- `0.8-2.0` - Creative, varied (not recommended)

**Example:**
```yaml
model:
  temperature: 0.1
```

---

### Style Configuration

Controls commit message formatting.

#### `style.conventional`

**Type:** `boolean`  
**Default:** `true`  
**Description:** Use Conventional Commit format

**Example:**
```yaml
style:
  conventional: true
```

#### `style.width`

**Type:** `number`  
**Default:** `72`  
**Range:** `50` - `200`  
**Description:** Maximum line width for commit body

**Recommendations:**
- `72` - Standard Git convention (recommended)
- `80` - Common alternative
- `100` - For teams preferring longer lines

**Example:**
```yaml
style:
  width: 100
```

#### `style.emoji`

**Type:** `boolean`  
**Default:** `false`  
**Description:** Add emoji prefix to commit type

**Emoji mapping:**
- 🚀 `feat` - New feature
- 🐛 `fix` - Bug fix
- 📝 `docs` - Documentation
- ♻️ `refactor` - Code refactoring
- ✅ `test` - Tests
- ⚡ `perf` - Performance
- 🧹 `chore` - Maintenance
- 🔧 `build` - Build system
- 🔨 `ci` - CI/CD
- ⏪ `revert` - Revert

**Example:**
```yaml
style:
  emoji: true
```

**Output:**
```
🚀 feat(auth): add login
```

#### `style.tense`

**Type:** `"present" | "past"`  
**Default:** `"present"`  
**Description:** Verb tense for commit messages

**Examples:**
- `present` → "add feature"
- `past` → "added feature"

**Example:**
```yaml
style:
  tense: "present"
```

#### `style.bullet`

**Type:** `string`  
**Default:** `"-"`  
**Description:** Bullet point character for lists

**Supported values:**
- `-` - Hyphen (standard)
- `*` - Asterisk
- `•` - Bullet
- Custom characters

**Example:**
```yaml
style:
  bullet: "*"
```

---

### Scope Configuration

Controls automatic scope detection and mapping.

#### `scope.infer`

**Type:** `boolean`  
**Default:** `true`  
**Description:** Automatically infer scope from changed files

**How it works:**
- Analyzes file paths
- Detects common patterns (src/, tests/, docs/)
- Suggests most relevant scope

**Example:**
```yaml
scope:
  infer: true
```

#### `scope.map`

**Type:** `Record<string, string>`  
**Default:** `{}`  
**Description:** Map file path patterns to scope names

**Use cases:**
- Standardize scope names
- Map directories to logical components
- Enforce team conventions

**Example:**
```yaml
scope:
  map:
    "src/api/": "api"
    "src/web/": "web"
    "src/database/": "db"
    "tests/": "test"
    "docs/": "docs"
    "scripts/": "tooling"
```

**Behavior:**
```bash
# Changed file: src/api/users.ts
# Inferred scope: api

# Changed file: tests/unit/auth.test.ts
# Inferred scope: test
```

---

### Issues Configuration

Controls issue tracking integration.

#### `issues.mode`

**Type:** `"auto" | "off"`  
**Default:** `"auto"`  
**Description:** Issue detection mode

**Values:**
- `auto` - Auto-detect from branch names
- `off` - Never add issue links

**Example:**
```yaml
issues:
  mode: "auto"
```

#### `issues.patterns`

**Type:** `string[]`  
**Default:** `["^(feat|fix|chore)/(\\d+)-"]`  
**Description:** Regex patterns for extracting issue numbers from branch names

**Pattern groups:**
- Group 1: Commit type (optional)
- Group 2: Issue number (required)

**Examples:**
```yaml
issues:
  patterns:
    - "^(feat|fix|chore)/(\\d+)-"           # feat/123-description
    - "^(feat|fix|chore)/([A-Z]+-\\d+)-"    # feat/PROJ-123-description
    - "^(\\d+)/"                             # 123/description
```

**Branch name matching:**
```bash
# Pattern: ^(feat|fix|chore)/(\\d+)-
feat/123-add-login     → Issue #123 ✓
fix/456-bug-fix        → Issue #456 ✓
feature/add-auth       → No match ✗

# Pattern: ^(feat|fix|chore)/([A-Z]+-\\d+)-
feat/PROJ-789-new-api  → Issue PROJ-789 ✓
fix/BUG-101-hotfix     → Issue BUG-101 ✓
```

#### `issues.link_template`

**Type:** `string`  
**Default:** `"Resolves #{number}"`  
**Description:** Template for issue link footer

**Variables:**
- `{number}` - Issue number
- `{type}` - Commit type

**Examples:**
```yaml
issues:
  link_template: "Resolves #{number}"
  # Output: Resolves #123

issues:
  link_template: "Closes #{number}"
  # Output: Closes #456

issues:
  link_template: "Ref: {number}"
  # Output: Ref: PROJ-789
```

---

### Redaction Configuration

Controls secret/sensitive data redaction before sending to AI.

#### `redaction.enabled`

**Type:** `boolean`  
**Default:** `true`  
**Description:** Enable automatic secret redaction

**Recommendation:** Keep enabled for security

**Example:**
```yaml
redaction:
  enabled: true
```

#### `redaction.patterns`

**Type:** `string[]`  
**Default:** See below  
**Description:** Additional regex patterns to redact

**Default patterns:**
- `api[_-]?key`
- `secret`
- `password`
- `token`
- `bearer`
- `authorization`
- And 10+ more...

**Custom patterns:**
```yaml
redaction:
  patterns:
    - "CUSTOM_SECRET"
    - "PRIVATE_KEY"
    - "DATABASE_URL"
```

**What gets redacted:**
```javascript
// Before redaction:
const API_KEY = "sk-abc123def456";
const password = "mySecretPass";

// After redaction:
const API_KEY = "[REDACTED]";
const password = "[REDACTED]";
```

---

## Environment Variables

### Required

#### `OPENAI_API_KEY`

**Description:** OpenAI API key (required for all AI operations)

**Example:**
```bash
export OPENAI_API_KEY="sk-proj-abc123..."
```

**Where to get it:** [OpenAI Platform - API Keys](https://platform.openai.com/api-keys)

---

### Optional

#### `AICMT_MODEL`

**Description:** Override default model

**Example:**
```bash
export AICMT_MODEL="openai/gpt-4o"
```

#### `NO_COLOR`

**Description:** Disable colored output

**Example:**
```bash
export NO_COLOR=1
```

#### `CI`

**Description:** Enable CI mode (JSON logging)

**Example:**
```bash
export CI=true
```

---

## Examples

### Example 1: Minimal Configuration

```yaml
# .aicmt.yaml
model:
  name: "gpt-4o-mini"
```

### Example 2: Team Standards

```yaml
# .aicmt.yaml - shared with team
style:
  conventional: true
  width: 72
  emoji: false
  tense: "present"

scope:
  infer: true
  map:
    "src/frontend/": "ui"
    "src/backend/": "api"
    "src/shared/": "shared"

issues:
  mode: "auto"
  patterns:
    - "^(feat|fix)/(JIRA-\\d+)-"
  link_template: "Closes {number}"
```

### Example 3: Personal Preferences

```yaml
# ~/.config/aicmt/config.yaml - just for you
model:
  name: "gpt-4o"  # I prefer GPT-4
  temperature: 0.1

style:
  emoji: true  # I like emojis!
  width: 100   # I prefer longer lines
```

### Example 4: Multi-Project Setup

```yaml
# ~/.config/aicmt/config.yaml - global defaults
model:
  name: "gpt-4o-mini"
  temperature: 0.2

style:
  emoji: true
```

```yaml
# project-a/.aicmt.yaml - override for work project
style:
  emoji: false  # Company policy: no emojis
  width: 80

issues:
  patterns:
    - "^(feat|fix)/([A-Z]+-\\d+)-"
  link_template: "JIRA: {number}"
```

```yaml
# project-b/.aicmt.yaml - override for personal project
issues:
  patterns:
    - "^(feat|fix)/(\\d+)-"
  link_template: "Closes #{number}"
```

### Example 5: Maximum Security

```yaml
# .aicmt.yaml
redaction:
  enabled: true
  patterns:
    - "api[_-]?key"
    - "secret"
    - "password"
    - "token"
    - "DATABASE_URL"
    - "REDIS_URL"
    - "AWS_.*"
    - "PRIVATE_KEY"
    - "CLIENT_SECRET"
```

---

## Validation

Configuration is validated on load. Common errors:

### Invalid Type

```yaml
style:
  width: "72"  # ❌ Should be number
```

**Error:**
```
✗ ConfigError: style.width must be a number
```

### Out of Range

```yaml
model:
  temperature: 3.0  # ❌ Should be 0.0-2.0
```

**Error:**
```
✗ ConfigError: model.temperature must be between 0.0 and 2.0
```

### Invalid Regex

```yaml
issues:
  patterns:
    - "^(unclosed"  # ❌ Invalid regex
```

**Error:**
```
✗ ConfigError: Invalid regex pattern in issues.patterns
```

---

## Best Practices

### 1. Keep Project Config Minimal

Only include team-shared settings in `.aicmt.yaml`:

✅ **Good:**
```yaml
scope:
  map:
    "src/api/": "api"
    "src/web/": "web"
```

❌ **Bad:**
```yaml
model:
  name: "gpt-4o"  # Personal preference, shouldn't be in project config
style:
  emoji: true     # Personal preference
```

### 2. Document Project Configuration

Add comments explaining project-specific settings:

```yaml
# Company standard: no emojis in commits
style:
  emoji: false

# JIRA integration pattern
issues:
  patterns:
    - "^(feat|fix)/([A-Z]+-\\d+)-"
```

### 3. Use Environment Variables for Secrets

❌ **Never:**
```yaml
# .aicmt.yaml
openai:
  apiKey: "sk-abc123..."  # ⚠️ NEVER commit API keys!
```

✅ **Always:**
```bash
# .env or shell profile
export OPENAI_API_KEY="sk-abc123..."
```

### 4. Version Control

```gitignore
# .gitignore
.aicmt.yaml.local  # Local overrides
```

```yaml
# .aicmt.yaml - committed
# Team settings

# .aicmt.yaml.local - not committed (gitignored)
# Your personal overrides for this project
```

---

## See Also

- [Command Reference](COMMANDS.md) - CLI flag options
- [Quick Start](QUICKSTART.md) - Getting started
- [Examples](EXAMPLES.md) - Real-world configurations
- [Troubleshooting](TROUBLESHOOTING.md) - Common configuration issues

---

**Last Updated:** November 11, 2025  
**Version:** 1.0.0
