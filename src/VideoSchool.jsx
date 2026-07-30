import React, { useContext, useState, useEffect, useRef } from "react";
import { C, NetContext, PixelHouse, Hero, Panel, PxButton, TitleBar } from "./LittleJuniorWorld.jsx";
import { dbLoadVSchool, dbSaveVSchool } from "./LittleJuniorWorld.jsx";
import ChatBot from "./ChatBot.jsx";
import { AISelfCheck, polishFeedback, ReviewQueue, QueueButton } from "./AIAssist.jsx";

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
const V_GRADS = [["#ffd6a5", "#ff8fab"], ["#a0e8af", "#57cc99"], ["#a5c8ff", "#7b8cff"], ["#e0b0ff", "#b088ff"], ["#ffe08a", "#ffb347"], ["#b5ead7", "#8fd0a0"]];
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
const V_STATUS = { pending: { bg: "#9a94a6", label: "승인 대기중" }, feedback: { bg: "#ff8fab", label: "피드백 도착" }, approved: { bg: "#4e9a3a", label: "승인 완료" } };
const topicComplete = (t) => t && stDone(t.script) && stDone(t.source) && stDone(t.edit) && t.upload && t.upload.posted;

/* 주제 카드(포스터) */
function PosterCard({ t, children }) {
  const g = t.grad || ["#ddd", "#bbb"];
  return (
    <div style={{ border: `2px solid ${C.ink}`, borderRadius: 10, overflow: "hidden", marginBottom: 10, background: C.white }}>
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
  const base = { fontSize: 10, fontWeight: "bold", color: "#fff", border: `2px solid ${C.ink}`, borderRadius: 8, padding: "1px 7px" };
  if (s === "none") return <span style={{ ...base, background: "#bbb" }}>대기</span>;
  const info = V_STATUS[s];
  return <span style={{ ...base, background: info.bg }}>{info.label}</span>;
}

/* 🎬 영상스쿨 퀘스트 게시판 (집 하나 = 카테고리 하나) */
function VideoBoard({ house, vdata, setVData, saveVData, myName, reward, toast, tier = "high" }) {
  const topics = (vdata && vdata.topics) || [];
  const me = myName || "익명";
  /* 🧑 주인공 입력 */
  const [pAge, setPAge] = useState("");
  const [pGender, setPGender] = useState("");
  const [pSitu, setPSitu] = useState("");
  const [pCore, setPCore] = useState("");
  const [pPers, setPPers] = useState("");
  const [draftText, setDraftText] = useState({});   // 입력 중 텍스트 (topicId별)
  const [showProt, setShowProt] = useState({});      // 🎭 주인공 설정 토글
  const [queueOpen, setQueueOpen] = useState(false); // 🗂 검토 큐

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
      commit(done, (gold || 0) + V_REWARD.bonus, `🎉 「${t.title}」 완주! +${gold || 0}G, 완주 보너스 +${V_REWARD.bonus}G`);
    } else {
      commit(nextTopics, gold, msg);
    }
  };

  const addProtagonist = () => {
    if (!pSitu.trim() && !pCore.trim()) { toast("상황이나 코어를 입력해줘"); return; }
    const poster = makePoster({ age: pAge, gender: pGender, situation: pSitu, core: pCore, personality: pPers });
    const t = emptyTopic(poster, { age: pAge, gender: pGender, situation: pSitu, core: pCore, personality: pPers }, me);
    commit([t, ...topics], 0, "🧑 주제 카드가 생성됐어요");
    setPAge(""); setPGender(""); setPSitu(""); setPCore(""); setPPers("");
  };

  const isReviewer = tier === "high";   // 🔥 숙련된 제작자(파티장)만 승인·피드백 가능
  /* 제출 : 편집은 항상 검토 · 원고/소스는 높은 티어면 자동승인 · 원고는 피드백 1회 후 재제출도 자동승인 */
  const submitStage = (tid, stage, payload) => {
    const cur = (topics.find((x) => x.id === tid) || {})[stage] || {};
    const auto = stage !== "edit" && (tier === "high" || (stage === "script" && cur.hadFeedback));
    const nt = topics.map((t) => t.id === tid ? { ...t, [stage]: { ...t[stage], ...payload, submitted: true, by: me, approved: auto, status: auto ? "approved" : "pending", feedback: "" } } : t);
    withComplete(nt, tid, V_REWARD.submit, auto ? `제출 즉시 승인됐어요 · +${V_REWARD.submit}G` : `제출 완료 · 검토 대기 · +${V_REWARD.submit}G`);
    setDraftText((d) => ({ ...d, [tid + stage]: "" }));
  };
  const approveStage = (tid, stage) => {
    const nt = topics.map((t) => t.id === tid ? { ...t, [stage]: { ...t[stage], approved: true, status: "approved", feedback: "" } } : t);
    withComplete(nt, tid, V_REWARD.approve, `승인 완료 · +${V_REWARD.approve}G`);
  };
  /* 피드백(수정요청) : 원본 내용은 유지 · 스테이지가 다시 열려요 · 원고는 이후 재제출 시 자동승인 */
  const feedbackStage = (tid, stage, msg) => {
    const m = (msg || "").trim(); if (!m) { toast("피드백 내용을 적어주세요"); return; }
    const nt = topics.map((t) => t.id === tid ? { ...t, [stage]: { ...t[stage], approved: false, status: "feedback", feedback: m, feedbackBy: me, hadFeedback: true } } : t);
    commit(nt, 0, "✏️ 피드백을 보냈어요");
    setDraftText((d) => ({ ...d, [tid + stage + "fb"]: "" }));
  };
  const postUpload = (tid, caption, hashtags) => {
    const nt = topics.map((t) => t.id === tid ? { ...t, upload: { posted: true, caption, hashtags, by: me } } : t);
    withComplete(nt, tid, 0, null);
  };

  const inp = { width: "100%", boxSizing: "border-box", padding: 8, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 12.5, background: C.white };

  /* ── 🧑 주인공 만들기 ── */
  if (house.id === "hero") {
    return (
      <div>
        <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 10, lineHeight: 1.7 }}>타겟·상황·코어·성격을 입력하면 <b>원고 작성용 주제 카드</b>가 즉석에서 만들어져요. 승인 없이 <b>무제한</b>으로 추가할 수 있어요.</div>
        <div style={{ background: "#f7f2ff", border: `2px solid ${C.ink}`, borderRadius: 10, padding: 11, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <input value={pAge} onChange={(e) => setPAge(e.target.value)} placeholder="나이 (예: 20대)" style={{ ...inp, flex: 1 }} />
            <input value={pGender} onChange={(e) => setPGender(e.target.value)} placeholder="성별" style={{ ...inp, flex: 1 }} />
          </div>
          <textarea value={pSitu} onChange={(e) => setPSitu(e.target.value)} rows={2} placeholder="구체적 상황·심정 (예: 자취 첫날, 뭘 사야 할지 막막함)" style={{ ...inp, marginBottom: 6, resize: "vertical" }} />
          <input value={pCore} onChange={(e) => setPCore(e.target.value)} placeholder="공략할 코어 (예: 자취 필수템)" style={{ ...inp, marginBottom: 6 }} />
          <input value={pPers} onChange={(e) => setPPers(e.target.value)} placeholder="성격 (예: 귀찮음 많은 게으른 성격)" style={{ ...inp, marginBottom: 8 }} />
          <PxButton tone="good" onClick={addProtagonist} style={{ width: "100%", fontSize: 13, padding: 10 }}>🧑 주제 카드 생성</PxButton>
        </div>
        <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 6 }}>🗂 만들어진 주제 {topics.length}개</div>
        {topics.length === 0 && <div style={{ fontSize: 12, color: C.inkSoft, textAlign: "center", padding: 16 }}>아직 주제가 없어요. 위에서 만들어보세요!</div>}
        {topics.map((t) => (
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

  /* ── 📝 원고 / 🎥 소스 / ✂️ 편집 / 🚀 업로드 게시판 ── */
  const stage = house.id;   // script | source | edit | upload
  const stageLabel = { script: "📝 원고", source: "🎥 소스", edit: "✂️ 편집", upload: "🚀 업로드" }[stage];

  /* 🗂 검토 큐 : 모든 주제의 「승인 대기(pending)」 스테이지를 모아서 스테이지 탭으로 보여줘요 */
  const Q_STAGES = [["script", "📝 원고"], ["source", "🎥 소스"], ["edit", "✂️ 편집"]];
  const queueItems = [];
  topics.forEach((t) => Q_STAGES.forEach(([sid]) => {
    const s = t[sid] || {};
    if (s.submitted && !s.approved && s.status !== "feedback") {
      queueItems.push({ id: t.id + "_" + sid, tab: sid, tid: t.id, stage: sid, title: t.title, content: s.text || s.link, by: s.by });
    }
  }));
  const queueTabs = Q_STAGES.map(([sid, lb]) => ({ id: sid, label: lb, count: queueItems.filter((i) => i.tab === sid).length }));

  return (
    <div>
      {isReviewer && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <QueueButton count={queueItems.length} onClick={() => setQueueOpen(true)} label="🗂 검토 큐" />
        </div>
      )}
      {queueOpen && (
        <ReviewQueue
          title="🗂 영상 검토 큐"
          tabs={queueTabs}
          items={queueItems}
          onApprove={(it) => approveStage(it.tid, it.stage)}
          onFeedback={(it, msg) => feedbackStage(it.tid, it.stage, msg)}
          onClose={() => setQueueOpen(false)}
        />
      )}
      <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 10, lineHeight: 1.7 }}>
        {stage === "script" && `주제 하나를 골라 ${V_SPEC.length} 원고를 써요. 아무 주제나 바로 시작할 수 있어요.`}
        {stage === "source" && "그 상황에 맞는 영상 소스를 파일/드라이브 링크로 제출해요. 원고를 기다릴 필요 없어요."}
        {stage === "edit" && "원고+소스가 모두 승인된 주제만 편집을 시작할 수 있어요."}
        {stage === "upload" && "편집이 승인된 주제에 캡션+해시태그를 달아 게시해요."}
      </div>
      {topics.length === 0 && <div style={{ fontSize: 12, color: C.inkSoft, textAlign: "center", padding: 20 }}>주제가 없어요. 🧑 주인공 만들기에서 먼저 만들어주세요!</div>}
      {topics.map((t) => {
        const st = t[stage] || {};
        const editLocked = stage === "edit" && !(stDone(t.script) && stDone(t.source));
        const upLocked = stage === "upload" && !stDone(t.edit);
        const key = t.id + stage;
        const status = stStatus(st);
        const curVal = draftText[key] != null ? draftText[key] : (st.text || st.link || "");
        return (
          <PosterCard key={t.id} t={t}>
            {/* 🎭 주인공 설정 토글 */}
            {t.protagonist && (
              <div style={{ marginBottom: 8 }}>
                <button type="button" onClick={() => setShowProt((s) => ({ ...s, [t.id]: !s[t.id] }))} style={{ cursor: "pointer", fontFamily: "'DotGothic16', monospace", fontSize: 11, background: "none", border: "none", color: "#8e5a9e", fontWeight: "bold" }}>🎭 주인공 설정 {showProt[t.id] ? "▲" : "▼"}</button>
                {showProt[t.id] && (
                  <div style={{ background: "#f7f2ff", border: `2px solid ${C.parchEdge}`, borderRadius: 6, padding: 8, fontSize: 11, lineHeight: 1.7, marginTop: 4 }}>
                    나이 {t.protagonist.age || "-"} · 성별 {t.protagonist.gender || "-"}<br />상황: {t.protagonist.situation || "-"}<br />코어: {t.protagonist.core || "-"}<br />성격: {t.protagonist.personality || "-"}
                  </div>
                )}
              </div>
            )}

            {/* 업로드 스테이지 */}
            {stage === "upload" ? (
              upLocked ? (
                <div style={{ fontSize: 11.5, color: C.inkSoft, background: "#f4f2ea", border: `2px solid ${C.parchEdge}`, borderRadius: 6, padding: 8 }}>🔒 편집 승인 후 업로드할 수 있어요</div>
              ) : t.upload.posted ? (
                <div>
                  <StageBadge st={{ approved: true }} />
                  <div style={{ fontSize: 12, marginTop: 6, whiteSpace: "pre-wrap" }}>📝 {t.upload.caption}</div>
                  <div style={{ fontSize: 11, color: "#8e5a9e", marginTop: 3 }}>{t.upload.hashtags}</div>
                  <div style={{ fontSize: 10, color: C.inkSoft, marginTop: 3 }}>게시: {t.upload.by}</div>
                </div>
              ) : (
                <div>
                  <textarea value={draftText[key] || ""} onChange={(e) => setDraftText((d) => ({ ...d, [key]: e.target.value }))} rows={2} placeholder="캡션" style={{ ...inp, marginBottom: 6, resize: "vertical" }} />
                  <input value={draftText[key + "h"] || ""} onChange={(e) => setDraftText((d) => ({ ...d, [key + "h"]: e.target.value }))} placeholder="#해시태그 #모아서" style={{ ...inp, marginBottom: 6 }} />
                  <PxButton tone="gold" onClick={() => postUpload(t.id, (draftText[key] || "").trim(), (draftText[key + "h"] || "").trim())} style={{ width: "100%", fontSize: 12, padding: 9 }}>🚀 게시하기</PxButton>
                </div>
              )
            ) : editLocked ? (
              <div style={{ fontSize: 11.5, color: C.inkSoft, background: "#f4f2ea", border: `2px solid ${C.parchEdge}`, borderRadius: 6, padding: 8 }}>🔒 원고·소스가 모두 승인되면 편집을 시작할 수 있어요</div>
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: "bold", flex: 1 }}>{stageLabel}</span>
                  <StageBadge st={st} />
                </div>

                {(status === "none" || status === "feedback") ? (
                  /* 입력 가능 : 최초 제출 · 또는 피드백 받고 수정 후 재제출 (원본 내용 유지) */
                  <div>
                    {status === "feedback" && (
                      <div style={{ background: "#ffe6ee", border: "2px solid #ff8fab", borderRadius: 6, padding: 8, fontSize: 11.5, lineHeight: 1.6, marginBottom: 6, color: "#a83a5b" }}>
                        ✏️ 피드백{st.feedbackBy ? ` · ${st.feedbackBy}` : ""}<br /><span style={{ color: C.ink, whiteSpace: "pre-wrap" }}>{st.feedback}</span>
                      </div>
                    )}
                    <textarea value={curVal} onChange={(e) => setDraftText((d) => ({ ...d, [key]: e.target.value }))} rows={stage === "script" ? 3 : 2}
                      placeholder={stage === "script" ? `${V_SPEC.length} 원고를 써주세요` : "파일 설명 + 구글드라이브/업로드 링크"} style={{ ...inp, marginBottom: 6, resize: "vertical" }} />
                    {stage === "script" && <AISelfCheck text={curVal} />}
                    <PxButton tone="good" onClick={() => submitStage(t.id, stage, stage === "script" ? { text: curVal.trim() } : { link: curVal.trim() })} style={{ width: "100%", fontSize: 12, padding: 9 }}>
                      {status === "feedback" ? "🔁 수정 후 제출하기" : `제출하기 (+${V_REWARD.submit}G)`}
                    </PxButton>
                  </div>
                ) : (
                  /* 승인대기중 · 승인완료 : 입력 잠금 · 내용은 계속 보여요 */
                  <div>
                    <div style={{ background: "#f4f2ea", border: `2px solid ${C.parchEdge}`, borderRadius: 6, padding: 8, fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.6 }}>{st.text || st.link}</div>
                    <div style={{ fontSize: 10, color: C.inkSoft, margin: "4px 0 6px" }}>제출: {st.by}</div>
                    {status === "pending" && (
                      isReviewer ? (
                        <div>
                          <textarea value={draftText[key + "fb"] || ""} onChange={(e) => setDraftText((d) => ({ ...d, [key + "fb"]: e.target.value }))} rows={2}
                            placeholder="✏️ 수정요청(피드백) 내용 — 적고 「피드백」을 누르면 작성자에게 돌아가요" style={{ ...inp, marginBottom: 6, resize: "vertical" }} />
                          <div style={{ display: "flex", gap: 6 }}>
                            <PxButton tone="wood" onClick={() => setDraftText((d) => ({ ...d, [key + "fb"]: polishFeedback(d[key + "fb"] || "") }))} title="짧게 적어도 AI가 부드럽고 구체적으로 다듬어줘요" style={{ flexShrink: 0, fontSize: 12, padding: 9 }}>✨ 다듬기</PxButton>
                            <PxButton tone="good" onClick={() => approveStage(t.id, stage)} style={{ flex: 1, fontSize: 12, padding: 9 }}>✅ 승인 (+{V_REWARD.approve}G)</PxButton>
                            <PxButton tone="danger" onClick={() => feedbackStage(t.id, stage, draftText[key + "fb"] || "")} style={{ flex: 1, fontSize: 12, padding: 9 }}>✏️ 피드백</PxButton>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: C.inkSoft, background: "#f0eee6", border: `2px solid ${C.parchEdge}`, borderRadius: 6, padding: 8, textAlign: "center" }}>🕓 파티장(🔥 숙련된 제작자)의 검토를 기다리는 중이에요</div>
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </PosterCard>
        );
      })}
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
  const [vdata, setVData] = useState({ topics: [] });   // 🎬 영상스쿨 주제·제출·승인 (서버 공유)
  const [vToast, setVToast] = useState("");
  const vToastFn = (m) => { setVToast(m); setTimeout(() => setVToast(""), 2800); };
  const saveVData = (next) => { dbSaveVSchool(next); };
  useEffect(() => {
    if (school !== "videoschool") return;
    const load = () => dbLoadVSchool().then((d) => { if (d && Array.isArray(d.topics)) setVData(d); }).catch(() => {});
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [school]);
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
      {chatOpen && <ChatBot onClose={() => setChatOpen(false)} />}
      {vToast && <div style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 120, background: C.ink, color: "#ffe680", border: `2px solid ${C.gem}`, borderRadius: 20, padding: "9px 18px", fontSize: 13, fontFamily: "'DotGothic16', monospace", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>{vToast}</div>}
      <TitleBar tipId={school} icon={s.icon} title={s.title} sub="WASD 이동 · 집 근처에서 E · 아무 집이나 자유롭게" onBack={onBack} bg={s.color} fg={C.white}
        right={<PxButton tone="good" onClick={() => setChatOpen(true)} style={{ fontSize: 11, padding: "5px 10px" }}>🐣 코코</PxButton>} />
      <div style={{ padding: 12, background: C.parch }}>
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
                  <VideoBoard house={open} vdata={vdata} setVData={setVData} saveVData={saveVData} myName={myName} reward={onReward} toast={vToastFn} tier={tier} />
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
    </Panel>
  );
}

export { School, SchoolView };
