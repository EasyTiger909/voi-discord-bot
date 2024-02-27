import { getCurrentRound } from "./network.js";

export function shuffle<T>(array: T[]): T[] {
  let randomIndex;
  let currentIndex = array.length;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
}

export function chunk<T>(array: T[], size: number): T[][] {
  const components: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    const group = array.slice(i, i + size);
    components.push(group);
  }
  return components;
}

export function getRandom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function addrShortened(
  addr: string,
  prefix = 4,
  suffix: number = prefix,
): string {
  return addr.length >= prefix + suffix
    ? `${addr.slice(0, prefix)}…${addr.slice(-suffix)}`
    : addr;
}

type NfdDiscordLookupResponse = {
  appID: number;
  parentAppID: number;
  asaID: number;
  state: string;
  nfdAccount: string;
  name: string;
  owner: string;
  metaTags: string[];
  category: string;
  saleType: string;
  caAlgo: string[];
  depositAccount: string;
  properties: Record<string, unknown>;
};

export const getNfdsByDiscordId = async (userId: string) => {
  const res = await fetch(
    `https://api.nf.domains/nfd/v2/search?vproperty=discord&vvalue=${userId}`,
  );
  if (res.status === 200) {
    const resJson = await res.json();
    if (resJson.nfds) {
      const nfds: NfdDiscordLookupResponse[] = resJson.nfds;
      return nfds.map((nfd) => {
        return {
          appID: nfd.appID,
          parentAppID: nfd.parentAppID,
          asaID: nfd.asaID,
          state: nfd.state,
          nfdAccount: nfd.nfdAccount,
          name: nfd.name,
          owner: nfd.owner,
          metaTags: nfd.metaTags,
          category: nfd.category,
          saleType: nfd.saleType,
          caAlgo: nfd.caAlgo,
          depositAccount: nfd.depositAccount,
          properties: nfd.properties,
        };
      });
    }
  }
};

export const getAddrsByDiscordId = async (userId: string) => {
  const res = await fetch(`https://algoverify.me/api/discordId/${userId}`);
  if (res.status === 200) {
    const resJson = await res.json();
    if (resJson.userWallets) {
      const userWallets: { wallet: string }[] = resJson.userWallets;
      return userWallets.map((w) => w.wallet);
    }
  }
};

type Arc72IndexerToken = {
  contractId: number;
  tokenId: number;
  owner: string;
  metadataURI?: string;
  metadata?: {
    name: string;
    description: string;
    external_url?: string;
    image: string;
    image_integrity: string;
    image_mimetype: string;
    properties: Record<string, string>;
    royalties: string;
  };
  approved: string;
  mintRound?: number;
};

export const getAddrArc72FromIndexer = async (
  addr: string | string[],
  contractId?: number,
) => {
  const addresses = Array.isArray(addr) ? addr : [addr];

  const tokens: Arc72IndexerToken[] = [];
  for await (const address of addresses) {
    const endpoint = "https://arc72-idx.voirewards.com/nft-indexer/v1/tokens?";
    const res = await fetch(
      `${endpoint}owner=${address}${contractId ? `&contractId=${contractId}` : ""}`,
    );

    if (res.status === 200) {
      const resJson = await res.json();
      if (resJson.tokens) {
        tokens.push(
          ...resJson.tokens.map((token: Record<string, unknown>) => {
            return {
              contractId: token.contractId,
              tokenId: token.tokenId,
              owner: token.owner,
              metadataURI: token.metadataURI,
              metadata: JSON.parse(String(token.metadata)),
              approved: token.approved,
              mintRound: token["mint-round"],
            };
          }),
        );
      }
    }
  }
  return tokens;
};

export const getArc72FromIndexer = async (
  contractId: number,
  tokenId: number,
) => {
  const endpoint = "https://arc72-idx.voirewards.com/nft-indexer/v1/tokens?";
  const res = await fetch(
    `${endpoint}contractId=${contractId}&tokenId=${tokenId}`,
  );

  if (res.status === 200) {
    const resJson = await res.json();
    if (resJson.tokens) {
      if (resJson.tokens.length > 0) {
        const token = resJson.tokens[0];
        const parsedToken: Arc72IndexerToken = {
          contractId: token.contractId,
          tokenId: token.tokenId,
          owner: token.owner,
          metadataURI: token.metadataURI,
          metadata: JSON.parse(String(token.metadata)),
          approved: token.approved,
          mintRound: token["mint-round"],
        };
        return parsedToken;
      }
    }
  }
};

// DRAFT: NOT IMPLEMENTED YET
export const getArc72Events = async (minRound: number) => {
  const endpoint = "https://arc72-idx.voirewards.com/nft-indexer/v1/tokens?";
  const res = await fetch(`${endpoint}minRound=${minRound}`);
  const events: {
    contractId: number;
    tokenId: number;
    eventType: "list" | "sale";
    price: { token: string; units: bigint };
  }[] = [];

  if (res.status === 200) {
    const resJson = await res.json();
    if (resJson.events) {
      events.push(
        ...resJson.events.map((event: Record<string, unknown>) => {
          return {
            contractId: event.contractId,
            tokenId: event.tokenId,
            eventType: event.eventType,
            price: event.price,
          };
        }),
      );
    }
    const lastRound = resJson.currentRound
      ? Number(resJson.currentRound)
      : // Fallback until indexer implements this endpoint
        await getCurrentRound();

    return { events, lastRound };
  }
  return { events, lastRound: await getCurrentRound() };
};
