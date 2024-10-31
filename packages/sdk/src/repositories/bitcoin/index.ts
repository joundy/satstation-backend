import { Network } from "../../types";
import { APIUrl, BitcoinUTXO } from "./types";

export type BitcoinAPIAbstractParams = {
  network: Network;
  apiUrl: APIUrl;
};

export abstract class BitcoinAPIAbstract {
  protected readonly network: Network;
  protected readonly apiUrl: APIUrl;

  constructor({ network, apiUrl }: BitcoinAPIAbstractParams) {
    this.network = network;
    this.apiUrl = apiUrl;
  }

  get url(): string {
    if (!this.apiUrl[this.network]) {
      throw new Error(`errors.required url for ${this.network} network`);
    }
    return this.apiUrl[this.network]!;
  }

  abstract getUTXOs(address: string): Promise<BitcoinUTXO[]>;

  abstract getTransactionHex(txId: string): Promise<string>;

  abstract brodcastTx(txHex: string): Promise<string>;

  abstract recommendedFee(): Promise<void>;

  abstract getBlockTip(): Promise<number>;

  abstract getTransactionStatus(txHash: string): Promise<{
    confirmed: boolean;
    block_height: number;
  }>;
}

export * from "./mempool";
export * from "./blockstream";
export * from "./types";
