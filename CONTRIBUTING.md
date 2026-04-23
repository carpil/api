# Contributing to Carpil API

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/). Every commit message must follow this format:

```
<type>: <description>

# Examples
feat: add ride cancellation endpoint
fix: correct fare calculation for long trips
chore: upgrade stripe sdk
feat!: change auth token format (breaking change)
```

**Types:** `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`

Use `feat!` or add `BREAKING CHANGE:` in the body for breaking changes — these trigger a major version bump.

Commits are validated automatically on commit via lefthook + commitlint.

## Branch naming

```
<type>/CARPIL-<ticket>-<short-description>

# Examples
feat/CARPIL-42-add-driver-verification
fix/CARPIL-87-fix-notification-delivery
```

## How versioning works

We use [release-please](https://github.com/googleapis/release-please). On every merge to `main`:
- release-please opens or updates a Release PR with a CHANGELOG and version bump
- When you merge the Release PR, a tag `vX.Y.Z` is created automatically
- That tag triggers the staging deploy to Railway automatically

## Setting up locally

```bash
pnpm install
npx lefthook install   # installs commit-msg hook
cp .env.example .env   # fill in your local env vars
```

## Running the API

```bash
pnpm dev
```

## Running tests

```bash
pnpm test
pnpm lint
```
