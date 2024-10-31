import { BElectrsAPI, API, OrdAPI } from "@satstation-backend/sdk";
import { singleton } from "tsyringe";
import ConfigService from "../config/config.service";

@singleton()
class Api {
  electrsApi;
  ordApi;

  api;

  constructor(private readonly config: ConfigService) {
    this.electrsApi = new BElectrsAPI({
      network: this.config.env.NETWORK,
      apiUrl: {
        [this.config.env.NETWORK]: this.config.env.ELECTRS_URL,
      },
    });

    this.ordApi = new OrdAPI({
      network: this.config.env.NETWORK,
      apiUrl: {
        [this.config.env.NETWORK]: this.config.env.ORD_URL,
      },
    });

    this.api = new API({
      network: this.config.env.NETWORK,
      bitcoin: this.electrsApi,
      ord: this.ordApi,
    });
  }
}

export default Api;
