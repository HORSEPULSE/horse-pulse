type RpcResponse<T> = {
  result?: T;
  error?: { message?: string };
};

export async function callPulseRpc<T>(method: string, params: unknown[]): Promise<T> {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
  if (!rpcUrl) {
    throw new Error("NEXT_PUBLIC_RPC_URL is missing.");
  }

  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Pulse RPC failed: ${res.status}`);
  }

  const json = (await res.json()) as RpcResponse<T>;
  if (json.error) {
    throw new Error(json.error.message || "RPC error");
  }
  return json.result as T;
}

