import { REST, Routes } from "discord.js";
import * as dotenv from "dotenv";
import * as fs from "node:fs";
import * as path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const token = process.env.BOT_TOKEN ?? "";

const fileName = fileURLToPath(import.meta.url);
const dirName = path.dirname(fileName);
const commandFiles = fs
  .readdirSync(path.join(dirName, "commands"))
  .filter((file) => file.endsWith(".js"));

export const deployApplication = async (clientId: string) => {
  const commands = [];

  for (const file of commandFiles) {
    const command = await import(`./commands/${file}`);
    if (command.deploymentGroup === "application") {
      commands.push(command.data.toJSON());
    }
  }

  if (commands.length === 0) return 0;

  const rest = new REST({ version: "10" }).setToken(token);
  try {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    return commands.length;
  } catch (error) {
    console.log(`Error Deploying Application Commands`, error);
    return 0;
  }
};

export const deployGuild = async (clientId: string, guildId: string) => {
  const commands = [];

  for (const file of commandFiles) {
    const command = await import(`./commands/${file}`);
    if (command.deploymentGroup !== "application") {
      commands.push(command.data.toJSON());
    }
  }

  if (commands.length === 0) return 0;

  const rest = new REST({ version: "10" }).setToken(token);

  console.log(`Starting deployment of ${commands.length} guild (/) commands.`);
  try {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });
    return commands.length;
  } catch (error) {
    console.log(`Error Deploying Commands to ${guildId}`, error);
    return 0;
  }
};
