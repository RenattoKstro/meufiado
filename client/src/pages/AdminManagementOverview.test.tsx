// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { ManagementOverview } from "./Admin";

describe("painel gerencial removido", () => {
  afterEach(cleanup);

  it("não apresenta o painel nem as listas de atenção", () => {
    render(<ManagementOverview rows={[]} isLoading={false} />);
    expect(screen.queryByText("Risco e projeção da operação")).not.toBeInTheDocument();
    expect(screen.queryByText("Filiais que exigem atenção")).not.toBeInTheDocument();
  });
});
