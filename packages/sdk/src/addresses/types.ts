export type AddressType = "p2pkh" | "p2sh" | "p2wpkh" | "p2wsh" | "p2tr";

export type OpReturnType = "op_return";

export type P2trRedeem = {
  output: Buffer;
  redeemVersion: number;
};
