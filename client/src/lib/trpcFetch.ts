export async function fetchTrpcResponse(input: RequestInfo | URL, init?: RequestInit, fetcher: typeof fetch = globalThis.fetch) {
  const response = await fetcher(input, init);
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

  if (!contentType.includes("application/json")) {
    throw new Error(`A API retornou uma resposta inesperada (${response.status}). Atualize a página e tente novamente.`);
  }

  return response;
}
