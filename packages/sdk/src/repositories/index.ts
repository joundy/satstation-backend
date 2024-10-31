import { Network } from "../types";
import { BitcoinAPIAbstract, BitcoinUTXO } from "./bitcoin";
import { OrdAPI } from "./ord";

export type APIParams = {
  network: Network;
  ord?: OrdAPI;
  bitcoin: BitcoinAPIAbstract;
};

// Construct the BitcoinAPI and OrdAPI
export class API {
  protected network: Network;
  ord?: OrdAPI;
  bitcoin: BitcoinAPIAbstract;

  constructor(params: APIParams) {
    this.network = params.network;
    this.ord = params.ord;
    this.bitcoin = params.bitcoin;
  }

  async getSafeUTXOs(address: string): Promise<BitcoinUTXO[]> {
    if (!this.ord) throw new Error("ORD API is not set");

    const utxos = await this.bitcoin.getUTXOs(address);
    const safeUtxos: BitcoinUTXO[] = [];

    for (const utxo of utxos) {
      const output = await this.ord.getOutput(`${utxo.txid}:${utxo.vout}`);

      const numOfRunes = Object.keys(output.runes).length;
      const numOfInscriptions = output.inscriptions.length;

      if (numOfRunes === 0 && numOfInscriptions === 0) {
        safeUtxos.push(utxo);
      }
    }

    return safeUtxos;
  }

  async getRuneUtxos(
    address: string,
    _rune: string,
  ): Promise<{ outpoint: string; value: number }[]> {
    if (!this.ord) throw new Error("ORD API is not set");
    const rune = _rune.replaceAll("•", "");

    const [utxos, runesBalances] = await Promise.all([
      this.bitcoin.getUTXOs(address),
      this.ord.getRunesBalances(),
    ]);

    const utxoMap = new Map(
      utxos.map((utxo) => {
        return [`${utxo.txid}:${utxo.vout}`, true];
      }),
    );

    const balances = runesBalances[rune];
    if (!balances) throw new Error(`Rune ${rune} not found`);

    const results: { outpoint: string; value: number }[] = [];

    const outpointKeys = Object.keys(balances);
    for (const key of outpointKeys) {
      if (utxoMap.get(key)) {
        results.push({
          outpoint: key,
          value: balances[key]!,
        });
      }
    }
    results.sort((a, b) => b.value - a.value);

    return results;
  }

  async getRuneUtxos2(
    address: string,
    rune: string,
  ): Promise<{ outpoint: string; value: number }[]> {
    if (!this.ord) throw new Error("ORD API is not set");

    const utxos = await this.bitcoin.getUTXOs(address);

    const results: { outpoint: string; value: number }[] = [];

    for (const utxo of utxos) {
      const outpoint = `${utxo.txid}:${utxo.vout}`;
      const output = await this.ord.getOutput(outpoint);
      if (output.runes[rune]) {
        results.push({
          outpoint,
          value: output.runes[rune].amount,
        });
      }
    }
    results.sort((a, b) => b.value - a.value);

    return results;
  }
}

export * from "./types";
export * from "./bitcoin";
export * from "./ord";
export * from "./regbox";
