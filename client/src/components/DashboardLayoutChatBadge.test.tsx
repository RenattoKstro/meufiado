// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.stubGlobal("ResizeObserver", class {
  observe() {}
  unobserve() {}
  disconnect() {}
});

const unreadQuery = vi.hoisted(() => vi.fn());
const metricsQuery = vi.hoisted(() => vi.fn(() => ({ data: { currentOverdue: 8, portfolioTotal: 100 } })));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 9, role: "user", name: "Operador" }, logout: vi.fn() }) }));
vi.mock("@/contexts/ThemeContext", () => ({ useTheme: () => ({ theme: "dark", toggleTheme: vi.fn() }) }));
vi.mock("@/hooks/useMobile", () => ({ useIsMobile: () => false }));
vi.mock("@/lib/trpc", () => ({ trpc: { chat: { unreadCount: { useQuery: unreadQuery } }, profile: { mine: { useQuery: () => ({ data: { profile: { avatarUrl: null } } }) } }, metrics: { mine: { useQuery: metricsQuery } }, subscription: { mine: { useQuery: () => ({ data: { isPro: true, settings: { chatPlan: "pro" } } }) } } } }));
vi.mock("wouter", () => ({ Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>, useLocation: () => ["/", vi.fn()] }));

import DashboardLayout from "./DashboardLayout";

describe("contador de mensagens no menu", () => {
  afterEach(() => {
    cleanup();
    metricsQuery.mockReturnValue({ data: { currentOverdue: 8, portfolioTotal: 100 } });
  });

  it("mostra a quantidade de mensagens novas ao lado de Chat", () => {
    unreadQuery.mockReturnValue({ data: 3 });
    render(<DashboardLayout><div>Conteúdo</div></DashboardLayout>);
    expect(screen.getByLabelText("3 mensagens novas")).toHaveTextContent("3");
  });

  it("oculta o contador quando não existem mensagens novas", () => {
    unreadQuery.mockReturnValue({ data: 0 });
    render(<DashboardLayout><div>Conteúdo</div></DashboardLayout>);
    expect(screen.queryByLabelText(/mensagens novas/i)).not.toBeInTheDocument();
  });

  it("remove o contador quando a consulta é atualizada após a leitura", () => {
    unreadQuery.mockReturnValue({ data: 2 });
    const view = render(<DashboardLayout><div>Conteúdo</div></DashboardLayout>);
    expect(screen.getByLabelText("2 mensagens novas")).toBeInTheDocument();

    unreadQuery.mockReturnValue({ data: 0 });
    view.rerender(<DashboardLayout><div>Conteúdo</div></DashboardLayout>);
    expect(screen.queryByLabelText(/mensagens novas/i)).not.toBeInTheDocument();
  });

  it("mostra a inadimplência inteira ao lado de Meu Fiado com a cor do limite", () => {
    unreadQuery.mockReturnValue({ data: 0 });
    metricsQuery.mockReturnValue({ data: { currentOverdue: 8, portfolioTotal: 100 } });
    render(<DashboardLayout><div>Conteúdo</div></DashboardLayout>);
    expect(screen.getByText("8%")).toHaveClass("text-destructive");
  });

  it("usa verde para inadimplência abaixo de 7%", () => {
    unreadQuery.mockReturnValue({ data: 0 });
    metricsQuery.mockReturnValue({ data: { currentOverdue: 6, portfolioTotal: 100 } });
    render(<DashboardLayout><div>Conteúdo</div></DashboardLayout>);
    expect(screen.getByText("6%")).toHaveClass("text-emerald-600");
  });
});
