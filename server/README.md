# Analytics Backend

Self-hosted analytics backend using ClickHouse.

## Development

### Prerequisites

- Node.js (v22.1.0 or higher)
- pnpm

### Installation

```bash
pnpm install
```

### Running the Application

```bash
# Development mode
pnpm --filter rybbit-backend dev

# Production build
pnpm --filter rybbit-backend build
pnpm --filter rybbit-backend start
```

### Testing

```bash
# Run tests once
pnpm --filter rybbit-backend test:run

# Run tests in watch mode
pnpm --filter rybbit-backend test:watch

# Run tests with coverage
pnpm --filter rybbit-backend test
```

### Database Operations

```bash
# Generate migrations
pnpm --filter rybbit-backend db:generate

# Run migrations
pnpm --filter rybbit-backend db:migrate

# Push schema changes
pnpm --filter rybbit-backend db:push

# Pull schema from database
pnpm --filter rybbit-backend db:pull

# Drop database
pnpm --filter rybbit-backend db:drop

# Check migrations
pnpm --filter rybbit-backend db:check
```

## Testing

The project uses [Vitest](https://vitest.dev/) for testing. Test files should be placed alongside source files with the `.test.ts` extension.

### Current Test Coverage

- `normalizeOrigin` function: Comprehensive tests covering subdomain removal, multi-level TLD handling, URL parsing, edge cases, and error handling.

### Running Specific Tests

```bash
# Run a specific test file
pnpm --filter rybbit-backend exec vitest src/utils.test.ts

# Run tests matching a pattern
pnpm --filter rybbit-backend exec vitest --grep "normalizeOrigin"
```
