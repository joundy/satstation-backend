import { P2pkhAutoUtxo, P2trAutoUtxo, P2wpkhAutoUtxo } from "../../addresses";
import { P2shAutoUtxo } from "../../addresses/p2sh";
import { API } from "../../repositories";

export type AutoUtxo = {
  api: API;
  from: P2pkhAutoUtxo | P2shAutoUtxo | P2wpkhAutoUtxo | P2trAutoUtxo;
};
