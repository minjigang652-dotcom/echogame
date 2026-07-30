import React, { useContext, useState, useEffect, useRef } from "react";
import { C, NetContext, PixelHouse, Hero, Panel, PxButton, TitleBar } from "./LittleJuniorWorld.jsx";
import { dbLoadVSchool, dbSaveVSchool } from "./LittleJuniorWorld.jsx";
import ChatBot from "./ChatBot.jsx";
import { AISelfCheck, polishFeedback, ReviewQueue, QueueButton } from "./AIAssist.jsx";
import { DEFAULT_PRODUCTS, productReward, SpecBadge, ProductTutorial, SafeZoneDiagram, SourceBelt, KeywordChips, ProductBar, ProductForm } from "./VideoProducts.jsx";

/* 🎬 영상스쿨 제품 편집 관리자 코드 (여기 값만 바꾸면 됨) */
const VS_ADMIN_PW = "ckdals987?";

/* 입력창(input/textarea 등)에 타이핑 중이면 게임 키 조작 무시 */
function isTyping(e) {
  const el = (e && e.target) || (typeof document !== "undefined" ? document.activeElement : null);
  if (!el) return false;
  const tag = (el.tagName || "").toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
}
/* 메시지가 늘어나면 자동으로 맨 아래로 스크롤 */
function useAutoScroll(dep) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [dep]);
  return ref;
}

/* ======================= 스쿨(네이버/영상) ======================= */
function School({ wall = "#8fd0d6", roof = "#c95d7b", size = 140 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" shapeRendering="crispEdges" style={{ imageRendering: "pixelated" }}>
      <rect x="10" y="1" width="4" height="4" fill={roof} stroke="#2b1f14" strokeWidth="0.4" />
      <rect x="11" y="2" width="2" height="2" fill="#ffe680" />
      <polygon points="12,0 15,2 9,2" fill={roof} stroke="#2b1f14" strokeWidth="0.4" />
      <polygon points="3,9 12,4 21,9" fill={roof} stroke="#2b1f14" strokeWidth="0.5" />
      <rect x="4" y="9" width="16" height="13" fill={wall} stroke="#2b1f14" strokeWidth="0.5" />
      <rect x="10" y="15" width="4" height="7" fill="#8a5a3b" stroke="#2b1f14" strokeWidth="0.4" />
      <rect x="5.5" y="11" width="3" height="3" fill="#fff" stroke="#2b1f14" strokeWidth="0.4" />
      <rect x="15.5" y="11" width="3" height="3" fill="#fff" stroke="#2b1f14" strokeWidth="0.4" />
      <rect x="9" y="22" width="6" height="1.5" fill="#cbb58a" />
    </svg>
  );
}

const SCHOOLS = {
  naverschool: {
    title: "네이버스쿨", icon: "📗", color: "#2db400", grass: "#8fd98f", road: "#e8dfc0",
    quests: [
      { id: "n1", title: "개념 정리", roof: "#e4a04f", wall: "#fff3e0", steps: ["네이버 생태계 한눈에 보기", "블로그·카페·지식인의 차이", "무엇부터 시작할까?"] },
      { id: "n2", title: "블로그", roof: "#e07b8a", wall: "#ffeef0", steps: ["주제 정하기", "글 구조 잡기", "노출 최적화 기본"] },
      { id: "n3", title: "카페", roof: "#7fbfe0", wall: "#eaf6ff", steps: ["카페 개설", "게시판 설계", "멤버 모으기"] },
      { id: "n4", title: "지식인", roof: "#b48fd9", wall: "#f3ecff", steps: ["좋은 답변의 조건", "전문성 쌓기", "신뢰도 관리"] },
      { id: "n5", title: "종합 실습", boss: true, roof: "#d9a441", wall: "#fff6da", steps: ["배운 것 모두 활용", "나만의 채널 기획", "1주 실행 계획"] },
    ],
  },
  videoschool: {
    title: "영상스쿨", icon: "🎬", color: "#8e5a9e", grass: "#a8c8e8", road: "#e6dff2",
    quests: [
      { id: "hero", title: "주인공 만들기", cat: "기획", roof: "#e07b8a", wall: "#ffeef0" },
      { id: "script", title: "원고 작성", cat: "기획", roof: "#8fd0a0", wall: "#eefaf0" },
      { id: "source", title: "영상 소스 찾기", cat: "리서치", roof: "#b48fd9", wall: "#f3ecff" },
      { id: "edit", title: "영상 편집", cat: "실행", roof: "#e0b04f", wall: "#fff6da" },
      { id: "upload", title: "업로드", cat: "실행", boss: true, roof: "#d9a441", wall: "#fff6da" },
    ],
  },
};
const SCHOOL_HOUSE_POS = [
  { x: 100, y: 120 }, { x: 250, y: 120 }, { x: 400, y: 120 }, { x: 550, y: 120 },
  { x: 175, y: 300 }, { x: 325, y: 300 }, { x: 475, y: 300 },
];
function QuestAssistant({ questTitle }) {
  const [msgs, setMsgs] = useState([{ me: false, text: "이 퀘스트 관련해서 훅 변형, 아이디어, 카피 다듬기 등 뭐든 물어보세요 ✍️" }]);
  const [text, setText] = useState("");
  const reply = (q) => {
    if (q.includes("후크") || q.includes("훅")) return `「${questTitle}」 후크 변형 3개예요:\n1) 사실 이거 몰라서 3개월 날렸어요\n2) 다들 장비부터 사는데, 순서가 틀렸어요\n3) 조회수 안 나오는 이유, 첫 3초에 있어요`;
    if (q.includes("아이디어") || q.includes("소재")) return "소재 3개: ① 내가 처음에 했던 실수 ② 남들이 안 알려주는 순서 ③ 하루만에 바뀐 결과 비교";
    if (q.includes("자막")) return "자막 팁: 한 줄 12자 이내, 핵심 단어만 크게, 문장 끝은 다음 컷으로 넘기면 이탈이 줄어요.";
    if (q.includes("제목")) return `제목안: 「${questTitle}」 3일차 기록 / 이거 하나 바꾸니 달라졌다 / 초보가 가장 많이 틀리는 것`;
    return `「${questTitle}」 기준으로 정리하면: 목표를 한 줄로 먼저 적고, 그다음 필요한 것만 3개로 줄여보세요. 더 구체적으로 물어보면 예시도 만들어드릴게요!`;
  };
  const send = () => {
    const t = text.trim(); if (!t) return;
    setMsgs((m) => [...m, { me: true, text: t }]); setText("");
    setTimeout(() => setMsgs((m) => [...m, { me: false, text: reply(t) }]), 600);
  };
  const asstRef = useAutoScroll(msgs);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ fontSize: 11, fontWeight: "bold", marginBottom: 6 }}>🤖 어시스턴트</div>
      <div ref={asstRef} style={{ flex: 1, minHeight: 150, maxHeight: 220, overflow: "auto", background: "#eef0fb", border: `2px solid ${C.ink}`, padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ alignSelf: m.me ? "flex-end" : "flex-start", background: m.me ? C.gem : C.white, border: `2px solid ${C.ink}`, padding: "5px 8px", fontSize: 12, maxWidth: "88%", whiteSpace: "pre-wrap" }}>{m.text}</div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 5, marginTop: 6 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="예: 이 후크의 다른 버전 3개 만들어줘" style={{ flex: 1, minWidth: 0, padding: 7, border: `2px solid ${C.ink}`, fontFamily: "'DotGothic16', monospace", fontSize: 12, background: C.white }} />
        <PxButton tone="blue" onClick={send} style={{ fontSize: 12, padding: "7px 10px" }}>➤</PxButton>
      </div>
    </div>
  );
}

function CopyBox({ sec }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    try { navigator.clipboard.writeText(sec.text); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch (e) {}
  };
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: "bold", flex: 1 }}>{sec.icon} {sec.label}</span>
        <PxButton tone="wood" onClick={copy} style={{ fontSize: 10, padding: "3px 7px" }}>{copied ? "복사됨 ✓" : "⧉ 복사"}</PxButton>
      </div>
      <div style={{ background: "#f4f2ea", border: `2px solid ${C.ink}`, padding: 9, fontSize: 12, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{sec.text}</div>
    </div>
  );
}
/* 🎬 영상스쿨 리워드 (제품별 override 가능하도록 상수로 분리) */
const V_REWARD = { submit: 2, approve: 2, bonus: 4 };
const V_SPEC = { length: "30초 숏츠" };
const V_GRADS = [["hsl(258,62%,30%)", "hsl(298,55%,18%)"], ["hsl(280,62%,30%)", "hsl(320,55%,18%)"], ["hsl(300,62%,30%)", "hsl(340,55%,18%)"], ["hsl(250,62%,30%)", "hsl(210,55%,18%)"], ["hsl(320,62%,30%)", "hsl(360,55%,18%)"], ["hsl(268,62%,30%)", "hsl(308,55%,18%)"], ["hsl(335,62%,30%)", "hsl(15,55%,18%)"], ["hsl(262,62%,30%)", "hsl(302,55%,18%)"]];
const V_STAGES = [["script", "📝 원고"], ["source", "🎥 소스"], ["edit", "✂️ 편집"]];
function makePoster(p) {
  const situ = (p.situation || "").trim();
  const tag = (situ.split(/[ ,·\n]/)[0] || p.core || "주제").slice(0, 8);
  const who = [p.age && `${p.age}`, p.gender].filter(Boolean).join(" ");
  const title = situ ? situ.slice(0, 40) : (p.core || "새 주제");
  const hook = `${who ? who + "의 " : ""}${situ || "이런 상황"}${p.personality ? ` · ${p.personality}` : ""}`.slice(0, 60);
  const grad = V_GRADS[Math.floor(Math.random() * V_GRADS.length)];
  return { tag, title, hook, grad };
}
function emptyTopic(poster, protagonist, by) {
  return {
    id: "vt" + Date.now() + Math.floor(Math.random() * 1000),
    tag: poster.tag, title: poster.title, hook: poster.hook, grad: poster.grad,
    protagonist: protagonist || null, by: by || "익명",
    script: { submitted: false, text: "", by: "", approved: false, status: "", feedback: "", hadFeedback: false },
    source: { submitted: false, link: "", by: "", approved: false, status: "", feedback: "", hadFeedback: false },
    edit: { submitted: false, link: "", by: "", approved: false, status: "", feedback: "", hadFeedback: false },
    upload: { posted: false, caption: "", hashtags: "", by: "" },
    bonusPaid: false,
  };
}
const stDone = (st) => !!(st && st.approved);
/* 스테이지 상태: none · pending(회색 승인대기) · feedback(핑크 피드백도착) · approved(초록 승인완료)
   ※ 색 구분은 프로덕트 전역 통일 권장 */
const stStatus = (st) => (st && st.approved) ? "approved" : (st && st.status === "feedback") ? "feedback" : (st && st.submitted) ? "pending" : "none";
const V_STATUS = { pending: { bg: "#eeeaf0", fg: "#8a7f6a", label: "⏳ 승인대기중" }, feedback: { bg: "#ffe1ec", fg: "#9d174d", label: "📝 피드백 도착" }, approved: { bg: "#e6f4ea", fg: "#4e9a3a", label: "👑 승인 완료" } };
const topicComplete = (t) => t && stDone(t.script) && stDone(t.source) && stDone(t.edit) && t.upload && t.upload.posted;

/* 주제 카드(포스터) */
function PosterCard({ t, children, selected = false }) {
  const g = t.grad || ["#ddd", "#bbb"];
  return (
    <div className={"vs-poster" + (selected ? " selected" : "")} style={{ border: `2px solid ${C.ink}`, borderRadius: 10, overflow: "hidden", marginBottom: 10, background: C.white }}>
      <div style={{ background: `linear-gradient(135deg, ${g[0]}, ${g[1]})`, padding: "10px 12px" }}>
        <div style={{ display: "inline-block", fontSize: 10, fontWeight: "bold", background: "rgba(255,255,255,0.85)", color: C.ink, border: `2px solid ${C.ink}`, borderRadius: 10, padding: "1px 8px", marginBottom: 5 }}>#{t.tag}</div>
        <div style={{ fontSize: 14, fontWeight: "bold", color: C.ink, lineHeight: 1.4 }}>{t.title}</div>
        <div style={{ fontSize: 11, color: "#3a3228", opacity: 0.8, marginTop: 3, lineHeight: 1.5 }}>{t.hook}</div>
      </div>
      <div style={{ padding: 10 }}>{children}</div>
    </div>
  );
}

/* 스테이지 상태 뱃지 (회색 대기 · 핑크 피드백 · 초록 승인) */
function StageBadge({ st }) {
  if (!st) return null;
  const s = stStatus(st);
  const base = { fontSize: 10, fontWeight: "bold", border: `1.5px solid ${C.ink}`, borderRadius: 8, padding: "1px 7px", display: "inline-block" };
  if (s === "none") return <span style={{ ...base, background: "#eeeaf0", color: "#8a7f6a" }}>대기</span>;
  const info = V_STATUS[s];
  return <span style={{ ...base, background: info.bg, color: info.fg }}>{info.label}</span>;
}

/* 🎬 영상스쿨 퀘스트 게시판 (집 하나 = 카테고리 하나) */
function VideoBoard({ house, vdata, setVData, saveVData, myName, reward, toast, tier = "high", product, products = [], onOpenTutorial }) {
  const topics = (vdata && vdata.topics) || [];
  const me = myName || "익명";
  const RW = productReward(product);
  const pid = (product && product.id) || "default";
  const defPid = (products && products[0] && products[0].id) || pid;
  /* 기본 상황 리스트 = 시드 포스터 (항상 유지 · 삭제/대체 안 됨) · 플레이어가 만든 포스터가 위에 추가돼요 */
  const seedTopics = ((product && product.situations) || []).map((s, i) => ({ ...emptyTopic({ tag: s.tag || "주제", title: s.title || "주제", hook: s.hook || "", grad: V_GRADS[i % V_GRADS.length] }, null, "시드"), id: "seed_" + pid + "_" + i, product: pid, seed: true }));
  const storedTopics = topics.filter((t) => (t.product || defPid) === pid);
  const displayTopics = (() => { const byId = {}; seedTopics.forEach((t) => { byId[t.id] = t; }); storedTopics.forEach((t) => { byId[t.id] = t; }); return Object.values(byId); })();
  // 시드에 작업(제출)이 일어나면 그 순간 실제 토픽으로 저장(materialize)
  const ensure = (tid) => { if (topics.some((t) => t.id === tid)) return topics; const sd = displayTopics.find((t) => t.id === tid); return sd ? [...topics, { ...sd, seed: false }] : topics; };
  /* 🧑 주인공 입력 */
  const [pAge, setPAge] = useState("");
  const [pGender, setPGender] = useState("");
  const [pSitu, setPSitu] = useState("");
  const [pCore, setPCore] = useState("");
  const [pPers, setPPers] = useState("");
  const [draftText, setDraftText] = useState({});   // 입력 중 텍스트 (topicId별)
  const [showProt, setShowProt] = useState({});      // 🎭 주인공 설정 토글
  const [queueOpen, setQueueOpen] = useState(false); // 🗂 검토 큐
  const [selTopic, setSelTopic] = useState(null);    // 클릭해서 연 주제(에디터 모달)

  const commit = (nextTopics, gold, msg) => {
    const next = { ...vdata, topics: nextTopics };
    setVData(next); saveVData(next);
    if (gold) reward(gold);
    if (msg) toast(msg);
  };
  const withComplete = (nextTopics, tid, gold, msg) => {
    // 스테이지 반영 후, 그 주제가 방금 완주됐으면 보너스 지급
    const t = nextTopics.find((x) => x.id === tid);
    if (t && topicComplete(t) && !t.bonusPaid) {
      const done = nextTopics.map((x) => x.id === tid ? { ...x, bonusPaid: true } : x);
      commit(done, (gold || 0) + RW.bonus, `🎉 「${t.title}」 완주! +${gold || 0}G, 완주 보너스 +${RW.bonus}G`);
    } else {
      commit(nextTopics, gold, msg);
    }
  };

  const addProtagonist = () => {
    if (!pSitu.trim() && !pCore.trim()) { toast("상황이나 코어를 입력해줘"); return; }
    const poster = makePoster({ age: pAge, gender: pGender, situation: pSitu, core: pCore, personality: pPers });
    const t = { ...emptyTopic(poster, { age: pAge, gender: pGender, situation: pSitu, core: pCore, personality: pPers }, me), product: pid };
    commit([t, ...topics], 0, "🧑 주제 카드가 생성됐어요");
    setPAge(""); setPGender(""); setPSitu(""); setPCore(""); setPPers("");
  };

  const isReviewer = tier === "high";   // 🔥 숙련된 제작자(파티장)만 승인·피드백 가능
  /* 제출 : 편집은 항상 검토 · 원고/소스는 높은 티어면 자동승인 · 원고는 피드백 1회 후 재제출도 자동승인 */
  const submitStage = (tid, stage, payload) => {
    const cur = (topics.find((x) => x.id === tid) || {})[stage] || {};
    const auto = stage !== "edit" && (tier === "high" || (stage === "script" && cur.hadFeedback));
    const nt = ensure(tid).map((t) => t.id === tid ? { ...t, [stage]: { ...t[stage], ...payload, submitted: true, by: me, approved: auto, status: auto ? "approved" : "pending", feedback: "" } } : t);
    withComplete(nt, tid, RW.submit, auto ? `제출 즉시 승인됐어요 · +${RW.submit}G` : `제출 완료 · 검토 대기 · +${RW.submit}G`);
    setDraftText((d) => ({ ...d, [tid + stage]: "" }));
  };
  const approveStage = (tid, stage) => {
    const nt = ensure(tid).map((t) => t.id === tid ? { ...t, [stage]: { ...t[stage], approved: true, status: "approved", feedback: "" } } : t);
    withComplete(nt, tid, RW.approve, `승인 완료 · +${RW.approve}G`);
  };
  /* 피드백(수정요청) : 원본 내용은 유지 · 스테이지가 다시 열려요 · 원고는 이후 재제출 시 자동승인 */
  const feedbackStage = (tid, stage, msg) => {
    const m = (msg || "").trim(); if (!m) { toast("피드백 내용을 적어주세요"); return; }
    const nt = ensure(tid).map((t) => t.id === tid ? { ...t, [stage]: { ...t[stage], approved: false, status: "feedback", feedback: m, feedbackBy: me, hadFeedback: true } } : t);
    commit(nt, 0, "✏️ 피드백을 보냈어요");
    setDraftText((d) => ({ ...d, [tid + stage + "fb"]: "" }));
  };
  const postUpload = (tid, caption, hashtags) => {
    const nt = ensure(tid).map((t) => t.id === tid ? { ...t, upload: { posted: true, caption, hashtags, by: me } } : t);
    withComplete(nt, tid, 0, null);
  };

  const inp = { width: "100%", boxSizing: "border-box", padding: 8, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 12.5, background: C.white };

  /* ── 🧑 주인공 만들기 ── */
  if (house.id === "hero") {
    const CORE_CHIPS = ["사랑받고 싶고 인정받고 싶은 마음", "자존감 회복", "반전 매력 어필", "숨은 재능 발견"];
    const labelS = { fontSize: 11, fontWeight: "bold", color: C.inkSoft, margin: "8px 0 4px" };
    const chipS = (on) => ({ cursor: "pointer", fontFamily: "'DotGothic16', monospace", fontSize: 11, fontWeight: "bold", background: on ? "#4f46e5" : "#eef0fb", color: on ? "#fff" : "#4b3fb0", border: `1.5px solid ${on ? "#4f46e5" : "#c3c7f5"}`, borderRadius: 999, padding: "4px 10px" });
    return (
      <div>
        <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 12, lineHeight: 1.75 }}>🐣 새 영상 주제가 필요할 때 여기서 주인공을 직접 만들어보세요. 타겟·상황·성격을 적으면 AI가 원고 작성 탭에 쓸 포스터를 바로 만들어줘요 — <b>승인 없이 바로 추가돼요.</b></div>
        <div style={{ background: C.white, border: `2px solid ${C.ink}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 4 }}>📇 주인공 설정</div>
          <div style={{ fontSize: 11, color: C.inkSoft, lineHeight: 1.6, marginBottom: 6 }}>아래를 채우면 원고 작성 탭 포스터 목록에 새 카드가 즉시 생겨요. 기존 8개 주제는 그대로 남아있고, 여기서 만든 건 추가되는 방식이에요.</div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={labelS}>나이대</div>
              <select value={pAge} onChange={(e) => setPAge(e.target.value)} style={{ ...inp, cursor: "pointer" }}>{["", "10대", "20대", "30대", "40대 이상"].map((o) => <option key={o} value={o}>{o || "선택"}</option>)}</select>
            </div>
            <div style={{ flex: 1 }}>
              <div style={labelS}>성별</div>
              <select value={pGender} onChange={(e) => setPGender(e.target.value)} style={{ ...inp, cursor: "pointer" }}>{["", "남", "여", "무관"].map((o) => <option key={o} value={o}>{o || "선택"}</option>)}</select>
            </div>
          </div>
          <div style={labelS}>구체적 상황과 심정</div>
          <textarea value={pSitu} onChange={(e) => setPSitu(e.target.value)} rows={2} placeholder="예: 소개팅 자리에서 노래방 갔는데 다 같이 조용해질까봐 무서운 상황" style={{ ...inp, resize: "vertical" }} />
          <div style={labelS}>공략할 코어 (심정)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>{CORE_CHIPS.map((c) => <button key={c} type="button" onClick={() => setPCore(c)} style={chipS(pCore === c)}>{c}</button>)}</div>
          <input value={pCore} onChange={(e) => setPCore(e.target.value)} placeholder="예: 사랑받고 싶고 인정받고 싶은 마음" style={inp} />
          <div style={labelS}>성격/성향</div>
          <input value={pPers} onChange={(e) => setPPers(e.target.value)} placeholder="예: 소심함, 낯가림, 허세 있음" style={inp} />
          <PxButton tone="good" onClick={addProtagonist} style={{ width: "100%", fontSize: 13, padding: 11, marginTop: 10 }}>🤖 AI로 포스터 만들기</PxButton>
        </div>
        <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 6 }}>🗂 만들어진 주제 {displayTopics.length}개</div>
        {displayTopics.length === 0 && <div style={{ fontSize: 12, color: C.inkSoft, textAlign: "center", padding: 16 }}>아직 주제가 없어요. 위에서 만들어보세요!</div>}
        {displayTopics.map((t) => (
          <PosterCard key={t.id} t={t}>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
              {V_STAGES.map(([k, lb]) => <span key={k} style={{ fontSize: 10 }}>{lb} <StageBadge st={t[k]} /></span>)}
              <span style={{ fontSize: 10 }}>🚀 {t.upload && t.upload.posted ? "게시됨" : "대기"}</span>
            </div>
            <div style={{ fontSize: 10, color: C.inkSoft, marginTop: 5 }}>만든 사람: {t.by}</div>
          </PosterCard>
        ))}
      </div>
    );
  }

  /* ── 📝 원고 / 🎥 소스 / ✂️ 편집 / 🚀 업로드 게시판 (플랫 탭) ── */
  const stage = house.id;   // script | source | edit | upload
  const stageLabel = { script: "📝 원고", source: "🎥 소스", edit: "✂️ 편집", upload: "🚀 업로드" }[stage];
  const stageDesc = {
    script: "📇 아래 포스터를 눌러서 주제를 골라보세요 — 그 사람이 되었다고 생각하고 원고(후크+스토리)를 써보세요. 포스터 왼쪽 위 🖼 아이콘으로 사진도 넣을 수 있어요.",
    source: "📹 주제만 봐도 바로 찾을 수 있어요 — 원고를 기다릴 필요 없이 아무 주제나 골라서 영상 소스를 제출하세요. 파일로 제출하면 편집 탭에 자동으로 소스가 연결돼요.",
    edit: "✂️ 소스가 준비된 주제를 편집하세요 — 음악 추가, 컷 편집까지 끝나면 완성본 링크를 제출.",
    upload: "🚀 편집까지 끝난 주제를 캡션·해시태그 달아서 업로드하세요. (실제 SNS 업로드 연동 전이라 게시 화면까지만 시뮬레이션해요)",
  }[stage];
  const stageIcon = { script: "📝", source: "🎥", edit: "✂️", upload: "🚀" }[stage];

  /* 🗂 검토 큐 : 모든 주제의 「승인 대기(pending)」 스테이지를 모아서 스테이지 탭으로 보여줘요 */
  const Q_STAGES = [["script", "📝 원고"], ["source", "🎥 소스"], ["edit", "✂️ 편집"]];
  const queueItems = [];
  displayTopics.forEach((t) => Q_STAGES.forEach(([sid]) => {
    const s = t[sid] || {};
    if (s.submitted && !s.approved && s.status !== "feedback") {
      queueItems.push({ id: t.id + "_" + sid, tab: sid, tid: t.id, stage: sid, title: t.title, content: s.text || s.link, by: s.by });
    }
  }));
  const queueTabs = Q_STAGES.map(([sid, lb]) => ({ id: sid, label: lb, count: queueItems.filter((i) => i.tab === sid).length }));

  /* 리스트 행 상태 배지 */
  const rowStatus = (t) => {
    if (stage === "upload") { if (!stDone(t.edit)) return { label: "편집 대기중", bg: "#eeeaf0", fg: "#8a7f6a" }; if (t.upload && t.upload.posted) return { label: "👑 게시됨", bg: "#e6f4ea", fg: "#4e9a3a" }; return { label: "업로드 가능", bg: "#e0e2fc", fg: "#4f46e5" }; }
    if (stage === "edit" && !(stDone(t.script) && stDone(t.source))) return { label: "🔒 소스 승인 대기", bg: "#eeeaf0", fg: "#8a7f6a" };
    const s = stStatus(t[stage]);
    if (s === "none") return { label: stage === "edit" ? "편집 시작" : "대기중", bg: "#e0e2fc", fg: "#4f46e5" };
    const info = V_STATUS[s]; return { label: info.label, bg: info.bg, fg: info.fg };
  };

  /* 에디터(모달 내부) — 제출 · 피드백 · 승인 */
  const renderEditor = (t) => {
    const st = t[stage] || {};
    const key = t.id + stage;
    const status = stStatus(st);
    const curVal = draftText[key] != null ? draftText[key] : (st.text || st.link || "");
    if (stage === "upload") {
      if (!stDone(t.edit)) return <div style={{ fontSize: 11.5, color: C.inkSoft, background: "#f4f2ea", border: `2px solid ${C.parchEdge}`, borderRadius: 6, padding: 8 }}>🔒 편집 승인 후 업로드할 수 있어요</div>;
      if (t.upload && t.upload.posted) return (
        <div><StageBadge st={{ approved: true }} /><div style={{ fontSize: 12, marginTop: 6, whiteSpace: "pre-wrap" }}>📝 {t.upload.caption}</div><div style={{ fontSize: 11, color: "#4f46e5", marginTop: 3 }}>{t.upload.hashtags}</div><div style={{ fontSize: 10, color: C.inkSoft, marginTop: 3 }}>게시: {t.upload.by}</div></div>
      );
      return (
        <div>
          <textarea value={draftText[key] || ""} onChange={(e) => setDraftText((d) => ({ ...d, [key]: e.target.value }))} rows={2} placeholder="캡션" style={{ ...inp, marginBottom: 6, resize: "vertical" }} />
          <input value={draftText[key + "h"] || ""} onChange={(e) => setDraftText((d) => ({ ...d, [key + "h"]: e.target.value }))} placeholder="#해시태그 #모아서" style={{ ...inp, marginBottom: 6 }} />
          <PxButton tone="gold" onClick={() => { postUpload(t.id, (draftText[key] || "").trim(), (draftText[key + "h"] || "").trim()); setSelTopic(null); }} style={{ width: "100%", fontSize: 12, padding: 9 }}>🚀 게시하기</PxButton>
        </div>
      );
    }
    if (stage === "edit" && !(stDone(t.script) && stDone(t.source))) return <div style={{ fontSize: 11.5, color: C.inkSoft, background: "#f4f2ea", border: `2px solid ${C.parchEdge}`, borderRadius: 6, padding: 8 }}>🔒 원고·소스가 모두 승인되면 편집을 시작할 수 있어요</div>;
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: "bold", flex: 1 }}>{stageLabel}</span>
          <StageBadge st={st} />
        </div>
        {(status === "none" || status === "feedback") ? (
          <div>
            {status === "feedback" && (
              <div style={{ background: "#ffe1ec", border: "1.5px solid #ffb8d2", borderRadius: 8, padding: 8, fontSize: 11.5, lineHeight: 1.6, marginBottom: 6, color: "#9d174d" }}>
                📝 <b>파티장 피드백</b>{st.feedbackBy ? ` · ${st.feedbackBy}` : ""}<br /><span style={{ color: C.ink, whiteSpace: "pre-wrap" }}>{st.feedback}</span>
              </div>
            )}
            {stage === "script" && <div style={{ display: "inline-block", fontSize: 10, fontWeight: "bold", color: "#4f46e5", background: "#e0e2fc", border: "1.5px solid #cdd0f7", borderRadius: 999, padding: "2px 9px", marginBottom: 6 }}>⏱️ 완성 영상은 {(product && product.spec && product.spec.length) || V_SPEC.length} 내외로</div>}
            <textarea value={curVal} onChange={(e) => setDraftText((d) => ({ ...d, [key]: e.target.value }))} rows={stage === "script" ? 5 : 3} placeholder={stage === "script" ? `${V_SPEC.length} 원고를 써주세요` : "파일 설명 + 구글드라이브/업로드 링크"} style={{ ...inp, marginBottom: 6, resize: "vertical" }} />
            {stage === "script" && <AISelfCheck text={curVal} />}
            <PxButton tone="good" onClick={() => { submitStage(t.id, stage, stage === "script" ? { text: curVal.trim() } : { link: curVal.trim() }); setSelTopic(null); }} style={{ width: "100%", fontSize: 12, padding: 9 }}>{status === "feedback" ? "수정 후 제출하기" : "제출하고 골드 받기"}</PxButton>
          </div>
        ) : (
          <div>
            <div style={{ background: "#f4f2ea", border: `2px solid ${C.parchEdge}`, borderRadius: 6, padding: 8, fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.6 }}>{st.text || st.link}</div>
            <div style={{ fontSize: 10, color: C.inkSoft, margin: "4px 0 6px" }}>제출: {st.by}</div>
            {status === "pending" && (isReviewer ? (
              <div>
                <textarea value={draftText[key + "fb"] || ""} onChange={(e) => setDraftText((d) => ({ ...d, [key + "fb"]: e.target.value }))} rows={2} placeholder="✏️ 수정요청(피드백) 내용 — 적고 「피드백」을 누르면 작성자에게 돌아가요" style={{ ...inp, marginBottom: 6, resize: "vertical" }} />
                <div style={{ display: "flex", gap: 6 }}>
                  <PxButton tone="wood" onClick={() => setDraftText((d) => ({ ...d, [key + "fb"]: polishFeedback(d[key + "fb"] || "") }))} title="짧게 적어도 AI가 부드럽고 구체적으로 다듬어줘요" style={{ flexShrink: 0, fontSize: 12, padding: 9 }}>✨ 다듬기</PxButton>
                  <PxButton tone="good" onClick={() => { approveStage(t.id, stage); setSelTopic(null); }} style={{ flex: 1, fontSize: 12, padding: 9 }}>✅ 승인 (+{RW.approve}G)</PxButton>
                  <PxButton tone="danger" onClick={() => { feedbackStage(t.id, stage, draftText[key + "fb"] || ""); setSelTopic(null); }} style={{ flex: 1, fontSize: 12, padding: 9 }}>✏️ 피드백</PxButton>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 11, color: C.inkSoft, background: "#f0eee6", border: `2px solid ${C.parchEdge}`, borderRadius: 6, padding: 8, textAlign: "center" }}>🕓 파티장(🔥 숙련된 제작자)의 검토를 기다리는 중이에요</div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const selT = displayTopics.find((t) => t.id === selTopic);

  return (
    <div>
      {isReviewer && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <QueueButton count={queueItems.length} onClick={() => setQueueOpen(true)} label="🎀 파티장 검토사항" />
        </div>
      )}
      {queueOpen && (
        <ReviewQueue title="🎀 파티장 검토사항" tabs={queueTabs} items={queueItems} onApprove={(it) => approveStage(it.tid, it.stage)} onFeedback={(it, msg) => feedbackStage(it.tid, it.stage, msg)} onClose={() => setQueueOpen(false)} />
      )}
      <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 10, lineHeight: 1.7 }}>{stageDesc}</div>
      {product && stage === "script" && onOpenTutorial && <button type="button" onClick={onOpenTutorial} style={{ cursor: "pointer", fontFamily: "'DotGothic16', monospace", fontSize: 11, fontWeight: "bold", color: "#4f46e5", background: "#e0e2fc", border: "1.5px solid #c3c7f5", borderRadius: 999, padding: "5px 12px", marginBottom: 10 }}>📖 STEP 0 · 코어 / 원고 예시 다시보기</button>}
      {product && stage === "source" && (<><SourceBelt tools={product.sourceTools} /><KeywordChips keywords={product.keywords} /></>)}
      {product && stage === "edit" && <SafeZoneDiagram editGuide={product.editGuide} />}
      {displayTopics.length === 0 && <div style={{ fontSize: 12, color: C.inkSoft, textAlign: "center", padding: 20 }}>주제가 없어요. 🧑 주인공 만들기에서 먼저 만들어주세요!</div>}

      {stage === "script" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
          {displayTopics.map((t) => {
            const g = t.grad || ["#ddd", "#bbb"];
            const s = stStatus(t[stage]);
            return (
              <div key={t.id} className="vs-poster" onClick={() => setSelTopic(t.id)} style={{ cursor: "pointer", border: `2px solid ${C.ink}`, borderRadius: 12, overflow: "hidden", position: "relative", minHeight: 152, background: `linear-gradient(160deg, ${g[0]}, ${g[1]})`, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <div style={{ position: "absolute", top: 8, left: 8, fontSize: 14, opacity: 0.9 }}>🖼</div>
                {s !== "none" && <div style={{ position: "absolute", top: 8, right: 8, fontSize: 13 }}>{s === "approved" ? "👑" : s === "feedback" ? "📝" : "⏳"}</div>}
                <div style={{ padding: 10, background: "linear-gradient(to top, rgba(0,0,0,0.4), transparent)" }}>
                  <span style={{ display: "inline-block", fontSize: 9, fontWeight: "bold", background: "rgba(255,255,255,0.9)", color: C.ink, borderRadius: 8, padding: "1px 7px", marginBottom: 4 }}>{t.tag}</span>
                  <div style={{ fontSize: 12.5, fontWeight: "bold", color: "#fff", lineHeight: 1.35, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>{t.title}</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          {displayTopics.map((t) => {
            const g = t.grad || ["#ddd", "#bbb"];
            const rs = rowStatus(t);
            return (
              <div key={t.id} onClick={() => setSelTopic(t.id)} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: C.white, border: `2px solid ${C.ink}`, borderRadius: 10, padding: "9px 11px", marginBottom: 8 }}>
                <div style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 8, background: `linear-gradient(160deg, ${g[0]}, ${g[1]})`, border: `2px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{stageIcon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: "bold", color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: C.inkSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.tag} · {t.hook}</div>
                </div>
                <span style={{ flexShrink: 0, fontSize: 10, fontWeight: "bold", background: rs.bg, color: rs.fg, border: `1.5px solid ${C.ink}`, borderRadius: 8, padding: "2px 8px", whiteSpace: "nowrap" }}>{rs.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {selT && (
        <div onClick={() => setSelTopic(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 95, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, maxHeight: "88vh", overflowY: "auto", background: C.white, border: `3px solid ${C.ink}`, borderRadius: 12 }}>
            <div style={{ background: `linear-gradient(135deg, ${(selT.grad || ["#ddd", "#bbb"])[0]}, ${(selT.grad || ["#ddd", "#bbb"])[1]})`, padding: "12px 44px 12px 14px", position: "relative" }}>
              <div style={{ display: "inline-block", fontSize: 10, fontWeight: "bold", background: "rgba(255,255,255,0.85)", color: C.ink, borderRadius: 10, padding: "1px 8px", marginBottom: 5 }}>#{selT.tag}</div>
              <div style={{ fontSize: 14, fontWeight: "bold", color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>{selT.title}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.9)", marginTop: 3, lineHeight: 1.5, textShadow: "0 1px 2px rgba(0,0,0,0.35)" }}>{selT.hook}</div>
              <button type="button" onClick={() => setSelTopic(null)} style={{ position: "absolute", top: 10, right: 10, cursor: "pointer", background: C.white, border: `2px solid ${C.ink}`, borderRadius: 6, fontSize: 11, fontWeight: "bold", padding: "3px 8px", fontFamily: "'DotGothic16', monospace" }}>닫기</button>
            </div>
            <div style={{ padding: 14 }}>
              {selT.protagonist && (
                <div style={{ marginBottom: 8 }}>
                  <button type="button" onClick={() => setShowProt((sp) => ({ ...sp, [selT.id]: !sp[selT.id] }))} style={{ cursor: "pointer", fontFamily: "'DotGothic16', monospace", fontSize: 11, background: "none", border: "none", color: "#4f46e5", fontWeight: "bold" }}>🎭 주인공 설정 {showProt[selT.id] ? "▲" : "▼"}</button>
                  {showProt[selT.id] && <div style={{ background: "#f7f2ff", border: `2px solid ${C.parchEdge}`, borderRadius: 6, padding: 8, fontSize: 11, lineHeight: 1.7, marginTop: 4 }}>나이 {selT.protagonist.age || "-"} · 성별 {selT.protagonist.gender || "-"}<br />상황: {selT.protagonist.situation || "-"}<br />코어: {selT.protagonist.core || "-"}<br />성격: {selT.protagonist.personality || "-"}</div>}
                </div>
              )}
              {renderEditor(selT)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SchoolView({ school, onBack, cleared = {}, onClear, onReward = () => {}, myName = "", tier = "high" }) {
  const net = useContext(NetContext) || {};
  const meNet = net.me || {};
  const s = SCHOOLS[school];
  const MAP_W = 640, MAP_H = 420;
  const [pos, setPos] = useState({ x: MAP_W / 2, y: MAP_H - 50 });
  useEffect(() => { if (net && net.roomPosRef) net.roomPosRef.current = pos; }, [pos, net]);
  const [facing, setFacing] = useState(1);
  const [moving, setMoving] = useState(false);
  const [near, setNear] = useState(null);
  const [open, setOpen] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [vdata, setVData] = useState({ topics: [], products: DEFAULT_PRODUCTS });   // 🎬 영상스쿨 주제·제출·승인 + 제품정의 (서버 공유)
  const [vToast, setVToast] = useState("");
  const vToastFn = (m) => { setVToast(m); setTimeout(() => setVToast(""), 2800); };
  const saveVData = (next) => { dbSaveVSchool(next); };
  /* 💰 골드 획득 이펙트 — 하단 토스트 대신 상단 골드칩 옆 "+NG" 말풍선 통통 + 숫자 펄스 + 부드러운 2음 코인 사운드 */
  const [earnedG, setEarnedG] = useState(0);
  const [goldFx, setGoldFx] = useState([]);
  const [goldPulse, setGoldPulse] = useState(false);
  const goldFxId = useRef(0);
  const audioRef = useRef(null);
  const playCoin = () => {
    try {
      if (!audioRef.current) audioRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ac = audioRef.current; if (ac.state === "suspended") ac.resume();
      [1320, 1760].forEach((f, i) => {
        const t0 = ac.currentTime + i * 0.075;
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = "sine"; o.frequency.setValueAtTime(f, t0);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.08, t0 + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
        o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + 0.24);
      });
    } catch (e) {}
  };
  const handleReward = (g) => {
    onReward(g);
    if (g > 0) {
      setEarnedG((e) => e + g);
      const id = ++goldFxId.current;
      setGoldFx((f) => [...f, { id, n: g }]);
      setTimeout(() => setGoldFx((f) => f.filter((x) => x.id !== id)), 1300);
      setGoldPulse(false);
      requestAnimationFrame(() => { setGoldPulse(true); setTimeout(() => setGoldPulse(false), 600); });
      playCoin();
    }
  };
  const [selProd, setSelProd] = useState("");        // 선택된 제품 id
  const [prodAdmin, setProdAdmin] = useState(false); // 제품 편집 관리자 잠금 해제
  const [formProduct, setFormProduct] = useState(null); // null | {…} 편집중 | "new"
  useEffect(() => {
    if (school !== "videoschool") return;
    const load = () => dbLoadVSchool().then((d) => {
      if (d && typeof d === "object") {
        setVData({ topics: Array.isArray(d.topics) ? d.topics : [], products: (Array.isArray(d.products) && d.products.length) ? d.products : DEFAULT_PRODUCTS });
      }
    }).catch(() => {});
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [school]);
  const vProducts = (vdata.products && vdata.products.length) ? vdata.products : DEFAULT_PRODUCTS;
  const curProduct = vProducts.find((p) => p.id === selProd) || vProducts[0];
  /* 📖 STEP0 온보딩 튜토리얼 — 영상스쿨 입장 시 자동 팝업(상품별 최초 1회) + 다시보기 */
  const [tutOpen, setTutOpen] = useState(false);
  const [vsTab, setVsTab] = useState("hero");   // 영상스쿨 플랫 탭: hero|script|source|edit|upload
  useEffect(() => {
    if (school !== "videoschool" || !curProduct) return;
    const k = "echotown_vtut_seen_" + curProduct.id;
    let seen = false; try { seen = window.localStorage.getItem(k) === "1"; } catch (e) {}
    if (!seen) { setTutOpen(true); try { window.localStorage.setItem(k, "1"); } catch (e) {} }
  }, [school, curProduct && curProduct.id]); // eslint-disable-line
  useEffect(() => { if (!vProducts.some((p) => p.id === selProd)) setSelProd((vProducts[0] && vProducts[0].id) || ""); }, [vProducts]); // eslint-disable-line
  const tryProdAdmin = () => { if (prodAdmin) { setFormProduct("new"); return; } const c = window.prompt("🔒 제품 추가/편집은 관리자 코드가 필요해요.\n관리자 코드를 입력하세요:"); if (c != null && c.trim() === VS_ADMIN_PW) { setProdAdmin(true); setFormProduct("new"); } else if (c != null) window.alert("코드가 틀렸어요."); };
  const saveProduct = (prod) => {
    const list = vProducts.some((p) => p.id === prod.id) ? vProducts.map((p) => p.id === prod.id ? prod : p) : [...vProducts, prod];
    const next = { ...vdata, products: list };
    setVData(next); saveVData(next); setFormProduct(null); setSelProd(prod.id);
    vToastFn("📦 제품이 저장됐어요");
  };
  const deleteProduct = (pid) => {
    const list = vProducts.filter((p) => p.id !== pid);
    const next = { ...vdata, products: list.length ? list : DEFAULT_PRODUCTS };
    setVData(next); saveVData(next); setFormProduct(null); setSelProd("");
    vToastFn("🗑 제품을 삭제했어요");
  };
  const keys = useRef({});
  const posRef = useRef(pos);
  const nearRef = useRef(null);
  const openRef = useRef(false);
  openRef.current = !!open;
  const clearedRef = useRef(cleared);
  clearedRef.current = cleared;

  const houses = s.quests.map((q, i) => ({ ...q, ...(SCHOOL_HOUSE_POS[i] || { x: 300, y: 200 }) }));
  const housesRef = useRef(houses);
  housesRef.current = houses;

  useEffect(() => {
    const down = (e) => {
      if (isTyping(e)) return;
      if (school === "videoschool") return;   // 영상스쿨은 맵이 아니라 플랫 탭 보드 — 이동/E 비활성
      const raw = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d", "e"].includes(raw)) e.preventDefault();
      if (openRef.current) return;
      if (raw === "e" || raw === " ") {
        const n = nearRef.current;
        if (n) {
          const h = housesRef.current.find((x) => x.id === n);
          if (h) setOpen(h);
        }
        return;
      }
      keys.current[raw] = true;
    };
    const up = (e) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  const facingRef = useRef(1);
  const movingRef = useRef(false);
  useEffect(() => {
    let raf;
    let last = performance.now();
    const PPS = 204;
    const loop = (now) => {
      try {
        const t = now || performance.now();
        const dt = Math.min(0.1, Math.max(0, (t - last) / 1000));
        last = t;
        const SPEED = PPS * dt;
        if (!openRef.current) {
          const k = keys.current;
          let { x, y } = posRef.current;
          let dx = 0, dy = 0;
          if (k["arrowleft"] || k["a"]) dx -= 1;
          if (k["arrowright"] || k["d"]) dx += 1;
          if (k["arrowup"] || k["w"]) dy -= 1;
          if (k["arrowdown"] || k["s"]) dy += 1;
          if (dx || dy) {
            const len = Math.hypot(dx, dy) || 1;
            x += (dx / len) * SPEED; y += (dy / len) * SPEED;
            x = Math.max(16, Math.min(MAP_W - 16, x));
            y = Math.max(16, Math.min(MAP_H - 16, y));
            posRef.current = { x, y };
            setPos({ x, y });
            if (!movingRef.current) { movingRef.current = true; setMoving(true); }
            const f = dx > 0 ? 1 : dx < 0 ? -1 : facingRef.current;
            if (f !== facingRef.current) { facingRef.current = f; setFacing(f); }
          } else if (movingRef.current) { movingRef.current = false; setMoving(false); }
          let found = null;
          for (const h of housesRef.current) {
            if (Math.hypot(h.x - posRef.current.x, (h.y + 30) - posRef.current.y) < 70) { found = h.id; break; }
          }
          if (found !== nearRef.current) { nearRef.current = found; setNear(found); }
        }
      } catch (err) {
        // 한 프레임에서 오류가 나도 루프가 멈추지 않게 (예전엔 여기서 죽어 이동이 잠겼어요)
        console.error("[SchoolView] loop error:", err);
      } finally {
        raf = requestAnimationFrame(loop);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const doneCount = houses.filter((h) => cleared[h.id]).length;
  return (
    <Panel style={{ padding: 0, overflow: "hidden" }}>
      <style>{`
.vs-poster{box-shadow:0 6px 16px rgba(20,14,60,0.18);transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease;}
.vs-poster:hover{transform:translateY(-4px);box-shadow:0 12px 26px rgba(20,14,60,0.28),0 0 0 3px #e0e2fc,0 0 22px -4px #4f46e5;}
.vs-poster.selected{border-color:#f0a900 !important;box-shadow:0 0 0 3px #fff3d6;}
.vs-goldpill.pulse{animation:vsGoldPulse .55s ease;}
@keyframes vsGoldPulse{0%{transform:scale(1);}35%{transform:scale(1.22);}100%{transform:scale(1);}}
.vs-goldfloat{position:absolute;left:50%;top:-2px;pointer-events:none;z-index:200;color:#a86b00;font-weight:900;font-size:15px;white-space:nowrap;text-shadow:0 1px 2px rgba(0,0,0,0.15);animation:vsGoldFloat 1.3s ease forwards;}
@keyframes vsGoldFloat{0%{opacity:0;transform:translate(-50%,4px) scale(.7);}18%{opacity:1;transform:translate(-50%,-12px) scale(1.12);}75%{opacity:1;transform:translate(-50%,-32px) scale(1);}100%{opacity:0;transform:translate(-50%,-66px) scale(.96);}}
.vs-queue.has-pending{animation:vsPartyPulse 1.6s ease-in-out infinite;}
@keyframes vsPartyPulse{0%,100%{box-shadow:0 0 0 0 rgba(219,39,119,0.35);}50%{box-shadow:0 0 0 6px rgba(219,39,119,0);}}
`}</style>
      {chatOpen && <ChatBot onClose={() => setChatOpen(false)} />}
      {school === "videoschool" && <ProductTutorial product={curProduct} open={tutOpen} onClose={() => setTutOpen(false)} />}
      {vToast && <div style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 120, background: C.ink, color: "#ffe680", border: `2px solid ${C.gem}`, borderRadius: 20, padding: "9px 18px", fontSize: 13, fontFamily: "'DotGothic16', monospace", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>{vToast}</div>}
      <TitleBar tipId={school} icon={s.icon} title={s.title} sub={school === "videoschool" ? `${(curProduct && curProduct.name) || "제품"} · 프리랜서 퀘스트 보드` : "WASD 이동 · 집 근처에서 E · 아무 집이나 자유롭게"} onBack={onBack} bg={s.color} fg={C.white}
        right={<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {school === "videoschool" && (
            <span className={goldPulse ? "vs-goldpill pulse" : "vs-goldpill"} style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: "bold", color: "#a86b00", background: "#fff3d6", border: "2px solid #a86b00", borderRadius: 999, padding: "3px 10px" }}>
              🪙 {earnedG}G
              {goldFx.map((fx) => <span key={fx.id} className="vs-goldfloat">✨ +{fx.n}G</span>)}
            </span>
          )}
          {school === "videoschool" && (
            <span style={{ fontSize: 11, fontWeight: "bold", color: C.ink, background: C.white, border: `2px solid ${C.ink}`, borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap" }}>{tier === "high" ? "🔥 숙련된 제작자" : "🌱 성장하는 제작자"}</span>
          )}
          <PxButton tone="good" onClick={() => setChatOpen(true)} style={{ fontSize: 11, padding: "5px 10px" }}>🐣 코코</PxButton>
        </div>} />
      <div style={{ padding: 12, background: C.parch }}>
        {school === "videoschool" && (
          <>
            <ProductBar products={vProducts} selectedId={curProduct && curProduct.id} onSelect={setSelProd} isAdmin={prodAdmin} onAdd={tryProdAdmin} onEdit={() => { if (prodAdmin) setFormProduct(curProduct); else tryProdAdmin(); }} />
            {!prodAdmin && <div style={{ textAlign: "right", marginBottom: 8 }}><button type="button" onClick={tryProdAdmin} style={{ cursor: "pointer", background: "none", border: "none", fontSize: 10.5, color: C.inkSoft, fontFamily: "'DotGothic16', monospace" }}>🔒 관리자 (제품 추가/편집)</button></div>}
            {curProduct && <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><SpecBadge spec={curProduct.spec} /><button type="button" onClick={() => setTutOpen(true)} style={{ cursor: "pointer", fontFamily: "'DotGothic16', monospace", fontSize: 11, fontWeight: "bold", color: "#4f46e5", background: "#e0e2fc", border: "1.5px solid #c3c7f5", borderRadius: 999, padding: "3px 11px" }}>📖 STEP 0 · 코어 다시보기</button></div>}
          </>
        )}
        {school === "videoschool" ? (
          <>
            <div style={{ fontFamily: "'DotGothic16', monospace", fontSize: 16, fontWeight: "bold", color: C.ink, lineHeight: 1.5, marginBottom: 6 }}>오늘 하고 싶은 퀘스트부터 골라서 진행하세요</div>
            <div style={{ fontSize: 12, color: C.inkSoft, lineHeight: 1.75, marginBottom: 10 }}>4개 탭은 순서가 아니라 각자 독립된 작업이에요 — 원고만 몰아서 쓰고 싶으면 원고 탭에서 계속, 편집이 밀렸으면 편집 탭부터. 주제 하나당 퀘스트 하나, 제출하면 골드 +{productReward(curProduct).submit}G.</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: "bold", color: "#4f46e5", background: "#e0e2fc", border: "1.5px solid #cdd0f7", borderRadius: 999, padding: "4px 12px", marginBottom: 12 }}>⏱️ 완성 영상은 {(curProduct && curProduct.spec && curProduct.spec.length) || "30초"} 내외로</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 2 }}>
              {[["hero", "주인공 만들기"], ["script", "원고 작성"], ["source", "영상 소스 찾기"], ["edit", "영상 편집"], ["upload", "업로드"]].map(([id, label]) => {
                const on = vsTab === id;
                return (
                  <button key={id} type="button" onClick={() => setVsTab(id)} style={{ flex: "1 1 0", minWidth: 96, cursor: "pointer", fontFamily: "'DotGothic16', monospace", background: on ? "#4f46e5" : C.white, color: on ? "#fff" : C.ink, border: `2px solid ${on ? "#4f46e5" : C.ink}`, borderRadius: 10, padding: "8px 6px", textAlign: "center", boxShadow: on ? "0 3px 0 0 #3730a3" : "0 3px 0 0 " + C.parchEdge }}>
                    <div style={{ fontSize: 9, opacity: on ? 0.85 : 0.5, fontWeight: "bold", letterSpacing: 1 }}>STEP</div>
                    <div style={{ fontSize: 12, fontWeight: "bold", whiteSpace: "nowrap" }}>{label}</div>
                  </button>
                );
              })}
            </div>
            <VideoBoard house={{ id: vsTab }} vdata={vdata} setVData={setVData} saveVData={saveVData} myName={myName} reward={handleReward} toast={vToastFn} tier={tier} product={curProduct} products={vProducts} onOpenTutorial={() => setTutOpen(true)} />
          </>
        ) : (
        <>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1, height: 12, background: "#e2d3ab", border: `2px solid ${C.ink}` }}>
            <div style={{ height: "100%", width: `${(doneCount / houses.length) * 100}%`, background: s.color, transition: "width .3s" }} />
          </div>
          <b style={{ fontSize: 12 }}>{doneCount}/{houses.length} 완료</b>
        </div>
        <div style={{ position: "relative", width: "100%", maxWidth: MAP_W, height: MAP_H, margin: "0 auto", background: s.grass, border: `4px solid ${C.ink}`, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: "50%", top: 0, transform: "translateX(-50%)", width: 70, height: "100%", background: s.road, borderLeft: `3px dashed rgba(0,0,0,0.15)`, borderRight: `3px dashed rgba(0,0,0,0.15)` }} />
          <div style={{ position: "absolute", left: 40, top: 210, fontSize: 22 }}>🌳</div>
          <div style={{ position: "absolute", left: 600, top: 200, fontSize: 22 }}>🌳</div>
          <div style={{ position: "absolute", left: 250, top: 240, fontSize: 18 }}>🌲</div>
          <div style={{ position: "absolute", left: 470, top: 220, fontSize: 18 }}>🌸</div>

          {houses.map((h, i) => {
            const done = !!cleared[h.id];
            const locked = false;
            const active = near === h.id;
            return (
              <div key={h.id} style={{ position: "absolute", left: h.x, top: h.y, transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", filter: locked ? "grayscale(0.8) brightness(0.8)" : "none" }}>
                <div style={{ position: "relative" }}>
                  <PixelHouse roof={h.roof} roofDk={C.ink} wall={h.wall} size={92} />
                  <div style={{ position: "absolute", right: -6, top: 6, fontSize: 16 }}>{locked ? "🔒" : done ? "✅" : h.boss ? "👑" : ""}</div>
                </div>
                <div style={{ marginTop: 2, fontSize: 11, background: C.white, border: `2px solid ${C.ink}`, padding: "1px 6px", whiteSpace: "nowrap", boxShadow: active ? `0 0 0 3px ${C.gem}` : "none" }}>{locked ? "???" : h.title}</div>
              </div>
            );
          })}

          <div style={{ position: "absolute", left: pos.x, top: pos.y, transform: "translate(-50%,-100%)", zIndex: 5 }}>
            <Hero facing={facing} moving={moving} size={34} outfit={meNet.outfit} look={meNet.look} carry={meNet.carry} pet={meNet.pet} />
          </div>

          {/* 같은 스쿨의 다른 접속자 */}
          {net && net.others && Object.values(net.others).filter((o) => o.v && o.v === net.view && (o.rm || null) === (net.room || null)).map((o) => (
            <div key={o.id} style={{ position: "absolute", left: o.rx || 0, top: o.ry || 0, transform: "translate(-50%,-100%)", zIndex: 4, transition: "left .18s linear, top .18s linear", pointerEvents: "none" }}>
              {o.bubble && (
                <div style={{ position: "absolute", bottom: "150%", left: "50%", transform: "translateX(-50%)", whiteSpace: "normal", wordBreak: "break-word", width: "max-content", maxWidth: 180, lineHeight: 1.4, textAlign: "center", background: C.white, color: C.ink, border: `2px solid ${C.ink}`, borderRadius: 8, fontSize: 11, padding: "3px 7px" }}>{o.bubble}</div>
              )}
              <div style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 3, whiteSpace: "nowrap", background: "#8e5a9e", color: "#fff", border: `2px solid ${C.ink}`, fontSize: 10, padding: "1px 6px" }}>{o.name}</div>
              <div className={o.dm ? "dance-" + o.dm : ""} style={{ position: "relative", transformOrigin: "bottom center" }}>
                <Hero facing={o.f || 1} moving={false} size={30} look={o.lk} pet={o.pt} carry={o.cy ? { emoji: o.cy } : null} outfit={o.oc ? { top: o.oc[0] ? { color: o.oc[0] } : null, bottom: o.oc[1] ? { color: o.oc[1] } : null, shoes: o.oc[2] ? { color: o.oc[2] } : null } : null} />
              </div>
            </div>
          ))}

          {near && (
            <div className="enter-prompt" style={{ position: "absolute", left: "50%", bottom: 10, transform: "translateX(-50%)", background: C.ink, color: C.white, border: `2px solid ${C.gem}`, padding: "5px 12px", fontSize: 12, zIndex: 6 }}>E · 퀘스트 확인</div>
          )}
        </div>
        </>
        )}
      </div>

      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 90, padding: 12 }} onClick={() => setOpen(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 720, maxHeight: "90vh", overflow: "auto" }}>
            <Panel style={{ padding: 14 }}>
              {school === "videoschool" ? (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 13, flex: 1 }}>{open.title}</div>
                    <PxButton tone="ink" onClick={() => setOpen(null)} style={{ fontSize: 12, padding: "6px 12px" }}>닫기</PxButton>
                  </div>
                  <VideoBoard house={open} vdata={vdata} setVData={setVData} saveVData={saveVData} myName={myName} reward={handleReward} toast={vToastFn} tier={tier} product={curProduct} products={vProducts} onOpenTutorial={() => setTutOpen(true)} />
                </div>
              ) : (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 320px", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, border: `2px solid ${C.ink}`, background: C.white, padding: "1px 6px" }}>퀘스트 {houses.findIndex((h) => h.id === open.id) + 1}</span>
                    {open.cat && <span style={{ fontSize: 10, border: `2px solid ${C.ink}`, background: C.white, padding: "1px 6px" }}>{open.cat}</span>}
                    {cleared[open.id] && <span style={{ fontSize: 10, border: `2px solid ${C.ink}`, background: C.good, color: C.white, padding: "1px 6px" }}>완료</span>}
                    {open.boss && <span style={{ fontSize: 10, border: `2px solid ${C.ink}`, background: "#d9a441", padding: "1px 6px" }}>👑 보스</span>}
                  </div>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, marginBottom: 8 }}>{open.title}</div>
                  {!open.story && !(open.sections && open.sections.length) && !(open.steps && open.steps.length) && (
                    <div style={{ background: "#f4f2ea", border: `2px solid ${C.ink}`, padding: 18, fontSize: 13, textAlign: "center", color: C.inkSoft, lineHeight: 1.7, marginBottom: 10 }}>🚧 준비중이에요.<br />이 집의 내용은 곧 채워질 예정입니다!</div>
                  )}
                  {open.story && (
                    <div style={{ background: "#eef0fb", border: `2px solid ${C.ink}`, padding: 10, fontSize: 12, lineHeight: 1.7, marginBottom: 10 }}>📖 {open.story}</div>
                  )}
                  {(open.sections || []).map((sec, i) => <CopyBox key={i} sec={sec} />)}
                  {!open.sections && (open.steps || []).map((st, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, background: C.white, border: `2px solid ${C.ink}`, padding: "7px 9px", fontSize: 13, marginBottom: 6 }}>
                      <b style={{ color: s.color }}>{i + 1}</b><span>{st}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <PxButton tone="ink" onClick={() => setOpen(null)} style={{ flex: 1, padding: 9, fontSize: 13 }}>닫기</PxButton>
                    <PxButton tone="good" disabled={!!cleared[open.id]} onClick={() => { onClear && onClear(open.id); setOpen(null); }} style={{ flex: 1, padding: 9, fontSize: 13 }}>{cleared[open.id] ? "완료됨" : "✅ 완료"}</PxButton>
                  </div>
                </div>
                <div style={{ flex: "1 1 240px", minWidth: 0, borderLeft: `3px solid ${C.parchEdge}`, paddingLeft: 12 }}>
                  <QuestAssistant questTitle={open.title} />
                </div>
              </div>
              )}
            </Panel>
          </div>
        </div>
      )}
      {formProduct && (
        <ProductForm
          initial={formProduct === "new" ? null : formProduct}
          onSave={saveProduct}
          onDelete={deleteProduct}
          onCancel={() => setFormProduct(null)}
        />
      )}
    </Panel>
  );
}

export { School, SchoolView };
