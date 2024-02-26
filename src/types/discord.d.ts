import { Collection, CommandInteraction, ButtonInteraction } from "discord.js";

declare module "discord.js" {
  interface CommandHandler {
    execute(interaction: CommandInteraction);
  }

  interface ButtonHandler {
    execute(interaction: ButtonInteraction);
  }

  interface Client {
    commands: Collection<string, CommandHandler>;
    buttons: Collection<string, ButtonHandler>;
  }
}
