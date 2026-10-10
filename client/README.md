# Rybbit Client

The Next.js app is part of the root pnpm workspace alongside `server` and `shared`.
See [local development](../CONTRIBUTE.md#local-development) for setup instructions.

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm dev:client
```

Open [http://localhost:3002](http://localhost:3002).

Other root commands:

```bash
pnpm build:client
pnpm --filter client test
pnpm --filter client lint
pnpm --filter client typecheck
pnpm --filter client extract
```

The root development and build commands compile `@rybbit/shared` first. The Docker
image packages the app using Next.js standalone output traced from the workspace
root.
