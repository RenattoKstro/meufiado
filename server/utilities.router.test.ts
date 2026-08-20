import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  listUtilityDownloads: vi.fn(),
  listUtilityReports: vi.fn(),
  createUtilityDownload: vi.fn(),
  updateUtilityDownload: vi.fn(),
  deleteUtilityDownload: vi.fn(),
  createUtilityReport: vi.fn(),
  updateUtilityReport: vi.fn(),
  deleteUtilityReport: vi.fn(),
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
      openId: "utilities-test",
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

const download = {
  title: "Manual de recebimentos",
  fileType: "PDF",
  externalUrl: "https://example.com/manual.pdf",
  isPinned: true,
  isVisible: true,
};

const report = {
  title: "Atualização Sabium",
  description: "Resumo da operação\n- Primeiro indicador\n- Segundo indicador",
  isVisible: true,
};

describe("procedures de Utilidades", () => {
  it("lista somente conteúdo visível para operador e todo o acervo para administrador", async () => {
    dbMocks.listUtilityDownloads.mockResolvedValue([]);
    dbMocks.listUtilityReports.mockResolvedValue([]);

    await appRouter.createCaller(contextFor("user")).utilities.downloads();
    await appRouter.createCaller(contextFor("user")).utilities.reports();
    await appRouter.createCaller(contextFor("admin")).utilities.downloads();
    await appRouter.createCaller(contextFor("admin")).utilities.reports();

    expect(dbMocks.listUtilityDownloads).toHaveBeenNthCalledWith(1, false);
    expect(dbMocks.listUtilityReports).toHaveBeenNthCalledWith(1, false);
    expect(dbMocks.listUtilityDownloads).toHaveBeenNthCalledWith(2, true);
    expect(dbMocks.listUtilityReports).toHaveBeenNthCalledWith(2, true);
  });

  it("permite ao administrador criar, editar e remover Downloads e Relatórios", async () => {
    Object.values(dbMocks).forEach(mock => mock.mockResolvedValue(undefined));
    const caller = appRouter.createCaller(contextFor("admin"));

    await caller.utilityAdmin.createDownload(download);
    await caller.utilityAdmin.updateDownload({ id: 11, data: { ...download, isPinned: false, isVisible: false } });
    await caller.utilityAdmin.deleteDownload({ id: 11 });
    await caller.utilityAdmin.createReport(report);
    await caller.utilityAdmin.updateReport({ id: 17, data: { ...report, isVisible: false } });
    await caller.utilityAdmin.deleteReport({ id: 17 });

    expect(dbMocks.createUtilityDownload).toHaveBeenCalledWith(download, 91);
    expect(dbMocks.updateUtilityDownload).toHaveBeenCalledWith(11, { ...download, isPinned: false, isVisible: false });
    expect(dbMocks.deleteUtilityDownload).toHaveBeenCalledWith(11);
    expect(dbMocks.createUtilityReport).toHaveBeenCalledWith(report, 91);
    expect(dbMocks.updateUtilityReport).toHaveBeenCalledWith(17, { ...report, isVisible: false });
    expect(dbMocks.deleteUtilityReport).toHaveBeenCalledWith(17);
  });

  it("bloqueia a gestão de Downloads e Relatórios para operador comum", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.utilityAdmin.createDownload(download)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.utilityAdmin.createReport(report)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.utilityAdmin.deleteDownload({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.utilityAdmin.deleteReport({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
