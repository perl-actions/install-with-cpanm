# CLAUDE.md

## Project

GitHub Action to install Perl modules using `cpanm`. The action source is `index.js`, bundled into `dist/index.js` via `ncc`.

## Build

```bash
npm ci          # install dependencies
npm run build   # rebuild dist/index.js from index.js
```

## Dist freshness

The `dist/index.js` file must always be in sync with `index.js`. Before creating or updating a pull request:

1. Run `npm run build`
2. Check `git status dist/` for changes
3. If `dist/index.js` changed, commit the updated file

CI enforces this via the `check-dist` workflow — PRs with a stale dist will fail.
