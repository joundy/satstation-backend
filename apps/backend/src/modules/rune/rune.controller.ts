import { Router } from "express";
import RuneService from "./rune.service";
import { autoInjectable } from "tsyringe";
import { EtchingRequestSchema, WithdrawRequestSchema } from "./rune.dto";

@autoInjectable()
class RuneController {
  router;

  constructor(private readonly runeService: RuneService) {
    this.router = Router();

    this.router.post("/etching", async (req, res) => {
      try {
        const body = await EtchingRequestSchema.parseAsync(req.body);
        const result = await this.runeService.etching(body);

        res.json(result);
      } catch (err: any) {
        console.error(err);
        res.status(500).json({
          success: 0,
          message: err.message || err,
        });
      }
    });

    this.router.get("/rune-commits", async (_, res) => {
      try {
        const result = await this.runeService.getRuneCommits();
        res.json(result);
      } catch (err: any) {
        console.error(err);
        res.status(500).json({
          success: 0,
          message: err.message || err,
        });
      }
    });

    this.router.post("/withdraw", async (req, res) => {
      try {
        const body = await WithdrawRequestSchema.parseAsync(req.body);
        const result = await this.runeService.withdraw(body);

        res.json(result);
      } catch (err: any) {
        console.error(err);
        res.status(500).json({
          success: 0,
          message: err.message || err,
        });
      }
    });
  }
}

export default RuneController;
