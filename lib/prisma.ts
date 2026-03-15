import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaPool?: Pool;
  prismaSignature?: string;
};

function getCurrentPrismaSignature() {
  return Prisma.dmmf.datamodel.models
    .map((model) => `${model.name}:${model.fields.map((field) => field.name).join(",")}`)
    .sort()
    .join("|");
}

function getExpectedDelegates() {
  return Prisma.dmmf.datamodel.models.map((model) => {
    return `${model.name.charAt(0).toLowerCase()}${model.name.slice(1)}`;
  });
}

function hasExpectedDelegates(client: PrismaClient) {
  const prismaRecord = client as unknown as Record<string, unknown>;
  return getExpectedDelegates().every((delegate) => prismaRecord[delegate] !== undefined);
}

function createClient() {
  if (!process.env.DATABASE_URL) {
    return {} as PrismaClient;
  }

  const pool =
    globalForPrisma.prismaPool ??
    new Pool({
      connectionString: process.env.DATABASE_URL,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prismaPool = pool;
  }

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export function hasCommentReplySupport() {
  const commentModel = Prisma.dmmf.datamodel.models.find((model) => model.name === "Comment");
  return commentModel?.fields.some((field) => field.name === "parentId") ?? false;
}

const prismaSignature = getCurrentPrismaSignature();

function getPrismaClient() {
  const cachedClient = globalForPrisma.prisma;

  if (
    cachedClient &&
    globalForPrisma.prismaSignature === prismaSignature &&
    hasExpectedDelegates(cachedClient)
  ) {
    return cachedClient;
  }

  if (cachedClient) {
    void cachedClient.$disconnect().catch(() => {
      // Ignore cleanup failures when rotating a stale dev client.
    });
  }

  const nextClient = createClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = nextClient;
    globalForPrisma.prismaSignature = prismaSignature;
  }

  return nextClient;
}

export const prisma = getPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSignature = prismaSignature;
}

