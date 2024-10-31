import { singleton } from "tsyringe";
import { PrismaClient } from "../../../prisma/schema-dist";

@singleton()
class PrismaService {
  prisma: PrismaClient;

  constructor() {
    const prisma = new PrismaClient();
    this.prisma = prisma;
  }

  async init() {
    await this.prisma.$connect();
  }
}

export default PrismaService;
