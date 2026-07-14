# System Agent — Active Kanban

This board is the SSOT for unfinished autonomous implementation work only. It is intentionally empty:
the 2026-07-14 Arch MVP closure wave passed source, browser, Electron, package, installed-artifact,
restart-persistence, security, and dogfood gates. Completed evidence is summarized in `AUDIT.md` and
kept in detail by tests and Git rather than duplicated here.

## Ready

No active implementation tasks.

## External validation gates

These are not hidden implementation tasks and must not be presented as completed:

| Outcome | Required external input |
|---|---|
| Live Chat provider stream | a current provider credential authorized by the user |
| EcoFlow live read-only telemetry | device/cloud credentials and reachable hardware |
| GPU/fan or EcoFlow write dogfood | dedicated safe rollback environment and explicit opt-in |

When an input becomes available, add one bounded task here with its acceptance evidence; remove it
again after completion so the board never becomes a completed-work archive.
