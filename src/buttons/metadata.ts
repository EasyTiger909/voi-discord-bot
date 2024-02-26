import { ButtonInteraction, EmbedBuilder } from "discord.js";
import { getArc72FromIndexer } from "../util.js";

export const id = "metadata";

export const execute = async (interaction: ButtonInteraction) => {
  const contractId = Number(interaction.customId.split("-")[2]);
  const tokenId = Number(interaction.customId.split("-")[3]);

  const t = await getArc72FromIndexer(contractId, tokenId);

  if (!t?.metadata?.properties) {
    await interaction.reply({
      content: "No metadata found for this token",
      ephemeral: true,
    });
    return;
  }

  const properties = Object.entries(t.metadata.properties).map(([k, v]) => {
    return `**${k}**: ${v}`;
  });

  const embed = new EmbedBuilder()
    .setTitle(t.metadata.name)
    .setDescription([`*${t.metadata.description}*`, ...properties].join("\n"))
    .setThumbnail(t.metadata.image);

  await interaction.reply({ embeds: [embed], ephemeral: true });
};
