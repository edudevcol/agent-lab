# Security Policy

## Responsible use

Agent Lab is an educational QA tool. Only scan websites you own or are explicitly authorized
to test. The tool checks the loaded page and must not be used to probe third-party systems.

## Secrets

- Keep `GEMINI_API_KEY` only in `.env` or in the process environment.
- Never put a real key in `.env.example`, README files, reports, or issues.
- If a key has been committed or shared, revoke it and create a new one immediately.

## Reporting a vulnerability

Do not open a public issue with credentials, personal data, or exploit details. Contact the
maintainer privately with the affected version, reproduction steps, impact, and a suggested fix.
