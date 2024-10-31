import { Psbt, Signer, payments, script } from "bitcoinjs-lib";
import { Address, P2pkhUtxo, P2trUtxo, P2wpkhUtxo } from "../addresses";
import { bitcoinJsNetwork } from "../utils";
import { CoinSelect, CoinSelectParams } from "./coin-select";
import { Input, Output, SignedInputInfo } from "./types";
import { OpReturn } from "../addresses/opReturn";
import { P2shUtxo } from "../addresses/p2sh";
import { StackScripts } from "../script";
import { SignerAsync } from "ecpair";

export type PSBTParams = CoinSelectParams & { };

export class PSBT extends CoinSelect {
  private psbt: Psbt;

  constructor({
    network,
    inputs,
    outputs,
    feeRate,
    changeOutput,
    autoUtxo,
    additionalFee,
    useSafeUtxo,
  }: PSBTParams) {
    super({
      network,
      inputs,
      outputs,
      feeRate,
      changeOutput,
      autoUtxo,
      additionalFee,
      useSafeUtxo,
    });

    this.psbt = new Psbt({
      network: bitcoinJsNetwork(this.network),
    });
  }

  private addInput(input: Input) {
    switch (true) {
      case input.utxo instanceof P2pkhUtxo:
        this.psbt.addInput({
          hash: input.utxo.txid,
          index: input.utxo.vout,
          nonWitnessUtxo: input.utxo.transaction,
        });
        break;
      case input.utxo instanceof P2shUtxo:
        this.psbt.addInput({
          hash: input.utxo.txid,
          index: input.utxo.vout,
          nonWitnessUtxo: input.utxo.transaction,
          redeemScript: input.utxo.redeemScript,
        });
        break;
      case input.utxo instanceof P2wpkhUtxo:
        this.psbt.addInput({
          hash: input.utxo.txid,
          index: input.utxo.vout,
          witnessUtxo: input.utxo.witness,
        });
        break;
      case input.utxo instanceof P2trUtxo:
        this.psbt.addInput({
          hash: input.utxo.txid,
          index: input.utxo.vout,
          witnessUtxo: input.utxo.witness,
          tapInternalKey: input.utxo.tapInternalKey,
          ...(input.utxo.tapLeafScript
            ? {
              tapLeafScript: input.utxo.tapLeafScript,
            }
            : {}),
        });
        break;

      default:
        throw new Error("errors.psbt input is not implemented yet");
    }
  }

  private addOutput(output: Output) {
    switch (true) {
      case output.output instanceof Address:
        this.psbt.addOutput({
          address: output.output.address,
          value: output.value,
        });
        break;
      case output.output instanceof OpReturn:
        this.psbt.addOutput({
          script: output.output.script,
          value: output.value,
        });
        break;
      default:
        throw new Error("errors.psbt output is not implemented yet");
    }
  }

  async build() {
    await this.coinSelection();
    for (const input of this.inputs) {
      this.addInput(input);
    }
    for (const output of this.outputs) {
      this.addOutput(output);
    }
  }

  get signedInputsInfo(): SignedInputInfo {
    const signedIndexes: number[] = [];
    const notSignedIndexes: number[] = [];

    let i = 0;
    for (const input of this.psbt.data.inputs) {
      if (
        input.partialSig ||
        input.tapKeySig ||
        input.tapScriptSig ||
        input.finalScriptSig
      ) {
        signedIndexes.push(i);
      } else {
        notSignedIndexes.push(i);
      }
      i++;
    }

    return {
      signedIndexes,
      notSignedIndexes,
    };
  }

  signAllInputs(signer: Signer, sighashTypes?: number[]) {
    this.psbt.signAllInputs(signer, sighashTypes);
  }

  signInput(index: number, signer: Signer, sighashTypes?: number[]) {
    this.psbt.signInput(index, signer, sighashTypes);
  }

  async signInputAsync(
    inputIndex: number,
    keyPair: Signer | SignerAsync,
    sighashTypes?: number[],
  ) {
    await this.psbt.signInputAsync(inputIndex, keyPair, sighashTypes);
  }

  finalizeAllInputs() {
    const signedInputsInfo = this.signedInputsInfo;
    if (signedInputsInfo.notSignedIndexes.length > 0) {
      throw new Error(
        `errors.not all inputs are signed, indexes: ${signedInputsInfo.notSignedIndexes}`,
      );
    }

    this.psbt.finalizeAllInputs();
  }

  finalizeScriptInput(index: number, unlockScript: StackScripts) {
    this.psbt.finalizeInput(index, PSBT.finalScript(unlockScript));
  }

  toPSBT() {
    return this.psbt;
  }

  toHex(extractTx = true) {
    if (extractTx) {
      return this.psbt.extractTransaction().toHex();
    }
    return this.psbt.toHex();
  }

  toBase64(extractTx = true) {
    if (extractTx) {
      this.psbt.extractTransaction();
    }
    return this.psbt.toBase64();
  }

  static finalScript(unlockScripts: StackScripts) {
    return ({ } = {}, { } = {}, redeemScript: Buffer) => {
      const payment = payments.p2sh({
        redeem: {
          output: redeemScript,
          input: script.compile(unlockScripts),
        },
      });

      return {
        finalScriptSig: payment.input,
        finalScriptWitness: undefined,
      };
    };
  }
}

export * from "./extensions";
