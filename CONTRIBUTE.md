# Contributing to Rybbit

First off, thank you for taking the time to contribute! 🎉  
Whether it's a bug report, feature idea, or code contribution, all forms of help are appreciated.

---

## Got an Idea or a Question?

Please start a [**Discussion**](https://github.com/rybbit-io/rybbit/discussions) if your contribution is not a bug report:

- **Ideas** – Share new features, suggestions, or improvements.
- **Q&A** – Ask questions about how things work.
- **General** – Anything else not covered by the above.

Use the appropriate category when opening a new discussion.

---

## Found a Bug?

If something isn't working as expected, please [**open an Issue**](https://github.com/rybbit-io/rybbit/issues).

When filing an issue, make sure to:

- Include clear steps to reproduce the problem
- Describe what you expected to happen and what actually happened
- Attach logs, screenshots, or examples where applicable
- Use the correct issue template (if one is available)

This helps us investigate and resolve the issue faster.

---

## Want to Submit a Pull Request?

Pull requests are welcome! Please keep in mind:

- Try to keep PRs focused and scoped to a single change.
- Follow any coding style guidelines or formatting rules (if specified).
- Include relevant context or links to issues/discussions.
- PRs will be reviewed and merged by the maintainers once they meet quality standards and align with the project direction.

### Local development

The application is a pnpm workspace containing `client/`, `server/`, and `shared/`.
The docs app and React Native SDK are separate projects and keep their own tooling.
Use Node.js 24 (`nvm use`) and the pnpm version pinned in the root `package.json`:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Configure the backend environment and its Postgres, ClickHouse, and Redis services
before starting the app. The client runs on port 3002 and the backend on port 3001.
`pnpm dev` builds shared code first, then starts its TypeScript watcher alongside
both apps. The backend's existing dev command compiles once; restart it after
backend changes.

Run these commands from the repository root:

| Command             | Purpose                                                  |
| ------------------- | -------------------------------------------------------- |
| `pnpm dev:client`   | Start the client and shared-code watcher                 |
| `pnpm dev:server`   | Start the backend and shared-code watcher                |
| `pnpm build`        | Build shared code, then both apps                        |
| `pnpm build:client` | Build shared code and the client                         |
| `pnpm build:server` | Build shared code and the backend, including the tracker |
| `pnpm test`         | Build shared code and run both test suites once          |
| `pnpm typecheck`    | Build shared code and type-check both apps               |
| `pnpm lint`         | Run the client's ESLint command                          |

The root test command runs one package at a time with four workers to bound the
memory used by the backend's in-memory Postgres tests.

Package scripts also work inside their respective directories. Build `shared`
first with `pnpm --filter @rybbit/shared build` when running a package directly
from a fresh checkout. Add dependencies to the package that uses them, for example
`pnpm --filter client add <package>` or `pnpm --filter rybbit-backend add <package>`.
Commit the root `pnpm-lock.yaml`; do not generate npm lockfiles for these packages.
Dependency overrides and allowed dependency build scripts live in
`pnpm-workspace.yaml`.

Both Dockerfiles use the repository root as their build context and require
BuildKit (enabled by default in current Docker versions):

```bash
docker build -f client/Dockerfile \
  --build-arg NEXT_PUBLIC_BACKEND_URL=https://analytics.example.com \
  -t rybbit-client .
docker build -f server/Dockerfile -t rybbit-backend .
```

Use your deployment's public backend URL. Docker Compose supplies this build
argument from `BASE_URL`; local `.env` files are excluded from Docker images.

The client image uses Next.js standalone output. The backend image uses
`pnpm deploy --legacy --prod` to create a portable package while keeping normal
workspace symlinks for local development. Its production dependencies include
Drizzle Kit because container startup applies migrations. Database commands are
explicit operations; installs, builds, and tests do not apply migrations.

---

## Join Our Community

You’re also welcome to join the Rybbit Discord to chat with the community and the team:

👉 [https://discord.gg/DEhGb4hYBj](https://discord.gg/DEhGb4hYBj)

---

Thank you again for helping make Rybbit better!

— The Rybbit Team
