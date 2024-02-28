# voi-discord-bot

Install Node JS 18+

Install packages by running `npm install`

No database is included with this version. Discord user addresses are found by looking up from the NFD API and the AlgoVerify API

- **NFD**: https://api-docs.nf.domains/reference/integrators-guide/discord-telegram-bots

- **AlgoVerify**: https://www.algoverify.me/api-docs

Refer to example.env for setting up .env/environment variables for securing the Discord `BOT_TOKEN`

Other configurations are included in db/config.ts

# Features

### Scheduled Tasks

Included script updates all users roles on a schedule

### Slash Commands

`/roles` slash command will update the users Discord roles on-demand

`/flex` slash command will use NFT Navigator Indexer API to pull ARC-72 tokens held and display media to channel

### Listings and Sales Announcements

Checks NFT Navigator (ARC-72 Indexer) API every 60 seconds and posts listings and sales to configured channels

### ARC200 tips (later)

Need to allow for choosing destination when recipient has multiple addresses

## Typescript

Typescript (.ts) files are developed in the `./src` directory

The command `tsc` or `npm run build` will build the .ts files into regular Javascript (.js) files and drop into the `./dist` directory
