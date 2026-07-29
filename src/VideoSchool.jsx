import React, { useContext, useState, useEffect, useRef } from "react";
import { C, NetContext, PixelHouse, Hero, Panel, PxButton, TitleBar } from "./LittleJuniorWorld.jsx";
import ChatBot from "./ChatBot.jsx";

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
      { id: "v1", title: "제품 소개", cat: "기획", roof: "#e4a04f", wall: "#fff3e0",
        story: "좋은 제품 영상은 '기능 나열'이 아니라 '이걸 쓰면 내 삶이 어떻게 좋아지는지'를 보여준다.",
        sections: [
          { icon: "🎯", label: "핵심 메시지", text: "이 제품이 해결하는 '단 하나의 문제'를 한 문장으로 정한다." },
          { icon: "✨", label: "구성 포인트", text: "문제 공감 → 제품 등장 → 사용 장면 → 전후 비교 → 한 줄 정리" },
          { icon: "📝", label: "정리 프롬프트", text: "이 제품의 매력 포인트 3가지를 초보자도 이해되게 짧게 정리해줘." },
        ] },
      { id: "v2", title: "가이드라인 작성", cat: "기획", roof: "#7fbfe0", wall: "#eaf6ff",
        story: "가이드라인이 있으면 누가 만들어도 톤이 흔들리지 않는다. 브랜드의 '기준표'를 만드는 단계.",
        sections: [
          { icon: "📐", label: "정할 것", text: "톤앤매너 / 자막 스타일 / 색·폰트 / 인트로·아웃트로 규칙" },
          { icon: "🧩", label: "작성 틀", text: "① 해도 되는 것 ② 하면 안 되는 것 ③ 예시 이미지·영상" },
          { icon: "📝", label: "정리 프롬프트", text: "우리 채널의 영상 가이드라인 초안을 항목별로 만들어줘. 주제: [입력]" },
        ] },
      { id: "v3", title: "레퍼런스 전달", cat: "리서치", roof: "#e07b8a", wall: "#ffeef0",
        story: "레퍼런스는 '느낌'이 아니라 '구조'로 전달해야 한다. 왜 좋은지까지 적어줘야 팀이 재현한다.",
        sections: [
          { icon: "🔍", label: "고르는 기준", text: "끝까지 본 비율이 좋아 보이는 영상, 우리 주제와 겹치는 영상 위주." },
          { icon: "🗂", label: "전달 양식", text: "링크 + 왜 좋은지 3줄 + 우리에게 적용할 포인트 1줄" },
          { icon: "📝", label: "정리 프롬프트", text: "이 레퍼런스 영상의 잘된 점과 우리에게 적용할 포인트를 정리해줘." },
        ] },
      { id: "v4", title: "원고 작성", cat: "기획", roof: "#8fd0a0", wall: "#eefaf0",
        story: "원고는 기억이 아니라 기록에서 나온다. 후크가 3초 안에 꽂혀야 끝까지 본다.",
        sections: [
          { icon: "✍️", label: "대본 구조", text: "후크 → 문제 제기 → 사례 → 해결 → 한 줄 정리" },
          { icon: "⏱", label: "체크", text: "첫 문장이 3초 안에 궁금증을 만드는가? 문장은 짧은가?" },
          { icon: "📝", label: "원고 프롬프트", text: "아래 주제로 60초 숏폼 대본을 써줘. 후크는 3초 안에, 문장은 짧게. 주제: [입력]" },
        ] },
      { id: "v5", title: "영상소스찾기", cat: "리서치", roof: "#b48fd9", wall: "#f3ecff",
        story: "필요한 컷을 미리 정리해두면 편집 시간이 반으로 준다. B롤·효과음·음악을 목록으로 모은다.",
        sections: [
          { icon: "🎞", label: "모을 소스", text: "B롤 영상 / 효과음 / 배경음악 / 폰트·자막 템플릿" },
          { icon: "📁", label: "정리법", text: "장면별 폴더로 나누고, 저작권(무료/출처표기) 여부를 함께 적는다." },
          { icon: "📝", label: "정리 프롬프트", text: "이 주제 영상에 어울리는 B롤·효과음 아이디어를 장면별로 제안해줘." },
        ] },
      { id: "v6", title: "영상편집", cat: "실행", roof: "#e0b04f", wall: "#fff6da",
        story: "편집은 '빼는 기술'이다. 지루한 1초를 자르는 감각이 완성도를 만든다.",
        sections: [
          { icon: "✂️", label: "편집 순서", text: "컷 편집(군더더기 제거) → 자막 → 효과음·음악 → 색보정 → 검수" },
          { icon: "🎚", label: "리듬 팁", text: "말이 끊기는 지점, 늘어지는 지점을 먼저 자른다. 후크는 특히 빠르게." },
          { icon: "📝", label: "정리 프롬프트", text: "이 영상에서 늘어질 수 있는 구간과 컷 편집 포인트를 짚어줘." },
        ] },
      { id: "v7", title: "업로드", cat: "실행", boss: true, roof: "#d9a441", wall: "#fff6da",
        story: "업로드는 끝이 아니라 시작이다. 제목·썸네일·설명이 조회수의 문을 연다.",
        sections: [
          { icon: "👑", label: "미션", text: "기획 → 가이드라인 → 레퍼런스 → 원고 → 소스 → 편집 → 업로드까지 완주한 영상 1편" },
          { icon: "🖼", label: "발행 체크", text: "제목(키워드 앞쪽) / 썸네일(3초 안에 읽힘) / 설명·태그 / 공개 시간" },
          { icon: "📝", label: "피드백 프롬프트", text: "이 영상의 제목·썸네일 문구를 클릭하고 싶게 3가지 버전으로 제안해줘." },
        ] },
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
function SchoolView({ school, onBack, cleared = {}, onClear }) {
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
          const idx = housesRef.current.findIndex((x) => x.id === n);
          const locked = idx > 0 && !clearedRef.current[housesRef.current[idx - 1].id];
          if (h && !locked) setOpen(h);
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
      <TitleBar tipId={school} icon={s.icon} title={s.title} sub="WASD 이동 · 집 근처에서 E · 👑은 보스급, 🔒은 잠긴 퀘스트" onBack={onBack} bg={s.color} fg={C.white}
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
            const locked = i > 0 && !cleared[houses[i - 1].id];
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
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 320px", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, border: `2px solid ${C.ink}`, background: C.white, padding: "1px 6px" }}>퀘스트 {houses.findIndex((h) => h.id === open.id) + 1}</span>
                    {open.cat && <span style={{ fontSize: 10, border: `2px solid ${C.ink}`, background: C.white, padding: "1px 6px" }}>{open.cat}</span>}
                    {cleared[open.id] && <span style={{ fontSize: 10, border: `2px solid ${C.ink}`, background: C.good, color: C.white, padding: "1px 6px" }}>완료</span>}
                    {open.boss && <span style={{ fontSize: 10, border: `2px solid ${C.ink}`, background: "#d9a441", padding: "1px 6px" }}>👑 보스</span>}
                  </div>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, marginBottom: 8 }}>{open.title}</div>
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
            </Panel>
          </div>
        </div>
      )}
    </Panel>
  );
}

export { School, SchoolView };
