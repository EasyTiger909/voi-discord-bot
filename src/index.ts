import { CronJob } from "cron";
import { Client, Collection, Events, GatewayIntentBits } from "discord.js";
import * as dotenv from "dotenv";
import * as fs from "node:fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { deployApplication, deployGuild } from "./commandDeployment.js";
import { scheduledScripts } from "./config.js";

dotenv.config();

const token = process.env.BOT_TOKEN ?? "";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});
client.commands = new Collection();

const fileName = fileURLToPath(import.meta.url);
const dirName = path.dirname(fileName);

const commandFiles = fs
  .readdirSync(path.join(dirName, "commands"))
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = await import(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

const runScript = async (scriptName: string, client: Client) => {
  try {
    const script = await import(`./scripts/${scriptName}.js`);
    await script.run(client);
  } catch (error) {
    console.log(error);
  }
};

client.once(Events.ClientReady, async () => {
  scheduledScripts.forEach((t) => {
    const task = new CronJob(
      t.cronTime,
      () => {
        void runScript(t.scriptName, client);
      },
      null,
      false,
      t.timeZone
    );
    task.start();
    console.log(`Scheduled script '${t.scriptName}' for ${t.cronTime}`);
  });

  if (process.env.DEPLOY_COMMANDS_ON_STARTUP === "Y") {
    const clientId = client.user?.id;
    if (clientId) {
      // Application Commands: can be used in any server and in DMs
      const appCmds = await deployApplication(clientId);
      console.log(`Deployed ${appCmds} Application Commands`);

      // Guild Commands: can only be used in servers they are deployed to
      const guildId = process.env.GUILD_ID ?? "";
      const guildCmds = await deployGuild(clientId, guildId);
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
    }
  } catch (error) {
    console.log(error);
  }
});

client.on(Events.Error, async (error) => {
  console.log(error);
});

await client.login(token);
