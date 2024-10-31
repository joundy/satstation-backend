import {
  AddressAutoUtxo,
  AddressType,
  AddressUtxo,
  AddressUtxoParams,
} from ".";
import { BitcoinUTXO } from "../repositories/bitcoin/types";

export type P2wpkhUtxoParams = AddressUtxoParams & {
  witness: {
    script: Buffer;
    value: number;
  };
};

export class P2wpkhUtxo extends AddressUtxo {
  type: AddressType = "p2wpkh";

  witness: {
    script: Buffer;
    value: number;
  };

  constructor({ txid, vout, witness }: P2wpkhUtxoParams) {
    super({ txid, vout });
    this.witness = witness;
  }

  static async fromBitcoinUTXO(bitcoinUTXO: BitcoinUTXO) {
    return new P2wpkhUtxo({
      txid: bitcoinUTXO.txid,
      vout: bitcoinUTXO.vout,
      witness: {
        script: Buffer.from(bitcoinUTXO.script_hash, "hex"),
        value: bitcoinUTXO.value,
      },
    });
  }
}

export class P2wpkhAutoUtxo extends AddressAutoUtxo { }
