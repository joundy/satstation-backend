import * as bip39 from "bip39";
import { payments, crypto, script } from "bitcoinjs-lib";
import { Network } from "../types";
import {
  BIP32Interface,
  bip32,
  bitcoinJsNetwork,
  ecpair,
  pubkeyXOnly,
} from "../utils";
import {
  DeriveP2pkh,
  DeriveP2sh,
  DeriveP2wpkh,
  DeriveP2trScript,
  P2trScript,
  DeriveP2tr,
} from "./types";
import { StackScripts } from "../script";

export type AddressPathType = "legacy" | "nested-segwit" | "segwit" | "taproot";

export type WalletGetPathParams = {
  type: AddressPathType;
  network: Network;
  index: number;
};

export type WalletParams = {
  mnemonic?: string;
  privateKey?: string;
  wif?: string;
  network: Network;
};

export class Wallet {
  mnemonic?: string;
  privateKey?: string;
  wif?: string;
  network: Network;

  masterNode: BIP32Interface;

  constructor({ mnemonic, privateKey, wif, network }: WalletParams) {
    if (mnemonic) {
      this.mnemonic = mnemonic;
      const seed = bip39.mnemonicToSeedSync(mnemonic);
      this.masterNode = bip32.fromSeed(seed);
    } else if (privateKey) {
      this.privateKey = privateKey;
      const keyBuffer = Buffer.from(privateKey, "hex");
      this.masterNode = bip32.fromPrivateKey(keyBuffer, Buffer.alloc(32));
    } else if (wif) {
      const keyPair = ecpair.fromWIF(wif, bitcoinJsNetwork(network));
      this.privateKey = keyPair.privateKey!.toString("hex");
      this.masterNode = bip32.fromPrivateKey(
        keyPair.privateKey!,
        Buffer.alloc(32)
      );
    } else {
      this.mnemonic = Wallet.generateMnemonic();
      const seed = bip39.mnemonicToSeedSync(this.mnemonic);
      this.masterNode = bip32.fromSeed(seed);
    }

    this.network = network;
  }

  static generateMnemonic() {
    return bip39.generateMnemonic();
  }

  static getPath({ type, network, index }: WalletGetPathParams) {
    let coinType = 1;
    if (network === "mainnet") {
      coinType = 0;
    }

    switch (type) {
      case "legacy":
        return `m/44'/${coinType}'/0'/0/${index}`;
      case "nested-segwit":
        return `m/49'/${coinType}'/0'/0/${index}`;
      case "segwit":
        return `m/84'/${coinType}'/0'/0/${index}`;
      case "taproot":
        return `m/86'/${coinType}'/0'/0/${index}`;
    }
  }

  p2pkh(index: number): DeriveP2pkh {
    const childNode = this.masterNode.derivePath(
      Wallet.getPath({ type: "legacy", network: this.network, index })
    );
    const keypair = ecpair.fromPrivateKey(childNode.privateKey!);

    const p2pkh = payments.p2pkh({
      network: bitcoinJsNetwork(this.network),
      pubkey: keypair.publicKey,
    });

    return {
      address: p2pkh.address!,
      keypair,
    };
  }

  p2sh(scripts: StackScripts): DeriveP2sh {
    const redeemScript = script.compile(scripts);
    const p2sh = payments.p2sh({
      redeem: {
        output: redeemScript,
        network: bitcoinJsNetwork(this.network),
      },
      network: bitcoinJsNetwork(this.network),
    });

    return {
      address: p2sh.address!,
      redeemScript,
    };
  }

  p2wpkh(index: number): DeriveP2wpkh {
    const childNode = this.masterNode.derivePath(
      Wallet.getPath({ type: "segwit", network: this.network, index })
    );
    const keypair = ecpair.fromPrivateKey(childNode.privateKey!);

    const p2wpkh = payments.p2wpkh({
      network: bitcoinJsNetwork(this.network),
      pubkey: keypair.publicKey,
    });

    return {
      address: p2wpkh.address!,
      keypair,
    };
  }

  p2tr(index: number): DeriveP2tr {
    const childNode = this.masterNode.derivePath(
      Wallet.getPath({ type: "taproot", network: this.network, index })
    );
    const keypair = ecpair.fromPrivateKey(childNode.privateKey!);
    const xOnly = pubkeyXOnly(keypair.publicKey);

    const p2tr = payments.p2tr({
      network: bitcoinJsNetwork(this.network),
      internalPubkey: xOnly,
    });

    const tweakedKeyPair = keypair.tweak(crypto.taggedHash("TapTweak", xOnly));

    return {
      address: p2tr.address!,
      keypair: tweakedKeyPair,
      tapInternalKey: xOnly,
    };
  }

  p2trScript(
    index: number,
    tapScript: (internalpubKey: Buffer) => P2trScript,
  ): DeriveP2trScript {
    const childNode = this.masterNode.derivePath(
      Wallet.getPath({ type: "taproot", network: this.network, index }),
    );
    const keypair = ecpair.fromPrivateKey(childNode.privateKey!);
    const xOnly = pubkeyXOnly(keypair.publicKey);

    const script = tapScript(xOnly);
    const p2tr = payments.p2tr({
      network: bitcoinJsNetwork(this.network),
      internalPubkey: xOnly,
      scriptTree: script.taptree,
      redeem: script.redeem,
    });

    return {
      address: p2tr.address!,
      keypair: keypair,
      tapInternalKey: xOnly,
      paymentWitness: p2tr.witness!,
      redeem: script.redeem,
    };
  }
}

export * from "./types";
