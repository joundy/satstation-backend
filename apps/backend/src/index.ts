import "reflect-metadata";
import express from "express";
import cors from "cors";

import { container } from "tsyringe";
import ConfigService from "./modules/config/config.service";
import RuneController from "./modules/rune/rune.controller";
import bodyParser from "body-parser";
import RuneService from "./modules/rune/rune.service";

async function main() {
  const config = container.resolve(ConfigService);

  const runeController = container.resolve(RuneController);
  const runeService = container.resolve(RuneService);
  runeService.runeCommitWorker();
  runeService.runeTransactionStatusWorker();

  const app = express();
  app.use(cors());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());

  app.use("/rune", runeController.router);

  app.listen(config.env.PORT, () => {
    console.info(`Server is running on port: ${config.env.PORT}`);
  });
}

main();
