# Command Reference

Complete reference for all `aicmt` commands and their options.

## Table of Contents

- [Global Options](#global-options)
- [aicmt commit](#aicmt-commit)
- [aicmt pr](#aicmt-pr)
- [aicmt compose](#aicmt-compose)
- [aicmt lint-commit](#aicmt-lint-commit)

---

## Global Options

These options work with all commands:

| Option      | Description              |
| ----------- | ------------------------ |
| `--help`    | Show command help        |
| `--version` | Show version information |

---

## aicmt commit

Generate a Conventional Commit message from staged changes or a diff range.

### Synopsis

```bash
aicmt commit [OPTIONS]
```

### Description

Analyzes git changes and generates a properly formatted Conventional Commit message using AI. The command can work with staged changes, specific commit ranges, or even individual files.

### Options

#### Source Selection

| Option            | Type    | Default | Description                                                     |
| ----------------- | ------- | ------- | --------------------------------------------------------------- |
| `--stage`         | boolean | `false` | Use staged changes (`git diff --staged`)                        |
| `--range <range>` | string  | -       | Use specific diff range (e.g., `HEAD~3..HEAD`, `main..feature`) |

**Note:** If neither `--stage` nor `--range` is specified, the command uses staged changes by default.

#### Commit Message Customization

| Option            | Type    | Default       | Description                                   |
| ----------------- | ------- | ------------- | --------------------------------------------- |
| `--type <type>`   | string  | auto-detected | Override commit type                          |
| `--scope <scope>` | string  | auto-detected | Set commit scope                              |
| `--breaking`      | boolean | `false`       | Mark as breaking change (adds `!` and footer) |
| `--issue <value>` | string  | `off`         | Link issue number (`auto`, `123`, or `off`)   |

**Valid commit types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Adding or updating tests
- `chore` - Maintenance tasks
- `build` - Build system changes
- `ci` - CI/CD changes
- `revert` - Revert a previous commit

#### Formatting Options

| Option        | Type    | Default | Description                            |
| ------------- | ------- | ------- | -------------------------------------- |
| `--emoji`     | boolean | `false` | Add emoji prefix (🚀 feat, 🐛 fix, etc.) |
| `--width <n>` | number  | `72`    | Wrap body text at n columns            |

#### Execution Control

| Option        | Type    | Default | Description                                       |
| ------------- | ------- | ------- | ------------------------------------------------- |
| `--dry-run`   | boolean | `false` | Show generated message without committing         |
| `--open`      | boolean | `false` | Open editor for review before committing (future) |
| `--no-verify` | boolean | `false` | Skip git pre-commit and commit-msg hooks          |

#### AI Configuration

| Option           | Type   | Default              | Description     |
| ---------------- | ------ | -------------------- | --------------- |
| `--model <name>` | string | `openai/gpt-4o-mini` | AI model to use |

**Available models:**
- `openai/gpt-4o` - Most capable, slower, more expensive
- `openai/gpt-4o-mini` - Default, balanced
- `openai/gpt-3.5-turbo` - Faster, cheaper

### Examples

#### Basic Usage

```bash
# Use staged changes (default)
git add .
aicmt commit

# Explicit staged mode
aicmt commit --stage
```

#### Using Diff Ranges

```bash
# Generate message for last commit
aicmt commit --range HEAD~1..HEAD

# Generate for specific branch range
aicmt commit --range main..feature-branch

# Generate for specific commits
aicmt commit --range abc123..def456
```

#### Customizing the Message

```bash
# Override type and scope
aicmt commit --type fix --scope auth

# Mark as breaking change
aicmt commit --breaking --type feat --scope api

# Add emoji
aicmt commit --emoji
```

#### Issue Linking

```bash
# Auto-detect from branch name (feat/123-login)
git checkout -b feat/123-add-login
aicmt commit --issue auto
# Output: "feat: add login\n\nResolves #123"

# Explicit issue number
aicmt commit --issue 456
# Output: "feat: ...\n\nResolves #456"

# Disable issue linking
aicmt commit --issue off
```

#### Preview and Review

```bash
# Preview without committing
aicmt commit --dry-run

# Use different model
aicmt commit --model openai/gpt-4o --dry-run
```

#### Advanced Examples

```bash
# Custom width for commit body
aicmt commit --width 100

# Skip git hooks
aicmt commit --no-verify

# Combine multiple options
aicmt commit --type feat --scope api --breaking --issue 123 --emoji
```

### Output Format

```
<type>[(<scope>)][!]: <subject>

[body]

[footer]
```

**Example:**
```
feat(auth): implement JWT authentication

- Add JWT token generation
- Add token validation middleware
- Update user login flow

Resolves #123
```

---

## aicmt pr

Generate a structured Pull Request description.

### Synopsis

```bash
aicmt pr [OPTIONS]
```

### Description

Creates a comprehensive PR description by analyzing changes between two branches. The generated description includes a summary, detailed change list, breaking changes, and testing notes.

### Options

#### Branch Selection

| Option            | Type   | Default | Description          |
| ----------------- | ------ | ------- | -------------------- |
| `--base <branch>` | string | `main`  | Base branch (target) |
| `--head <branch>` | string | current | Head branch (source) |

#### Output Options

| Option            | Type    | Default             | Description                     |
| ----------------- | ------- | ------------------- | ------------------------------- |
| `--output <file>` | string  | `PR-DESCRIPTION.md` | Output file path                |
| `--stdout`        | boolean | `false`             | Print to stdout instead of file |
| `--dry-run`       | boolean | `false`             | Preview without writing file    |

#### AI Configuration

| Option            | Type   | Default              | Description       |
| ----------------- | ------ | -------------------- | ----------------- |
| `--model <name>`  | string | `openai/gpt-4o-mini` | AI model to use   |
| `--issue <value>` | string | `auto`               | Link issue number |

### Examples

#### Basic Usage

```bash
# Generate PR from current branch to main
aicmt pr

# Specify branches explicitly
aicmt pr --base main --head feature/awesome
```

#### Output Control

```bash
# Write to custom file
aicmt pr --output docs/RELEASE_NOTES.md

# Print to stdout (for piping)
aicmt pr --stdout | pbcopy  # macOS
aicmt pr --stdout | xclip   # Linux

# Preview without writing
aicmt pr --dry-run
```

#### Advanced Examples

```bash
# Use GPT-4 for higher quality
aicmt pr --model openai/gpt-4o

# Link specific issue
aicmt pr --issue 789

# Combine options
aicmt pr --base develop --head feature/new-api --output CHANGELOG.md
```

### Output Format

````markdown
# [Feature Title]

## Summary
High-level overview of the changes...

## Changes
- Detailed change 1
- Detailed change 2
- Detailed change 3

## Breaking Changes
Description of any breaking changes...

## Migration Guide
Steps to migrate to the new version...

## Testing
- Unit tests added
- Integration tests updated
- Manual testing performed

## Related Issues
Closes #123
````

---

## aicmt compose

One-shot workflow for generating both commit and PR description.

### Synopsis

```bash
aicmt compose [OPTIONS]
```

### Description

Orchestrates the complete workflow: generates a commit message, creates the commit, and optionally generates a PR description. This is more efficient than running separate commands as it reuses the context analysis.

### Options

#### Workflow Control

| Option      | Type    | Default | Description                  |
| ----------- | ------- | ------- | ---------------------------- |
| `--pr`      | boolean | `false` | Also generate PR description |
| `--dry-run` | boolean | `false` | Preview without executing    |

#### Commit Options

All options from `aicmt commit` are supported:
- `--stage`, `--range`
- `--type`, `--scope`, `--breaking`
- `--issue`, `--emoji`, `--width`
- `--no-verify`

#### PR Options

| Option            | Type   | Default             | Description    |
| ----------------- | ------ | ------------------- | -------------- |
| `--output <file>` | string | `PR-DESCRIPTION.md` | PR output file |

#### AI Configuration

| Option           | Type   | Default              | Description     |
| ---------------- | ------ | -------------------- | --------------- |
| `--model <name>` | string | `openai/gpt-4o-mini` | AI model to use |

### Examples

#### Basic Usage

```bash
# Generate and create commit only
git add .
aicmt compose

# Generate commit + PR description
aicmt compose --pr
```

#### Advanced Examples

```bash
# Complete workflow with custom options
aicmt compose --pr --type feat --scope api --issue 123

# Use specific range
aicmt compose --range HEAD~5..HEAD --pr --output RELEASE.md

# Preview the entire workflow
aicmt compose --pr --dry-run

# Custom PR output location
aicmt compose --pr --output .github/pull_request_template.md
```

### Workflow Steps

1. **Analyze changes** (staged or range)
2. **Build context** (files, scope, type detection)
3. **Detect issues** (from branch name if `--issue auto`)
4. **Generate commit message** via AI
5. **Create commit** (unless `--dry-run`)
6. **Generate PR description** (if `--pr` flag)
7. **Write PR file** (if `--pr` flag)

---

## aicmt lint-commit

Validate commit messages against Conventional Commit standards.

### Synopsis

```bash
aicmt lint-commit <file> [OPTIONS]
```

### Description

Validates commit message files for use in git hooks (commit-msg). Checks format, length limits, imperative mood, and breaking change footers. Useful for enforcing commit message standards in teams.

### Arguments

| Argument | Required | Description                                                 |
| -------- | -------- | ----------------------------------------------------------- |
| `<file>` | Yes      | Path to commit message file (usually `.git/COMMIT_EDITMSG`) |

### Options

| Option             | Type    | Default | Description                 |
| ------------------ | ------- | ------- | --------------------------- |
| `--strict`         | boolean | `false` | Treat warnings as errors    |
| `--max-length <n>` | number  | `72`    | Maximum subject line length |
| `--allow-emoji`    | boolean | `false` | Allow emoji prefixes        |

### Validation Rules

#### Errors (Always Fail)

- ❌ Empty subject line
- ❌ Subject ending with period
- ❌ Subject exceeds max length
- ❌ Invalid Conventional Commit format
- ❌ Invalid commit type
- ❌ Missing description after `:`
- ❌ Body not separated by blank line
- ❌ Empty `BREAKING CHANGE:` footer

#### Warnings (Fail in Strict Mode)

- ⚠️ Subject starting with uppercase
- ⚠️ Non-imperative mood (added, fixing, etc.)
- ⚠️ Invalid scope format
- ⚠️ Breaking marker `!` without footer
- ⚠️ Body line exceeds 100 characters

### Examples

#### Basic Usage

```bash
# Validate a commit message file
aicmt lint-commit .git/COMMIT_EDITMSG

# Validate with strict mode
aicmt lint-commit message.txt --strict

# Custom max length
aicmt lint-commit message.txt --max-length=100

# Allow emojis
aicmt lint-commit message.txt --allow-emoji
```

#### Git Hook Integration

Create `.git/hooks/commit-msg`:

```bash
#!/bin/bash
aicmt lint-commit "$1" || exit 1
```

Make it executable:

```bash
chmod +x .git/hooks/commit-msg
```

Or use with Husky:

```json
{
  "husky": {
    "hooks": {
      "commit-msg": "aicmt lint-commit $1"
    }
  }
}
```

### Example Messages

#### ✅ Valid Messages

```
feat: add user authentication

feat(auth): implement JWT tokens

fix!: correct data validation

BREAKING CHANGE: API endpoint changed
```

#### ❌ Invalid Messages

```
Added new feature          # Not conventional format
feat: Add feature.         # Ends with period
feat:                      # No description
feat: this is a very long subject line that exceeds the maximum allowed length  # Too long
```

---

## Exit Codes

All commands follow standard exit code conventions:

| Code  | Meaning              |
| ----- | -------------------- |
| `0`   | Success              |
| `1`   | Generic error        |
| `2`   | Invalid arguments    |
| `128` | Git error            |
| `130` | Interrupted (Ctrl+C) |

---

## Environment Variables

| Variable         | Description                         | Default              |
| ---------------- | ----------------------------------- | -------------------- |
| `OPENAI_API_KEY` | OpenAI API key (required)           | -                    |
| `AICMT_MODEL`    | Default model to use                | `openai/gpt-4o-mini` |
| `NO_COLOR`       | Disable colored output              | `false`              |
| `CI`             | Enable CI mode (JSON logging)       | `false`              |
| `GITHUB_ACTIONS` | Detected GitHub Actions environment | `false`              |

---

## Configuration File

Commands can be configured via `.aicmt.yaml` in the project root or `~/.config/aicmt/config.yaml`.

See [Configuration Reference](CONFIGURATION.md) for details.

---

## See Also

- [Quick Start Guide](QUICKSTART.md) - Get started quickly
- [Configuration Reference](CONFIGURATION.md) - Configuration options
- [Examples](EXAMPLES.md) - Real-world usage examples
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues and solutions

---

**Last Updated:** November 11, 2025  
**Version:** 1.0.0
