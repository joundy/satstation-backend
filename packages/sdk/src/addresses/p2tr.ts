import {
  AddressAutoUtxo,
  AddressAutoUtxoParams,
  AddressType,
  AddressUtxo,
  AddressUtxoParams,
  P2trRedeem,
} from ".";
import { BitcoinUTXO } from "../repositories/bitcoin/types";

export type TapLeafScript = {
  controlBlock: Buffer;
  leafVersion: number;
  script: Buffer;
};

export type P2trUtxoParams = AddressUtxoParams & {
  witness: {
    script: Buffer;
    value: number;
  };
  tapInternalKey: Buffer;
  tapLeafScript?: TapLeafScript[];
  paymentWitness?: Buffer[];
};

export class P2trUtxo extends AddressUtxo {
  type: AddressType = "p2tr";
  witness: {
    script: Buffer;
    value: number;
  };
  tapInternalKey: Buffer;
  tapLeafScript?: TapLeafScript[];
  paymentWitness?: Buffer[];

  constructor({
    txid,
    vout,
    witness,
    tapInternalKey,
    tapLeafScript,
    paymentWitness,
  }: P2trUtxoParams) {
    super({ txid, vout });
    this.witness = witness;
    this.tapInternalKey = tapInternalKey;
    this.tapLeafScript = tapLeafScript;
    this.paymentWitness = paymentWitness;
  }

  static async fromBitcoinUTXO(
    bitcoinUTXO: BitcoinUTXO,
    tapInternalKey: Buffer,
    paymentWitness?: Buffer[],
    redeem?: P2trRedeem,
  ) {
    let tapLeafScript;
    if (redeem && paymentWitness) {
      tapLeafScript = [
        {
          leafVersion: redeem.redeemVersion,
          script: redeem.output,
          controlBlock: paymentWitness[paymentWitness.length - 1]!,
        },
      ];
    }

    return new P2trUtxo({
      txid: bitcoinUTXO.txid,
      vout: bitcoinUTXO.vout,
      witness: {
        script: Buffer.from(bitcoinUTXO.script_hash, "hex"),
        value: bitcoinUTXO.value,
      },
      tapInternalKey,
      tapLeafScript,
      paymentWitness,
    });
  }
}

export type P2trAutoUtxoParams = AddressAutoUtxoParams & {
  tapInternalKey: Buffer;
  paymentWitness?: Buffer[];
  redeem?: P2trRedeem;
};

export class P2trAutoUtxo extends AddressAutoUtxo {
  tapInternalKey: Buffer;
  paymentWitness?: Buffer[];
  redeem?: P2trRedeem;

  constructor({
    address,
    tapInternalKey,
    redeem,
    paymentWitness,
  }: P2trAutoUtxoParams) {
    super({ address });
    this.tapInternalKey = tapInternalKey;
    this.paymentWitness = paymentWitness;
    this.redeem = redeem;
  }
}
