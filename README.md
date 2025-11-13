<div align="center">

# 🚀 aicmt

### AI-Powered Conventional Commits & PR Descriptions

**Transform git diffs into production-ready commit messages and PR descriptions using OpenAI.**

[![Tests](https://img.shields.io/badge/tests-380%20passing-success)](tests/)
[![Coverage](https://img.shields.io/badge/coverage-81.3%25-success)](#test-coverage)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](package.json)

[Quick Start](#-quick-start) • [Features](#-features) • [Documentation](#-documentation) • [Examples](#-examples)

</div>

---

## ✨ Features

**Smart Commit Generation**
- 🎯 **Conventional Commits** — Auto-detects type (`feat`, `fix`, `docs`, etc.) from diff content
- 🔍 **Context-Aware** — Analyzes file changes to infer scope and generate detailed descriptions
- 🔗 **Issue Linking** — Auto-detects issues from branch names or manual override
- ✅ **Validation** — Built-in linting ensures Conventional Commit compliance

**PR Description Magic**
- 📝 **Structured Templates** — Generates comprehensive PR descriptions with summaries, breaking changes, and migration notes
- 🎨 **Customizable** — Use your own templates or leverage intelligent defaults
- 📊 **Change Analysis** — Automatically categorizes and describes modifications

**Developer Experience**
- 🛡️ **Safe by Default** — Dry-run mode and editor preview before committing
- ⚙️ **Highly Configurable** — Project and user-level settings with `.aicmt.yaml`
- 🚫 **Privacy-First** — Redacts secrets, supports `.aicmtignore` for sensitive files
- ⚡ **Fast** — Minimal API calls with smart context compression

---

## 📦 Quick Start

### Installation

```bash
# Clone and install
git clone https://github.com/AbdulKhaliqAbdulAzeez/Repo-Aware-Commit-Composer.git
cd Repo-Aware-Commit-Composer
npm install && npm run build && npm link

# Set your OpenAI API key
export OPENAI_API_KEY="sk-..."
```

### Basic Usage

```bash
# Stage your changes
git add .

# Generate and create commit
aicmt commit --stage

# Preview before committing
aicmt commit --stage --dry-run

# Generate PR description
aicmt pr --base main --head feature-branch
```

**That's it!** 🎉 See [Quick Start Guide](docs/QUICKSTART.md) for more examples.

---

## 💡 Why aicmt?

<table>
<tr>
<td width="50%">

### Before 😓
```bash
git add .
# ... thinking what to write ...
git commit -m "fix stuff"
```

</td>
<td width="50%">

### After ✨
```bash
git add .
aicmt commit --stage
```

```
fix(api): resolve race condition in user authentication

- Add mutex lock for concurrent login attempts
- Prevent duplicate session creation
- Update error handling for token refresh

Fixes #247
```

</td>
</tr>
</table>

---

## 🎯 Core Commands

### `aicmt commit` — Generate Commit Messages

```bash
# Basic usage
aicmt commit --stage

# With customization
aicmt commit --stage --type feat --scope auth --emoji

# Use diff range instead of staged changes
aicmt commit --range origin/main...HEAD

# Auto-detect issue from branch name
aicmt commit --stage --issue auto
```

### `aicmt pr` — Generate PR Descriptions

```bash
# Compare branches
aicmt pr --base main --head feature/user-auth

# Save to file
aicmt pr --base main --head feature/user-auth --out PULL_REQUEST.md

# Use custom template
aicmt pr --base main --head feature/user-auth --template .github/pr-template.md
```

### `aicmt compose` — All-in-One Workflow

```bash
# Generate commit + PR description in one go
aicmt compose --stage --pr --base main --issue auto
```

### `aicmt lint-commit` — Validate Messages

```bash
# Lint a commit message
echo "feat: add feature" | aicmt lint-commit -

# Use in git hook
aicmt lint-commit .git/COMMIT_EDITMSG
```

---

## 📚 Documentation

| Guide                                        | Description                      |
| -------------------------------------------- | -------------------------------- |
| [📥 Installation](docs/INSTALLATION.md)       | Complete setup and configuration |
| [⚡ Quick Start](docs/QUICKSTART.md)          | 5-minute tutorial with examples  |
| [📖 Commands](docs/COMMANDS.md)               | Detailed command reference       |
| [⚙️ Configuration](docs/CONFIGURATION.md)     | All configuration options        |
| [🔧 Troubleshooting](docs/TROUBLESHOOTING.md) | Common issues and fixes          |
| [👨‍💻 Developer Guide](docs/DEVELOPER_GUIDE.md) | Architecture and contributing    |
| [💼 Examples](docs/EXAMPLES.md)               | Real-world usage patterns        |

---

## 🎨 Examples

### Auto-Detect Everything

```bash
# Branch: feat/123-add-user-login
git add src/auth/
aicmt commit --stage --issue auto --emoji
```

**Generated:**
```
🚀 feat(auth): implement user login flow

- Add JWT-based authentication
- Create login/logout endpoints
- Implement session management

Closes #123
```

### Complex PR with Breaking Changes

```bash
aicmt pr --base main --head refactor/database-schema
```

**Generated:**
```markdown
## Summary

Refactor database schema to support multi-tenancy

## Changes

- Add `tenant_id` column to all user-related tables
- Create tenant management service
- Update all queries to include tenant scoping

## Breaking Changes

⚠️ **Database migration required**

All existing installations must run migration before deploying.

## Migration Steps

1. Backup database: `pg_dump > backup.sql`
2. Run migration: `npm run migrate:latest`
3. Verify data integrity: `npm run verify:tenants`

## Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing in staging environment
```

---

## 🔧 Configuration

### Project Configuration (`.aicmt.yaml`)

```yaml
model:
  provider: openai
  name: gpt-4o-mini
  temperature: 0.2
  max_tokens: 512

style:
  conventional: true
  emoji: false
  width: 72

scope:
  infer: true
  map:
    "src/web": "web"
    "src/api": "api"
    "infra": "infra"

issues:
  mode: auto
  patterns:
    - "(?<key>[A-Z]+-\\d+)"  # Jira: PROJ-123
    - "#(?<key>\\d+)"         # GitHub: #123
  link_template: "https://github.com/org/repo/issues/{{key}}"
```

### Environment Variables

```bash
export OPENAI_API_KEY="sk-..."           # Required
export AICMT_MODEL="openai/gpt-4o-mini"  # Optional override
```

See [Configuration Guide](docs/CONFIGURATION.md) for all options.

---

## 🔐 Privacy & Security

- **Secret Redaction** — Automatically masks API keys, tokens, and credentials
- **Selective Context** — Only sends summarized diff info, not full file contents
- **`.aicmtignore`** — Exclude sensitive files from AI analysis
- **No Data Retention** — Uses OpenAI API without storing conversation history

---

## 📊 Test Coverage

| Module    | Coverage | Status |
| --------- | -------- | ------ |
| Overall   | 81.3%    | ✅      |
| Commands  | 51.1%    | 🟡      |
| Core      | 96.0%    | ✅      |
| Providers | 100%     | ✅      |
| Utils     | 71.2%    | 🟡      |

**380 tests passing** across 17 test suites

**380 tests passing** across 17 test suites

See detailed reports: [Phase 4](docs/PHASE4_COMPLETION.md) · [Phase 5](docs/PHASE5_PROGRESS.md) · [Phase 6](docs/PHASE6_COMPLETION.md)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLI Commands Layer                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  commit  │  │    pr    │  │ compose  │  │   lint   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼─────────────┼─────────────┼─────────────┼──────────┘
        │             │             │             │
┌───────┴─────────────┴─────────────┴─────────────┴──────────┐
│                      Core Services                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ GitService   │  │ ContextBuilder│  │PromptBuilder│     │
│  │ - getDiff()  │  │ - analyze()   │  │ - build()    │     │
│  │ - getFiles() │  │ - inferScope()│  │ - format()   │     │
│  └──────┬───────┘  └──────┬────────┘  └──────┬───────┘     │
│         │                 │                   │              │
│  ┌──────┴─────────┐  ┌───┴────────┐  ┌──────┴───────┐     │
│  │ IssueLinker    │  │ModelFactory│  │ConfigService │     │
│  └────────────────┘  └────┬───────┘  └──────────────┘     │
└──────────────────────────┼──────────────────────────────────┘
                           │
                  ┌────────┴────────┐
                  │  Model Provider │
                  │   (OpenAI API)  │
                  └─────────────────┘
```

### Key Components

- **GitService** — Git operations (diff, files, commits)
- **ContextBuilder** — Analyzes changes and infers metadata
- **PromptBuilder** — Constructs AI prompts from context
- **ModelFactory** — Creates and manages AI provider instances
- **IssueLinker** — Extracts and formats issue references
- **ConfigService** — Manages configuration hierarchy

---

## 🛠️ Development

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- Git ≥ 2.30

### Setup

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Run with coverage
npm test -- --coverage

# Development mode (watch)
npm run dev

# Lint code
npm run lint

# Format code
npm run format
```

### Project Structure

```
src/
├── commands/           # CLI command implementations
│   ├── commit.ts       # Commit generation
│   ├── pr.ts          # PR description generation
│   ├── compose.ts     # Combined workflow
│   └── lint-commit.ts # Message validation
├── core/              # Core business logic
│   ├── git.ts         # Git operations
│   ├── context.ts     # Change analysis
│   ├── prompt.ts      # Prompt engineering
│   ├── model-factory.ts
│   ├── issue-linker.ts
│   ├── config.ts
│   └── redact.ts
├── providers/         # AI provider adapters
│   └── openai.ts
└── utils/            # Shared utilities
    ├── logger.ts
    ├── shell.ts
    ├── errors.ts
    └── wrap.ts

tests/                # Test suites (Jest)
docs/                 # Documentation
templates/            # Default templates
```

---

## 🤝 Contributing

Contributions are welcome! Please check out our [Developer Guide](docs/DEVELOPER_GUIDE.md) for:

- Architecture overview
- Coding standards
- Testing requirements
- PR submission process

### Quick Contribution Guide

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/amazing-feature`
3. Make your changes with tests
4. Ensure all tests pass: `npm test`
5. Commit using conventional commits
6. Push and create a Pull Request

---

## 🗺️ Roadmap

### v1.1 (Planned)
- [ ] Historical learning from repository commit patterns
- [ ] Multi-commit planning for large diffs
- [ ] Custom AI provider support (Anthropic, local models)
- [ ] Interactive mode with change selection

### v1.2 (Future)
- [ ] GitHub/GitLab API integration for direct PR creation
- [ ] Team presets and shared conventions
- [ ] Tree-sitter integration for better code analysis
- [ ] Internationalization (i18n) support

### Community Requested
- [ ] VS Code extension
- [ ] Git GUI integrations
- [ ] Commit message templates from history
- [ ] Automated changelog generation

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

Built with:
- [oclif](https://oclif.io/) — CLI framework
- [OpenAI API](https://openai.com/) — AI completions
- [TypeScript](https://www.typescriptlang.org/) — Type safety
- [Jest](https://jestjs.io/) — Testing framework

---

## 📞 Support

- 📖 [Documentation](docs/)
- 🐛 [Report Issues](https://github.com/AbdulKhaliqAbdulAzeez/Repo-Aware-Commit-Composer/issues)
- 💬 [Discussions](https://github.com/AbdulKhaliqAbdulAzeez/Repo-Aware-Commit-Composer/discussions)

---

<div align="center">

**Made with ❤️ by developers, for developers**

[⬆ Back to Top](#-aicmt)

</div>

---

## Contributing

Contributions are welcome! Please ensure all tests pass and code adheres to linting standards before submitting PRs.

For changes to model behavior, modify `/src/providers/openai.ts` and associated prompt templates.

---

## Support

- **Issues & Discussions:** [GitHub Repository](https://github.com/AbdulKhaliqAbdulAzeez/Repo-Aware-Commit-Composer)
- **Enterprise Support:** maintainers@yourdomain.com
