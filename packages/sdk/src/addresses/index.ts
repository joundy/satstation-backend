import { getAddressType } from "../utils";
import { AddressType } from "./types";

export type AddressUtxoParams = {
  txid: string;
  vout: number;
};

export abstract class AddressUtxo {
  abstract type: AddressType;

  txid: string;
  vout: number;

  constructor({ txid, vout }: AddressUtxoParams) {
    this.txid = txid;
    this.vout = vout;
  }
}

export type AddressAutoUtxoParams = {
  address: string;
};

export abstract class AddressAutoUtxo {
  address: Address;
  constructor({ address }: AddressAutoUtxoParams) {
    this.address = Address.fromString(address);
  }
}

export type AddressParams = {
  address: string;
};

export class Address {
  address: string;
  type: AddressType;

  constructor({ address }: AddressParams) {
    this.address = address;
    this.type = getAddressType(address);
  }

  static fromString(address: string) {
    return new Address({ address });
  }
}

export * from "./types";
export * from "./p2pkh";
export * from "./p2sh";
export * from "./p2tr";
export * from "./p2wpkh";
export * from "./opReturn";
