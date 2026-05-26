import { Prisma, PrismaClient } from "@prisma/client";

export function createFortunaPrismaClient(): PrismaClient {
  return new PrismaClient();
}

export type FortunaPrismaClient = PrismaClient;
export type FortunaPrismaTransaction = Prisma.TransactionClient;
