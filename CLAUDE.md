@AGENTS.md

## Claude Code notes

- Start a session by reading `PROGRESS.md` and `NEEDS_STEFAN.md` (and
  `PRODUCT_SSOT_SLJAKAM.md` / `PROJECT_SSOT.md` when relevant).
- End a session by updating `PROGRESS.md`: done, decisions, blockers, next.
- For anything touching more than ~3 files or changing architecture: options
  - recommendation first. When Stefan has said to keep going without him,
    take the recommended option and record it in `PROGRESS.md`.
- Before writing a file, check whether it already exists (Cursor may have
  just created it); merge instead of overwriting.
- Run the whole-repo check before every commit, chained with `&&`, and only
  commit when it passes.
- When reviewing UI, prefer written review files (e.g. `design/review-NN.md`)
  over chat-only opinions once design work exists.
- After deploying, verify the change on the live site, not just the build.
