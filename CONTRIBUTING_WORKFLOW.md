# Contributor Workflow

This repository should be updated through small, focused branches instead of one large working branch.

## Rules

1. One feature or fix = one branch.
2. Always sync `main` with upstream before starting new work.
3. Create each feature branch from updated `main`.
4. Commit focused work only.
5. Push the branch and open a PR.
6. After merge, sync `main` again before starting the next branch.

## Recommended Branch Names

- `feature/schema-generator`
- `feature/api-enhancement`
- `feature/frontend-ui`
- `feature/llm-integration`
- `fix/request-validation`

## Standard Flow

```bash
git checkout main
git pull upstream main
git push origin main
git checkout -b feature/schema-generator
git add .
git commit -m "Add schema generator"
git push origin feature/schema-generator
```

After the PR is merged:

```bash
git checkout main
git pull upstream main
git checkout -b feature/next-feature
```

## What Not To Do

- Do not keep one massive branch for all work.
- Do not open huge PRs that mix unrelated changes.
- Do not start from an outdated `main`.
- Do not skip upstream sync before new work.

## Working Principle

The project should evolve through multiple reviewed PRs, with each update isolated in its own branch.
