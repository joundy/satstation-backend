import {
  P2pkhAutoUtxo,
  P2pkhUtxo,
  P2trAutoUtxo,
  P2trUtxo,
  P2wpkhAutoUtxo,
  P2wpkhUtxo,
} from "../../addresses";
import { P2shAutoUtxo, P2shUtxo } from "../../addresses/p2sh";
import { BitcoinUTXO } from "../../repositories/bitcoin/types";
import { Network } from "../../types";
import { Input, InputType, Output, OutputOutput, OutputType } from "../types";

import { AutoUtxo } from "./types";

// Refer to this page: https://bitcoinops.org/en/tools/calc-size/
export const FEE_TX_EMPTY_SIZE = 4 + 1 + 1 + 4;

export const FEE_TX_INPUT_BASE = 32 + 4 + 1 + 4;
export const FEE_TX_INPUT_PUBKEYHASH = 107;
export const FEE_TX_INPUT_SCRIPTHASH = 1; // calculate based on script length
export const FEE_TX_INPUT_SEGWIT = 27 + 1;
export const FEE_TX_INPUT_SEGWIT_SCRIPTHASH = 0; // calculate based on script length
export const FEE_TX_INPUT_TAPROOT = 17 + 1;

export const FEE_TX_OUTPUT_BASE = 8 + 1;
export const FEE_TX_OUTPUT_PUBKEYHASH = 25;
export const FEE_TX_OUTPUT_SCRIPTHASH = 23;
export const FEE_TX_OUTPUT_SEGWIT = 22;
export const FEE_TX_OUTPUT_SEGWIT_SCRIPTHASH = 34;
export const FEE_TX_OUTPUT_TAPROOT = 34;

export type CoinSelectParams = {
  network: Network;
  inputs: Input[];
  outputs: Output[];
  feeRate: number;
  changeOutput?: OutputOutput;
  autoUtxo?: AutoUtxo;
  additionalFee?: number;
  useSafeUtxo?: boolean;
};

export type InputBytesData = {
  redeemScript?: Buffer;
  unlockScript?: Buffer;
  paymentWitness?: Buffer[];
};

export type OutputBytesData = {
  script?: Buffer;
};

// highly inspired by https://github.com/bitcoinjs/coinselect & https://github.com/joundy/bitcoin-utxo-select
export class CoinSelect {
  network: Network;
  inputs: Input[];
  outputs: Output[];
  feeRate: number;
  changeOutput?: OutputOutput;
  autoUtxo?: AutoUtxo;
  aditionalFee?: number;
  useSafeUtxo?: boolean;

  private utxoCandidates: BitcoinUTXO[] = [];

  constructor({
    network,
    inputs,
    outputs,
    feeRate,
    changeOutput,
    autoUtxo,
    additionalFee,
    useSafeUtxo,
  }: CoinSelectParams) {
    this.network = network;
    this.inputs = inputs;
    this.outputs = outputs;
    this.feeRate = feeRate;
    this.changeOutput = changeOutput;
    this.autoUtxo = autoUtxo;
    this.aditionalFee = additionalFee;
    this.useSafeUtxo = useSafeUtxo;
  }

  get dustThreshold() {
    // set the value from the highest input type
    return FEE_TX_INPUT_BASE + FEE_TX_INPUT_PUBKEYHASH * this.feeRate;
  }

  get totalInputValue() {
    return this.inputs.reduce((prev, input) => prev + input.value, 0);
  }

  get totalOutputValue() {
    return this.outputs.reduce((prev, output) => prev + output.value, 0);
  }

  get feeValue() {
    return this.totalInputValue - this.totalOutputValue;
  }

  get transactionFee() {
    return this.transactionBytes() * this.feeRate;
  }

  private inputBytes(inputType: InputType, data?: InputBytesData) {
    let bytes = FEE_TX_INPUT_BASE;

    switch (inputType) {
      case "p2pkh":
        bytes += FEE_TX_INPUT_PUBKEYHASH;
        break;
      case "p2sh":
        if (!data?.redeemScript || !data?.unlockScript) {
          throw new Error(
            "errors.redeemScript & unlockScript is required when calculating p2sh input",
          );
        }
        bytes +=
          FEE_TX_INPUT_SCRIPTHASH +
          data.redeemScript.length +
          data.unlockScript.length;
        break;
      case "p2wpkh":
        bytes += FEE_TX_INPUT_SEGWIT;
        break;
      case "p2tr":
        bytes += FEE_TX_INPUT_TAPROOT;
        if (data?.paymentWitness && data.paymentWitness.length > 0) {
          const witnessBytes =
            data.paymentWitness.reduce(
              (prev, next) => prev + next.byteLength,
              0,
            ) / 4;
          bytes += Math.ceil(witnessBytes);
        }
        break;
      default:
        throw new Error("errors.fee input is not implemented yet");
    }

    return bytes;
  }

  private outputBytes(outputType: OutputType, data?: OutputBytesData) {
    let bytes = FEE_TX_OUTPUT_BASE;

    switch (outputType) {
      case "p2pkh":
        bytes += FEE_TX_OUTPUT_PUBKEYHASH;
        break;
      case "p2sh":
        bytes += FEE_TX_OUTPUT_SCRIPTHASH;
        break;
      case "p2wpkh":
        bytes += FEE_TX_OUTPUT_SEGWIT;
        break;
      case "p2tr":
        bytes += FEE_TX_OUTPUT_TAPROOT;
        break;
      case "op_return":
        if (!data?.script) {
          throw new Error(
            "errors.script is required when calculating op_return output",
          );
        }
        bytes += data.script.byteLength;
        break;

      default:
        throw new Error("errors.fee output is not implemented yet");
    }

    return bytes;
  }

  private transactionBytes() {
    return (
      FEE_TX_EMPTY_SIZE +
      this.inputs.reduce((prev, input) => {
        if (input.utxo instanceof P2shUtxo) {
          return (
            prev +
            this.inputBytes(input.utxo.type, {
              redeemScript: input.utxo.redeemScript,
              unlockScript: input.utxo.unlockScript,
            })
          );
        }
        if (input.utxo instanceof P2trUtxo) {
          return (
            prev +
            this.inputBytes(input.utxo.type, {
              paymentWitness: input.utxo.paymentWitness,
            })
          );
        }
        return prev + this.inputBytes(input.utxo.type);
      }, 0) +
      this.outputs.reduce((prev, output) => {
        if (output.output.type === "op_return") {
          return (
            prev +
            this.outputBytes(output.output.type, {
              script: output.output.script,
            })
          );
        }
        return prev + this.outputBytes(output.output.type);
      }, 0)
    );
  }

  private async selectUtxoCandidates() {
    if (!this.autoUtxo) return;

    let transactionBytes = this.transactionBytes();
    let totalInputValue = this.totalInputValue;
    const totalOutputValue = this.totalOutputValue;

    const fee = this.feeRate * transactionBytes;
    if (totalInputValue > totalOutputValue + fee) {
      // no need to add more UTXOs since the inputs already cover the transaction fee and total output value
      return;
    }
    let utxos: BitcoinUTXO[] = [];

    if (this.useSafeUtxo) {
      utxos = await this.autoUtxo.api.getSafeUTXOs(
        this.autoUtxo.from.address.address,
      );
    } else {
      utxos = await this.autoUtxo.api.bitcoin.getUTXOs(
        this.autoUtxo.from.address.address,
      );
    }

    for (const utxo of utxos) {
      let utxoBytes;

      if (this.autoUtxo.from instanceof P2shAutoUtxo) {
        utxoBytes = this.inputBytes(this.autoUtxo.from.address.type, {
          redeemScript: this.autoUtxo.from.redeemScript,
          unlockScript: this.autoUtxo.from.unlockScript,
        });
      } else {
        utxoBytes = this.inputBytes(this.autoUtxo.from.address.type);
      }

      const utxoFee = this.feeRate * utxoBytes;
      const utxoValue = utxo.value;

      // find another UTXO candidate because the value is less than the fee, considered as dust.
      if (utxoFee > utxoValue) continue;

      transactionBytes += utxoBytes;
      totalInputValue += utxoValue;
      this.utxoCandidates.push(utxo);

      // let's add other UTXOs if the inputs still not cover the fee and total output value.
      if (totalInputValue < totalOutputValue + fee) continue;

      return;
    }
  }

  private async prepareUtxoCandidates() {
    if (!this.autoUtxo) return;

    for (const utxo of this.utxoCandidates) {
      switch (true) {
        case this.autoUtxo.from instanceof P2pkhAutoUtxo:
          this.inputs.push({
            utxo: await P2pkhUtxo.fromBitcoinUTXO(
              this.autoUtxo.api.bitcoin,
              utxo,
            ),
            value: utxo.value,
          });
          break;
        case this.autoUtxo.from instanceof P2shAutoUtxo:
          this.inputs.push({
            utxo: await P2shUtxo.fromBitcoinUTXO({
              bitcoinAPI: this.autoUtxo.api.bitcoin,
              bitcoinUTXO: utxo,
              redeemScript: this.autoUtxo.from.redeemScript,
              unlockScript: this.autoUtxo.from.unlockScript,
            }),
            value: utxo.value,
          });
          break;
        case this.autoUtxo.from instanceof P2wpkhAutoUtxo:
          this.inputs.push({
            utxo: await P2wpkhUtxo.fromBitcoinUTXO(utxo),
            value: utxo.value,
          });
          break;
        case this.autoUtxo.from instanceof P2trAutoUtxo:
          this.inputs.push({
            utxo: await P2trUtxo.fromBitcoinUTXO(
              utxo,
              this.autoUtxo.from.tapInternalKey,
              this.autoUtxo.from.paymentWitness,
              this.autoUtxo.from.redeem,
            ),
            value: utxo.value,
          });
          break;
        default:
          throw new Error("errors.utxo candidate is not implemented yet");
      }
    }
  }

  // this will calculate the final inputs and outputs fees,
  // and also add a change output if it's worth it.
  private finalize() {
    // set the default change fee with pubkeyhash bytes (worst case)
    let changeFee = this.outputBytes("p2pkh");
    if (this.changeOutput) {
      changeFee = this.outputBytes(this.changeOutput.type);
    }

    const transactionBytes = this.transactionBytes();

    let additionalFee = 0;
    if (this.aditionalFee) {
      additionalFee = this.aditionalFee;
    }

    const feeAfterExtraOutput =
      this.feeRate * (transactionBytes + changeFee + additionalFee);
    const remainderAfterExtraOutput =
      this.totalInputValue - (this.totalOutputValue + feeAfterExtraOutput);

    // is it worth a change output?
    if (remainderAfterExtraOutput > this.dustThreshold && this.changeOutput) {
      this.outputs.push({
        output: this.changeOutput,
        value: remainderAfterExtraOutput,
      });
    }
  }

  async coinSelection() {
    await this.selectUtxoCandidates();
    await this.prepareUtxoCandidates();
    this.finalize();
  }
}
