# Agent Lab

**by edudevcol**

[Read this in Spanish](README.es.md)

Agent Lab is a visual QA demo. Give it a URL and six agents inspect the loaded page in parallel, move across the DOM, highlight findings, and produce a JSON report plus a readable HTML report.

## Requirements

- Node.js 18 or newer
- Chromium installed through Playwright

## Install

```bash
npm install
npm run setup
cp .env.example .env
```

On PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

## Run

```bash
npm start -- https://www.saucedemo.com
```

The browser opens maximized. At the end, the JSON and standalone HTML reports open automatically. Reports are written to `reports/`, which is ignored by Git.

## Configuration

Copy `.env.example` to `.env`. Never commit `.env` or put a real API key in `.env.example`.

| Variable         | Values                                       | Effect                                                        |
| ---------------- | -------------------------------------------- | ------------------------------------------------------------- |
| `SPEED`          | Positive number, for example `0.5`, `1`, `2` | Slows down or speeds up the visual run.                       |
| `HEADLESS`       | `true` or `false`                            | Runs without or with a visible browser.                       |
| `KEEP_OPEN`      | `true` or `false`                            | Keeps the browser open after the audit for a demo.            |
| `GEMINI_API_KEY` | Empty or a valid key                         | Enables optional per-agent comments, ratings, and priorities. |
| `GEMINI_MODEL`   | A model name                                 | Selects the Gemini model used for the optional review.        |

## AI and privacy

Without `GEMINI_API_KEY`, all six deterministic local agents run normally and no page data is sent to an AI service. With a key, the local audit still runs first; the findings are then sent to Gemini for per-agent comments, a one-to-five star rating, and up to three priorities. If Gemini is unavailable, the local report remains valid.

## Agents

| Agent              | Checks                                                                        |
| ------------------ | ----------------------------------------------------------------------------- |
| AC Accessibility   | `lang`, image `alt`, form labels, accessible button names, headings           |
| SE Security        | HTTPS, security headers, mixed content, forms, external scripts, clickjacking |
| EN Links           | Empty, invalid, and unreachable links using real HTTP checks                  |
| SC SEO and content | Title, description, viewport, Open Graph, and heading hierarchy               |
| FO Forms           | Text inputs, email validation, and submit buttons without submitting forms    |
| RE Performance     | Load timing, transfer size, image sizing, and lazy loading                    |

## Add an agent

Add an object to `AGENTS` in `src/browser/agent-lab.js`. Use `ag.inspect()` for an element finding and `ag.inspectPage()` for a page-level finding. Severities are `error`, `warn`, and `ok`.

## Scope and responsible use

This is an educational demo, not a replacement for a full security, accessibility, SEO, or performance audit. Only run it against sites you own or are authorized to test. It does not navigate beyond the loaded page, and form agents never submit forms.

## Community and license

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines and [SECURITY.md](SECURITY.md) for responsible security reports. Licensed under [MIT](LICENSE).
