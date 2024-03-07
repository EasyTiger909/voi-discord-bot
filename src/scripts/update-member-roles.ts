import { Client } from "discord.js";
import { getUserProfile } from "../db/userProfiles.js";
import { assignRoles } from "../memberRoles.js";
import { managedRoles } from "../db/config.js";

export const run = async (client: Client) => {
  const guildList = managedRoles.map((a) => a.guildId);

  for await (const guildId of guildList) {
    const guild = client.guilds.cache.get(guildId);

    if (!guild) {
      console.log(`Client is not in Guild ${guildId}`);
      return;
    }

    const members = await guild.members.fetch();

    for await (const [, member] of members) {
      const { addresses } = await getUserProfile(member.id);

      const roleList = await assignRoles(member, addresses);

      const rolesAdded = roleList.filter((r) => r.added).map((r) => r.role);
      const rolesRemoved = roleList.filter((r) => r.removed).map((r) => r.role);

      if (rolesAdded.length + rolesRemoved.length > 0) {
        let line = `Role Update for ${member.user.username} in ${guild.name}: `;
        if (rolesAdded.length > 0)
          line += ` Added: ${rolesAdded.map((r) => r.name).join(", ")}`;
        if (rolesRemoved.length > 0)
          line += ` Removed: ${rolesRemoved.map((r) => r.name).join(", ")}`;
        console.log(line);
      }
    }
  }
};
