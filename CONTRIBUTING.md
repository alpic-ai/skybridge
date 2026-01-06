# Contributing to Skybridge

Thank you for your interest in contributing to Skybridge! Every contribution helps make this framework better for everyone building ChatGPT apps.

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

| Command          | Description                          |
| ---------------- | ------------------------------------ |
| `pnpm test`      | Run all tests (unit + type checking) |
| `pnpm test:unit` | Run unit tests only                  |
| `pnpm test:type` | Run TypeScript type checking         |
| `pnpm docs:dev`  | Start docs dev server                |

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
