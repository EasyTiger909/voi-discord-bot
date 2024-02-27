import { Client, Events, GatewayIntentBits } from "discord.js";
import * as dotenv from "dotenv";
import {
  deployApplicationCommands,
  deployGuildCommands,
  getButtons,
  getCommands,
} from "./interactions.js";
import { runMarketEvents } from "./marketEvents.js";
import { scheduleScripts } from "./scripts.js";

dotenv.config();

const token = process.env.BOT_TOKEN ?? "";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.commands = await getCommands();
client.buttons = await getButtons();

client.once(Events.ClientReady, async () => {
  scheduleScripts(client);
  runMarketEvents(client);

  if (process.env.DEPLOY_COMMANDS_ON_STARTUP === "Y") {
    const clientId = client.user?.id;
    if (clientId) {
      // Application Commands: can be used in any server and in DMs
      const appCmds = await deployApplicationCommands(clientId);
      console.log(`Deployed ${appCmds} Application Commands`);

      // Guild Commands: can only be used in servers they are deployed to
      const guildId = process.env.GUILD_ID ?? "";
      const guildCmds = await deployGuildCommands(clientId, guildId);
      console.log(`Deployed ${guildCmds} commands to ${guildId}`);
    }
  }

  console.log("Running");
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (command) await command.execute(interaction);
    } else if (interaction.isButton()) {
      const button = client.buttons.get(
        interaction.customId.split("-")[0] ?? "",
      );
      if (button) await button.execute(interaction);
    }
  } catch (error) {
    console.log(error);
  }
});

client.on(Events.Error, async (error) => {
  console.log(error);
});

await client.login(token);
