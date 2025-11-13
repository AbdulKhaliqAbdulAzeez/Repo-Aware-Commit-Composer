# Developer Guide

Technical documentation for contributing to `aicmt`.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Core Components](#core-components)
- [Development Setup](#development-setup)
- [Testing](#testing)
- [Contributing](#contributing)
- [Release Process](#release-process)

---

## Architecture Overview

### Design Philosophy

`aicmt` follows these principles:

1. **Separation of Concerns**: Each module has a single responsibility
2. **Dependency Injection**: Loose coupling via interfaces
3. **Fail-Fast**: Validate inputs early, provide clear errors
4. **Testability**: Pure functions, mockable dependencies
5. **Type Safety**: Strict TypeScript, comprehensive types

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI Layer                             │
│  (CommitCommand, PRCommand, ComposeCommand, LintCommand)     │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                     Service Layer                            │
│  (CommitService, PRService, ComposeService, LintService)     │
└────┬────────────┬──────────────┬───────────────────┬────────┘
     │            │              │                   │
     ▼            ▼              ▼                   ▼
┌─────────┐  ┌──────────┐  ┌──────────┐      ┌───────────┐
│   Git   │  │ Context  │  │    AI    │      │  Config   │
│ Service │  │ Builder  │  │ Provider │      │  Manager  │
└─────────┘  └──────────┘  └──────────┘      └───────────┘
     │            │              │                   │
     ▼            ▼              ▼                   ▼
┌─────────┐  ┌──────────┐  ┌──────────┐      ┌───────────┐
│ Git CLI │  │  Issue   │  │  Prompt  │      │   YAML    │
│         │  │ Linker   │  │ Builder  │      │   Files   │
│ (shell) │  │          │  │          │      │           │
└─────────┘  └──────────┘  └──────────┘      └───────────┘
     │            │              │                   │
     ▼            ▼              ▼                   ▼
┌─────────┐  ┌──────────┐  ┌──────────┐      ┌───────────┐
│         │  │ Redaction│  │ OpenAI   │      │ Defaults  │
│  .git/  │  │ Service  │  │   API    │      │           │
│         │  │          │  │          │      │           │
└─────────┘  └──────────┘  └──────────┘      └───────────┘
```

### Data Flow

**Commit Generation Flow:**

```
User Command
    │
    ▼
Parse CLI Args ─────────────┐
    │                       │
    ▼                       ▼
Load Config         Validate Inputs
    │                       │
    ▼                       │
Fetch Git Diff ◄────────────┘
    │
    ▼
Build Context
    │
    ├─► Extract Files
    ├─► Parse Issues
    └─► Redact Secrets
    │
    ▼
Build Prompt
    │
    ├─► Format Diff
    ├─► Add Metadata
    └─► Apply Style Rules
    │
    ▼
Call AI Provider
    │
    ▼
Parse Response
    │
    ├─► Extract Type
    ├─► Extract Scope
    └─► Extract Body
    │
    ▼
Format Message
    │
    └─► Apply Width
        Apply Emoji
        Apply Tense
    │
    ▼
Output or Commit
```

---

## Project Structure

```
Repo-Aware-Commit-Composer/
│
├── src/
│   ├── commands/          # CLI command implementations
│   │   ├── commit.ts      # aicmt commit
│   │   ├── pr.ts          # aicmt pr
│   │   ├── compose.ts     # aicmt compose
│   │   └── lint-commit.ts # aicmt lint-commit
│   │
│   ├── services/          # Business logic layer
│   │   ├── commit.ts      # Commit generation service
│   │   ├── pr.ts          # PR message service
│   │   ├── compose.ts     # Combined commit + PR service
│   │   └── lint.ts        # Commit message validation
│   │
│   ├── core/              # Core domain logic
│   │   ├── git.ts         # Git operations wrapper
│   │   ├── config.ts      # Configuration management
│   │   ├── context.ts     # Context builder
│   │   ├── issues.ts      # Issue linking
│   │   ├── redaction.ts   # Secret redaction
│   │   ├── prompt.ts      # AI prompt builder
│   │   └── models.ts      # AI provider factory
│   │
│   ├── ai/                # AI integration
│   │   ├── provider.ts    # Base provider interface
│   │   ├── openai.ts      # OpenAI implementation
│   │   └── types.ts       # AI-related types
│   │
│   ├── utils/             # Shared utilities
│   │   ├── errors.ts      # Error classes
│   │   ├── logger.ts      # Logging utility
│   │   ├── shell.ts       # Shell command execution
│   │   ├── wrap.ts        # Text wrapping
│   │   └── validators.ts  # Input validation
│   │
│   └── types/             # TypeScript definitions
│       ├── config.ts      # Configuration types
│       ├── git.ts         # Git-related types
│       └── commit.ts      # Commit message types
│
├── tests/                 # Test suite
│   ├── core/              # Core module tests
│   ├── services/          # Service tests
│   ├── commands/          # Command tests
│   ├── ai/                # AI provider tests
│   └── utils/             # Utility tests
│
├── docs/                  # Documentation
│   ├── INSTALLATION.md
│   ├── QUICKSTART.md
│   ├── COMMANDS.md
│   ├── CONFIGURATION.md
│   ├── TROUBLESHOOTING.md
│   └── DEVELOPER_GUIDE.md (this file)
│
├── .github/               # GitHub configuration
│   └── workflows/         # CI/CD workflows
│
└── package.json           # Project metadata
```

---

## Core Components

### 1. Git Service (`src/core/git.ts`)

**Purpose:** Wrapper around git CLI operations.

**Key Methods:**
- `getStagedDiff()` - Get diff of staged changes
- `getDiffRange(range)` - Get diff between commits
- `getCurrentBranch()` - Get current branch name
- `commit(message, flags)` - Create git commit
- `getRecentCommits(n)` - Get last N commits

**Design:**
- Uses `shell.exec()` for git commands
- Returns structured data (not raw strings)
- Validates git repository state
- Handles detached HEAD, merge conflicts

**Testing Strategy:**
- Mock `shell.exec()` responses
- Test error handling (not a repo, no changes)
- Verify command construction

---

### 2. Config Manager (`src/core/config.ts`)

**Purpose:** Load and merge configuration from multiple sources.

**Configuration Precedence:**
1. CLI flags (highest)
2. Environment variables
3. User config (`~/.config/aicmt/config.yaml`)
4. Project config (`.aicmt.yaml`)
5. Defaults (lowest)

**Key Methods:**
- `loadConfig()` - Load and merge all sources
- `validateConfig(config)` - Validate schema
- `getDefaultConfig()` - Get default values

**Design:**
- Immutable config object
- Type-safe with Zod schemas
- Clear error messages for invalid config

**Testing Strategy:**
- Test each config source independently
- Test precedence order
- Test validation rules

---

### 3. Context Builder (`src/core/context.ts`)

**Purpose:** Build rich context from git diff for AI analysis.

**Context Includes:**
- File changes (added, modified, deleted)
- Line statistics (additions, deletions)
- File types and extensions
- Directory structure

**Key Methods:**
- `buildContext(diff)` - Parse diff, extract metadata
- `extractFiles(diff)` - Get list of changed files
- `categorizeChanges()` - Group by change type

**Design:**
- Pure functions (no side effects)
- Structured output for prompt builder
- Handles binary files, renames, mode changes

**Testing Strategy:**
- Test with various diff formats
- Edge cases: empty diff, binary files, large diffs

---

### 4. Issue Linker (`src/core/issues.ts`)

**Purpose:** Extract issue references from branch names and commits.

**Supported Patterns:**
- `JIRA-123` - Uppercase issue keys
- `#456` - GitHub issue numbers
- `feature/ABC-789` - Issues in branch names
- Custom patterns via config

**Key Methods:**
- `extractIssues(branch, commits)` - Find all issue refs
- `formatIssueLinks(issues)` - Generate links
- `parseIssuePattern(pattern)` - Parse regex patterns

**Design:**
- Configurable patterns
- Multiple issue tracker support
- Link template customization

**Testing Strategy:**
- Test each pattern individually
- Test branch name parsing
- Test link generation

---

### 5. Redaction Service (`src/core/redaction.ts`)

**Purpose:** Remove sensitive data before sending to AI.

**Redacted Patterns:**
- API keys (`sk-`, `apikey=`)
- Tokens (`Bearer `, `token:`)
- Passwords (`password=`, `pwd:`)
- Private keys (`BEGIN PRIVATE KEY`)
- Email addresses (optional)
- Custom patterns via config

**Key Methods:**
- `redact(text)` - Apply all redaction patterns
- `addPattern(pattern)` - Register custom pattern
- `shouldRedact()` - Check if redaction enabled

**Design:**
- Configurable patterns
- Preserves diff structure
- Logs redaction count (not content)

**Testing Strategy:**
- Test each pattern
- Verify structure preservation
- Test performance with large diffs

---

### 6. Prompt Builder (`src/core/prompt.ts`)

**Purpose:** Construct optimized prompts for AI models.

**Prompt Structure:**
```
System: You are a commit message generator...

User:
Repository Context:
- Files changed: 3 (2 modified, 1 added)
- Lines: +45, -12
- Types: TypeScript (2), Markdown (1)

Git Diff:
---
[formatted diff]
---

Requirements:
- Type: [auto-detect or override]
- Scope: [auto-infer or override]
- Style: Conventional Commits
- Width: 72 characters
- Issues: JIRA-123

Generate a commit message.
```

**Key Methods:**
- `buildPrompt(context, config)` - Create complete prompt
- `formatDiff(diff)` - Format diff for AI
- `addConstraints(config)` - Add style rules

**Design:**
- Token-efficient (costs money!)
- Structured format
- Clear instructions
- Examples for better results

**Testing Strategy:**
- Test prompt structure
- Verify token counts
- Test with various configs

---

### 7. AI Provider (`src/ai/openai.ts`)

**Purpose:** Interface to AI models (currently OpenAI only).

**Supported Models:**
- GPT-4 (`gpt-4`)
- GPT-4 Turbo (`gpt-4-turbo`)
- GPT-4o (`gpt-4o`, `gpt-4o-mini`)
- GPT-3.5 Turbo (`gpt-3.5-turbo`)

**Key Methods:**
- `generate(prompt, options)` - Call AI API
- `parseResponse(response)` - Extract commit parts
- `validateResponse(response)` - Check format

**Design:**
- Retry logic for transient errors
- Rate limit handling
- Token usage tracking
- Error classification (auth, quota, network)

**Testing Strategy:**
- Mock API responses
- Test error handling
- Test rate limit retry
- Verify request format

---

### 8. Commit Service (`src/services/commit.ts`)

**Purpose:** Orchestrate entire commit generation flow.

**Workflow:**
1. Load configuration
2. Get git diff
3. Build context
4. Extract issues
5. Redact secrets
6. Build prompt
7. Call AI
8. Parse response
9. Format message
10. Commit or output

**Key Methods:**
- `generateCommit(options)` - Main entry point
- `executeStagedCommit()` - From staged changes
- `executeRangeCommit(range)` - From commit range

**Design:**
- Service layer pattern
- Dependency injection
- Clear error propagation
- Logging at each step

**Testing Strategy:**
- Integration tests with mocked dependencies
- Test each workflow path
- Test error scenarios

---

### 9. Lint Service (`src/services/lint.ts`)

**Purpose:** Validate commit messages against Conventional Commits.

**Validation Rules:**
- Format: `type(scope): description`
- Valid types: feat, fix, docs, style, refactor, test, chore
- Max line lengths: header 72, body 100
- Blank line after header
- Imperative mood

**Key Methods:**
- `lintMessage(message)` - Validate message
- `parseMessage(message)` - Extract components
- `validateFormat()` - Check structure
- `validateType()` - Check type is valid

**Design:**
- Rule-based validation
- Detailed error messages
- Configurable rules (future)

**Testing Strategy:**
- Test each validation rule
- Test valid messages
- Test edge cases

---

## Development Setup

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **Git** >= 2.30.0

### Initial Setup

```bash
# Clone repository
git clone https://github.com/AbdulKhaliqAbdulAzeez/Repo-Aware-Commit-Composer.git
cd Repo-Aware-Commit-Composer

# Install dependencies
npm install

# Build project
npm run build

# Link for local testing
npm link

# Set API key (for testing)
export OPENAI_API_KEY="sk-your-test-key"
```

### Development Workflow

```bash
# Start TypeScript watch mode
npm run watch

# In another terminal, test changes
aicmt commit --dry-run

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Check coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format
```

### Project Scripts

```json
{
  "build": "tsc -p tsconfig.json",
  "watch": "tsc -p tsconfig.json --watch",
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage",
  "lint": "eslint src/ tests/",
  "lint:fix": "eslint src/ tests/ --fix",
  "format": "prettier --write 'src/**/*.ts' 'tests/**/*.ts'",
  "clean": "rm -rf dist/"
}
```

### Environment Variables

**Development:**
```bash
export OPENAI_API_KEY="sk-test-key"
export LOG_LEVEL="debug"
export NODE_ENV="development"
```

**Testing:**
```bash
export NODE_ENV="test"
export OPENAI_API_KEY="sk-mock-key"
```

---

## Testing

### Test Structure

```
tests/
├── core/
│   ├── git.test.ts           # Git service tests
│   ├── config.test.ts        # Config manager tests
│   ├── context.test.ts       # Context builder tests
│   ├── issues.test.ts        # Issue linker tests
│   ├── redaction.test.ts     # Redaction service tests
│   ├── prompt.test.ts        # Prompt builder tests
│   └── models.test.ts        # Model factory tests
│
├── services/
│   ├── commit.test.ts        # Commit service tests
│   ├── pr.test.ts            # PR service tests
│   ├── compose.test.ts       # Compose service tests
│   └── lint.test.ts          # Lint service tests
│
├── ai/
│   └── openai.test.ts        # OpenAI provider tests
│
├── utils/
│   ├── errors.test.ts        # Error utilities tests
│   ├── logger.test.ts        # Logger tests
│   ├── shell.test.ts         # Shell executor tests
│   ├── wrap.test.ts          # Text wrapping tests
│   └── validators.test.ts    # Validation tests
│
└── commands/
    └── lint-commit.test.ts   # Lint command tests
```

### Testing Philosophy

**Unit Tests:**
- Test individual functions/methods
- Mock external dependencies
- Fast execution
- High coverage (>80%)

**Integration Tests:**
- Test service layer interactions
- Mock only external APIs
- Verify data flow
- Realistic scenarios

**E2E Tests (Future):**
- Test full CLI workflow
- Real git repositories
- Actual API calls (with test keys)

### Writing Tests

**Good Test Structure:**

```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should handle normal case', () => {
      // Arrange
      const input = 'test';
      const expected = 'result';
      
      // Act
      const actual = method(input);
      
      // Assert
      expect(actual).toBe(expected);
    });
    
    it('should throw on invalid input', () => {
      expect(() => method('')).toThrow(ValidationError);
    });
    
    it('should handle edge case', () => {
      // Test boundary conditions
    });
  });
});
```

**Mocking Dependencies:**

```typescript
// Mock git service
jest.mock('../core/git');
const mockGit = git as jest.Mocked<typeof git>;

// Setup mock return value
mockGit.getStagedDiff.mockResolvedValue(mockDiff);

// Verify mock was called
expect(mockGit.getStagedDiff).toHaveBeenCalledWith();
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific file
npm test -- git.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should handle"

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Coverage Goals

- **Overall:** > 70%
- **Core modules:** > 80%
- **Services:** > 75%
- **Utilities:** > 90%
- **Critical paths:** 100%

### Test Data

**Mock Diffs:**
```typescript
const MOCK_DIFF = `
diff --git a/src/index.ts b/src/index.ts
index abc123..def456 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,4 @@
+import { feature } from './feature';
 export function main() {
-  console.log('old');
+  console.log('new');
 }
`;
```

---

## Contributing

### Getting Started

1. **Fork the repository**
2. **Create a feature branch:**
   ```bash
   git checkout -b feature/my-feature
   ```
3. **Make your changes**
4. **Write tests**
5. **Run tests and linting:**
   ```bash
   npm test
   npm run lint
   ```
6. **Commit with aicmt:**
   ```bash
   git add .
   aicmt commit
   ```
7. **Push and create PR:**
   ```bash
   git push origin feature/my-feature
   ```

### Code Style

**TypeScript:**
- Strict mode enabled
- Explicit return types
- No `any` types
- Prefer `const` over `let`
- Use interfaces for objects
- Use enums for constants

**Formatting:**
- 2 spaces indentation
- Single quotes
- Semicolons required
- Max line length: 100
- Trailing commas

**Naming:**
- `camelCase` for variables/functions
- `PascalCase` for classes/interfaces
- `UPPER_SNAKE_CASE` for constants
- Descriptive names (no abbreviations)

**Example:**

```typescript
// ✅ Good
interface UserConfig {
  readonly apiKey: string;
  readonly model: ModelName;
}

export function generateCommitMessage(
  diff: string,
  config: UserConfig
): Promise<CommitMessage> {
  // Implementation
}

// ❌ Bad
interface Config {
  ak: string;  // Unclear abbreviation
  mdl: any;    // Using 'any'
}

export function gen(d, c) {  // Unclear names, no types
  // Implementation
}
```

### Commit Messages

Use aicmt to generate your commits!

```bash
git add .
aicmt commit
```

Or manually follow Conventional Commits:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting)
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

### Pull Request Guidelines

**PR Title:**
```
type(scope): brief description
```

**PR Description Template:**
```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings
```

### Review Process

1. **Automated Checks:**
   - Tests must pass
   - Linting must pass
   - Coverage must not decrease

2. **Code Review:**
   - At least one approval required
   - Address all feedback
   - Keep discussions respectful

3. **Merge:**
   - Squash and merge (single commit)
   - Delete branch after merge

---

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR:** Breaking changes
- **MINOR:** New features (backwards compatible)
- **PATCH:** Bug fixes

### Release Workflow

**1. Prepare Release**

```bash
# Update version
npm version patch  # or minor, major

# Update CHANGELOG.md
# - Add release notes
# - Document breaking changes
# - List new features/fixes

# Commit changes
git add .
git commit -m "chore: prepare release v1.2.3"
```

**2. Create Release**

```bash
# Tag release
git tag -a v1.2.3 -m "Release v1.2.3"

# Push tags
git push origin main --tags
```

**3. Publish to npm**

```bash
# Build for production
npm run build

# Publish
npm publish
```

**4. Create GitHub Release**

- Go to GitHub Releases
- Select tag
- Generate release notes
- Attach binaries (if any)
- Publish release

### Automated Releases (Future)

Using semantic-release:

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: npx semantic-release
```

---

## Additional Resources

- **API Documentation:** See JSDoc comments in source code
- **Architecture Decisions:** See `docs/adr/` (future)
- **Performance Guidelines:** See `docs/PERFORMANCE.md` (future)
- **Security Policy:** See `SECURITY.md` (future)

---

## Questions?

- **Issues:** [GitHub Issues](https://github.com/AbdulKhaliqAbdulAzeez/Repo-Aware-Commit-Composer/issues)
- **Discussions:** [GitHub Discussions](https://github.com/AbdulKhaliqAbdulAzeez/Repo-Aware-Commit-Composer/discussions)
- **Email:** [abdulkhaliq@example.com](mailto:abdulkhaliq@example.com)

---

**Last Updated:** November 11, 2025  
**Version:** 1.0.0
