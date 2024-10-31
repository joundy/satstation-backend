import { script } from "bitcoinjs-lib";
import { OpCodes } from "./const";

export const Script = {
  encodeNumber: script.number.encode,
  decodeNumber: script.number.decode,
  encodeSignature: script.signature.encode,
  decodeSignature: script.signature.decode,
  encodeUTF8: (str: string) => Buffer.from(str, "utf8"),
  decodeUTF8: (buffer: Buffer) => buffer.toString("utf8"),
  compile: script.compile,
  ...OpCodes,
};

export * from "./const";
export * from "./types";
