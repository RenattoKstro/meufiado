import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  getMySubscription: vi.fn(),
  listRomaneioDocuments: vi.fn(),
  createRomaneioDocument: vi.fn(),
  listRomaneioParties: vi.fn(),
  listRomaneioProducts: vi.fn(),
  saveRomaneioPdf: vi.fn(),
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
  invoiceNumber: "NF-2026-001",
  transferDate: "2026-08-22",
  requesting: { name: "Gerente Solicitante", branch: "002", address: "Rua Norte, 10", neighborhood: "Centro" },
  providing: { name: "Gerente Fornecedor", branch: "001", address: "Rua Sul, 20", neighborhood: "Jardim" },
  items: [{ productCode: "123", productName: "Produto de teste", unit: "UN" }],
};

describe("procedures de Romaneio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bloqueia histórico e catálogos para operador Free", async () => {
    dbMocks.getMySubscription.mockResolvedValue({ isPro: false });
    const caller = appRouter.createCaller(contextFor("user"));

    await expect(caller.romaneio.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.romaneio.parties()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.listRomaneioDocuments).not.toHaveBeenCalled();
    expect(dbMocks.listRomaneioParties).not.toHaveBeenCalled();
  });

  it("exige Nota Fiscal antes de criar um Romaneio", async () => {
    dbMocks.getMySubscription.mockResolvedValue({ isPro: true });

    await expect(appRouter.createCaller(contextFor("user")).romaneio.create({ ...documentInput, invoiceNumber: "" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.createRomaneioDocument).not.toHaveBeenCalled();
  });

  it("permite criar Romaneio para PRO e usa o proprietário autenticado", async () => {
    dbMocks.getMySubscription.mockResolvedValue({ isPro: true });
    dbMocks.createRomaneioDocument.mockResolvedValue({ id: 14, ...documentInput, shareToken: "a".repeat(32) });

    await appRouter.createCaller(contextFor("user")).romaneio.create(documentInput);

    expect(dbMocks.createRomaneioDocument).toHaveBeenCalledWith(91, documentInput);
  });

  it("permite consultar catálogos e salvar PDF para PRO", async () => {
    dbMocks.getMySubscription.mockResolvedValue({ isPro: true });
    dbMocks.listRomaneioParties.mockResolvedValue([{ id: 1, name: "Gerente Solicitante" }]);
    dbMocks.listRomaneioProducts.mockResolvedValue([{ id: 1, code: "123", description: "Produto de teste", unit: "UN" }]);
    dbMocks.saveRomaneioPdf.mockResolvedValue({ id: 14, pdfUrl: "/manus-storage/romaneio.pdf" });
    const caller = appRouter.createCaller(contextFor("user"));

    await expect(caller.romaneio.parties()).resolves.toEqual([{ id: 1, name: "Gerente Solicitante" }]);
    await expect(caller.romaneio.products()).resolves.toHaveLength(1);
    await caller.romaneio.savePdf({ id: 14, pdfDataUrl: "data:application/pdf;base64," + "a".repeat(128) });

    expect(dbMocks.listRomaneioParties).toHaveBeenCalledOnce();
    expect(dbMocks.listRomaneioProducts).toHaveBeenCalledOnce();
    expect(dbMocks.saveRomaneioPdf).toHaveBeenCalledWith(91, 14, expect.stringContaining("data:application/pdf;base64,"));
  });

  it("permite acesso administrativo ao Romaneio sem exigir plano PRO", async () => {
    dbMocks.listRomaneioDocuments.mockResolvedValue([]);

    await appRouter.createCaller(contextFor("admin")).romaneio.list();

    expect(dbMocks.getMySubscription).not.toHaveBeenCalled();
    expect(dbMocks.listRomaneioDocuments).toHaveBeenCalledWith(91);
  });

  it("mantém consulta e assinatura pública por link tokenizado", async () => {
    const token = "b".repeat(32);
    dbMocks.getSharedRomaneioDocument.mockResolvedValue({ id: 14, shareToken: token, status: "shared", items: [] });
    dbMocks.signSharedRomaneioDocument.mockResolvedValue({ id: 14, status: "partially_signed" });
    const caller = appRouter.createCaller(contextFor("user"));

    await caller.romaneio.shared({ token });
    await caller.romaneio.sign({ token, signer: "destination", signatureDataUrl: "data:image/png;base64," + "a".repeat(64), signatureStyle: "elegante" });

    expect(dbMocks.getSharedRomaneioDocument).toHaveBeenCalledWith(token);
    expect(dbMocks.signSharedRomaneioDocument).toHaveBeenCalledWith(token, "destination", expect.stringContaining("data:image/png;base64,"), "elegante");
  });

  it("aceita assinatura manual escrita na tela e a encaminha como tal", async () => {
    const token = "d".repeat(32);
    dbMocks.signSharedRomaneioDocument.mockResolvedValue({ id: 14, status: "partially_signed" });

    await appRouter.createCaller(contextFor("user")).romaneio.sign({ token, signer: "origin", signatureDataUrl: "data:image/png;base64," + "a".repeat(64), signatureStyle: "manual" });

    expect(dbMocks.signSharedRomaneioDocument).toHaveBeenCalledWith(token, "origin", expect.stringContaining("data:image/png;base64,"), "manual");
  });

  it("rejeita assinatura sem estilo ou com estilo desconhecido", async () => {
    const token = "c".repeat(32);
    const caller = appRouter.createCaller(contextFor("user"));

    await expect(caller.romaneio.sign({ token, signer: "origin", signatureDataUrl: "data:image/png;base64," + "a".repeat(64) } as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.romaneio.sign({ token, signer: "origin", signatureDataUrl: "data:image/png;base64," + "a".repeat(64), signatureStyle: "desconhecida" } as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.signSharedRomaneioDocument).not.toHaveBeenCalled();
  });
});
