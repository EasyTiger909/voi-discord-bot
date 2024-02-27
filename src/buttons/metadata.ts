import { ButtonInteraction, EmbedBuilder } from "discord.js";
import { getArc72FromIndexer } from "../util.js";

export const name = "metadata";

export const execute = async (interaction: ButtonInteraction) => {
  const tokenType = interaction.customId.split("-")[1] as "asa" | "arc72";
  const contractId = Number(interaction.customId.split("-")[2]);
  const tokenId = Number(interaction.customId.split("-")[3]);

  if (tokenType === "asa") {
    await interaction.reply({
      content: "Metadata not yet available for this token type",
      ephemeral: true,
    });
    return;
  }

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
