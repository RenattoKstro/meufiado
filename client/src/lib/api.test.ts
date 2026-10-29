import { describe, expect, it } from "vitest";
import { api } from "./api";

describe("cliente Supabase estático", () => {
  it("expõe os hooks de consulta e mutação sem o transporte tRPC", () => {
    expect(api.profile.mine.useQuery).toBeTypeOf("function");
    expect(api.metrics.mine.useQuery).toBeTypeOf("function");
    expect(api.history.create.useMutation).toBeTypeOf("function");
    expect(api.admin.importAnalytics.useMutation).toBeTypeOf("function");
    expect(api.admin.createLocalUser.useMutation).toBeTypeOf("function");
    expect(api.admin.updateUserCredentials.useMutation).toBeTypeOf("function");
    expect(api.useUtils).toBeTypeOf("function");
  });
});
