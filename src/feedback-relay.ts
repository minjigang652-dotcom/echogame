// supabase/functions/feedback-relay/index.ts
// 📮 → 🏭  에코월드HQ 인앱 피드백 → 피드백 허브(정제소) 릴레이
// ------------------------------------------------------------------
// 왜 릴레이인가:
//   브라우저 앱은 시크릿 토큰을 숨길 수 없습니다(번들에 그대로 노출).
//   그래서 허브용 Bearer 토큰(INGEST_TOKEN)은 이 서버(Edge Function)의
//   시크릿에만 두고, 브라우저는 토큰 없이 이 함수로만 피드백을 보냅니다.
//
// 배포:
//   supabase functions deploy feedback-relay --no-verify-jwt
// 시크릿 등록(코드에 하드코딩 금지):
//   supabase secrets set INGEST_TOKEN="<허브에서 받은 토큰>"
//   (선택) supabase secrets set FEEDBACK_HUB_URL="https://discord.bloaded.cloud/api/ingest/feedback"
//   (선택) supabase secrets set ALLOW_ORIGIN="https://<내-게임-도메인>"   // CORS 제한하고 싶을 때
//
// 배포 후 나오는 함수 URL 을 프런트 환경변수로:
//   VITE_FEEDBACK_RELAY_URL = https://<project-ref>.supabase.co/functions/v1/feedback-relay
// ------------------------------------------------------------------

const HUB_URL = Deno.env.get("FEEDBACK_HUB_URL") || "https://discord.bloaded.cloud/api/ingest/feedback";
const INGEST_TOKEN = Deno.env.get("INGEST_TOKEN") || "";
const ALLOW_ORIGIN = Deno.env.get("ALLOW_ORIGIN") || "*";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Headers": "content-type, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, obj: unknown): Response {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, "content-type": "application/json" } });
}

// 허브로 넘길 수 있는 필드 화이트리스트 (개인정보/불필요 필드 차단, source 는 릴레이가 강제)
const ALLOW = ["external_id", "kind", "text", "author", "screen", "app_version", "viewport", "user_agent", "logs", "status", "created_at"];
const KINDS = ["bug", "feature", "design", "etc"];

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });
  if (!INGEST_TOKEN) return json(500, { ok: false, error: "relay_misconfigured", detail: "INGEST_TOKEN secret is missing" });

  let inp: Record<string, unknown>;
  try { inp = await req.json(); } catch { return json(400, { ok: false, error: "bad_json" }); }
  if (!inp || !inp.external_id || !inp.text) {
    return json(400, { ok: false, error: "missing_required", detail: "external_id, text are required" });
  }

  // 허브 페이로드 구성
  const payload: Record<string, unknown> = { source: "echoworld-hq" };           // 고정값 강제
  for (const k of ALLOW) {
    const v = (inp as Record<string, unknown>)[k];
    if (v !== undefined && v !== null && v !== "") payload[k] = v;
  }
  if (!KINDS.includes(String(payload.kind))) payload.kind = "etc";
  if (payload.status !== "done") payload.status = "open";
  if (typeof payload.logs === "string" && payload.logs.length > 16000) payload.logs = payload.logs.slice(0, 16000);

  // 허브로 전송 · 5xx/네트워크는 백오프 재시도, 400/401/403 은 재시도하지 않음
  const delays = [500, 1500, 4000];
  let lastStatus = 0;
  let lastText = "";
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      const r = await fetch(HUB_URL, {
        method: "POST",
        headers: { "content-type": "application/json", "authorization": "Bearer " + INGEST_TOKEN },
        body: JSON.stringify(payload),
      });
      lastStatus = r.status;
      lastText = await r.text().catch(() => "");
      if (r.ok) {
        let hub: Record<string, unknown> = {};
        try { hub = JSON.parse(lastText); } catch { /* ignore */ }
        return json(200, { ok: true, result: hub.result || "ok" });               // created | updated
      }
      if (r.status === 400) return json(400, { ok: false, error: "schema", detail: lastText });          // 재시도 X
      if (r.status === 401 || r.status === 403) return json(502, { ok: false, error: "hub_auth", hub_status: r.status }); // 토큰 문제 → 재시도 X
      // 그 외(5xx 등) → 재시도
    } catch (e) {
      lastText = String(e);
    }
    if (attempt < delays.length) await new Promise((res) => setTimeout(res, delays[attempt]));
  }
  return json(502, { ok: false, error: "hub_unreachable", last_status: lastStatus, detail: lastText.slice(0, 500) });
});
