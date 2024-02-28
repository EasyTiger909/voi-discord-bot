import { ButtonInteraction } from "discord.js";

export const execute = async (interaction: ButtonInteraction) => {
  const content = [
    "This Discord Bot supports 2 options for adding an address to your Discord account:",
    " - **NFD**: Add you Discord account to your NFD and verify in their Discord server: https://discord.gg/7XcuMTfeZP",
    "- **AlgoVerify**: Connect your wallet and Discord account to be added to the AlgoVerify database here: https://www.algoverify.me/",
  ].join("\n");

  await interaction.reply({ content, ephemeral: true });
};
