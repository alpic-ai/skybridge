# Contributing to Skybridge

Thank you for your interest in contributing to Skybridge! Every contribution helps make this framework better for everyone building ChatGPT and MCP Apps.

New here? Please drop by our [Discord](https://discord.com/invite/gNAazGueab) and introduce yourself before opening your first PR. It helps us know who you are and lets us point you toward good first issues.

## Getting Started

### Prerequisites

- Node.js 24+
- pnpm 10+ (run `corepack enable` to use the version specified in package.json)

### Setup

```bash
# Clone the repository
git clone https://github.com/alpic-ai/skybridge.git
cd skybridge

# Install dependencies
pnpm install
```

## Development Workflow

| Command          | Description                                |
| ---------------- | ------------------------------------------ |
| `pnpm test`      | Run all tests (unit + lint)                |
| `pnpm test:unit` | Run unit tests only                        |
| `pnpm build`     | Compile packages                           |
| `pnpm docs:dev`  | Start docs dev server                      |

## How to Contribute

### Reporting Bugs

Open an [issue](https://github.com/alpic-ai/skybridge/issues) with:

- A clear, descriptive title
- Steps to reproduce the problem
- Expected vs actual behavior
- Your environment (Node version, OS, Browser version, etc.)

### Suggesting Features

Start a [discussion](https://github.com/alpic-ai/skybridge/discussions) to share your idea. This helps gather community feedback before implementation.

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes
4. Ensure tests pass (`pnpm test`)
5. Commit with a clear message
6. Push and open a PR

Keep PRs focused on a single change. For larger features, consider opening an issue first to discuss the approach.

#### Greptile review

Every PR is reviewed by Greptile. If the check does not return 5/5, address each comment: either fix the issue or reply on the comment explaining why you disagree. Unanswered Greptile feedback will block merge.

#### Cross-cutting concerns

When your PR changes the public API of `packages/core` (exports from `src/server/index.ts`, `src/web/index.ts`, or the CLI commands in `src/commands/`), it must also update:

1. `skills/` references (notably `skybridge`)
2. `docs/`, especially `api-reference/` and `guides/`

Reviewers will block PRs that touch the public API without these updates.

#### On AI-generated contributions

AI tools are welcome to help you write code. What we ask is that you own what you submit: if you use an AI assistant, please make sure you understand every line, run the tests, and feel confident standing behind the change. PRs that look like unreviewed AI output (untested code, hallucinated APIs, boilerplate without clear intent) will be sent back for rework.

### Documentation

If your PR affects the documentation, read [docs/DOCUMENTATION-MANIFESTO.md](docs/DOCUMENTATION-MANIFESTO.md) before you start. It is the must-read guide for new documentation contributors and covers documentation philosophy, writing guidelines, and the docs change checklist.

## Code Guidelines

- Write TypeScript with proper types (avoid `any`)
- Add tests for new functionality
- Follow existing code patterns and conventions
- Keep commits atomic and well-described

## Community

- 💬 [GitHub Discussions](https://github.com/alpic-ai/skybridge/discussions)
- 🗣️ [Discord](https://discord.com/invite/gNAazGueab)

## License

By contributing, you agree that your contributions will be licensed under the [ISC License](LICENSE).
