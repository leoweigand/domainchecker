# Domain Checker Bot

A Telegram bot that checks domain availability using Cloudflare and Porkbun
APIs.

## Local Development

1. Install
   [1Password CLI](https://developer.1password.com/docs/cli/get-started/)

2. Copy `.env.example` to `.env` and update with your 1Password secret
   references

3. Store your API credentials in 1Password:
   - **Cloudflare API Token**: Create at
     https://dash.cloudflare.com/profile/api-tokens
     - Permission: `Account.Registrar Domains - Read`
   - **Porkbun API Keys**: Get from https://porkbun.com/account/api

4. Run locally:
   ```bash
   deno task dev    # Start dev server with hot reload
   deno task test   # Run integration tests
   ```

The `dev` and `test` tasks automatically inject secrets using
`op run --env-file=.env`.

## Deployment

1. Set environment variables in Deno Deploy:
   - `TELEGRAM_BOT_TOKEN`
   - `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
   - `PORKBUN_API_KEY`, `PORKBUN_SECRET_KEY`

2. Deploy to Deno Deploy:
   ```bash
   deployctl deploy --project=your-project index.ts
   ```

3. Set Telegram webhook:
   ```bash
   curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
     -d url=https://your-project.deno.dev/
   ```

## Usage

Send any domain name to the bot (e.g., `example.com`) and it will check
availability and pricing.

## License

MIT
