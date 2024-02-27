import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  ComponentType,
  EmbedBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import { getUserProfile } from "../db/userProfiles.js";
import { addrShortened, getAddrArc72FromIndexer } from "../util.js";
export const data = new SlashCommandBuilder()
  .setName("flex")
  .setDescription("Flex NFT media that you hold")
  .addIntegerOption((option) =>
    option.setName("id").setDescription("Enter App ID of token"),
  );

export const execute = async (interaction: CommandInteraction) => {
  const { id: userId } = interaction.user;

  const { addresses } = await getUserProfile(userId);

  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("addresses")
      .setLabel("Addresses")
      .setStyle(ButtonStyle.Primary),
  );

  if (addresses.length === 0) {
    await interaction.reply({
      content: "No addresses found for this Discord account.",
      components: [buttons],
      ephemeral: true,
    });
    return;
  }

  const input = interaction.options.get("id")?.value as number | undefined;

  const arc72matches = await getAddrArc72FromIndexer(addresses, input);

  if (arc72matches.length === 0) {
    await interaction.reply({
      content: [
        "Using addresses:",
        ...addresses.map((a) => {
          return `- ${addrShortened(a, 8)}`;
        }),
        `Unable to verify holding ` +
          (input ? `a token from \`${input}\`` : "any ARC-72 NFTs"),
      ].join("\n"),
      components: [buttons],
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({ content: "…" });

  const review = [
    "Using addresses:",
    ...addresses.map((a) => {
      return `- ${addrShortened(a, 8)}`;
    }),
  ].join("\n");

  const selectMenu =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("preference-select")
        .setPlaceholder("Select NFT…")
        .addOptions(
          arc72matches.slice(0, 25).map((m) => ({
            label: m.metadata?.name ?? `${m.tokenId}`,
            description: `App ID: ${m.contractId} Token ID: ${m.tokenId}`,
            value: `${m.contractId}-${m.tokenId}`,
          })),
        ),
    );

  const msgSelect = await interaction.followUp({
    content: review,
    components: [selectMenu, buttons],
    ephemeral: true,
  });

  try {
    const menuInteraction = await msgSelect.awaitMessageComponent({
      componentType: ComponentType.StringSelect,
      time: 60000,
    });
    await menuInteraction.update({ components: [] });

    const selectedNft = arc72matches.find(
      (t) => `${t.contractId}-${t.tokenId}` === menuInteraction.values[0],
    );

    const { contractId, tokenId, metadata } = selectedNft!;

    if (!metadata?.image) {
      await interaction.editReply({
        content: `No media found for this NFT `,
        components: [],
        message: msgSelect.id,
      });
      return;
    }

    const confirmButtons = new ActionRowBuilder<ButtonBuilder>().addComponents([
      new ButtonBuilder()
        .setCustomId("post")
        .setLabel("Post to Channel")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("cancel")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Danger),
    ]);

    const confirmMsg = await interaction.editReply({
      content: `Post this media to channel? ${metadata.image}`,
      components: [confirmButtons],
      message: msgSelect.id,
    });

    const confirmInteraction = await confirmMsg.awaitMessageComponent({
      componentType: ComponentType.Button,
      time: 60000,
    });

    await confirmInteraction.update({ components: [] });

    if (confirmInteraction.customId === "post") {
      const postEmbed = new EmbedBuilder()
        .setTitle(metadata.name)
        .setImage(metadata.image);

      const postButtons = new ActionRowBuilder<ButtonBuilder>().addComponents([
        new ButtonBuilder()
          .setLabel("View Metadata")
          .setStyle(ButtonStyle.Primary)
          .setCustomId(`metadata-arc72-${contractId}-${tokenId}`),
        new ButtonBuilder()
          .setLabel("NFT Navigator")
          .setURL(
            `https://nftnavigator.xyz/collection/${contractId}/token/${tokenId}`,
          )
          .setStyle(ButtonStyle.Link),
        new ButtonBuilder()
          .setLabel("Nautilus")
          .setURL(
            `https://nautilus.sh/#/collection/${contractId}/token/${tokenId}`,
          )
          .setStyle(ButtonStyle.Link),
      ]);

      await interaction.editReply({
        content: "",
        embeds: [postEmbed],
        components: [postButtons],
      });

      await interaction.editReply({
        content: `Posted`,
        embeds: [],
        message: confirmMsg.id,
      });
    } else {
      throw new Error("Cancelled");
    }
  } catch (error) {
    await interaction.editReply({
      content: "Cancelled",
      components: [],
      message: msgSelect.id,
    });
    await interaction.deleteReply();
  }
};
