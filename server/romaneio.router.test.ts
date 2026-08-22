import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  getMySubscription: vi.fn(),
  listRomaneioDocuments: vi.fn(),
  createRomaneioDocument: vi.fn(),
  getSharedRomaneioDocument: vi.fn(),
  signSharedRomaneioDocument: vi.fn(),
}));

vi.mock("./db", async importActual => ({
  ...(await importActual<typeof import("./db")>()),
  ...dbMocks,
}));

import { appRouter } from "./routers";

function contextFor(role: "user" | "admin"): TrpcContext {
  return {
    user: {
      id: 91,
      openId: "romaneio-test",
      email: "teste@example.com",
      name: "Pessoa de teste",
      loginMethod: "google",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const documentInput = {
  documentNumber: "ROM-001",
  transferDate: "2026-08-22",
  originName: "Filial Centro",
  originManagerName: "Gerente Origem",
  destinationName: "Filial Norte",
  destinationManagerName: "Gerente Destino",
  items: [{ productName: "Produto de teste", requestedQuantity: 10, approvedQuantity: 10, deliveredQuantity: 10 }],
};

describe("procedures de Romaneio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bloqueia o histórico privado para operador Free", async () => {
    dbMocks.getMySubscription.mockResolvedValue({ isPro: false });

    await expect(appRouter.createCaller(contextFor("user")).romaneio.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.listRomaneioDocuments).not.toHaveBeenCalled();
  });

  it("permite criar Romaneio para PRO e usa o proprietário autenticado", async () => {
    dbMocks.getMySubscription.mockResolvedValue({ isPro: true });
    dbMocks.createRomaneioDocument.mockResolvedValue({ id: 14, ...documentInput, shareToken: "a".repeat(32) });

    await appRouter.createCaller(contextFor("user")).romaneio.create(documentInput);

    expect(dbMocks.createRomaneioDocument).toHaveBeenCalledWith(91, documentInput);
  });

  it("permite acesso administrativo ao Romaneio sem exigir plano PRO", async () => {
    dbMocks.listRomaneioDocuments.mockResolvedValue([]);

    await appRouter.createCaller(contextFor("admin")).romaneio.list();

    expect(dbMocks.getMySubscription).not.toHaveBeenCalled();
    expect(dbMocks.listRomaneioDocuments).toHaveBeenCalledWith(91);
  });

  it("permite consultar e assinar um Romaneio por link público válido", async () => {
    const token = "b".repeat(32);
    dbMocks.getSharedRomaneioDocument.mockResolvedValue({ id: 14, shareToken: token, status: "shared", items: [] });
    dbMocks.signSharedRomaneioDocument.mockResolvedValue({ id: 14, status: "partially_signed" });
    const caller = appRouter.createCaller(contextFor("user"));

    await caller.romaneio.shared({ token });
    await caller.romaneio.sign({ token, signer: "origin", signatureDataUrl: "data:image/png;base64," + "a".repeat(64) });

    expect(dbMocks.getSharedRomaneioDocument).toHaveBeenCalledWith(token);
    expect(dbMocks.signSharedRomaneioDocument).toHaveBeenCalledWith(token, "origin", expect.stringContaining("data:image/png;base64,"));
  });
});
