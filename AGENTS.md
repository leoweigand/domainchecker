# Instructions for agents

For detailed setup, development, and deployment instructions, please refer to
the `README.md` file. This document provides a higher-level technical overview
and summarizes the project's conventions.

## Project Overview

This is a Telegram bot that checks domain name availability using the Porkbun
API. The bot is built with Deno and TypeScript and is designed to be deployed on
Deno Deploy.

The bot uses a whitelist of allowed Telegram usernames, configured via the
`ALLOW_HANDLES` environment variable. It also uses Deno's built-in Key-Value
store (`Deno.Kv`) to cache the list of supported TLDs from the Porkbun API for
improved performance.

## Development Conventions

- **Secrets Management:** Secrets are managed using 1Password for local
  development and environment variables in production (Deno Deploy), as detailed
  in the `README.md`.
- **Task Runner:** Common commands for development (`dev`, `test`) and
  deployment (`webhook`) are managed as Deno tasks in `deno.jsonc`.
- **Linting:** The project uses Deno's built-in linter with the recommended
  rules defined in `deno.jsonc`.
- **Testing:** Tests are run via `deno task test`. They are integration tests
  that require network access and API credentials.
- **Modularity:** The codebase is organized into modules with clear
  responsibilities:
  - `index.ts`: Main entry point for Deno Deploy.
  - `webhook.ts`: Core bot logic and Telegram webhook handler.
  - `lib/porkbun.ts`: Porkbun API client.
  - `lib/telegram.ts`: Helper functions for the Telegram Bot API.
  - `lib/types.ts`: Core data structures.
  - `lib/utils.ts`: Utility functions (e.g., domain validation).
  - `lib/kv.ts`: Manages caching to the Deno KV store.
