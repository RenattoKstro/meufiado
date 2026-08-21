// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/GoogleOperatorSignIn", () => ({
  default: ({ mode }: { mode: string }) => <button type="button">Google: {mode}</button>,
}));

import Welcome from "./Welcome";
import UserRegistration from "./UserRegistration";

describe("sequência inicial de cadastro", () => {
  afterEach(cleanup);

  it("apresenta a escolha inicial sem renderizar a conexão Google", () => {
    render(<Welcome />);
    expect(screen.getAllByText("Acompanhando de perto suas metas todos dias.")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Acompanhe suas metas de recebimento" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar no painel" })).toHaveAttribute("href", "/entrar");
    const registrationLinks = screen.getAllByRole("link", { name: "Cadastrar" });
    expect(registrationLinks).toHaveLength(2);
    for (const link of registrationLinks) expect(link).toHaveAttribute("href", "/cadastro");
    expect(screen.queryByRole("button", { name: /Google:/i })).not.toBeInTheDocument();
  });

  it("renderiza a conexão Google em modo cadastro somente na etapa de registro", () => {
    render(<UserRegistration />);
    expect(screen.getByRole("button", { name: "Google: register" })).toBeInTheDocument();
    expect(screen.getByText("Primeiro, conecte sua conta Google. Em seguida, você informará filial, telefone e os demais dados obrigatórios.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar no painel" })).toHaveAttribute("href", "/entrar");
  });
});
