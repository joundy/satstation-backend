import { Network } from "../../types";

export type APIUrl = Partial<Record<Network, string>>;

export type BitcoinUTXO = {
  txid: string;
  address: string;
  script_hash: string;
  vout: number;
  status: {
    confirmed: boolean;
    block_height: number;
    block_hash: string;
    block_time: number;
  };
  value: number;
};
