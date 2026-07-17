// Metaview — the live tool surface, over MCP (Streamable HTTP, JSON-RPC).
// Best-effort initialize handshake + tools/list. Offline fallback with no key.

function extractJSON(text) {
  const t = text.trim();
  if (t.startsWith("{")) {
    try {
      return JSON.parse(t);
    } catch {
      return null;
    }
  }
  // Streamable HTTP may reply as SSE: "data: {json}"
  for (const line of t.split("\n")) {
    const m = line.match(/^data:\s*(\{.*\})\s*$/);
    if (m) {
      try {
        return JSON.parse(m[1]);
      } catch {
        /* keep scanning */
      }
    }
  }
  return null;
}

export async function metaviewTools(env) {
  const key = env.METAVIEW_API_KEY;
  const url = env.METAVIEW_MCP_URL || "https://mcp.metaview.ai/mcp";
  if (!key) return { live: false, tools: [] };

  const headers = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    authorization: `Bearer ${key}`,
  };

  try {
    const initRes = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "cold-open", version: "0.1" },
        },
      }),
    });
    const sid = initRes.headers.get("mcp-session-id");
    const h2 = sid ? { ...headers, "mcp-session-id": sid } : headers;

    // initialized notification (best effort)
    await fetch(url, {
      method: "POST",
      headers: h2,
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    }).catch(() => {});

    const listRes = await fetch(url, {
      method: "POST",
      headers: h2,
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
    });
    const j = extractJSON(await listRes.text());
    const tools = j?.result?.tools?.map((t) => t.name) ?? [];
    return { live: true, tools, status: listRes.status };
  } catch (e) {
    return { live: false, tools: [], error: String(e.message || e) };
  }
}
