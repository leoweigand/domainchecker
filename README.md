# Domain Checker Bot

A Telegram bot that checks domain availability using the Domainr API.

> [!note] Due to api usage limits, this bot is only enabled for allowlisted
> Telegram handles but you can easily deploy your own following the instructions
> below.

## Local Development

1. Copy `.env.example` to `.env` and update with your credentials

2. Get your API credentials:
   - **Domainr RapidAPI Key**: Get from https://rapidapi.com/domainr/api/domainr
   - Sign up for RapidAPI and subscribe to the Domainr API (free tier available)
   - **Telegram Bot Token**: Get from [@BotFather](https://t.me/botfather)

3. Run locally:
   ```bash
   deno task dev    # Start dev server with hot reload
   deno task test   # Run integration tests
   ```

4. For local testing with Telegram, you need a public URL (use ngrok or
   Cloudflare Tunnels):
   ```bash
   # Start dev server
   deno task dev

   # Set webhook to your tunnel URL
   deno task webhook https://your-tunnel-url/

   # Verify webhook is set
   deno task webhook:info
   ```

## Deployment

1. Set environment variables in Deno Deploy:
   - `TELEGRAM_BOT_TOKEN`
   - `DOMAINR_RAPIDAPI_KEY`
   - `ALLOW_HANDLES` (required) - Comma-separated list of allowed Telegram
     usernames (without @). Example: `user1,user2,user3`

2. Deploy to Deno Deploy:
   ```bash
   deployctl deploy --project=your-project index.ts
   ```

3. Set Telegram webhook:
   ```bash
   deno task webhook https://your-project.deno.dev/
   ```

   Or verify current webhook status:
   ```bash
   deno task webhook:info
   ```

## Usage

Send any domain name to the bot (e.g., `example.com`) and it will check
availability.

## License

MIT
