// Define the scheduled scripts here. https://crontab.guru for reference
// prepending a 6th field for seconds
export const scheduledScripts: {
  cronTime: string;
  scriptName: string;
}[] = [
  {
    //example: update all member roles everyday at 9:25am and 9:25pm
    cronTime: "0 25 9,21 * * *",
    scriptName: "update-member-roles",
  },
  {
    cronTime: "0 0,15,30,45 * * * *",
    scriptName: "some-test-script",
  },
];

type RoleRequirement =
  | { arc72AppId: number; minUnits: bigint }
  | { arc200AppId: number; minUnits: bigint }
  | { assetId: number | number[]; minUnits: bigint }
  | { creatorAddr: string | string[]; minUnits: bigint };

// Define the roles that the bot will manage here.
// Roles can have lists of various requirements
// For requirements listed in the allOf list, all must be met
// For requirements listed in the anyOf list, at least one must be met
// Requirements can be a combination of the following:
//  - Amount of tokens held by an arc72AppId
//  - Amount of tokens held by an arc200AppId
//  - Amount of standard assets held of a single or list of assetIds (ALGO/VOI treated as assetId 0)
//  - Amount of standard assets held of a single or list of creator address
//
export const managedRoles: {
  roleId: string;
  anyOf?: RoleRequirement[];
  allOf?: RoleRequirement[];
}[] = [
  {
    // allOf example: this role requires holding at least 1 unit of both of these ARC72 collections
    roleId: "1042914189993328761",
    allOf: [
      { arc72AppId: 26948330, minUnits: 1n },
      { arc72AppId: 29087777, minUnits: 1n },
    ],
  },
  {
    // anyOf example: this role requires holding at least 10 VOI OR 10 Testnet VIA
    roleId: "1068974591621484584",
    anyOf: [
      { assetId: 0, minUnits: 10000000n },
      { arc200AppId: 6779767, minUnits: 10000000n },
    ],
  },
  {
    // combo example: this role requires holding:
    //   at least 1 unit of an asset created by an account AND
    //   at least one of either a certain asset or a token from example arc72 collection
    roleId: "1068974591621484500",
    allOf: [
      {
        creatorAddr:
          "VINY6VJDHYYSKTRE54XHOUMS5ISV6A5XHOV3HMMLBNJNHNLIMYFRMLLXOI",
        minUnits: 1n,
      },
    ],
    anyOf: [
      { arc72AppId: 29085927, minUnits: 1n },
      { assetId: [29085936, 29081514], minUnits: 1n },
    ],
  },
];

export const marketEventSettings: {
  contractId: number | number[];
  listChannelId?: string;
  salesChannelId?: string;
}[] = [
  {
    // Example: Announce events from a single collection
    contractId: 29081122,
    listChannelId: "1193965879558414386",
    salesChannelId: "1193965879558414386",
  },
  {
    // Example: Announce events from a list of collections
    contractId: [26178469, 29085927],
    listChannelId: "1201927960932921425",
    salesChannelId: "1201927960932921425",
  },
  {
    // Example: Announce events from ALL collections
    contractId: 0,
    listChannelId: "1212475011982692412",
    salesChannelId: "1212474992462401566",
  },
];
