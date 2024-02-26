# voi-discord-bot

Install Node JS 18+

Install packages by running `npm install`

No database is included with this version. Discord user addresses are found by looking up from the NFD API and the AlgoVerify API

- **NFD**: https://api-docs.nf.domains/reference/integrators-guide/discord-telegram-bots

- **AlgoVerify**: https://www.algoverify.me/api-docs

# Features

Refer to example.env to use .env or environment variables for securing the Discord BOT_TOKEN

Other configurations are included in config.ts

### Roles

Slash command `/roles` will update the users Discord roles on-demand

An included script updates all users roles on a schedule

### Flex (soon)

Will use NFT Navigator Indexer API to pull image URI and metadata

### Listings and Sales Announcements (later)

Will require reading listing and sales events from ARC-72 contracts

### ARC200 tips (later)

Will require a database to save a recipients preferred withdraw address.

## Typescript

Typescript (.ts) files are developed in the `./src` directory

The command `tsc` or `npm run build` will build the .ts files into regular Javascript (.js) files and drop into the `./dist` directory
