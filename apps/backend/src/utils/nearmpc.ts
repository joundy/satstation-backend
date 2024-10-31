import { base_decode } from "near-api-js/lib/utils/serialize";
import { ec as EC } from "elliptic";
import { keccak256 } from "viem";
import hash from "hash.js";

// @ts-ignore
import bs58check from "bs58check";
import { sha3_256 } from "js-sha3";
import { secp256k1 } from "@noble/curves/secp256k1";
import crypto from "crypto";

// @ts-ignore
import BN from "bn.js";

export async function deriveEpsilon(
  signerId: string,
  path: string
): Promise<string> {

  const derivationPath = `${signerId},${path}`;
  const hash = crypto.createHash("sha256").update(derivationPath).digest();
  const ret = new BN(hash, "be").toString("hex");

  return ret;
}

export function deriveKey(publicKeyStr: string, epsilon: string): Uint8Array {
  return secp256k1.getPublicKey(epsilon);
}

export function bufferToBigInt(buffer: Buffer, start = 0, end = buffer.length) {
  const bufferAsHexString = buffer.slice(start, end).toString("hex");
  return BigInt(`0x${bufferAsHexString}`);
}

export function getYParityFromBigR(big_r: string) {
  if (big_r.startsWith("02")) {
    return 0;
  } else if (big_r.startsWith("03")) {
    return 1;
  } else {
    throw new Error("Big R must start with '02' or '03'.");
  }
}

// NOTE this public key is for 'signer.canhazgas.testnet'
const rootPublicKey =
  "secp256k1:37aFybhUHCxRdDkuCcB3yHzxqK7N8EQ745MujyAQohXSsYymVeHzhLxKvZ2qYeRHf3pGFiAsxqFJZjpF9gP2JV5u";

export const reconstructSignature = (big_r: string, big_s: string) => {
  const v = getYParityFromBigR(big_r);

  const r = big_r.slice(2).padStart(64, "0");
  const s = big_s.padStart(64, "0");

  const rawSignature = Buffer.from(r + s, "hex");

  if (rawSignature.length !== 64) {
    throw new Error("Invalid signature length.");
  }

  return {
    rawSignature,
    v,
    r: Buffer.from(r, "hex"),
    s: Buffer.from(s, "hex"),
  };
};

export async function deriveBitcoinAddress(
  accountId: string,
  derivation_path: string,
  network: any
) {
  const epsilon = await deriveEpsilon(accountId, derivation_path);
  const derivedKey = deriveKey("", epsilon);

  // @ts-ignore
  const publicKey = Buffer.from(derivedKey, "hex");

  const address = await uncompressedHexPointToBtcAddress(publicKey, network);

  // @ts-ignore
  return { publicKey: Buffer.from(publicKey, "hex"), address };
}

export function najPublicKeyStrToUncompressedHexPoint() {
  const res =
    "04" +
    Buffer.from(base_decode(rootPublicKey.split(":")[1])).toString("hex");
  return res;
}

export async function deriveChildPublicKey(
  parentUncompressedPublicKeyHex: any,
  signerId: any,
  path = ""
) {
  const ec = new EC("secp256k1");
  const scalarHex = sha3_256(`${signerId},${path}`);

  const x = parentUncompressedPublicKeyHex.substring(2, 66);
  const y = parentUncompressedPublicKeyHex.substring(66);

  // Create a point object from X and Y coordinates
  const oldPublicKeyPoint = ec.curve.point(x, y);

  // Multiply the scalar by the generator point G
  const scalarTimesG = ec.g.mul(scalarHex);

  // Add the result to the old public key point
  const newPublicKeyPoint = oldPublicKeyPoint.add(scalarTimesG);
  const newX = newPublicKeyPoint.getX().toString("hex").padStart(64, "0");
  const newY = newPublicKeyPoint.getY().toString("hex").padStart(64, "0");
  return "04" + newX + newY;
}

export function uncompressedHexPointToEvmAddress(uncompressedHexPoint: any) {
  const addressHash = keccak256(`0x${uncompressedHexPoint.slice(2)}`);

  // Ethereum address is last 20 bytes of hash (40 characters), prefixed with 0x
  return "0x" + addressHash.substring(addressHash.length - 40);
}

export async function uncompressedHexPointToBtcAddress(
  publicKeyHex: any,
  network: any
) {
  // Step 1: SHA-256 hashing of the public key
  const publicKeyBytes = Uint8Array.from(Buffer.from(publicKeyHex, "hex"));

  const sha256HashOutput = await crypto.subtle.digest(
    "SHA-256",
    publicKeyBytes
  );

  // Step 2: RIPEMD-160 hashing on the result of SHA-256
  const ripemd160 = hash
    .ripemd160()
    .update(Buffer.from(sha256HashOutput))
    .digest();

  // Step 3: Adding network byte (0x00 for Bitcoin Mainnet)
  const network_byte =
    network === "bitcoin" || network == "mainnet" ? 0x00 : 0x6f;
  const networkByte = Buffer.from([network_byte]);
  const networkByteAndRipemd160 = Buffer.concat([
    networkByte,
    Buffer.from(ripemd160),
  ]);

  // Step 4: Base58Check encoding
  const address = bs58check.encode(networkByteAndRipemd160);

  return address;
}
