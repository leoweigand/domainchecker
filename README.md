# Domain Checker Bot

A Telegram bot that checks domain availability using Cloudflare and Porkbun
APIs.

## Setup

1. Set environment variables in Deno Deploy:
   - `TELEGRAM_BOT_TOKEN`
   - `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_EMAIL`
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
