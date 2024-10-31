import { singleton } from "tsyringe";
import ConfigService from "../config/config.service";
import { Account, connect, Contract, KeyPair, providers } from "near-api-js";
import { InMemoryKeyStore } from "near-api-js/lib/key_stores";
import { functionCall } from "near-api-js/lib/transaction";

@singleton()
class NearService {
  adminAccount: Account;
  constructor(private readonly config: ConfigService) {}

  async init() {
    if (!this.adminAccount) {
      const adminAccountParams = JSON.parse(this.config.env.NEAR_RUNES_ADMIN);
      const keyStore = new InMemoryKeyStore();
      const keyPair = KeyPair.fromString(adminAccountParams.private_key);
      const nearConfig = this.config.config.getNearConfig(
        this.config.env.NEAR_ENV
      );
      const near = await connect({
        // @ts-ignore
        keyStore,
        ...nearConfig,
      });
      await keyStore.setKey(
        nearConfig.networkId,
        adminAccountParams.account_id,
        keyPair
      );
      const nearAccount: Account = await near.account(
        adminAccountParams.account_id
      );
      this.adminAccount = nearAccount;
    }
  }

  public async createNewRune(
    ticker: string,
    total: string,
    price: string,
    nearCreatorAddress: string
  ) {
    await this.init();
    return await this.adminAccount.signAndSendTransaction({
      receiverId: this.config.env.NEAR_RUNES_LAUNCHPAD_CONTRACT,
      actions: [
        functionCall(
          "new_rune",
          {
            ticker,
            total,
            price,
            launch_type: "FixedPrice",
            creator_address: nearCreatorAddress,
          },
          300000000000000n,
          0n
        ),
      ],
      returnError: true,
    });
  }

  public async getRune(ticker: string): Promise<{
    ticker: string;
    total: string;
    minted: string;
    price: string;
  } | null> {
    await this.init();
    const contract = new Contract(
      this.adminAccount,
      this.config.env.NEAR_RUNES_LAUNCHPAD_CONTRACT,
      {
        viewMethods: ["get_rune"],
      }
    );

    try {
      const response = await contract.get_rune({ ticker });
      return response;
    } catch (error: any) {
      if (error.message.includes("Rune doesn't exist")) {
        return null;
      }
      throw error;
    }
  }

  public async getRuneBalance(
    ticker: string,
    accountId: string
  ): Promise<number> {
    await this.init();
    const contract = new Contract(
      this.adminAccount,
      this.config.env.NEAR_RUNES_LAUNCHPAD_CONTRACT,
      {
        viewMethods: ["get_rune_balance"],
      }
    );

    const response = await contract.get_rune_balance({
      ticker,
      account_id: accountId,
    });
    return parseInt(response, 10);
  }

  public async withdraw(
    ticker: string,
    accountId: string,
    bitcoinAddress: string
  ): Promise<any> {
    await this.init();
    return await this.adminAccount.signAndSendTransaction({
      receiverId: this.config.env.NEAR_RUNES_LAUNCHPAD_CONTRACT,
      actions: [
        functionCall(
          "withdraw",
          {
            ticker,
            account_id: accountId,
            bitcoin_address: bitcoinAddress,
          },
          300000000000000n,
          0n
        ),
      ],
      returnError: true,
    });
  }

  public async sign(
    payload: any,
    ticker: string,
    keyVersion: number
  ): Promise<any> {
    await this.init();
    return await this.adminAccount.signAndSendTransaction({
      receiverId: this.config.env.NEAR_RUNES_LAUNCHPAD_CONTRACT,
      actions: [
        functionCall(
          "sign",
          {
            payload,
            ticker,
            key_version: keyVersion,
          },
          300000000000000n,
          0n
        ),
      ],
      returnError: true,
    });
  }

  public async sign2(
    payload: any,
    ticker: string,
    keyVersion: number
  ) {
    await this.init();
    const outcome = await this.adminAccount.signAndSendTransaction({
      receiverId: this.config.env.NEAR_RUNES_LAUNCHPAD_CONTRACT,
      actions: [
        functionCall(
          "sign",
          {
            payload,
            ticker,
            key_version: keyVersion,
          },
          300000000000000n,
          0n
        ),
      ],
      returnError: true,
    });

    return providers.getTransactionLastResult(outcome)
  }
}

export default NearService;
