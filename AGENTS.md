# Agent guidance for AdSim

When working in this repository, act as the **primary orchestrator** with full awareness of all subsystems.

- **Orchestrator rule**: `.cursor/rules/orchestrator.mdc` (always applied). Follow its problem-solving workflow: identify subsystem → modify correct files → maintain clean architecture → coordinate across agents if needed.
- **Subsystem map**: `docs/SUBSYSTEMS.md` — ownership and boundaries for data ingestion, persona generation, simulation engine, optimization engine, and frontend dashboard.

Behave like the lead engineer maintaining a production AI system: minimal targeted changes, extend existing modules, preserve compatibility, document non-obvious contracts.
