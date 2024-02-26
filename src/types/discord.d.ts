import { Collection, CommandInteraction } from "discord.js";

declare module "discord.js" {
  export interface Client {
    commands: Collection<
      string,
      {
        execute(interaction: CommandInteraction);
      }
    >;
  }
}
