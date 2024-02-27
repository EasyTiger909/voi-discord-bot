import { GuildMember, Role } from "discord.js";
import { managedRoles } from "./db/config.js";
import {
  getAddressBalances,
  getArc200Contract,
  getArc72Contract,
  getCreatorAssets,
} from "./network.js";

export const assignRoles = async (
  member: GuildMember,
  addresses: string[],
  preFetchedCreatorAssets?: Record<string, number[]>,
) => {
  // Get all required assets and balances for the user
  let balancesNeedToBeFetched = false;
  const creatorAssets = preFetchedCreatorAssets ?? {};
  const arc72AppIds = new Set<number>();
  const arc200AppIds = new Set<number>();

  for await (const { anyOf, allOf } of managedRoles) {
    const merged = [...(anyOf ?? []), ...(allOf ?? [])];
    for await (const req of merged) {
      if ("arc72AppId" in req) arc72AppIds.add(req.arc72AppId);
      if ("arc200AppId" in req) arc200AppIds.add(req.arc200AppId);
      if ("assetIds" in req) balancesNeedToBeFetched = true;
      if (!preFetchedCreatorAssets && "creatorAddr" in req) {
        const addrs = Array.isArray(req.creatorAddr)
          ? req.creatorAddr
          : [req.creatorAddr];
        for await (const creatorAddr of addrs) {
          if (!creatorAssets[creatorAddr])
            creatorAssets[creatorAddr] = await getCreatorAssets(creatorAddr);
        }
      }
    }
  }

  const assetBalances: Record<number, bigint> = {};
  if (balancesNeedToBeFetched || Object.keys(creatorAssets).length > 0) {
    for await (const address of addresses) {
      const balances = await getAddressBalances(address);
      Object.entries(balances).forEach(([assetId, units]) => {
        assetBalances[Number(assetId)] =
          (assetBalances[Number(assetId)] ?? 0n) + units;
      });
    }
  }

  const arc72Balances: Record<number, bigint> = {};
  for await (const appId of arc72AppIds) {
    const contract = getArc72Contract(appId);
    for await (const address of addresses) {
      const res = await contract.arc72_balanceOf(address);
      if (res.success)
        arc72Balances[appId] = (arc72Balances[appId] ?? 0n) + res.returnValue;
    }
  }

  const arc200Balances: Record<number, bigint> = {};
  for await (const appId of arc200AppIds) {
    const contract = getArc200Contract(appId);
    for await (const address of addresses) {
      const res = await contract.arc200_balanceOf(address);
      if (res.success)
        arc200Balances[appId] = (arc200Balances[appId] ?? 0n) + res.returnValue;
    }
  }

  const roleList: {
    role: Role;
    qualifies: boolean;
    added: boolean;
    removed: boolean;
  }[] = [];

  const guild = member.guild;

  for await (const { roleId, anyOf, allOf } of managedRoles) {
    const role = guild.roles.cache.get(roleId);
    if (!role) {
      console.log(`Role ${roleId} not found in Server: ${guild.name}`);
      continue;
    }
    const result = {
      role,
      qualifies: false,
      added: false,
      removed: false,
    };

    const someReq =
      anyOf?.some((req) => {
        if ("arc72AppId" in req)
          return arc72Balances[req.arc72AppId] >= req.minUnits;
        if ("arc200AppId" in req)
          return arc200Balances[req.arc200AppId] >= req.minUnits;
        if ("assetId" in req) {
          const assetIds = Array.isArray(req.assetId)
            ? req.assetId
            : [req.assetId];
          return assetIds.some((id) => assetBalances[id] >= req.minUnits);
        }
        if ("creatorAddr" in req) {
          const creatorAddrs = Array.isArray(req.creatorAddr)
            ? req.creatorAddr
            : [req.creatorAddr];
          creatorAddrs.forEach((creatorAddr) => {
            return creatorAssets[creatorAddr]?.every(
              (id) => assetBalances[id] >= req.minUnits,
            );
          });
        }
        return false;
      }) ?? true;

    const allReq =
      allOf?.every((req) => {
        if ("arc72AppId" in req)
          return arc72Balances[req.arc72AppId] >= req.minUnits;
        if ("arc200AppId" in req)
          return arc200Balances[req.arc200AppId] >= req.minUnits;
        if ("assetId" in req) {
          const assetIds = Array.isArray(req.assetId)
            ? req.assetId
            : [req.assetId];
          return assetIds.some((id) => assetBalances[id] >= req.minUnits);
        }
        if ("creatorAddr" in req) {
          const creatorAddrs = Array.isArray(req.creatorAddr)
            ? req.creatorAddr
            : [req.creatorAddr];
          creatorAddrs.forEach((creatorAddr) => {
            return creatorAssets[creatorAddr]?.every(
              (id) => assetBalances[id] >= req.minUnits,
            );
          });
        }
      }) ?? true;

    if (someReq && allReq) result.qualifies = true;

    try {
      if (result.qualifies) {
        if (!member.roles.cache.has(role.id)) {
          await member.roles.add(role);
          result.added = true;
        }
      } else {
        if (member.roles.cache.has(role.id)) {
          await member.roles.remove(role);
          result.removed = true;
        }
      }
    } catch (error) {
      console.log(
        `Unable to add/remove role ${role.name} for ${member.displayName} (Check Bot Permissions)`,
      );
    }

    roleList.push(result);
  }

  return roleList;
};
