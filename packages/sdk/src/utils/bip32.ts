import { BIP32Factory, BIP32Interface } from "bip32";
import ecc from "@bitcoinerlab/secp256k1";

export const bip32 = BIP32Factory(ecc);
export type { BIP32Interface };
