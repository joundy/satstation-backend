import "dotenv/config";
import { singleton } from "tsyringe";
import * as z from "zod";

@singleton()
class ConfigService {
  env;
  config = {
    getNearConfig: (env: string) => {
      switch (env) {
        case "production":
        case "mainnet":
          return {
            networkId: "mainnet",
            nodeUrl: "https://rpc.mainnet.near.org",
            walletUrl: "https://wallet.near.org",
            helperUrl: "https://helper.mainnet.near.org",
          };
        case "development":
        case "testnet":
          return {
            networkId: "default",
            nodeUrl: "https://rpc.testnet.near.org",
            walletUrl: "https://wallet.testnet.near.org",
            helperUrl: "https://helper.testnet.near.org",
          };
        case "betanet":
          return {
            networkId: "betanet",
            nodeUrl: "https://rpc.betanet.near.org",
            walletUrl: "https://wallet.betanet.near.org",
            helperUrl: "https://helper.betanet.near.org",
          };
        case "custom":
          return {
            networkId: "localnet",
            nodeUrl: "http://localhost:3030",
          };
        default:
          throw Error(`Unconfigured environment '${env}.`);
      }
    },
  };

  constructor() {
    const envSchema = z.object({
      NETWORK: z.enum(["regtest", "signet", "testnet", "mainnet"]),
      ELECTRS_URL: z.string().url(),
      ORD_URL: z.string().url(),
      BTC_MNEMONIC: z.string(),
      PORT: z.coerce.number().min(0).max(65535),
      NEAR_ENV: z.string(),
      NEAR_RUNES_ADMIN: z.string(),
      NEAR_RUNES_LAUNCHPAD_CONTRACT: z.string(),
      NEAR_MPC_CONTRACT: z.string(),
    });
    try {
      const env = envSchema.parse(process.env);
      this.env = env;
    } catch (zodError) {
      const err = zodError as z.ZodError;
      console.error("Error parsing environment variables");
      console.error(err.errors);
      process.exit(1);
    }
  }
}

export default ConfigService;
