import { ECPairInterface } from "ecpair";

export type P2trScriptRedeem = {
  output: Buffer;
  redeemVersion: 192;
};

export type DeriveAddress = {
  address: string;
};

export type DeriveP2pkh = DeriveAddress & {
  keypair: ECPairInterface;
};

export type DeriveP2wpkh = DeriveAddress & {
  keypair: ECPairInterface;
};

export type DeriveP2tr = DeriveAddress & {
  keypair: ECPairInterface;
  tapInternalKey: Buffer;
};

export type DeriveP2trScript = DeriveAddress & {
  keypair: ECPairInterface;
  tapInternalKey: Buffer;
  paymentWitness: Buffer[];
  redeem: P2trScriptRedeem;
};

export type DeriveP2sh = DeriveAddress & {
  redeemScript: Buffer;
};

export type P2trScript = {
  taptree: Taptree;
  redeem: P2trScriptRedeem;
};

export type Tapleaf = {
  output: Buffer;
  version?: number;
};

export type Taptree = [Taptree | Tapleaf, Taptree | Tapleaf] | Tapleaf;
