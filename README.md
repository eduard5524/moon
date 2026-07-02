# Moon &#9790;

**Autonomous AI Software Engineer**

Moon is a multi-agent AI system that autonomously handles the full software development lifecycle — from understanding requirements to deploying production-ready software.

## Architecture

```
Planner
   │
Task Queue
   │
────────────────────────
Agent 1 → Coding
Agent 2 → Testing
Agent 3 → Documentation
Agent 4 → Deployment
────────────────────────
      │
Memory | Git | Docker | Browser | Terminal | SSH | Cloud
```

## Features

- **Autonomous Execution** — Completes tasks without constant supervision
- **Multi-Agent System** — Specialized agents for coding, testing, docs, and deployment
- **Full Stack Access** — Git, terminal, browser, SSH, Docker, and cloud providers
- **Context Awareness** — Understands your codebase structure, patterns, and conventions
- **Human-in-the-Loop** — Asks for approval on critical decisions

## Quick Start

```bash
# Install
pip install moon-agent

# Initialize in your project
cd your-project
moon init

# Run a task
moon run "Fix the authentication bug in login.ts"
```

## What Moon Can Do

| Capability | Description |
|-----------|-------------|
| Clone repos | Pull any repository and understand its structure |
| Edit files | Write, modify, and refactor code across languages |
| Run tests | Execute test suites and diagnose failures |
| Open PRs | Create pull requests with meaningful descriptions |
| Deploy | Build, package, and ship to production |
| Browse docs | Research APIs and documentation online |
| Ask approval | Escalate when human decision is needed |

## Documentation

- [Getting Started](docs/getting-started.html)
- [Architecture](docs/architecture.html)
- [Agents](docs/agents.html)
- [Integrations](docs/integrations.html)

## Landing Page

Open `index.html` to view the project landing page, or visit it deployed at your GitHub Pages URL.

## License

MIT
