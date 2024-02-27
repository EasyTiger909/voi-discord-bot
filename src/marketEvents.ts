import { CronJob } from "cron";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  Collection,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import { marketEventSettings } from "./db/config.js";
import { getCurrentRound } from "./network.js";
import { getArc72Events, getArc72FromIndexer } from "./util.js";

export const runMarketEvents = async (client: Client) => {
  // Create a collection of channel references
  const channels = marketEventSettings.reduce(
    (acc, { listChannelId, salesChannelId }) => {
      if (listChannelId) {
        const listChannel = client.channels.cache.get(listChannelId);
        if (listChannel?.type === 0) {
          acc.set(listChannel.id, listChannel);
        } else {
          console.log(
            `Unable to find or configure ${listChannelId} as a Text Channel for Market events.`,
          );
        }
      }
      if (salesChannelId) {
        const salesChannel = client.channels.cache.get(salesChannelId);
        if (salesChannel?.type === 0) {
          acc.set(salesChannel.id, salesChannel);
        } else {
          console.log(
            `Unable to find or configure ${salesChannelId} as a Text Channel for Market events.`,
          );
        }
      }
      return acc;
    },
    new Collection<string, TextChannel>(),
  );

  // Summarize event settings to console
  marketEventSettings.forEach(
    ({ contractIds, listChannelId, salesChannelId }) => {
      const setting = [
        Array.isArray(contractIds)
          ? contractIds.map((c) => c.toString()).join(", ")
          : contractIds === 0
            ? "ALL"
            : contractIds,
      ];

      const listChannel = channels.get(listChannelId ?? "");
      if (listChannel)
        setting.push(`Listings will be announced in ${listChannel.name}.`);

      const salesChannel = channels.get(salesChannelId ?? "");
      if (salesChannel)
        setting.push(`Sales will be announced in ${salesChannel.name}.`);

      if (setting.length > 1) console.log(setting.join(" "));
    },
  );

  // Get starting round
  let currentRound = await getCurrentRound();
  console.log(`Checking market events beginning at round ${currentRound}...`);

  // Schedule the job
  const job = new CronJob(
    "0 * * * * *", // every minute
    async () => {
      currentRound = await checkMarketEvents(currentRound, channels);
    },
    null,
    false,
  );
  job.start();
};

const checkMarketEvents = async (
  minRound: number,
  channels: Collection<string, TextChannel>,
) => {
  console.log("Checking market events…", minRound);

  const marketEvents = await getArc72Events(minRound);
  if (!marketEvents) return minRound;

  for await (const { contractId, tokenId, eventType } of marketEvents.events) {
    const settings = marketEventSettings.filter((a) => {
      const contractList = Array.isArray(a.contractIds)
        ? a.contractIds
        : [a.contractIds];
      contractList.includes(contractId) || a.contractIds === 0;
    });

    // Skip this event if no announcement is configured
    if (settings.length === 0) continue;

    const nft = await getArc72FromIndexer(contractId, tokenId);
    if (!nft?.metadata) continue;

    const { metadata } = nft;
    if (!metadata) continue;

    const postEmbed = new EmbedBuilder()
      .setDescription(metadata.name)
      .setImage(metadata.image)
      .setFooter({ text: "Open Source bot by Algo Leagues team" });

    if (eventType === "list") postEmbed.setTitle("New Listing!");
    if (eventType === "sale") postEmbed.setTitle("New Sale!");

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

    for await (const setting of settings) {
      if (eventType === "list" && setting.listChannelId) {
        const channel = channels.get(setting.listChannelId);
        if (channel)
          await channel.send({
            embeds: [postEmbed],
            components: [postButtons],
          });
      }
      if (eventType === "sale" && setting.salesChannelId) {
        const channel = channels.get(setting.salesChannelId);
        if (channel)
          await channel.send({
            embeds: [postEmbed],
            components: [postButtons],
          });
      }
    }
  }

  return marketEvents.lastRound;
};
