import React, { useContext, useState, useEffect, useRef } from "react";
import { C, NetContext, PixelHouse, Hero, Panel, PxButton, TitleBar } from "./LittleJuniorWorld.jsx";

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
      { id: "v1", title: "코어 개념", cat: "기초", roof: "#e4a04f", wall: "#fff3e0",
        story: "영상은 '무엇을 보여주느냐'보다 '어떻게 보여주느냐'로 갈린다. 이 퀘스트는 구도·컷·리듬이라는 기본 근육을 만드는 단계다.",
        sections: [
          { icon: "🎬", label: "영상 후크", text: "다들 좋은 카메라부터 사는데... 사실 조회수를 가르는 건 첫 3초 구도였다." },
          { icon: "🧠", label: "학습 체크", text: "1) 삼분할 구도로 5컷 찍기\n2) 같은 장면을 컷 길이만 바꿔 2버전 만들기\n3) 어떤 게 덜 지루한지 비교" },
          { icon: "📝", label: "정리 프롬프트", text: "다음 영상의 구도와 컷 리듬을 초보자에게 설명하듯 3줄로 정리해줘." },
        ] },
      { id: "v2", title: "레퍼런스", cat: "리서치", roof: "#7fbfe0", wall: "#eaf6ff",
        story: "잘 만드는 사람은 잘 훔친다. 다만 '느낌'이 아니라 '구조'를 가져와야 내 것이 된다.",
        sections: [
          { icon: "🔍", label: "찾기 기준", text: "조회수보다 '끝까지 본 비율'이 좋아 보이는 영상 5개를 고른다." },
          { icon: "🧩", label: "분석 프레임", text: "후크(0~3초) / 전개 / 반전 / 마무리 — 네 칸으로 쪼개서 적는다." },
          { icon: "📝", label: "분석 프롬프트", text: "이 영상의 후크가 왜 효과적인지 3가지 이유로 분석해줘. 내 주제에 적용할 버전도 제안해줘." },
        ] },
      { id: "v3", title: "원고작성 & 소재수집", cat: "기획", roof: "#e07b8a", wall: "#ffeef0",
        story: "소재가 없는 게 아니라, 소재를 적어두지 않았을 뿐이다. 원고는 기억이 아니라 기록에서 나온다.",
        sections: [
          { icon: "🎬", label: "영상 후크", text: "매번 소재가 없다고 했는데, 알고 보니 메모를 안 했을 뿐이었다." },
          { icon: "✍️", label: "대본 구조", text: "후크 → 문제 제기 → 사례 → 해결 → 한 줄 정리" },
          { icon: "📝", label: "원고 프롬프트", text: "아래 주제로 60초 숏폼 대본을 써줘. 후크는 3초 안에 끝나고, 문장은 짧게. 주제: [여기 입력]" },
        ] },
      { id: "v4", title: "영상제작", cat: "실행", roof: "#8fd0a0", wall: "#eefaf0",
        story: "촬영은 준비의 결과다. 세팅표 하나면 촬영 시간이 절반으로 줄어든다.",
        sections: [
          { icon: "🎥", label: "촬영 세팅", text: "고정 앵글 / 조명 방향 / 오디오 거리 — 이 3개만 매번 같게 유지" },
          { icon: "✂️", label: "편집 흐름", text: "컷 정리 → 자막 → 사운드 → 색보정 → 마지막에 후크 다시 손보기" },
          { icon: "📝", label: "자막 프롬프트", text: "이 대본을 숏폼 자막용으로 끊어줘. 한 줄 12자 이내, 리듬감 있게." },
        ] },
      { id: "v5", title: "최종 과제", cat: "보스", boss: true, roof: "#d9a441", wall: "#fff6da",
        story: "배운 걸 전부 한 편에 담는다. 완벽한 한 편보다, 끝까지 낸 한 편이 이긴다.",
        sections: [
          { icon: "👑", label: "미션", text: "기획 → 대본 → 촬영 → 편집 → 업로드까지 완주한 영상 1편" },
          { icon: "📋", label: "제출 항목", text: "1) 기획 한 줄\n2) 대본\n3) 완성 영상 링크" },
          { icon: "📝", label: "피드백 프롬프트", text: "이 영상의 후크·전개·마무리를 각각 점수와 개선점으로 평가해줘." },
        ] },
    ],
  },
};
const SCHOOL_HOUSE_POS = [
  { x: 120, y: 110 }, { x: 320, y: 110 }, { x: 520, y: 110 },
  { x: 170, y: 300 }, { x: 430, y: 300 },
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
  const meNet = (useContext(NetContext) || {}).me || {};
  const s = SCHOOLS[school];
  const MAP_W = 640, MAP_H = 420;
  const [pos, setPos] = useState({ x: MAP_W / 2, y: MAP_H - 50 });
  const [facing, setFacing] = useState(1);
  const [moving, setMoving] = useState(false);
  const [near, setNear] = useState(null);
  const [open, setOpen] = useState(null);
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
      <TitleBar tipId={school} icon={s.icon} title={s.title} sub="WASD 이동 · 집 근처에서 E · 👑은 보스급, 🔒은 잠긴 퀘스트" onBack={onBack} bg={s.color} fg={C.white} />
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
