import algosdk from "algosdk";
import { arc200, arc72 } from "ulujs";

const network = {
  name: "Voi Testnet",
  algodServer: process.env.ALGODSERVER ?? "https://testnet-api.voi.nodly.io",
  indexerServer: process.env.IDXSERVER ?? "https://testnet-idx.voi.nodly.io",
  port: process.env.PORT ?? "",
  token: process.env.TOKEN ?? "",
};

const getAlgodClient = () => {
  const { token, algodServer, port } = network;
  return new algosdk.Algodv2(token, algodServer, port);
};

const getIndexerClient = () => {
  const { token, indexerServer, port } = network;
  return new algosdk.Indexer(token, indexerServer, port);
};

export const isValidAddress = algosdk.isValidAddress;

export const getCurrentRound = async () => {
  const algodClient = getAlgodClient();
  const status = await algodClient.status().do();
  return Number(status["last-round"]);
};

export const getAddressBalances = async (address: string) => {
  const addressBalances: Record<number, bigint> = {};
  const algodClient = getAlgodClient();
  const { assets, amount } = await algodClient.accountInformation(address).do();
  addressBalances[0] = BigInt(amount);
  assets.forEach((asset: { "asset-id": unknown; amount: number }) => {
    addressBalances[Number(asset["asset-id"])] = BigInt(asset.amount);
  });
  return addressBalances;
};

export const getCreatorAssets = async (address: string) => {
  const algodClient = getAlgodClient();
  const accountInformation = await algodClient.accountInformation(address).do();
  const createdAssets = accountInformation["created-assets"] as {
    index: number;
    params: { name: string; total: number };
  }[];
  return createdAssets.map((asset) => asset.index);
};

export const getAssetHolders = async (assetId: number) => {
  const holders: { addr: string; units: bigint }[] = [];
  const indexerClient = getIndexerClient();
  const { balances } = await indexerClient.lookupAssetBalances(assetId).do();
  balances.forEach((holder: { address: string; amount: number }) => {
    if (holder.amount > 0) {
      holders.push({ addr: holder.address, units: BigInt(holder.amount) });
    }
  });
  return holders;
};

export const getArc200Contract = (contractId: number) => {
  const algodClient = getAlgodClient();
  const indexerClient = getIndexerClient();
  return new arc200(contractId, algodClient, indexerClient);
};

export const getArc72Contract = (contractId: number) => {
  const algodClient = getAlgodClient();
  const indexerClient = getIndexerClient();
  return new arc72(contractId, algodClient, indexerClient);
};
