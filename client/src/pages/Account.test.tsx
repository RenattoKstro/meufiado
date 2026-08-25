// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mineQuery = vi.hoisted(() => vi.fn());
const accountMutation = vi.hoisted(() => vi.fn());
const avatarMutation = vi.hoisted(() => vi.fn());
const invalidate = vi.hoisted(() => vi.fn());
const supportAvailabilityQuery = vi.hoisted(() => vi.fn());
const supportAvailabilityMutation = vi.hoisted(() => vi.fn());

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 7, name: "Ana Souza", email: "ana@exemplo.com" } }) }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ profile: { mine: { invalidate } }, auth: { me: { invalidate } }, chat: { mySupportAvailability: { invalidate }, supportRecipient: { invalidate } } }),
    profile: {
      mine: { useQuery: mineQuery },
      account: { useMutation: accountMutation },
      uploadAvatar: { useMutation: avatarMutation },
    },
    chat: {
      mySupportAvailability: { useQuery: supportAvailabilityQuery },
      setSupportAvailability: { useMutation: supportAvailabilityMutation },
    },
  },
}));

import Account from "./Account";

describe("Conta", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("permite editar contatos e apresenta o seletor de foto de perfil", async () => {
    mineQuery.mockReturnValue({ isLoading: false, data: { profile: { fullName: "Ana Souza", phone: "(67) 99999-0000", instagram: "ana.recebe", email: "ana@exemplo.com", avatarUrl: null } } });
    accountMutation.mockReturnValue({ isPending: false, mutateAsync: vi.fn().mockResolvedValue({}) });
    avatarMutation.mockReturnValue({ isPending: false, mutateAsync: vi.fn() });
    supportAvailabilityQuery.mockReturnValue({ isLoading: false, data: { supportAvailability: "available" } });
    supportAvailabilityMutation.mockReturnValue({ isPending: false, mutate: vi.fn() });

    render(<Account />);
    expect(screen.getByLabelText("Nome")).toHaveValue("Ana Souza");
    expect(screen.getByLabelText("Telefone / WhatsApp")).toHaveValue("(67) 99999-0000");
    expect(screen.getByLabelText(/Instagram/)).toHaveValue("ana.recebe");
    expect(screen.getByRole("button", { name: "Adicionar foto" })).toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).toHaveAttribute("accept", "image/jpeg,image/png,image/webp");

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Ana Luiza Souza" } });
    fireEvent.submit(screen.getByRole("button", { name: /Salvar dados/ }).closest("form")!);
    await waitFor(() => expect(accountMutation().mutateAsync).toHaveBeenCalledWith({ fullName: "Ana Luiza Souza", phone: "(67) 99999-0000", instagram: "ana.recebe" }));
  });
});
