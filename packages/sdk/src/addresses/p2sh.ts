import {
  AddressAutoUtxo,
  AddressAutoUtxoParams,
  AddressType,
  AddressUtxo,
  AddressUtxoParams,
} from ".";
import { BitcoinAPIAbstract } from "../repositories";
import { BitcoinUTXO } from "../repositories/bitcoin/types";

export type P2shUtxoParams = AddressUtxoParams & {
  transaction: Buffer;
  redeemScript: Buffer;
  unlockScript: Buffer;
};

export type P2shFromBitcoinUTXOParams = {
  bitcoinAPI: BitcoinAPIAbstract;
  bitcoinUTXO: BitcoinUTXO;
  redeemScript: Buffer;
  unlockScript: Buffer;
};

export class P2shUtxo extends AddressUtxo {
  type: AddressType = "p2sh";
  transaction: Buffer;
  redeemScript: Buffer;
  unlockScript: Buffer;

  constructor({
    txid,
    vout,
    transaction,
    redeemScript,
    unlockScript,
  }: P2shUtxoParams) {
    super({ txid, vout });
    this.transaction = transaction;
    this.redeemScript = redeemScript;
    this.unlockScript = unlockScript;
  }

  static async fromBitcoinUTXO({
    bitcoinAPI,
    bitcoinUTXO,
    redeemScript,
    unlockScript,
  }: P2shFromBitcoinUTXOParams) {
    const txHex = await bitcoinAPI.getTransactionHex(bitcoinUTXO.txid);
    const txBuffer = Buffer.from(txHex, "hex");

    return new P2shUtxo({
      txid: bitcoinUTXO.txid,
      vout: bitcoinUTXO.vout,
      transaction: txBuffer,
      redeemScript,
      unlockScript,
    });
  }
}

export type P2shAutoUtxoParams = AddressAutoUtxoParams & {
  redeemScript: Buffer;
  unlockScript: Buffer;
};

export class P2shAutoUtxo extends AddressAutoUtxo {
  redeemScript: Buffer;
  unlockScript: Buffer;
  constructor({ address, redeemScript, unlockScript }: P2shAutoUtxoParams) {
    super({ address });
    this.redeemScript = redeemScript;
    this.unlockScript = unlockScript;
  }
}
