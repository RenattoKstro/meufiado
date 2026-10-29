// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
const resetPasswordForEmail = vi.hoisted(() => vi.fn());
const getSession = vi.hoisted(() => vi.fn());
const onAuthStateChange = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase", () => ({
  supabase: { rpc, auth: { getSession, onAuthStateChange, resetPasswordForEmail, updateUser: vi.fn(), signOut: vi.fn() } },
}));
vi.mock("wouter", () => ({ Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>, useLocation: () => ["/recuperar-senha", vi.fn()] }));

import PasswordRecovery from "./PasswordRecovery";

describe("recuperação de senha", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("resolve o usuário admin e solicita o link ao Supabase Auth", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    rpc.mockResolvedValue({ data: "renatto.kstro@gmail.com", error: null });
    resetPasswordForEmail.mockResolvedValue({ error: null });

    render(<PasswordRecovery />);
    fireEvent.change(screen.getByLabelText("Usuário ou e-mail"), { target: { value: "admin" } });
    fireEvent.submit(screen.getByRole("button", { name: "Enviar link de recuperação" }).closest("form")!);

    await waitFor(() => expect(resetPasswordForEmail).toHaveBeenCalledWith("renatto.kstro@gmail.com", expect.objectContaining({ redirectTo: expect.stringContaining("/?recovery=1") })));
    expect(screen.getByText("Verifique seu e-mail")).toBeInTheDocument();
  });
});
