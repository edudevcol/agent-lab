# Contributing to Agent Lab

Thanks for helping improve Agent Lab.

## Development

1. Install Node.js 18 or newer.
2. Run `npm install`.
3. Run `npm run setup` to install Chromium.
4. Copy `.env.example` to `.env` and keep secrets local.
5. Test with `npm start -- https://www.saucedemo.com`.

## Pull requests

- Keep changes focused and explain the user-visible behavior.
- Preserve the no-submit behavior of the form agent.
- Do not commit `.env`, API keys, generated reports, or local screenshots.
- Update both README files when changing setup or configuration.
- Prefer small, readable agents over broad refactors.

## Adding an agent

Add the agent definition to `src/browser/agent-lab.js`, give it a unique `id`, and use the
existing `inspect`, `inspectPage`, and severity conventions. Verify that it works with both
`HEADLESS=true` and `HEADLESS=false`.
