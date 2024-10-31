import { Address, P2wpkhAutoUtxo, PSBT, Wallet } from "@satstation-backend/sdk";
import { singleton } from "tsyringe";
import ConfigService from "../config/config.service";
import Api from "../api/api.service";

@singleton()
class AccountService {
  wallet;
  p2wpkh;

  constructor(
    private readonly config: ConfigService,
    private readonly api: Api,
  ) {
    this.wallet = new Wallet({
      mnemonic: this.config.env.BTC_MNEMONIC,
      network: this.config.env.NETWORK,
    });

    this.p2wpkh = this.wallet.p2wpkh(0);
  }

  get addressP2wpkh() {
    return this.p2wpkh.address;
  }

  async sendBalanceP2wpkhToAddress(address: string, sat: number, feeRate = 1) {
    const p = new PSBT({
      network: this.config.env.NETWORK,
      inputs: [],
      outputs: [
        {
          output: Address.fromString(address),
          value: sat,
        },
      ],
      feeRate,
      changeOutput: Address.fromString(this.p2wpkh.address),
      autoUtxo: {
        api: this.api.api,
        from: new P2wpkhAutoUtxo(this.p2wpkh),
      },
    });

    await p.build();
    p.signAllInputs(this.p2wpkh.keypair);
    p.finalizeAllInputs();

    await this.api.electrsApi.brodcastTx(p.toHex(true));
  }
}

export default AccountService;
