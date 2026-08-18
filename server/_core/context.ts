import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { parse } from "cookie";
import { getUserById } from "../db";
import { ADMIN_SESSION_COOKIE, getAdminSessionUserId } from "../localAdminAuth";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  if (!user) {
    const token = parse(opts.req.headers.cookie || "")[ADMIN_SESSION_COOKIE];
    const adminUserId = await getAdminSessionUserId(token);
    if (adminUserId) user = (await getUserById(adminUserId)) ?? null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
