import React, { useState, useMemo } from "react";

/* ============================================================================
 *  🤖 AIAssist — 에코월드 공용 AI 보조 유틸 (React 외 의존성 없음 · 어디서든 재사용)
 *
 *    · AISelfCheck        : 창작자용 1차 셀프체크 (훅 / 기승전결 / CTA + 다듬어진 초안)
 *    · polishFeedback()   : 짧은 피드백 → 부드럽고 구체적인 문장으로 확장 (순수 함수)
 *    · FeedbackPolisher   : 위 함수를 감싼 입력 위젯 (관리자 → 플레이어 피드백/코멘트 어디서나)
 *    · ReviewQueue        : 관리자 검토 큐 (스테이지 탭 · 접힘/펼침 · 즉시 처리)
 *    · QueueButton        : 검토 큐 진입 버튼 (연핑크 · 미검토 있으면 펄스)
 *
 *  지금은 전부 "규칙 기반 목업"이에요. 실제 LLM 연동 시 polishFeedback / selfCheck
 *  내부만 API 호출로 바꾸면 UI는 그대로 재사용할 수 있어요. (ChatBot 의 CHATBOT_API_URL 방식과 동일)
 * ========================================================================== */

const A = {
  parch: "#f5ecd7", edge: "#d8c9a6", ink: "#3a3228", soft: "#8a7f6a", white: "#fffdf6",
  ok: "#4e9a3a", warn: "#e0a13d", pink: "#ff8fab", pinkBg: "#ffe6ee", pinkInk: "#a83a5b",
  accent: "#4b8f5f", font: "var(--game-font, 'DotGothic16', monospace)",
};
const btn = (bg, fg = "#fff") => ({ cursor: "pointer", fontFamily: A.font, fontSize: 12, fontWeight: "bold", padding: "8px 12px", borderRadius: 8, border: `2px solid ${A.ink}`, background: bg, color: fg });
const inp = { width: "100%", boxSizing: "border-box", fontFamily: A.font, fontSize: 12.5, padding: 8, border: `2px solid ${A.ink}`, borderRadius: 8, background: A.white, color: A.ink, resize: "vertical" };

/* ============================ 4-2 · 피드백 다듬기 (핵심 순수 함수) ============================ */
/* 짧고 거친 메모를 "날카롭지 않게 · 이유 + 구체적 대안 포함" 톤으로 확장해요.
   관리자→플레이어 코멘트가 필요한 모든 곳(검수·반려 사유 등)에서 재사용 가능. */
const FB_RULES = [
  { kw: ["훅", "도입", "오프닝", "초반", "시작"], out: '도입부(훅)가 살짝 약하게 느껴져요. 첫 문장을 대사나 질문으로 열어서 더 궁금하게 만들어보면 어떨까요? 예: "그때 그 노래만 안 불렀어도.." 처럼요 :)' },
  { kw: ["화질", "해상도", "흐림", "블러", "선명", "깨짐"], out: "화질이 살짝 아쉬워요. 촬영 해상도를 한 단계 올리거나 조명을 조금만 더 밝게 하면 훨씬 선명해질 거예요 :)" },
  { kw: ["자막", "싱크", "빠름", "빨라", "느림", "타이밍"], out: "자막 타이밍이 살짝 빠른 느낌이에요. 한 컷당 0.3초 정도만 더 머무르게 하면 읽기 편해질 것 같아요!" },
  { kw: ["소리", "음량", "오디오", "작", "안 들", "노이즈", "볼륨"], out: "오디오가 조금 작게 들려요. 목소리 볼륨을 살짝 올리고 배경음을 낮추면 전달이 훨씬 또렷해질 거예요 :)" },
  { kw: ["길", "늘어", "지루", "루즈", "템포", "쳐짐"], out: "중반이 살짝 늘어지는 느낌이에요. 반복되는 구간을 조금 잘라내면 템포가 살아날 것 같아요!" },
  { kw: ["짧", "급", "빨리 끝", "허전"], out: "흐름이 조금 급하게 마무리된 느낌이에요. 클로징에 한 박자만 여유를 주면 여운이 더 남을 것 같아요 :)" },
  { kw: ["cta", "클로징", "마무리", "엔딩", "참여", "유도"], out: '마무리에 참여 유도(CTA)가 있으면 좋겠어요. "댓글로 알려주세요" 처럼 다음 행동을 살짝 유도해보면 어떨까요?' },
  { kw: ["구성", "기승전결", "전환", "반전", "전개", "흐름"], out: '중간 전환이 살짝 약한 것 같아요. "그런데 / 사실은" 같은 반전 한 문장을 넣으면 몰입이 확 올라가요 :)' },
  { kw: ["주제", "핵심", "메시지", "무슨 말", "모호"], out: "핵심 메시지가 조금 흐릿하게 느껴져요. 이 영상으로 딱 한 가지만 남긴다면 무엇인지 첫 부분에 짚어주면 좋겠어요 :)" },
  { kw: ["썸네일", "제목", "클릭"], out: "썸네일·제목이 살짝 밋밋해요. 궁금증을 남기는 한 단어(비밀·이유·후기 등)를 넣으면 클릭이 늘 거예요!" },
];
export function polishFeedback(raw) {
  const t = (raw || "").trim();
  if (!t) return "";
  const low = t.toLowerCase();
  const hits = FB_RULES.filter((r) => r.kw.some((k) => low.includes(k.toLowerCase())));
  if (hits.length) return hits.map((h) => h.out).join("\n\n");
  // 매칭이 없으면 부드러운 일반 템플릿 (이유 + 대안을 담도록 유도)
  const core = t.replace(/[.!~…]*$/, "");
  return `${core} 부분이 살짝 아쉬웠어요. 왜 그렇게 느꼈는지 한 줄만 덧붙이고, "대신 ~해보면 어떨까요?" 처럼 구체적인 대안을 함께 적어주면 받는 사람이 훨씬 편하게 반영할 수 있어요 :)`;
}

/* ============================ 4-1 · 창작자 셀프체크 ============================ */
function selfCheck(raw) {
  const t = (raw || "").trim();
  const firstSent = (t.split(/[.!?\n。！？]/)[0] || "").trim();
  const hook = /^["'“‘「『(]/.test(t) || /[?？]/.test(firstSent) || /^(왜|어떻게|혹시|만약|당신|여러분|그거)/.test(firstSent);
  const TURN = ["그런데", "그러나", "하지만", "근데", "반전", "갑자기", "그러다", "사실", "알고 보니", "알고보니", "결국", "마침내", "그때", "순간"];
  const turn = TURN.some((w) => t.includes(w));
  const CTA = ["댓글", "구독", "좋아요", "알려줘", "알려주세요", "공유", "팔로우", "저장", "눌러", "더보기", "더 보기", "링크"];
  const cta = CTA.some((w) => t.includes(w));
  const parts = [];
  if (!hook) parts.push('(훅 제안) "그거 알아요?" 처럼 질문·대사로 열어보세요.');
  parts.push(t || "(원고를 입력하면 다듬어진 초안이 여기 나와요)");
  if (!turn) parts.push('(전개 제안) 중간에 "그런데 / 사실은.." 반전 한 문장을 넣어보세요.');
  if (!cta) parts.push("👉 (CTA 제안) 마음에 들면 댓글로 알려주세요!");
  return { hook, turn, cta, polished: parts.join("\n\n") };
}
export function AISelfCheck({ text = "", label = "🤖 AI 1차 셀프체크" }) {
  const [open, setOpen] = useState(false);
  const r = useMemo(() => selfCheck(text), [text]);
  const Row = ({ ok, title, tip }) => (
    <div style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 7 }}>
      <span style={{ fontSize: 14, lineHeight: 1.2 }}>{ok ? "✅" : "⚠️"}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: "bold", color: A.ink }}>{title}</div>
        <div style={{ fontSize: 10.5, color: ok ? A.soft : A.pinkInk, lineHeight: 1.5 }}>{tip}</div>
      </div>
    </div>
  );
  return (
    <div style={{ marginBottom: 8, fontFamily: A.font }}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={{ ...btn(A.accent), width: "100%", padding: 9 }}>{open ? "🤖 셀프체크 접기" : label}</button>
      {open && (
        <div style={{ marginTop: 8, background: A.white, border: `2px solid ${A.edge}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, color: A.soft, marginBottom: 8 }}>제출 전, 세 가지를 확인해봤어요</div>
          <Row ok={r.hook} title="훅 — 도입부가 대사/질문으로 시작?" tip={r.hook ? "좋아요! 시선을 끄는 시작이에요." : '첫 문장을 대사나 질문으로 열어보세요. 예: "그때 그 말만 안 했어도.."'} />
          <Row ok={r.turn} title="기승전결 — 중간에 전환/반전이 있나?" tip={r.turn ? "전환이 있어 몰입이 살아요." : '"그런데 / 사실은.." 같은 반전 문장을 하나 넣어보세요.'} />
          <Row ok={r.cta} title="클로징 CTA — 참여 유도 문구가 있나?" tip={r.cta ? "마무리 참여 유도가 있네요!" : '"댓글로 알려줄게요" 처럼 다음 행동을 살짝 유도해보세요.'} />
          <div style={{ marginTop: 10, borderTop: `2px dashed ${A.edge}`, paddingTop: 10 }}>
            <div style={{ fontSize: 11.5, fontWeight: "bold", color: A.accent, marginBottom: 5 }}>✨ 다듬어진 버전 (AI 데모)</div>
            <div style={{ fontSize: 11.5, color: A.ink, whiteSpace: "pre-wrap", lineHeight: 1.6, background: A.parch, border: `2px solid ${A.edge}`, borderRadius: 8, padding: 10 }}>{r.polished}</div>
            <div style={{ fontSize: 9.5, color: A.soft, marginTop: 5 }}>* 지금은 규칙 기반 목업이에요. 실제 AI 연동 시 더 정교해져요.</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================ 4-2 · 피드백 다듬기 위젯 ============================ */
export function FeedbackPolisher({ initial = "", onApply, placeholder = "짧게 적어도 돼요 (예: 훅 약함)" }) {
  const [raw, setRaw] = useState(initial);
  return (
    <div style={{ fontFamily: A.font }}>
      <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={3} placeholder={placeholder} style={{ ...inp, marginBottom: 6 }} />
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" onClick={() => setRaw(polishFeedback(raw))} style={{ ...btn(A.pinkBg, A.pinkInk), flex: 1 }}>✨ AI로 다듬기</button>
        {onApply && <button type="button" onClick={() => onApply(raw)} style={{ ...btn(A.accent), flex: 1 }}>이 문장으로</button>}
      </div>
      <div style={{ fontSize: 9.5, color: A.soft, marginTop: 5 }}>* 날카롭지 않게 · 이유 + 구체적 대안을 담아 부드럽게 확장해요 (규칙 기반 데모).</div>
    </div>
  );
}

/* ============================ 4-3 · 검토 큐 ============================ */
export function QueueButton({ count = 0, onClick, label = "🗂 검토 큐" }) {
  return (
    <button type="button" onClick={onClick} style={{ position: "relative", cursor: "pointer", fontFamily: A.font, fontSize: 12, fontWeight: "bold", padding: "8px 14px", borderRadius: 10, border: `2px solid ${A.ink}`, background: A.pinkBg, color: A.pinkInk, animation: count > 0 ? "aiq-pulse 1.6s ease-in-out infinite" : "none" }}>
      <style>{"@keyframes aiq-pulse{0%,100%{box-shadow:0 0 0 0 rgba(255,143,171,0)}50%{box-shadow:0 0 0 5px rgba(255,143,171,0.4)}}"}</style>
      {label}
      {count > 0 && <span style={{ marginLeft: 6, fontSize: 10, background: A.pink, color: "#fff", borderRadius: 10, padding: "1px 7px", border: `2px solid ${A.ink}` }}>{count}</span>}
    </button>
  );
}
export function ReviewQueue({ tabs = [], items = [], onApprove, onFeedback, onClose, title = "🗂 검토 큐" }) {
  const [tab, setTab] = useState((tabs[0] && tabs[0].id) || "");
  const [openId, setOpenId] = useState(null);
  const [fb, setFb] = useState({});
  const setF = (id, v) => setFb((s) => ({ ...s, [id]: v }));
  const shown = items.filter((i) => i.tab === tab);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 14, fontFamily: A.font }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, maxHeight: "88%", overflow: "auto", background: A.parch, border: `4px solid ${A.ink}`, borderRadius: 14, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
          <b style={{ flex: 1, fontSize: 15, color: A.ink }}>{title}</b>
          <button type="button" onClick={onClose} style={{ cursor: "pointer", background: "none", border: "none", fontSize: 16 }}>✕</button>
        </div>
        {/* 스테이지 탭 (미검토 건수 = 빨간 점) */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {tabs.map((tb) => (
            <button key={tb.id} type="button" onClick={() => { setTab(tb.id); setOpenId(null); }} style={{ position: "relative", ...btn(tab === tb.id ? A.accent : A.white, tab === tb.id ? "#fff" : A.ink) }}>
              {tb.label}
              {tb.count > 0 && <span style={{ position: "absolute", top: -5, right: -5, minWidth: 16, height: 16, borderRadius: "50%", background: "#e5484d", color: "#fff", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${A.ink}`, padding: "0 3px" }}>{tb.count}</span>}
            </button>
          ))}
        </div>
        {shown.length === 0 && <div style={{ fontSize: 12, color: A.soft, textAlign: "center", padding: 24 }}>검토할 항목이 없어요 🎉</div>}
        {shown.map((it) => {
          const isOpen = openId === it.id;
          return (
            <div key={it.id} style={{ background: A.white, border: `2px solid ${A.edge}`, borderRadius: 10, marginBottom: 8, overflow: "hidden" }}>
              <button type="button" onClick={() => setOpenId(isOpen ? null : it.id)} style={{ width: "100%", textAlign: "left", cursor: "pointer", background: "none", border: "none", padding: "10px 12px", fontFamily: A.font, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11.5, flex: 1, fontWeight: "bold", color: A.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{it.title}</span>
                {it.by && <span style={{ fontSize: 10, color: A.soft, flexShrink: 0 }}>{it.by}</span>}
                <span style={{ fontSize: 11, color: A.soft, flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</span>
              </button>
              {isOpen && (
                <div style={{ padding: "0 12px 12px" }}>
                  <div style={{ fontSize: 11.5, color: A.ink, whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.6, background: A.parch, border: `2px solid ${A.edge}`, borderRadius: 8, padding: 10, marginBottom: 8 }}>{it.content || "(내용 없음)"}</div>
                  <textarea value={fb[it.id] || ""} onChange={(e) => setF(it.id, e.target.value)} rows={2} placeholder="✏️ 피드백 (짧게 적어도 돼요)" style={{ ...inp, marginBottom: 6 }} />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button type="button" onClick={() => setF(it.id, polishFeedback(fb[it.id] || ""))} title="AI로 부드럽게 다듬기" style={{ ...btn(A.pinkBg, A.pinkInk), flexShrink: 0 }}>✨</button>
                    <button type="button" onClick={() => { onFeedback && onFeedback(it, fb[it.id] || ""); setOpenId(null); }} style={{ ...btn(A.warn), flex: 1 }}>✏️ 피드백</button>
                    <button type="button" onClick={() => { onApprove && onApprove(it); setOpenId(null); }} style={{ ...btn(A.ok), flex: 1 }}>✅ 승인</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
