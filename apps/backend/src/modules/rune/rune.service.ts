import { encodeRunestone, Network } from "@magiceden-oss/runestone-lib";
import { autoInjectable } from "tsyringe";
import { EtchingRequest, WithdrawRequest } from "./rune.dto";
import { secp256k1 } from "@noble/curves/secp256k1";

import {
  Address,
  DeriveP2trScript,
  OpReturn,
  P2trAutoUtxo,
  P2trScript,
  P2trUtxo,
  PSBT,
  Script,
  Wallet,
  BitcoinUTXO,
  P2pkhUtxo,
  P2pkhAutoUtxo,
} from "@satstation-backend/sdk";
import ConfigService from "../config/config.service";
import AccountService from "../account/account.service";
import Api from "../api/api.service";
import PrismaService from "../prisma/prisma.service";
import NearService from "../near/near.service";
import { Rune } from "@magiceden-oss/runestone-lib/dist/src/rune";
import { u128 } from "@magiceden-oss/runestone-lib/dist/src/integer";

import {
  bufferToBigInt,
  deriveBitcoinAddress,
  reconstructSignature,
} from "../../utils/nearmpc";

const DEFAULT_RUNE_POINTER = 0; // the first index of outputs
const BASE_RUNE_SAT = 1000;

@autoInjectable()
class RuneService {
  constructor(
    private readonly config: ConfigService,
    private readonly accountService: AccountService,
    private readonly api: Api,
    private readonly prismaService: PrismaService,
    private readonly nearService: NearService,
  ) { }

  private deriveRuneCommitAccount(
    commitBuffer: Buffer,
    userTapInternalKey: Buffer,
    dataBuffer?: Buffer,
    dataMimeType?: string,
  ) {
    const wallet = new Wallet({
      mnemonic: this.config.env.BTC_MNEMONIC,
      network: this.config.env.NETWORK,
    });

    let data: any = [commitBuffer];
    if (dataBuffer && dataMimeType) {
      data = [
        Script.encodeUTF8("ord"),
        Script.OP_13,
        commitBuffer,
        Script.OP_1,
        Script.encodeUTF8(dataMimeType),
        Script.OP_0,
        dataBuffer,
      ];
    }

    const script = (tapInternalKey: Buffer): P2trScript => {
      const runeCommit = Script.compile([
        tapInternalKey,
        Script.OP_CHECKSIG,
        Script.OP_FALSE,
        Script.OP_IF,
        ...data,
        Script.OP_ENDIF,
      ]);
      const recovery = Script.compile([tapInternalKey, Script.OP_CHECKSIG]);
      const userRecovery = Script.compile([
        userTapInternalKey,
        Script.OP_CHECKSIG,
      ]);

      return {
        taptree: [
          {
            output: Script.compile(runeCommit),
          },
          [
            {
              output: Script.compile(recovery),
            },
            {
              output: Script.compile(userRecovery),
            },
          ],
        ],
        redeem: {
          output: runeCommit,
          redeemVersion: 192,
        },
      };
    };

    const p2tr = wallet.p2trScript(0, script);
    return p2tr;
  }

  private async spendRuneCommit(
    runeCommitAccount: DeriveP2trScript,
    utxo: BitcoinUTXO,
    encodedRunestone: Buffer,
    holderAddress: string,
    feeRate = 1,
  ) {
    const p = new PSBT({
      network: this.config.env.NETWORK,
      inputs: [
        {
          utxo: await P2trUtxo.fromBitcoinUTXO(
            utxo,
            runeCommitAccount.tapInternalKey,
            runeCommitAccount.paymentWitness,
            runeCommitAccount.redeem,
          ),
          value: utxo.value,
        },
      ],
      outputs: [
        {
          output: Address.fromString(holderAddress),
          value: BASE_RUNE_SAT,
        },
        {
          output: new OpReturn({ buffer: encodedRunestone }),
          value: 0,
        },
      ],
      feeRate,
      changeOutput: Address.fromString(this.accountService.addressP2wpkh),
    });

    await p.build();

    p.signInput(0, runeCommitAccount.keypair);
    p.finalizeAllInputs();

    const txHash = await this.api.electrsApi.brodcastTx(p.toHex(true));
    return txHash;
  }

  // the dummy PSBT to estimate the transaction fee
  // TODO: optimize the fee estimation, use proper function
  private async estimateEtchingFee(
    runeCommitAccount: DeriveP2trScript,
    encodedRunestone: Buffer,
    holderAddress: string,
    feeRate = 1,
  ) {
    const dummyBitcoinUTXO: BitcoinUTXO = {
      txid: "7af98cce654127a10829b79fd9491f68518fb9c5037dc0f69b4f9f23a27a1003",
      address: "",
      script_hash: "",
      vout: 0,
      status: {
        confirmed: true,
        block_height: 0,
        block_hash: "",
        block_time: 0,
      },
      value: 99999,
    };

    const dummyInput = {
      utxo: await P2trUtxo.fromBitcoinUTXO(
        dummyBitcoinUTXO,
        runeCommitAccount.tapInternalKey,
        runeCommitAccount.paymentWitness,
        runeCommitAccount.redeem,
      ),
      value: dummyBitcoinUTXO.value,
    };

    const p = new PSBT({
      network: this.config.env.NETWORK,
      inputs: [dummyInput],
      outputs: [
        {
          output: Address.fromString(holderAddress),
          value: BASE_RUNE_SAT,
        },
        {
          output: new OpReturn({ buffer: encodedRunestone }),
          value: 0,
        },
      ],
      feeRate,
      changeOutput: Address.fromString(this.accountService.addressP2wpkh),
      autoUtxo: {
        api: this.api.api,
        from: new P2trAutoUtxo(runeCommitAccount),
      },
    });

    await p.build();
    return p.feeValue;
  }

  private getMagicNetwork(): Network {
    let network;
    switch (this.config.env.NETWORK) {
      case "regtest":
        network = Network.REGTEST;
        break;

      case "testnet":
        network = Network.TESTNET;
        break;

      case "mainnet":
        network = Network.MAINNET;
        break;

      case "signet":
        network = Network.SIGNET;
        break;

      default:
        throw new Error("Error magic network is invalid");
    }

    return network;
  }

  // example commit etching min blocks
  // 09 10 11 12 13 14 15 16
  //    ^ commit          ^ etching
  // ^ call etching API
  // the commit should be has at least 6 confirmation blocks
  private async validateRuneName(runeName: string) {
    const minBlockNextEtching =
      (await this.api.electrsApi.getBlockTip()) + 6 + 1;
    const rune = Rune.fromString(runeName.replaceAll("•", ""));

    const minimumRuneLength = Rune.getMinimumAtHeight(
      this.getMagicNetwork(),
      u128(minBlockNextEtching),
    );

    if (rune.value < minimumRuneLength.value) {
      throw new Error(
        `Error minimum rune must be more than ${minimumRuneLength.value.toString()} or ${minimumRuneLength.toString()}`,
      );
    }
  }

  private formatRuneName(runeName: string) {
    return runeName.replaceAll(".", "•");
  }

  async etching(data: EtchingRequest) {
    data.runeName = this.formatRuneName(data.runeName);
    await this.validateRuneName(data.runeName);

    const contractRune = await this.nearService.getRune(data.runeName);
    if (contractRune) {
      throw new Error("Error rune name already exist in contract");
    }
    const runeOrd = await this.api.ordApi.getRune(data.runeName);
    if (runeOrd) {
      throw new Error("Error rune name already exist in ord server");
    }

    const runeCommit = await this.prismaService.prisma.rune.findFirst({
      where: {
        runeName: data.runeName,
      },
    });
    if (runeCommit) {
      return {
        commitAddress: runeCommit.commitAddress,
        minFundValue: runeCommit.minFundValue,
        isCommited: runeCommit.isCommited,
      };
    }

    const pointer = DEFAULT_RUNE_POINTER;
    const etchingRunestone = encodeRunestone({
      etching: {
        ...data,
        premine: data.maxSupply,
      },
      pointer,
    });

    let dataBuffer;
    if (data.dataHex) {
      dataBuffer = Buffer.from(data.dataHex, "hex");
    }

    const runeCommmitAccount = this.deriveRuneCommitAccount(
      etchingRunestone.etchingCommitment!,
      Buffer.from(data.userTapInternalKeyHex, "hex"),
      dataBuffer,
      data.dataMimeType,
    );

    const derivedBitcoinAddress = (
      await deriveBitcoinAddress(
        this.config.env.NEAR_RUNES_LAUNCHPAD_CONTRACT,
        data.runeName || "",
        this.config.env.NETWORK,
      )
    ).address;
    console.info(
      `Derived bitcoin address for ${data.runeName}: ${derivedBitcoinAddress}`,
    );

    const feeValue = await this.estimateEtchingFee(
      runeCommmitAccount,
      etchingRunestone.encodedRunestone,
      this.accountService.addressP2wpkh,
      data.feeRate,
    );

    const holderAddress = this.accountService.addressP2wpkh;
    const fundValue = feeValue + BASE_RUNE_SAT;

    await this.prismaService.prisma.rune.create({
      data: {
        commitAddress: runeCommmitAccount.address,
        runeBitcoinAddress: derivedBitcoinAddress,
        feeRate: data.feeRate,
        minFundValue: fundValue,
        commitBufferHex: etchingRunestone.etchingCommitment!.toString("hex"),
        runeBufferHex: etchingRunestone.encodedRunestone.toString("hex"),
        holderAddress,
        tapInternalKeyHex: runeCommmitAccount.tapInternalKey.toString("hex"),
        userTapInternalKeyHex: data.userTapInternalKeyHex,
        dataHex: data.dataHex,
        dataMimeType: data.dataMimeType,
        runeName: data.runeName,
        pricePerRune: data.pricePerRune,
        maxSupply: data.maxSupply.toString(),
        nearCreatorAddress: data.nearCreatorAddress,
      },
    });

    return {
      commitAddress: runeCommmitAccount.address,
      minFundValue: fundValue,
      isCommited: false,
    };
  }

  private async getEligibleCommitUtxo(address: string, minFundValue: number) {
    let [utxos, blockTip] = await Promise.all([
      this.api.electrsApi.getUTXOs(address),
      this.api.electrsApi.getBlockTip(),
    ]);
    utxos = utxos.filter((utxo) => utxo.status.confirmed === true);

    if (utxos.length === 0) return null;

    utxos.sort((a, b) => a.value - b.value);

    const utxo = utxos[0]!;

    if (utxo.value < minFundValue) return null;
    const confirmation = blockTip - utxo.status.block_height + 1;

    console.info({
      confirmation,
      blockTip,
      statusBlock: utxo.status.block_height,
    });

    if (confirmation >= 6) {
      return utxo;
    }

    return null;
  }

  private async runeCommmitChecker() {
    const runeCommits = await this.prismaService.prisma.rune.findMany({
      where: {
        isCommited: false,
      },
      take: 1,
      orderBy: {
        lastCheckedAt: "asc",
      },
    });

    for (const runeCommit of runeCommits) {
      console.info("Processing rune commit", runeCommit.commitAddress);
      const utxo = await this.getEligibleCommitUtxo(
        runeCommit.commitAddress,
        runeCommit.minFundValue,
      );
      if (!utxo) {
        console.info("No eligible UTXO for", runeCommit.commitAddress);
        await this.prismaService.prisma.rune.update({
          where: {
            id: runeCommit.id,
          },
          data: {
            lastCheckedAt: new Date(),
          },
        });
        continue;
      }

      let dataBuffer;
      if (runeCommit.dataHex) {
        dataBuffer = Buffer.from(runeCommit.dataHex, "hex");
      }
      const runeCommiAccount = this.deriveRuneCommitAccount(
        Buffer.from(runeCommit.commitBufferHex, "hex"),
        Buffer.from(runeCommit.userTapInternalKeyHex, "hex"),
        dataBuffer,
        runeCommit.dataMimeType || undefined,
      );

      console.info("Spend rune commit", runeCommit.commitAddress);
      const txHash = await this.spendRuneCommit(
        runeCommiAccount,
        utxo,
        Buffer.from(runeCommit.runeBufferHex, "hex"),
        runeCommit.runeBitcoinAddress,
        runeCommit.feeRate,
      );
      await this.prismaService.prisma.rune.update({
        where: {
          id: runeCommit.id,
        },
        data: {
          isCommited: true,
          transactionHash: txHash,
          lastCheckedAt: new Date(),
        },
      });

      console.info("Rune commit is commited", txHash);
    }
  }

  async runeCommitWorker() {
    console.info("Starting rune commit worker");
    let isRunning = false;

    setInterval(async () => {
      if (isRunning) return;

      isRunning = true;
      await this.runeCommmitChecker();

      isRunning = false;
    }, 1000);
  }

  private async runeTransactionStatusChecker() {
    const runeCommits = await this.prismaService.prisma.rune.findMany({
      where: {
        isCommited: true,
        isConfirmed: false,
      },
      take: 1,
      orderBy: {
        lastCheckedAt: "asc",
      },
    });

    for (const runeCommit of runeCommits) {
      console.info(
        "Checking rune transaction status for ",
        runeCommit.transactionHash,
      );

      if (!runeCommit.transactionHash) return;

      const status = await this.api.electrsApi.getTransactionStatus(
        runeCommit.transactionHash!,
      );
      if (status.confirmed === false) return;

      const ordBlockTip = await this.api.ordApi.getBlockTip();
      if (ordBlockTip < status.block_height) {
        console.info("Waiting for ord block tip to catch up, skip..");
        continue;
      }
      const isValid =
        (await this.api.ordApi.getRune(runeCommit.runeName ?? "")) !== null;

      if (isValid) {
        console.info("Creating new rune", {
          ticker: runeCommit.runeName!,
          price: runeCommit.pricePerRune
            ? runeCommit.pricePerRune
            : "0",
          total: runeCommit.maxSupply!,
          launch_type: "FixedPrice",
        });

        const defaultCreatorAddress =
          this.config.env.NETWORK === "mainnet" ? "near" : "testnet";
        const result = await this.nearService.createNewRune(
          runeCommit.runeName!,
          runeCommit.maxSupply!,
          runeCommit.pricePerRune ? runeCommit.pricePerRune : "0",
          runeCommit.nearCreatorAddress || defaultCreatorAddress,
        );

        if (result.status.SuccessValue === "") {
          await this.prismaService.prisma.rune.update({
            where: {
              id: runeCommit.id,
            },
            data: {
              isConfirmed: true,
              isValid: true,
              lastCheckedAt: new Date(),
              outpoint: `${runeCommit.transactionHash}:${DEFAULT_RUNE_POINTER}`,
            },
          });
          console.info(
            "Rune transaction is confirmed and the rune is valid",
            runeCommit.transactionHash,
          );
        }

        continue;
      }

      await this.prismaService.prisma.rune.update({
        where: {
          id: runeCommit.id,
        },
        data: {
          isConfirmed: true,
          isValid: false,
          lastCheckedAt: new Date(),
        },
      });
      console.info(
        "Rune transaction is confirmed but the rune is invalid",
        runeCommit.transactionHash,
      );
    }
  }

  async runeTransactionStatusWorker() {
    console.info("Starting rune transaction status worker");
    let isRunning = false;

    setInterval(async () => {
      if (isRunning) return;

      isRunning = true;
      await this.runeTransactionStatusChecker();

      isRunning = false;
    }, 1000);
  }

  async getRuneCommits() {
    const runeCommits = await this.prismaService.prisma.rune.findMany();
    return runeCommits;
  }

  async getWithddraws() {
    const withdraws = await this.prismaService.prisma.withdraw.findMany();
    return withdraws;
  }

  async withdraw(data: WithdrawRequest) {
    const paymentAddress = Address.fromString(data.paymentAddress);
    if (paymentAddress.type !== "p2pkh") {
      throw new Error("Error payment address is not p2pkh");
    }

    const [nearRune, runeOrd] = await Promise.all([
      this.nearService.getRune(data.runeName),
      this.api.ordApi.getRune(data.runeName),
    ]);
    if (!nearRune || !runeOrd) {
      throw new Error("Error rune name not exist");
    }

    const withdrawAmount = await this.nearService.getRuneBalance(
      data.runeName,
      data.nearAccountAddress,
    );
    if (withdrawAmount === 0) {
      throw new Error("Error balance is 0");
    }

    await this.prismaService.prisma.withdraw.create({
      data: {
        nearAccountAddress: data.nearAccountAddress,
        isWithdrawn: true,
      },
    });

    const rune = await this.prismaService.prisma.rune.findFirst({
      where: {
        runeName: data.runeName,
      },
    });
    if (!rune) {
      throw new Error("Error rune not found in the database");
    }
    if (!rune.outpoint) {
      throw new Error("Error rune outpoint is empty");
    }

    const runeContractUtxos = await this.api.api.getRuneUtxos2(
      rune.runeBitcoinAddress,
      rune.runeName!,
    );
    if (runeContractUtxos.length === 0) {
      throw new Error("Error rune contract utxos is empty");
    }
    const runeContractBalance = runeContractUtxos[0]!.value;
    if (runeContractBalance - withdrawAmount < 0) {
      throw new Error(
        "Error rune contract balance is not enough, something went wrong",
      );
    }

    const outpointSplit = runeContractUtxos[0]!.outpoint.split(":");
    const txHash = outpointSplit[0]!;
    const vout = parseInt(outpointSplit[1]!, 10);

    const runeBitcoinChangeAmount = runeContractBalance - withdrawAmount;
    const runeIdSplit = runeOrd.id.split(":");

    const edictRunestone = encodeRunestone({
      edicts: [
        {
          id: {
            block: BigInt(runeIdSplit[0]!),
            tx: parseInt(runeIdSplit[1]!, 10),
          },
          output: 0,
          amount: BigInt(runeBitcoinChangeAmount),
        },
        {
          id: {
            block: BigInt(runeIdSplit[0]!),
            tx: parseInt(runeIdSplit[1]!, 10),
          },
          output: 1,
          amount: BigInt(withdrawAmount),
        },
      ],
    });

    const adminBitcoin = await deriveBitcoinAddress(
      this.config.env.NEAR_RUNES_LAUNCHPAD_CONTRACT,
      rune.runeName || "",
      this.config.env.NETWORK,
    );

    const txHex = await this.api.electrsApi.getTransactionHex(txHash);
    const runeUTXO = new P2pkhUtxo({
      txid: txHash,
      vout,
      transaction: Buffer.from(txHex, "hex"),
    });

    const p = new PSBT({
      network: this.config.env.NETWORK,
      inputs: [
        {
          utxo: runeUTXO,
          value: BASE_RUNE_SAT,
        },
      ],
      outputs: [
        {
          output: Address.fromString(rune.runeBitcoinAddress),
          value: BASE_RUNE_SAT,
        },
        {
          output: Address.fromString(data.withdrawAddress),
          value: BASE_RUNE_SAT,
        },
        {
          output: new OpReturn({
            buffer: edictRunestone.encodedRunestone,
          }),
          value: 0,
        },
      ],
      feeRate: data.feeRate,
      changeOutput: Address.fromString(paymentAddress.address),
      useSafeUtxo: true,
      autoUtxo: {
        api: this.api.api,
        from: new P2pkhAutoUtxo({
          address: paymentAddress.address,
        }),
      },
    });

    const generateMpcKeyPair = (publickey: Buffer) => {
      return {
        publicKey: publickey,
        sign: async (transactionHash: Buffer): Promise<Buffer> => {
          const payload = Array.from(transactionHash.toJSON().data);

          const result = await this.nearService.sign2(
            Array.from(payload),
            rune.runeName || "",
            0,
          );
          if (!result) {
            throw new Error("Failed to sign transaction");
          }

          const signature = reconstructSignature(result[0], result[1]);

          const ss = new secp256k1.Signature(
            bufferToBigInt(signature.r),
            bufferToBigInt(signature.s),
          ).addRecoveryBit(signature.v);

          const recoveredPublicKey = Buffer.from(
            ss.recoverPublicKey(transactionHash).toHex(),
            "hex",
          );

          console.log({
            adminPubkey: adminBitcoin.publicKey,
            recoveredPublicKey,
          });

          return signature.rawSignature;
        },
      };
    };
    await p.build();

    const signIndexes = p.inputs.map((_, i) => i);
    // the first index is used by by the rune contract address
    signIndexes.shift();
    if(signIndexes.length === 0) {
      throw new Error('Error payment utxos is empty, balance not enough')
    }

    const keypair = generateMpcKeyPair(adminBitcoin.publicKey);

    await p.signInputAsync(0, keypair);

    await this.nearService.withdraw(
      data.runeName,
      data.nearAccountAddress,
      data.withdrawAddress,
    );

    return {
      psbtHex: p.toHex(false),
      signIndexes,
    };
  }
}

export default RuneService;
