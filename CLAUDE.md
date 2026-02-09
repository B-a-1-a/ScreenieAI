# Rules

1. NEVER use `sudo` for any command.
2. NEVER use global npm. Always use the local project `node_modules/.bin/` or `npx` from within this project folder.

## Commit Message Format

Use the Conventional Commits standard:

```
<type>(<scope>): <subject>

<body>

<footer>
```

- **type**: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`, `perf`, `ci`, `build`
- **scope**: optional, e.g. `interview`, `store`, `gemini`, `canvas`, `export`
- **subject**: imperative, lowercase, no period, max 50 chars
- **body**: wrap at 72 chars, explain *what* and *why* (not *how*)
- **footer**: `Co-Authored-By`, breaking changes, issue refs

## Git Identity

All commits MUST set BOTH the **author** (`GIT_AUTHOR_NAME`/`GIT_AUTHOR_EMAIL`) AND the **committer** (`GIT_COMMITTER_NAME`/`GIT_COMMITTER_EMAIL`) to `Abhinav Nandwani <nandwani2@wisc.edu>`. Never rely on the system default.
