import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { getUserProfile } from "../db/userProfiles.js";
import { assignRoles } from "../memberRoles.js";
import { addrShortened } from "../util.js";

export const data = new SlashCommandBuilder()
  .setName("roles")
  .setDescription("Update your Discord roles");

export const execute = async (interaction: CommandInteraction) => {
  await interaction.deferReply({ ephemeral: true });

  const { id: userId } = interaction.user;

  const member = interaction.guild?.members.cache.get(userId);
  if (!member) return;

  const { addresses } = await getUserProfile(userId);

  const managedRoleList = await assignRoles(member, addresses);

  const summary = [
    "## Managed Roles:",
    addresses.length === 0 ? "No addresses found" : "Using addresses:",
    ...addresses.map((a) => {
      return `- ${addrShortened(a, 8)}`;
    }),
    ...managedRoleList.map((r) => {
      return `**${r.role.name}**: ${r.qualifies ? "✅️" : "⌛️"}${r.added ? "*Added!*" : ""}${r.removed ? "*Removed*" : ""}`;
    }),
  ];
  await interaction.editReply(summary.join("\n"));
};
