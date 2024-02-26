import { getAddrsByDiscordId, getNfdsByDiscordId } from "../util.js";

type UserProfile = {
  userId: string;
  addresses: string[];
};

// Use this file to get and set user addresses and other data to database
export const putUserProfile = async (userId: string, address: string) => {
  console.log("putUserProfile", userId, address);
};

export const getUserProfile = async (userId: string) => {
  // get user profile from cache or database
  const userProfile: UserProfile | undefined = {
    userId,
    addresses: [],
  };

  // Best practice would be to cache these in an LRU cache
  const nfds = await getNfdsByDiscordId(userId);
  const addrsFromNfd = nfds?.flatMap((nfd) => [nfd.owner, ...nfd.caAlgo]);
  const addrsFromAlgoVerify = await getAddrsByDiscordId(userId);

  const merged = Array.from(
    new Set([
      ...(userProfile?.addresses || []),
      ...(addrsFromNfd ?? []),
      ...(addrsFromAlgoVerify ?? []),
    ])
  );

  return {
    userId,
    addresses: merged,
  };
};
