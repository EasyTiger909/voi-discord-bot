import { CronJob } from "cron";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  Collection,
  EmbedBuilder,
  TextChannel,
  time,
} from "discord.js";
import { marketEventSettings } from "./db/config.js";
import { getCurrentRound } from "./network.js";
import {
  addrShortened,
  getArc72FromIndexer,
  getArc72Listings,
  getArc72Sales,
  getNfdByAddr,
} from "./util.js";

const currencyLookup = {
  0: { symbol: "VOI", decimals: 6 },
  6779767: { symbol: "VIA", decimals: 6 },
};

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
    ({ contractId: contractId, listChannelId, salesChannelId }) => {
      const setting = [
        Array.isArray(contractId)
          ? contractId.map((c) => c.toString()).join(", ")
          : contractId === 0
            ? "ALL"
            : contractId,
      ];

      const listChannel = channels.get(listChannelId ?? "");
      if (listChannel)
        setting.push(`Listings will be announced in #${listChannel.name}.`);

      const salesChannel = channels.get(salesChannelId ?? "");
      if (salesChannel)
        setting.push(`Sales will be announced in #${salesChannel.name}.`);

      if (setting.length > 1) console.log(setting.join(" "));
    },
  );

  // Get starting round
  const currentRound = await getCurrentRound();
  const rounds = {
    listingRound: currentRound,
    salesRound: currentRound,
  };
  console.log(`Checking market events beginning at round ${currentRound}...`);

  // Schedule the job
  const job = new CronJob(
    "0 * * * * *", // every minute
    async () => {
      await checkMarketEvents(rounds, channels);
    },
    null,
    false,
  );
  job.start();
};

const checkMarketEvents = async (
  rounds: { listingRound: number; salesRound: number },
  channels: Collection<string, TextChannel>,
) => {
  const listingResponse = await getArc72Listings(rounds.listingRound);
  const salesResponse = await getArc72Sales(rounds.salesRound);

  const events = [...listingResponse.listings, ...salesResponse.sales];

  for await (const event of events) {
    const { contractId, tokenId, eventType } = event;
    const settings = marketEventSettings.filter((a) => {
      const contractList = Array.isArray(a.contractId)
        ? a.contractId
        : [a.contractId];
      return contractList.includes(contractId) || a.contractId === 0;
    });

    // Skip this event if no announcement is configured
    if (settings.length === 0) continue;

    const nft = await getArc72FromIndexer(contractId, tokenId);
    if (!nft?.metadata) continue;

    const { metadata } = nft;
    if (!metadata) continue;

    const postEmbed = new EmbedBuilder().setImage(metadata.image);

    const currency = currencyLookup[event.currency];
    const price = `${event.price / 10 ** currency.decimals} ${currency.symbol}`;

    const seller =
      (await getNfdByAddr(event.seller)) ?? addrShortened(event.seller, 6);

    if (eventType === "listing") {
      postEmbed.setTitle(`${metadata.name} (New Listing)`);
      postEmbed.setDescription(
        [
          `**Seller**: ${seller}`,
          `**Price**: ${price}`,
          `**Time** ${time(new Date(event.timestamp * 1000))}`,
        ].join("\n"),
      );
    }
    if (eventType === "sale") {
      postEmbed.setTitle(`${metadata.name} Sold!`);
      const buyer =
        (await getNfdByAddr(event.buyer)) ?? addrShortened(event.buyer, 6);
      postEmbed.setDescription(
        [
          `**Seller**: ${seller}`,
          `**Buyer**: ${buyer}`,
          `**Price**: ${price}`,
          `**Time** ${time(new Date(event.timestamp * 1000))}`,
        ].join("\n"),
      );
    }

    console.log(
      `posting event: ${metadata.name} ${contractId}-${tokenId} ${eventType}`,
    );

    const postButtons = new ActionRowBuilder<ButtonBuilder>().addComponents([
      new ButtonBuilder()
        .setLabel("👓️ Details")
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
      if (eventType === "listing" && setting.listChannelId) {
        const channel = channels.get(setting.listChannelId);
        if (channel)
          try {
            await channel.send({
              embeds: [postEmbed],
              components: [postButtons],
            });
          } catch (e) {
            console.log(
              `Unable to send message to channel ${setting.listChannelId} for event ${metadata.name} ${contractId}-${tokenId} ${eventType}`,
            );
          }
      }
      if (eventType === "sale" && setting.salesChannelId) {
        const channel = channels.get(setting.salesChannelId);
        if (channel)
          try {
            await channel.send({
              embeds: [postEmbed],
              components: [postButtons],
            });
          } catch (e) {
            console.log(
              `Unable to send message to channel ${setting.salesChannelId} for event ${metadata.name} ${contractId}-${tokenId} ${eventType}`,
            );
          }
      }
    }
  }

  rounds.listingRound = listingResponse.currentRound;
  rounds.salesRound = salesResponse.currentRound;
};
