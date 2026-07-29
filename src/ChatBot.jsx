import React, { useState, useRef, useEffect } from "react";

/* ============================================================================
 *  🐣 코코 — 에코월드 상담봇 (독립 컴포넌트 · 어디에도 의존하지 않음)
 *
 *  지금은 "규칙 기반"으로 답해요.
 *  나중에 진짜 AI(Claude)로 바꾸려면 아래 CHATBOT_API_URL 한 줄만 채우면 돼요.
 *    예) const CHATBOT_API_URL = "https://<프로젝트ID>.supabase.co/functions/v1/chatbot";
 *  (그 주소는 Supabase Edge Function 프록시 · API 키는 서버에만 보관)
 * ========================================================================== */
const CHATBOT_API_URL = "";   // ← 여기에 함수 주소를 넣으면 자유 대화(진짜 AI)로 전환돼요

const CB = { bg: "#f5ecd7", edge: "#d8c9a6", ink: "#3a3228", soft: "#8a7f6a", white: "#fffdf6", accent: "#4b8f5f", user: "#4b8f5f", danger: "#c0563a", font: "var(--game-font, 'DotGothic16', monospace)" };

/* 주제 버튼 + 기본 안내 */
const TOPICS = [
  ["work", "🎯 업무·퀘스트", "업무·퀘스트는 이렇게 해요!\n• 퀘스트는 게시판/각 스쿨에서 확인해요.\n• 미션을 체크해서 100%가 되면 '검토요청'을 눌러요.\n• 검토자가 확인하면 보상이 담당자에게 자동 지급돼요.\n• 히스토리 창에 진행상황·아이디어·회의록·문서를 남길 수 있어요."],
  ["blog", "✍️ 블로그 노하우", "블로그 글쓰기 팁이에요!\n• 제목에 핵심 키워드를 앞쪽에 넣어요.\n• 첫 3줄에서 '무엇을 얻는 글인지' 알려줘요.\n• 사진·소제목으로 읽기 쉽게 나눠요.\n• 마지막에 요약 + 다음 행동(댓글·이웃추가) 유도.\n• 네이버스쿨의 키워드·URL 자료도 참고해요!"],
  ["game", "🎮 게임 안내", "에코월드 사용법이에요!\n• 방향키/화면으로 마을을 돌아다녀요.\n• 건물을 눌러 들어가요 (게시판·커뮤니티·스쿨 등).\n• 커뮤니티에서 꿀팁·질문을 나눠요.\n• 내페이지에서 할 일·인벤토리를 확인해요.\n• 퀘스트를 깨면 경험치·골드·젬·아이템을 얻어요."],
  ["counsel", "💚 고민 상담", "무슨 일이든 편하게 얘기해도 괜찮아 🌱\n일 때문에 지치거나, 관계가 힘들거나, 마음이 무거울 때 —\n네가 느끼는 건 충분히 그럴 만한 거야.\n어떤 이야기인지 조금 더 들려줄래? 내가 같이 생각해볼게."],
  ["faq", "❓ FAQ", "자주 묻는 걸 모아뒀어! 아래에서 눌러봐 👇"],
];

const FAQ = [
  ["보상은 언제 받아요?", "퀘스트가 '검토완료'되면 담당자 모두에게 경험치·골드·젬·아이템이 자동으로 지급돼요. 접속해 있을 때 지갑에 들어와요!"],
  ["검토요청이 안 눌려요", "미션을 전부 완료해서 진행률이 100%가 되어야 검토요청을 할 수 있어요. 아직 안 된 미션이 있는지 확인해봐요."],
  ["담당자로 지정하려면?", "퀘스트 상세에서 담당자 '＋추가'를 누르거나, 세부 미션에 담당을 지정하면 저장할 때 담당자 목록에 자동으로 들어가요."],
  ["커뮤니티는 어디 있어요?", "게시판 옆 💬 커뮤니티 건물이나, 게시판 안의 '💬 커뮤니티' 버튼으로 들어가요. 꿀팁·가이드·질문을 자유롭게 올릴 수 있어요."],
  ["초보자는 어디까지 가능해요?", "초보자는 🍀 초심자의 행운, 📗 네이버스쿨, 🎬 영상스쿨을 이용할 수 있어요. 다른 곳은 숙련자 전용이에요."],
];

/* 📗 네이버스쿨 방 이름 (이동 버튼 라벨) */
const ROOM_LABELS = { tutorial: "📖 튜토리얼", cafe: "☕ 카페 최신글", kw: "🔗 카페 외부(키워드·URL)", kin: "💬 지식인 최신글", kinTop: "📊 지식인 상위" };

/* 📗 네이버스쿨 질의응답 (카테고리별 · room = 이동할 방) */
const NAVER_QA = [
  { cat: "시작·튜토리얼", room: "tutorial", items: [
    ["네이버스쿨 처음인데 뭐부터 봐요?", "먼저 📖 튜토리얼 방에서 작성 방법·프롬프트·답변 예시를 보고, 카페 → 지식인 순으로 익히면 돼요."],
    ["프롬프트는 어디서 봐요?", "튜토리얼 방에 작성용 프롬프트가 정리돼 있어요. 복사해서 그대로 활용하세요."],
    ["답변·댓글 예시 사진은 어디 있어요?", "튜토리얼 방의 예시 이미지에서 실제 등록된 답변·댓글 형태를 볼 수 있어요."],
  ] },
  { cat: "아이디·계정", room: "tutorial", items: [
    ["어떤 아이디로 활동해요?", "배정받은 계정으로 활동해요. 계정 배정·규칙은 담당자에게 확인하세요."],
    ["계정이 여러 개라 헷갈려요.", "계정별 용도(블로그용/카페용/지식인용)를 메모해두면 헷갈리지 않아요."],
    ["로그인이 안 돼요.", "비밀번호·2단계 인증을 확인하고, 그래도 안 되면 담당자에게 계정 상태를 문의하세요."],
  ] },
  { cat: "원고·블로그", room: "tutorial", items: [
    ["원고는 어떻게 써요?", "후크(첫 3줄) → 문제 → 정보/사례 → 정리 순서로, 키워드를 제목 앞쪽에 넣어요."],
    ["제목은 어떻게 정해요?", "핵심 키워드를 앞에 두고, 궁금증이나 이득을 담아 클릭하고 싶게 만들어요."],
    ["발행 전에 뭘 확인해요?", "제목 키워드·오탈자·사진·링크·태그 5가지를 체크해요."],
  ] },
  { cat: "카페 답변", room: "cafe", items: [
    ["답변할 글은 어디서 봐요?", "☕ 카페 최신글 방의 '답변 요망' 목록에서 확인해요."],
    ["답변을 끝냈어요. 처리는?", "그 글을 '답변 완료' 상태로 바꿔주면 목록에서 정리돼요."],
    ["캘린더는 어디에 써요?", "답변·발행 일정을 캘린더 워크플로우로 관리해 누락을 막아요."],
    ["이미 답변된 글인지 어떻게 알아요?", "상태가 '완료'면 이미 처리된 글이에요. 중복 답변을 피하세요."],
  ] },
  { cat: "지식인 답변", room: "kin", items: [
    ["답변 카운터는 뭐예요?", "💬 지식인 방에서 오늘 답변한 개수를 세어줘요. 목표 관리에 써요."],
    ["타이머는 왜 있어요?", "답변 간 간격을 지키기 위한 거예요. 너무 빠른 연속 답변을 피하는 데 도움돼요."],
    ["좋은 지식인 답변의 조건은?", "질문에 정확히 답하고, 근거·경험을 담되 과장·홍보 티 없이 자연스럽게 써요."],
    ["지식인 상위 방은 언제 열려요?", "📊 지식인 상위는 현재 준비 중이에요."],
  ] },
  { cat: "키워드·순위", room: "kw", items: [
    ["키워드 순위는 어디서 봐요?", "🔗 카페 외부 방에서 네이버 키워드 순위를 추적할 수 있어요."],
    ["어떤 키워드를 노려요?", "주제와 맞고 검색량은 있는데 경쟁이 덜한 키워드부터 공략해요."],
    ["순위가 떨어졌어요.", "최신 정보로 글을 보완하거나 관련 키워드로 새 글을 보강해요."],
  ] },
  { cat: "URL·발행 관리", room: "kw", items: [
    ["발행한 URL은 어디에 정리해요?", "발행 URL 풀(모음)에 모아 어디에 무엇을 올렸는지 추적해요. 🔗 카페 외부 방에서 볼 수 있어요."],
    ["URL 풀이 뭐예요?", "그동안 발행한 글 링크를 한곳에 모아둔 목록이에요. 중복·관리에 써요."],
  ] },
  { cat: "자주 겪는 문제", room: null, items: [
    ["저장이 안 돼요.", "인터넷 연결을 확인하고 새로고침 후 다시 시도해요. 계속되면 담당자에게 알려요."],
    ["링크가 안 열려요.", "만료됐거나 권한 문제일 수 있어요. 최신 링크를 다시 받으세요."],
    ["사진 업로드가 실패해요.", "용량을 줄이거나(압축) 다른 형식으로 바꿔 다시 올려보세요."],
    ["다른 사람과 작업이 겹쳐요.", "답변 상태(요망/완료)를 실시간으로 바꿔주면 겹침을 줄일 수 있어요."],
  ] },
];

/* 규칙 기반 응답 (키워드 매칭) */
function ruleAnswer(text) {
  const t = (text || "").toLowerCase();
  const has = (...ks) => ks.some((k) => t.includes(k));
  if (has("자살", "죽고", "죽고싶", "자해", "사라지고 싶", "없어지고 싶")) {
    return { text: "지금 많이 힘든 것 같아 걱정돼. 네 마음이 정말 소중해 💚\n혼자 견디지 말고 꼭 도움을 받아줘. 자살예방 상담전화 ☎ 109 (24시간), 또는 믿을 수 있는 사람에게 지금 바로 이야기해줘.\n나도 여기서 네 이야기를 들을게. 무슨 일이 있었는지 조금만 들려줄래?", safe: true };
  }
  if (has("보상", "골드", "젬", "경험치")) return { text: FAQ[0][1] };
  if (has("검토")) return { text: FAQ[1][1] };
  if (has("담당")) return { text: FAQ[2][1] };
  if (has("커뮤니티", "게시판")) return { text: FAQ[3][1] };
  if (has("초보자", "알바", "숙련자")) return { text: FAQ[4][1] };
  if (has("답변 요망", "답변요망", "답변할 글", "카페 답변")) return { text: NAVER_QA[3].items[0][1], go: "cafe" };
  if (has("카운터", "답변 개수", "몇 개")) return { text: NAVER_QA[4].items[0][1], go: "kin" };
  if (has("타이머")) return { text: NAVER_QA[4].items[1][1], go: "kin" };
  if (has("키워드", "순위")) return { text: NAVER_QA[5].items[0][1], go: "kw" };
  if (has("url", "발행", "링크 정리")) return { text: NAVER_QA[6].items[0][1], go: "kw" };
  if (has("프롬프트")) return { text: NAVER_QA[0].items[1][1], go: "tutorial" };
  if (has("원고", "제목")) return { text: NAVER_QA[2].items[0][1], go: "tutorial" };
  if (has("계정", "아이디", "로그인")) return { text: NAVER_QA[1].items[0][1], go: "tutorial" };
  if (has("지식인")) return { text: NAVER_QA[4].items[2][1], go: "kin" };
  if (has("카페")) return { text: NAVER_QA[3].items[0][1], go: "cafe" };
  if (has("블로그", "포스팅", "글쓰기", "노하우")) return { text: TOPICS[1][2] };
  if (has("퀘스트", "미션", "업무")) return { text: TOPICS[0][2] };
  if (has("게임", "사용법", "어떻게 해")) return { text: TOPICS[2][2] };
  if (has("힘들", "지쳐", "우울", "속상", "외로", "불안", "스트레스")) return { text: "그랬구나, 많이 힘들었겠다 🥺 그 마음 충분히 이해돼.\n괜찮다면 어떤 상황인지 조금 더 말해줄래? 같이 정리해보면 한결 나아질 거야." };
  if (has("안녕", "하이", "ㅎㅇ", "반가")) return { text: "안녕! 나는 코코야 🐣 오늘 어떤 걸 도와줄까?" };
  if (has("고마", "감사", "ㄳ", "고맙")) return { text: "천만에! 언제든 또 찾아와줘 😊" };
  return { text: "음, 아직은 정해진 주제 위주로 도와줄 수 있어! 위의 버튼(업무·블로그·게임·고민·FAQ)을 눌러보거나, 조금 더 구체적으로 물어봐 줄래? 🐣\n(곧 더 똑똑하게 자유 대화도 할 수 있게 업그레이드될 예정이야!)" };
}

export default function ChatBot({ onClose, botName = "코코", onGo }) {
  const [msgs, setMsgs] = useState([{ role: "bot", text: "안녕! 나는 " + botName + "야 🐣\n업무·블로그·게임·고민 뭐든 편하게 물어봐. 아래 버튼을 눌러도 좋아!" }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [qaCat, setQaCat] = useState(null);   // 네이버 Q&A: null | "cats" | 카테고리 index
  const endRef = useRef(null);
  useEffect(() => { if (endRef.current) endRef.current.scrollIntoView({ block: "end" }); }, [msgs, faqOpen, qaCat]);

  const pushBot = (text, go) => setMsgs((m) => [...m, { role: "bot", text, go: go || null }]);
  const pushUser = (text) => setMsgs((m) => [...m, { role: "user", text }]);

  const callAI = async (history) => {
    try {
      const r = await fetch(CHATBOT_API_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: history.map((x) => ({ role: x.role === "user" ? "user" : "assistant", content: x.text })) }) });
      const data = await r.json();
      const txt = (data && data.content && data.content.map((b) => b.text || "").join("\n").trim()) || (data && data.error) || "지금은 답하기 어려워. 잠시 뒤 다시 시도해줘!";
      pushBot(txt);
    } catch (e) { pushBot("연결이 원활하지 않아 😥 잠시 뒤 다시 시도해줘."); }
  };

  const send = async (raw) => {
    const text = (raw != null ? raw : input).trim();
    if (!text || busy) return;
    pushUser(text); setInput("");
    if (CHATBOT_API_URL) {
      setBusy(true);
      const rule = ruleAnswer(text);
      if (rule.safe) pushBot(rule.text);   // 위기 신호는 규칙 안전 안내를 항상 먼저
      await callAI([...msgs, { role: "user", text }]);
      setBusy(false);
    } else {
      const rule = ruleAnswer(text);
      setTimeout(() => pushBot(rule.text, rule.go), 250);
    }
  };

  const topicClick = (tp) => {
    pushUser(tp[1]);
    if (tp[0] === "naver") { setTimeout(() => { pushBot("📗 네이버스쿨 Q&A예요! 궁금한 카테고리를 눌러봐 👇"); setQaCat("cats"); setFaqOpen(false); }, 200); return; }
    if (tp[0] === "faq") { setTimeout(() => { pushBot(tp[2]); setFaqOpen(true); setQaCat(null); }, 200); return; }
    setTimeout(() => pushBot(tp[2]), 200);
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 14, fontFamily: CB.font }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, height: "88vh", background: CB.bg, border: `4px solid ${CB.ink}`, borderRadius: 16, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* 헤더 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: `3px solid ${CB.ink}`, background: CB.accent, color: CB.white, flexShrink: 0 }}>
          <span style={{ fontSize: 26 }}>🐣</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: "bold" }}>{botName} 상담소</div>
            <div style={{ fontSize: 10, opacity: 0.9 }}>{CHATBOT_API_URL ? "AI 상담 · 무엇이든 물어보세요" : "밝고 친근한 도우미"}</div>
          </div>
          <button type="button" onClick={onClose} style={{ cursor: "pointer", background: "rgba(255,255,255,0.2)", border: "none", color: CB.white, fontSize: 16, borderRadius: 8, width: 30, height: 30 }}>✕</button>
        </div>

        {/* 대화 */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 14 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", width: "100%" }}>
                {m.role === "bot" && <span style={{ fontSize: 20, marginRight: 6, alignSelf: "flex-end" }}>🐣</span>}
                <div style={{ maxWidth: "78%", background: m.role === "user" ? CB.user : CB.white, color: m.role === "user" ? CB.white : CB.ink, border: `2px solid ${m.role === "user" ? CB.user : CB.edge}`, borderRadius: 12, padding: "9px 12px", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.text}</div>
              </div>
              {m.go && onGo && ROOM_LABELS[m.go] && (
                <button type="button" onClick={() => { onGo(m.go); }} style={{ marginLeft: 26, marginTop: 5, cursor: "pointer", fontFamily: CB.font, fontSize: 11.5, fontWeight: "bold", background: CB.accent, color: CB.white, border: `2px solid ${CB.ink}`, borderRadius: 10, padding: "6px 11px" }}>📍 {ROOM_LABELS[m.go]}으로 이동</button>
              )}
            </div>
          ))}
          {busy && <div style={{ fontSize: 12, color: CB.soft, marginLeft: 30 }}>🐣 생각 중…</div>}
          {faqOpen && (
            <div style={{ marginTop: 4, marginLeft: 30 }}>
              {FAQ.map(([q, a], i) => (
                <button key={i} type="button" onClick={() => { pushUser(q); setTimeout(() => pushBot(a), 180); }} style={{ display: "block", width: "100%", textAlign: "left", cursor: "pointer", fontFamily: CB.font, fontSize: 11.5, background: CB.white, border: `2px solid ${CB.edge}`, borderRadius: 10, padding: "8px 10px", marginBottom: 5, color: CB.ink }}>❓ {q}</button>
              ))}
            </div>
          )}
          {qaCat === "cats" && (
            <div style={{ marginTop: 4, marginLeft: 30, display: "flex", flexWrap: "wrap", gap: 5 }}>
              {NAVER_QA.map((c, i) => (
                <button key={i} type="button" onClick={() => setQaCat(i)} style={{ cursor: "pointer", fontFamily: CB.font, fontSize: 11.5, fontWeight: "bold", background: CB.white, border: `2px solid ${CB.ink}`, borderRadius: 12, padding: "6px 10px", color: CB.ink }}>{c.cat}</button>
              ))}
            </div>
          )}
          {typeof qaCat === "number" && NAVER_QA[qaCat] && (
            <div style={{ marginTop: 4, marginLeft: 30 }}>
              <button type="button" onClick={() => setQaCat("cats")} style={{ cursor: "pointer", fontFamily: CB.font, fontSize: 11, color: CB.soft, background: "none", border: "none", marginBottom: 4 }}>← 카테고리</button>
              {NAVER_QA[qaCat].items.map(([q, a], i) => (
                <button key={i} type="button" onClick={() => { pushUser(q); const room = NAVER_QA[qaCat].room; setTimeout(() => pushBot(a, room), 180); }} style={{ display: "block", width: "100%", textAlign: "left", cursor: "pointer", fontFamily: CB.font, fontSize: 11.5, background: CB.white, border: `2px solid ${CB.edge}`, borderRadius: 10, padding: "8px 10px", marginBottom: 5, color: CB.ink }}>❓ {q}</button>
              ))}
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* 주제 버튼 */}
        <div style={{ display: "flex", gap: 5, padding: "8px 12px 0", flexWrap: "wrap", flexShrink: 0 }}>
          {onGo && (
            <button type="button" onClick={() => topicClick(["naver", "📗 네이버 Q&A"])} style={{ cursor: "pointer", fontFamily: CB.font, fontSize: 11, fontWeight: "bold", padding: "6px 10px", borderRadius: 14, border: `2px solid ${CB.ink}`, background: "#eaf7ea", color: CB.ink }}>📗 네이버 Q&A</button>
          )}
          {TOPICS.map((tp) => (
            <button key={tp[0]} type="button" onClick={() => topicClick(tp)} style={{ cursor: "pointer", fontFamily: CB.font, fontSize: 11, fontWeight: "bold", padding: "6px 10px", borderRadius: 14, border: `2px solid ${CB.ink}`, background: CB.white, color: CB.ink }}>{tp[1]}</button>
          ))}
        </div>

        {/* 입력 */}
        <div style={{ display: "flex", gap: 6, padding: 12, flexShrink: 0 }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="메시지를 입력하세요" style={{ flex: 1, minWidth: 0, padding: 11, border: `2px solid ${CB.ink}`, borderRadius: 8, fontFamily: CB.font, fontSize: 13, background: CB.white }} />
          <button type="button" onClick={() => send()} disabled={busy} style={{ cursor: "pointer", fontFamily: CB.font, fontSize: 13, fontWeight: "bold", background: CB.accent, color: CB.white, border: `2px solid ${CB.ink}`, borderRadius: 8, padding: "0 16px" }}>전송</button>
        </div>
      </div>
    </div>
  );
}
