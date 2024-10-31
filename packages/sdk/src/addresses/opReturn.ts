// this is actually not an address, it's just a wrapper script for op_return output.

import { Script, StackScripts } from "../script";
import { OpReturnType } from "./types";

export type OpReturnParams = {
  dataScripts?: StackScripts;
  buffer?: Buffer;
};

export class OpReturn {
  type: OpReturnType = "op_return";
  script: Buffer;

  constructor({ dataScripts, buffer }: OpReturnParams) {
    if (!(dataScripts || buffer)) {
      throw new Error("errors.provide either dataScripts or buffer");
    }

    if (dataScripts) {
      const finalScripts = [Script.OP_RETURN, ...dataScripts];
      this.script = Script.compile(finalScripts);

      return;
    }

    this.script = buffer!;
  }
}
