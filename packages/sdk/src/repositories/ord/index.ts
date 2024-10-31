import { Network } from "../../types";
import { APIUrl } from "../bitcoin";

export type OrdAPIParams = {
  network: Network;
  apiUrl?: APIUrl;
};

export class OrdAPI {
  protected readonly network: Network;
  protected readonly apiUrl: APIUrl;

  constructor({
    network,
    apiUrl = {
      mainnet: "https://ordinals.com",
      testnet: "https://testnet.ordinals.com",
    },
  }: OrdAPIParams) {
    this.network = network;
    this.apiUrl = apiUrl;
  }

  get url(): string {
    if (!this.apiUrl[this.network]) {
      throw new Error(`errors.required url for ${this.network} network`);
    }
    return this.apiUrl[this.network]!;
  }

  async getRune(runeName: string): Promise<{
    entry: {
      block: number;
      burned: number;
      divisibility: number;
      etching: string;
      mints: number;
      number: number;
      premine: number;
      spaced_rune: string;
      symbol: string;
      terms: any;
      timestamp: number;
      turbo: boolean;
    };
    id: string;
    mintable: boolean;
    parent: string;
  } | null> {
    const res = await fetch(`${this.url}/rune/${runeName}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      throw new Error(`HTTP error!: ${await res.text()}`);
    }

    return await res.json();
  }

  async getBlockTip(): Promise<number> {
    const res = await fetch(`${this.url}/blockheight`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`HTTP error!: ${await res.text()}`);
    }

    return parseInt(await res.text(), 10);
  }
  async getOutput(output: string): Promise<{
    address?: string;
    indexed: boolean;
    inscriptions: string[];
    runes: {
      [key: string]: {
        amount: number;
        divisibility: number;
        symbol: string;
      };
    };
    sat_ranges: number[][];
    script_pubkey: string;
    spent: boolean;
    transaction: string;
    value: number;
  }> {
    const res = await fetch(`${this.url}/output/${output}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`HTTP error!: ${await res.text()}`);
    }

    return await res.json();
  }

  async getRunesBalances(): Promise<{
    [key: string]: {
      [key: string]: number;
    };
  }> {
    const res = await fetch(`${this.url}/runes/balances`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`HTTP error!: ${await res.text()}`);
    }

    return await res.json();
  }
}
