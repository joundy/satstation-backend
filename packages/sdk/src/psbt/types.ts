import {
  AddressType,
  OpReturnType,
  P2pkhUtxo,
  P2trUtxo,
  P2wpkhUtxo,
} from "../addresses";
import { Address } from "../addresses";
import { OpReturn } from "../addresses/opReturn";

export type UtxoInput = P2pkhUtxo | P2wpkhUtxo | P2trUtxo;

export type Input = {
  utxo: UtxoInput;
  value: number;
};
export type OutputOutput = Address | OpReturn;

export type Output = {
  output: Address | OpReturn;
  value: number;
};

export type InputType = AddressType;

export type OutputType = AddressType | OpReturnType;

export type SignedInputInfo = {
  signedIndexes: number[];
  notSignedIndexes: number[];
};
