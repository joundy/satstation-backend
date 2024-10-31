import { ECPairFactory } from "ecpair";
import ecc from "@bitcoinerlab/secp256k1";

export const ecpair = ECPairFactory(ecc);
