# Agent entry point

Read `.ai/START_HERE.md`, then `.ai/CURRENT_STATE.md`; read `.ai/HANDOFF.md` when continuing work.
Treat unfilled template fields as unknown; inspect narrowly and replace with verified facts.
Search before loading: inspect obvious source paths directly; for relationships use `context-query "topic" --budget 700` if a graph exists. Native Graphify budgets can overrun; this wrapper limits displayed output.
Load `.ai/INDEX.md`, architecture, decisions, tasks, or matching Obsidian notes only when needed. Never preload the vault, full graph, or report.
Use file paths and targeted line ranges; exclude dependencies, generated output, binaries, images, and `.env*` from context scans. Explicit user requests take precedence.
Verify stale memory against source; context notes are navigation, not evidence of current behavior.
After meaningful work, update current state and overwrite handoff. Update tasks only if changed; append durable decisions with reasons. Link deeper reusable knowledge instead of copying it.
Keep combined HOT context near 1,000–2,000 tokens and below 2,500 when practical; run `context-check`. If a graph exists and source changed, run `context-graph` to refresh it incrementally.
