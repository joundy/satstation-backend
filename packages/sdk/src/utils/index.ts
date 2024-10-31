import { networks } from "bitcoinjs-lib";
import { Network } from "../types";
import { AddressType } from "../addresses";
import { getAddressInfo } from "bitcoin-address-validation";

export function bitcoinJsNetwork(_network: Network) {
  const network = _network === "signet" ? "testnet" : _network;
  return networks[network === "mainnet" ? "bitcoin" : network];
}

export function getAddressType(address: string): AddressType {
  const adddresInfo = getAddressInfo(address);
  return adddresInfo.type;
}

export function pubkeyXOnly(pubkey: Buffer) {
  return pubkey.subarray(1, 33);
}

export * from "./bip32";
export * from "./ecpair";
