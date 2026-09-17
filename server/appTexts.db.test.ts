import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("drizzle-orm/node-postgres", () => ({ drizzle: vi.fn(() => dbMock) }));

import { DEFAULT_APP_TEXT_SETTINGS, getAppTextSettings } from "./db";

describe("configuração singleton de textos", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "mysql://mock";
  });

  afterAll(() => {
    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it("insere e retorna os textos padrão quando a tabela está vazia", async () => {
    const created = { id: 1, ...DEFAULT_APP_TEXT_SETTINGS, updatedAt: new Date() };
    const limit = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([created]);
    dbMock.select.mockReturnValue({ from: vi.fn().mockReturnValue({ limit }) });
    const values = vi.fn().mockResolvedValue(undefined);
    dbMock.insert.mockReturnValue({ values });

    await expect(getAppTextSettings()).resolves.toEqual(created);
    expect(values).toHaveBeenCalledWith(DEFAULT_APP_TEXT_SETTINGS);
  });
});
