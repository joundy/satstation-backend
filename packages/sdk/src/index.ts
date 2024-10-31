import { initEccLib } from "bitcoinjs-lib";
import ecc from "@bitcoinerlab/secp256k1";
initEccLib(ecc);

export * from "./types";
export * from "./addresses";
export * from "./repositories";
export * from "./psbt";
export * from "./script";
export * from "./utils";
export * from "./wallet";
