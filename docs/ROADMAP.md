# Development Roadmap

**Project:** Repo-Aware Commit Composer (`aicmt`)  
**Status:** Initial Development  
**Timeline:** 4-6 weeks  
**Approach:** Iterative, test-driven, production-ready

---

## Development Philosophy

### Core Principles

1. **Incremental Development** — Build and validate one feature at a time
2. **Test-First Mentality** — Write tests alongside implementation, not after
3. **Production Readiness** — Every merge should be deployable
4. **Developer Experience** — Optimize for clarity, debugging, and maintenance
5. **Graceful Degradation** — Handle errors elegantly; never crash silently

### Quality Gates

- ✅ All tests pass (`npm test`)
- ✅ Zero linting errors (`npm run lint`)
- ✅ Code coverage ≥ 80%
- ✅ TypeScript strict mode compliance
- ✅ Manual validation with real repositories

---

## Phase 1: Foundation & Core Infrastructure (Week 1)

**Goal:** Establish reliable git integration and configuration management

### 1.1 Environment Setup

- [x] Project structure scaffolding
- [x] TypeScript configuration with strict mode
- [x] Testing framework (Jest) with ESM support
- [x] Linting and formatting (ESLint + Prettier)
- [ ] CI/CD pipeline (GitHub Actions)
  - Unit tests on PR
  - Lint checks
  - Build validation
  - Coverage reporting

### 1.2 Git Service Layer

**Priority:** Critical  
**Dependencies:** None

- [ ] Implement `GitService` with full error handling
  - `getDiff()` with staged and range modes
  - `getChangedFiles()` with numstat parsing
  - `getFileHistory()` for context enrichment
  - `getCurrentBranch()` for issue detection
  - `createCommit()` with hook support
- [ ] Add comprehensive unit tests
  - Mock git output scenarios
  - Test error cases (no repo, empty diff, merge conflicts)
  - Validate command construction
- [ ] Integration tests with real git repository
- [ ] Document git version compatibility (≥2.30)

**Success Criteria:**
- Can reliably extract diffs in all scenarios
- Handles detached HEAD, empty repos, binary files
- 90%+ test coverage

### 1.3 Configuration System

**Priority:** Critical  
**Dependencies:** None

- [ ] Implement `ConfigService` with cascading config
  - Default config embedded in code
  - Project config (`.aicmt.yaml`)
  - User config (`~/.config/aicmt/config.yaml`)
  - Environment variable overrides
  - CLI flag precedence (highest)
- [ ] Config validation with helpful error messages
- [ ] Schema documentation (JSON Schema)
- [ ] Unit tests for merge logic
- [ ] Config migration tooling (for future versions)

**Success Criteria:**
- Config loads from all sources correctly
- Validation catches malformed YAML
- Precedence order works as documented

### 1.4 Logging & Error Handling

**Priority:** High  
**Dependencies:** None

- [ ] Enhance `Logger` with levels and formatting
  - Structured logging (JSON mode for CI)
  - Colored output for terminals
  - Debug mode with verbose git commands
  - Performance timing for slow operations
- [ ] Global error handler with context
- [ ] User-friendly error messages
  - No stack traces in production
  - Actionable suggestions
  - Link to docs for common issues

**Deliverables:**
- Reliable git integration
- Flexible configuration system
- Production-grade logging

---

## Phase 2: Context Analysis & Intelligence (Week 2)

**Goal:** Build intelligent diff analysis and scope detection

### 2.1 Context Builder

**Priority:** Critical  
**Dependencies:** GitService

- [ ] Implement `ContextBuilder` core logic
  - Per-file change summarization
  - Keyword extraction (fix, feat, breaking, etc.)
  - Change magnitude analysis (additions/deletions ratio)
  - Function/class name extraction from diffs
- [ ] Scope inference engine
  - Path-based scope detection
  - Configurable scope mapping
  - Multi-scope handling (e.g., "web,api")
  - Monorepo awareness
- [ ] Type detection heuristics
  - Keyword analysis
  - File extension patterns (.md → docs, .test.ts → test)
  - Commit history analysis
  - Package.json dependency changes → chore
- [ ] Unit tests with diverse diff scenarios
  - Single file changes
  - Multi-package changes
  - Mixed types (docs + code)
  - Edge cases (renames, deletions, binary)

**Success Criteria:**
- 85%+ accuracy on test suite of real commits
- Handles monorepos correctly
- Falls back gracefully when uncertain

### 2.2 Issue Linking

**Priority:** High  
**Dependencies:** GitService, ConfigService

- [ ] Branch name parsing
  - Support common patterns (feat/123, PROJ-456)
  - Configurable regex patterns
  - Handle edge cases (no issue, multiple issues)
- [ ] Issue URL generation
  - Template-based linking
  - GitHub, GitLab, JIRA support
  - Custom template support
- [ ] `--issue` flag handling
  - `auto` mode (detect from branch)
  - Explicit ID mode
  - `off` mode
- [ ] Unit tests for all patterns

### 2.3 Redaction Service

**Priority:** High (Security)  
**Dependencies:** None

- [ ] Secret detection patterns
  - API keys (AWS, OpenAI, generic)
  - Tokens (JWT, Bearer, OAuth)
  - Private keys (PEM, SSH)
  - Database credentials
  - Custom patterns from config
- [ ] Safe diff sanitization
  - Preserve code structure
  - Mask only sensitive values
  - Log redaction events
- [ ] Unit tests with real secret patterns
- [ ] Performance benchmarks (large diffs)

**Deliverables:**
- Intelligent context extraction
- Accurate scope/type detection
- Secure diff handling

---

## Phase 3: AI Integration & Prompt Engineering (Week 3)

**Goal:** Implement OpenAI integration with robust prompt engineering

### 3.1 OpenAI Provider

**Priority:** Critical  
**Dependencies:** ConfigService

- [ ] Implement `OpenAIProvider`
  - API client initialization
  - Retry logic with exponential backoff
  - Rate limiting awareness
  - Timeout handling (30s default)
  - Token usage tracking
- [ ] Error handling
  - API key validation
  - Quota exceeded handling
  - Network failures
  - Invalid model names
- [ ] Mock provider for testing
  - Deterministic responses
  - Simulate API errors
  - No external API calls in CI
- [ ] Cost estimation logging

**Success Criteria:**
- Handles all OpenAI error scenarios
- Respects rate limits
- Test suite runs without API key

### 3.2 Prompt Engineering

**Priority:** Critical  
**Dependencies:** ContextBuilder, OpenAI Provider

- [ ] Commit message prompt design
  - System prompt with Conventional Commit rules
  - Diff summarization (token-efficient)
  - Few-shot examples for consistency
  - Width and style constraints
  - Emoji mapping (when enabled)
- [ ] PR description prompt design
  - Structured sections (summary, changes, breaking, migration)
  - Detailed vs concise modes
  - Template integration
- [ ] Prompt optimization
  - Token budget management (<2K tokens)
  - Compression techniques (remove whitespace, summarize)
  - Context window utilization
- [ ] A/B testing framework
  - Compare prompt variations
  - Measure quality metrics
  - Iterate based on results

**Success Criteria:**
- Consistent, high-quality output
- <2K tokens per request
- Handles large diffs gracefully

### 3.3 Response Parsing & Validation

**Priority:** High  
**Dependencies:** PromptBuilder

- [ ] Commit message parsing
  - Extract type, scope, subject, body
  - Validate Conventional Commit format
  - Handle malformed responses
- [ ] PR description parsing
  - Extract markdown sections
  - Validate completeness
  - Handle missing sections gracefully
- [ ] Quality checks
  - Subject line length
  - No trailing periods
  - Proper capitalization
  - Meaningful content (not generic)
- [ ] Fallback strategies
  - Retry with clarified prompt
  - Use simpler model
  - Manual edit mode

**Deliverables:**
- Production-ready OpenAI integration
- Optimized prompts
- Reliable output parsing

---

## Phase 4: CLI Commands & UX (Week 4)

**Goal:** Build intuitive CLI with excellent developer experience

### 4.1 `aicmt commit` Command

**Priority:** Critical  
**Dependencies:** All Phase 2-3 components

- [ ] Core implementation
  - Flag parsing and validation
  - Workflow orchestration
  - Progress indicators
  - Error recovery
- [ ] Interactive mode
  - Preview before committing
  - Editor integration ($EDITOR)
  - Confirmation prompts
  - Dry-run with colored diff
- [ ] Advanced features
  - Multi-line body support
  - Breaking change footer
  - Co-author attribution
  - Sign-off support
- [ ] Integration tests
  - End-to-end scenarios
  - Real git operations
  - Mock AI responses

### 4.2 `aicmt pr` Command

**Priority:** High  
**Dependencies:** All Phase 2-3 components

- [ ] Core implementation
  - Base/head branch comparison
  - Output formatting (markdown)
  - File output (`--out`)
  - Template rendering
- [ ] Template system
  - Mustache/Handlebars templates
  - Default template
  - Custom template loading
  - Variable interpolation
- [ ] GitHub/GitLab detection
  - Auto-detect remote
  - Format links correctly
  - Issue reference formatting

### 4.3 `aicmt compose` Command

**Priority:** Medium  
**Dependencies:** commit + pr commands

- [ ] Unified workflow
  - Generate commit message
  - Generate PR description
  - Save both outputs
  - Single AI call optimization
- [ ] Smart defaults
  - Detect workflow from context
  - Suggest next actions

### 4.4 `aicmt lint-commit` Command

**Priority:** Medium  
**Dependencies:** Render module

- [ ] Git hook integration
  - Install script for `commit-msg` hook
  - Pre-commit hook support
- [ ] Validation rules
  - Conventional Commit format
  - Line length limits
  - Emoji validation (when configured)
- [ ] Auto-fix suggestions

### 4.5 User Experience Polish

**Priority:** High  
**Dependencies:** All commands

- [ ] Help documentation
  - Comprehensive `--help` output
  - Examples in help text
  - Link to online docs
- [ ] Progress indicators
  - Spinner for AI requests
  - Progress bars for large diffs
  - ETA for slow operations
- [ ] Colored output
  - Success (green), warnings (yellow), errors (red)
  - Syntax highlighting for diffs
  - Respect `NO_COLOR` env var
- [ ] Keyboard shortcuts
  - Ctrl+C handling
  - Quick edit (e)
  - Accept/reject (y/n)

**Deliverables:**
- Fully functional CLI
- Excellent UX
- Comprehensive help system

---

## Phase 5: Testing & Quality Assurance (Week 5)

**Goal:** Achieve production-grade reliability and performance

### 5.1 Comprehensive Test Suite

- [ ] Unit tests (target: 85% coverage)
  - All core modules
  - Edge cases and error paths
  - Mock external dependencies
- [ ] Integration tests
  - Real git operations
  - Config loading
  - End-to-end workflows
- [ ] E2E tests with fixture repos
  - Small, medium, large diffs
  - Monorepo scenarios
  - Various commit patterns
- [ ] Performance benchmarks
  - Large diffs (1000+ files)
  - Response time targets (<5s)
  - Memory usage profiling

### 5.2 Error Scenario Testing

- [ ] Network failures
  - Timeout handling
  - Retry behavior
  - Offline mode messaging
- [ ] Invalid inputs
  - Malformed diffs
  - Missing files
  - Permission errors
- [ ] Edge cases
  - Empty repositories
  - Detached HEAD
  - Merge conflicts
  - Binary files

### 5.3 Real-World Validation

- [ ] Test on diverse repositories
  - JavaScript/TypeScript projects
  - Python projects
  - Monorepos
  - Open-source projects
- [ ] User acceptance testing
  - Internal team dogfooding
  - Beta tester feedback
  - Iterate on pain points

**Deliverables:**
- High test coverage
- Validated on real repos
- Performance benchmarks met

---

## Phase 6: Documentation & Release Prep (Week 6)

**Goal:** Create comprehensive documentation and prepare for v1.0 release

### 6.1 Documentation

- [ ] User Guide
  - Installation instructions
  - Quick start tutorial
  - Configuration reference
  - Command reference
  - Troubleshooting guide
- [ ] Developer Guide
  - Architecture overview
  - Contributing guidelines
  - Local development setup
  - Testing guidelines
- [ ] API Documentation
  - JSDoc for all public APIs
  - Generate HTML docs
- [ ] Examples
  - Sample configurations
  - Common workflows
  - Advanced use cases

### 6.2 Package & Distribution

- [ ] npm package setup
  - Semantic versioning
  - Package optimization (tree-shaking)
  - Binary packaging (optional)
- [ ] Multi-platform testing
  - Linux (Ubuntu, Fedora)
  - macOS (x64, ARM)
  - Windows (WSL, native)
- [ ] Installation methods
  - npm global install
  - npx usage
  - Homebrew formula (future)
  - Docker image (optional)

### 6.3 CI/CD Pipeline

- [ ] GitHub Actions workflows
  - Automated tests on PR
  - Build validation
  - Release automation
  - npm publish
- [ ] Semantic release setup
  - Automated versioning
  - Changelog generation
  - Git tags
- [ ] Security scanning
  - Dependency audit
  - SAST tools (CodeQL)
  - Secret scanning

### 6.4 Release Checklist

- [ ] Version 1.0.0-beta.1
  - Internal testing
  - Bug fixes
  - Performance tuning
- [ ] Version 1.0.0-rc.1
  - Beta tester feedback
  - Documentation review
  - Final polish
- [ ] Version 1.0.0
  - Public announcement
  - Blog post
  - Social media

**Deliverables:**
- Complete documentation
- Production-ready package
- v1.0 release

---

## Post-Launch Roadmap (Future Phases)

### Phase 7: Advanced Features

**Timeline:** Month 2-3

- [ ] **Historical Learning**
  - Analyze repo commit history
  - Learn team conventions
  - Calibrate tone and style
  - Personalization per author

- [ ] **Multi-Commit Planning**
  - Suggest commit split points for large diffs
  - Atomic commit recommendations
  - Interactive commit staging

- [ ] **Platform Integration**
  - GitHub PR creation via API
  - GitLab MR creation
  - JIRA integration
  - Linear integration

- [ ] **Enhanced Context**
  - Tree-sitter parsing for better scope detection
  - File dependency analysis
  - Import/export tracking
  - Breaking change detection from code

- [ ] **Team Features**
  - Shared configuration presets
  - Team style guides
  - Convention enforcement
  - Analytics and metrics

### Phase 8: Ecosystem Expansion

**Timeline:** Month 4-6

- [ ] **Multi-Provider Support**
  - Anthropic Claude
  - Local models (Ollama, LM Studio)
  - Azure OpenAI
  - Custom endpoints

- [ ] **IDE Extensions**
  - VS Code extension
  - JetBrains plugin
  - Vim/Neovim integration

- [ ] **GUI Option**
  - Web UI for configuration
  - Visual diff viewer
  - Interactive commit builder

- [ ] **Internationalization**
  - Multi-language commit messages
  - Localized prompts
  - RTL support

### Phase 9: Enterprise Features

**Timeline:** Month 6+

- [ ] **Compliance & Governance**
  - Commit policy enforcement
  - Audit trails
  - SOC 2 compliance
  - On-premise deployment

- [ ] **Advanced Security**
  - Custom redaction rules
  - Data residency options
  - SSO integration
  - Role-based access

- [ ] **Analytics**
  - Commit quality metrics
  - Team productivity insights
  - Model performance tracking
  - Cost optimization

---

## Success Metrics

### Technical Metrics

- **Reliability:** >99.5% success rate on valid inputs
- **Performance:** <5s for typical commits, <15s for large PRs
- **Quality:** Avg 4.5/5 user satisfaction with generated messages
- **Coverage:** >85% test coverage
- **Security:** Zero high-severity vulnerabilities

### Adoption Metrics

- **Month 1:** 100+ GitHub stars, 10+ active users
- **Month 3:** 500+ stars, 100+ active users, 5+ contributors
- **Month 6:** 1K+ stars, 500+ active users, Featured in dev newsletters

### Community Metrics

- **Response Time:** <24hr for issues
- **PR Review:** <48hr for community PRs
- **Documentation:** 90%+ user comprehension rate
- **Support:** Active Discord/Discussions forum

---

## Risk Mitigation

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| OpenAI API changes | High | Medium | Abstract provider interface, version pinning |
| Rate limiting | Medium | High | Implement caching, retry logic, local fallback |
| Poor AI output quality | High | Medium | Prompt engineering, validation, manual edit option |
| Git version incompatibility | Medium | Low | Test on multiple versions, document requirements |
| Performance on large repos | Medium | Medium | Optimize diff processing, add streaming |

### Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Low adoption | High | Medium | Marketing, docs, demo videos, community building |
| Competition | Medium | High | Focus on quality, DX, unique features |
| OpenAI costs | Low | Low | Token optimization, offer local model option |
| Maintenance burden | Medium | Medium | Good architecture, tests, contributor guidelines |

---

## Development Practices

### Daily Workflow

1. **Morning:** Review issues, plan daily scope
2. **Development:** TDD approach, commit frequently
3. **Testing:** Run full suite before PR
4. **Documentation:** Update docs with code changes
5. **Review:** Self-review before requesting feedback

### Code Quality Standards

- **TypeScript:** Strict mode, no `any` unless justified
- **Testing:** Unit tests for logic, integration for workflows
- **Documentation:** JSDoc for public APIs, inline comments for complex logic
- **Commits:** Conventional Commits (dogfood our own tool!)
- **Reviews:** All changes via PR, even for solo development

### Communication

- **Changelog:** Maintain CHANGELOG.md with each release
- **Issues:** Use issue templates, triage weekly
- **Discussions:** Enable GitHub Discussions for Q&A
- **Blog:** Technical deep-dives for major features

---

## Version 1.0 Definition of Done

### Must Have

- ✅ All Phase 1-6 deliverables complete
- ✅ Test coverage >85%
- ✅ Zero critical bugs
- ✅ Documentation complete
- ✅ Works on Linux, macOS, Windows
- ✅ npm package published
- ✅ 10+ real-world validation cases

### Nice to Have

- GitHub Actions workflow examples
- Video tutorial
- Integration with popular git GUIs
- Autocomplete for shells

### Explicitly Out of Scope (v1.0)

- GUI application
- IDE extensions
- Non-OpenAI providers
- Historical learning
- Multi-language support

---

## Conclusion

This roadmap prioritizes **reliability over features**, **quality over speed**, and **user experience over complexity**. Each phase builds on the previous, ensuring a solid foundation before adding advanced capabilities.

The goal is not just to ship software, but to deliver a **tool that developers trust and enjoy using daily**.

---

**Next Step:** Begin Phase 1.1 - Environment Setup  
**Owner:** Development Team  
**ETA:** Week 1, Day 1
