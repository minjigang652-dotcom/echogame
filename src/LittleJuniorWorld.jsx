import React, { useEffect, useRef, useState, useMemo, useCallback, createContext, useContext } from "react";

const NetContext = createContext({ others: {}, view: "world", room: null, roomPosRef: null });

/* 입력창(input/textarea/select)에 타이핑 중이면 게임 키 조작을 무시 */
function isTyping(e) {
  const t = e && e.target;
  if (!t) return false;
  const tag = (t.tagName || "").toUpperCase();
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable === true;
}

/* 채팅창 자동 스크롤 — 컨테이너에 ref를 걸면 새 메시지마다 맨 아래로 내려갑니다.
   scrollIntoView 대신 scrollTop을 써서 페이지 전체가 튀지 않아요. */
function useAutoScroll(dep) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    // 이미지/폰트가 뒤늦게 로드돼 높이가 바뀌는 경우 대비
    const t = setTimeout(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, 60);
    return () => clearTimeout(t);
  }, [dep]);
  return ref;
}

/* =============================================================================
   작은 주니어 네이버 : 오픈월드 에디션 (프로토타입)
   - 스타듀밸리풍 16비트 도트. 카메라가 캐릭터를 따라 움직이는 마을.
   - 마을 중심 = 주민센터(별장/독채). 그 주변에 대형건물/집/소형건물/은행/게시판.
   - 강 너머엔 치앙마이(렌트 하우스).
   - 각 건물·집·방은 별도 내부 화면. 주민센터/집/방 내부에서도 캐릭터로 이동.
   ---------------------------------------------------------------------------
   ⚠️ 모든 화폐/환전/렌트/통화 UI는 시뮬레이션이며 실제 거래·통신이 아닙니다.
   ⚠️ 채팅·회의 참가자는 단일 유저 데모용 목업(가짜 NPC)입니다.
============================================================================= */

/* -------------------------- 팔레트 --------------------------- */
const C = {
  ink: "#2a1e14", inkSoft: "#4a382a",
  grass: "#6ab04c", grassDark: "#57a03d", grassShadow: "#3f7d2c",
  path: "#c9a25f", pathDark: "#a9814a",
  parch: "#f3e2bd", parchLine: "#e6ce9a", parchEdge: "#c39a54",
  wood: "#8b5a2b", woodDark: "#6b4423",
  gem: "#ffcb2b", gemGlow: "#ffe680",
  bankRoof: "#3a8fb7", bankRoofDk: "#2b6c8f",
  water: "#4bb4d8", waterDk: "#2e8fb3",
  white: "#fff7e6", danger: "#c0563a", good: "#4e9a3a",
  villa: "#7bbf8f", villaDk: "#5a9a6d",
};

const GEM_TO_WON = 10000;
/* 화면 하단에 표시되는 빌드 버전 — 배포된 파일이 최신인지 바로 확인할 수 있어요 */
const APP_VERSION = "v38 · 2026-07-24";

/* -------------------------- 데이터 --------------------------- */
// 대형건물: 퀘스트 보유. 반복(업무) 퀘스트는 하루 1회, 다음 날 초기화.
const BIG_BUILDINGS = [
  { id: "cs", name: "CS", icon: "🛠", color: "#7a8b99", colorDk: "#5c6b78",
    quests: [
      { id: "cs1", title: "채널톡 답변", desc: "답변답변", reward: 12, duration: 1400, repeat: true },
      { id: "cs2", title: "카페24 게시판 답변", desc: "24~~", reward: 17, duration: 2000, repeat: true },
      { id: "cs3", title: "취소접수건 취소처리", desc: "취소취소", reward: 60, duration: 3000, repeat: false },
    ] },
];


/* owner = 이 집의 주인 이름. 접속 이름이 owner 와 같으면 내 집이 됩니다 */
const HOUSES = [
  { id: "h1", name: "정인이네", owner: "정인", roof: "#c0563a", roofDk: "#9c4028", wall: "#e9c98f" },
  { id: "h2", name: "창민이네", owner: "창민", roof: "#3fa07a", roofDk: "#2f7d5e", wall: "#d9e6c7" },
  { id: "h3", name: "도희네", owner: "도희", roof: "#8e5a9e", roofDk: "#6f4480", wall: "#e7cfe9" },
  { id: "h4", name: "유리네", owner: "유리", roof: "#d9a441", roofDk: "#b7842c", wall: "#f1e2b0" },
  { id: "h5", name: "민지네", owner: "민지", roof: "#5b8def", roofDk: "#3f6bc4", wall: "#d3e0f7" },
  { id: "h6", name: "희정이네", owner: "희정", roof: "#d76b96", roofDk: "#b24d78", wall: "#f6d8e5" },
  { id: "h7", name: "의준이네", owner: "의준", roof: "#4bb4d8", roofDk: "#2e8fb3", wall: "#cdeaf4" },
  { id: "h8", name: "호종이네", owner: "호종", roof: "#9a7b4f", roofDk: "#7a5f38", wall: "#ecdcc0" },
  { id: "h9", name: "슬이네", owner: "슬이", roof: "#7bbf8f", roofDk: "#4f8f66", wall: "#dff0e2" },
  { id: "h10", name: "상하네", owner: "상하", roof: "#e08a5a", roofDk: "#b96a3e", wall: "#f7ddc9" },
];
/* 이 집의 주인으로 인정하는 이름들.
   「슬이네」는 슬이·슬 둘 다, 「정인이네」는 정인·정인이 둘 다 주인으로 봅니다. */
function houseOwnerNames(h) {
  const out = new Set();
  const add = (v) => { if (v && v.trim()) out.add(v.trim()); };
  if (h.owner) { add(h.owner); add(h.owner.replace(/이$/, "")); }
  const n = h.name || "";
  if (/이네$/.test(n)) { add(n.slice(0, -2)); add(n.slice(0, -1)); }   // 「정인이네」 → 정인 · 정인이
  else if (/네$/.test(n)) { add(n.slice(0, -1)); }                     // 「상하네」 → 상하
  return [...out];
}

/* 선물 종류별로 할 수 있는 행동이 달라요.
   carry(들고다니기) · home(집에 두기) · eat(먹기) · fridge(냉장고 보관) */
const SHOP_ITEMS = [
  { id: "letter", name: "편지지", emoji: "✉️", price: 2, acts: ["carry", "home"] },
  { id: "cake", name: "케이크", emoji: "🍰", price: 5, acts: ["carry", "eat", "fridge"] },
  { id: "flower", name: "꽃다발", emoji: "💐", price: 4, acts: ["carry", "home"] },
  { id: "coffee", name: "커피 기프티콘", emoji: "☕", price: 3, acts: ["carry", "eat", "fridge"] },
  { id: "choco", name: "초콜릿", emoji: "🍫", price: 2, acts: ["carry", "eat", "fridge"] },
  { id: "candle", name: "향초", emoji: "🕯️", price: 3, acts: ["carry", "home"] },
];
/* 예전에 받은 선물(acts 없음)은 종류로 추론해요 */
const FOOD_IDS = ["cake", "coffee", "choco"];
function itemActs(it) {
  if (!it) return ["carry"];
  if (it.acts) return it.acts;
  return FOOD_IDS.includes(it.id) ? ["carry", "eat", "fridge"] : ["carry", "home"];
}
const ACT_META = {
  carry: { label: "🙌 들고다니기", tone: "gold" },
  home: { label: "🏠 집에 두기", tone: "good" },
  eat: { label: "😋 먹기", tone: "danger" },
  fridge: { label: "🧊 냉장고 보관", tone: "blue" },
};

const RENT_HOUSES = [
  { id: "r1", name: "치앙마이 A동", rent: 30, roof: "#e0a13d", roofDk: "#bd8226", wall: "#f1e2b0" },
  { id: "r2", name: "치앙마이 B동", rent: 45, roof: "#3fa07a", roofDk: "#2f7d5e", wall: "#d9e6c7" },
  { id: "r3", name: "치앙마이 C동", rent: 60, roof: "#5b8def", roofDk: "#3f6bc4", wall: "#d3e0f7" },
  { id: "r4", name: "치앙마이 리버뷰", rent: 90, roof: "#d76b96", roofDk: "#b24d78", wall: "#f6d8e5" },
];

const ANNOUNCEMENTS = [
  { id: "a1", type: "이벤트", title: "에코타운 사전예약자 공지", date: "2026-07-10", body: "에코타운 사전예약에 참여해주신 모든 분들께 감사드립니다! 사전예약자에게는 오픈 첫날 스타 젬 100개와 한정 스킨이 지급됩니다. 입주 일정과 웰컴 혜택은 순차적으로 안내드릴 예정이니 조금만 기다려주세요 🌱" },
  { id: "a2", type: "이벤트", title: "치앙마이 한 달 살기 신청", date: "2026-07-12", body: "강 건너 치앙마이 하우스 렌트 신청을 받습니다. 렌트비는 스타 젬으로 결제되며, 리버뷰 동은 조기 마감될 수 있습니다." },
  { id: "a3", type: "공지", title: "감사의 방 리뉴얼", date: "2026-07-18", body: "감사의 방 선반에 신규 상품(향초, 꽃다발)이 입고되었습니다. 감사 칠판에 포스트잇도 자유롭게 붙여주세요." },
  { id: "a4", type: "공지", title: "에코타운 입주준비중", date: "2026-07-20", body: "현재 에코타운은 막바지 입주 준비 중입니다. 마을 곳곳의 건물과 편의시설을 정비하고 있어요. 더 편안하고 즐거운 마을에서 만나뵐 수 있도록 열심히 꾸미는 중이니, 곧 활짝 열릴 에코타운을 기대해주세요! 🏡✨" },
  { id: "a5", type: "공지", title: "월말 결산 & 정산 안내", date: "2026-07-28", body: "7월 31일 월말 결산이 있습니다. 중앙은행에서 보유 젬을 확인하고 정산(환전)을 진행해 주세요." },
];

const CAL_EVENTS = {
  "2026-07-10": ["10:00 전체 회의"],
  "2026-07-15": ["14:00 이날은뭐였지?"],
  "2026-07-22": ["11:00 에코타운 구경해보세요"],
  "2026-07-31": ["7시 롯데호텔 라세느"],
};

/* ======================= 스프라이트 ======================= */
function Villa({ size = 220 }) {
  return (
    <svg width={size} height={size * 1.05} viewBox="0 0 60 63" style={{ overflow: "visible", imageRendering: "pixelated" }}>
      <g transform="translate(0,19)" shapeRendering="crispEdges">
        <rect x="4" y="16" width="52" height="24" fill={C.parch} stroke={C.ink} strokeWidth="1" />
        <polygon points="30,2 58,16 2,16" fill={C.villa} />
        <polygon points="30,2 58,16 52,16 30,6 8,16 2,16" fill={C.villaDk} />
        <polygon points="30,2 58,16 2,16" fill="none" stroke={C.ink} strokeWidth="1" />
        {[8, 18, 42, 52].map((x) => <rect key={x} x={x} y="19" width="4" height="18" fill={C.white} stroke={C.ink} strokeWidth="0.4" />)}
        <rect x="26" y="24" width="8" height="16" fill={C.woodDark} stroke={C.ink} strokeWidth="0.5" />
        <rect x="32" y="31" width="1" height="1" fill={C.gem} />
        <rect x="12" y="22" width="6" height="6" fill={C.water} stroke={C.ink} strokeWidth="0.5" />
        <rect x="42" y="22" width="6" height="6" fill={C.water} stroke={C.ink} strokeWidth="0.5" />
        <rect x="4" y="38" width="52" height="2" fill={C.parchEdge} />
      </g>

      {/* 🟢 길고 큰 ECHO 초록 깃발 */}
      <g>
        <rect x="29.2" y="-1" width="1.6" height="23" fill="#5a4632" stroke={C.ink} strokeWidth="0.4" />
        <circle cx="30" cy="-2" r="1.7" fill={C.gem} stroke={C.ink} strokeWidth="0.5" />
        <g className="echo-flag" style={{ transformOrigin: "30px 1px" }}>
          <path d="M30.8 0 h24 v15 h-24 z" fill="#2f9e6e" stroke={C.ink} strokeWidth="0.8" />
          <path d="M30.8 0 h24 v3.6 h-24 z" fill="#3fa07a" />
          <text x="42.8" y="10.4" textAnchor="middle" fill={C.white} stroke="none"
            style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "6.6px", fontWeight: "bold" }}>ECHO</text>
        </g>
      </g>

      {/* 🔴 펄럭이는 빨간 삼각 깃발 */}
      <g>
        <rect x="10.4" y="9" width="1.2" height="14" fill="#5a4632" stroke={C.ink} strokeWidth="0.35" />
        <circle cx="11" cy="8.2" r="1.2" fill={C.gem} stroke={C.ink} strokeWidth="0.4" />
        <g className="red-flag" style={{ transformOrigin: "11px 10px" }}>
          <path d="M11.5 9.6 L21 12.6 L11.5 15.6 Z" fill="#c0563a" stroke={C.ink} strokeWidth="0.7" strokeLinejoin="round" />
        </g>
      </g>
    </svg>
  );
}

/* 야자수 (치앙마이) */
function PalmTree({ size = 62 }) {
  return (
    <svg width={size} height={size * 1.5} viewBox="0 0 24 36" style={{ overflow: "visible" }}>
      <ellipse cx="12" cy="34.5" rx="7" ry="1.6" fill="rgba(0,0,0,0.16)" />
      <path d="M11 34 q-1.5 -12 2 -20" stroke={C.woodDark} strokeWidth="3.4" fill="none" strokeLinecap="round" />
      {[0, 1, 2, 3].map((i) => <rect key={i} x={10 + i * 0.45} y={30 - i * 5} width="3.6" height="0.9" fill={C.ink} opacity="0.3" />)}
      <g className="palm-sway" style={{ transformOrigin: "13px 14px" }}>
        <path d="M13 14 q-10 -3 -12 4 q5 -4 12 -2 z" fill="#2f9e6e" stroke={C.ink} strokeWidth="0.6" />
        <path d="M13 14 q10 -3 12 4 q-5 -4 -12 -2 z" fill="#3fa07a" stroke={C.ink} strokeWidth="0.6" />
        <path d="M13 14 q-9 -8 -5 -13 q1 7 6 12 z" fill="#3fa07a" stroke={C.ink} strokeWidth="0.6" />
        <path d="M13 14 q9 -8 5 -13 q-1 7 -6 12 z" fill="#2f9e6e" stroke={C.ink} strokeWidth="0.6" />
        <path d="M13 14 q-7 3 -7 9 q4 -6 8 -7 z" fill="#1d6b4a" stroke={C.ink} strokeWidth="0.6" />
        <path d="M13 14 q7 3 7 9 q-4 -6 -8 -7 z" fill="#1d6b4a" stroke={C.ink} strokeWidth="0.6" />
        <circle cx="11.4" cy="15.2" r="1.3" fill="#a86e13" stroke={C.ink} strokeWidth="0.4" />
        <circle cx="14.4" cy="15.8" r="1.3" fill="#c98a1a" stroke={C.ink} strokeWidth="0.4" />
      </g>
    </svg>
  );
}

function BigBuilding({ color, colorDk, size = 150 }) {
  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 40 44" shapeRendering="crispEdges" style={{ imageRendering: "pixelated" }}>
      <rect x="4" y="6" width="32" height="34" fill={color} stroke={C.ink} strokeWidth="1" />
      <rect x="4" y="6" width="32" height="4" fill={colorDk} />
      {/* 창문 격자 */}
      {[11, 18, 25, 32].map((y) => [8, 16, 24].map((x) => (
        <rect key={x + "-" + y} x={x} y={y} width="5" height="4" fill={C.water} stroke={C.ink} strokeWidth="0.4" />
      )))}
      {/* 문 */}
      <rect x="15" y="32" width="10" height="8" fill={C.woodDark} stroke={C.ink} strokeWidth="0.5" />
      <rect x="4" y="40" width="32" height="2" fill={colorDk} />
    </svg>
  );
}

function PixelHouse({ roof, roofDk, wall, size = 96 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" shapeRendering="crispEdges" style={{ imageRendering: "pixelated" }}>
      <polygon points="16,2 30,12 2,12" fill={roof} />
      <polygon points="16,2 30,12 26,12 16,6 6,12 2,12" fill={roofDk} />
      <rect x="5" y="12" width="22" height="16" fill={wall} stroke={C.ink} strokeWidth="1" />
      <rect x="13" y="19" width="6" height="9" fill={C.woodDark} />
      <rect x="17" y="23" width="1" height="1" fill={C.gem} />
      <rect x="8" y="15" width="4" height="4" fill={C.water} stroke={C.ink} strokeWidth="0.5" />
      <rect x="20" y="15" width="4" height="4" fill={C.water} stroke={C.ink} strokeWidth="0.5" />
      <polygon points="16,2 30,12 2,12" fill="none" stroke={C.ink} strokeWidth="1" />
    </svg>
  );
}

function SmallHut({ tint, size = 90 }) {
  return (
    <svg width={size} height={size * 0.85} viewBox="0 0 28 24" shapeRendering="crispEdges" style={{ imageRendering: "pixelated" }}>
      <rect x="3" y="9" width="22" height="14" fill={C.parch} stroke={C.ink} strokeWidth="1" />
      <polygon points="14,2 26,9 2,9" fill={tint} stroke={C.ink} strokeWidth="1" />
      <rect x="11" y="15" width="6" height="8" fill={C.woodDark} stroke={C.ink} strokeWidth="0.5" />
      <rect x="5" y="12" width="4" height="3" fill={C.water} />
    </svg>
  );
}

function PixelBank({ size = 150 }) {
  return (
    <svg width={size} height={size * 0.9} viewBox="0 0 48 40" shapeRendering="crispEdges" style={{ imageRendering: "pixelated" }}>
      <polygon points="24,2 46,14 2,14" fill={C.bankRoof} />
      <polygon points="24,2 46,14 40,14 24,6 8,14 2,14" fill={C.bankRoofDk} />
      <polygon points="24,2 46,14 2,14" fill="none" stroke={C.ink} strokeWidth="1" />
      <rect x="5" y="14" width="38" height="22" fill={C.parch} stroke={C.ink} strokeWidth="1" />
      {[9, 17, 25, 33].map((x) => <rect key={x} x={x} y="17" width="4" height="16" fill={C.white} stroke={C.ink} strokeWidth="0.5" />)}
      <rect x="3" y="34" width="42" height="2" fill={C.parchEdge} />
      <rect x="22" y="8" width="4" height="4" fill={C.gem} stroke={C.ink} strokeWidth="0.5" />
    </svg>
  );
}

function Board({ size = 120 }) {
  return (
    <svg width={size} height={size * 0.9} viewBox="0 0 40 36" shapeRendering="crispEdges" style={{ imageRendering: "pixelated" }}>
      <rect x="7" y="26" width="4" height="10" fill={C.woodDark} />
      <rect x="29" y="26" width="4" height="10" fill={C.woodDark} />
      <rect x="3" y="4" width="34" height="24" fill={C.wood} stroke={C.ink} strokeWidth="1" />
      <rect x="3" y="4" width="34" height="24" fill="none" stroke={C.woodDark} strokeWidth="2" />
      <rect x="7" y="8" width="26" height="3" fill={C.parch} />
      <rect x="7" y="14" width="18" height="3" fill={C.parch} />
      <rect x="7" y="20" width="22" height="3" fill={C.gem} />
    </svg>
  );
}

function Signpost({ size = 90 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" shapeRendering="crispEdges" style={{ imageRendering: "pixelated" }}>
      <rect x="14" y="8" width="3" height="20" fill={C.woodDark} />
      <rect x="4" y="6" width="22" height="8" fill={C.wood} stroke={C.ink} strokeWidth="1" />
      <polygon points="26,6 30,10 26,14" fill={C.wood} stroke={C.ink} strokeWidth="1" />
    </svg>
  );
}

function Facility({ color, colorDk, icon, size = 160 }) {
  return (
    <div style={{ position: "relative", width: size, textAlign: "center" }}>
      <svg width={size} height={size * 0.72} viewBox="0 0 44 32" shapeRendering="crispEdges" style={{ imageRendering: "pixelated" }}>
        <rect x="3" y="8" width="38" height="22" fill={color} stroke={C.ink} strokeWidth="1" />
        <rect x="3" y="8" width="38" height="5" fill={colorDk} />
        {[8, 16, 28, 34].map((x) => <rect key={x} x={x} y="16" width="5" height="6" fill={C.white} stroke={C.ink} strokeWidth="0.4" />)}
        <rect x="19" y="22" width="8" height="8" fill={C.woodDark} stroke={C.ink} strokeWidth="0.5" />
        <rect x="3" y="30" width="38" height="2" fill={colorDk} />
      </svg>
      <div style={{ position: "absolute", top: 2, left: "50%", transform: "translateX(-50%)", fontSize: 22 }}>{icon}</div>
    </div>
  );
}

/* 방향 표지판(방향어 없이 목적지만) */
function DirSign({ text, color = C.wood }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ background: color, color: C.white, border: `2px solid ${C.ink}`, padding: "3px 8px", fontSize: 11, fontWeight: "bold", whiteSpace: "nowrap", boxShadow: `0 2px 0 ${C.woodDark}` }}>{text}</div>
      <div style={{ width: 6, height: 22, background: C.woodDark, border: `1px solid ${C.ink}` }} />
    </div>
  );
}

/* 동상: 황혼의 파수꾼 */
function Statue({ size = 90 }) {
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 20 26" shapeRendering="crispEdges" style={{ imageRendering: "pixelated" }}>
      <rect x="3" y="22" width="14" height="4" fill="#8a8a8a" stroke={C.ink} strokeWidth="0.5" />
      <rect x="5" y="19" width="10" height="3" fill="#a0a0a0" stroke={C.ink} strokeWidth="0.5" />
      <rect x="7" y="8" width="6" height="11" fill="#b8b8b8" stroke={C.ink} strokeWidth="0.5" />
      <rect x="8" y="3" width="4" height="5" fill="#c4c4c4" stroke={C.ink} strokeWidth="0.5" />
      <rect x="6" y="11" width="2" height="6" fill="#9a9a9a" />
      <rect x="12" y="11" width="2" height="6" fill="#9a9a9a" />
      <rect x="8" y="1" width="4" height="2" fill="#8a8a8a" />
    </svg>
  );
}

/* 🏆 퀘스트 완료의 제단 — 성공 + 신비로운 느낌의 상징물 */
function QuestShrine({ size = 150 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" style={{ overflow: "visible", display: "block" }}>
      <defs>
        <radialGradient id="qsAura" cx="50%" cy="52%" r="50%">
          <stop offset="0%" stopColor="#fff3bf" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#ffd75e" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#ffd75e" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="qsStone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9a86d8" />
          <stop offset="55%" stopColor="#5c4a9e" />
          <stop offset="100%" stopColor="#2e2455" />
        </linearGradient>
        <linearGradient id="qsGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff6cf" />
          <stop offset="45%" stopColor="#ffd75e" />
          <stop offset="100%" stopColor="#c98a1a" />
        </linearGradient>
        <linearGradient id="qsPortal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eafcff" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#7fe3ff" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#4a63d8" stopOpacity="0.85" />
        </linearGradient>
      </defs>

      {/* 신비로운 오라 */}
      <circle className="qs-aura" cx="60" cy="62" r="52" fill="url(#qsAura)" />

      {/* 회전하는 룬 링 */}
      <g className="qs-ring" style={{ transformOrigin: "60px 74px" }}>
        <ellipse cx="60" cy="74" rx="44" ry="14" fill="none" stroke="#ffd75e" strokeWidth="2" opacity="0.8" />
        {[0, 60, 120, 180, 240, 300].map((a) => {
          const r = (a * Math.PI) / 180;
          return <circle key={a} cx={60 + 44 * Math.cos(r)} cy={74 + 14 * Math.sin(r)} r="3" fill="#fff3bf" stroke={C.ink} strokeWidth="0.8" />;
        })}
      </g>

      {/* 계단형 기단 */}
      <rect x="18" y="92" width="84" height="10" fill="#3b2f66" stroke={C.ink} strokeWidth="2" />
      <rect x="26" y="83" width="68" height="10" fill="#4b3c85" stroke={C.ink} strokeWidth="2" />
      <rect x="34" y="74" width="52" height="10" fill="url(#qsStone)" stroke={C.ink} strokeWidth="2" />

      {/* 좌우 오벨리스크 기둥 */}
      <g>
        <polygon points="24,74 34,74 32,34 26,34" fill="url(#qsStone)" stroke={C.ink} strokeWidth="2" />
        <polygon points="26,34 32,34 29,24" fill="url(#qsGold)" stroke={C.ink} strokeWidth="1.6" />
        <rect x="27" y="44" width="4" height="4" fill="#ffe9a8" opacity="0.9" />
        <rect x="27" y="54" width="4" height="4" fill="#7fe3ff" opacity="0.9" />
        <rect x="27" y="64" width="4" height="4" fill="#ffe9a8" opacity="0.9" />
      </g>
      <g>
        <polygon points="86,74 96,74 94,34 88,34" fill="url(#qsStone)" stroke={C.ink} strokeWidth="2" />
        <polygon points="88,34 94,34 91,24" fill="url(#qsGold)" stroke={C.ink} strokeWidth="1.6" />
        <rect x="89" y="44" width="4" height="4" fill="#7fe3ff" opacity="0.9" />
        <rect x="89" y="54" width="4" height="4" fill="#ffe9a8" opacity="0.9" />
        <rect x="89" y="64" width="4" height="4" fill="#7fe3ff" opacity="0.9" />
      </g>

      {/* 가운데 차원문 */}
      <path d="M42 74 L42 50 Q60 30 78 50 L78 74 Z" fill="url(#qsPortal)" stroke={C.ink} strokeWidth="2" />
      <path d="M48 74 L48 53 Q60 39 72 53 L72 74 Z" fill="#1d2a63" opacity="0.55" />

      {/* 떠 있는 승리의 별 */}
      <g className="qs-float" style={{ transformOrigin: "60px 52px" }}>
        <polygon points="60,34 64.5,46 77,46 67,53.5 70.5,66 60,58.5 49.5,66 53,53.5 43,46 55.5,46"
          fill="url(#qsGold)" stroke={C.ink} strokeWidth="2" strokeLinejoin="round" />
        <circle cx="60" cy="50" r="3.2" fill="#fffbe8" />
      </g>

      {/* 반짝임 */}
      <g className="qs-spark">
        <circle cx="20" cy="40" r="2.4" fill="#fff3bf" />
        <circle cx="100" cy="52" r="2" fill="#7fe3ff" />
        <circle cx="34" cy="20" r="1.8" fill="#fff3bf" />
        <circle cx="88" cy="16" r="2.2" fill="#ffd75e" />
      </g>
    </svg>
  );
}

/* NPC: 봉준호 (수트 + 긴머리 + 안경) */
function ManBong({ size = 40 }) {
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 17 22" shapeRendering="crispEdges" style={{ imageRendering: "pixelated" }}>
      <rect x="3" y="1" width="11" height="8" fill="#2a2a2a" />{/* 긴머리 */}
      <rect x="5" y="3" width="7" height="6" fill="#f4c9a0" stroke={C.ink} strokeWidth="0.4" />
      <rect x="3" y="7" width="2" height="6" fill="#2a2a2a" />
      <rect x="12" y="7" width="2" height="6" fill="#2a2a2a" />
      {/* 안경 */}
      <rect x="5" y="5" width="2" height="2" fill="none" stroke={C.ink} strokeWidth="0.6" />
      <rect x="10" y="5" width="2" height="2" fill="none" stroke={C.ink} strokeWidth="0.6" />
      {/* 수트 */}
      <rect x="4" y="9" width="9" height="9" fill="#2b3a4a" stroke={C.ink} strokeWidth="0.5" />
      <polygon points="8,9 9,9 8.5,13" fill={C.white} />
      <rect x="8" y="9" width="1" height="6" fill="#c0563a" />{/* 넥타이 */}
      <rect x="5" y="18" width="3" height="4" fill="#20303a" />
      <rect x="9" y="18" width="3" height="4" fill="#20303a" />
    </svg>
  );
}

function Tree() {
  return (
    <svg width="46" height="56" viewBox="0 0 21 26" shapeRendering="crispEdges">
      <rect x="9" y="16" width="3" height="9" fill={C.woodDark} />
      <polygon points="10,0 19,11 2,11" fill={C.grassShadow} />
      <polygon points="10,4 18,14 3,14" fill={C.grassDark} />
      <polygon points="10,8 17,17 4,17" fill={C.grass} />
      <polygon points="10,0 19,11 2,11" fill="none" stroke={C.ink} strokeWidth="0.6" />
    </svg>
  );
}

/* 캐릭터 외모 옵션 */
const SKIN_TONES = [
  { id: "s1", name: "밝은", color: "#ffe0bd" },
  { id: "s2", name: "기본", color: "#f4c9a0" },
  { id: "s3", name: "웜톤", color: "#e0ac7e" },
  { id: "s4", name: "탠", color: "#c68642" },
  { id: "s5", name: "브라운", color: "#8d5524" },
  { id: "s6", name: "딥", color: "#5c3317" },
];
const HAIR_COLORS = [
  { id: "h1", name: "검정", color: "#2a2a2a" },
  { id: "h2", name: "갈색", color: "#6b4423" },
  { id: "h3", name: "금발", color: "#e0b95e" },
  { id: "h4", name: "빨강", color: "#b8442e" },
  { id: "h5", name: "회색", color: "#9a9a9a" },
  { id: "h6", name: "파랑", color: "#3a6ea5" },
  { id: "h7", name: "핑크", color: "#d76b96" },
  { id: "h8", name: "민트", color: "#3fa07a" },
];
const HAIR_STYLES = [
  { id: "short", name: "숏컷" },
  { id: "bob", name: "단발" },
  { id: "long", name: "긴머리" },
  { id: "cap", name: "모자" },
  { id: "bald", name: "민머리" },
];
const DEFAULT_LOOK = { skin: "#f4c9a0", hair: "#6b4423", hairStyle: "short" };

function Hero({ facing = 1, moving = false, size = 34, outfit = null, look = null, carry = null, pet = null }) {
  const top = (outfit && outfit.top) ? outfit.top.color : C.bankRoof;
  const bottom = (outfit && outfit.bottom) ? outfit.bottom.color : C.woodDark;
  const shoes = (outfit && outfit.shoes) ? outfit.shoes.color : null;
  const skin = (look && look.skin) || DEFAULT_LOOK.skin;
  const hair = (look && look.hair) || DEFAULT_LOOK.hair;
  const style = (look && look.hairStyle) || DEFAULT_LOOK.hairStyle;
  return (
    <div aria-hidden style={{ position: "relative", transform: `scaleX(${facing})` }}>
      <svg width={size} height={size * 1.24} viewBox="0 0 17 21" shapeRendering="crispEdges" className={moving ? "hero-bob" : ""}>
        <rect x="5" y="1" width="7" height="6" fill={skin} stroke={C.ink} strokeWidth="0.6" />
        {/* 헤어스타일 */}
        {style !== "bald" && <rect x="4" y="0" width="9" height="3" fill={hair} />}
        {(style === "bob" || style === "long") && <rect x="3.5" y="1" width="1.8" height={style === "long" ? 9 : 5} fill={hair} />}
        {(style === "bob" || style === "long") && <rect x="11.7" y="1" width="1.8" height={style === "long" ? 9 : 5} fill={hair} />}
        {style === "cap" && <rect x="3" y="-0.6" width="11" height="2.4" fill={hair} stroke={C.ink} strokeWidth="0.4" />}
        {style === "cap" && <rect x="11" y="1.4" width="4.5" height="1.3" fill={hair} stroke={C.ink} strokeWidth="0.4" />}
        <rect x="6" y="4" width="1" height="1" fill={C.ink} />
        <rect x="10" y="4" width="1" height="1" fill={C.ink} />
        <rect x="4" y="7" width="9" height="8" fill={top} stroke={C.ink} strokeWidth="0.6" />
        <rect x="2" y="8" width="2" height="5" fill={skin} />
        <rect x="13" y="8" width="2" height="5" fill={skin} />
        <rect x="5" y="15" width="3" height="5" fill={bottom} />
        <rect x="9" y="15" width="3" height="5" fill={bottom} />
        {shoes && <rect x="4.5" y="19" width="3.5" height="2" fill={shoes} stroke={C.ink} strokeWidth="0.4" />}
        {shoes && <rect x="9" y="19" width="3.5" height="2" fill={shoes} stroke={C.ink} strokeWidth="0.4" />}
      </svg>
      {/* 따라다니는 반려동물 */}
      {pet && (
        <span className="pet-trot" style={{ position: "absolute", left: -size * 0.62, bottom: 0, fontSize: size * 0.52, transform: `scaleX(${facing})`, pointerEvents: "none", filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.3))" }}>{pet}</span>
      )}
      {/* 들고 있는 선물 */}
      {carry && (
        <span style={{ position: "absolute", right: -size * 0.28, top: size * 0.34, fontSize: size * 0.5, transform: `scaleX(${facing})`, pointerEvents: "none", filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.35))" }}>
          {carry.emoji || "🎁"}
        </span>
      )}
    </div>
  );
}

/* ======================= 공용 UI ======================= */
const fmt = (n) => (Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 1 }));

function Panel({ children, style }) {
  return (
    <div style={{ background: C.parch, border: `4px solid ${C.ink}`, boxShadow: `inset 0 0 0 3px ${C.parchEdge}, 6px 6px 0 rgba(0,0,0,0.25)`, ...style }}>
      {children}
    </div>
  );
}

function PxButton({ children, onClick, disabled, tone = "wood", style, title }) {
  const tones = {
    wood: { bg: C.wood, bgDk: C.woodDark, fg: C.white },
    gold: { bg: C.gem, bgDk: "#d9a41f", fg: C.ink },
    good: { bg: C.good, bgDk: "#3c7a2c", fg: C.white },
    danger: { bg: C.danger, bgDk: "#96412c", fg: C.white },
    blue: { bg: C.bankRoof, bgDk: C.bankRoofDk, fg: C.white },
    ink: { bg: "#4a382a", bgDk: "#2a1e14", fg: C.white },
  }[tone];
  return (
    <button onClick={onClick} disabled={disabled} title={title} className="px-btn"
      style={{ fontFamily: "'DotGothic16', monospace", color: tones.fg, background: disabled ? "#9a8f7d" : tones.bg,
        border: `3px solid ${C.ink}`, boxShadow: disabled ? "none" : `0 4px 0 ${tones.bgDk}`,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.7 : 1, ...style }}>
      {children}
    </button>
  );
}

/* 💎 젬 = 퀘스트 보상 · 환전 가능 / 🪙 골드 = 마을 안에서만 쓰는 화폐 */
function GemBadge({ amount, big, kind = "gem" }) {
  const gold = kind === "gold";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
      <span className="gem-spin" style={{ fontSize: big ? 22 : 15 }}>{gold ? "🪙" : "💎"}</span>
      <b style={{ color: gold ? "#a86e13" : "#2f7fb5", fontSize: big ? 22 : 15 }}>{fmt(amount)}</b>
    </span>
  );
}

function TitleBar({ icon, title, sub, onBack, right, bg = C.parch, fg = C.ink }) {
  return (
    <div style={{ padding: "12px 16px", background: bg, color: fg, borderBottom: `4px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {icon && <span style={{ fontSize: 26 }}>{icon}</span>}
        <div>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11 }}>{title}</div>
          {sub && <div style={{ fontSize: 12, marginTop: 4, color: fg === C.ink ? C.inkSoft : "rgba(255,255,255,0.9)" }}>{sub}</div>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {right}
        {onBack && <PxButton tone="ink" onClick={onBack} style={{ padding: "8px 12px", fontSize: 12 }}>← 나가기</PxButton>}
      </div>
    </div>
  );
}

/* ======================= 이동 가능한 룸(내부) ======================= */
/* furniture: {id,x,y,w,h,label,emoji,color?,onInteract?,toast?} 좌표는 룸 px 기준 */
function RoomView({ title, icon, sub, bg, roomW = 640, roomH = 400, furniture, start, onBack, paused = false, children, headerBg = C.parch, banner = null, bubble = null, outfit = null, look = null, carry = null, pet = null }) {
  const net = useContext(NetContext);
  const [pos, setPos] = useState(start || { x: roomW / 2, y: roomH - 60 });
  useEffect(() => { if (net && net.roomPosRef) net.roomPosRef.current = pos; }, [pos, net]);
  const [facing, setFacing] = useState(1);
  const [moving, setMoving] = useState(false);
  const [near, setNear] = useState(null);
  const [toast, setToast] = useState(null);
  const keys = useRef({});
  const posRef = useRef(pos);
  const nearRef = useRef(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const furRef = useRef(furniture);
  furRef.current = furniture;

  const showToast = useCallback((t) => { setToast(t); window.clearTimeout(showToast._t); showToast._t = window.setTimeout(() => setToast(null), 1600); }, []);

  useEffect(() => {
    const norm = (k) => (k.length === 1 ? k.toLowerCase() : k);
    const down = (e) => {
      if (isTyping(e)) return;
      const raw = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d"].includes(raw)) e.preventDefault();
      if (pausedRef.current) return;
      const k = norm(e.key);
      if (k === " ") {
        const n = nearRef.current;
        if (n) {
          const f = furRef.current.find((x) => x.id === n);
          if (f) { if (f.onInteract) f.onInteract(); if (f.toast) showToast(f.toast); }
        }
        return;
      }
      keys.current[k] = true;
    };
    const up = (e) => { keys.current[norm(e.key)] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [showToast]);

  useEffect(() => {
    let raf;
    let last = performance.now();
    const PPS = 192;                      // 초당 이동 픽셀
    const loop = (now) => {
      try {
      const t = now || performance.now();
      const dt = Math.min(0.05, Math.max(0, (t - last) / 1000));
      last = t;
      const SPEED = PPS * dt;
      if (!pausedRef.current) {
        const k = keys.current;
        let { x, y } = posRef.current;
        let dx = 0, dy = 0;
        if (k["ArrowLeft"] || k["a"]) dx -= 1;
        if (k["ArrowRight"] || k["d"]) dx += 1;
        if (k["ArrowUp"] || k["w"]) dy -= 1;
        if (k["ArrowDown"] || k["s"]) dy += 1;
        if (dx || dy) {
          const len = Math.hypot(dx, dy) || 1;
          x += (dx / len) * SPEED; y += (dy / len) * SPEED;
          x = Math.max(20, Math.min(roomW - 20, x));
          y = Math.max(30, Math.min(roomH - 24, y));
          posRef.current = { x, y }; setPos({ x, y });
          if (dx < 0) setFacing(-1); else if (dx > 0) setFacing(1);
        }
        setMoving(Boolean(dx || dy));
        // 근접 판정 (가구 사각형과의 거리)
        let found = null;
        for (const f of furRef.current) {
          const cx = f.x + f.w / 2, cy = f.y + f.h / 2;
          if (Math.abs(x - cx) < f.w / 2 + 34 && Math.abs(y - cy) < f.h / 2 + 40) { found = f.id; break; }
        }
        if (found !== nearRef.current) { nearRef.current = found; setNear(found); }
      }
      } catch (err) { console.error("[RoomView] loop error:", err); } finally { raf = requestAnimationFrame(loop); }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [roomW, roomH]);

  const nearFur = furniture.find((f) => f.id === near);

  return (
    <Panel style={{ padding: 0, overflow: "hidden" }}>
      <TitleBar icon={icon} title={title} sub={sub || "⬆⬇⬅➡ 이동 · 가구 앞에서 Space 상호작용"} onBack={onBack} bg={headerBg} />
      {banner}
      <div style={{ position: "relative", width: "100%", overflow: "hidden" }}>
        <div style={{ position: "relative", width: roomW, height: roomH, margin: "0 auto", background: bg, borderBottom: `3px solid ${C.ink}` }}>
          {/* 가구 */}
          {furniture.map((f) => {
            const active = f.id === near;
            if (f.npc) {
              return (
                <div key={f.id} style={{ position: "absolute", left: f.x, top: f.y, width: f.w, height: f.h, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
                  <div style={{ filter: active ? `drop-shadow(0 0 4px ${C.gem})` : "none" }}>
                    <Hero facing={f.facing || 1} moving={false} size={f.spriteSize || 40} outfit={f.outfit} />
                  </div>
                  <span style={{ fontSize: 10, color: C.ink, marginTop: 2, fontWeight: "bold", background: C.parch, border: `2px solid ${C.ink}`, padding: "0 5px", whiteSpace: "nowrap" }}>{f.label}</span>
                </div>
              );
            }
            return (
              <div key={f.id} title={f.label}
                onClick={(e) => { e.stopPropagation(); if (pausedRef.current) return; if (f.onInteract) f.onInteract(); if (f.toast) showToast(f.toast); }}
                style={{ position: "absolute", left: f.x, top: f.y, width: f.w, height: f.h, cursor: "pointer",
                background: f.color || "#c9a15f", border: `3px solid ${C.ink}`, borderRadius: f.round ? "50%" : 0,
                boxShadow: active ? `0 0 0 3px ${C.gem}` : "inset 0 0 0 2px rgba(255,255,255,0.25)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                <span style={{ fontSize: Math.min(f.w, f.h) > 46 ? 26 : 18, lineHeight: 1 }}>{f.emoji}</span>
                <span style={{ fontSize: 10, color: C.ink, marginTop: 2, fontWeight: "bold" }}>{f.label}</span>
              </div>
            );
          })}
          {/* 같은 방의 다른 접속자 */}
          {net && net.others && Object.values(net.others).filter((o) => o.v && o.v === net.view && (o.rm || null) === (net.room || null)).map((o) => (
            <div key={o.id} style={{ position: "absolute", left: o.rx || 0, top: o.ry || 0, transform: "translate(-50%,-70%)", zIndex: 5, opacity: 0.95, transition: "left .18s linear, top .18s linear", pointerEvents: "none" }}>
              {o.bubble && (
                <div className="chat-bubble" style={{ position: "absolute", bottom: "150%", left: "50%", transform: "translateX(-50%)", whiteSpace: "normal", wordBreak: "break-word", width: "max-content", maxWidth: 190, lineHeight: 1.4, textAlign: "center", background: C.white, color: C.ink, border: `2px solid ${C.ink}`, borderRadius: 8, fontSize: 12, padding: "4px 8px" }}>{o.bubble}</div>
              )}
              <div style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 3, whiteSpace: "nowrap", background: "#5b8def", color: "#fff", border: `2px solid ${C.ink}`, fontSize: 10, padding: "1px 6px" }}>{o.name}</div>
              <div className={o.dm ? "dance-" + o.dm : ""} style={{ transformOrigin: "bottom center" }}>
                <Hero facing={o.f || 1} moving={false} size={30} look={o.lk} pet={o.pt} carry={o.cy ? { emoji: o.cy } : null} outfit={o.oc ? { top: o.oc[0] ? { color: o.oc[0] } : null, bottom: o.oc[1] ? { color: o.oc[1] } : null, shoes: o.oc[2] ? { color: o.oc[2] } : null } : null} />
              </div>
            </div>
          ))}

          {/* 플레이어 */}
          <div style={{ position: "absolute", left: pos.x, top: pos.y, transform: "translate(-50%,-70%)", zIndex: 6, pointerEvents: "none" }}>
            {bubble && (
              <div className="chat-bubble" style={{ position: "absolute", bottom: "112%", left: "50%", transform: "translateX(-50%)", whiteSpace: "normal", wordBreak: "break-word", width: "max-content", maxWidth: 200, lineHeight: 1.4, textAlign: "center", background: C.white, color: C.ink, border: `2px solid ${C.ink}`, borderRadius: 8, fontSize: 12, padding: "4px 8px", boxShadow: `0 2px 0 ${C.parchEdge}` }}>
                {bubble}
              </div>
            )}
            {nearFur && !bubble && (
              <div className="enter-prompt" style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 4, whiteSpace: "nowrap", background: C.ink, color: C.gem, border: `2px solid ${C.gem}`, fontSize: 10, padding: "2px 6px" }}>
                Space · {nearFur.label}
              </div>
            )}
            <Hero facing={facing} moving={moving} size={30} outfit={outfit} look={look} carry={carry} pet={pet} />
          </div>
          {/* 토스트 */}
          {toast && (
            <div className="gem-pop" style={{ position: "absolute", left: "50%", top: 16, transform: "translateX(-50%)", background: C.ink, color: C.white, border: `2px solid ${C.gem}`, padding: "6px 10px", fontSize: 12, zIndex: 8 }}>
              {toast}
            </div>
          )}
        </div>
      </div>
      {children /* 패널/모달 오버레이 */}
    </Panel>
  );
}

/* 룸 위에 뜨는 모달(공용) */
function RoomModal({ title, onClose, children, maxW = 460 }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20, padding: 12 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: maxW, maxHeight: "88%", overflow: "auto" }}>
        <Panel style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11 }}>{title}</div>
            <PxButton tone="ink" onClick={onClose} style={{ fontSize: 11, padding: "5px 9px" }}>✕</PxButton>
          </div>
          {children}
        </Panel>
      </div>
    </div>
  );
}

/* ======================= 월드(카메라 추적) ======================= */
function buildWorld() {
  const list = [];
  // 중심 주민센터
  list.push({ id: "center", kind: "center", x: 1300, y: 760, r: 90, label: "🏛 주민센터", sub: "마을 중심 · 회의/모임" });
  list.push({ id: "ikea", kind: "small", x: 1470, y: 1000, r: 60, label: "🛒 이케아", tint: "#0051ba" });
  list.push({ id: "coredict", kind: "small", x: 1180, y: 640, r: 58, label: "📖 코어사전", tint: "#8a5a3b" });
  list.push({ id: "project", kind: "small", x: 1120, y: 970, r: 60, label: "🗺 보스맵 도전기" });
  list.push({ id: "questdone", kind: "shrine", x: 1300, y: 1080, r: 68, label: "🏆 퀘스트 완료의 제단" });

  list.push({ id: "naverschool", kind: "small", x: 1800, y: 300, r: 70, label: "📗 네이버스쿨" });
  list.push({ id: "videoschool", kind: "small", x: 2030, y: 300, r: 70, label: "🎬 영상스쿨" });
  list.push({ id: "sandbag", kind: "small", x: 800, y: 360, r: 55, label: "🥊 샌드백", tint: "#c0563a" });
  list.push({ id: "musinsa", kind: "small", x: 1650, y: 1260, r: 55, label: "🛍️ 무신사", tint: "#2b2b2b" });
list.push({ id: "jjeop", kind: "small", x: 1820, y: 1210, r: 55, label: "🍴 쩝쩝박사", tint: "#c0563a" });
  list.push({ id: "petshop", kind: "small", x: 1820, y: 1400, r: 58, label: "🐾 형욱이네" });
  // 은행 / 게시판
  list.push({ id: "bank", kind: "bank", x: 1000, y: 640, r: 65, label: "🏦 중앙은행" });
  list.push({ id: "board", kind: "board", x: 1585, y: 700, r: 60, label: "📋 게시판" });
  // 대형건물(상단)
  const bigPos = { cs: [1300, 330] };
  BIG_BUILDINGS.forEach((b) => { const p = bigPos[b.id] || [1300, 400]; list.push({ id: b.id, kind: "big", x: p[0], y: p[1], r: 75, label: `${b.icon} ${b.name}`, meta: b }); });
  // 집(좌측 클러스터)
  const hPos = [[470, 560], [730, 545], [455, 780], [720, 775], [470, 1000], [730, 1000], [470, 1210], [730, 1210], [470, 1420], [730, 1420]];
  HOUSES.forEach((h, i) => list.push({ id: h.id, kind: "house", x: hPos[i][0], y: hPos[i][1], r: 58, label: h.name, meta: h }));
  // 소형건물(우측 클러스터)
  const smalls = [
    { id: "thanks", label: "🙏 감사의 방", tint: "#e0a13d", x: 1770, y: 560 },
    { id: "heart", label: "💌 마음의 방", tint: "#d76b96", x: 1985, y: 660 },
    { id: "listening", label: "🎵 리스닝 방", tint: "#5b8def", x: 1760, y: 820 },
    { id: "reels", label: "📱 릴스방", tint: "#3fa07a", x: 1985, y: 920 },
    { id: "minigame", label: "🎮 미니게임 방", tint: "#8e5a9e", x: 1770, y: 1060 },
    { id: "smoke", label: "🚬 흡연의 방", tint: "#7a8b99", x: 1990, y: 1160 },
  ];
  smalls.forEach((s) => list.push({ id: s.id, kind: "small", x: s.x, y: s.y, r: 55, label: s.label, tint: s.tint }));
  // 수영장 / 헬스장 (주민센터 남쪽)
  list.push({ id: "pool", kind: "facility", x: 1170, y: 1250, r: 78, label: "🏊 수영장", color: "#4bb4d8", colorDk: "#2e8fb3", icon: "🏊" });
  list.push({ id: "never", kind: "npc", npc: "never", x: 950, y: 1230, r: 55, label: "🟢 네버",
    lines: ["안녕하세요 네버입니다", "네이버를 알고싶으시면 네이버스쿨로 가주세요"] });
  list.push({ id: "gym", kind: "facility", x: 1440, y: 1260, r: 78, label: "💪 헬스장", color: "#c0563a", colorDk: "#96412c", icon: "🏋️" });
  // NPC: 동상 & 봉준호
  list.push({ id: "statue", kind: "npc", npc: "statue", x: 900, y: 900, r: 55, label: "🗿 황혼의 파수꾼",
    lines: ["안녕 나는 황혼의 파수꾼이야", "디자인에 대해 배우고 싶다면 디자인스쿨을 찾아가봐"] });
  list.push({ id: "bong", kind: "npc", npc: "bong", x: 1650, y: 1000, r: 55, label: "🎬 봉준호",
    lines: ["안녕 나는 봉준호야", "영상에 대해 배우고 싶다면 영상스쿨을 찾아가봐"] });
  // 치앙마이 표지판 + 렌트 하우스(강 건너)
  list.push({ id: "sign", kind: "sign", x: 2300, y: 640, r: 0, label: "🌴 치앙마이" });
  list.push({ id: "airportIC", kind: "airport", side: "town", x: 2075, y: 745, r: 52, label: "✈️ 인천공항" });
  list.push({ id: "airportCM", kind: "airport", side: "cm", x: 2325, y: 745, r: 52, label: "✈️ 치앙마이공항" });
  const rPos = [[2400, 880], [2520, 700], [2380, 1010], [2530, 1020]];
  RENT_HOUSES.forEach((h, i) => list.push({ id: h.id, kind: "rent", x: rPos[i][0], y: rPos[i][1], r: 60, label: h.name, meta: h }));
  return list;
}
const WORLD_OBJS = buildWorld();
const WORLD = { w: 2620, h: 1520 };
const RIVER_X = 2140, RIVER_W = 120;
const BRIDGE_Y1 = 690, BRIDGE_Y2 = 800;   // 이 구간(다리 · 공항 활주로)에서만 강을 건널 수 있음
/* ===== 건물 이미지 교체 =====
   1) 프로젝트 폴더 방식 : public/sprites/<건물id>.png 로 파일을 넣으면 자동으로 인식돼요.
      (파일이 없으면 조용히 기본 도트 그림을 씁니다)
   2) 업로드/링크 방식 : 게임 안 ☰ 메뉴 → 🎨 건물 이미지 에서 바꿀 수 있어요.
   배경이 투명하지 않은 이미지는 아래 cutBackground 로 자동 누끼를 시도합니다. */
const SPRITE_KEY = "echotown_sprites_v1";
const SPRITE_CUT_KEY = "echotown_spritecut_v1";
/* 파일 이름이 건물 id와 다를 때 여기에 { 건물id: "파일이름" } 로 적어주세요.
   (id와 파일명이 같으면 아무것도 안 적어도 자동 인식됩니다) */
const SPRITE_FILES = {
  thanks: "giftshop.png",     // 🙏 감사의 방
  airportIC: "airport.png",   // ✈️ 인천공항   — 파일 하나로 두 공항 모두 적용
  airportCM: "airport.png",   // ✈️ 치앙마이공항
};
function spriteFileUrl(id) {
  let base = "/";
  try { base = (import.meta && import.meta.env && import.meta.env.BASE_URL) || "/"; } catch (e) { base = "/"; }
  return base + "sprites/" + (SPRITE_FILES[id] || id + ".png");
}

/* 단색 배경 자동 제거(누끼).
   네 모서리 색을 배경색으로 보고, 가장자리에서 안쪽으로 번져 들어가며 비슷한 색을 지웁니다.
   → 흰 배경·단색 배경엔 잘 먹고, 그라데이션이나 배경과 비슷한 색의 피사체엔 약합니다. */
function cutBackground(img, tol = 32) {
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  if (!w || !h) return null;
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0, 0, w, h);
  const d = id.data;

  // 배경색 = 네 모서리 평균
  const corners = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]];
  let br = 0, bg = 0, bb = 0;
  corners.forEach(([x, y]) => { const i = (y * w + x) * 4; br += d[i]; bg += d[i + 1]; bb += d[i + 2]; });
  br /= 4; bg /= 4; bb /= 4;
  const dist = (i) => { const a = d[i] - br, b = d[i + 1] - bg, c = d[i + 2] - bb; return Math.sqrt(a * a + b * b + c * c); };

  // 가장자리에서 flood fill (스택 방식, 좌표를 정수 하나로 눌러 담아 빠르게)
  const seen = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let sp = 0;
  const push = (p) => { if (!seen[p]) stack[sp++] = p; };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (sp > 0) {
    const p = stack[--sp];
    if (seen[p]) continue;
    const i = p * 4;
    if (dist(i) > tol) continue;
    seen[p] = 1;
    d[i + 3] = 0;
    const x = p % w, y = (p / w) | 0;
    if (x > 0) push(p - 1);
    if (x < w - 1) push(p + 1);
    if (y > 0) push(p - w);
    if (y < h - 1) push(p + w);
    if (sp > w * h - 8) break; // 안전장치
  }

  // 경계 헤일로(흰 테두리) 완화 : 지워진 픽셀과 맞닿은 애매한 색은 반투명 처리
  const soft = tol * 1.7;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (seen[p]) continue;
      const i = p * 4;
      const touching = (x > 0 && seen[p - 1]) || (x < w - 1 && seen[p + 1]) || (y > 0 && seen[p - w]) || (y < h - 1 && seen[p + w]);
      if (!touching) continue;
      const dd = dist(i);
      if (dd < soft) d[i + 3] = Math.round(255 * Math.min(1, dd / soft));
    }
  }

  ctx.putImageData(id, 0, 0);
  return cv.toDataURL("image/png");
}

/* 누끼 결과 캐시 — 같은 이미지를 매번 다시 계산하지 않도록 */
const _cutCache = new Map();
function AutoSprite({ src, cut = true, tol = 32, width, alt }) {
  const ck = `${src}|${cut}|${tol}`;
  const [out, setOut] = useState(() => _cutCache.get(ck) || null);
  useEffect(() => {
    let alive = true;
    if (_cutCache.has(ck)) { setOut(_cutCache.get(ck)); return; }
    if (!cut) { _cutCache.set(ck, src); setOut(src); return; }
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => {
      if (!alive) return;
      let res = src;
      try { res = cutBackground(im, tol) || src; } catch (e) { res = src; } // CORS 등으로 실패하면 원본 사용
      _cutCache.set(ck, res);
      setOut(res);
    };
    im.onerror = () => { if (alive) { _cutCache.set(ck, src); setOut(src); } };
    im.src = src;
    return () => { alive = false; };
  }, [ck, src, cut, tol]);
  if (!out) return <span style={{ display: "block", width, height: width * 0.8 }} />;
  return <img src={out} alt={alt} draggable={false}
    style={{ display: "block", width, height: "auto", maxHeight: width * 1.4, objectFit: "contain", imageRendering: "pixelated", filter: "drop-shadow(0 4px 0 rgba(0,0,0,0.18))", pointerEvents: "none" }} />;
}

function spriteSize(o) {
  if (o.id === "project") return 110;
  if (o.kind === "shrine") return 160;
  if (o.id === "coredict") return 104;
  if (o.id === "petshop") return 100;
  if (o.id === "sandbag") return 92;
  if (o.id === "naverschool" || o.id === "videoschool") return 140;
  switch (o.kind) {
    case "center": return 230;
    case "bank": return 150;
    case "board": return 120;
    case "big": return 150;
    case "house": return 110;
    case "small": return 100;
    case "facility": return 160;
    case "sign": return 100;
    case "deco": return o.id === "palm" ? 74 : 46;
    case "airport": return 96;
    case "npc": return o.npc === "statue" ? 72 : o.npc === "never" ? 82 : 48;
    case "rent": return 104;
    default: return 100;
  }
}
/* 교체 가능한 슬롯 목록 (지도에서 클릭할 수 있는 대상 전부) */
/* 지도 장식물도 이미지 교체 가능 (건물 목록에 없는 항목) */
const DECO_SLOTS = [
  { id: "palm", label: "🌴 야자수 (치앙마이)", kind: "deco" },
  { id: "tree", label: "🌳 나무 (마을)", kind: "deco" },
];
const SPRITE_SLOTS = [
  ...WORLD_OBJS.filter((o) => o.r).map((o) => ({ id: o.id, label: o.label, kind: o.kind })),
  ...DECO_SLOTS,
];

/* public/sprites/ 안에 실제로 존재하는 파일만 골라냅니다 (없는 건 조용히 무시) */
function probeSpriteFiles() {
  return new Promise((resolve) => {
    let found = {};
    try {
    let left = SPRITE_SLOTS.length;
    if (!left) return resolve(found);
    SPRITE_SLOTS.forEach((s) => {
      const url = spriteFileUrl(s.id);
      const im = new Image();
      const done = () => { if (--left === 0) resolve(found); };
      im.onload = () => { if (im.naturalWidth > 0) found[s.id] = url; done(); };
      im.onerror = done;
      im.src = url;
    });
    } catch (e) { resolve({}); }
  });
}

/* 🌧 비 — 굵기·길이·속도·투명도가 제각각인 세로 빗줄기.
   화면(뷰포트) 위에 덮이므로 지도를 움직여도 밀도가 일정해요.
   투명도를 넉넉히 줘서 건물이 비쳐 보이지만, 밝은 빗줄기로 존재감은 확실하게. */
function RainLayer({ count = 120, height = 480, zIndex = 24 }) {
  /* 코어 수가 적거나 모바일이면 빗줄기를 줄여 프레임을 지킵니다 */
  const n = useMemo(() => {
    try {
      const cores = navigator.hardwareConcurrency || 4;
      const small = window.innerWidth < 720;
      if (cores <= 4 || small) return Math.round(count * 0.45);
      if (cores <= 8) return Math.round(count * 0.75);
    } catch (e) {}
    return count;
  }, [count]);
  const drops = useMemo(() => Array.from({ length: n }, (_, i) => {
    const near = Math.random();                       // 0=멀리(흐릿·느림) 1=가까이(굵고·빠름)
    return {
      k: i,
      x: Math.random() * 100,
      len: 26 + near * 120 + Math.random() * 40,
      dur: 1.05 - near * 0.55 + Math.random() * 0.25,
      delay: -Math.random() * 2.4,
      op: 0.1 + near * 0.42 + Math.random() * 0.12,
      w: near > 0.82 ? 2 : 1,
    };
  }), [n]);
  return (
    <div className="rain-vp" aria-hidden style={{ zIndex }}>
      {drops.map((d) => (
        <span key={d.k} className="rain-drop" style={{
          left: d.x + "%", height: d.len, width: d.w, opacity: d.op,
          animationDuration: d.dur + "s", animationDelay: d.delay + "s",
          "--fall": (height + 180) + "px",
        }} />
      ))}
    </div>
  );
}

/* ✈️ 공항 — 비행기 모양의 귀여운 터미널 */
function Airport({ size = 96, tint = "#5b8def", tintDk = "#3a5fa8", label = "인천" }) {
  return (
    <svg width={size} height={size * 0.78} viewBox="0 0 76 60" style={{ overflow: "visible" }}>
      <ellipse cx="38" cy="55" rx="30" ry="4" fill="rgba(0,0,0,0.16)" />
      {/* 활주로 */}
      <rect x="6" y="47" width="64" height="7" rx="2" fill="#5f6b73" stroke={C.ink} strokeWidth="1.4" />
      {[12, 24, 36, 48, 60].map((x) => <rect key={x} x={x} y="50" width="6" height="1.4" fill={C.white} opacity="0.85" />)}
      {/* 꼬리날개 */}
      <path d="M14 34 L8 16 L18 18 L20 34 Z" fill={tintDk} stroke={C.ink} strokeWidth="1.4" strokeLinejoin="round" />
      {/* 동체 */}
      <path d="M12 38 Q12 28 26 27 L58 27 Q70 27 72 33 Q70 39 58 39 L26 39 Q12 39 12 38 Z"
        fill={C.white} stroke={C.ink} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 34 Q12 28 26 27 L58 27 Q70 27 72 33 L12 33 Z" fill={tint} opacity="0.28" />
      {/* 창문 */}
      {[26, 33, 40, 47, 54].map((x) => <circle key={x} cx={x} cy="33" r="2.1" fill={tint} stroke={C.ink} strokeWidth="0.7" />)}
      {/* 조종석 */}
      <path d="M63 30 Q69 30 70.5 33 Q69 35.5 63 35.5 Z" fill="#bfe0f7" stroke={C.ink} strokeWidth="0.8" />
      {/* 날개 */}
      <path d="M30 38 L22 47 L40 47 L44 38 Z" fill={tintDk} stroke={C.ink} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M34 27 L30 20 L44 20 L46 27 Z" fill={tint} stroke={C.ink} strokeWidth="1.3" strokeLinejoin="round" />
      {/* 관제탑 */}
      <rect x="60" y="12" width="4" height="16" fill="#d8c9a8" stroke={C.ink} strokeWidth="1" />
      <rect x="56.5" y="6" width="11" height="7" rx="1.5" fill={C.white} stroke={C.ink} strokeWidth="1.2" />
      <rect x="58.5" y="8" width="7" height="3" fill="#bfe0f7" />
      <circle cx="62" cy="4" r="1.6" fill={C.danger} stroke={C.ink} strokeWidth="0.6" className="beacon" />
      {/* 이름표 */}
      <rect x="8" y="0" width="40" height="12" rx="3" fill={tint} stroke={C.ink} strokeWidth="1.3" />
      <text x="28" y="8.6" textAnchor="middle" fill={C.white} stroke="none"
        style={{ fontFamily: "'DotGothic16', monospace", fontSize: "7.5px", fontWeight: "bold" }}>{label}</text>
    </svg>
  );
}

/* 장식물 스프라이트 : 내 이미지가 있으면 그걸로, 없으면 기본 그림 */
function DecoSprite({ id, size, sprites, cutCfg, children }) {
  const src = sprites && sprites[id];
  if (!src) return children;
  const cfg = (cutCfg && cutCfg[id]) || {};
  return <AutoSprite src={src} cut={cfg.cut !== undefined ? cfg.cut : true} tol={cfg.tol !== undefined ? cfg.tol : 32} width={size} alt={id} />;
}

/* 🧠 사고 스킬 — 하드모드(사고의 광장) 퀘스트를 깰 때마다 하나씩 배웁니다 */
const SKILLS = [
  { id: "s01", icon: "🔍", name: "관찰력", desc: "남들이 지나친 디테일이 보이기 시작한다" },
  { id: "s02", icon: "🧩", name: "구조화", desc: "흩어진 정보를 틀에 넣어 정리한다" },
  { id: "s03", icon: "❓", name: "질문력", desc: "답 대신 더 나은 질문을 던진다" },
  { id: "s04", icon: "🪞", name: "메타인지", desc: "내가 무엇을 모르는지 알아챈다" },
  { id: "s05", icon: "🔗", name: "연결짓기", desc: "관계없어 보이는 둘을 잇는다" },
  { id: "s06", icon: "✂️", name: "덜어내기", desc: "핵심만 남기고 과감히 버린다" },
  { id: "s07", icon: "🎯", name: "본질파악", desc: "증상이 아니라 원인을 본다" },
  { id: "s08", icon: "🔄", name: "역발상", desc: "당연한 전제를 뒤집어 본다" },
  { id: "s09", icon: "📐", name: "가설검증", desc: "추측을 실험 가능한 형태로 만든다" },
  { id: "s10", icon: "🗣", name: "설득력", desc: "상대의 언어로 다시 말한다" },
  { id: "s11", icon: "⏳", name: "인내심", desc: "성급한 결론을 한 박자 미룬다" },
  { id: "s12", icon: "🌊", name: "몰입", desc: "한 문제에 오래 머무를 수 있다" },
  { id: "s13", icon: "🧭", name: "우선순위", desc: "먼저 할 일과 안 할 일을 가른다" },
  { id: "s14", icon: "💡", name: "직관", desc: "논리보다 먼저 도착하는 감각" },
  { id: "s15", icon: "🛠", name: "실행력", desc: "생각을 일단 손으로 옮긴다" },
  { id: "s16", icon: "🌱", name: "회복탄력", desc: "틀려도 다시 시작할 수 있다" },
];

/* 🐾 반려동물 · 🐠 반려물고기 */
const PETS = [
  { id: "dog", name: "강아지", emoji: "🐕", price: 40, desc: "따라다니며 꼬리를 흔들어요" },
  { id: "cat", name: "고양이", emoji: "🐈", price: 40, desc: "가끔 딴 데를 봐요" },
  { id: "rabbit", name: "토끼", emoji: "🐇", price: 30, desc: "폴짝폴짝 따라와요" },
  { id: "hamster", name: "햄스터", emoji: "🐹", price: 20, desc: "주머니에 쏙" },
  { id: "bird", name: "앵무새", emoji: "🦜", price: 35, desc: "어깨 위가 지정석" },
  { id: "turtle", name: "거북이", emoji: "🐢", price: 25, desc: "느긋하게 따라와요" },
  { id: "fox", name: "여우", emoji: "🦊", price: 60, desc: "영리하고 도도해요" },
  { id: "penguin", name: "펭귄", emoji: "🐧", price: 55, desc: "뒤뚱뒤뚱" },
];
const FISHES = [
  { id: "f1", name: "금붕어", emoji: "🐠", price: 8 },
  { id: "f2", name: "열대어", emoji: "🐟", price: 10 },
  { id: "f3", name: "복어", emoji: "🐡", price: 14 },
  { id: "f4", name: "돌고래", emoji: "🐬", price: 30 },
  { id: "f5", name: "상어", emoji: "🦈", price: 40 },
  { id: "f6", name: "해파리", emoji: "🪼", price: 12 },
  { id: "f7", name: "문어", emoji: "🐙", price: 18 },
  { id: "f8", name: "새우", emoji: "🦐", price: 6 },
];

const FACILITIES = [
  { id: "aquarium", name: "수족관", emoji: "🐟", price: 120, desc: "우리 집에 놓는 진짜 수조. 물고기를 데려오려면 먼저 필요해요." },
  { id: "yard", name: "마당", emoji: "🌳", price: 100, desc: "반려동물이 뛰어놀 공간. 입양하려면 먼저 필요해요." },
];

/* 🐠 수족관 — 물이 채워진 진짜 수조처럼 보여줍니다 */
function Aquarium({ fishes = [], onClose, onFeed }) {
  const [feeding, setFeeding] = useState(false);
  const list = useMemo(() => fishes.map((id, i) => {
    const f = FISHES.find((x) => x.id === id);
    return f ? {
      key: i, emoji: f.emoji, name: f.name,
      top: 14 + ((i * 37) % 62),                 // 깊이
      dur: 7 + ((i * 3) % 7),                    // 헤엄 속도
      delay: -((i * 1.7) % 8),
      size: 20 + ((i * 5) % 14),
    } : null;
  }).filter(Boolean), [fishes]);
  const bubbles = [12, 30, 48, 66, 84];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 130, padding: 14 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, maxHeight: "calc(100vh - 28px)", overflowY: "auto" }}>
        <Panel style={{ padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 22 }}>🐟</span>
            <b style={{ flex: 1, fontSize: 15 }}>우리 집 수족관</b>
            <span style={{ fontSize: 12, color: C.inkSoft }}>{list.length}마리</span>
            {list.length > 0 && <PxButton tone="gold" onClick={() => { setFeeding(true); onFeed && onFeed(); setTimeout(() => setFeeding(false), 3200); }} style={{ fontSize: 11, padding: "5px 9px" }}>🍤 밥주기</PxButton>}
            <PxButton tone="ink" onClick={onClose} style={{ fontSize: 11, padding: "5px 9px" }}>✕</PxButton>
          </div>

          {/* 수조 */}
          <div style={{ position: "relative", height: 250, borderRadius: 10, overflow: "hidden",
            border: `6px solid #6b5a44`, boxShadow: "inset 0 0 40px rgba(0,40,80,0.45), 0 6px 16px rgba(0,0,0,0.35)",
            background: "linear-gradient(180deg,#8fe0f7 0%,#4fb3e0 40%,#1f74ad 100%)" }}>
            {/* 유리 반사 */}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(115deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 45%)", pointerEvents: "none", zIndex: 4 }} />
            {/* 물빛 흔들림 */}
            <div className="aq-caustic" style={{ position: "absolute", inset: 0, opacity: 0.25, background: "repeating-linear-gradient(100deg, rgba(255,255,255,0.5) 0 2px, transparent 2px 22px)", pointerEvents: "none" }} />

            {/* 공기방울 */}
            {bubbles.map((x, i) => (
              <span key={"b" + i} className="aq-bubble" style={{ left: `${x}%`, animationDuration: `${3.4 + i * 0.6}s`, animationDelay: `${-i * 1.3}s`, width: 5 + (i % 3) * 3, height: 5 + (i % 3) * 3 }} />
            ))}

            {/* 물고기 */}
            {list.length === 0 && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.85)", fontSize: 13, fontFamily: "'DotGothic16', monospace", textAlign: "center", lineHeight: 1.9, zIndex: 3 }}>
                수조가 비어 있어요 🫧<br />🐾 형욱이네에서 물고기를 데려와보세요
              </div>
            )}
            {list.map((f) => (
              <span key={f.key} className="aq-swim" title={f.name}
                style={{ position: "absolute", top: `${f.top}%`, fontSize: f.size, zIndex: 3, animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s` }}>
                <span className="aq-flip" style={{ display: "inline-block", animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s` }}>{f.emoji}</span>
              </span>
            ))}

            {/* 먹이 */}
            {feeding && [8, 22, 36, 50, 64, 78, 92].map((x, i) => (
              <span key={"fd" + i} className="aq-food" style={{ left: `${x}%`, animationDelay: `${i * 0.22}s` }} />
            ))}
            {/* 수초 */}
            <span style={{ position: "absolute", left: "8%", bottom: 16, fontSize: 34, zIndex: 2 }} className="aq-weed">🌿</span>
            <span style={{ position: "absolute", left: "26%", bottom: 14, fontSize: 26, zIndex: 2 }} className="aq-weed">🌱</span>
            <span style={{ position: "absolute", right: "12%", bottom: 16, fontSize: 30, zIndex: 2 }} className="aq-weed">🪸</span>
            <span style={{ position: "absolute", right: "32%", bottom: 18, fontSize: 22, zIndex: 2 }}>🐚</span>
            {/* 바닥 모래 */}
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 26, background: "linear-gradient(180deg,#e6d3a3,#c9ae74)", borderTop: "3px solid #b39a63", zIndex: 1 }} />
          </div>

          {/* 목록 */}
          {list.length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 10 }}>
              {Object.entries(fishes.reduce((a, id) => { a[id] = (a[id] || 0) + 1; return a; }, {})).map(([id, c]) => {
                const f = FISHES.find((x) => x.id === id);
                return f ? <span key={id} style={{ fontSize: 11.5, background: C.white, border: `2px solid ${C.ink}`, borderRadius: 12, padding: "4px 10px" }}>{f.emoji} {f.name} ×{c}</span> : null;
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function PetShop({ onBack, gold, pets = [], activePet = null, fishes = [], facilities = [], onBuyPet, onSetActive, onBuyFish, onBuyFacility, onCare, bubble }) {
  const [tab, setTab] = useState("fac");
  const has = (id) => pets.includes(id);
  const hasAqua = facilities.includes("aquarium");
  const hasYard = facilities.includes("yard");
  const furniture = [
    { id: "counter", x: 250, y: 60, w: 150, h: 70, color: "#a9814a", emoji: "🧑‍⚕️", label: "카운터", toast: "어떤 친구를 찾으세요? 🐾" },
    { id: "cage", x: 60, y: 200, w: 120, h: 90, color: "#d9c9a8", emoji: "🐕", label: "강아지 우리", toast: "멍멍! 🐕" },
    { id: "tank", x: 440, y: 200, w: 140, h: 90, color: "#bfe0f7", emoji: "🐠", label: "수조", toast: "물고기들이 헤엄쳐요 🐠" },
  ];
  return (
    <RoomView title="형욱이네" icon="🐾" sub="반려동물을 입양하고 🐠 물고기를 데려가요" bg="#f3ead8" roomW={640} roomH={400} furniture={furniture} onBack={onBack} paused headerBg="#7bbf8f" bubble={bubble}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 14, zIndex: 20 }}>
        <div style={{ width: "100%", maxWidth: 460, maxHeight: "92%", overflow: "auto" }}>
          <Panel style={{ padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 22 }}>🐾</span>
              <b style={{ flex: 1, fontSize: 15 }}>형욱이네</b>
              <GemBadge kind="gold" amount={gold} />
            </div>
            <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
              <PxButton tone={tab === "fac" ? "good" : "wood"} onClick={() => setTab("fac")} style={{ flex: 1, fontSize: 11.5, padding: 9 }}>🏗 시설</PxButton>
              <PxButton tone={tab === "pet" ? "good" : "wood"} onClick={() => setTab("pet")} style={{ flex: 1, fontSize: 11.5, padding: 9 }}>🐾 동물</PxButton>
              <PxButton tone={tab === "fish" ? "good" : "wood"} onClick={() => setTab("fish")} style={{ flex: 1, fontSize: 11.5, padding: 9 }}>🐠 물고기</PxButton>
            </div>

            {tab === "fac" && (
              <>
                <div style={{ fontSize: 11.5, color: C.inkSoft, marginBottom: 8, lineHeight: 1.7 }}>
                  반려동물·물고기를 데려오려면 <b>먼저 살 곳</b>을 마련해야 해요.
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {FACILITIES.map((fc) => {
                    const own = facilities.includes(fc.id);
                    return (
                      <div key={fc.id} style={{ display: "flex", alignItems: "center", gap: 10, background: own ? "#eef6ef" : C.white, border: `3px solid ${own ? C.good : C.ink}`, borderRadius: 10, padding: 11 }}>
                        <span style={{ fontSize: 34 }}>{fc.emoji}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: "bold" }}>{fc.name}{own ? " ✓" : ""}</div>
                          <div style={{ fontSize: 11, color: C.inkSoft, lineHeight: 1.6 }}>{fc.desc}</div>
                        </div>
                        {own
                          ? <span style={{ fontSize: 11.5, color: C.good, fontWeight: "bold", whiteSpace: "nowrap" }}>보유중</span>
                          : <PxButton tone="gold" disabled={gold < fc.price} onClick={() => onBuyFacility(fc)} style={{ fontSize: 11.5, padding: "9px 11px", whiteSpace: "nowrap" }}>
                              {gold < fc.price ? `🪙${fc.price} 부족` : `🪙${fc.price} 구입`}
                            </PxButton>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {tab === "pet" && (
              <>
                <div style={{ fontSize: 11.5, color: C.inkSoft, marginBottom: 8, lineHeight: 1.7 }}>
                  입양하면 마을에서 나를 졸졸 따라다녀요. 여러 마리를 키워도 <b>데리고 나가는 건 한 마리</b>씩이에요.
                </div>
                {!hasYard && (
                  <div style={{ background: "#fbe4e0", border: `3px solid ${C.danger}`, borderRadius: 10, padding: 12, marginBottom: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 26 }}>🌳🔒</div>
                    <div style={{ fontSize: 13, fontWeight: "bold", color: C.danger, margin: "6px 0 4px" }}>먼저 마당이 필요해요</div>
                    <div style={{ fontSize: 11.5, color: C.inkSoft, lineHeight: 1.7 }}>반려동물이 뛰어놀 공간을 마련해야 입양할 수 있어요.</div>
                    <PxButton tone="gold" onClick={() => setTab("fac")} style={{ width: "100%", marginTop: 9, padding: 10, fontSize: 12.5 }}>🏗 시설 탭에서 마당 구입하기</PxButton>
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
                  {PETS.map((pt) => {
                    const own = has(pt.id), act = activePet === pt.id;
                    return (
                      <div key={pt.id} style={{ background: act ? "#fff5d6" : C.white, border: `3px solid ${act ? C.gem : C.ink}`, borderRadius: 10, padding: 10, textAlign: "center" }}>
                        <div style={{ fontSize: 34 }}>{pt.emoji}</div>
                        <div style={{ fontSize: 13, fontWeight: "bold", marginTop: 3 }}>{pt.name}</div>
                        <div style={{ fontSize: 10.5, color: C.inkSoft, lineHeight: 1.5, minHeight: 28, marginTop: 2 }}>{pt.desc}</div>
                        {own ? (
                          <>
                            <PxButton tone={act ? "ink" : "good"} onClick={() => onSetActive(act ? null : pt.id)} style={{ width: "100%", marginTop: 6, fontSize: 11, padding: 8 }}>
                              {act ? "🏠 집에 두기" : "🚶 데리고 나가기"}
                            </PxButton>
                            <div style={{ display: "flex", gap: 4, marginTop: 5 }}>
                              <PxButton tone="blue" onClick={() => onCare(pt, "pet")} style={{ flex: 1, fontSize: 10.5, padding: 7 }}>🤲 쓰다듬기</PxButton>
                              <PxButton tone="gold" onClick={() => onCare(pt, "feed")} style={{ flex: 1, fontSize: 10.5, padding: 7 }}>🍖 밥주기</PxButton>
                            </div>
                          </>
                        ) : (
                          <PxButton tone="gold" disabled={!hasYard || gold < pt.price} onClick={() => onBuyPet(pt)} style={{ width: "100%", marginTop: 6, fontSize: 11, padding: 8 }}>
                            {!hasYard ? "🌳 마당 필요" : gold < pt.price ? `🪙${pt.price} 부족` : `🪙${pt.price} 입양`}
                          </PxButton>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            {tab === "fish" && (
              <>
                <div style={{ fontSize: 11.5, color: C.inkSoft, marginBottom: 8, lineHeight: 1.7 }}>
                  데려간 물고기는 <b>우리 집 수족관</b>에서 헤엄쳐요. 집에 들어가 수족관을 눌러보세요 🐠
                </div>
                {!hasAqua && (
                  <div style={{ background: "#e0f0fb", border: `3px solid #3a7bb5`, borderRadius: 10, padding: 12, marginBottom: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 26 }}>🐟🔒</div>
                    <div style={{ fontSize: 13, fontWeight: "bold", color: "#2a6a9e", margin: "6px 0 4px" }}>먼저 수족관이 필요해요</div>
                    <div style={{ fontSize: 11.5, color: C.inkSoft, lineHeight: 1.7 }}>물고기를 넣을 수조를 마련해야 데려올 수 있어요.</div>
                    <PxButton tone="blue" onClick={() => setTab("fac")} style={{ width: "100%", marginTop: 9, padding: 10, fontSize: 12.5 }}>🏗 시설 탭에서 수족관 구입하기</PxButton>
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8 }}>
                  {FISHES.map((f) => {
                    const cnt = fishes.filter((x) => x === f.id).length;
                    return (
                      <div key={f.id} style={{ background: C.white, border: `3px solid ${C.ink}`, borderRadius: 10, padding: 10, textAlign: "center" }}>
                        <div style={{ fontSize: 30 }}>{f.emoji}</div>
                        <div style={{ fontSize: 12.5, fontWeight: "bold", marginTop: 3 }}>{f.name}</div>
                        {cnt > 0 && <div style={{ fontSize: 10, color: C.good, fontWeight: "bold" }}>어항에 {cnt}마리</div>}
                        <PxButton tone="blue" disabled={!hasAqua || gold < f.price} onClick={() => onBuyFish(f)} style={{ width: "100%", marginTop: 6, fontSize: 11, padding: 8 }}>
                          {!hasAqua ? "🐟 수족관 필요" : gold < f.price ? `🪙${f.price} 부족` : `🪙${f.price} 데려가기`}
                        </PxButton>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            <PxButton tone="ink" onClick={onBack} style={{ width: "100%", marginTop: 12, padding: 11, fontSize: 13 }}>나가기</PxButton>
          </Panel>
        </div>
      </div>
    </RoomView>
  );
}

function LetterN({ size = 80 }) {
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 20 24" shapeRendering="crispEdges" style={{ imageRendering: "pixelated" }}>
      <rect x="3" y="21" width="14" height="3" fill="#2b1f14" />
      <rect x="3" y="2" width="4" height="19" fill="#2db400" stroke="#1a7000" strokeWidth="0.5" />
      <rect x="13" y="2" width="4" height="19" fill="#2db400" stroke="#1a7000" strokeWidth="0.5" />
      <polygon points="6,2 9,2 16,21 13,21" fill="#2db400" stroke="#1a7000" strokeWidth="0.5" />
    </svg>
  );
}
const MAP_ZONES = [
  { label: "업무", color: "#5b8def", x1: 820, y1: 210, x2: 1680, y2: 560 },
  { label: "주민센터", color: "#d9a441", x1: 1150, y1: 610, x2: 1470, y2: 910 },
  { label: "집", color: "#c98ba0", x1: 380, y1: 490, x2: 830, y2: 1300 },
  { label: "놀이", color: "#3fa07a", x1: 1680, y1: 500, x2: 2090, y2: 1260 },
  { label: "운동", color: "#4bb4d8", x1: 1080, y1: 1170, x2: 1560, y2: 1340 },
  { label: "치앙마이", color: "#8e6bb0", x1: 2260, y1: 560, x2: 2600, y2: 1120 },
];
function BigMap({ pos, onClose, onGo }) {
  const pct = (v, t) => `${(v / t) * 100}%`;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 14 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 700 }}>
        <Panel style={{ padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11 }}>🗺 에코타운 전체 지도</div>
            <PxButton tone="ink" onClick={onClose} style={{ fontSize: 11, padding: "5px 9px" }}>✕</PxButton>
          </div>
          <div style={{ position: "relative", width: "100%", paddingBottom: `${(WORLD.h / WORLD.w) * 100}%`, background: "#cfe3c0", border: `3px solid ${C.ink}`, overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0 }}>
              <div style={{ position: "absolute", left: pct(RIVER_X, WORLD.w), top: 0, width: pct(RIVER_W, WORLD.w), height: "100%", background: "#3a6ea5" }} />
              {MAP_ZONES.map((z) => (
                <div key={z.label} style={{ position: "absolute", left: pct(z.x1, WORLD.w), top: pct(z.y1, WORLD.h), width: pct(z.x2 - z.x1, WORLD.w), height: pct(z.y2 - z.y1, WORLD.h), background: z.color + "44", border: `1px dashed ${z.color}`, display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
                  <span style={{ fontSize: 15, color: "#2b1f14", fontWeight: "bold", background: "rgba(255,255,255,0.75)", padding: "1px 6px", marginTop: 3 }}>{z.label}</span>
                </div>
              ))}
              {WORLD_OBJS.filter((o) => o.r).map((o) => (
                <button key={o.id} onClick={() => onGo && onGo(o.x, o.y + 70, o.label)} title={`${o.label}로 이동`} style={{ position: "absolute", left: pct(o.x, WORLD.w), top: pct(o.y, WORLD.h), transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 2, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "'DotGothic16', monospace" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.danger, border: "2px solid #fff", boxShadow: "0 1px 2px rgba(0,0,0,0.4)" }} />
                  <span style={{ fontSize: 12, whiteSpace: "nowrap", background: "rgba(255,255,255,0.95)", border: `1px solid ${C.ink}`, borderRadius: 6, padding: "1px 6px", marginTop: 2, fontWeight: "bold" }}>{o.label}</span>
                </button>
              ))}
              <div style={{ position: "absolute", left: pct(pos.x, WORLD.w), top: pct(pos.y, WORLD.h), transform: "translate(-50%,-50%)", width: 12, height: 12, borderRadius: "50%", background: "#fff", border: `3px solid ${C.danger}`, boxShadow: "0 0 6px #fff", zIndex: 5 }} />
            </div>
          </div>
          <div style={{ fontSize: 10, color: C.inkSoft, marginTop: 6, textAlign: "center" }}>흰 점 = 내 위치 · 건물 이름을 누르면 그곳으로 바로 이동해요 🚀</div>
        </Panel>
      </div>
    </div>
  );
}
function MiniMap({ pos, onGo }) {
  const [open, setOpen] = useState(false);
  const W = 168, H = Math.round((W * WORLD.h) / WORLD.w);
  const sx = W / WORLD.w, sy = H / WORLD.h;
  return (
    <>
      <div onClick={() => setOpen(true)} title="클릭하면 전체 지도" style={{ position: "absolute", right: 10, bottom: 10, width: W, height: H, background: "rgba(20,28,18,0.85)", border: `2px solid ${C.ink}`, zIndex: 16, overflow: "hidden", cursor: "pointer" }}>
        <div style={{ position: "absolute", left: RIVER_X * sx, top: 0, width: Math.max(2, RIVER_W * sx), height: "100%", background: "#3a6ea5" }} />
        {MAP_ZONES.map((z) => (
          <button key={z.label} onClick={(e) => { e.stopPropagation(); onGo && onGo((z.x1 + z.x2) / 2, (z.y1 + z.y2) / 2, z.label); }} title={`${z.label} 구역으로 이동`} style={{ position: "absolute", left: z.x1 * sx, top: z.y1 * sy, width: (z.x2 - z.x1) * sx, height: (z.y2 - z.y1) * sy, background: z.color + "cc", border: "1px solid rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
            <span style={{ fontSize: 8, color: "#fff", fontWeight: "bold", textShadow: "0 1px 1px rgba(0,0,0,0.6)", whiteSpace: "nowrap", fontFamily: "'DotGothic16', monospace" }}>{z.label}</span>
          </button>
        ))}
        <div style={{ position: "absolute", left: pos.x * sx - 3, top: pos.y * sy - 3, width: 6, height: 6, borderRadius: "50%", background: "#fff", border: `2px solid ${C.danger}`, boxShadow: "0 0 4px #fff", zIndex: 2 }} />
        <div style={{ position: "absolute", right: 2, top: 1, fontSize: 9, color: "#fff", background: "rgba(0,0,0,0.4)", padding: "0 3px" }}>🔍</div>
      </div>
      {open && <BigMap pos={pos} onClose={() => setOpen(false)} onGo={(x, y, label) => { setOpen(false); onGo && onGo(x, y, label); }} />}
    </>
  );
}
function GuardGate({ onPass, onClose, onCross, passed = false, side = "town" }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState(false);
  const [ok, setOk] = useState(false);
  const from = side === "cm" ? "치앙마이공항" : "인천공항";
  const to = side === "cm" ? "인천공항" : "치앙마이공항";
  const submit = () => {
    if (code.trim().toLowerCase() === "chiang") {
      setOk(true);
      onPass();
      setTimeout(() => { onCross && onCross(); onClose(); }, 1200);   // 정답이면 바로 반대편으로
    } else { setErr(true); setCode(""); }
  };
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40, padding: 14 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 330, maxHeight: "calc(100vh - 28px)", overflowY: "auto" }}>
        <Panel style={{ padding: 16 }}>
          <div style={{ fontSize: 40, textAlign: "center" }}>✈️</div>
          <div style={{ textAlign: "center", fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: C.inkSoft, margin: "6px 0 2px" }}>{from}</div>

          {ok ? (
            <div style={{ textAlign: "center", margin: "14px 0" }}>
              <div style={{ fontSize: 22, color: C.good, fontWeight: "bold" }}>정답입니다! 🎉</div>
              <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 8, lineHeight: 1.8 }}>
                🛫 {to} 로 이동 중…<br />
                이제부터 자유롭게 왕복할 수 있어요
              </div>
            </div>
          ) : passed ? (
            <>
              <div style={{ textAlign: "center", fontSize: 15, fontWeight: "bold", margin: "8px 0 4px", color: C.good }}>🎫 탑승권 소지 중</div>
              <div style={{ fontSize: 12.5, color: C.inkSoft, textAlign: "center", lineHeight: 1.8, marginBottom: 12 }}>
                이미 비밀코드를 맞히셨어요.<br />다리로 걸어가도 되고, 바로 이동할 수도 있어요.
              </div>
              <PxButton tone="good" onClick={() => { onCross && onCross(); onClose(); }} style={{ width: "100%", padding: 12, fontSize: 14 }}>🛫 {to} 로 이동</PxButton>
              <PxButton tone="ink" onClick={onClose} style={{ width: "100%", marginTop: 8, padding: 10, fontSize: 13 }}>돌아가기</PxButton>
            </>
          ) : (
            <>
              <div style={{ fontSize: 14, textAlign: "center", margin: "8px 0 4px", fontWeight: "bold" }}>🔒 비밀코드를 입력하세요</div>
              <div style={{ fontSize: 11.5, color: C.inkSoft, textAlign: "center", marginBottom: 10, lineHeight: 1.7 }}>
                한 번만 맞히면 그 뒤로는 계속 왔다갔다 할 수 있어요.
              </div>
              <input value={code} onChange={(e) => { setCode(e.target.value); setErr(false); }} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} autoFocus
                placeholder="비밀코드" style={{ width: "100%", boxSizing: "border-box", padding: 10, border: `3px solid ${C.ink}`, fontFamily: "'DotGothic16', monospace", fontSize: 15, background: C.white, textAlign: "center" }} />
              {err && <div style={{ color: C.danger, fontSize: 12, marginTop: 6, textAlign: "center" }}>비밀코드가 달라요. 다시 시도해보세요!</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <PxButton tone="ink" onClick={onClose} style={{ flex: 1, padding: 9, fontSize: 13 }}>돌아가기</PxButton>
                <PxButton tone="good" disabled={!code.trim()} onClick={submit} style={{ flex: 1, padding: 9, fontSize: 13 }}>확인</PxButton>
              </div>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ======================= 멀티플레이 (Supabase Realtime) ======================= */
const SUPA_URL = "https://fbemzeslbvweojmgvohv.supabase.co";
const SUPA_KEY = "sb_publishable_dErg2UZWZQjifyAgO5-ejg_5AH563FV";
const MY_ID = Math.random().toString(36).slice(2, 10);

/* ======================= DB (Supabase 저장) ======================= */
let _supa = null;
async function getSupa() {
  if (_supa) return _supa;
  const mod = await import(/* @vite-ignore */ "https://esm.sh/@supabase/supabase-js@2");
  _supa = mod.createClient(SUPA_URL, SUPA_KEY);
  return _supa;
}
async function dbSaveProfile(name, data) {
  if (!name) return false;
  try {
    const s = await getSupa();
    const { error } = await s.from("saves").upsert({ name, data, updated_at: new Date().toISOString() });
    return !error;              // 서버 저장 성공 여부를 알려줍니다
  } catch (e) { return false; }
}
async function dbLoadProfile(name) {
  if (!name) return null;
  try { const s = await getSupa(); const r = await s.from("saves").select("data").eq("name", name).maybeSingle(); return r && r.data ? r.data.data : null; } catch (e) { return null; }
}
async function dbAddRank(game, nick, score, target) {
  try { const s = await getSupa(); await s.from("rankings").insert({ game, nick, score, target: target || null }); } catch (e) {}
}
async function dbTopRanks(game, desc) {
  try {
    const s = await getSupa();
    const r = await s.from("rankings").select("nick,score,target").eq("game", game).order("score", { ascending: !desc }).limit(20);
    return (r && r.data) || [];
  } catch (e) { return []; }
}
async function dbSendMail(to, from, body, item) {
  try { const s = await getSupa(); await s.from("mail").insert({ to_name: to, from_name: from, body: body || null, item: item || null }); } catch (e) {}
}
async function dbLoadMail(to) {
  try {
    const s = await getSupa();
    const r = await s.from("mail").select("from_name,body,item,created_at").eq("to_name", to).order("created_at", { ascending: true }).limit(100);
    return ((r && r.data) || []).map((m) => ({ from: m.from_name, text: m.body, item: m.item, at: new Date(m.created_at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) }));
  } catch (e) { return []; }
}
async function dbLoadBoss() {
  try {
    const s = await getSupa();
    const r = await s.from("boss_progress").select("map_id,quest_id,cleared_by");
    const out = {};
    ((r && r.data) || []).forEach((x) => { out[x.map_id] = { ...(out[x.map_id] || {}), [x.quest_id]: x.cleared_by || true }; });
    return out;
  } catch (e) { return {}; }
}
async function dbClearBoss(mapId, questId, by) {
  try { const s = await getSupa(); await s.from("boss_progress").upsert({ map_id: mapId, quest_id: questId, cleared_by: by || null }); } catch (e) {}
}
async function dbDictList() {
  try { const s = await getSupa(); const r = await s.from("dictionary").select("word,meaning,updated_by,updated_at").order("word"); return (r && r.data) || []; } catch (e) { return []; }
}
async function dbDictSave(word, meaning, by) {
  try { const s = await getSupa(); await s.from("dictionary").upsert({ word, meaning, updated_by: by || null, updated_at: new Date().toISOString() }); return true; } catch (e) { return false; }
}
async function dbDictDelete(word) {
  try { const s = await getSupa(); await s.from("dictionary").delete().eq("word", word); } catch (e) {}
}
async function dbAllPlayers() {
  try {
    const s = await getSupa();
    const r = await s.from("saves").select("name,updated_at").order("updated_at", { ascending: false }).limit(60);
    return ((r && r.data) || []).map((x) => x.name).filter(Boolean);
  } catch (e) { return []; }
}
async function dbNotices() {
  try {
    const s = await getSupa();
    const r = await s.from("notices").select("id,type,title,body,uid,created_at").order("created_at", { ascending: false }).limit(50);
    return ((r && r.data) || [])
      .filter((n) => n.type !== "건의")   // 피드백은 게시판에 노출하지 않아요 (메뉴 안에서만)
      .map((n) => ({ id: "db" + n.id, rawId: n.id, uid: n.uid || null, type: n.type, title: n.title, body: n.body || "", date: new Date(n.created_at).toISOString().slice(0, 10) }));
  } catch (e) { return []; }
}
async function dbAddNotice(type, title, body, uid) {
  try { const s = await getSupa(); await s.from("notices").insert({ type, title, body: body || null, uid: uid || null }); } catch (e) {}
}
async function dbEditNotice(id, title, body) {
  try { const s = await getSupa(); await s.from("notices").update({ title, body: body || null }).eq("id", id); return true; } catch (e) { return false; }
}
async function dbDelNotice(id) {
  try { const s = await getSupa(); await s.from("notices").delete().eq("id", id); return true; } catch (e) { return false; }
}

function useMultiplayer(myName, posRef, facingRef, onChatRef, outfitRef, viewRef, roomPosRef, danceRef, houseRef, lookRef, carryRef, petRef, roomIdRef) {
  const [retry, setRetry] = useState(0);          // 연결이 끊기면 올라가며 재접속을 유발
  const [others, setOthers] = useState({});
  const [count, setCount] = useState(1);
  const [status, setStatus] = useState("연결 중…");
  const chRef = useRef(null);

  useEffect(() => {
    if (!myName) return;
    let alive = true;
    let sendIv = null, pruneIv = null, retryTimer = null;
    (async () => {
      try {
        const mod = await import(/* @vite-ignore */ "https://esm.sh/@supabase/supabase-js@2");
        if (!alive) return;
        const client = mod.createClient(SUPA_URL, SUPA_KEY, { realtime: { params: { eventsPerSecond: 12 } } });
        const ch = client.channel("echo-town", { config: { presence: { key: MY_ID } } });
        chRef.current = ch;

        ch.on("presence", { event: "sync" }, () => {
          const st = ch.presenceState();
          setCount(Object.keys(st).length || 1);
        });
        ch.on("broadcast", { event: "pos" }, ({ payload }) => {
          if (!payload || payload.id === MY_ID) return;
          setOthers((o) => ({ ...o, [payload.id]: { ...(o[payload.id] || {}), ...payload, ts: Date.now() } }));
        });
        ch.on("broadcast", { event: "chat" }, ({ payload }) => {
          if (!payload) return;
          if (payload.id === MY_ID) return;   // 내가 보낸 건 이미 화면에 있어요 (중복 방지)
          if (onChatRef && onChatRef.current) onChatRef.current(payload);
          const bid = Date.now() + Math.random();
          setOthers((o) => ({ ...o, [payload.id]: { ...(o[payload.id] || { id: payload.id, name: payload.name, x: 0, y: 0 }), bubble: String(payload.text || "").slice(0, 50), bubbleId: bid, ts: Date.now() } }));
          setTimeout(() => setOthers((o) => (o[payload.id] && o[payload.id].bubbleId === bid ? { ...o, [payload.id]: { ...o[payload.id], bubble: null } } : o)), 3600);
        });
        ch.on("broadcast", { event: "mail" }, ({ payload }) => {
          if (onChatRef && onChatRef.net) onChatRef.net("mail", payload);
        });
        ch.on("broadcast", { event: "bell" }, ({ payload }) => {
          if (onChatRef && onChatRef.net) onChatRef.net("bell", payload);
        });
        ch.on("broadcast", { event: "qchat" }, ({ payload }) => {
          if (onChatRef && onChatRef.net) onChatRef.net("qchat", payload);
        });
        ch.on("broadcast", { event: "qparty" }, ({ payload }) => {
          if (onChatRef && onChatRef.net) onChatRef.net("qparty", payload);
        });
        ch.on("broadcast", { event: "qlock" }, ({ payload }) => {
          if (onChatRef && onChatRef.net) onChatRef.net("qlock", payload);
        });
        ch.on("broadcast", { event: "qleave" }, ({ payload }) => {
          if (onChatRef && onChatRef.net) onChatRef.net("qleave", payload);
        });
        ch.on("broadcast", { event: "pwtry" }, ({ payload }) => {
          if (onChatRef && onChatRef.net) onChatRef.net("pwtry", payload);
        });
        ch.on("broadcast", { event: "invite" }, ({ payload }) => {
          if (onChatRef && onChatRef.net) onChatRef.net("invite", payload);
        });
        ch.on("broadcast", { event: "inviteack" }, ({ payload }) => {
          if (onChatRef && onChatRef.net) onChatRef.net("inviteack", payload);
        });
        ch.on("broadcast", { event: "dict" }, ({ payload }) => {
          if (onChatRef && onChatRef.net) onChatRef.net("dict", payload);
        });
        ch.on("broadcast", { event: "dictreq" }, ({ payload }) => {
          if (onChatRef && onChatRef.net) onChatRef.net("dictreq", payload);
        });
        ch.on("broadcast", { event: "dictres" }, ({ payload }) => {
          if (onChatRef && onChatRef.net) onChatRef.net("dictres", payload);
        });
        ch.on("broadcast", { event: "shr" }, ({ payload }) => {
          if (onChatRef && onChatRef.net) onChatRef.net("shr", payload);
        });
        ch.on("broadcast", { event: "rec" }, ({ payload }) => {
          if (onChatRef && onChatRef.net) onChatRef.net("rec", payload);
        });
        ch.on("broadcast", { event: "reel" }, ({ payload }) => {
          if (onChatRef && onChatRef.net) onChatRef.net("reel", payload);
        });
        ch.on("broadcast", { event: "schat" }, ({ payload }) => {
          if (onChatRef && onChatRef.net) onChatRef.net("schat", payload);
        });
        ch.on("broadcast", { event: "worry" }, ({ payload }) => {
          if (onChatRef && onChatRef.net) onChatRef.net("worry", payload);
        });
        ch.on("broadcast", { event: "lg" }, ({ payload }) => {
          if (onChatRef && onChatRef.net) onChatRef.net("lg", payload);
        });
        ch.on("broadcast", { event: "fb" }, ({ payload }) => {
          if (onChatRef && onChatRef.net) onChatRef.net("fb", payload);
        });
        ch.on("broadcast", { event: "bmap" }, ({ payload }) => {
          if (onChatRef && onChatRef.net) onChatRef.net("bmap", payload);
        });
        ch.on("broadcast", { event: "gal" }, ({ payload }) => {
          if (onChatRef && onChatRef.net) onChatRef.net("gal", payload);
        });
        ch.on("broadcast", { event: "mchat" }, ({ payload }) => {
          if (onChatRef && onChatRef.net) onChatRef.net("mchat", payload);
        });
        ch.on("broadcast", { event: "dm" }, ({ payload }) => {
          if (onChatRef && onChatRef.net) onChatRef.net("dm", payload);
        });
        ch.on("broadcast", { event: "call" }, ({ payload }) => {
          if (onChatRef && onChatRef.net) onChatRef.net("call", payload);
        });
        ch.on("broadcast", { event: "door" }, ({ payload }) => {
          if (onChatRef && onChatRef.net) onChatRef.net("door", payload);
        });
        ch.on("broadcast", { event: "bye" }, ({ payload }) => {
          if (!payload) return;
          setOthers((o) => { const n = { ...o }; delete n[payload.id]; return n; });
        });

        await ch.subscribe(async (st) => {
          if (!alive) return;
          // 연결이 끊기면 다시 붙습니다 (예전엔 끊긴 채로 방치돼 서로 안 보였어요)
          if (st === "CHANNEL_ERROR" || st === "TIMED_OUT" || st === "CLOSED") {
            setStatus("재접속 중…");
            if (sendIv) { clearInterval(sendIv); sendIv = null; }
            clearTimeout(retryTimer);
            retryTimer = setTimeout(() => { if (alive) setRetry((r) => r + 1); }, 2000);
            return;
          }
          if (st === "SUBSCRIBED") {
            setStatus("접속됨");
            await ch.track({ name: myName });
            sendIv = setInterval(() => {
              const p = posRef.current || { x: 0, y: 0 };
              ch.send({ type: "broadcast", event: "pos", payload: (() => {
                const of = (outfitRef && outfitRef.current) || {};
                const rp = (roomPosRef && roomPosRef.current) || { x: 0, y: 0 };
                return { id: MY_ID, name: myName, x: Math.round(p.x), y: Math.round(p.y), f: facingRef.current || 1,
                  v: (viewRef && viewRef.current) || "world", rx: Math.round(rp.x), ry: Math.round(rp.y),
                  dm: (danceRef && danceRef.current) || null,
                  hs: (houseRef && houseRef.current) ? { r: houseRef.current.roof, w: houseRef.current.wall } : null,
                  lk: (lookRef && lookRef.current) || null,
                  cy: (carryRef && carryRef.current) ? (carryRef.current.emoji || "🎁") : null,
                  pt: (petRef && petRef.current) || null,
                  rm: (roomIdRef && roomIdRef.current) || null,
                  oc: [of.top ? of.top.color : null, of.bottom ? of.bottom.color : null, of.shoes ? of.shoes.color : null] };
              })() });
            }, 160);
          } else if (st === "CHANNEL_ERROR" || st === "TIMED_OUT") {
            setStatus("연결 실패");
          }
        });

        pruneIv = setInterval(() => {
          const now = Date.now();
          setOthers((o) => {
            const n = {}; let changed = false;
            Object.entries(o).forEach(([k, v]) => { if (now - v.ts < 8000) n[k] = v; else changed = true; });
            return changed ? n : o;
          });
        }, 3000);
      } catch (e) {
        setStatus("재접속 중…");
        retryTimer = setTimeout(() => { if (alive) setRetry((r) => r + 1); }, 4000);
      }
    })();

    return () => {
      alive = false;
      if (sendIv) clearInterval(sendIv);
      if (pruneIv) clearInterval(pruneIv);
      if (retryTimer) clearTimeout(retryTimer);
      const ch = chRef.current;
      if (ch) { try { ch.send({ type: "broadcast", event: "bye", payload: { id: MY_ID } }); ch.unsubscribe(); } catch (e) {} }
    };
  }, [myName, retry]);

  const sendEvent = useCallback((kind, payload) => {
    const ch = chRef.current;
    if (!ch) return;
    try { ch.send({ type: "broadcast", event: kind, payload }); } catch (e) {}
  }, []);
  /* 다른 탭 갔다 오거나 인터넷이 끊겼다 돌아오면 바로 재접속 */
  useEffect(() => {
    const kick = () => setRetry((r) => r + 1);
    const onVis = () => { if (!document.hidden) kick(); };
    window.addEventListener("online", kick);
    document.addEventListener("visibilitychange", onVis);
    return () => { window.removeEventListener("online", kick); document.removeEventListener("visibilitychange", onVis); };
  }, []);
  const reconnect = useCallback(() => setRetry((r) => r + 1), []);

  const sendChat = useCallback((text, shout) => {
    const ch = chRef.current;
    if (!ch || !text) return;
    try { ch.send({ type: "broadcast", event: "chat", payload: { id: MY_ID, name: myName, text, shout: !!shout } }); } catch (e) {}
  }, [myName]);

  return { others, count, status, sendChat, sendEvent, reconnect };
}

function WorldView({ pos, setPos, day, gems, sprites = {}, cutCfg = {}, look = null, carry = null, pet = null, shuffle = false, onShuffle, onNextTrack, onPrevTrack, onReconnect, onDismount, rentedHouses, onEnter, onNextDay, bgm, onToggleBgm, onRequestSong, bubble, townRain = false, cmRain = false, tracks = [], onSelectTrack, outfit = null, vehicle = null, houseSkin = null, isMyHouse = () => false, others = {}, netCount = 1, netStatus = "", facingRef = null, bgmVol = 0.6, onBgmVol = null, danceRef = null, onGift = null, myNick = "" }) {
  const [songOpen, setSongOpen] = useState(false);
  const [teleport, setTeleport] = useState(null);
  const [whoOpen, setWhoOpen] = useState(false);
  const vehicleRef = useRef(vehicle);
  vehicleRef.current = vehicle;
  const [facing, setFacing] = useState(1);
  const [moving, setMoving] = useState(false);
  const [near, setNear] = useState(null);
  const [dialog, setDialog] = useState(null);   // NPC 대화 {label,lines,shown}
  const [guardOpen, setGuardOpen] = useState(false);
  const [passed, setPassed] = useState(() => !!loadJSON("echotown_airpass", false));
  const passRef = useRef(false);
  passRef.current = passed;  // NPC 대화 {label,lines,shown}
  const [hint, setHint] = useState(true);        // "클릭하면 이동" 안내
  const [danceMove, setDanceMove] = useState(null);
  const [followId, setFollowId] = useState(null);        // 🏃 따라갈 친구
  const followRef = useRef(null);
  followRef.current = followId ? (others[followId] || null) : null;
  /* 🏃 찾아가기 : 그 사람 바로 옆으로 순간이동 */
  const goTo = (o) => {
    if (!o) return;
    if (o.v && o.v !== "world") { setToast2(`${o.name}님은 지금 마을에 없어요 (${o.v})`); setTimeout(() => setToast2(null), 1800); return; }
    const nx = Math.max(30, Math.min(WORLD.w - 30, (o.x || 0) + 46));
    const ny = Math.max(40, Math.min(WORLD.h - 30, o.y || 0));
    posRef.current = { x: nx, y: ny };
    setPos({ x: nx, y: ny });
    setWhoOpen(false);
    setToast2(`🏃 ${o.name}님에게 찾아왔어요!`);
    setTimeout(() => setToast2(null), 1600);
  };
  const [toast2, setToast2] = useState(null);
  const [picked, setPicked] = useState(null);   // 클릭한 상대 (따라가기/선물)
  useEffect(() => { if (danceRef) danceRef.current = danceMove; }, [danceMove, danceRef]);
  const [danceMenu, setDanceMenu] = useState(false);
  const DANCE_MOVES = [
    { key: "sway", label: "🕺 좌우 흔들기" },
    { key: "twerk", label: "🍑 엉덩이 흔들기" },
    { key: "jump", label: "⬆️ 폴짝폴짝" },
    { key: "spin", label: "🌀 빙글 회전" },
    { key: "shake", label: "💥 파르르" },
  ];        // "클릭하면 이동" 안내
  const [reqOpen, setReqOpen] = useState(false); // 신청곡 모달
  const [reqText, setReqText] = useState("");
  const vpRef = useRef(null);
  const [vp, setVp] = useState({ w: 900, h: 480 });
  const keys = useRef({});
  const posRef = useRef(pos);
  const nearRef = useRef(null);
  const hintRef = useRef(true);
  const dialogTimer = useRef(null);

  const startDialog = (o) => {
    clearTimeout(dialogTimer.current);
    setDialog({ label: o.label, lines: o.lines, shown: 1 });
    dialogTimer.current = setTimeout(() => setDialog((d) => (d ? { ...d, shown: Math.min(d.lines.length, 2) } : d)), 1000);
  };
  const handleObj = (o) => { if (!o) return; if (o.kind === "airport") { setGuardOpen(true); return; } if (o.kind === "npc") { startDialog(o); return; } onEnter(o); };
  const handleRef = useRef(handleObj);
  handleRef.current = handleObj;

  const focusGame = () => { if (vpRef.current) vpRef.current.focus(); if (hintRef.current) { hintRef.current = false; setHint(false); } };

  // 뷰포트 크기 측정 + 자동 포커스(방향키 즉시 반응)
  useEffect(() => {
    const measure = () => { if (vpRef.current) setVp({ w: vpRef.current.clientWidth, h: 480 }); };
    measure();
    if (vpRef.current) vpRef.current.focus();
    window.addEventListener("resize", measure);
    return () => { window.removeEventListener("resize", measure); clearTimeout(dialogTimer.current); };
  }, []);

  useEffect(() => {
    const norm = (k) => (k.length === 1 ? k.toLowerCase() : k);
    const down = (e) => {
      if (isTyping(e)) return;
      const raw = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d"].includes(raw)) e.preventDefault();
      if (hintRef.current) { hintRef.current = false; setHint(false); }
      const k = norm(e.key);
      if (k === " ") {
        const n = nearRef.current;
        if (n) handleRef.current(n);
        return;
      }
      keys.current[k] = true;
    };
    const up = (e) => { keys.current[norm(e.key)] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  useEffect(() => {
    let raf, last = performance.now();
    const loop = (now) => {
      try {
      // 화면 주사율이 낮은 기기에서도 같은 속도가 나오도록 '초 단위'로 이동합니다
      const t = now || performance.now();
      const dt = Math.min(0.05, Math.max(0, (t - last) / 1000));
      last = t;
      const SPEED = 210 * dt * ((vehicleRef.current && vehicleRef.current.speed) || 1);
      const k = keys.current;
      let { x, y } = posRef.current;
      let dx = 0, dy = 0;
      if (k["ArrowLeft"] || k["a"]) dx -= 1;
      if (k["ArrowRight"] || k["d"]) dx += 1;
      if (k["ArrowUp"] || k["w"]) dy -= 1;
      if (k["ArrowDown"] || k["s"]) dy += 1;
      // 🏃 따라가기 : 키 입력이 없으면 친구 쪽으로 자동 이동 (70px 이내면 멈춤)
      const fo = followRef.current;
      if (!dx && !dy && fo && fo.v === "world") {
        const gx = fo.x - x, gy = fo.y - y;
        const gd = Math.hypot(gx, gy);
        if (gd > 70) { dx = gx / gd; dy = gy / gd; }
      }
      if (dx || dy) {
        const px = posRef.current.x;
        const len = Math.hypot(dx, dy) || 1;
        x += (dx / len) * SPEED; y += (dy / len) * SPEED;
        x = Math.max(30, Math.min(WORLD.w - 30, x));
        y = Math.max(40, Math.min(WORLD.h - 30, y));
        // 강: 다리(BRIDGE_Y1~Y2)에서 + 통행코드 통과 시에만 건널 수 있음
        const canCross = (y >= BRIDGE_Y1 && y <= BRIDGE_Y2) && passRef.current;
        if (!canCross) {
          const L = RIVER_X - 6, R = RIVER_X + RIVER_W + 6;
          if (x > L && x < R) x = px <= L ? L : R;
        }
        posRef.current = { x, y }; setPos({ x, y });
        if (dx < 0) setFacing(-1); else if (dx > 0) setFacing(1);
      }
      setMoving(Boolean(dx || dy));
      let found = null, best = Infinity;
      for (const o of WORLD_OBJS) {
        if (!o.r) continue;
        const d = Math.hypot(x - o.x, y - (o.y + 20));
        const reach = o.r * (vehicleRef.current ? 1.55 : 1);   // 탈것을 타면 조준이 쉽도록 넉넉하게
        if (d < reach && d < best) { best = d; found = o; }
      }
      const key = found ? found.id : null;
      const prev = nearRef.current ? nearRef.current.id : null;
      if (key !== prev) { nearRef.current = found; setNear(found); }
      } catch (err) { console.error("[WorldView] loop error:", err); } finally { raf = requestAnimationFrame(loop); }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [setPos]);

  // 카메라 오프셋(플레이어 중심, 경계 클램프)
  const camX = Math.max(0, Math.min(WORLD.w - vp.w, pos.x - vp.w / 2));
  const camY = Math.max(0, Math.min(WORLD.h - vp.h, pos.y - vp.h / 2));

  const spriteFor = (o) => {
    const custom = sprites && sprites[o.id];
    if (custom) {
      const cfg = (cutCfg && cutCfg[o.id]) || {};
      const cut = cfg.cut !== undefined ? cfg.cut : true;
      const tol = cfg.tol !== undefined ? cfg.tol : 32;
      return <AutoSprite src={custom} cut={cut} tol={tol} width={spriteSize(o)} alt={o.label} />;
    }
    if (o.id === "project") return <Board size={110} />;
    if (o.kind === "shrine") return <QuestShrine size={160} />;
    if (o.kind === "airport") return <Airport size={96} tint={o.side === "cm" ? "#3fa07a" : "#5b8def"} tintDk={o.side === "cm" ? "#1d6b4a" : "#3a5fa8"} label={o.side === "cm" ? "치앙마이" : "인천"} />;
    if (o.id === "coredict") return <BookIcon size={104} />;
    if (o.id === "sandbag") return <Sandbag size={92} />;
    if (o.id === "naverschool") return <School wall="#bfe3c8" roof="#2db400" size={140} />;
    if (o.id === "videoschool") return <School wall="#e7cfe9" roof="#8e5a9e" size={140} />;
    switch (o.kind) {
      case "center": return <Villa size={230} />;
      case "bank": return <PixelBank size={150} />;
      case "board": return <Board size={120} />;
      case "big": return <BigBuilding color={o.meta.color} colorDk={o.meta.colorDk} size={150} />;
      case "house": {
        const owner = o.meta.owner || (o.meta.name || "").replace(/이네$|네$/, "");
        const mine = isMyHouse(o.meta.name);
        let sk = mine && houseSkin ? { roof: houseSkin.roof, wall: houseSkin.wall } : null;
        if (!sk) {
          const op = Object.values(others).find((p) => p.hs && p.name === owner);
          if (op) sk = { roof: op.hs.r, wall: op.hs.w };
        }
        return <PixelHouse roof={sk ? sk.roof : o.meta.roof} roofDk={sk ? sk.roof : o.meta.roofDk} wall={sk ? sk.wall : o.meta.wall} size={110} />;
      }
      case "small": return <SmallHut tint={o.tint} size={100} />;
      case "facility": return <Facility color={o.color} colorDk={o.colorDk} icon={o.icon} size={160} />;
      case "sign": return <Signpost size={100} />;
      case "npc": return o.npc === "statue" ? <Statue size={72} /> : o.npc === "never" ? <LetterN size={82} /> : <ManBong size={48} />;
      case "rent": return <PixelHouse roof={o.meta.roof} roofDk={o.meta.roofDk} wall={o.meta.wall} size={104} />;
      default: return null;
    }
  };

  return (
    <Panel style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: `3px solid ${C.parchEdge}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <b style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10 }}>ECHO TOWN</b>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", background: "#241a33", color: "#ffe680", border: `2px solid ${C.ink}`, padding: "4px 8px" }}>
          <span className={bgm.playing ? "gem-spin" : ""} style={{ fontSize: 15 }}>♬</span>
          <div style={{ position: "relative" }}>
            <button onClick={() => setSongOpen((v) => !v)} style={{ background: "none", border: "none", color: "#ffe680", fontSize: 12, fontWeight: "bold", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>{bgm.title} ▾</button>
            {songOpen && (
              <div style={{ position: "absolute", top: "120%", left: 0, background: C.parch, border: `2px solid ${C.ink}`, zIndex: 30, minWidth: 160, maxHeight: 220, overflowY: "auto", boxShadow: `0 3px 0 ${C.parchEdge}` }}>
                {tracks.map((t) => (
                  <button key={t.file} onClick={() => { onSelectTrack && onSelectTrack(t); setSongOpen(false); }} style={{ display: "block", width: "100%", textAlign: "left", background: t.title === bgm.title ? C.gem : "transparent", border: "none", borderBottom: `1px solid ${C.parchEdge}`, color: C.ink, fontSize: 12, padding: "7px 10px", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{t.title}</button>
                ))}
              </div>
            )}
          </div>
          <PxButton tone="wood" onClick={onPrevTrack} title="이전 곡" style={{ fontSize: 11, padding: "3px 7px" }}>⏮</PxButton>
          <PxButton tone="gold" onClick={onToggleBgm} style={{ fontSize: 11, padding: "3px 8px" }}>{bgm.playing ? "⏸" : "▶"}</PxButton>
          <PxButton tone="wood" onClick={onNextTrack} title="다음 곡" style={{ fontSize: 11, padding: "3px 7px" }}>⏭</PxButton>
          <PxButton tone={shuffle ? "good" : "wood"} onClick={onShuffle} title={shuffle ? "셔플 켜짐 — 무작위 재생" : "셔플 (아무 곡이나 재생)"} style={{ fontSize: 11, padding: "3px 8px" }}>🔀{shuffle ? " ON" : ""}</PxButton>
          <span style={{ fontSize: 12 }}>🔊</span>
          <input type="range" min="0" max="100" value={Math.round(bgmVol * 100)} onChange={(e) => onBgmVol && onBgmVol(Number(e.target.value) / 100)} title="배경음 볼륨" style={{ width: 70, accentColor: "#ffe680", cursor: "pointer" }} />
          <PxButton tone="blue" onClick={() => setReqOpen(true)} style={{ fontSize: 11, padding: "3px 8px" }}>🎵 신청곡(🪙5)</PxButton>
        </div>
      </div>

      <div ref={vpRef} tabIndex={0} onMouseDown={focusGame} className="game-vp" style={{ position: "relative", height: 480, overflow: "hidden", outline: "none",
        background: `repeating-linear-gradient(0deg, ${C.grass} 0 22px, ${C.grassDark} 22px 44px)` }}>
        {/* 월드(카메라 이동) */}
        <div style={{ position: "absolute", width: WORLD.w, height: WORLD.h, left: -camX, top: -camY }}>
          {/* 흙길: 중앙 광장 십자 */}
          <div style={{ position: "absolute", left: 1290, top: 0, width: 44, height: WORLD.h, background: `repeating-linear-gradient(0deg, ${C.path} 0 10px, ${C.pathDark} 10px 20px)` }} />
          <div style={{ position: "absolute", top: 720, left: 0, width: WORLD.w, height: 44, background: `repeating-linear-gradient(90deg, ${C.path} 0 10px, ${C.pathDark} 10px 20px)` }} />

          {/* 강 + 다리(다리에서만 건널 수 있음) */}
          <div style={{ position: "absolute", left: RIVER_X, top: 0, width: RIVER_W, height: WORLD.h,
            background: `repeating-linear-gradient(0deg, ${C.water} 0 14px, ${C.waterDk} 14px 28px)`, borderLeft: `4px solid ${C.waterDk}`, borderRight: `4px solid ${C.waterDk}` }} />
          <div style={{ position: "absolute", left: RIVER_X - 10, top: BRIDGE_Y1, width: RIVER_W + 20, height: BRIDGE_Y2 - BRIDGE_Y1,
            background: `repeating-linear-gradient(90deg, ${C.wood} 0 12px, ${C.woodDark} 12px 24px)`, border: `3px solid ${C.woodDark}`, boxShadow: "inset 0 0 0 3px rgba(0,0,0,0.15)" }} />
          <div style={{ position: "absolute", left: RIVER_X - 4, top: BRIDGE_Y1 - 16, fontSize: 11, color: C.white, background: C.woodDark, border: `2px solid ${C.ink}`, padding: "1px 5px" }}>🌉 다리</div>
          <div style={{ position: "absolute", left: RIVER_X + RIVER_W + 20, top: 560, fontSize: 12, color: C.white, background: C.villaDk, border: `2px solid ${C.ink}`, padding: "3px 8px" }}>🌴 CHIANG MAI</div>

          {/* 주민센터 기준 방향 표지판 (방향어 없이 목적지만) */}
          <div style={{ position: "absolute", left: 1300, top: 636, transform: "translate(-50%,-100%)", pointerEvents: "none" }}><DirSign text="업무(대형건물)" color={C.bankRoof} /></div>
          <div style={{ position: "absolute", left: 1300, top: 892, transform: "translate(-50%,0)", pointerEvents: "none" }}><DirSign text="수영장/헬스장" color={C.danger} /></div>
          <div style={{ position: "absolute", left: 1118, top: 772, transform: "translate(-50%,-50%)", pointerEvents: "none" }}><DirSign text="은행/개인집" color={C.wood} /></div>
          <div style={{ position: "absolute", left: 1492, top: 772, transform: "translate(-50%,-50%)", pointerEvents: "none" }}><DirSign text="사이드/치앙마이" color={C.good} /></div>

          {/* 장식 나무 */}
          {[[300, 400], [340, 1250], [1150, 1300], [1700, 400], [2050, 1250], [880, 200]].map(([tx, ty], i) => (
            <div key={i} style={{ position: "absolute", left: tx, top: ty }}>
              <DecoSprite id="tree" size={46} sprites={sprites} cutCfg={cutCfg}><Tree /></DecoSprite>
            </div>
          ))}

          {/* 🌴 치앙마이 야자수 (강 건너) */}
          {[[2330, 540, 86], [2565, 650, 74], [2310, 1210, 80], [2560, 1180, 70]].map(([tx, ty, sz], i) => (
            <div key={"palm" + i} style={{ position: "absolute", left: tx, top: ty, transform: "translate(-50%,-100%)" }}>
              <DecoSprite id="palm" size={sz} sprites={sprites} cutCfg={cutCfg}><PalmTree size={sz} /></DecoSprite>
            </div>
          ))}

          {/* 건물들 */}
          {WORLD_OBJS.map((o) => (
            <button key={o.id} className={o.r ? "map-obj" : ""} disabled={!o.r}
              onClick={() => o.r && handleObj(o)}
              style={{ position: "absolute", left: o.x, top: o.y, transform: "translate(-50%,-50%)", background: "none", border: "none", cursor: o.r ? "pointer" : "default", textAlign: "center", padding: 0 }}>
              {spriteFor(o)}
              <div style={{ marginTop: -6 }}>
                <span style={{ display: "inline-block", background: o.kind === "center" ? C.ink : C.parch, color: o.kind === "center" ? C.gem : C.ink, fontSize: 11, padding: "3px 7px", border: `2px solid ${C.ink}`, whiteSpace: "nowrap" }}>
                  {o.label}{o.kind === "rent" && rentedHouses[o.id] ? " ✅" : ""}
                </span>
              </div>
            </button>
          ))}

          {/* 비 효과 (마을 / 치앙마이 각각) */}

          {/* 다른 접속자 */}
          {Object.values(others).filter((o) => (o.v || "world") === "world").map((o) => (
            <div key={o.id} onClick={() => setPicked(o.id)} title={`${o.name} — 눌러서 메뉴 열기`} style={{ position: "absolute", left: o.x, top: o.y, transform: "translate(-50%,-100%)", zIndex: 17, opacity: 0.95, transition: "left .18s linear, top .18s linear", cursor: "pointer" }}>
              {o.bubble && (
                <div className="chat-bubble" style={{ position: "absolute", bottom: "150%", left: "50%", transform: "translateX(-50%)", whiteSpace: "normal", wordBreak: "break-word", width: "max-content", maxWidth: 190, lineHeight: 1.4, textAlign: "center", background: C.white, color: C.ink, border: `2px solid ${C.ink}`, borderRadius: 8, fontSize: 12, padding: "4px 8px", boxShadow: `0 2px 0 ${C.parchEdge}` }}>{o.bubble}</div>
              )}
              <div style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 3, whiteSpace: "nowrap", background: "#5b8def", color: "#fff", border: `2px solid ${C.ink}`, fontSize: 10, padding: "1px 6px" }}>{o.name}</div>
              <div className={o.dm ? "dance-" + o.dm : ""} style={{ transformOrigin: "bottom center" }}>
                <Hero facing={o.f || 1} moving={false} size={34} look={o.lk} pet={o.pt} carry={o.cy ? { emoji: o.cy } : null} outfit={o.oc ? { top: o.oc[0] ? { color: o.oc[0] } : null, bottom: o.oc[1] ? { color: o.oc[1] } : null, shoes: o.oc[2] ? { color: o.oc[2] } : null } : null} />
              </div>
            </div>
          ))}

          {/* 플레이어 */}
          <div style={{ position: "absolute", left: pos.x, top: pos.y, transform: "translate(-50%,-70%)", zIndex: 20, pointerEvents: "none" }}>
            {bubble && (
              <div className="chat-bubble" style={{ position: "absolute", bottom: "112%", left: "50%", transform: "translateX(-50%)", whiteSpace: "normal", wordBreak: "break-word", width: "max-content", maxWidth: 200, lineHeight: 1.4, textAlign: "center", background: C.white, color: C.ink, border: `2px solid ${C.ink}`, borderRadius: 8, fontSize: 12, padding: "4px 8px", boxShadow: `0 2px 0 ${C.parchEdge}` }}>
                {bubble}
              </div>
            )}
            {near && !bubble && (
              <div className="enter-prompt" style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 4, whiteSpace: "nowrap", background: C.ink, color: C.gem, border: `2px solid ${C.gem}`, fontSize: 11, padding: "3px 7px" }}>
                {near.kind === "npc" ? "💬 Space" : "🚪 Space"} · {near.label}
              </div>
            )}
            <div className={danceMove ? "dance-" + danceMove : ""} style={{ transformOrigin: "bottom center" }}>
              <Hero facing={facing} moving={moving} size={36} outfit={outfit} look={look} carry={carry} pet={pet} />
              {vehicle && <div style={{ position: "absolute", left: "50%", bottom: -6, transform: "translateX(-50%)", fontSize: 20 }}>{vehicle.emoji}</div>}
            </div>
          </div>
        </div>

        {picked && others[picked] && (
          <div onClick={() => setPicked(null)} style={{ position: "absolute", inset: 0, zIndex: 30, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: C.parch, border: `4px solid ${C.ink}`, borderRadius: 14, padding: 18, width: "min(280px, 86%)", boxShadow: "0 10px 26px rgba(0,0,0,0.45)" }}>
              <div style={{ textAlign: "center", fontSize: 30 }}>🧑</div>
              <div style={{ textAlign: "center", fontSize: 16, fontWeight: "bold", margin: "6px 0 14px" }}>{others[picked].name}</div>
              <PxButton tone={followId === picked ? "danger" : "good"} onClick={() => { setFollowId(followId === picked ? null : picked); setPicked(null); }} style={{ width: "100%", padding: 11, fontSize: 13 }}>
                {followId === picked ? "🛑 따라가기 멈춤" : "🏃 따라가기"}
              </PxButton>
              <PxButton tone="blue" onClick={() => { goTo(others[picked]); setPicked(null); }} style={{ width: "100%", padding: 10, fontSize: 13, marginTop: 7 }}>📍 찾아가기 (바로 이동)</PxButton>
              <PxButton tone="gold" onClick={() => { const n = others[picked].name; setPicked(null); onGift && onGift(n); }} style={{ width: "100%", padding: 10, fontSize: 13, marginTop: 7 }}>🎁 선물하기</PxButton>
              <PxButton tone="ink" onClick={() => setPicked(null)} style={{ width: "100%", padding: 9, fontSize: 12, marginTop: 7 }}>닫기</PxButton>
            </div>
          </div>
        )}
        {toast2 && (
          <div style={{ position: "absolute", left: "50%", top: 56, transform: "translateX(-50%)", zIndex: 28, background: C.ink, color: C.gem, border: `2px solid ${C.gem}`, borderRadius: 20, padding: "7px 16px", fontSize: 12.5, fontFamily: "'DotGothic16', monospace" }}>{toast2}</div>
        )}
        {followId && others[followId] && (
          <div style={{ position: "absolute", left: "50%", top: 56, transform: "translateX(-50%)", zIndex: 26, background: C.ink, color: C.gem, border: `2px solid ${C.gem}`, borderRadius: 20, padding: "6px 14px", fontSize: 12, fontFamily: "'DotGothic16', monospace", display: "flex", alignItems: "center", gap: 8 }}>
            🏃 {others[followId].name} 따라가는 중
            <button onClick={() => setFollowId(null)} style={{ background: C.danger, color: C.white, border: `2px solid ${C.gem}`, borderRadius: 10, cursor: "pointer", fontSize: 10.5, padding: "2px 8px", fontFamily: "inherit" }}>멈춤</button>
          </div>
        )}

        {/* 🌧 내가 있는 지역에 비가 오면 화면 위에 빗줄기 */}
        {(pos.x >= RIVER_X ? cmRain : townRain) && <RainLayer height={480} />}

        {/* 처음 이동 안내 */}
        {hint && (
          <div style={{ position: "absolute", left: 10, bottom: 10, background: C.ink, color: C.gem, border: `2px solid ${C.gem}`, fontSize: 11, padding: "5px 9px", zIndex: 15 }}>
            👆 화면을 한 번 클릭하면 방향키로 바로 움직여요
          </div>
        )}

        {/* HUD 오버레이: 날짜 */}
        <div style={{ position: "absolute", right: 10, top: 10, display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setWhoOpen((v) => !v)} title="접속자 보기" style={{ position: "relative", cursor: "pointer", background: netStatus === "접속됨" ? "#2f9e6e" : C.ink, color: C.white, fontSize: 12, padding: "5px 9px", border: `2px solid ${C.gem}`, fontFamily: "'DotGothic16', monospace" }}>
            👥 {netCount}
            {whoOpen && (
              <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", right: 0, top: "120%", background: C.parch, color: C.ink, border: `2px solid ${C.ink}`, borderRadius: 8, padding: 8, minWidth: 130, zIndex: 40, textAlign: "left", boxShadow: `0 3px 0 ${C.parchEdge}` }}>
                <div style={{ fontSize: 10, color: C.inkSoft, marginBottom: 4 }}>접속 중</div>
                <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 2 }}>🟢 {myNick || "나"} (나)</div>
                {Object.values(others).map((o) => (
                  <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ flex: 1, fontSize: 12, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>🟢 {o.name}</span>
                    <button onClick={() => goTo(o)} title={`${o.name}님에게 찾아가기`}
                      style={{ cursor: "pointer", background: C.gem, border: `2px solid ${C.ink}`, borderRadius: 8, fontSize: 15, padding: "2px 8px", lineHeight: 1.4 }}>🏃</button>
                  </div>
                ))}
                {Object.keys(others).length === 0 && <div style={{ fontSize: 11, color: C.inkSoft }}>아직 다른 주민이 없어요</div>}
                <div style={{ borderTop: `2px solid ${C.parchEdge}`, marginTop: 6, paddingTop: 6 }}>
                  <div style={{ fontSize: 10.5, color: netStatus === "접속됨" ? C.good : C.danger, fontWeight: "bold", marginBottom: 5 }}>
                    {netStatus === "접속됨" ? "🟢 연결됨" : `🔴 ${netStatus || "연결 안 됨"}`}
                  </div>
                  <PxButton tone="blue" onClick={() => onReconnect && onReconnect()} style={{ width: "100%", fontSize: 11, padding: "6px 8px" }}>🔄 다시 연결</PxButton>
                  <div style={{ fontSize: 9.5, color: C.inkSoft, marginTop: 4, lineHeight: 1.5 }}>서로 안 보이면 눌러보세요</div>
                </div>
              </div>
            )}
          </button>
          {vehicle && (
            <PxButton tone="danger" onClick={() => onDismount && onDismount()} title="탈것에서 내리기" style={{ fontSize: 11, padding: "6px 9px" }}>
              {vehicle.emoji || "🛵"} 내리기
            </PxButton>
          )}
          <div style={{ position: "relative" }}>
            <PxButton tone={danceMove ? "good" : "gold"} onClick={() => setDanceMenu((v) => !v)} style={{ fontSize: 14, padding: "5px 9px" }}>💃</PxButton>
            {danceMenu && (
              <div style={{ position: "absolute", top: "115%", right: 0, background: C.parch, border: `2px solid ${C.ink}`, zIndex: 30, minWidth: 130, boxShadow: `0 3px 0 ${C.parchEdge}` }}>
                {DANCE_MOVES.map((m) => (
                  <button key={m.key} onClick={() => { setDanceMove(m.key); setDanceMenu(false); }} style={{ display: "block", width: "100%", textAlign: "left", background: danceMove === m.key ? C.gem : "transparent", border: "none", borderBottom: `1px solid ${C.parchEdge}`, color: C.ink, fontSize: 12, padding: "7px 10px", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{m.label}</button>
                ))}
                <button onClick={() => { setDanceMove(null); setDanceMenu(false); }} style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", color: C.danger, fontSize: 12, padding: "7px 10px", cursor: "pointer", fontFamily: "inherit" }}>⏹ 멈춤</button>
              </div>
            )}
          </div>
        </div>

        <MiniMap pos={pos} onGo={(x, y, label) => {
          const nx = Math.max(30, Math.min(WORLD.w - 30, x));
          const ny = Math.max(30, Math.min(WORLD.h - 30, y));
          posRef.current = { x: nx, y: ny };
          setPos({ x: nx, y: ny });
          setTeleport(label || "");
          setTimeout(() => setTeleport(null), 1600);
        }} />
        {teleport !== null && (
          <div style={{ position: "absolute", left: "50%", top: 60, transform: "translateX(-50%)", background: C.ink, color: C.white, border: `2px solid ${C.gem}`, borderRadius: 20, padding: "6px 16px", fontSize: 12, zIndex: 20 }}>🚀 {teleport} 도착!</div>
        )}

        {guardOpen && <GuardGate passed={passed} side={pos.x >= RIVER_X ? "cm" : "town"}
          onPass={() => { setPassed(true); passRef.current = true; saveJSON("echotown_airpass", true); }}
          onCross={() => {
            const toCM = pos.x < RIVER_X;
            const nx = toCM ? RIVER_X + RIVER_W + 70 : RIVER_X - 70;   // 강 건너편 육지로
            posRef.current = { x: nx, y: 745 };
            setPos({ x: nx, y: 745 });
            setTeleport(toCM ? "치앙마이" : "에코타운");
            setTimeout(() => setTeleport(null), 1600);
          }}
          onClose={() => setGuardOpen(false)} />}

        {/* NPC 대화창 */}
        {dialog && (
          <div style={{ position: "absolute", left: "50%", bottom: 14, transform: "translateX(-50%)", width: "min(92%, 460px)", zIndex: 25 }}>
            <Panel style={{ padding: 12 }}>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, marginBottom: 6 }}>{dialog.label}</div>
              {dialog.lines.slice(0, dialog.shown).map((ln, i) => (
                <div key={i} style={{ fontSize: 14, lineHeight: 1.6 }}>💬 {ln}</div>
              ))}
              <PxButton tone="ink" onClick={() => { clearTimeout(dialogTimer.current); setDialog(null); }} style={{ marginTop: 8, fontSize: 12, padding: "6px 12px" }}>닫기</PxButton>
            </Panel>
          </div>
        )}

        {/* 신청곡 모달 */}
        {reqOpen && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30, padding: 14 }} onClick={() => setReqOpen(false)}>
  <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 360, maxHeight: "calc(100vh - 28px)", overflowY: "auto" }}>
              <Panel style={{ padding: 14 }}>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, marginBottom: 10 }}>🎵 신청곡</div>
                <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 8 }}>🪙 5골드를 사용해 마을 배경음악을 바꿔요. (보유 {fmt(gems)}🪙)</div>
                <input value={reqText} onChange={(e) => setReqText(e.target.value)} placeholder="예: NewJeans - Ditto" style={{ width: "100%", boxSizing: "border-box", padding: 9, border: `3px solid ${C.ink}`, fontFamily: "'DotGothic16', monospace", fontSize: 14, background: C.white }} />
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <PxButton tone="ink" onClick={() => setReqOpen(false)} style={{ flex: 1, padding: 10, fontSize: 13 }}>취소</PxButton>
                  <PxButton tone="gold" disabled={!reqText.trim() || gems < 5} onClick={() => { onRequestSong(reqText.trim()); setReqText(""); setReqOpen(false); }} style={{ flex: 1, padding: 10, fontSize: 13 }}>
                    {gems < 5 ? "골드 부족" : "🪙5 신청"}
                  </PxButton>
                </div>
              </Panel>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

/* ======================= 대형건물(퀘스트) ======================= */
/* ======================= 알바(담당자 리스트) ======================= */
const ALBA_NAMES = ["이진", "이름", "혜림", "강도현", "김서연", "박지후", "정민아", "최유나", "한소율", "오태경", "서지안", "노현우"];
const ALBA_QUEST_POOL = ["블로그 포스팅", "스마트스토어 상품 등록", "유튜브 영상 편집", "릴스 자막 달기", "카페 이벤트 관리", "지식인 답변", "상세페이지 디자인", "키워드 리서치", "댓글 모니터링", "월간 리포트 작성", "썸네일 제작", "고객 문의 응대"];
const ALBA_MANAGERS = ["민지", "정인", "창민", "도희"];
function albaQuests(idx) {
  const out = [];
  const n = 3 + (idx % 2);
  for (let i = 0; i < n; i++) {
    const isNew = (idx + i) % 3 === 0;
    out.push({
      id: `q${idx}_${i}`,
      title: ALBA_QUEST_POOL[(idx * 2 + i) % ALBA_QUEST_POOL.length],
      type: isNew ? "신규" : "반복",
      manager: isNew ? ALBA_MANAGERS[(idx + i) % ALBA_MANAGERS.length] : null,
    });
  }
  return out;
}
function ManagerChat({ name, onClose }) {
  const [msgs, setMsgs] = useState([{ me: false, text: `안녕하세요, 담당자 ${name}입니다. 무엇을 도와드릴까요?` }]);
  const boxRef = useAutoScroll(msgs);
  const [text, setText] = useState("");
  const replies = ["네 확인했어요!", "그건 이렇게 진행하면 돼요 👍", "잠시만요, 알아볼게요", "오케이 바로 처리할게요", "좋은 질문이에요!", "그 건은 내일까지 부탁해요 🙏"];
  const send = () => { const t = text.trim(); if (!t) return; setMsgs((m) => [...m, { me: true, text: t }]); setText(""); setTimeout(() => setMsgs((m) => [...m, { me: false, text: replies[Math.floor(Math.random() * replies.length)] }]), 700); };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 165, padding: 14 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 380, maxHeight: "calc(100vh - 28px)", overflowY: "auto" }}>
        <Panel style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "#7a8b99", color: C.white, borderBottom: `3px solid ${C.ink}` }}>
            <span style={{ fontSize: 20 }}>🧑‍💼</span><b style={{ flex: 1 }}>담당자 {name}</b>
            <PxButton tone="ink" onClick={onClose} style={{ fontSize: 11, padding: "5px 9px" }}>✕</PxButton>
          </div>
          <div ref={boxRef} style={{ height: 240, overflow: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 6, background: "#efe6d2" }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ alignSelf: m.me ? "flex-end" : "flex-start", background: m.me ? C.gem : C.white, border: `2px solid ${C.ink}`, padding: "5px 9px", fontSize: 13, maxWidth: "78%" }}>{m.text}</div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, padding: 8, borderTop: `3px solid ${C.ink}` }}>
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="메시지 입력 후 Enter" style={{ flex: 1, padding: 8, border: `3px solid ${C.ink}`, fontFamily: "'DotGothic16', monospace", fontSize: 13, background: C.white }} />
            <PxButton tone="good" onClick={send} style={{ fontSize: 12, padding: "8px 12px" }}>전송</PxButton>
          </div>
        </Panel>
      </div>
    </div>
  );
}
function AlbaView({ onBack }) {
  const [sel, setSel] = useState(null);
  const [hours, setHours] = useState("");
  const [checked, setChecked] = useState({});
  const [done, setDone] = useState({});
  const [chatWith, setChatWith] = useState(null);
  const names = [...ALBA_NAMES].sort((a, b) => a.localeCompare(b, "ko"));
  const toggle = (id) => setChecked((c) => ({ ...c, [id]: !c[id] }));
  const toggleDone = (id) => setDone((d) => ({ ...d, [id]: !d[id] }));
  return (
    <Panel style={{ padding: 0, overflow: "hidden" }}>
      <TitleBar icon="🛠" title="알바" sub="담당자별 업무 리스트" onBack={onBack} bg="#7a8b99" fg={C.white} />
      <div style={{ padding: 14 }}>
        {!sel ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {names.map((nm) => (
              <button key={nm} onClick={() => setSel(nm)} style={{ cursor: "pointer", aspectRatio: "1 / 1", background: C.parch, border: `3px solid ${C.ink}`, boxShadow: `inset 0 0 0 2px ${C.parchEdge}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: "bold", color: C.ink }}>{nm}</button>
            ))}
          </div>
        ) : (
          <div>
            <PxButton tone="ink" onClick={() => setSel(null)} style={{ fontSize: 11, padding: "5px 9px", marginBottom: 10 }}>← 목록</PxButton>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 13, marginBottom: 10 }}>🧑 {sel}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, background: C.white, border: `3px solid ${C.ink}`, padding: "8px 12px", flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, fontWeight: "bold" }}>⏱ 오늘 총 업무 시간</span>
              <input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="예: 6시간 30분" style={{ flex: 1, minWidth: 120, padding: 7, border: `2px solid ${C.ink}`, fontFamily: "'DotGothic16', monospace", fontSize: 13, background: C.parch }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {albaQuests(names.indexOf(sel)).map((q) => (
                <div key={q.id} style={{ display: "flex", alignItems: "center", gap: 8, rowGap: 6, background: C.white, border: `3px solid ${C.ink}`, padding: "8px 10px", flexWrap: "wrap", opacity: done[q.id] ? 0.55 : 1 }}>
                  <span style={{ fontSize: 11, fontWeight: "bold", color: "#fff", background: q.type === "신규" ? "#c0392b" : "#3a7bd5", padding: "2px 7px", whiteSpace: "nowrap" }}>{q.type}</span>
                  <span style={{ flex: 1, minWidth: 90, fontSize: 13, textDecoration: done[q.id] ? "line-through" : "none" }}>{q.title}</span>
                  {q.type === "신규" && (
                    <PxButton tone="wood" onClick={() => setChatWith(q.manager)} style={{ fontSize: 11, padding: "5px 8px" }}>💬 담당자 {q.manager}</PxButton>
                  )}
                  <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>
                    <input type="checkbox" checked={!!checked[q.id]} onChange={() => toggle(q.id)} style={{ width: 16, height: 16 }} />
                    진행가능
                  </label>
                  <PxButton tone={done[q.id] ? "good" : "ink"} onClick={() => toggleDone(q.id)} style={{ fontSize: 11, padding: "5px 8px", whiteSpace: "nowrap" }}>{done[q.id] ? "✅ 완료" : "완료"}</PxButton>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {chatWith && <ManagerChat name={chatWith} onClose={() => setChatWith(null)} />}
    </Panel>
  );
}
function BigBuildingView({ b, qs, day, onRun, onBack }) {
  const [activeCat, setActiveCat] = useState(null);
  const cats = b.categories || null;
  const curCat = cats ? (cats.includes(activeCat) ? activeCat : cats[0]) : null;
  const shownQuests = cats ? b.quests.filter((q) => q.cat === curCat) : b.quests;
  return (
    <Panel style={{ padding: 0, overflow: "hidden" }}>
      <TitleBar icon={b.icon} title={b.name} sub="업무(반복) 퀘스트는 하루 1회 · 다음 날 초기화" onBack={onBack} bg={b.color} fg={C.white} />
      <div style={{ padding: 16, background: `repeating-linear-gradient(0deg, ${C.parch} 0 40px, ${C.parchLine} 40px 80px)`, display: "grid", gap: 12 }}>
        {cats && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {cats.map((cat) => (
              <PxButton key={cat} tone={cat === curCat ? "good" : "wood"} onClick={() => setActiveCat(cat)} style={{ padding: "8px 16px", fontSize: 13 }}>{cat}</PxButton>
            ))}
          </div>
        )}
        {shownQuests.map((q) => {
          const st = qs[q.id] || {};
          const doneToday = q.repeat ? st.doneDay === day : st.doneOnce;
          let label = q.repeat ? "업무 시작 ▶" : "수행 ▶";
          if (st.running) label = "작업 중…";
          else if (doneToday) label = q.repeat ? "오늘 완료 ✓" : "완료됨 ✓";
          return (
            <div key={q.id} style={{ background: C.white, border: `3px solid ${C.ink}`, boxShadow: `inset 0 0 0 2px ${C.parchEdge}`, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <b style={{ fontSize: 15 }}>{q.title}</b>
                    <span style={{ fontSize: 10, background: q.repeat ? C.good : C.danger, color: C.white, padding: "2px 6px", border: `2px solid ${C.ink}` }}>{q.repeat ? "일일 반복" : "1회 한정"}</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 4 }}>{q.desc}</div>
                  <div style={{ marginTop: 6 }}><GemBadge amount={q.reward} /></div>
                </div>
                <PxButton tone={doneToday ? "ink" : q.repeat ? "good" : "gold"} disabled={st.running || doneToday} onClick={() => onRun(q)} style={{ padding: "10px 14px", fontSize: 13, minWidth: 112 }}>{label}</PxButton>
              </div>
              <div style={{ marginTop: 10, height: 16, background: "#e2d3ab", border: `3px solid ${C.ink}`, position: "relative", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${st.running ? st.progress : doneToday ? 100 : 0}%`, background: doneToday ? C.good : `repeating-linear-gradient(45deg, ${C.gem} 0 8px, ${C.gemGlow} 8px 16px)`, transition: "width 60ms linear" }} />
                {st.running && <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>{Math.floor(st.progress)}%</span>}
              </div>
            </div>
          );
        })}
        <div style={{ background: "rgba(255,247,230,0.85)", border: `3px dashed ${C.ink}`, padding: 10, fontSize: 12, color: C.inkSoft }}>
          💡 퀘스트로 얻은 💎 젬은 <b>중앙은행</b>에서 환전할 수 있어요. 일일 업무는 <b>🌙 다음 날</b>을 누르면 초기화돼요.
        </div>
      </div>
    </Panel>
  );
}

/* ======================= 주민센터(내부 이동) ======================= */
function DrinkStation({ name, color, onClose, onDrink }) {
  const [fill, setFill] = useState(0);
  const [hp, setHp] = useState(0);
  const [mp, setMp] = useState(0);
  const [phase, setPhase] = useState("filling"); // filling | full | drinking | done
  const timer = useRef(null);

  useEffect(() => {
    const start = Date.now();
    timer.current = setInterval(() => {
      const p = Math.min(100, ((Date.now() - start) / 5000) * 100);
      setFill(p);
      if (p >= 100) { clearInterval(timer.current); setPhase("full"); }
    }, 40);
    return () => clearInterval(timer.current);
  }, []);

  const drink = () => {
    if (phase !== "full") return;
    setPhase("drinking");
    const start = Date.now();
    timer.current = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / 2500);
      setFill(100 * (1 - t)); setHp(100 * t); setMp(100 * t);
      if (t >= 1) { clearInterval(timer.current); setPhase("done"); onDrink && onDrink(); }
    }, 40);
  };

  const Bar = ({ label, val, col }) => (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11, marginBottom: 3 }}>{label} {Math.round(val)}%</div>
      <div style={{ height: 16, background: "#e2d3ab", border: `3px solid ${C.ink}` }}>
        <div style={{ height: "100%", width: `${val}%`, background: col, transition: "width 60ms linear" }} />
      </div>
    </div>
  );

  return (
    <RoomModal title={name} onClose={onClose} maxW={340}>
      <Bar label="❤️ HP" val={hp} col={C.danger} />
      <Bar label="💧 MP" val={mp} col={C.bankRoof} />
      <div style={{ display: "flex", justifyContent: "center", margin: "12px 0" }}>
        <button onClick={drink} disabled={phase !== "full"} style={{ background: "none", border: "none", cursor: phase === "full" ? "pointer" : "default", padding: 0 }}>
          <div style={{ position: "relative", width: 70, height: 92, border: `3px solid ${C.ink}`, borderTop: "none", borderRadius: "0 0 14px 14px", background: C.white, overflow: "hidden", boxShadow: phase === "full" ? `0 0 0 3px ${C.gem}` : "none" }}>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${fill}%`, background: color, transition: "height 60ms linear" }} />
          </div>
        </button>
      </div>
      <div style={{ textAlign: "center", fontSize: 12, color: C.inkSoft }}>
        {phase === "filling" && "컵을 채우는 중… (약 5초)"}
        {phase === "full" && "가득 찼어요! 컵을 눌러 마시기 🥤"}
        {phase === "drinking" && "꿀꺽꿀꺽… HP/MP 회복 중"}
        {phase === "done" && "✨ HP·MP 풀 충전 완료!"}
      </div>
    </RoomModal>
  );
}

function CenterView({ meetingRooms, chat, onSend, onEnterMeeting, onBack, bubble, onDrink, meetings = [] }) {
  const net = useContext(NetContext);
  const here = net && net.others ? Object.values(net.others).filter((o) => o.v === "center") : [];
  const [showChat, setShowChat] = useState(false);
  const loungeRef = useAutoScroll(chat);
  const [station, setStation] = useState(null); // {name,color}
  const [text, setText] = useState("");
  const roomLabel = (id) => {
    const m = meetingRooms[id];
    return m.locked ? "🔒 잠김" : m.reserved ? "📌 예약됨" : "🟢 비어있음";
  };
  const furniture = [
    { id: "table", x: 250, y: 150, w: 140, h: 90, color: "#caa06a", emoji: "🪑", label: "대형 테이블", onInteract: () => setShowChat(true) },
    { id: "m1", x: 40, y: 40, w: 110, h: 70, color: "#b9d6c4", emoji: "🚪", label: `회의실 1 ${roomLabel("m1")}`, onInteract: () => onEnterMeeting("m1") },
    { id: "m2", x: 265, y: 20, w: 110, h: 60, color: "#b9d6c4", emoji: "🚪", label: `회의실 2 ${roomLabel("m2")}`, onInteract: () => onEnterMeeting("m2") },
    { id: "m3", x: 490, y: 40, w: 110, h: 70, color: "#b9d6c4", emoji: "🚪", label: `회의실 3 ${roomLabel("m3")}`, onInteract: () => onEnterMeeting("m3") },
    { id: "coffee", x: 40, y: 300, w: 60, h: 66, color: "#8a5a3b", emoji: "☕", label: "커피포트", onInteract: () => setStation({ name: "☕ 커피포트", color: "#6b4423" }) },
    { id: "vending", x: 300, y: 300, w: 66, h: 70, color: "#d76b96", emoji: "🥤", label: "자판기", onInteract: () => setStation({ name: "🥤 자판기", color: "#e8891f" }) },
    { id: "water", x: 540, y: 300, w: 56, h: 66, color: "#6fc3e0", emoji: "🚰", label: "정수기", onInteract: () => setStation({ name: "🚰 정수기", color: "#3aa0e0" }) },
  ];
  return (
    <RoomView title="주민센터" icon="🏛" sub="테이블에서 대화 · 회의실 3곳(📨 초대장 보내기) · 커피/자판기/정수기로 HP·MP 충전" bg="#f0e4cf" roomW={640} roomH={400} furniture={furniture} onBack={onBack} paused={showChat || !!station} headerBg={C.villa} bubble={bubble}
      banner={meetings.length > 0 ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: "bold" }}>📅 내 회의 일정</span>
          {meetings.map((m, i2) => (
            <span key={i2} style={{ fontSize: 11, background: C.gem, border: `2px solid ${C.ink}`, borderRadius: 12, padding: "2px 9px" }}>🎥 {m.room} · {m.when} 방문 ({m.dur})</span>
          ))}
        </div>
      ) : null}>
      {station && <DrinkStation name={station.name} color={station.color} onClose={() => setStation(null)} onDrink={onDrink} />}
      {showChat && (
        <RoomModal title="🪑 라운지 테이블 채팅" onClose={() => setShowChat(false)}>
          <div style={{ fontSize: 11, color: C.inkSoft, marginBottom: 8, background: C.white, border: `2px solid ${C.ink}`, borderRadius: 6, padding: "5px 8px" }}>
            🪑 지금 테이블에 앉은 사람: <b>나</b>{here.length ? ", " + here.map((o) => o.name).join(", ") : " (혼자예요)"}
          </div>
          <div style={{ fontSize: 11, color: C.inkSoft, marginBottom: 8 }}>* 데모용 로컬 채팅입니다.</div>
          <div ref={loungeRef} style={{ height: 200, overflow: "auto", background: C.white, border: `3px solid ${C.ink}`, padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            {chat.map((m, i) => (
              <div key={i} style={{ fontSize: 13, alignSelf: m.me ? "flex-end" : "flex-start", background: m.me ? C.gem : "#eadfc6", border: `2px solid ${C.ink}`, padding: "4px 8px", maxWidth: "80%" }}>
                <b style={{ fontSize: 10, color: C.inkSoft }}>{m.who}</b><br />{m.text}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) { onSend(text.trim()); setText(""); } }}
              placeholder="메시지 입력 후 Enter" style={{ flex: 1, padding: 8, border: `3px solid ${C.ink}`, fontFamily: "'DotGothic16', monospace", fontSize: 13, background: C.white }} />
            <PxButton tone="good" onClick={() => { if (text.trim()) { onSend(text.trim()); setText(""); } }} style={{ fontSize: 12, padding: "8px 12px" }}>전송</PxButton>
          </div>
        </RoomModal>
      )}
    </RoomView>
  );
}

/* ======================= 회의실(별도 화면, 통화 목업) ======================= */
function MeetingView({ roomId, room, onUpdate, onBack, myName = "", onInvite, people = [], chat = [], onChat = () => {} }) {
  const net = useContext(NetContext);
  const here = net && net.others ? Object.values(net.others).filter((o) => o.v === "meeting" && (o.rm || null) === (net.room || null)) : [];
  const [cText, setCText] = useState("");
  const mchatRef = useAutoScroll(chat.length);
  const [invOpen, setInvOpen] = useState(false);
  const [iDate, setIDate] = useState("");
  const [iTime, setITime] = useState("");
  const [iDur, setIDur] = useState("1시간");
  const [iWho, setIWho] = useState([]);
  const [iSent, setISent] = useState(false);
  const toggleWho = (n) => setIWho((v) => (v.includes(n) ? v.filter((x) => x !== n) : [...v, n]));
  const sendInvite = () => {
    if (!iDate || !iTime || iWho.length === 0) return;
    iWho.forEach((n) => onInvite && onInvite({ to: n, when: `${iDate} ${iTime}`, dur: iDur, room: `회의실 ${roomId.replace("m", "")}`, roomId }));
    setISent(true);
    setTimeout(() => { setISent(false); setInvOpen(false); setIWho([]); }, 1500);
  };
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [share, setShare] = useState(false);
  const [resName, setResName] = useState("");
  const [time, setTime] = useState("");
  const num = roomId.replace("m", "");
  const participants = [{ name: myName || "나", me: true }, ...here.map((o) => ({ name: o.name, me: false }))];
  return (
    <Panel style={{ padding: 0, overflow: "hidden" }}>
      <TitleBar icon="🎥" title={`회의실 ${num}`} sub={room.locked ? "🔒 잠긴 회의실" : "화상 회의 (데모)"} onBack={onBack} bg={C.bankRoof} fg={C.white}
        right={<div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <PxButton tone="gold" onClick={() => setInvOpen(true)} style={{ fontSize: 11, padding: "5px 9px" }}>📨 초대장</PxButton>
          <span style={{ fontSize: 11, background: room.reserved ? C.gem : "rgba(255,255,255,0.25)", color: room.reserved ? C.ink : C.white, padding: "4px 8px", border: `2px solid ${C.ink}` }}>{room.reserved ? `📌 ${room.by} · ${room.time}` : "예약 없음"}</span>
        </div>} />
      {invOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.62)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 14 }} onClick={() => setInvOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 380, maxHeight: "calc(100vh - 28px)", overflowY: "auto" }}>
            <div style={{ background: C.parch, border: `3px solid ${C.ink}`, borderRadius: 14, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 22 }}>📨</span>
                <b style={{ flex: 1, fontSize: 14 }}>회의 초대장 보내기</b>
                <PxButton tone="ink" onClick={() => setInvOpen(false)} style={{ fontSize: 11, padding: "5px 9px" }}>✕</PxButton>
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <input value={iDate} onChange={(e) => setIDate(e.target.value)} placeholder="7월 23일" style={{ flex: 1, minWidth: 0, padding: 9, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 13 }} />
                <input value={iTime} onChange={(e) => setITime(e.target.value)} placeholder="오후 6시" style={{ flex: 1, minWidth: 0, padding: 9, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 13 }} />
              </div>
              <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 5 }}>⏱ 예상 회의시간</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
                {["30분", "1시간", "2시간", "4시간"].map((d) => (
                  <PxButton key={d} tone={iDur === d ? "good" : "wood"} onClick={() => setIDur(d)} style={{ fontSize: 11, padding: "6px 10px" }}>{d}</PxButton>
                ))}
              </div>
              <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 5 }}>👥 초대원</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", maxHeight: 110, overflow: "auto", marginBottom: 10 }}>
                {(people.length ? people : PROFILES).map((p) => (
                  <button key={p.name} onClick={() => toggleWho(p.name)} style={{ cursor: "pointer", fontFamily: "'DotGothic16', monospace", fontSize: 12, padding: "6px 10px", borderRadius: 14, border: `2px solid ${C.ink}`, background: iWho.includes(p.name) ? C.gem : C.white }}>
                    {p.avatar} {p.name}
                  </button>
                ))}
              </div>
              <div style={{ background: C.white, border: `2px dashed ${C.ink}`, borderRadius: 8, padding: 11, fontSize: 12.5, lineHeight: 1.7 }}>
                <b>📨 회의 초대장</b><br />
                {iDate || "?월 ?일"} {iTime || "??시"} 회의 / 초대원 : {iWho.join(", ") || "미선택"}<br />
                예상 회의시간 : {iDur}<br />
                <span style={{ color: C.inkSoft }}>장소 : 회의실 {roomId.replace("m", "")} · 주최 {myName || "나"}</span>
              </div>
              <PxButton tone="gold" disabled={!iDate || !iTime || iWho.length === 0} onClick={sendInvite} style={{ width: "100%", marginTop: 12, padding: 11, fontSize: 13 }}>{iSent ? "보냈어요! ✓" : "📨 초대장 보내기"}</PxButton>
            </div>
          </div>
        </div>
      )}
      <div style={{ padding: 16, background: "#20303a" }}>
        {/* 📨 초대장 — 눈에 잘 띄는 큰 배너 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: "linear-gradient(180deg,#ffe9a8,#ffd75e)", border: `3px solid ${C.ink}`, borderRadius: 10, padding: "10px 12px", marginBottom: 12, boxShadow: `0 3px 0 ${C.ink}` }}>
          <span style={{ fontSize: 26 }}>📨</span>
          <div style={{ flex: "1 1 150px", minWidth: 0, color: C.ink }}>
            <div style={{ fontSize: 13.5, fontWeight: "bold" }}>회의 초대장 보내기</div>
            <div style={{ fontSize: 11, color: C.inkSoft }}>날짜·시간·예상 시간을 정해 마을주민에게 초대장을 보내요</div>
          </div>
          <PxButton tone="ink" onClick={() => setInvOpen(true)} style={{ fontSize: 13, padding: "10px 16px" }}>📨 초대장 작성</PxButton>
        </div>

        {/* 화면 공유 영역 */}
        {share && (
          <div style={{ height: 120, background: "#0e171d", border: `3px solid ${C.gem}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.gem, marginBottom: 12, fontSize: 13 }}>
            🖥 화면 공유 중… (데모)
          </div>
        )}
        <div style={{ background: "rgba(255,255,255,0.12)", border: `2px solid ${C.gem}`, borderRadius: 8, padding: "7px 10px", marginBottom: 10, color: C.white, fontSize: 12 }}>
          🪑 대형 테이블 착석: <b>{participants.map((p) => p.name).join(", ")}</b>{participants.length === 1 ? " (혼자예요)" : ` · 총 ${participants.length}명`}
        </div>
        {/* 참가자 타일 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          {participants.map((p) => (
            <div key={p.name} style={{ aspectRatio: "4/3", background: p.me && !cam ? "#111" : "#33505f", border: `3px solid ${p.me ? C.gem : "#54707f"}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.white }}>
              <span style={{ fontSize: 30 }}>{p.me && !cam ? "🚫" : "🙂"}</span>
              <span style={{ fontSize: 12, marginTop: 4 }}>{p.name}{p.me && !mic ? " 🔇" : ""}</span>
            </div>
          ))}
        </div>
        {/* 컨트롤 */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14, justifyContent: "center" }}>
          <PxButton tone={mic ? "good" : "danger"} onClick={() => setMic((v) => !v)} style={{ fontSize: 12, padding: "10px 12px" }}>{mic ? "🎤 마이크 켜짐" : "🔇 음소거"}</PxButton>
          <PxButton tone={cam ? "good" : "danger"} onClick={() => setCam((v) => !v)} style={{ fontSize: 12, padding: "10px 12px" }}>{cam ? "📷 카메라 켜짐" : "📷 카메라 끔"}</PxButton>
          <PxButton tone={share ? "gold" : "blue"} onClick={() => setShare((v) => !v)} style={{ fontSize: 12, padding: "10px 12px" }}>{share ? "🖥 공유 중지" : "🖥 화면 공유"}</PxButton>
          <PxButton tone={room.locked ? "gold" : "ink"} onClick={() => onUpdate(roomId, { locked: !room.locked })} style={{ fontSize: 12, padding: "10px 12px" }}>{room.locked ? "🔓 방 잠금 해제" : "🔒 방 잠그기"}</PxButton>
        </div>
        {/* 예약 */}
        <div style={{ marginTop: 14, background: C.parch, border: `3px solid ${C.ink}`, padding: 12 }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, marginBottom: 8, color: C.ink }}>RESERVATION</div>
          {room.reserved ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, color: C.ink }}>
              <span style={{ fontSize: 13 }}>📌 <b>{room.by}</b> 님이 <b>{room.time}</b> 예약함</span>
              <PxButton tone="danger" onClick={() => onUpdate(roomId, { reserved: false, by: "", time: "" })} style={{ fontSize: 12, padding: "8px 10px" }}>예약 취소</PxButton>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", color: C.ink }}>
              <input value={resName} onChange={(e) => setResName(e.target.value)} placeholder="예약자" style={{ padding: 8, border: `3px solid ${C.ink}`, fontFamily: "'DotGothic16', monospace", fontSize: 13, width: 110, background: C.white }} />
              <input value={time} onChange={(e) => setTime(e.target.value)} placeholder="시간 (예: 14:00)" style={{ padding: 8, border: `3px solid ${C.ink}`, fontFamily: "'DotGothic16', monospace", fontSize: 13, width: 140, background: C.white }} />
              <PxButton tone="good" disabled={!resName.trim() || !time.trim()} onClick={() => onUpdate(roomId, { reserved: true, by: resName.trim(), time: time.trim() })} style={{ fontSize: 12, padding: "8px 12px" }}>예약하기</PxButton>
            </div>
          )}
        </div>
        {/* 💬 회의실 채팅 */}
        <div style={{ marginTop: 14, background: C.parch, border: `3px solid ${C.ink}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 11px", background: C.bankRoof, color: C.white, borderBottom: `3px solid ${C.ink}` }}>
            <span style={{ fontSize: 16 }}>💬</span>
            <b style={{ flex: 1, fontSize: 13 }}>회의실 {num} 채팅</b>
            <span style={{ fontSize: 10, opacity: 0.9 }}>같은 회의실 사람들에게 보여요</span>
          </div>
          <div ref={mchatRef} style={{ height: 170, overflow: "auto", padding: 9, background: C.white, display: "flex", flexDirection: "column", gap: 6 }}>
            {chat.length === 0 && <div style={{ fontSize: 12, color: C.inkSoft, textAlign: "center", padding: 20 }}>아직 대화가 없어요. 먼저 인사해볼까요? 👋</div>}
            {chat.map((m, i) => (
              <div key={i} style={{ alignSelf: m.me ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                {!m.me && <div style={{ fontSize: 10, color: C.inkSoft, marginBottom: 1 }}>{m.who}</div>}
                <div style={{ background: m.me ? C.gem : "#eadfc6", border: `2px solid ${C.ink}`, padding: "5px 9px", fontSize: 13, wordBreak: "break-word" }}>{m.text}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, padding: 8, borderTop: `3px solid ${C.ink}` }}>
            <input value={cText} onChange={(e) => setCText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && cText.trim()) { onChat(cText.trim()); setCText(""); } }}
              placeholder="메시지 입력 후 Enter"
              style={{ flex: 1, minWidth: 0, padding: 8, border: `3px solid ${C.ink}`, fontFamily: "'DotGothic16', monospace", fontSize: 13, background: C.white }} />
            <PxButton tone="good" disabled={!cText.trim()} onClick={() => { onChat(cText.trim()); setCText(""); }} style={{ fontSize: 12, padding: "8px 12px" }}>전송</PxButton>
          </div>
        </div>

        <div style={{ marginTop: 10, fontSize: 11, color: "rgba(255,255,255,0.7)", textAlign: "center" }}>* 화상/통화/공유는 데모 목업입니다.</div>
      </div>
    </Panel>
  );
}

/* ======================= 집(가구 + 메모장) ======================= */
/* ======================= 집 · 초인종 · 우체통 ======================= */
function playBell() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = playBell._c || (playBell._c = new AC());
    if (ctx.state === "suspended") ctx.resume();
    const t = ctx.currentTime;
    [[880, 0], [660, 0.32]].forEach(([hz, off]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(hz, t + off);
      g.gain.setValueAtTime(0.001, t + off);
      g.gain.exponentialRampToValueAtTime(0.35, t + off + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + off + 0.9);
      o.connect(g).connect(ctx.destination); o.start(t + off); o.stop(t + off + 1);
    });
  } catch (e) {}
}
function loadJSON(k, d) { try { const r = window.localStorage.getItem(k); return r ? JSON.parse(r) : d; } catch (e) { return d; } }
function saveJSON(k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

function HouseGate({ house, isMine, myName, hasPw, onSetPw, onEnter, onBell, onMail, onBack }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState(null);
  const owner = house.owner || (house.name || "").replace(/이네$|네$/, "");
  const say = (m) => { setMsg(m); setTimeout(() => setMsg(null), 1800); };
  /* 남의 집 비밀번호를 5번 틀리면 1분간 입력 금지 */
  const [fails, setFails] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);
  const [lockLeft, setLockLeft] = useState(0);
  const locked = lockLeft > 0;
  useEffect(() => {
    if (!lockUntil) return;
    const tick = () => {
      const left = lockUntil - Date.now();
      setLockLeft(left > 0 ? left : 0);
      if (left <= 0) { setLockUntil(0); setFails(0); }
    };
    tick();
    const iv = setInterval(tick, 250);
    return () => clearInterval(iv);
  }, [lockUntil]);
  const tryEnter = () => {
    if (locked) return;
    const r = onEnter(pw);
    if (r === true) { setFails(0); return; }
    setPw("");
    if (r === "wait") { say("확인 중… 잠시만요"); return; }
    const n = fails + 1;
    setFails(n);
    if (n >= 5) { setLockUntil(Date.now() + 60000); say("🚫 5번 틀렸어요 — 1분간 입력이 막힙니다"); }
    else say(`비밀번호가 틀렸어요 (${n}/5)`);
  };

  if (isMine && !hasPw) {
    return (
      <Panel style={{ padding: 0, overflow: "hidden" }}>
        <TitleBar icon="🏠" title={house.name} sub="첫 방문 · 비밀번호 설정" onBack={onBack} bg={house.roof} fg={C.white} />
        <div style={{ padding: 22, textAlign: "center" }}>
          <div style={{ fontSize: 44 }}>🎉</div>
          <div style={{ fontSize: 16, fontWeight: "bold", margin: "10px 0 6px" }}>환영합니다 {myName}님!</div>
          <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 14 }}>우리 집 비밀번호를 설정해주세요.<br />다음부터는 이 창이 뜨지 않아요.</div>
          <input value={pw2} onChange={(e) => setPw2(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && pw2.trim()) onSetPw(pw2.trim()); }} maxLength={12} autoFocus placeholder="비밀번호 (예: 1234)" style={{ width: "100%", maxWidth: 260, boxSizing: "border-box", padding: 11, border: `3px solid ${C.ink}`, fontFamily: "'DotGothic16', monospace", fontSize: 15, textAlign: "center", background: C.white }} />
          <PxButton tone="good" disabled={!pw2.trim()} onClick={() => onSetPw(pw2.trim())} style={{ display: "block", width: "100%", maxWidth: 260, margin: "12px auto 0", padding: 12, fontSize: 14 }}>설정하고 들어가기</PxButton>
        </div>
      </Panel>
    );
  }

  return (
    <Panel style={{ padding: 0, overflow: "hidden" }}>
      <TitleBar icon="🏠" title={house.name} sub={isMine ? "우리 집 · 비밀번호를 입력하세요" : `${owner}님의 집 · 비밀번호를 알면 입장 가능`} onBack={onBack} bg={house.roof} fg={C.white} />
      <div style={{ padding: 18, background: C.parch }}>
        <div style={{ background: C.white, border: `3px solid ${C.ink}`, borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 8, textAlign: "center" }}>🔒 현관 비밀번호</div>
          {locked ? (
            <div style={{ background: "#fbe4e0", border: `3px solid ${C.danger}`, borderRadius: 8, padding: 14, textAlign: "center" }}>
              <div style={{ fontSize: 30 }}>🚫</div>
              <div style={{ fontSize: 14, fontWeight: "bold", color: C.danger, margin: "6px 0 4px" }}>비밀번호를 5번 틀렸어요</div>
              <div style={{ fontSize: 12.5, color: C.inkSoft, lineHeight: 1.7 }}>
                잠시 후 다시 시도할 수 있어요.<br />
                <b style={{ fontSize: 20, color: C.danger }}>{Math.ceil(lockLeft / 1000)}초</b> 남음
              </div>
              <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 8 }}>🔔 초인종을 눌러 주인에게 물어보세요</div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 6 }}>
                <input value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") tryEnter(); }} maxLength={12} type="password" placeholder="비밀번호" style={{ flex: 1, minWidth: 0, padding: 10, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 14, textAlign: "center" }} />
                <PxButton tone="good" onClick={tryEnter} style={{ padding: "10px 14px", fontSize: 13 }}>입장</PxButton>
              </div>
              {fails > 0 && <div style={{ marginTop: 7, fontSize: 11.5, color: C.danger, textAlign: "center" }}>⚠️ {fails}번 틀렸어요 · {5 - fails}번 더 틀리면 1분간 입력이 막혀요</div>}
            </>
          )}
          {msg && <div style={{ marginTop: 8, fontSize: 12, color: C.danger, textAlign: "center" }}>{msg}</div>}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => { playBell(); onBell(owner); say("딩동! 초인종을 눌렀어요 🔔"); }} style={{ flex: 1, cursor: "pointer", background: "linear-gradient(180deg,#ffe680,#d9a441)", border: `3px solid ${C.ink}`, borderRadius: 12, padding: "18px 8px", fontFamily: "'DotGothic16', monospace", boxShadow: `0 4px 0 ${C.ink}` }}>
            <div style={{ fontSize: 34 }}>🔔</div>
            <div style={{ fontSize: 13, fontWeight: "bold", marginTop: 4 }}>초인종</div>
          </button>
          <button onClick={() => onMail(owner)} style={{ flex: 1, cursor: "pointer", background: "linear-gradient(180deg,#a8d5f2,#5b8def)", color: C.white, border: `3px solid ${C.ink}`, borderRadius: 12, padding: "18px 8px", fontFamily: "'DotGothic16', monospace", boxShadow: `0 4px 0 ${C.ink}` }}>
            <div style={{ fontSize: 34 }}>📮</div>
            <div style={{ fontSize: 13, fontWeight: "bold", marginTop: 4 }}>우체통</div>
          </button>
        </div>
        <div style={{ fontSize: 11, color: C.inkSoft, textAlign: "center", marginTop: 12 }}>비밀번호를 알면 누구나 입장할 수 있어요 · 우체통 택배비 🪙0.3</div>
      </div>
    </Panel>
  );
}

function MailboxModal({ owner, isMine, myName, gems, inventory, mail, onSend, onClose }) {
  const [tab, setTab] = useState(isMine ? "in" : "write");
  const [text, setText] = useState("");
  const [pick, setPick] = useState(null);
  const [done, setDone] = useState(false);
  const cost = 0.3;
  const send = () => {
    if (!text.trim() && !pick) return;
    if (gems < cost) return;
    onSend({ to: owner, from: myName || "익명", text: text.trim(), item: pick });
    setText(""); setPick(null); setDone(true);
    setTimeout(() => setDone(false), 2000);
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.62)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 14 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 400, maxHeight: "calc(100vh - 28px)", overflowY: "auto" }}>
        <div style={{ background: C.parch, border: `3px solid ${C.ink}`, borderRadius: 14, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 22 }}>📮</span>
            <b style={{ flex: 1, fontSize: 14 }}>{owner}님의 우체통</b>
            <GemBadge kind="gold" amount={gems} />
            <PxButton tone="ink" onClick={onClose} style={{ fontSize: 11, padding: "5px 9px" }}>✕</PxButton>
          </div>
          {isMine && (
            <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
              <PxButton tone={tab === "in" ? "good" : "wood"} onClick={() => setTab("in")} style={{ flex: 1, fontSize: 12, padding: 8 }}>📬 받은 편지 {mail.length > 0 ? `(${mail.length})` : ""}</PxButton>
              <PxButton tone={tab === "write" ? "good" : "wood"} onClick={() => setTab("write")} style={{ flex: 1, fontSize: 12, padding: 8 }}>✍️ 남기기</PxButton>
            </div>
          )}

          {tab === "in" ? (
            mail.length === 0 ? (
              <div style={{ fontSize: 12, color: C.inkSoft, textAlign: "center", padding: 24 }}>아직 도착한 편지가 없어요 📭</div>
            ) : (
              <div style={{ maxHeight: 300, overflow: "auto", display: "flex", flexDirection: "column", gap: 7 }}>
                {[...mail].reverse().map((m, i) => (
                  <div key={i} style={{ background: C.white, border: `2px solid ${C.ink}`, borderRadius: 8, padding: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <b style={{ fontSize: 12, color: "#5b8def" }}>{m.from}</b>
                      <span style={{ fontSize: 10, color: C.inkSoft }}>{m.at}</span>
                      {m.item && <span style={{ marginLeft: "auto", fontSize: 18 }}>{m.item.emoji}</span>}
                    </div>
                    {m.text && <div style={{ fontSize: 13, lineHeight: 1.6 }}>{m.text}</div>}
                    {m.item && <div style={{ fontSize: 11, color: "#a86e13", marginTop: 4 }}>🎁 {m.item.name} 를 받았어요!</div>}
                  </div>
                ))}
              </div>
            )
          ) : (
            <div>
              <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 6 }}>방명록·편지를 남기고, 선물도 같이 보낼 수 있어요</div>
              <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="예: 집 예쁘다! 놀러왔어요 :)" style={{ width: "100%", boxSizing: "border-box", height: 80, padding: 10, border: `2px solid ${C.ink}`, borderRadius: 8, fontFamily: "'DotGothic16', monospace", fontSize: 13, resize: "none", background: C.white }} />
              <div style={{ fontSize: 12, fontWeight: "bold", margin: "10px 0 6px" }}>🎁 함께 보낼 선물 (선택)</div>
              {inventory.length === 0 ? (
                <div style={{ fontSize: 11, color: C.inkSoft }}>감사의 방에서 선물을 사면 여기에 나와요</div>
              ) : (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {inventory.map((it, i) => (
                    <button key={i} onClick={() => setPick(pick && pick._i === i ? null : { ...it, _i: i })} style={{ cursor: "pointer", background: pick && pick._i === i ? C.gem : C.white, border: `2px solid ${C.ink}`, borderRadius: 8, padding: "6px 9px", fontFamily: "'DotGothic16', monospace", fontSize: 12 }}>
                      {it.emoji} {it.name}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                <span style={{ fontSize: 11, color: C.inkSoft, flex: 1 }}>택배비 🪙{cost}</span>
                <PxButton tone="gold" disabled={(!text.trim() && !pick) || gems < cost} onClick={send} style={{ padding: "10px 18px", fontSize: 13 }}>{gems < cost ? "골드 부족" : "📮 보내기"}</PxButton>
              </div>
              {done && <div style={{ fontSize: 12, color: C.good, textAlign: "center", marginTop: 8, fontWeight: "bold" }}>보냈어요! 📨</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GiftModal({ target, inventory, myName, onSend, onClose }) {
  const [text, setText] = useState("");
  const [pick, setPick] = useState(null);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.62)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 105, padding: 14 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 340, maxHeight: "calc(100vh - 28px)", overflowY: "auto" }}>
        <div style={{ background: C.parch, border: `3px solid ${C.ink}`, borderRadius: 14, padding: 16 }}>
          <div style={{ textAlign: "center", fontSize: 36 }}>🎁</div>
          <div style={{ textAlign: "center", fontSize: 15, fontWeight: "bold", margin: "6px 0 12px" }}>{target}님에게 선물하기</div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="한마디 (선택)" style={{ width: "100%", boxSizing: "border-box", height: 60, padding: 9, border: `2px solid ${C.ink}`, borderRadius: 8, fontFamily: "'DotGothic16', monospace", fontSize: 13, resize: "none", background: C.white }} />
          <div style={{ fontSize: 12, fontWeight: "bold", margin: "10px 0 6px" }}>보낼 선물</div>
          {inventory.length === 0 ? (
            <div style={{ fontSize: 11, color: C.inkSoft }}>감사의 방에서 선물을 사보세요 🎁</div>
          ) : (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {inventory.map((it, i) => (
                <button key={i} onClick={() => setPick(pick && pick._i === i ? null : { ...it, _i: i })} style={{ cursor: "pointer", background: pick && pick._i === i ? C.gem : C.white, border: `2px solid ${C.ink}`, borderRadius: 8, padding: "6px 9px", fontFamily: "'DotGothic16', monospace", fontSize: 12 }}>
                  {it.emoji} {it.name}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <PxButton tone="ink" onClick={onClose} style={{ flex: 1, padding: 10, fontSize: 13 }}>닫기</PxButton>
            <PxButton tone="gold" disabled={!pick && !text.trim()} onClick={() => { onSend({ to: target, from: myName || "익명", text: text.trim(), item: pick }); onClose(); }} style={{ flex: 1, padding: 10, fontSize: 13 }}>보내기</PxButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function HomeView({ house, memo, onSaveMemo, onBack, bubble, skin = null, extras = [], gifts = [], fridge = [], fishes = [], hasAquarium = false, hasYard = false, petsAtHome = [], onOpenAqua }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(memo || "");
  const furniture = [
    { id: "bed", x: 40, y: 60, w: 150, h: 90, color: "#c98ba0", emoji: "🛏️", label: "침대", toast: "잠깐 누워 쉬었다 😌" },
    { id: "sofa", x: 40, y: 260, w: 130, h: 70, color: "#8ea9c9", emoji: "🛋️", label: "쇼파", toast: "쇼파에 앉아 한숨 돌린다 🛋️" },
    { id: "tv", x: 250, y: 280, w: 120, h: 56, color: "#3a3a3a", emoji: "📺", label: "티비", toast: "TV를 켰다 📺 예능이 나온다" },
    { id: "desk", x: 430, y: 90, w: 150, h: 90, color: "#a9814a", emoji: "🖥️", label: "책상(메모)", onInteract: () => { setText(memo || ""); setOpen(true); } },
  ];
  const EX_POS = [[240, 60], [430, 250], [60, 170], [330, 170], [520, 320], [150, 330], [520, 190], [250, 380]];
  extras.forEach((id, i) => {
    const it = IKEA_ITEMS.furni.find((x) => x.id === id);
    if (!it) return;
    const p = EX_POS[i % EX_POS.length];
    furniture.push({ id: "ex" + id, x: p[0], y: p[1], w: 70, h: 60, color: it.color, emoji: it.emoji, label: it.name, toast: `${it.name} · 이케아에서 산 가구 🛒` });
  });
  /* 🎁 집에 둔 선물 */
  const GIFT_POS = [[190, 130], [370, 60], [110, 240], [470, 200], [300, 340], [560, 100], [30, 330], [400, 380]];
  gifts.forEach((g, i) => {
    const gp = GIFT_POS[i % GIFT_POS.length];
    furniture.push({ id: "gift" + i, x: gp[0], y: gp[1], w: 44, h: 44, color: "transparent", emoji: g.emoji || "🎁", label: g.name,
      toast: `${g.name}${g.from ? ` — ${g.from}님이 준 선물이에요` : "을(를) 집에 뒀어요"} ✨` });
  });
  /* 🐟 수족관 (구입했을 때만 놓여요) */
  if (hasAquarium) {
    furniture.push({ id: "aqua", x: 200, y: 36, w: 140, h: 66, color: "#7fd4f5", emoji: "🐟", label: `수족관 (${fishes.length})`,
      onInteract: () => onOpenAqua && onOpenAqua() });
  }
  /* 🌳 마당 (구입했을 때만) */
  if (hasYard) {
    furniture.push({ id: "yard", x: 40, y: 330, w: 120, h: 60, color: "#a8d5a2", emoji: "🌳", label: "마당",
      toast: petsAtHome.length ? `🌳 마당에서 ${petsAtHome.join(", ")} 이(가) 놀고 있어요` : "🌳 마당 · 반려동물이 뛰어놀아요" });
  }
  /* 🧊 냉장고 */
  furniture.push({ id: "fridge", x: 552, y: 285, w: 58, h: 80, color: "#dfe7ea", emoji: "🧊", label: `냉장고 (${fridge.length})`,
    toast: fridge.length ? `🧊 냉장고 안: ${fridge.map((f) => `${f.emoji || "🍽"} ${f.name}`).join(", ")}` : "🧊 냉장고가 비었어요" });
  return (
    <RoomView title={house.name} icon="🏠" sub={skin ? `내 집 · ${skin.name} 스타일` : "침대·쇼파·티비·책상 · 책상에서 메모 작성"} bg={skin ? skin.bg : "#efe6d2"} roomW={640} roomH={400} furniture={furniture} onBack={onBack} paused={open} headerBg={skin ? skin.roof : house.wall} bubble={bubble}>
      {open && (
        <RoomModal title="📝 개인 메모장" onClose={() => setOpen(false)}>
          <div style={{ fontSize: 11, color: C.inkSoft, marginBottom: 8 }}>{house.name} 책상 · 나만 보는 메모</div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="오늘 할 일, 아이디어, 메모를 적어보세요…"
            style={{ width: "100%", boxSizing: "border-box", height: 180, padding: 10, border: `3px solid ${C.ink}`, fontFamily: "'DotGothic16', monospace", fontSize: 14, background: "#fffdf5", resize: "none" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <PxButton tone="ink" onClick={() => setOpen(false)} style={{ flex: 1, padding: 10, fontSize: 13 }}>닫기</PxButton>
            <PxButton tone="good" onClick={() => { onSaveMemo(text); setOpen(false); }} style={{ flex: 1, padding: 10, fontSize: 13 }}>저장</PxButton>
          </div>
        </RoomModal>
      )}
    </RoomView>
  );
}

/* ======================= 감사의 방(상점 + 감사 칠판) ======================= */
function ThanksView({ gems, inventory, postits, onBuy, onPost, onBack, bubble }) {
  const [shop, setShop] = useState(false);
  const [board, setBoard] = useState(false);
  const [to, setTo] = useState(""); const [from, setFrom] = useState(""); const [msg, setMsg] = useState("");
  const furniture = [
    { id: "shelf", x: 30, y: 60, w: 130, h: 150, color: "#b98a4e", emoji: "🧑‍🦳", label: "선반·상점 주인", onInteract: () => setShop(true) },
    { id: "table", x: 180, y: 240, w: 110, h: 70, color: "#caa06a", emoji: "🧺", label: "포장 테이블", toast: "정성껏 포장했습니다 🎁" },
    { id: "chalk", x: 440, y: 60, w: 170, h: 200, color: "#2f5d3f", emoji: "🖊️", label: "감사 칠판", onInteract: () => setBoard(true) },
  ];
  const paColors = ["#ffe680", "#ffd0e0", "#c9f0d0", "#cfe4ff", "#f0d9b8"];
  return (
    <RoomView title="감사의 방" icon="🙏" sub="좌측 선반에서 구매 · 우측 칠판에 감사 포스트잇" bg="#efe6d2" roomW={640} roomH={400} furniture={furniture} onBack={onBack} paused={shop || board} headerBg="#e0a13d" bubble={bubble}>
      {shop && (
        <RoomModal title="🛒 감사 선반" onClose={() => setShop(false)}>
          <div style={{ fontSize: 12, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: C.inkSoft }}>노인 상점 주인이 미소짓는다.</span><GemBadge kind="gold" amount={gems} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
            {SHOP_ITEMS.map((it) => (
              <div key={it.id} style={{ background: C.white, border: `3px solid ${C.ink}`, padding: 8, textAlign: "center" }}>
                <div style={{ fontSize: 26 }}>{it.emoji}</div>
                <div style={{ fontSize: 13, fontWeight: "bold" }}>{it.name}</div>
                <div style={{ fontSize: 12, color: "#a86e13", margin: "2px 0 6px" }}>🪙 {it.price}</div>
                <PxButton tone={gems >= it.price ? "gold" : "ink"} disabled={gems < it.price} onClick={() => onBuy(it)} style={{ fontSize: 11, padding: "6px 8px", width: "100%" }}>구매</PxButton>
              </div>
            ))}
          </div>
          {inventory.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 12, color: C.inkSoft }}>보유: {inventory.map((i) => i.emoji).join(" ")}</div>
          )}
        </RoomModal>
      )}
      {board && (
        <RoomModal title="🖊️ 감사 칠판" onClose={() => setBoard(false)} maxW={560}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="To. 받는 사람" style={{ padding: 8, border: `3px solid ${C.ink}`, fontFamily: "'DotGothic16', monospace", fontSize: 13, width: 120, background: C.white }} />
            <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="From. 나" style={{ padding: 8, border: `3px solid ${C.ink}`, fontFamily: "'DotGothic16', monospace", fontSize: 13, width: 100, background: C.white }} />
            <input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="감사 메시지" style={{ flex: 1, minWidth: 140, padding: 8, border: `3px solid ${C.ink}`, fontFamily: "'DotGothic16', monospace", fontSize: 13, background: C.white }} />
            <PxButton tone="good" disabled={!to.trim() || !msg.trim()} onClick={() => { onPost({ to: to.trim(), from: from.trim() || "익명", msg: msg.trim(), color: paColors[Math.floor(Math.random() * paColors.length)] }); setTo(""); setFrom(""); setMsg(""); }} style={{ fontSize: 12, padding: "8px 12px" }}>붙이기</PxButton>
          </div>
          <div style={{ background: "#2f5d3f", border: `4px solid ${C.woodDark}`, padding: 10, minHeight: 140, display: "flex", flexWrap: "wrap", gap: 8, alignContent: "flex-start" }}>
            {postits.length === 0 && <span style={{ color: "#cfe4d6", fontSize: 12 }}>아직 포스트잇이 없어요. 첫 감사를 남겨보세요!</span>}
            {postits.map((p) => (
              <div key={p.id} style={{ width: 110, background: p.color, border: `2px solid ${C.ink}`, padding: 6, fontSize: 11, transform: `rotate(${(p.id % 5) - 2}deg)`, boxShadow: "2px 2px 0 rgba(0,0,0,0.25)" }}>
                <b>To. {p.to}</b><div style={{ margin: "3px 0" }}>{p.msg}</div><span style={{ color: C.inkSoft }}>- {p.from}</span>
              </div>
            ))}
          </div>
        </RoomModal>
      )}
    </RoomView>
  );
}

/* ======================= 마음의 방(마음우체통) ======================= */
function HeartView({ gems, worries, onPost, onBack, bubble }) {
  const [open, setOpen] = useState(null); // null | "고해성사" | "서운"
  const [cost, setCost] = useState(1);
  const [text, setText] = useState("");
  const furniture = [
    { id: "confess", x: 150, y: 120, w: 110, h: 140, color: "#c0563a", emoji: "📮", label: "고해성사함", onInteract: () => { setOpen("고해성사"); setText(""); } },
    { id: "grievance", x: 380, y: 120, w: 110, h: 140, color: "#8e5a9e", emoji: "💌", label: "서운함 우체통", onInteract: () => { setOpen("서운"); setText(""); } },
    { id: "bench", x: 60, y: 320, w: 120, h: 56, color: "#a9814a", emoji: "🪑", label: "벤치", toast: "잠시 앉아 마음을 가라앉힌다" },
  ];
  const isConfess = open === "고해성사";
  const list = worries.filter((w) => w.kind === open);
  return (
    <RoomView title="마음의 방" icon="💌" sub="고해성사 · 서운함을 익명으로 털어놓는 곳" bg="#efe0e6" roomW={640} roomH={400} furniture={furniture} onBack={onBack} paused={!!open} headerBg="#d76b96" bubble={bubble}>
      {open && (
        <RoomModal title={isConfess ? "🙏 고해성사함" : "💌 서운함 우체통"} onClose={() => setOpen(null)}>
          <div style={{ fontSize: 12, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: C.inkSoft }}>익명으로 남겨요. 아무도 누군지 몰라요.</span><GemBadge kind="gold" amount={gems} />
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {[0.5, 1].map((v) => (
              <PxButton key={v} tone={cost === v ? "gold" : "wood"} onClick={() => setCost(v)} style={{ fontSize: 12, padding: "6px 10px" }}>🪙 {v} 넣기</PxButton>
            ))}
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={isConfess ? "고백할 것을 털어놓아 보세요…" : "서운했던 일을 남겨보세요…"}
            style={{ width: "100%", boxSizing: "border-box", height: 100, padding: 10, border: `3px solid ${C.ink}`, fontFamily: "'DotGothic16', monospace", fontSize: 13, background: "#fffdf5", resize: "none" }} />
          <PxButton tone="good" disabled={!text.trim() || gems < cost} onClick={() => { onPost(text.trim(), cost, open); setText(""); }} style={{ width: "100%", marginTop: 8, padding: 10, fontSize: 13 }}>
            {gems < cost ? "골드가 부족해요" : `🪙 ${cost} 내고 익명으로 넣기`}
          </PxButton>
          {list.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: C.inkSoft, marginBottom: 6 }}>{isConfess ? "고해성사함에 쌓인 고백들" : "서운함 우체통에 쌓인 마음들"}</div>
              <div style={{ maxHeight: 140, overflow: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                {list.map((w) => (
                  <div key={w.id} style={{ background: "#fff", border: `2px solid ${C.ink}`, padding: 8, fontSize: 12 }}>{isConfess ? "🙏 그랬구나 · " : "💢 서운해요 · "}{w.text}</div>
                ))}
              </div>
            </div>
          )}
        </RoomModal>
      )}
    </RoomView>
  );
}

/* ======================= 리스닝 방(디제이 + 관객석 + BGM) ======================= */
function parseYouTubeId(url) {
  const s = String(url || "").trim();
  if (!s) return null;
  // youtu.be/ID · watch?v=ID · embed/ID · shorts/ID · live/ID · /v/ID
  const m = s.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/|\/v\/)([\w-]{11})/);
  if (m) return m[1];
  // 영상 ID만 붙여넣은 경우
  if (/^[\w-]{11}$/.test(s)) return s;
  return null;
}
function ListeningView({ onBack, gems, onSpend, bubble, songs, setSongs, onPlayYt, ytNow }) {
  const inp = { padding: 8, border: `3px solid ${C.ink}`, fontFamily: "'DotGothic16', monospace", fontSize: 13, background: C.white, boxSizing: "border-box" };
  const [open, setOpen] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
  const [reqText, setReqText] = useState("");
  const [linkErr, setLinkErr] = useState(null);
  const say = (m) => { setLinkErr(m); setTimeout(() => setLinkErr(null), 2600); };

  /* 링크 · 가수 · 제목을 따로 입력 */
  const [nu, setNu] = useState("");   // 유튜브 링크
  const [na, setNa] = useState("");   // 가수
  const [nt, setNt] = useState("");   // 제목
  const [nd, setNd] = useState("");   // 한 줄 소개

  const label = (s) => (s.artist ? `${s.artist} - ${s.title}` : s.title);

  const addSong = (autoPlay = true) => {
    const vid = parseYouTubeId(nu);
    const artist = na.trim(), title = nt.trim();
    if (!vid && !title) { say("유튜브 링크 또는 제목 중 하나는 넣어주세요"); return; }
    if (nu.trim() && !vid) { say("유튜브 링크를 인식하지 못했어요. 주소를 확인해주세요"); return; }
    const s = {
      id: Date.now(), artist, title: title || "유튜브 영상", desc: nd.trim(),
      videoId: vid, q: [artist, title].filter(Boolean).join(" ") || nu.trim(),
    };
    setSongs((v) => [...v, s]);
    setNu(""); setNa(""); setNt(""); setNd("");
    if (vid && autoPlay) onPlayYt(s);
  };

  const requestSong = () => {
    const t = reqText.trim();
    if (!t || gems < 5) return;
    onSpend(5);
    const vid = parseYouTubeId(t);
    const s = { id: Date.now(), artist: "", title: vid ? "신청곡 (유튜브)" : t, desc: "신청곡 🎶", videoId: vid, q: t };
    setSongs((v) => [...v, s]);
    setReqText(""); setReqOpen(false);
    if (vid) onPlayYt(s);
  };

  const pickSong = (s) => {
    if (s.videoId) { onPlayYt(s); return; }
    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(s.q || label(s))}`, "_blank", "noopener");
  };

  const furniture = [
    { id: "dj", x: 40, y: 80, w: 175, h: 160, color: "#3a2b52", emoji: "🎧", label: "디제이 부스", onInteract: () => setOpen(true) },
    { id: "s1", x: 330, y: 110, w: 80, h: 60, color: "#caa06a", emoji: "🪑", label: "관객석", toast: "관객석에서 음악에 몸을 맡긴다 🎶" },
    { id: "s2", x: 450, y: 110, w: 80, h: 60, color: "#caa06a", emoji: "🪑", label: "관객석", toast: "옆 사람과 리듬을 탄다 🕺" },
    { id: "s3", x: 330, y: 220, w: 80, h: 60, color: "#caa06a", emoji: "🪑", label: "관객석", toast: "눈을 감고 감상 중… 🎵" },
    { id: "s4", x: 450, y: 220, w: 80, h: 60, color: "#caa06a", emoji: "🪑", label: "관객석", toast: "앵콜! 👏" },
  ];

  const banner = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#241a33", color: "#ffe680", borderBottom: `3px solid ${C.ink}`, flexWrap: "wrap" }}>
      <span className={ytNow ? "gem-spin" : ""} style={{ fontSize: 16 }}>♬</span>
      <b style={{ fontSize: 13 }}>{ytNow ? label(ytNow) : "재생 중인 곡 없음"}</b>
      <PxButton tone="gold" onClick={() => setOpen(true)} style={{ fontSize: 12, padding: "4px 10px", marginLeft: 6 }}>🎧 선곡하기</PxButton>
      <PxButton tone="blue" onClick={() => setReqOpen(true)} style={{ fontSize: 12, padding: "4px 10px" }}>🎵 신청곡(🪙5)</PxButton>
      <span style={{ fontSize: 10, color: "#b9a7d6", marginLeft: "auto" }}>보유 {fmt(gems)}🪙</span>
    </div>
  );

  return (
    <RoomView title="리스닝 방" icon="🎵" sub="디제이 부스에서 선곡 · 관객석에서 감상" bg="#2a2140" roomW={640} roomH={400} furniture={furniture} onBack={onBack} paused={open || reqOpen} headerBg="#5b8def" banner={banner} bubble={bubble}>
      {reqOpen && (
        <RoomModal title="🎵 신청곡" onClose={() => setReqOpen(false)} maxW={360}>
          <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 8 }}>🪙 5골드로 신청해요. <b>유튜브 링크</b>를 넣으면 바로 재생됩니다. (보유 {fmt(gems)}🪙)</div>
          <input value={reqText} onChange={(e) => setReqText(e.target.value)} placeholder="곡 제목 또는 유튜브 링크" style={{ ...inp, width: "100%", fontSize: 14 }} />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <PxButton tone="ink" onClick={() => setReqOpen(false)} style={{ flex: 1, padding: 10, fontSize: 13 }}>취소</PxButton>
            <PxButton tone="gold" disabled={!reqText.trim() || gems < 5} onClick={requestSong} style={{ flex: 1, padding: 10, fontSize: 13 }}>{gems < 5 ? "골드 부족" : "🪙5 신청"}</PxButton>
          </div>
        </RoomModal>
      )}
      {open && (
        <RoomModal title="🎧 디제이 · 선곡 리스트" onClose={() => setOpen(false)} maxW={520}>
          {/* 링크 · 가수 · 제목 따로 입력 */}
          <div style={{ background: "#241a33", border: `3px solid ${C.ink}`, borderRadius: 8, padding: 11, marginBottom: 11 }}>
            <div style={{ fontSize: 12.5, color: "#ffe680", fontWeight: "bold", marginBottom: 7 }}>＋ 노래 등록</div>
            <div style={{ display: "grid", gap: 6 }}>
              <input value={nu} onChange={(e) => setNu(e.target.value)}
                onPaste={(e) => { const v = (e.clipboardData || window.clipboardData).getData("text"); if (parseYouTubeId(v)) { e.preventDefault(); setNu(v); } }}
                placeholder="🔗 유튜브 링크 (youtu.be / watch?v= / shorts)" style={{ ...inp, width: "100%", fontSize: 12 }} />
              <div style={{ display: "flex", gap: 6 }}>
                <input value={na} onChange={(e) => setNa(e.target.value)} placeholder="🎤 가수" style={{ ...inp, flex: 1, minWidth: 0 }} />
                <span style={{ color: "#ffe680", alignSelf: "center", fontWeight: "bold" }}>-</span>
                <input value={nt} onChange={(e) => setNt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addSong(); }} placeholder="🎵 제목" style={{ ...inp, flex: 1.4, minWidth: 0 }} />
              </div>
              <input value={nd} onChange={(e) => setNd(e.target.value)} placeholder="한 줄 소개 (선택)" style={{ ...inp, width: "100%", fontSize: 12 }} />
            </div>
            {(na.trim() || nt.trim()) && (
              <div style={{ fontSize: 11.5, color: "#b9a7d6", marginTop: 7 }}>표시될 이름 : <b style={{ color: "#ffe680" }}>{[na.trim(), nt.trim()].filter(Boolean).join(" - ")}</b></div>
            )}
            {linkErr && <div style={{ fontSize: 11.5, color: "#ff9a8a", marginTop: 7 }}>⚠️ {linkErr}</div>}
            <div style={{ display: "flex", gap: 6, marginTop: 9 }}>
              <PxButton tone="wood" onClick={() => addSong(false)} style={{ flex: 1, fontSize: 12, padding: 9 }}>목록에만 추가</PxButton>
              <PxButton tone="gold" onClick={() => addSong(true)} style={{ flex: 1.4, fontSize: 12, padding: 9 }}>▶ 등록하고 재생</PxButton>
            </div>
            <div style={{ fontSize: 10, color: "#b9a7d6", marginTop: 6 }}>재생하면 방을 나가도 계속 들려요 (좌측 하단 미니 플레이어)</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflow: "auto" }}>
            {songs.length === 0 && <div style={{ fontSize: 12, color: C.inkSoft, textAlign: "center", padding: 20 }}>등록된 노래가 없어요 🎵</div>}
            {songs.map((sg) => {
              const on = ytNow && ytNow.id === sg.id;
              return (
                <div key={sg.id} style={{ display: "flex", alignItems: "center", gap: 8, background: on ? C.gem : C.white, border: `3px solid ${C.ink}`, padding: "8px 10px" }}>
                  <span style={{ fontSize: 18 }}>{sg.videoId ? "▶" : "🎵"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ fontSize: 13, wordBreak: "break-word" }}>{label(sg)}</b>
                    {sg.videoId && <span style={{ fontSize: 9, background: C.good, color: C.white, borderRadius: 8, padding: "1px 6px", marginLeft: 6 }}>바로재생</span>}
                    {sg.desc && <div style={{ fontSize: 11, color: C.inkSoft, wordBreak: "break-all" }}>{sg.desc}</div>}
                  </div>
                  <PxButton tone={on ? "ink" : "good"} onClick={() => pickSong(sg)} style={{ fontSize: 11, padding: "6px 9px" }}>{on ? "재생 중" : sg.videoId ? "▶ 재생" : "🔍 유튜브"}</PxButton>
                  <button onClick={() => setSongs((v) => v.filter((x) => x.id !== sg.id))} title="삭제" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: C.inkSoft }}>🗑</button>
                </div>
              );
            })}
          </div>
        </RoomModal>
      )}
    </RoomView>
  );
}

/* ======================= 릴스방(핸드폰 · 동물/쾌감/밈 + 카테고리 추가) ======================= */
function ReelsView({ onBack, bubble, extraCats = {}, onAddCat }) {
  const [open, setOpen] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addText, setAddText] = useState("");
  const [reels, setReels] = useState({
    animal: { label: "동물", bg: "#bfe3c8", title: "댕댕이·냥이 모음.zip 🐾",
      content: <div style={{ fontSize: 40, lineHeight: 1.3, textAlign: "center" }}>🐶🐱<br />🐰🐼<br />🦊🐹</div> },
    satisfy: { label: "쾌감", bg: "repeating-linear-gradient(45deg,#ff8fb1 0 16px,#ffd36b 16px 32px,#8fd0ff 32px 48px,#b6f0c0 48px 64px)", title: "끝없이 보게 되는 쾌감 영상 ✨",
      content: <div style={{ fontSize: 44 }}>🌈✨🫧</div> },
    meme: { label: "밈", bg: "#1c1c1c", title: "밈 甲.jpg 😂",
      content: (
        <div style={{ textAlign: "center", color: "#fff" }}>
          <div style={{ fontSize: 13, fontWeight: "bold", textShadow: "1px 1px 0 #000" }}>월요일 아침의 나</div>
          <div style={{ fontSize: 54 }}>😵‍💫</div>
          <div style={{ fontSize: 13, fontWeight: "bold", textShadow: "1px 1px 0 #000" }}>"5분만 더…"</div>
        </div>
      ) },
  });

  const addCategory = () => {
    const name = addText.trim();
    if (!name) return;
    const key = "c" + Date.now();
    const palette = ["#bfe3c8", "#f6d8e5", "#cdeaf4", "#f1e2b0", "#e7cfe9", "#dfe3e6"];
    onAddCat && onAddCat(key, { label: name, bg: palette[Object.keys(reels).length % palette.length], title: `${name} 릴스 🎬` });
    setAddText(""); setAddOpen(false);
  };

  const phoneColors = ["#3fa07a", "#5b8def", "#e0a13d", "#d76b96", "#8e5a9e", "#c0563a"];
  const merged = useMemo(() => ({ ...reels, ...Object.fromEntries(Object.entries(extraCats).map(([k, v]) => [k, { ...v, content: <div style={{ fontSize: 46 }}>🎬✨</div> }])) }), [reels, extraCats]);
  const cats = Object.keys(merged);
  const furniture = cats.map((key, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    return { id: key, x: 40 + col * 150, y: 90 + row * 170, w: 90, h: 150, color: phoneColors[i % phoneColors.length], emoji: "📱", label: merged[key].label, onInteract: () => setOpen(key) };
  });

  const banner = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#1b2530", color: C.white, borderBottom: `3px solid ${C.ink}`, flexWrap: "wrap" }}>
      <span style={{ fontSize: 13 }}>📱 카테고리 {cats.length}개</span>
      <PxButton tone="gold" onClick={() => setAddOpen(true)} style={{ fontSize: 12, padding: "4px 10px", marginLeft: "auto" }}>＋ 카테고리 추가</PxButton>
    </div>
  );

  return (
    <RoomView title="릴스방" icon="📱" sub="핸드폰을 눌러 릴스 감상 · 카테고리 추가 가능" bg="#141c26" roomW={640} roomH={400} furniture={furniture} onBack={onBack} paused={!!open || addOpen} headerBg="#3fa07a" banner={banner} bubble={bubble}>
      {addOpen && (
        <RoomModal title="＋ 카테고리 추가" onClose={() => setAddOpen(false)} maxW={340}>
          <input value={addText} onChange={(e) => setAddText(e.target.value)} placeholder="예: 요리, 여행, 운동…" style={{ width: "100%", boxSizing: "border-box", padding: 9, border: `3px solid ${C.ink}`, fontFamily: "'DotGothic16', monospace", fontSize: 14, background: C.white }} />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <PxButton tone="ink" onClick={() => setAddOpen(false)} style={{ flex: 1, padding: 10, fontSize: 13 }}>취소</PxButton>
            <PxButton tone="good" disabled={!addText.trim()} onClick={addCategory} style={{ flex: 1, padding: 10, fontSize: 13 }}>추가</PxButton>
          </div>
        </RoomModal>
      )}
      {open && (
        <RoomModal title={`📱 릴스 · ${merged[open].label}`} onClose={() => setOpen(null)} maxW={320}>
          <div style={{ margin: "0 auto", width: 230, background: "#111", border: "6px solid #000", borderRadius: 24, padding: "12px 10px" }}>
            <div style={{ width: 56, height: 6, background: "#333", borderRadius: 6, margin: "0 auto 8px" }} />
            <div style={{ aspectRatio: "9/16", background: merged[open].bg, border: "2px solid #000", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
              {merged[open].content}
              <div style={{ position: "absolute", bottom: 8, left: 8, right: 8, color: "#fff", fontSize: 12, textShadow: "1px 1px 0 #000" }}>{merged[open].title}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-around", marginTop: 8, fontSize: 18 }}><span>❤️</span><span>💬</span><span>🔁</span><span>🔖</span></div>
          </div>
          <div style={{ textAlign: "center", fontSize: 11, color: C.inkSoft, marginTop: 8 }}>예시 릴스 (데모 그래픽)</div>
        </RoomModal>
      )}
    </RoomView>
  );
}

/* ======================= 미니게임 방 ======================= */

const CONTESTS = [
  { id: "c1", title: "반응속도 챔피언십", date: "8/2 (토) 20:00", game: "reaction" },
  { id: "c2", title: "가위바위보 왕중왕전", date: "8/9 (토) 20:00", game: "rps" },
  { id: "c3", title: "숫자 순서 스피드런", date: "8/16 (토) 20:00", game: "sequence" },
];
const CONTEST_RANK = {
  reaction: [{ n: "유리", s: 312 }, { n: "정인", s: 298 }, { n: "의준", s: 284 }, { n: "호중", s: 271 }, { n: "희정", s: 255 }],
  rps: [{ n: "호중", s: 27 }, { n: "희정", s: 24 }, { n: "정인", s: 22 }, { n: "유리", s: 19 }, { n: "의준", s: 17 }],
  sequence: [{ n: "의준", s: 18 }, { n: "유리", s: 16 }, { n: "희정", s: 15 }, { n: "정인", s: 13 }, { n: "호중", s: 12 }],
};

function ContestModal({ onClose, onPlay }) {
  return (
    <RoomModal title="🏆 미니게임 대회" onClose={onClose} maxW={440}>
      <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 10 }}>다가오는 대회 일정과 순위예요. 게임 링크로 바로 연습해보세요!</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {CONTESTS.map((c) => (
          <div key={c.id} style={{ background: C.white, border: `3px solid ${C.ink}`, padding: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: "bold", color: "#fff", background: "#8e5a9e", padding: "2px 7px", whiteSpace: "nowrap" }}>📅 {c.date}</span>
              <b style={{ flex: 1, fontSize: 14, minWidth: 100 }}>{c.title}</b>
              <PxButton tone="good" onClick={() => onPlay(c.game)} style={{ fontSize: 11, padding: "5px 9px" }}>🎮 게임 링크</PxButton>
            </div>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
              {CONTEST_RANK[c.game].map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, borderBottom: `1px dashed ${C.parchEdge}`, paddingBottom: 2 }}>
                  <span style={{ width: 18, fontWeight: "bold", color: i === 0 ? "#a86e13" : C.inkSoft }}>{i + 1}</span>
                  <span style={{ flex: 1 }}>{r.n}</span>
                  <b>{r.s}</b>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </RoomModal>
  );
}
/* ======================= 라이어 게임 ======================= */
const LIAR_TOPICS = {
  "음식": ["마라탕", "치킨", "김치찌개", "피자", "떡볶이", "초밥", "삼겹살", "냉면", "짜장면", "곱창"],
  "직장": ["회의", "연차", "월급", "출근", "야근", "회식", "점심시간", "퇴사", "결재", "카톡 답장"],
  "장소": ["수영장", "헬스장", "공항", "도서관", "편의점", "놀이공원", "카페", "지하철", "찜질방", "노래방"],
  "취미": ["넷플릭스", "등산", "캠핑", "게임", "독서", "여행", "사진", "낚시", "홈트", "덕질"],
  "에코타운": ["스타 젬", "치앙마이", "쩝쩝박사", "주민센터", "무신사", "샌드백", "점심술사", "보스맵", "흡연의 방", "네이버스쿨"],
};
const LIAR_LINES = [
  "음... 저는 꽤 자주 접하는 편이에요.", "생각보다 호불호가 갈리죠.", "저는 좋아하는데 사람마다 다르더라고요.",
  "이건 타이밍이 중요하죠.", "돈이 좀 들긴 해요 ㅋㅋ", "주말에 많이들 하지 않나요?",
  "말 안 해도 다들 알 것 같은데요.", "저는 좀 애매해요 솔직히.", "처음엔 별로였는데 지금은 괜찮아요.",
  "이거 얘기하면 너무 티나려나...", "무난하게 좋아요.", "요즘 특히 많이 하죠.",
];
const LIAR_CHAT = ["ㅋㅋㅋㅋ", "아 뭔가 수상한데", "지금 눈 굴렸어 방금", "나 진짜 아님", "얘 말투 이상해", "빨리빨리~", "표정 관리 좀", "오 방금 티났다", "음~ 글쎄요", "저 사람 각인데?"];

/* ===== 🕵️ 라이어 게임 (실제 접속자 멀티플레이) =====
   방을 만든 사람이 호스트가 되어 상태를 관리하고, 나머지는 행동만 보냅니다.
   호스트가 계산한 결과를 모두에게 방송해 화면을 맞춥니다. */
function LiarGame({ onClose, onReward, myName = "", people = [], game, onAction }) {
  const [text, setText] = useState("");
  const [cat, setCat] = useState("랜덤");
  const logRef = useAutoScroll(game && game.log ? game.log.length : 0);
  const me = myName || "나";
  const g = game || null;
  const inRoom = !!(g && g.players && g.players.includes(me));
  const isHost = !!(g && g.host === me);
  const iAmLiar = !!(g && g.liar === me);
  const myTurn = !!(g && g.phase === "hint" && g.players[g.turn] === me);
  const alive = (g && g.players) || [];

  const send = (type, payload) => onAction && onAction(type, payload || {});

  const Card = ({ children, tone }) => (
    <div style={{ background: tone || C.white, border: `3px solid ${C.ink}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>{children}</div>
  );

  return (
    <RoomModal title="🕵️ 라이어 게임" onClose={onClose} maxW={470}>
      {/* ── 대기실 ── */}
      {(!g || g.phase === "idle") && (
        <div>
          <Card>
            <div style={{ fontSize: 13, lineHeight: 1.9 }}>
              제시어를 아는 <b>시민들</b> 사이에 <b style={{ color: C.danger }}>라이어</b> 한 명이 숨어 있어요.<br />
              돌아가며 힌트를 말하고, 누가 라이어인지 투표로 찾아냅니다.
            </div>
            <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 8, lineHeight: 1.7 }}>
              · 3명 이상이면 시작할 수 있어요<br />
              · 라이어는 제시어를 모른 채 아는 척해야 해요<br />
              · 라이어를 잡으면 시민 🪙10, 라이어가 살아남으면 라이어 🪙15
            </div>
          </Card>
          <PxButton tone="gold" onClick={() => send("create", { cat })} style={{ width: "100%", padding: 13, fontSize: 14 }}>🎮 방 만들기</PxButton>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
            {["랜덤", ...Object.keys(LIAR_TOPICS)].map((c) => (
              <PxButton key={c} tone={cat === c ? "good" : "wood"} onClick={() => setCat(c)} style={{ flex: "1 1 70px", fontSize: 11, padding: 7 }}>{c}</PxButton>
            ))}
          </div>
          <div style={{ fontSize: 11, color: C.inkSoft, textAlign: "center", marginTop: 10 }}>
            누군가 방을 만들면 여기에 참가 버튼이 떠요 · 접속자 {people.length}명
          </div>
        </div>
      )}

      {/* ── 모집 중 ── */}
      {g && g.phase === "lobby" && (
        <div>
          <Card tone="#fff5d6">
            <div style={{ fontSize: 13, fontWeight: "bold" }}>🎮 {g.host}님의 방 · 주제 {g.cat}</div>
            <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 4 }}>3명 이상 모이면 시작할 수 있어요</div>
          </Card>
          <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 6 }}>참가자 {alive.length}명</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10, maxHeight: 150, overflow: "auto" }}>
            {alive.map((n) => (
              <div key={n} style={{ background: C.white, border: `2px solid ${C.ink}`, borderRadius: 6, padding: "7px 10px", fontSize: 13 }}>
                🧑 {n}{n === g.host ? " 👑" : ""}{n === me ? " (나)" : ""}
              </div>
            ))}
          </div>
          {!inRoom
            ? <PxButton tone="good" onClick={() => send("join")} style={{ width: "100%", padding: 12, fontSize: 14 }}>🙋 참가하기</PxButton>
            : isHost
              ? <PxButton tone="gold" disabled={alive.length < 3} onClick={() => send("start")} style={{ width: "100%", padding: 12, fontSize: 14 }}>
                  {alive.length < 3 ? `${3 - alive.length}명 더 필요해요` : "▶ 게임 시작"}
                </PxButton>
              : <div style={{ fontSize: 12.5, color: C.inkSoft, textAlign: "center", padding: 10 }}>호스트가 시작하기를 기다리는 중… ⏳</div>}
          {inRoom && <PxButton tone="ink" onClick={() => send("leave")} style={{ width: "100%", padding: 9, fontSize: 12, marginTop: 8 }}>나가기</PxButton>}
        </div>
      )}

      {/* ── 힌트 / 투표 / 결과 ── */}
      {g && (g.phase === "hint" || g.phase === "vote" || g.phase === "result") && (
        <div>
          <Card tone={iAmLiar ? "#fbe4e0" : "#e6f4ec"}>
            <div style={{ fontSize: 11, color: C.inkSoft }}>주제 · {g.cat}</div>
            {g.phase === "result" ? (
              <div style={{ fontSize: 16, fontWeight: "bold", marginTop: 4 }}>제시어는 「{g.word}」 였어요</div>
            ) : iAmLiar ? (
              <div style={{ fontSize: 16, fontWeight: "bold", marginTop: 4, color: C.danger }}>🤫 당신은 라이어! 제시어를 몰라요</div>
            ) : (
              <div style={{ fontSize: 18, fontWeight: "bold", marginTop: 4 }}>제시어 · {g.word}</div>
            )}
          </Card>

          <div ref={logRef} style={{ height: 150, overflow: "auto", background: "#efe6d2", border: `2px solid ${C.ink}`, borderRadius: 6, padding: 8, marginBottom: 8, display: "flex", flexDirection: "column", gap: 4 }}>
            {(g.log || []).length === 0 && <div style={{ fontSize: 11.5, color: C.inkSoft }}>첫 힌트를 기다리는 중…</div>}
            {(g.log || []).map((l, i) => (
              <div key={i} style={{ fontSize: 12.5 }}><b style={{ color: "#5b8def" }}>{l.who}</b> {l.text}</div>
            ))}
          </div>

          {g.phase === "hint" && (
            myTurn ? (
              <div style={{ display: "flex", gap: 6 }}>
                <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) { send("hint", { text: text.trim() }); setText(""); } }}
                  autoFocus placeholder="한 마디로 힌트를 주세요" style={{ flex: 1, minWidth: 0, padding: 9, border: `3px solid ${C.ink}`, fontFamily: "'DotGothic16', monospace", fontSize: 13, background: C.white }} />
                <PxButton tone="good" disabled={!text.trim()} onClick={() => { send("hint", { text: text.trim() }); setText(""); }} style={{ fontSize: 12, padding: "9px 12px" }}>말하기</PxButton>
              </div>
            ) : (
              <div style={{ fontSize: 13, textAlign: "center", padding: 10, color: C.inkSoft }}>
                <b style={{ color: C.ink }}>{alive[g.turn]}</b> 님의 차례예요 ⏳
              </div>
            )
          )}

          {g.phase === "vote" && (
            <div>
              <div style={{ fontSize: 12.5, fontWeight: "bold", marginBottom: 6 }}>🗳 누가 라이어일까요?</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {alive.filter((n) => n !== me).map((n) => (
                  <PxButton key={n} tone={g.votes && g.votes[me] === n ? "good" : "wood"} onClick={() => send("vote", { target: n })} style={{ padding: 10, fontSize: 13 }}>
                    🧑 {n}{g.votes && g.votes[me] === n ? " ✓" : ""}
                  </PxButton>
                ))}
              </div>
              <div style={{ fontSize: 11, color: C.inkSoft, textAlign: "center", marginTop: 8 }}>
                {Object.keys(g.votes || {}).length} / {alive.length} 명 투표함
              </div>
            </div>
          )}

          {g.phase === "result" && (
            <div>
              <Card tone={g.caught ? "#e6f4ec" : "#fbe4e0"}>
                <div style={{ fontSize: 15, fontWeight: "bold", textAlign: "center" }}>
                  {g.caught ? "🎉 라이어를 잡았어요!" : "😈 라이어가 살아남았어요!"}
                </div>
                <div style={{ fontSize: 13, textAlign: "center", marginTop: 6 }}>라이어는 <b style={{ color: C.danger }}>{g.liar}</b> 였습니다</div>
                <div style={{ fontSize: 12, color: C.inkSoft, textAlign: "center", marginTop: 6 }}>
                  최다 득표 · {g.topVoted || "없음"}
                </div>
              </Card>
              {isHost && <PxButton tone="gold" onClick={() => send("again")} style={{ width: "100%", padding: 12, fontSize: 14 }}>🔁 한 판 더</PxButton>}
              <PxButton tone="ink" onClick={() => send("leave")} style={{ width: "100%", padding: 10, fontSize: 12, marginTop: 8 }}>나가기</PxButton>
            </div>
          )}

          <div style={{ fontSize: 10.5, color: C.inkSoft, textAlign: "center", marginTop: 10 }}>
            참가자 {alive.join(" · ")}
          </div>
        </div>
      )}
    </RoomModal>
  );
}

function MiniGameRoom({ onBack, onReward, bubble, myName = "", people = [] }) {
  const [game, setGame] = useState(null); // 'reaction' | 'rps' | 'sequence'
  const [contest, setContest] = useState(false);
  const furniture = [
    { id: "reaction", x: 60, y: 110, w: 130, h: 100, color: "#5b8def", emoji: "⚡", label: "반응속도", onInteract: () => setGame("reaction") },
    { id: "rps", x: 260, y: 110, w: 130, h: 100, color: "#d76b96", emoji: "✊", label: "가위바위보", onInteract: () => setGame("rps") },
    { id: "seq", x: 460, y: 110, w: 130, h: 100, color: "#e0a13d", emoji: "🔢", label: "숫자 순서", onInteract: () => setGame("sequence") },
    { id: "liar", x: 60, y: 260, w: 150, h: 100, color: "#7a5cd6", emoji: "🕵️", label: "라이어 게임", onInteract: () => setGame("liar") },
    { id: "contest", x: 260, y: 260, w: 150, h: 100, color: "#c9a15f", emoji: "🏆", label: "대회 코너", onInteract: () => setContest(true) },
  ];
  return (
    <RoomView title="미니게임 방" icon="🎮" sub="게임 테이블에 다가가 Space · 🏆 대회 코너에서 일정·순위 확인" bg="#20182e" roomW={640} roomH={400} furniture={furniture} onBack={onBack} paused={!!game || contest} headerBg="#8e5a9e" bubble={bubble}>
      {game === "reaction" && <ReactionGame onClose={() => setGame(null)} onReward={onReward} />}
      {game === "rps" && <RpsGame onClose={() => setGame(null)} onReward={onReward} />}
      {game === "sequence" && <SequenceGame onClose={() => setGame(null)} onReward={onReward} />}
      {game === "liar" && <LiarGame onClose={() => setGame(null)} onReward={onReward} myName={myName} people={people} game={liarGame} onAction={onLiarAction} />}
      {contest && <ContestModal onClose={() => setContest(false)} onPlay={(g) => { setContest(false); setGame(g); }} />}
    </RoomView>
  );
}

function ReactionGame({ onClose, onReward }) {
  const [state, setState] = useState("idle"); // idle | wait | go | result | tooearly
  const [ms, setMs] = useState(0);
  const startRef = useRef(0);
  const toRef = useRef(null);
  const begin = () => {
    setState("wait");
    toRef.current = setTimeout(() => { startRef.current = Date.now(); setState("go"); }, 800 + Math.random() * 2000);
  };
  const click = () => {
    if (state === "wait") { clearTimeout(toRef.current); setState("tooearly"); }
    else if (state === "go") { const t = Date.now() - startRef.current; setMs(t); setState("result"); if (t < 350) onReward(3); }
  };
  useEffect(() => () => clearTimeout(toRef.current), []);
  const bg = state === "go" ? C.good : state === "wait" ? C.danger : "#3a3550";
  return (
    <RoomModal title="⚡ 반응속도 테스트" onClose={onClose} maxW={360}>
      <button onClick={state === "idle" || state === "result" || state === "tooearly" ? begin : click}
        style={{ width: "100%", height: 150, background: bg, color: C.white, border: `3px solid ${C.ink}`, cursor: "pointer", fontFamily: "'DotGothic16', monospace", fontSize: 15 }}>
        {state === "idle" && "클릭해서 시작"}
        {state === "wait" && "초록색이 되면 클릭!"}
        {state === "go" && "지금 클릭!!"}
        {state === "tooearly" && "너무 빨라요! 다시 클릭"}
        {state === "result" && `${ms}ms ${ms < 350 ? "⚡ +3🪙" : "😅 조금 느려요"} · 다시하기`}
      </button>
      <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 8, textAlign: "center" }}>350ms 이내면 🪙3 골드 획득</div>
    </RoomModal>
  );
}

function RpsGame({ onClose, onReward }) {
  const [result, setResult] = useState(null);
  const hands = [["rock", "✊"], ["scissors", "✌️"], ["paper", "✋"]];
  const play = (me) => {
    const cpu = hands[Math.floor(Math.random() * 3)][0];
    let r = "무승부";
    const win = { rock: "scissors", scissors: "paper", paper: "rock" };
    if (me === cpu) r = "무승부";
    else if (win[me] === cpu) { r = "승리! +2🪙"; onReward(2); }
    else r = "패배";
    const emoji = (k) => hands.find((h) => h[0] === k)[1];
    setResult({ me: emoji(me), cpu: emoji(cpu), r });
  };
  return (
    <RoomModal title="✊ 가위바위보" onClose={onClose} maxW={360}>
      <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 12 }}>
        {hands.map(([k, e]) => (
          <PxButton key={k} tone="wood" onClick={() => play(k)} style={{ fontSize: 26, padding: "10px 14px" }}>{e}</PxButton>
        ))}
      </div>
      {result && (
        <div style={{ textAlign: "center", fontSize: 15 }}>
          나 {result.me} vs {result.cpu} 컴퓨터<br />
          <b style={{ color: result.r.includes("승리") ? C.good : result.r === "패배" ? C.danger : C.inkSoft }}>{result.r}</b>
        </div>
      )}
      <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 8, textAlign: "center" }}>이기면 🪙2 골드 획득</div>
    </RoomModal>
  );
}

function SequenceGame({ onClose, onReward }) {
  const [nums, setNums] = useState(() => shuffle());
  const [next, setNext] = useState(1);
  const [done, setDone] = useState(false);
  function shuffle() { const a = [1, 2, 3, 4, 5, 6, 7, 8, 9]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }
  const tap = (n) => {
    if (n !== next) return;
    if (n === 9) { setDone(true); onReward(3); }
    setNext((v) => v + 1);
  };
  const reset = () => { setNums(shuffle()); setNext(1); setDone(false); };
  return (
    <RoomModal title="🔢 숫자 순서 클릭" onClose={onClose} maxW={340}>
      <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 8, textAlign: "center" }}>1→9 순서대로 눌러요 (다음: {done ? "완료 🎉" : next})</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
        {nums.map((n) => (
          <button key={n} onClick={() => tap(n)} disabled={n < next}
            style={{ aspectRatio: "1/1", fontSize: 22, fontFamily: "'DotGothic16', monospace", background: n < next ? C.good : C.white, color: n < next ? C.white : C.ink, border: `3px solid ${C.ink}`, cursor: n < next ? "default" : "pointer" }}>{n}</button>
        ))}
      </div>
      {done && <div style={{ textAlign: "center", marginTop: 10, color: C.good, fontWeight: "bold" }}>클리어! +3🪙</div>}
      <PxButton tone="ink" onClick={reset} style={{ width: "100%", marginTop: 10, padding: 8, fontSize: 12 }}>다시 섞기</PxButton>
    </RoomModal>
  );
}

/* ======================= 수영장 / 헬스장 ======================= */
function SwimRace({ onClose, onReward, scores, onRecord, myName = "" }) {
  const LANES = [myName || "나", "정인", "호중", "유리"];
  const [prog, setProg] = useState([0, 0, 0, 0]);
  const [phase, setPhase] = useState("ready");
  const [count, setCount] = useState(3);
  const [result, setResult] = useState(null);
  const [nick, setNick] = useState(myName);
  const [saved, setSaved] = useState(false);
  const progRef = useRef([0, 0, 0, 0]);
  const iv = useRef(null);
  const startRef = useRef(0);

  const finish = () => {
    if (iv.current) { clearInterval(iv.current); iv.current = null; }
    const p = progRef.current;
    const order = [0, 1, 2, 3].slice().sort((a, b) => p[b] - p[a]);
    const place = order.indexOf(0) + 1;
    const time = +((Date.now() - startRef.current) / 1000).toFixed(2);
    const win = place === 1;
    setPhase("done"); setResult({ place, time, win });
    if (win) onReward(10);
  };
  const tick = () => {
    const p = progRef.current.slice();
    for (let i = 1; i < 4; i++) p[i] = Math.min(100, p[i] + (0.8 + Math.random() * 1.7));
    progRef.current = p; setProg(p);
    if (Math.max(p[0], p[1], p[2], p[3]) >= 100) finish();
  };
  const startRace = () => {
    setResult(null); setSaved(false);
    progRef.current = [0, 0, 0, 0]; setProg([0, 0, 0, 0]);
    setPhase("count"); setCount(3);
    let c = 3;
    const cd = setInterval(() => {
      c -= 1;
      if (c <= 0) { clearInterval(cd); setCount(0); setPhase("go"); startRef.current = Date.now(); iv.current = setInterval(tick, 100); }
      else setCount(c);
    }, 800);
  };
  useEffect(() => {
    const onKey = (e) => {
      if (isTyping(e)) return;
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        if (phase === "ready" || phase === "done") { startRace(); return; }
        if (phase === "go" && !e.repeat) {
          const p = progRef.current.slice(); p[0] = Math.min(100, p[0] + 3); progRef.current = p; setProg(p);
          if (p[0] >= 100) finish();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);
  useEffect(() => () => { if (iv.current) clearInterval(iv.current); }, []);

  const ranked = [...scores].sort((a, b) => a.time - b.time).slice(0, 6);
  const saveRecord = () => { if (!result) return; onRecord(nick.trim() || myName || "나", result.time); setSaved(true); };

  return (
    <RoomModal title="🏊 수영 대결" onClose={onClose} maxW={520}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 300px" }}>
          <div style={{ background: "#2f8fb8", border: `3px solid ${C.ink}`, padding: 8, position: "relative" }}>
            {LANES.map((nm, i) => (
              <div key={i} style={{ position: "relative", height: 34, background: i % 2 ? "#3aa0c9" : "#49abd0", borderBottom: "2px dashed rgba(255,255,255,0.5)", marginBottom: 2 }}>
                <span style={{ position: "absolute", left: 4, top: 9, fontSize: 10, color: "#fff", fontWeight: "bold", zIndex: 2 }}>{nm}</span>
                <div style={{ position: "absolute", left: `calc(${prog[i]}% - 14px)`, top: 4, transition: "left .1s linear", fontSize: 22 }}>🏊</div>
                <span style={{ position: "absolute", right: 2, top: 0, bottom: 0, width: 3, background: "#e34b3a" }} />
              </div>
            ))}
            {phase === "count" && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)", color: "#fff", fontFamily: "'Press Start 2P', monospace", fontSize: 36 }}>{count === 0 ? "GO!" : count}</div>}
          </div>
          <div style={{ textAlign: "center", marginTop: 10 }}>
            {phase === "ready" && <PxButton tone="good" onClick={startRace} style={{ padding: "10px 20px", fontSize: 14 }}>▶ 시작 (Space)</PxButton>}
            {phase === "go" && <div style={{ fontSize: 14, fontWeight: "bold", color: C.danger }}>⌨️ 스페이스바 연타!</div>}
            {phase === "done" && result && (
              <div>
                <div style={{ fontSize: 16, fontWeight: "bold", marginBottom: 6 }}>{result.win ? "🥇 1등! +10🪙" : `${result.place}등 · 아쉽다!`} ({result.time}초)</div>
                {result.win && !saved && (
                  <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 6 }}>
                    <input value={nick} onChange={(e) => setNick(e.target.value)} placeholder="닉네임" maxLength={8} style={{ width: 100, padding: 6, border: `2px solid ${C.ink}`, fontFamily: "'DotGothic16', monospace", background: C.white }} />
                    <PxButton tone="gold" onClick={saveRecord} style={{ fontSize: 12, padding: "6px 10px" }}>랭킹 등록</PxButton>
                  </div>
                )}
                {saved && <div style={{ fontSize: 12, color: C.good, marginBottom: 6 }}>랭킹에 등록됐어요! ✓</div>}
                <PxButton tone="blue" onClick={startRace} style={{ padding: "8px 16px", fontSize: 13 }}>🔄 다시</PxButton>
              </div>
            )}
          </div>
        </div>
        <div style={{ flex: "1 1 150px" }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, marginBottom: 8 }}>🏆 기록 랭킹</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {ranked.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 6, fontSize: 12, background: C.white, border: `2px solid ${C.ink}`, padding: "4px 7px" }}>
                <span style={{ width: 16, fontWeight: "bold", color: i === 0 ? "#a86e13" : C.inkSoft }}>{i + 1}</span>
                <span style={{ flex: 1 }}>{s.nick}</span>
                <b>{s.time}s</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </RoomModal>
  );
}

function SwimContest({ onClose }) {
  const list = [
    { date: "8/3 (일) 15:00", title: "자유형 50m 오픈전", note: "누구나 참가 가능 · 우승 🪙50" },
    { date: "8/10 (일) 15:00", title: "에코타운 수영 챔피언십", note: "예선 통과자 본선 진출" },
    { date: "8/17 (일) 15:00", title: "릴레이 단체전", note: "4인 1팀 · 팀 우승 🪙100" },
  ];
  return (
    <RoomModal title="🏊 수영 대회 안내" onClose={onClose} maxW={400}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {list.map((c, i) => (
          <div key={i} style={{ background: C.white, border: `3px solid ${C.ink}`, padding: 10 }}>
            <span style={{ fontSize: 11, fontWeight: "bold", color: "#fff", background: "#4bb4d8", padding: "2px 7px" }}>📅 {c.date}</span>
            <div style={{ fontSize: 14, fontWeight: "bold", marginTop: 6 }}>{c.title}</div>
            <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 2 }}>{c.note}</div>
          </div>
        ))}
      </div>
    </RoomModal>
  );
}

function PoolView({ onBack, onReward, scores, onRecord, bubble, myName = "" }) {
  const [modal, setModal] = useState(null);
  const furniture = [
    { id: "lane", x: 130, y: 150, w: 380, h: 110, color: "#3aa0c9", emoji: "🏊", label: "수영 레인 (대결)", onInteract: () => setModal("race") },
    { id: "dive", x: 50, y: 40, w: 90, h: 70, color: "#c0563a", emoji: "🤿", label: "다이빙대", toast: "첨벙! 다이빙 성공 🤿" },
    { id: "contest", x: 175, y: 40, w: 120, h: 70, color: "#4bb4d8", emoji: "📋", label: "대회 안내", onInteract: () => setModal("contest") },
    { id: "sunbed", x: 500, y: 300, w: 110, h: 60, color: "#e0a13d", emoji: "⛱️", label: "선베드", toast: "선베드에서 일광욕 ☀️" },
    { id: "tube", x: 270, y: 310, w: 80, h: 60, color: "#ffe680", emoji: "🛟", label: "튜브", toast: "둥둥~ 물 위에 떠 있다 🛟" },
  ];
  return (
    <RoomView title="수영장" icon="🏊" sub="수영 레인에서 대결! · 📋 대회 안내" bg="#bfe6f2" roomW={640} roomH={400} furniture={furniture} onBack={onBack} paused={!!modal} headerBg="#4bb4d8" bubble={bubble}>
      {modal === "race" && <SwimRace onClose={() => setModal(null)} onReward={onReward} scores={scores} onRecord={onRecord} myName={myName} />}
      {modal === "contest" && <SwimContest onClose={() => setModal(null)} />}
    </RoomView>
  );
}
function GymView({ onBack, onWork, bubble }) {
  const [stretch, setStretch] = useState(false);
  const furniture = [
    { id: "tread", x: 45, y: 80, w: 110, h: 90, color: "#5a6b78", emoji: "🏃", label: "러닝머신", toast: "유산소 완료! 심박수 상승 🏃" },
    { id: "weight", x: 220, y: 110, w: 120, h: 100, color: "#c0563a", emoji: "🏋️", label: "웨이트 존(+4🪙)", onInteract: onWork, toast: "💪 운동하고 +4🪙 골드 획득!" },
    { id: "bench", x: 400, y: 80, w: 120, h: 90, color: "#7a8b99", emoji: "🛋️", label: "벤치프레스", toast: "가슴 운동 3세트 완료 💪" },
    { id: "stretch", x: 130, y: 290, w: 150, h: 70, color: "#7bbf8f", emoji: "🧘", label: "스트레칭 테이블", onInteract: () => setStretch(true) },
  ];
  const eye = [
    { t: "1. 눈 상하 운동", e: "👁️⬆️⬇️", d: "위·아래를 천천히 5회 번갈아 봐요" },
    { t: "2. 눈 좌우 운동", e: "👁️⬅️➡️", d: "좌·우를 천천히 5회 번갈아 봐요" },
    { t: "3. 눈 굴리기", e: "👁️🔄", d: "시계방향·반시계방향 3바퀴씩" },
    { t: "4. 먼 곳 보기", e: "👁️🏞️", d: "20초간 먼 곳을 바라보며 눈 휴식" },
  ];
  const shoulder = [
    { t: "1. 어깨 으쓱", e: "🤷", d: "어깨를 귀까지 올렸다 툭 내리기 ×10" },
    { t: "2. 어깨 돌리기", e: "🔄💪", d: "앞·뒤로 크게 원 그리며 5회씩" },
    { t: "3. 목·어깨 늘리기", e: "🧎↔️", d: "고개를 좌우로 기울여 15초씩 유지" },
    { t: "4. 날개뼈 모으기", e: "🫸🫷", d: "가슴 펴고 날개뼈 모으기 10초 ×3" },
  ];
  const Steps = ({ title, arr }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: "bold", fontSize: 14, marginBottom: 6 }}>{title}</div>
      <div style={{ display: "grid", gap: 6 }}>
        {arr.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: C.white, border: `2px solid ${C.ink}`, padding: "6px 10px" }}>
            <span style={{ fontSize: 24 }}>{s.e}</span>
            <div><b style={{ fontSize: 13 }}>{s.t}</b><div style={{ fontSize: 12, color: C.inkSoft }}>{s.d}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <RoomView title="헬스장" icon="💪" sub="러닝머신·웨이트·스트레칭 · 웨이트 존에서 골드 획득" bg="#e6e2da" roomW={640} roomH={400} furniture={furniture} onBack={onBack} headerBg="#c0563a" paused={stretch} bubble={bubble}>
      {stretch && (
        <RoomModal title="🧘 스트레칭 가이드" onClose={() => setStretch(false)} maxW={460}>
          <Steps title="👀 눈 스트레칭" arr={eye} />
          <Steps title="💪 어깨 스트레칭" arr={shoulder} />
        </RoomModal>
      )}
    </RoomView>
  );
}
/* ======================= 쩝쩝박사(음식점) ======================= */
const JJEOP_MENU = [
  { name: "마라탕", emoji: "🍲" }, { name: "치킨", emoji: "🍗" }, { name: "찜닭", emoji: "🍗" },
  { name: "피자", emoji: "🍕" }, { name: "햄버거", emoji: "🍔" }, { name: "국밥", emoji: "🍚" },
  { name: "서브웨이", emoji: "🥪" }, { name: "김치찜", emoji: "🥘" }, { name: "엽떡", emoji: "🌶️" },
  { name: "회", emoji: "🍣" }, { name: "삼겹살", emoji: "🥓" }, { name: "콩국수", emoji: "🍜" },
  { name: "냉면", emoji: "🥶" }, { name: "만두", emoji: "🥟" }, { name: "잔치국수", emoji: "🍜" },
  { name: "칼국수", emoji: "🍜" }, { name: "족발", emoji: "🍖" }, { name: "보쌈", emoji: "🥬" },
  { name: "마라샹궈", emoji: "🍲" }, { name: "돈까스", emoji: "🍱" }, { name: "쌀국수", emoji: "🍜" },
  { name: "제육볶음", emoji: "🍳" },
];
const jjeopPick = () => JJEOP_MENU[Math.floor(Math.random() * JJEOP_MENU.length)];
function JjeopView({ onBack, bubble, onReward, myName = "", recList = [], onRec }) {
  const [modal, setModal] = useState(null);
  const [today, setToday] = useState(null);
  
  const [recText, setRecText] = useState("");
  const [recNick, setRecNick] = useState("");
  const [step, setStep] = useState(1);
  const [fMenu, setFMenu] = useState(null);
  const [proofOpen, setProofOpen] = useState(false);
  const [proofImg, setProofImg] = useState(null);
  const [proofDone, setProofDone] = useState(false);
  const fileRef = useRef(null);
  const pickProof = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setProofImg(URL.createObjectURL(f));
  };
  const submitProof = () => {
    if (!proofImg || proofDone) return;
    setProofDone(true);
    onReward && onReward(5);
  };
  const postRec = () => {
    if (!recText.trim()) return;
    onRec && onRec(recNick.trim() || myName || "익명", recText.trim());
    setRecText("");
  };
  const furniture = [
    { id: "table", x: 250, y: 150, w: 140, h: 140, round: true, color: "#caa06a", emoji: "🍽️", label: "원형 테이블 (앉기)", onInteract: () => { setToday(jjeopPick()); setModal("table"); } },
    { id: "rec", x: 40, y: 180, w: 100, h: 90, color: "#7bbf8f", emoji: "📋", label: "메뉴 추천 테이블", onInteract: () => setModal("rec") },
    { id: "fortune", x: 500, y: 170, w: 100, h: 100, color: "#8e5a9e", emoji: "🔮", label: "점심술사", onInteract: () => { setStep(1); setFMenu(null); setProofOpen(false); setProofImg(null); setProofDone(false); setModal("fortune"); } },
  ];
  const answer = (yes) => {
    if (!yes) { setStep("bye"); return; }
    if (step === 4) { setFMenu(jjeopPick()); setStep("result"); return; }
    setStep((s) => s + 1);
  };
  const Q = { 1: "메뉴를 고르지 못하고 있나요?", 2: "제가 골라드릴까요?", 3: "골라준대로 꼭 드셔야됩니다. 꼭 드실건가요?", 4: "진짜로 꼭 드실거죠?" };
  return (
    <RoomView title="쩝쩝박사" icon="🍴" sub="가운데 테이블에서 오늘의 메뉴 · 메뉴 추천 · 점심술사" bg="#efe0cf" roomW={640} roomH={400} furniture={furniture} onBack={onBack} paused={!!modal} headerBg="#c0563a" bubble={bubble}>
      {modal === "table" && today && (
        <RoomModal title="🪑 원형 테이블" onClose={() => setModal(null)} maxW={380}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, color: C.inkSoft }}>오늘의 메뉴는 이거~</div>
            <div style={{ fontSize: 72, margin: "8px 0" }}>{today.emoji}</div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 16 }}>{today.name}</div>
            <div style={{ fontSize: 15, marginTop: 12, color: "#c0563a" }}>맛있게 드세요 ~ ♥</div>
          </div>
        </RoomModal>
      )}
      {modal === "rec" && (
        <RoomModal title="📋 메뉴 추천 게시판" onClose={() => setModal(null)} maxW={380}>
          <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 8 }}>먹고 싶은 메뉴를 멘트로 자유롭게 남겨요!</div>
          <div style={{ height: 180, overflow: "auto", background: C.white, border: `3px solid ${C.ink}`, padding: 8, display: "flex", flexDirection: "column", gap: 5 }}>
            {recList.map((r, i) => (
              <div key={i} style={{ fontSize: 13, borderBottom: `1px dashed ${C.parchEdge}`, paddingBottom: 4 }}>
                <b style={{ color: "#5b8def", fontSize: 11 }}>{r.nick}</b> <span>{r.text}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <input value={recNick} onChange={(e) => setRecNick(e.target.value)} placeholder="닉네임" style={{ width: 90, padding: 8, border: `3px solid ${C.ink}`, fontFamily: "'DotGothic16', monospace", fontSize: 13, background: C.white }} />
            <input value={recText} onChange={(e) => setRecText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") postRec(); }} placeholder="멘트 입력 후 Enter" style={{ flex: 1, minWidth: 0, padding: 8, border: `3px solid ${C.ink}`, fontFamily: "'DotGothic16', monospace", fontSize: 13, background: C.white }} />
            <PxButton tone="good" onClick={postRec} style={{ fontSize: 12, padding: "8px 12px" }}>등록</PxButton>
          </div>
        </RoomModal>
      )}
      {modal === "fortune" && (
        <RoomModal title="🔮 점심술사" onClose={() => setModal(null)} maxW={360}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 56 }}>🧙‍♀️</div>
            <div className="chat-bubble" style={{ display: "inline-block", background: C.white, color: C.ink, border: `2px solid ${C.ink}`, borderRadius: 8, padding: "8px 12px", fontSize: 14, margin: "8px 0" }}>
              {step === "bye" ? "가세요." : step === "result" ? `오늘은 「${fMenu.name}」 ${fMenu.emoji} 드세요!` : Q[step]}
            </div>
            {step !== "bye" && step !== "result" && (
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8 }}>
                <PxButton tone="good" onClick={() => answer(true)} style={{ padding: "8px 20px", fontSize: 14 }}>네</PxButton>
                <PxButton tone="danger" onClick={() => answer(false)} style={{ padding: "8px 20px", fontSize: 14 }}>아니요</PxButton>
              </div>
            )}
            {step === "result" && !proofOpen && (
              <div style={{ marginTop: 8 }}>
                <PxButton tone="gold" onClick={() => setProofOpen(true)} style={{ padding: "8px 14px", fontSize: 13 }}>📸 인증샷 보내기</PxButton>
              </div>
            )}
            {step === "result" && proofOpen && (
              <div style={{ marginTop: 10, background: C.white, border: `3px solid ${C.ink}`, padding: 12, textAlign: "left" }}>
                <div style={{ fontSize: 13, marginBottom: 8 }}>점심술사가 추천해준 화면 캡처랑, 실제로 먹은 인증샷을 보내봐~ 확인되면 골드를 줄게 🪙</div>
                <input ref={fileRef} type="file" accept="image/*" onChange={pickProof} style={{ display: "none" }} />
                {proofImg && <img src={proofImg} alt="인증샷" style={{ width: "100%", maxHeight: 160, objectFit: "contain", border: `2px solid ${C.ink}`, marginBottom: 8, background: "#eee" }} />}
                <div style={{ display: "flex", gap: 6 }}>
                  <PxButton tone="wood" onClick={() => fileRef.current && fileRef.current.click()} style={{ flex: 1, padding: 9, fontSize: 12 }}>📎 사진 업로드</PxButton>
                  <PxButton tone="good" disabled={!proofImg || proofDone} onClick={submitProof} style={{ flex: 1, padding: 9, fontSize: 12 }}>{proofDone ? "받음 ✓" : "제출하고 골드 받기"}</PxButton>
                </div>
                {proofDone && <div style={{ fontSize: 12, color: C.good, marginTop: 8, fontWeight: "bold" }}>맛있게 먹었네! 🪙5 골드 지급 완료 ♥</div>}
              </div>
            )}
            {(step === "bye" || step === "result") && (
              <PxButton tone="ink" onClick={() => setModal(null)} style={{ marginTop: 8, padding: "8px 16px", fontSize: 13 }}>닫기</PxButton>
            )}
          </div>
        </RoomModal>
      )}
    </RoomView>
  );
}

/* ======================= 무신사(옷 가게) ======================= */
const CLOTHES = {
  top: [
    { id: "t1", name: "화이트 맨투맨", color: "#eee", price: 7 },
    { id: "t2", name: "그레이 후드", color: "#9aa0a6", price: 6 },
    { id: "t3", name: "레드 스웨트", color: "#c0392b", price: 8 },
    { id: "t4", name: "그린 카라티", color: "#2e7d5b", price: 7 },
    { id: "t5", name: "네이비 니트", color: "#2c3e66", price: 9 },
    { id: "t6", name: "블루 가디건", color: "#5b8def", price: 6 },
  ],
  bottom: [
    { id: "b1", name: "블랙 슬랙스", color: "#2b2b2b", price: 6 },
    { id: "b2", name: "데님 팬츠", color: "#3f6bc4", price: 7 },
    { id: "b3", name: "베이지 치노", color: "#cbb58a", price: 6 },
    { id: "b4", name: "그레이 조거", color: "#8a8f94", price: 5 },
  ],
  shoes: [
    { id: "s1", name: "화이트 스니커즈", color: "#f5f5f5", price: 5 },
    { id: "s2", name: "블랙 슈즈", color: "#222", price: 6 },
    { id: "s3", name: "레드 런닝화", color: "#c0392b", price: 7 },
  ],
};
const CAT_LABEL = { top: "상의", bottom: "하의", shoes: "신발" };

function Mannequin({ outfit, size = 120 }) {
  const top = outfit.top ? outfit.top.color : "#cfc6b4";
  const bottom = outfit.bottom ? outfit.bottom.color : "#7c8794";
  const shoes = outfit.shoes ? outfit.shoes.color : "#e8e8e8";
  return (
    <svg width={size} height={size * 1.6} viewBox="0 0 20 32" shapeRendering="crispEdges" style={{ imageRendering: "pixelated" }}>
      <rect x="7" y="1" width="6" height="6" fill="#f4c9a0" stroke="#2b1f14" strokeWidth="0.4" />
      <rect x="6" y="1" width="8" height="2" fill="#5a3b22" />
      <rect x="8" y="4" width="1.2" height="1.2" fill="#2b1f14" /><rect x="10.8" y="4" width="1.2" height="1.2" fill="#2b1f14" />
      <rect x="5" y="7" width="10" height="10" fill={top} stroke="#2b1f14" strokeWidth="0.4" />
      <rect x="3.5" y="7.5" width="2" height="8" fill={top} stroke="#2b1f14" strokeWidth="0.3" />
      <rect x="14.5" y="7.5" width="2" height="8" fill={top} stroke="#2b1f14" strokeWidth="0.3" />
      <rect x="5.5" y="17" width="4" height="9" fill={bottom} stroke="#2b1f14" strokeWidth="0.4" />
      <rect x="10.5" y="17" width="4" height="9" fill={bottom} stroke="#2b1f14" strokeWidth="0.4" />
      <rect x="5" y="26" width="5" height="3" fill={shoes} stroke="#2b1f14" strokeWidth="0.4" />
      <rect x="10" y="26" width="5" height="3" fill={shoes} stroke="#2b1f14" strokeWidth="0.4" />
    </svg>
  );
}

function MusinsaView({ gems, outfit, owned, onTryOn, onBuy, onBack, bubble }) {
  const [cat, setCat] = useState(null);
  const furniture = [
    { id: "staff1", x: 90, y: 80, w: 50, h: 82, npc: true, facing: 1, label: "직원 민서", toast: "어서오세요! 편하게 입어보세요 👕" },
    { id: "staff2", x: 500, y: 80, w: 50, h: 82, npc: true, facing: -1, label: "직원 지혜", toast: "맘에 드는 옷은 눌러서 입어보세요 ✨" },
    { id: "top", x: 120, y: 250, w: 110, h: 110, color: "#caa06a", emoji: "👕", label: "상의 옷장", onInteract: () => setCat("top") },
    { id: "bottom", x: 270, y: 250, w: 110, h: 110, color: "#a9814a", emoji: "👖", label: "하의 옷장", onInteract: () => setCat("bottom") },
    { id: "shoes", x: 420, y: 250, w: 110, h: 110, color: "#8a5a3b", emoji: "👟", label: "신발 옷장", onInteract: () => setCat("shoes") },
  ];
  const worn = cat ? outfit[cat] : null;
  return (
    <RoomView outfit={outfit} title="무신사" icon="🛍️" sub="직원 2명 · 옷을 눌러 입어보고(무료), 맘에 들면 구매" bg="#e7e2da" roomW={640} roomH={400} furniture={furniture} onBack={onBack} paused={!!cat} headerBg="#2b2b2b" bubble={bubble}>
      {cat && (
        <RoomModal title={`🛒 무신사 · ${CAT_LABEL[cat]}`} onClose={() => setCat(null)} maxW={440}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flexShrink: 0, textAlign: "center", background: "#dfe3e6", border: `3px solid ${C.ink}`, padding: 8 }}>
              <Mannequin outfit={outfit} size={96} />
              <div style={{ fontSize: 10, color: C.inkSoft, marginTop: 2 }}>내 아바타</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                {Object.keys(CAT_LABEL).map((k) => (
                  <PxButton key={k} tone={k === cat ? "good" : "wood"} onClick={() => setCat(k)} style={{ fontSize: 11, padding: "5px 9px" }}>{CAT_LABEL[k]}</PxButton>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, maxHeight: 210, overflow: "auto" }}>
                {CLOTHES[cat].map((item) => {
                  const has = owned[item.id]; const on = outfit[cat] && outfit[cat].id === item.id;
                  return (
                    <button key={item.id} onClick={() => onTryOn(cat, item)} style={{ cursor: "pointer", background: on ? C.gem : C.white, border: `3px solid ${on ? C.ink : C.parchEdge}`, padding: 6, textAlign: "center" }}>
                      <div style={{ width: "100%", height: 44, background: item.color, border: `2px solid ${C.ink}` }} />
                      <div style={{ fontSize: 10, marginTop: 3 }}>{item.name}</div>
                      <div style={{ fontSize: 11, fontWeight: "bold", color: has ? C.good : "#a86e13" }}>{has ? "보유중" : `🪙 ${item.price}`}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          {worn && (
            <div style={{ marginTop: 12, background: C.white, border: `3px solid ${C.ink}`, padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, fontSize: 13 }}>
                착용중: <b>{worn.name}</b>{owned[worn.id] ? <span style={{ color: C.good }}> · 보유중 ✓</span> : <span style={{ color: "#a86e13" }}> · 🪙{worn.price} (보유 {fmt(gems)})</span>}
              </div>
              {!owned[worn.id] && (
                <PxButton tone="gold" disabled={gems < worn.price} onClick={() => onBuy(cat, worn)} style={{ padding: "8px 14px", fontSize: 13 }}>{gems < worn.price ? "골드 부족" : "구매하기"}</PxButton>
              )}
            </div>
          )}
        </RoomModal>
      )}
    </RoomView>
  );
}
/* ======================= 샌드백 치기 ======================= */
function Sandbag({ size = 90 }) {
  return (
    <svg width={size} height={size * 1.4} viewBox="0 0 20 28" shapeRendering="crispEdges" style={{ imageRendering: "pixelated" }}>
      <rect x="9" y="0" width="2" height="4" fill="#7a6a55" />
      <rect x="6" y="4" width="8" height="2" fill="#3a3a3a" />
      <rect x="6" y="6" width="8" height="18" fill="#b23b2e" stroke="#2b1f14" strokeWidth="0.5" />
      <rect x="6" y="10" width="8" height="1.5" fill="#8a2a20" />
      <rect x="6" y="16" width="8" height="1.5" fill="#8a2a20" />
      <rect x="6" y="6" width="3" height="18" fill="rgba(255,255,255,0.14)" />
      <rect x="7" y="24" width="6" height="2" fill="#2b1f14" />
    </svg>
  );
}

const GLOVE_CURSOR = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cellipse cx='20' cy='18' rx='13' ry='12' fill='%23c0392b' stroke='%237a1f14' stroke-width='2'/%3E%3Crect x='9' y='26' width='22' height='8' rx='2' fill='%23f0f0f0' stroke='%237a1f14' stroke-width='2'/%3E%3Cellipse cx='9' cy='20' rx='5' ry='6' fill='%23c0392b' stroke='%237a1f14' stroke-width='2'/%3E%3C/svg%3E\") 20 20, pointer";

function playPunch() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = playPunch._c || (playPunch._c = new AC());
    if (ctx.state === "suspended") ctx.resume();
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.13);
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.17);
    const len = Math.floor(ctx.sampleRate * 0.06), b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    const n = ctx.createBufferSource(), ng = ctx.createGain(); ng.gain.value = 0.35;
    n.buffer = b; n.connect(ng).connect(ctx.destination); n.start(t);
  } catch (e) {}
}

function SandbagView({ onBack, scores, onEnd, myName = "" }) {
  const [count, setCount] = useState(0);
  const [mode, setMode] = useState("mouse");
  const [fx, setFx] = useState(0);
  const [ending, setEnding] = useState(false);
  const [nick, setNick] = useState(myName);
  const [target, setTarget] = useState(null);
  const [setupOpen, setSetupOpen] = useState(true);
  const [targetInput, setTargetInput] = useState("");
  const hit = () => { setCount((c) => c + 1); setFx(Date.now()); playPunch(); };
  const finish = () => { if (count <= 0) { onBack(); return; } setEnding(true); };
  const submit = () => { onEnd(nick.trim() || myName || "익명", count, target); setCount(0); setNick(myName); setEnding(false); };
  useEffect(() => {
    if (mode !== "keyboard") return;
    const onKey = (e) => { if (isTyping(e)) return; if ((e.code === "Space" || e.key === " ") && !ending) { e.preventDefault(); hit(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, ending]);
  const ranked = [...scores].sort((a, b) => b.count - a.count).slice(0, 8);
  return (
    <Panel style={{ padding: 0, overflow: "hidden", position: "relative" }}>
      <TitleBar icon="🥊" title="샌드백 치기" sub={target ? `🎯 ${target} 샌드백 · 끝을 누르면 랭킹 집계` : "샌드백을 마구 클릭! · 끝을 누르면 랭킹 집계"} onBack={onBack} bg="#c0563a" fg={C.white} />
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px", position: "relative", height: 420, background: "#2a2233", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: mode === "mouse" ? GLOVE_CURSOR : "default" }} onClick={mode === "mouse" ? hit : undefined}>
          <div style={{ position: "absolute", top: 12, right: 14, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#ffe680" }}>클릭</div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 26, color: C.gem }}>{count}</div>
            <PxButton tone="danger" onClick={(e) => { e.stopPropagation(); finish(); }} style={{ marginTop: 6, fontSize: 12, padding: "6px 14px" }}>끝</PxButton>
          </div>
          <div key={fx} className={fx ? "bag-hit" : ""} style={{ pointerEvents: "none", position: "relative" }}>
            {target && <div style={{ position: "absolute", left: "50%", top: 26, transform: "translateX(-50%)", background: "#fffbe8", color: C.ink, border: `2px solid ${C.ink}`, borderRadius: 6, padding: "1px 8px", fontSize: 12, fontWeight: "bold", whiteSpace: "nowrap", zIndex: 2 }}>{target}</div>}
            <Sandbag size={160} />
          </div>
          <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, pointerEvents: "none" }}>
            <div style={{ color: "#b9a7d6", fontSize: 12 }}>{mode === "mouse" ? "👊 샌드백을 클릭!" : "⌨️ 스페이스바 연타!"}</div>
            <div style={{ display: "flex", gap: 6, pointerEvents: "auto" }}>
              <PxButton tone={mode === "mouse" ? "good" : "wood"} onClick={(e) => { e.stopPropagation(); setMode("mouse"); e.currentTarget.blur(); }} style={{ fontSize: 11, padding: "5px 10px" }}>🖱️ 마우스</PxButton>
              <PxButton tone={mode === "keyboard" ? "good" : "wood"} onClick={(e) => { e.stopPropagation(); setMode("keyboard"); e.currentTarget.blur(); }} style={{ fontSize: 11, padding: "5px 10px" }}>⌨️ 키보드</PxButton>
            </div>
          </div>
        </div>
        <div style={{ flex: "1 1 220px", padding: 14, background: C.parch, borderLeft: `3px solid ${C.ink}` }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, marginBottom: 10 }}>🏆 랭킹</div>
          {ranked.length === 0 ? (
            <div style={{ fontSize: 12, color: C.inkSoft }}>아직 기록이 없어요. 쳐보세요!</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {ranked.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: C.white, border: `2px solid ${C.ink}`, padding: "5px 8px", fontSize: 13 }}>
                  <span style={{ width: 20, fontWeight: "bold", color: i === 0 ? "#a86e13" : C.inkSoft }}>{i + 1}</span>
                  <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.nick}{s.target ? <span style={{ color: C.danger, fontSize: 10 }}> → {s.target}</span> : ""}</span>
                  <b>{s.count}</b>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {setupOpen && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.62)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 25, padding: 14 }}>
          <div style={{ width: "100%", maxWidth: 320 }}>
            <Panel style={{ padding: 18 }}>
              <div style={{ textAlign: "center", fontSize: 34 }}>🥊</div>
              <div style={{ textAlign: "center", fontSize: 14, fontWeight: "bold", margin: "8px 0 12px" }}>어떤 샌드백을 칠까요?</div>
              <PxButton tone="wood" onClick={() => { setTarget(null); setSetupOpen(false); }} style={{ width: "100%", padding: 12, fontSize: 13, marginBottom: 8 }}>🥊 그냥 때리기</PxButton>
              <div style={{ background: C.white, border: `3px solid ${C.ink}`, padding: 10 }}>
                <div style={{ fontSize: 12, marginBottom: 6 }}>🎯 누구 샌드백을 원하시나요?</div>
                <input value={targetInput} onChange={(e) => setTargetInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && targetInput.trim()) { setTarget(targetInput.trim()); setSetupOpen(false); } }} maxLength={8} placeholder="이름 입력" style={{ width: "100%", boxSizing: "border-box", padding: 8, border: `2px solid ${C.ink}`, fontFamily: "'DotGothic16', monospace", fontSize: 13, background: C.parch }} />
                <PxButton tone="danger" disabled={!targetInput.trim()} onClick={() => { setTarget(targetInput.trim()); setSetupOpen(false); }} style={{ width: "100%", marginTop: 8, padding: 10, fontSize: 13 }}>이 사람 샌드백 만들기</PxButton>
              </div>
              <PxButton tone="ink" onClick={onBack} style={{ width: "100%", marginTop: 10, padding: 9, fontSize: 12 }}>나가기</PxButton>
            </Panel>
          </div>
        </div>
      )}

      {ending && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20, padding: 14 }} onClick={() => setEnding(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 320, maxHeight: "calc(100vh - 28px)", overflowY: "auto" }}>
            <Panel style={{ padding: 16 }}>
              <div style={{ textAlign: "center", marginBottom: 10 }}>{target ? <span style={{ fontSize: 12, color: C.danger }}>🎯 {target} 샌드백<br /></span> : null}총 <b style={{ fontSize: 20, color: C.danger }}>{count}</b>번 쳤어요! 💥</div>
              <input value={nick} onChange={(e) => setNick(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} maxLength={10} placeholder="닉네임 (랭킹 등록)" autoFocus style={{ width: "100%", boxSizing: "border-box", padding: 9, border: `3px solid ${C.ink}`, fontFamily: "'DotGothic16', monospace", fontSize: 14, background: C.white }} />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <PxButton tone="ink" onClick={() => setEnding(false)} style={{ flex: 1, padding: 10, fontSize: 13 }}>더 치기</PxButton>
                <PxButton tone="gold" onClick={submit} style={{ flex: 1, padding: 10, fontSize: 13 }}>랭킹 등록</PxButton>
              </div>
            </Panel>
          </div>
        </div>
      )}
    </Panel>
  );
}/* ======================= 스쿨(네이버/영상) ======================= */
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
        const dt = Math.min(0.05, Math.max(0, (t - last) / 1000));
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
      <TitleBar icon={s.icon} title={s.title} sub="WASD 이동 · 집 근처에서 E · 👑은 보스급, 🔒은 잠긴 퀘스트" onBack={onBack} bg={s.color} fg={C.white} />
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
            <Hero facing={facing} moving={moving} size={34} />
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
/* ======================= 보스맵 도전기 ======================= */
const PAST_BOSSES = [
  { id: "p1", name: "그린레이", icon: "🌿" },
  { id: "p2", name: "고음확장기", icon: "🎤" },
];
const FUTURE_BOSSES = 3;
const BOSS_MAPS_INIT = [
  {
    id: "bm1", mode: "easy", name: "어플", icon: "📱", color: "#2f9e6e", soft: "#e6f4ec", deep: "#1d6b4a",
    boss: { id: "b1", title: "버그 로드", icon: "🐛", gem: 30, desc: "잡아도 잡아도 다시 기어나오는 벌레들의 왕.", task: "발견된 버그 전부 처리하고 최종 점검" },
    stages: [
      { n: 1, name: "기획의 숲", deco: "🌲", quests: [
        { id: "q11", title: "목표 정의", icon: "🎯", gem: 4, desc: "무엇을 만드는지 한 줄로 정한다.", task: "앱의 목표를 한 문장으로 적기" },
        { id: "q12", title: "기능 쪼개기", icon: "🧩", gem: 5, desc: "큰 덩어리를 잘게 나눈다.", task: "필요한 기능 10개로 분해", need: "q11" },
        { id: "q13", title: "담당 정하기", icon: "🧑‍🤝‍🧑", gem: 4, desc: "누가 무엇을 할지 정한다.", task: "기능별 담당자 배정" },
        { id: "q14", title: "일정 잡기", icon: "📅", gem: 5, desc: "언제까지 할지 정한다.", task: "주차별 마일스톤 설정", need: "q12" },
      ] },
      { n: 2, name: "개발의 언덕", deco: "⛰️", quests: [
        { id: "q21", title: "화면 만들기", icon: "🖥", gem: 6, desc: "보이는 것부터 완성한다.", task: "핵심 화면 3개 제작" },
        { id: "q22", title: "기능 연결", icon: "🔌", gem: 6, desc: "동작하게 만든다.", task: "버튼·입력 동작 연결", need: "q21" },
        { id: "q23", title: "디자인 정리", icon: "🎨", gem: 6, desc: "톤을 맞춘다.", task: "색·폰트 통일" },
      ] },
      { n: 3, name: "QA의 고원", deco: "🏔", quests: [
        { id: "q31", title: "테스트", icon: "🔍", gem: 7, desc: "직접 눌러본다.", task: "전 기능 클릭 테스트" },
        { id: "q32", title: "버그 수정", icon: "🛠", gem: 8, desc: "발견한 걸 고친다.", task: "발견 버그 전부 수정", need: "q31" },
        { id: "q33", title: "성능 확인", icon: "⚡", gem: 6, desc: "느린 곳을 찾는다.", task: "로딩 속도 점검" },
      ] },
      { n: 4, name: "출시의 항구", deco: "⚓", quests: [
        { id: "q41", title: "스토어 등록", icon: "🏪", gem: 6, desc: "세상에 내놓는다.", task: "스토어 정보·스크린샷 준비" },
        { id: "q42", title: "리허설", icon: "🎬", gem: 8, desc: "한 번 돌려본다.", task: "전 과정 시연", need: "q41" },
      ] },
    ],
  },
  {
    id: "bm2", mode: "easy", name: "속옷", icon: "🩲", color: "#2e9bc4", soft: "#e4f3fa", deep: "#1d6c8c",
    boss: { id: "b2", title: "사이즈 마왕", icon: "📏", gem: 28, desc: "누구에게도 딱 맞지 않게 만드는 마왕.", task: "전 사이즈 착용 테스트 통과" },
    stages: [
      { n: 1, name: "원단의 해변", deco: "🏖", quests: [
        { id: "r11", title: "원단 조사", icon: "🧵", gem: 5, desc: "무엇으로 만들까.", task: "후보 원단 5종 비교" },
        { id: "r12", title: "가격 정하기", icon: "💰", gem: 5, desc: "얼마에 팔까?", task: "원가·판매가 책정", need: "r11" },
        { id: "r13", title: "경쟁 조사", icon: "🔭", gem: 5, desc: "다른 곳은 어떨까.", task: "경쟁 제품 3종 분석" },
      ] },
      { n: 2, name: "샘플의 공방", deco: "✂️", quests: [
        { id: "r21", title: "패턴 설계", icon: "📐", gem: 6, desc: "형태를 정한다.", task: "사이즈별 패턴 제작" },
        { id: "r22", title: "샘플 제작", icon: "🧷", gem: 7, desc: "실물로 만든다.", task: "샘플 3벌 제작", need: "r21" },
        { id: "r23", title: "라벨 디자인", icon: "🏷", gem: 6, desc: "이름표를 붙인다.", task: "택·라벨 시안" },
      ] },
      { n: 3, name: "검증의 사원", deco: "🛕", quests: [
        { id: "r31", title: "착용 테스트", icon: "🧍", gem: 8, desc: "직접 입어본다.", task: "5인 착용 테스트" },
        { id: "r32", title: "피드백 반영", icon: "💬", gem: 7, desc: "고칠 걸 고친다.", task: "수정 사항 반영", need: "r31" },
      ] },
    ],
  },
  {
    id: "bm3", mode: "easy", name: "양말", icon: "🧦", color: "#8a5cc4", soft: "#efe7f8", deep: "#5e3a8c",
    boss: { id: "b3", title: "냄새 괴수", icon: "👃", gem: 40, desc: "하루만 신어도 깨어나는 고약한 괴수.", task: "항균 시험 전 항목 통과" },
    stages: [
      { n: 1, name: "소재의 동굴", deco: "🕯", quests: [
        { id: "s11", title: "항균 소재 조사", icon: "🧪", gem: 6, desc: "무엇이 균을 잡나.", task: "항균 소재 후보 정리" },
        { id: "s12", title: "배합 정하기", icon: "⚗️", gem: 7, desc: "비율이 관건.", task: "혼방 비율 결정", need: "s11" },
        { id: "s13", title: "레퍼런스", icon: "🔍", gem: 5, desc: "잘 만든 걸 본다.", task: "타사 제품 분석" },
      ] },
      { n: 2, name: "편직의 계곡", deco: "🧶", quests: [
        { id: "s21", title: "편직 세팅", icon: "⚙️", gem: 6, desc: "기계를 맞춘다.", task: "게이지·장력 세팅" },
        { id: "s22", title: "시제품 생산", icon: "🧦", gem: 9, desc: "일단 짠다.", task: "시제품 30켤레 생산", need: "s21" },
        { id: "s23", title: "포장 준비", icon: "📦", gem: 5, desc: "담을 걸 정한다.", task: "패키지 시안" },
      ] },
      { n: 3, name: "시험의 탑", deco: "🗼", quests: [
        { id: "s31", title: "항균 시험", icon: "🔬", gem: 7, desc: "숫자로 증명한다.", task: "시험 성적서 확보" },
        { id: "s32", title: "내구 테스트", icon: "💪", gem: 9, desc: "얼마나 버티나.", task: "30회 세탁 테스트", need: "s31" },
        { id: "s33", title: "상세페이지", icon: "🖼", gem: 6, desc: "첫인상.", task: "상세 이미지 제작" },
      ] },
      { n: 4, name: "출고의 광장", deco: "🎪", quests: [
        { id: "s41", title: "재고 계획", icon: "📆", gem: 6, desc: "얼마나 만들까.", task: "초도 물량 확정" },
        { id: "s42", title: "판매 시작", icon: "⬆️", gem: 10, desc: "세상에 내보낸다.", task: "스토어 오픈", need: "s41" },
      ] },
    ],
  },
  {
    id: "hm1", mode: "hard", name: "사고력 훈련", icon: "🧠", color: "#c0563a", soft: "#f7e6e0", deep: "#8c2f21",
    boss: { id: "hb1", title: "고정관념 마왕", icon: "🗿", gem: 45, desc: "\"원래 그런 거야\"라는 말로 모든 생각을 굳혀버리는 마왕.", task: "당연하다고 믿던 것 3가지를 뒤집어 다시 정의하기" },
    stages: [
      { n: 1, name: "질문의 골짜기", deco: "❓", quests: [
        { id: "t11", title: "왜 5번 묻기", icon: "🔁", gem: 8, desc: "표면이 아니라 뿌리를 본다.", task: "최근 결정 하나에 '왜'를 5번 파고들기", level: "숙련자" },
        { id: "t12", title: "전제 뒤집기", icon: "🔄", gem: 9, desc: "당연한 걸 의심한다.", task: "지금 방식의 숨은 전제 3개 적고 하나 뒤집기", need: "t11", level: "숙련자" },
        { id: "t13", title: "문제 재정의", icon: "🎯", gem: 8, desc: "문제를 바꾸면 답도 바뀐다.", task: "같은 문제를 다른 문장으로 3번 다시 쓰기", level: "숙련자" },
      ] },
      { n: 2, name: "관점의 숲", deco: "🌀", quests: [
        { id: "t21", title: "반대편 변호", icon: "🪞", gem: 10, desc: "내 의견의 적이 되어본다.", task: "내 주장의 반대 입장을 설득력 있게 3줄로 쓰기", level: "숙련자" },
        { id: "t22", title: "제3자 시선", icon: "👀", gem: 9, desc: "고객·동료·경쟁자의 눈.", task: "세 사람 입장에서 각각 한 줄 평 쓰기", need: "t21", level: "숙련자" },
        { id: "t23", title: "10년 뒤 관점", icon: "🔭", gem: 9, desc: "시간 축을 늘려본다.", task: "10년 뒤에도 유효할지 판단해 적기", level: "숙련자" },
      ] },
      { n: 3, name: "논리의 탑", deco: "🧩", quests: [
        { id: "t31", title: "근거 붙이기", icon: "🔢", gem: 10, desc: "느낌을 숫자로.", task: "주장 하나에 지표 2개 붙이기", level: "숙련자" },
        { id: "t32", title: "반증 찾기", icon: "🧨", gem: 11, desc: "틀릴 조건을 먼저 안다.", task: "내 결론이 틀릴 조건 3개 적기", need: "t31", level: "숙련자" },
        { id: "t33", title: "압축 설명", icon: "🗜", gem: 10, desc: "이해했으면 짧아진다.", task: "복잡한 내용을 3문장으로 요약", level: "숙련자" },
      ] },
      { n: 4, name: "실행의 관문", deco: "🚪", quests: [
        { id: "t41", title: "가장 작은 실험", icon: "🧪", gem: 10, desc: "생각을 현실에 던진다.", task: "하루 안에 검증할 실험 1개 설계", level: "숙련자" },
        { id: "t42", title: "회고 쓰기", icon: "📓", gem: 12, desc: "배운 걸 남긴다.", task: "실험 결과와 배운 점 기록", need: "t41", level: "숙련자" },
      ] },
    ],
  },
];

/* datetime-local 입력값 포맷 (로컬 시간 기준) */
function toLocalDT(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* ===== 보스맵 저장·공유 =====
   기본 맵(BOSS_MAPS_INIT)은 코드에서 오고, 사용자가 추가/수정/삭제한 내용을 그 위에 덮어씁니다. */
const BOSSMAP_KEY = "echotown_bossmaps_v1";
function mergeMaps(base, saved) {
  if (!Array.isArray(saved) || !saved.length) return base;
  const byId = {};
  base.forEach((m) => { byId[m.id] = m; });
  saved.forEach((m) => { if (m && m.id) byId[m.id] = m; });
  // 기본 맵 순서를 먼저, 새로 만든 맵을 뒤에
  const out = base.map((m) => byId[m.id]);
  saved.forEach((m) => { if (m && m.id && !base.some((b) => b.id === m.id)) out.push(byId[m.id]); });
  return out;
}

function BossMapView({ onBack, onReward, onGoSchool, onClearQuest, myName = "", accepted = {}, onAccept, onStart, onShout, onBoard, notes = {}, onNote, threads = {}, onThreadSend, onAgree, onLeave, maps = [], people = [], onAddQuest, onEditQuest, onDelQuest, onAddMap, onGoShrine, onSubmitAnswer }) {
  const net = useContext(NetContext);
  const [tMsg, setTMsg] = useState("");
  const [shrineFor, setShrineFor] = useState(null);   // 제출 완료 → 제단 안내
  const [submitFor, setSubmitFor] = useState(null);  // 📮 제출 : 답변 작성
  const [answer, setAnswer] = useState("");
  const threadRef = useAutoScroll(JSON.stringify(threads || {}).length);
  const [editing, setEditing] = useState(null);
  const [nowTs, setNowTs] = useState(Date.now());
  useEffect(() => { const iv = setInterval(() => setNowTs(Date.now()), 1000); return () => clearInterval(iv); }, []);
  const dueText = (due) => {
    if (!due) return null;
    const t = new Date(due).getTime();
    if (isNaN(t)) return null;
    const d = t - nowTs;
    if (d <= 0) return { txt: "⌛ 마감됨", over: true };
    const h = Math.floor(d / 3600000), m = Math.floor((d % 3600000) / 60000), sec = Math.floor((d % 60000) / 1000);
    return { txt: `⏳ ${h > 0 ? h + "시간 " : ""}${m}분 ${sec}초 남음`, over: false };
  };
  const canEdit = (nd) => !!nd && !nd.isBoss && (!nd.owner || nd.owner === myName || nd.registrar === myName);
  /* 참가 가능 대상 : who 가 "all" 이거나 목록에 내 이름이 있으면 참가 가능 */
  const canJoin = (nd) => {
    if (!nd || !nd.who || nd.who === "all") return true;
    if (!Array.isArray(nd.who) || nd.who.length === 0) return true;
    return nd.who.includes(myName) || nd.owner === myName;
  };
  const whoLabel = (nd) => (!nd || !nd.who || nd.who === "all" || !Array.isArray(nd.who) || !nd.who.length) ? "👥 모두 참가 가능" : `👥 ${nd.who.join(", ")} 만 참가`;
  const rewardLabel = (nd) => {
    const r = nd && nd.reward;
    if (!r) return `💎 ${(nd && nd.gem) || 0}`;
    if (r.kind === "gold") return `🪙 골드 ${r.qty}`;
    if (r.kind === "item") return `${r.emoji || "🎁"} ${r.name} ${r.qty}개`;
    return `💎 젬 ${r.qty}`;
  };
  const saveEdit = () => {
    if (!editing || !editing.title.trim()) return;
    onEditQuest(map.id, { id: editing.id, title: editing.title.trim(), icon: editing.icon, gem: Number(editing.gem) || 0, desc: editing.desc, task: editing.task, due: editing.due });
    setEditing(null); setSel(null);
  };
  const delQuest = (qid) => {
    onDelQuest(map.id, qid);
    setSel(null); setEditing(null);
  };
  const [mode, setMode] = useState("easy");
  const [mapIdx, setMapIdx] = useState(0);
  const [collOpen, setCollOpen] = useState(false);
  const [dexOpen, setDexOpen] = useState(false);
  const [dexMode, setDexMode] = useState("easy");
  const [addOpen, setAddOpen] = useState(false);
  const [addTab, setAddTab] = useState("quest");
  const [fQ, setFQ] = useState({ stage: 1, title: "", icon: "🎯", gem: 5, rewardKind: "gem", rewardName: "", rewardEmoji: "🎁", desc: "", task: "", level: "초보자", field: "naverschool", due: "", who: "all", whoList: [], regMode: "me", regName: "" });
  const [fM, setFM] = useState({ name: "", icon: "🗺", boss: "", bossIcon: "👹" });
  const [cleared, setCleared] = useState({});
  useEffect(() => { dbLoadBoss().then((d) => { if (d && Object.keys(d).length) setCleared((c) => ({ ...d, ...c })); }); }, []);
  const [sel, setSel] = useState(null);
  const [warn, setWarn] = useState(null);
  const [pos, setPos] = useState({ x: 300, y: 90 });
  const [facing, setFacing] = useState(1);
  const [moving, setMoving] = useState(false);
  const [near, setNear] = useState(null);
  const [cam, setCam] = useState(0);
  const mapElRef = useRef(null);
  const heroElRef = useRef(null);
  const camRef = useRef(0);
  const keys = useRef({});
  const posRef = useRef({ x: 300, y: 90 });
  const nearRef = useRef(null);
  const openRef = useRef(false);
  const nodesRef = useRef([]);
  const VIEW_H = 440, MAP_W = 600, STAGE_H = 330, BOSS_H = 300;

  const map = maps[mapIdx];
  const isPlaza = (map.mode || "easy") === "hard";
  const MAP_H = isPlaza ? 860 : map.stages.length * STAGE_H + BOSS_H;
  const done = cleared[map.id] || {};
  const allQuests = map.stages.reduce((acc, st) => acc.concat(st.quests), []);

  const nodes = [];
  if (isPlaza) {
    const cx = MAP_W / 2, cy = 430;
    // 완료한 퀘스트는 광장에서 사라지고 🧠 사고 도감에만 남아요
    const openQuests = allQuests.filter((q) => !done[q.id]);
    openQuests.forEach((q, i) => {
      const n = openQuests.length || 1;
      const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
      const rad = i % 2 === 0 ? 250 : 330;
      const st = map.stages.find((x) => x.quests.some((y) => y.id === q.id)) || { n: 1, name: "광장" };
      nodes.push({ ...q, stage: st.n, stageName: st.name, x: Math.round(cx + Math.cos(ang) * rad * 0.72), y: Math.round(cy + Math.sin(ang) * rad * 0.92) });
    });
    nodes.push({ ...map.boss, stage: 99, stageName: "보스", isBoss: true, x: cx, y: cy });
  } else {
    map.stages.forEach((st, si) => {
      const baseY = BOSS_H + (map.stages.length - 1 - si) * STAGE_H;
      st.quests.forEach((q, qi) => {
        const col = qi % 3, row = Math.floor(qi / 3);
        nodes.push({ ...q, stage: st.n, stageName: st.name, x: 110 + col * 190, y: baseY + 130 + row * 120 });
      });
    });
    nodes.push({ ...map.boss, stage: map.stages.length, stageName: "보스", isBoss: true, x: MAP_W / 2, y: 150 });
  }
  nodesRef.current = nodes;

  const stageDone = (n) => map.stages.filter((s) => s.n <= n).every((s) => s.quests.every((q) => done[q.id]));
  const stageOpen = (n) => isPlaza || n === 1 || stageDone(n - 1);
  const bossReady = isPlaza ? allQuests.every((q) => done[q.id]) : stageDone(map.stages.length);
  const lockReason = (nd) => {
    if (!stageOpen(nd.stage)) return `${nd.stage - 1}스테이지를 먼저 클리어해야 합니다`;
    if (nd.isBoss && !bossReady) return isPlaza ? "광장의 모든 퀘스트를 완료해야 보스에 도전할 수 있습니다" : "모든 스테이지를 완료해야 보스에 도전할 수 있습니다";
    if (nd.need && !done[nd.need]) {
      const pq = nodes.find((x) => x.id === nd.need);
      return `「${pq ? pq.title : nd.need}」 완료해야 진행할 수 있습니다`;
    }
    return null;
  };
  const clear = (nd) => {
    const r = lockReason(nd);
    if (r) { setWarn(r); setTimeout(() => setWarn(null), 2000); return; }
    if (done[nd.id]) return true;
    setCleared((c) => ({ ...c, [map.id]: { ...(c[map.id] || {}), [nd.id]: myName || true } }));
    dbClearBoss(map.id, nd.id, myName || null);
    // 보스는 즉시 보상, 일반 퀘스트는 제단에서 GM 검수 후 지급
    if (nd.isBoss) onReward && onReward(nd.reward || { kind: "gem", qty: nd.gem || 0 });
    onClearQuest && onClearQuest(!!nd.isBoss, map.mode, nd.title);
    return true;
  };

  useEffect(() => { openRef.current = !!sel; }, [sel]);
  useEffect(() => {
    const down = (e) => {
      if (isTyping(e)) return;
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d", "e"].includes(k)) e.preventDefault();
      if (openRef.current) return;
      if (k === "e" || k === " ") {
        const n = nearRef.current;
        if (n) { const nd = nodesRef.current.find((x) => x.id === n); if (nd) setSel(nd); }
        return;
      }
      keys.current[k] = true;
    };
    const up = (e) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  useEffect(() => {
    let raf;
    let wasMoving = false, lastFacing = 1;
    let last = performance.now();
    const loop = (now) => {
      try {
      const t = now || performance.now();
      const dt = Math.min(0.05, Math.max(0, (t - last) / 1000));
      last = t;
      const SPEED = 276 * dt;
      if (!openRef.current) {
        const k = keys.current; let { x, y } = posRef.current; let dx = 0, dy = 0;
        if (k["arrowleft"] || k["a"]) dx -= 1;
        if (k["arrowright"] || k["d"]) dx += 1;
        if (k["arrowup"] || k["w"]) dy -= 1;
        if (k["arrowdown"] || k["s"]) dy += 1;
        const isMoving = !!(dx || dy);
        if (isMoving) {
          const len = Math.hypot(dx, dy) || 1;
          x = Math.max(30, Math.min(MAP_W - 30, x + (dx / len) * SPEED));
          y = Math.max(40, Math.min(MAP_H - 30, y + (dy / len) * SPEED));
          posRef.current = { x, y };
          if (dx && lastFacing !== (dx > 0 ? 1 : -1)) { lastFacing = dx > 0 ? 1 : -1; setFacing(lastFacing); }
        }
        if (isMoving !== wasMoving) { wasMoving = isMoving; setMoving(isMoving); }

        if (heroElRef.current) {
          heroElRef.current.style.left = posRef.current.x + "px";
          heroElRef.current.style.top = posRef.current.y + "px";
        }
        if (net && net.roomPosRef) net.roomPosRef.current = posRef.current;
        const target = Math.max(0, Math.min(MAP_H - VIEW_H, posRef.current.y - VIEW_H / 2));
        camRef.current += (target - camRef.current) * 0.18;
        if (Math.abs(target - camRef.current) < 0.5) camRef.current = target;
        if (mapElRef.current) mapElRef.current.style.top = -camRef.current + "px";

        let f = null;
        for (const nd of nodesRef.current) if (Math.hypot(nd.x - posRef.current.x, nd.y - posRef.current.y) < 52) { f = nd.id; break; }
        if (f !== nearRef.current) { nearRef.current = f; setNear(f); }
      }
      } catch (err) { console.error("[BossMapView] loop error:", err); } finally { raf = requestAnimationFrame(loop); }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [MAP_H]);

  useEffect(() => {
    const y = isPlaza ? MAP_H - 90 : MAP_H - 70;
    posRef.current = { x: 300, y };
    setPos({ x: 300, y });
    const c = Math.max(0, MAP_H - VIEW_H);
    camRef.current = c;
    setCam(c);
    if (heroElRef.current) { heroElRef.current.style.left = "300px"; heroElRef.current.style.top = y + "px"; }
    if (mapElRef.current) mapElRef.current.style.top = -c + "px";
  }, [mapIdx, MAP_H]);
  const switchMap = (i) => { setMapIdx(i); setSel(null); };
  const addQuest = () => {
    if (!fQ.title.trim()) return;
    const id = "cq" + Date.now();
    const qty = Math.max(0, Number(fQ.gem) || 0);
    const reward = fQ.rewardKind === "item"
      ? { kind: "item", name: fQ.rewardName.trim() || "특별 보상", emoji: fQ.rewardEmoji || "🎁", qty }
      : { kind: fQ.rewardKind, qty };
    const nq = {
      id, title: fQ.title.trim(), icon: fQ.icon || "🎯", gem: qty, reward,
      desc: fQ.desc.trim() || "새로 추가된 퀘스트", task: fQ.task.trim() || fQ.title.trim(),
      level: isPlaza ? null : fQ.level,
      field: !isPlaza && fQ.level === "초보자" ? fQ.field : null,
      who: fQ.who === "all" ? "all" : (fQ.whoList || []),
      owner: myName || "익명",
      registrar: fQ.regMode === "other" && fQ.regName ? fQ.regName : (myName || "익명"),
      due: fQ.due || null,
    };
    onAddQuest(map.id, isPlaza ? map.stages[0].n : Number(fQ.stage), nq);
    setFQ({ ...fQ, title: "", desc: "", task: "" });
    setAddOpen(false);
  };
  const addMap = () => {
    if (!fM.name.trim()) return;
    const id = "cm" + Date.now();
    onAddMap({
      id, mode, name: fM.name.trim(), icon: fM.icon || "🗺", color: "#c07a2f", soft: "#f7ecdc", deep: "#8c5418", owner: myName || "익명",
      boss: { id: id + "_b", title: fM.boss.trim() || "이름 없는 보스", icon: fM.bossIcon || "👹", gem: 30, desc: "새로 등장한 보스.", task: "모든 스테이지를 클리어하고 격파" },
      stages: [{ n: 1, name: "1 스테이지", deco: "✨", quests: [] }],
    });
    setFM({ name: "", icon: "🗺", boss: "", bossIcon: "👹" });
    setAddOpen(false);
    setMapIdx(maps.length);
  };
  const bossState = (m) => (cleared[m.id] && cleared[m.id][m.boss.id]) ? "done" : "now";
  /* 광장은 완료 퀘스트를 지도에서 빼므로 진행도는 전체 기준으로 계산 */
  const totalQ = isPlaza ? allQuests.length + 1 : nodes.length;
  const doneQ = isPlaza
    ? allQuests.filter((q) => done[q.id]).length + (done[map.boss.id] ? 1 : 0)
    : nodes.filter((n) => done[n.id]).length;

  return (
    <Panel style={{ padding: 0, overflow: "hidden" }}>
      <TitleBar icon="🗺" title="보스맵 도전기" sub="WASD로 이동 · 아래에서 위로 진행 · 퀘스트 앞에서 E" onBack={onBack} bg="#241c33" fg={C.white} />
      <div style={{ padding: 14, background: "linear-gradient(180deg,#f6f2e8,#eae3d4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, background: C.white, border: `2px solid ${C.ink}`, borderRadius: 10, padding: "8px 12px", boxShadow: "0 2px 0 rgba(0,0,0,0.15)" }}>
          {isPlaza ? (
            <button onClick={() => setDexOpen(true)} title="사고 도감" style={{ cursor: "pointer", border: `2px solid ${C.ink}`, borderRadius: 8, background: "linear-gradient(180deg,#8f4b4b,#5c2c2c)", color: C.white, fontSize: 16, padding: "4px 8px" }}>🧠</button>
          ) : (
            <button onClick={() => setCollOpen(true)} title="보스 도감" style={{ cursor: "pointer", border: `2px solid ${C.ink}`, borderRadius: 8, background: "linear-gradient(180deg,#6b4f8f,#3f2c5c)", color: C.white, fontSize: 16, padding: "4px 8px" }}>👾</button>
          )}
          <b style={{ fontSize: 14, flex: 1 }}>{map.name}</b>
          <button onClick={() => { setAddTab("quest"); setFQ((f) => ({ ...f, stage: isPlaza ? 1 : f.stage, level: isPlaza ? "숙련자" : f.level })); setAddOpen(true); }} title="퀘스트 추가" style={{ cursor: "pointer", border: `2px solid ${C.ink}`, borderRadius: 8, background: "linear-gradient(180deg,#e0a13d,#a86e13)", color: C.white, fontSize: 14, padding: "4px 9px", fontWeight: "bold" }}>＋</button>
          <div style={{ width: 120, height: 10, background: "#e7e2d6", borderRadius: 6, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(doneQ / totalQ) * 100}%`, background: `linear-gradient(90deg,${map.color},${map.deep})`, transition: "width .35s" }} />
          </div>
          <b style={{ fontSize: 12, color: map.deep }}>{doneQ}/{totalQ}</b>
        </div>

        <div style={{ position: "relative", width: "100%", maxWidth: MAP_W, height: VIEW_H, margin: "0 auto", border: `3px solid ${C.ink}`, borderRadius: 12, overflow: "hidden", boxShadow: "inset 0 0 40px rgba(0,0,0,0.12)" }}>
          <div ref={mapElRef} style={{ position: "absolute", left: 0, top: -cam, width: MAP_W, height: MAP_H, willChange: "top" }}>
            {isPlaza && (
              <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 50%, ${map.soft}, #efe7f8 60%, #e2d8ee)` }}>
                <div style={{ position: "absolute", left: "50%", top: 430, transform: "translate(-50%,-50%)", width: 520, height: 520, borderRadius: "50%", border: `3px dashed rgba(0,0,0,0.18)` }} />
                <div style={{ position: "absolute", left: "50%", top: 430, transform: "translate(-50%,-50%)", width: 350, height: 350, borderRadius: "50%", background: "rgba(0,0,0,0.05)" }} />
                <div style={{ position: "absolute", left: 20, top: 14, background: `linear-gradient(90deg,${map.color},${map.deep})`, color: C.white, borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: "bold" }}>🧠 사고의 광장 · 순서 없이 자유롭게 · 완료한 퀘스트는 🧠 도감으로</div>
                <div style={{ position: "absolute", left: 40, top: 120, fontSize: 34, opacity: 0.15 }}>❓</div>
                <div style={{ position: "absolute", right: 40, top: 700, fontSize: 34, opacity: 0.15 }}>🧩</div>
                <div style={{ position: "absolute", right: 60, top: 160, fontSize: 30, opacity: 0.13 }}>🌀</div>
              </div>
            )}
            {!isPlaza && map.stages.map((st, si) => {
              const open = stageOpen(st.n);
              const cleared_ = stageDone(st.n);
              return (
                <div key={st.n} style={{ position: "absolute", left: 0, top: BOSS_H + (map.stages.length - 1 - si) * STAGE_H, width: "100%", height: STAGE_H,
                  background: `linear-gradient(180deg, ${si % 2 ? map.soft : "#ffffff"}, ${map.soft})`,
                  borderBottom: "2px dashed rgba(0,0,0,0.15)", filter: open ? "none" : "grayscale(0.75) brightness(0.95)" }}>
                  <div style={{ position: "absolute", left: 14, top: 12, display: "flex", alignItems: "center", gap: 6, background: open ? `linear-gradient(90deg,${map.color},${map.deep})` : "#9a9a9a", color: C.white, borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: "bold", boxShadow: "0 2px 4px rgba(0,0,0,0.25)" }}>
                    {!open && "🔒 "}{st.n} STAGE · {st.name}{cleared_ && " ✓"}
                  </div>
                  <div style={{ position: "absolute", right: 18, top: 60, fontSize: 40, opacity: 0.18 }}>{st.deco}</div>
                  <div style={{ position: "absolute", left: 24, bottom: 30, fontSize: 30, opacity: 0.14 }}>{st.deco}</div>
                </div>
              );
            })}
            {!isPlaza && <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: BOSS_H, background: "radial-gradient(circle at 50% 55%, #4a2f4f, #241c33)" }}>
              <div style={{ position: "absolute", left: 14, top: 12, background: "linear-gradient(90deg,#c0563a,#8c2f21)", color: C.white, borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: "bold", boxShadow: "0 2px 4px rgba(0,0,0,0.4)" }}>👑 BOSS</div>
            </div>}

            <svg width={MAP_W} height={MAP_H} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
              {nodes.map((nd, i) => {
                if (i === 0) return null;
                const p = nodes[i - 1];
                const on = done[p.id] && done[nd.id];
                return <line key={nd.id} x1={p.x} y1={p.y} x2={nd.x} y2={nd.y} stroke={on ? map.color : "rgba(0,0,0,0.18)"} strokeWidth="5" strokeLinecap="round" strokeDasharray="1 14" />;
              })}
            </svg>

            {nodes.map((nd) => {
              const isDone = !!done[nd.id];
              const locked = !!lockReason(nd);
              const active = near === nd.id;
              const size = nd.isBoss ? 92 : 62;
              return (
                <div key={nd.id} style={{ position: "absolute", left: nd.x, top: nd.y, transform: "translate(-50%,-50%)", textAlign: "center", zIndex: 3 }}>
                  <div style={{ width: size, height: size, borderRadius: "50%",
                    background: isDone ? `radial-gradient(circle at 35% 30%, #ffffff55, ${map.color})` : locked ? "radial-gradient(circle at 35% 30%, #ffffff33, #9a94a6)" : "radial-gradient(circle at 35% 30%, #fffbe8, #ffd75e)",
                    border: `3px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: nd.isBoss ? 44 : 28,
                    boxShadow: active ? `0 0 0 5px rgba(255,215,94,0.55), 0 6px 10px rgba(0,0,0,0.3)` : "0 5px 8px rgba(0,0,0,0.28)",
                    transition: "box-shadow .2s, transform .2s", transform: active ? "scale(1.08)" : "scale(1)" }}>
                    {isDone ? "✅" : locked ? "🔒" : nd.icon}
                  </div>
                  <div style={{ marginTop: 5, fontSize: 11, fontWeight: "bold", color: nd.isBoss ? C.white : C.ink, background: nd.isBoss ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.92)", borderRadius: 12, padding: "2px 9px", whiteSpace: "nowrap", boxShadow: "0 2px 3px rgba(0,0,0,0.18)" }}>
                    {accepted[nd.id] ? (accepted[nd.id].started ? "▶ " : "🤝 ") : ""}{nd.due && !done[nd.id] ? "⏳" : ""}{nd.level ? (nd.level === "초보자" ? "🌱" : "🔥") : ""}{nd.title}
                  </div>
                </div>
              );
            })}

            {net && net.others && Object.values(net.others).filter((o) => o.v === "project").map((o) => (
              <div key={o.id} style={{ position: "absolute", left: o.rx || 0, top: o.ry || 0, transform: "translate(-50%,-100%)", zIndex: 5, opacity: 0.95, transition: "left .18s linear, top .18s linear", pointerEvents: "none" }}>
                {o.bubble && (
                  <div className="chat-bubble" style={{ position: "absolute", bottom: "150%", left: "50%", transform: "translateX(-50%)", whiteSpace: "normal", wordBreak: "break-word", width: "max-content", maxWidth: 190, lineHeight: 1.4, textAlign: "center", background: C.white, color: C.ink, border: `2px solid ${C.ink}`, borderRadius: 8, fontSize: 12, padding: "4px 8px" }}>{o.bubble}</div>
                )}
                <div style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 3, whiteSpace: "nowrap", background: "#5b8def", color: "#fff", border: `2px solid ${C.ink}`, fontSize: 10, padding: "1px 6px" }}>{o.name}</div>
                <div className={o.dm ? "dance-" + o.dm : ""} style={{ transformOrigin: "bottom center" }}>
                  <Hero facing={o.f || 1} moving={false} size={32} look={o.lk} carry={o.cy ? { emoji: o.cy } : null} outfit={o.oc ? { top: o.oc[0] ? { color: o.oc[0] } : null, bottom: o.oc[1] ? { color: o.oc[1] } : null, shoes: o.oc[2] ? { color: o.oc[2] } : null } : null} />
                </div>
              </div>
            ))}
            <div ref={heroElRef} style={{ position: "absolute", left: pos.x, top: pos.y, transform: "translate(-50%,-100%)", zIndex: 6, filter: "drop-shadow(0 4px 3px rgba(0,0,0,0.35))", willChange: "left, top" }}>
              <Hero facing={facing} moving={moving} size={38} />
            </div>
          </div>

          {near && <div className="enter-prompt" style={{ position: "absolute", left: "50%", bottom: 12, transform: "translateX(-50%)", background: "rgba(20,16,28,0.9)", color: C.white, border: `2px solid ${C.gem}`, borderRadius: 20, padding: "6px 16px", fontSize: 12, zIndex: 8 }}>E · 퀘스트 열기</div>}
          {warn && <div style={{ position: "absolute", left: "50%", top: 12, transform: "translateX(-50%)", background: "rgba(192,86,58,0.95)", color: C.white, borderRadius: 20, padding: "6px 16px", fontSize: 12, zIndex: 9, boxShadow: "0 3px 8px rgba(0,0,0,0.3)" }}>🔒 {warn}</div>}
          <div style={{ position: "absolute", right: 8, top: 8, background: "rgba(0,0,0,0.4)", color: C.white, borderRadius: 12, padding: "3px 9px", fontSize: 10, zIndex: 8 }}>↑ 위로 올라갈수록 보스!</div>
        </div>

        <div style={{ display: "flex", gap: 7, marginTop: 12 }}>
          {[["easy", "🌱 이지모드"], ["hard", "🔥 하드모드"]].map(([mo, label]) => (
            <button key={mo} onClick={() => { setMode(mo); const i = maps.findIndex((m) => (m.mode || "easy") === mo); if (i >= 0) switchMap(i); }}
              style={{ flex: 1, cursor: "pointer", fontFamily: "'DotGothic16', monospace", fontSize: 13, padding: "10px 6px", borderRadius: 10, border: `2px solid ${C.ink}`,
                background: mode === mo ? (mo === "easy" ? "linear-gradient(180deg,#3fa07a,#1d6b4a)" : "linear-gradient(180deg,#c0563a,#8c2f21)") : C.white,
                color: mode === mo ? C.white : C.ink, fontWeight: "bold", boxShadow: mode === mo ? "0 3px 0 rgba(0,0,0,0.3)" : "0 2px 0 rgba(0,0,0,0.15)" }}>{label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 7, marginTop: 8, flexWrap: "wrap" }}>
          {maps.map((m, i) => ({ m, i })).filter(({ m }) => (m.mode || "easy") === mode).map(({ m, i }) => {
            const on = i === mapIdx;
            return (
              <button key={m.id} onClick={() => switchMap(i)} style={{ flex: 1, minWidth: 100, cursor: "pointer", fontFamily: "'DotGothic16', monospace", fontSize: 12, padding: "9px 6px", borderRadius: 10,
                border: `2px solid ${C.ink}`, background: on ? `linear-gradient(180deg,${m.color},${m.deep})` : C.white, color: on ? C.white : C.ink, boxShadow: on ? "0 3px 0 rgba(0,0,0,0.3)" : "0 2px 0 rgba(0,0,0,0.15)" }}>
                {m.icon} {m.name}
              </button>
            );
          })}
        </div>
      </div>

      {dexOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 95, padding: 14 }} onClick={() => setDexOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, maxHeight: "calc(100vh - 28px)", overflowY: "auto" }}>
            <div style={{ background: C.parch, border: `3px solid ${C.ink}`, borderRadius: 14, padding: 16, boxShadow: "0 10px 26px rgba(0,0,0,0.45)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 26 }}>🧠</span>
                <b style={{ flex: 1, fontSize: 18 }}>사고 도감</b>
                <PxButton tone="ink" onClick={() => setDexOpen(false)} style={{ fontSize: 11, padding: "5px 9px" }}>✕</PxButton>
              </div>
              <div style={{ maxHeight: 340, overflow: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
                {maps.filter((m) => (m.mode || "easy") === "hard").map((m) => {
                  const qs = m.stages.reduce((a, st) => a.concat(st.quests.map((q) => ({ ...q, stage: st.n, stageName: st.name }))), []);
                  const dn = cleared[m.id] || {};
                  const cnt = qs.filter((q) => dn[q.id]).length;
                  const bossDone = !!dn[m.boss.id];
                  return (
                    <div key={m.id}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <span style={{ fontSize: 20 }}>{m.icon}</span>
                        <b style={{ flex: 1, fontSize: 15 }}>{m.name}</b>
                        <span style={{ fontSize: 13, color: C.inkSoft }}>{cnt}/{qs.length}{bossDone ? " · 👑 격파" : ""}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                        {qs.map((q) => {
                          const got = !!dn[q.id];
                          return (
                            <div key={q.id} title={q.task} style={{ position: "relative", background: C.white, border: `2px solid ${C.ink}`, borderRadius: 8, padding: "12px 7px", textAlign: "center" }}>
                              <div style={{ fontSize: 30 }}>{q.icon}</div>
                              <div style={{ fontSize: 13, marginTop: 5, fontWeight: "bold", color: C.ink, lineHeight: 1.35, wordBreak: "keep-all" }}>{q.title}</div>
                              <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 4 }}>{q.owner ? `🧑 ${q.owner}` : "🏛 기본 퀘스트"}</div>
                              {got && (
                                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(200,40,40,0.8)", fontSize: 52, fontWeight: "bold", lineHeight: 1, pointerEvents: "none", textShadow: "0 2px 3px rgba(255,255,255,0.7)" }}>✓</div>
                              )}
                            </div>
                          );
                        })}
                        <div style={{ position: "relative", background: "#fff1d6", border: `2px solid ${C.ink}`, borderRadius: 8, padding: "12px 7px", textAlign: "center" }}>
                          <div style={{ fontSize: 30 }}>{m.boss.icon}</div>
                          <div style={{ fontSize: 13, marginTop: 5, fontWeight: "bold", color: C.ink, lineHeight: 1.35, wordBreak: "keep-all" }}>{m.boss.title}</div>
                          <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 4 }}>👑 보스</div>
                          {bossDone && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(200,40,40,0.8)", fontSize: 52, fontWeight: "bold", lineHeight: 1, pointerEvents: "none", textShadow: "0 2px 3px rgba(255,255,255,0.7)" }}>✓</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 12, textAlign: "center", lineHeight: 1.6 }}>등록된 퀘스트가 모두 보여요 · 작은 글씨는 주최한 사람<br />완료한 건 빨간 ✓ 표시</div>
            </div>
          </div>
        </div>
      )}

      {collOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 95, padding: 14 }} onClick={() => setCollOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, maxHeight: "calc(100vh - 28px)", overflowY: "auto" }}>
            <div style={{ background: C.parch, border: `3px solid ${C.ink}`, borderRadius: 14, padding: 16, boxShadow: "0 10px 26px rgba(0,0,0,0.45)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 22 }}>👾</span>
                <b style={{ flex: 1, fontSize: 15 }}>보스 도감</b>
                <PxButton tone="ink" onClick={() => setCollOpen(false)} style={{ fontSize: 11, padding: "5px 9px" }}>✕</PxButton>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, maxHeight: 340, overflow: "auto" }}>
                {PAST_BOSSES.map((b) => (
                  <div key={b.id} style={{ position: "relative", background: C.white, border: `2px solid ${C.ink}`, borderRadius: 10, padding: "12px 6px", textAlign: "center" }}>
                    <div style={{ fontSize: 34, opacity: 0.85 }}>{b.icon}</div>
                    <div style={{ fontSize: 11, fontWeight: "bold", marginTop: 4 }}>{b.name}</div>
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(200,40,40,0.75)", fontSize: 56, fontWeight: "bold", lineHeight: 1 }}>✕</div>
                  </div>
                ))}
                {maps.map((m) => {
                  const st = bossState(m);
                  return (
                    <div key={m.id} style={{ position: "relative", background: C.white, border: `2px solid ${C.ink}`, borderRadius: 10, padding: "12px 6px", textAlign: "center" }}>
                      <div style={{ fontSize: 34 }}>{m.boss.icon}</div>
                      <div style={{ fontSize: 11, fontWeight: "bold", marginTop: 4 }}>{m.boss.title}</div>
                      <div style={{ fontSize: 9, color: C.inkSoft }}>{m.icon} {m.name}</div>
                      {st === "done" && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(200,40,40,0.75)", fontSize: 56, fontWeight: "bold", lineHeight: 1 }}>✕</div>}
                    </div>
                  );
                })}
                {Array.from({ length: FUTURE_BOSSES }).map((_, i) => (
                  <div key={"f" + i} style={{ background: "#ddd8cc", border: `2px dashed ${C.ink}`, borderRadius: 10, padding: "12px 6px", textAlign: "center" }}>
                    <div style={{ fontSize: 34, filter: "brightness(0)", opacity: 0.35 }}>👹</div>
                    <div style={{ fontSize: 11, fontWeight: "bold", marginTop: 4, color: C.inkSoft }}>???</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: C.inkSoft, marginTop: 10, textAlign: "center" }}>✕ = 처치 완료 · 그림자 = 아직 만나지 못한 보스</div>
            </div>
          </div>
        </div>
      )}

      {submitFor && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.68)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 14 }} onClick={() => setSubmitFor(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 380, maxHeight: "calc(100vh - 28px)", overflowY: "auto" }}>
            <Panel style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 22 }}>📮</span>
                <b style={{ flex: 1, fontSize: 15 }}>퀘스트 답변 제출</b>
                <PxButton tone="ink" onClick={() => setSubmitFor(null)} style={{ fontSize: 11, padding: "5px 9px" }}>✕</PxButton>
              </div>
              <div style={{ background: "#fff5d6", border: `2px solid ${C.ink}`, borderRadius: 8, padding: 10, fontSize: 12.5, lineHeight: 1.7, marginBottom: 10 }}>
                <b>{submitFor.icon} {submitFor.title}</b><br />
                <span style={{ color: C.inkSoft }}>✅ {submitFor.task || "완료 조건 없음"}</span><br />
                <span style={{ color: C.inkSoft, fontSize: 11 }}>📋 검토 : {submitFor.registrar || submitFor.owner || "미지정"}</span>
              </div>
              <div style={{ fontSize: 11.5, fontWeight: "bold", marginBottom: 5 }}>✍️ 어떻게 해결했는지 적어주세요</div>
              <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={5} autoFocus
                placeholder={"예: 훅 3가지 버전으로 만들어봤고 두 번째가 반응이 제일 좋았어요.\n결과물 링크: ..."}
                style={{ width: "100%", boxSizing: "border-box", padding: 10, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 13, resize: "vertical" }} />
              <PxButton tone="gold" disabled={!answer.trim()} onClick={() => {
                const q = submitFor;
                clear(q);
                setSubmitFor(null); setSel(null);
                onSubmitAnswer && onSubmitAnswer(q, answer.trim());
                setShrineFor(q);
              }} style={{ width: "100%", marginTop: 10, padding: 12, fontSize: 14 }}>🏆 답변 등록하기</PxButton>
              <div style={{ fontSize: 10.5, color: C.inkSoft, textAlign: "center", marginTop: 7 }}>등록하면 퀘스트 완료의 제단 「수락 파편」에 자동으로 올라가요</div>
            </Panel>
          </div>
        </div>
      )}

      {shrineFor && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 14 }} onClick={() => setShrineFor(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 340, maxHeight: "calc(100vh - 28px)", overflowY: "auto" }}>
            <div style={{ background: "radial-gradient(circle at 50% 0%, #3a2e6b, #1a1436 70%)", border: `4px solid ${C.ink}`, borderRadius: 14, padding: 20, textAlign: "center", boxShadow: "0 12px 30px rgba(0,0,0,0.55)" }}>
              <div style={{ display: "flex", justifyContent: "center" }}><QuestShrine size={110} /></div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: "#ffd75e", margin: "12px 0 8px" }}>QUEST COMPLETE</div>
              <div style={{ fontSize: 15, fontWeight: "bold", color: C.white, marginBottom: 8 }}>{shrineFor.icon} {shrineFor.title}</div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.8)", lineHeight: 1.9, marginBottom: 14 }}>
                🏆 <b style={{ color: "#ffd75e" }}>완료의 제단에 등록되었습니다!</b><br /><br />
                ✅ 광장에서 사라지고 🧠 <b style={{ color: "#7fe3ff" }}>사고 도감</b>에 기록됐어요<br />
                📋 <b style={{ color: "#7fe3ff" }}>{shrineFor.registrar || shrineFor.owner || "등록자"}</b> 님의 검토 후<br />
                보상이 지급됩니다
              </div>
              <div style={{ background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,215,94,0.5)", borderRadius: 8, padding: 10, fontSize: 11.5, color: "rgba(255,255,255,0.75)", lineHeight: 1.7, marginBottom: 14 }}>
                예상 보상 · <b style={{ color: "#ffd75e" }}>{rewardLabel(shrineFor)}</b>
              </div>
              <PxButton tone="gold" onClick={() => { const q = shrineFor; setShrineFor(null); setSel(null); onGoShrine && onGoShrine(q); }} style={{ width: "100%", padding: 13, fontSize: 14 }}>🏆 제단으로 이동</PxButton>
              <PxButton tone="ink" onClick={() => setShrineFor(null)} style={{ width: "100%", padding: 10, fontSize: 12, marginTop: 8 }}>닫기</PxButton>
            </div>
          </div>
        </div>
      )}

      {addOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 95, padding: 14 }} onClick={() => setAddOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 380, maxHeight: "calc(100vh - 28px)", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
            <div style={{ background: C.parch, border: `3px solid ${C.ink}`, borderRadius: 14, padding: 16 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                <PxButton tone={addTab === "quest" ? "good" : "wood"} onClick={() => setAddTab("quest")} style={{ flex: 2, fontSize: 12, padding: 8 }}>🎯 퀘스트 추가</PxButton>
                <PxButton tone={addTab === "map" ? "danger" : "wood"} onClick={() => setAddTab("map")} style={{ flex: 1, fontSize: 11, padding: 8 }}>👹 새 보스맵</PxButton>
              </div>
              {addTab === "quest" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <div style={{ background: "#fff5d6", border: `2px solid ${C.ink}`, borderRadius: 8, padding: "7px 10px", fontSize: 11.5, lineHeight: 1.6 }}>
                    <b>{map.icon} {map.name}</b> {isPlaza ? "광장" : "맵"} 안에 퀘스트를 추가해요.<br />
                    <span style={{ color: C.inkSoft }}>새 보스맵이 생기는 게 아니라, 이 보스맵 소속 퀘스트가 됩니다.</span>
                  </div>
                  {!isPlaza && (
                    <select value={fQ.stage} onChange={(e) => setFQ({ ...fQ, stage: e.target.value })} style={{ padding: 8, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 13 }}>
                      {map.stages.map((st) => <option key={st.n} value={st.n}>{st.n} 스테이지 · {st.name}</option>)}
                    </select>
                  )}

                  <div style={{ fontSize: 11, fontWeight: "bold" }}>🎯 아이콘 · 퀘스트 이름</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input value={fQ.icon} onChange={(e) => setFQ({ ...fQ, icon: e.target.value })} maxLength={2} placeholder="🎯" style={{ width: 52, textAlign: "center", padding: 8, border: `2px solid ${C.ink}`, borderRadius: 6, fontSize: 16 }} />
                    <input value={fQ.title} onChange={(e) => setFQ({ ...fQ, title: e.target.value })} placeholder="퀘스트 이름" style={{ flex: 1, minWidth: 0, padding: 8, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 13 }} />
                  </div>

                  {/* 난이도 선택은 이지모드에만 있어요 (하드모드는 전부 숙련자) */}
                  {!isPlaza && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: "bold" }}>🎚 난이도</div>
                      <div style={{ display: "flex", gap: 5 }}>
                        {["초보자", "숙련자"].map((lv) => (
                          <PxButton key={lv} tone={fQ.level === lv ? (lv === "초보자" ? "good" : "danger") : "wood"} onClick={() => setFQ({ ...fQ, level: lv })} style={{ flex: 1, fontSize: 12, padding: 8 }}>{lv === "초보자" ? "🌱 초보자" : "🔥 숙련자"}</PxButton>
                        ))}
                      </div>
                      {fQ.level === "초보자" && (
                        <div style={{ display: "flex", gap: 5 }}>
                          <PxButton tone={fQ.field === "naverschool" ? "good" : "wood"} onClick={() => setFQ({ ...fQ, field: "naverschool" })} style={{ flex: 1, fontSize: 12, padding: 8 }}>📗 네이버</PxButton>
                          <PxButton tone={fQ.field === "videoschool" ? "good" : "wood"} onClick={() => setFQ({ ...fQ, field: "videoschool" })} style={{ flex: 1, fontSize: 12, padding: 8 }}>🎬 영상</PxButton>
                        </div>
                      )}
                    </>
                  )}

                  <div style={{ fontSize: 11, fontWeight: "bold" }}>📝 내용 설명</div>
                  <textarea value={fQ.desc} onChange={(e) => setFQ({ ...fQ, desc: e.target.value })} rows={3} placeholder="이 퀘스트가 무엇인지, 왜 필요한지 적어주세요"
                    style={{ padding: 8, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 13, resize: "vertical", boxSizing: "border-box" }} />

                  <div style={{ fontSize: 11, fontWeight: "bold" }}>✅ 완료 조건</div>
                  <input value={fQ.task} onChange={(e) => setFQ({ ...fQ, task: e.target.value })} placeholder="무엇을 하면 완료인가요?" style={{ padding: 8, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 13 }} />

                  <div style={{ fontSize: 11, fontWeight: "bold" }}>⏳ 제한시간 (몇 시까지)</div>
                  <input type="datetime-local" value={fQ.due || ""} onChange={(e) => setFQ({ ...fQ, due: e.target.value })} style={{ padding: 8, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 13 }} />
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {[["1시간", 1], ["3시간", 3], ["6시간", 6], ["내일 이맘때", 24], ["3일", 72]].map(([lb, h]) => (
                      <button key={lb} onClick={() => setFQ({ ...fQ, due: toLocalDT(Date.now() + h * 3600000) })}
                        style={{ cursor: "pointer", fontFamily: "'DotGothic16', monospace", fontSize: 10.5, padding: "5px 9px", borderRadius: 12, border: `2px solid ${C.ink}`, background: C.white, fontWeight: "bold" }}>+{lb}</button>
                    ))}
                    {fQ.due && <button onClick={() => setFQ({ ...fQ, due: "" })} style={{ cursor: "pointer", fontFamily: "'DotGothic16', monospace", fontSize: 10.5, padding: "5px 9px", borderRadius: 12, border: `2px solid ${C.ink}`, background: "#f0d4cc", fontWeight: "bold" }}>✕ 해제</button>}
                  </div>
                  {fQ.due && (() => {
                    const d = dueText(fQ.due);
                    return <div style={{ fontSize: 11.5, fontWeight: "bold", color: d && d.over ? C.danger : C.good, background: C.white, border: `2px solid ${C.ink}`, borderRadius: 6, padding: "6px 9px" }}>
                      {new Date(fQ.due).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} 까지 · {d ? d.txt : ""}
                    </div>;
                  })()}

                  <div style={{ fontSize: 11, fontWeight: "bold" }}>🎁 보상</div>
                  <div style={{ display: "flex", gap: 5 }}>
                    {[["gem", "💎 젬"], ["gold", "🪙 골드"], ["item", "🎁 직접 입력"]].map(([k, lb]) => (
                      <PxButton key={k} tone={fQ.rewardKind === k ? "good" : "wood"} onClick={() => setFQ({ ...fQ, rewardKind: k })} style={{ flex: 1, fontSize: 11, padding: 8 }}>{lb}</PxButton>
                    ))}
                  </div>
                  {fQ.rewardKind === "item" && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <input value={fQ.rewardEmoji} onChange={(e) => setFQ({ ...fQ, rewardEmoji: e.target.value })} maxLength={2} placeholder="🎁"
                        style={{ width: 52, textAlign: "center", padding: 8, border: `2px solid ${C.ink}`, borderRadius: 6, fontSize: 16 }} />
                      <input value={fQ.rewardName} onChange={(e) => setFQ({ ...fQ, rewardName: e.target.value })} placeholder="보상 이름 (예: 커피 기프티콘)"
                        style={{ flex: 1, minWidth: 0, padding: 8, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 13 }} />
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input value={fQ.gem} onChange={(e) => setFQ({ ...fQ, gem: e.target.value })} type="number" min="0"
                      style={{ width: 80, padding: 8, border: `2px solid ${C.ink}`, borderRadius: 6, fontSize: 13 }} />
                    <span style={{ fontSize: 12, color: C.inkSoft }}>
                      {fQ.rewardKind === "gem" ? "💎 젬" : fQ.rewardKind === "gold" ? "🪙 골드" : `${fQ.rewardEmoji || "🎁"} ${fQ.rewardName.trim() || "보상"}`} 개수
                    </span>
                  </div>
                  <div style={{ fontSize: 10.5, color: C.inkSoft, background: "#fff5d6", border: `2px solid ${C.ink}`, borderRadius: 6, padding: "6px 9px" }}>
                    완료하면 <b>{fQ.rewardKind === "gem" ? `💎 젬 ${fQ.gem || 0}` : fQ.rewardKind === "gold" ? `🪙 골드 ${fQ.gem || 0}` : `${fQ.rewardEmoji || "🎁"} ${fQ.rewardName.trim() || "보상"} ${fQ.gem || 0}개`}</b> 지급
                    {fQ.rewardKind === "item" && <><br />직접 입력 보상은 🎒 선물함에 증표로 들어가요</>}
                  </div>

                  <div style={{ fontSize: 11, fontWeight: "bold" }}>📋 퀘스트 등록자 (검토 담당)</div>
                  <div style={{ display: "flex", gap: 5 }}>
                    <PxButton tone={fQ.regMode === "me" ? "good" : "wood"} onClick={() => setFQ({ ...fQ, regMode: "me", regName: "" })} style={{ flex: 1, fontSize: 12, padding: 8 }}>🧑 나</PxButton>
                    <PxButton tone={fQ.regMode === "other" ? "good" : "wood"} onClick={() => setFQ({ ...fQ, regMode: "other" })} style={{ flex: 1, fontSize: 12, padding: 8 }}>🙋 타인</PxButton>
                  </div>
                  {fQ.regMode === "other" && (
                    <div>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", maxHeight: 110, overflow: "auto", background: C.white, border: `2px solid ${C.ink}`, borderRadius: 6, padding: 8 }}>
                        {(people.length ? people : [{ name: myName || "나", avatar: "🧑" }]).map((pp) => (
                          <button key={pp.name} type="button" onClick={() => setFQ({ ...fQ, regName: pp.name })}
                            style={{ cursor: "pointer", fontFamily: "'DotGothic16', monospace", fontSize: 12, padding: "6px 10px", borderRadius: 14, border: `2px solid ${C.ink}`, background: fQ.regName === pp.name ? C.gem : C.white, fontWeight: fQ.regName === pp.name ? "bold" : "normal" }}>
                            {pp.avatar} {pp.name}{fQ.regName === pp.name ? " ✓" : ""}
                          </button>
                        ))}
                      </div>
                      <div style={{ fontSize: 10.5, color: fQ.regName ? C.good : C.danger, marginTop: 5 }}>
                        {fQ.regName ? `${fQ.regName} 님이 이 퀘스트를 검토해요` : "등록자를 골라주세요"}
                      </div>
                    </div>
                  )}
                  <div style={{ fontSize: 10.5, color: C.inkSoft, background: "#fff5d6", border: `2px solid ${C.ink}`, borderRadius: 6, padding: "6px 9px" }}>
                    작성자(나)와 등록자만 이 퀘스트를 수정·삭제할 수 있어요
                  </div>

                  <div style={{ fontSize: 11, fontWeight: "bold" }}>👥 참가 가능한 사람</div>
                  <div style={{ display: "flex", gap: 5 }}>
                    <PxButton tone={fQ.who === "all" ? "good" : "wood"} onClick={() => setFQ({ ...fQ, who: "all" })} style={{ flex: 1, fontSize: 12, padding: 8 }}>🌍 모두</PxButton>
                    <PxButton tone={fQ.who === "some" ? "good" : "wood"} onClick={() => setFQ({ ...fQ, who: "some" })} style={{ flex: 1, fontSize: 12, padding: 8 }}>🙋 일부 지정</PxButton>
                  </div>
                  {fQ.who === "some" && (
                    <div>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", maxHeight: 120, overflow: "auto", background: C.white, border: `2px solid ${C.ink}`, borderRadius: 6, padding: 8 }}>
                        {(people.length ? people : [{ name: myName || "나", avatar: "🧑" }]).map((pp) => {
                          const on = (fQ.whoList || []).includes(pp.name);
                          return (
                            <button key={pp.name} type="button"
                              onClick={() => setFQ({ ...fQ, whoList: on ? fQ.whoList.filter((x) => x !== pp.name) : [...(fQ.whoList || []), pp.name] })}
                              style={{ cursor: "pointer", fontFamily: "'DotGothic16', monospace", fontSize: 12, padding: "6px 10px", borderRadius: 14, border: `2px solid ${C.ink}`, background: on ? C.gem : C.white, fontWeight: on ? "bold" : "normal" }}>
                              {pp.avatar} {pp.name}{on ? " ✓" : ""}
                            </button>
                          );
                        })}
                      </div>
                      <div style={{ fontSize: 10.5, color: C.inkSoft, marginTop: 5 }}>
                        {(fQ.whoList || []).length ? `선택됨 : ${fQ.whoList.join(", ")}` : "여러 명 선택할 수 있어요. 아무도 안 고르면 모두 참가 가능이 됩니다."}
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <PxButton tone="ink" onClick={() => setAddOpen(false)} style={{ flex: 1, padding: 10, fontSize: 13 }}>취소</PxButton>
                    <PxButton tone="gold" disabled={!fQ.title.trim() || (fQ.regMode === "other" && !fQ.regName)} onClick={addQuest} style={{ flex: 1, padding: 10, fontSize: 13 }}>퀘스트 추가</PxButton>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <div style={{ background: "#fbe4dd", border: `2px solid ${C.danger}`, borderRadius: 8, padding: "7px 10px", fontSize: 11.5, lineHeight: 1.6 }}>
                    ⚠️ 여기는 <b>완전히 새로운 보스맵(프로젝트)</b>을 만드는 곳이에요.<br />
                    <span style={{ color: C.inkSoft }}>「{map.name}」 안에 퀘스트만 넣으려면 왼쪽 🎯 퀘스트 추가 탭을 쓰세요.</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input value={fM.icon} onChange={(e) => setFM({ ...fM, icon: e.target.value })} maxLength={2} placeholder="🗺" style={{ width: 52, textAlign: "center", padding: 8, border: `2px solid ${C.ink}`, borderRadius: 6, fontSize: 16 }} />
                    <input value={fM.name} onChange={(e) => setFM({ ...fM, name: e.target.value })} placeholder="맵 이름 (예: 신발)" style={{ flex: 1, minWidth: 0, padding: 8, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 13 }} />
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input value={fM.bossIcon} onChange={(e) => setFM({ ...fM, bossIcon: e.target.value })} maxLength={2} placeholder="👹" style={{ width: 52, textAlign: "center", padding: 8, border: `2px solid ${C.ink}`, borderRadius: 6, fontSize: 16 }} />
                    <input value={fM.boss} onChange={(e) => setFM({ ...fM, boss: e.target.value })} placeholder="보스 이름" style={{ flex: 1, minWidth: 0, padding: 8, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 13 }} />
                  </div>
                  <div style={{ fontSize: 10, color: C.inkSoft }}>만들면 1 스테이지가 생겨요. 그 뒤 퀘스트 추가로 채우면 됩니다.</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <PxButton tone="ink" onClick={() => setAddOpen(false)} style={{ flex: 1, padding: 10, fontSize: 13 }}>취소</PxButton>
                    <PxButton tone="gold" disabled={!fM.name.trim()} onClick={addMap} style={{ flex: 1, padding: 10, fontSize: 13 }}>만들기</PxButton>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {sel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.62)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 90, padding: 14 }} onClick={() => setSel(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 370 }}>
            <div style={{ background: C.parch, border: `3px solid ${C.ink}`, borderRadius: 14, padding: 18, boxShadow: "0 10px 26px rgba(0,0,0,0.45)" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 78, height: 78, margin: "0 auto", borderRadius: "50%", background: sel.isBoss ? "radial-gradient(circle at 35% 30%, #ffffff44, #8c2f21)" : `radial-gradient(circle at 35% 30%, #fffbe8, ${map.color})`, border: `3px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, boxShadow: "0 5px 10px rgba(0,0,0,0.3)" }}>{sel.icon}</div>
                <div style={{ fontSize: 10, color: C.inkSoft, marginTop: 8 }}>{sel.isBoss ? "👑 BOSS" : `${sel.stage} STAGE · ${sel.stageName}`}</div>
                {accepted[sel.id] && (
                  <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
                    <span style={{ fontSize: 10, color: C.inkSoft, alignSelf: "center" }}>👥 파티</span>
                    {(accepted[sel.id].party || []).map((p) => (
                      <span key={p} style={{ fontSize: 10, fontWeight: "bold", color: C.white, background: (accepted[sel.id].agree || []).includes(p) ? "#2f9e6e" : "#5b8def", borderRadius: 10, padding: "2px 9px" }}>
                        {p}{(accepted[sel.id].agree || []).includes(p) ? " ✓" : ""}
                      </span>
                    ))}
                    {accepted[sel.id].locked && <span style={{ fontSize: 10, fontWeight: "bold", color: C.ink, background: "#ffd75e", borderRadius: 10, padding: "2px 9px" }}>🔒 확정</span>}
                  </div>
                )}
                {sel.level && (
                  <div style={{ display: "flex", gap: 5, justifyContent: "center", marginTop: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: "bold", color: C.white, background: sel.level === "초보자" ? "#2f9e6e" : "#c0563a", borderRadius: 10, padding: "2px 9px" }}>{sel.level === "초보자" ? "🌱 초보자" : "🔥 숙련자"}</span>
                    {sel.field && <span style={{ fontSize: 10, fontWeight: "bold", color: C.white, background: sel.field === "naverschool" ? "#2db400" : "#8e5a9e", borderRadius: 10, padding: "2px 9px" }}>{sel.field === "naverschool" ? "📗 네이버" : "🎬 영상"}</span>}
                  </div>
                )}
                <div style={{ fontSize: 17, fontWeight: "bold", margin: "4px 0 8px" }}>{sel.title}</div>
              </div>
              <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 10, textAlign: "center", lineHeight: 1.6 }}>{sel.desc}</div>
              <div style={{ background: C.white, border: `2px solid ${C.ink}`, borderRadius: 10, padding: 12, fontSize: 13, lineHeight: 1.6 }}>🎯 {sel.task}</div>
              <div style={{ fontSize: 13, textAlign: "center", margin: "10px 0", color: "#a86e13", fontWeight: "bold" }}>보상 {rewardLabel(sel)}</div>
              {!sel.isBoss && (
                <div style={{ background: canJoin(sel) ? "#eef6ef" : "#fbe4e0", border: `2px solid ${canJoin(sel) ? C.good : C.danger}`, borderRadius: 8, padding: 9, marginBottom: 10 }}>
                  <div style={{ fontSize: 11.5, fontWeight: "bold", color: canJoin(sel) ? C.ink : C.danger, marginBottom: 4 }}>
                    {whoLabel(sel)}{canJoin(sel) ? "" : " — 나는 참가 대상이 아니에요"}
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {(Array.isArray(sel.who) && sel.who.length ? sel.who : ["모두"]).map((n) => (
                      <span key={n} style={{ fontSize: 10.5, background: n === myName ? C.gem : C.white, border: `2px solid ${C.ink}`, borderRadius: 10, padding: "2px 8px", fontWeight: n === myName ? "bold" : "normal" }}>
                        {n === "모두" ? "🌍 모두" : `🧑 ${n}`}{n === myName ? " (나)" : ""}
                      </span>
                    ))}
                  </div>
                  {accepted[sel.id] && (accepted[sel.id].party || []).length > 0 && (
                    <div style={{ marginTop: 7, borderTop: `1px dashed ${C.ink}`, paddingTop: 6 }}>
                      <div style={{ fontSize: 10.5, color: C.inkSoft, marginBottom: 3 }}>🤝 지금 참가 중</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {(accepted[sel.id].party || []).map((n) => (
                          <span key={n} style={{ fontSize: 10.5, background: "#d9f0e2", border: `2px solid ${C.good}`, borderRadius: 10, padding: "2px 8px", fontWeight: "bold" }}>✅ {n}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {sel.due && dueText(sel.due) && (
                <div style={{ fontSize: 13, textAlign: "center", marginBottom: 10, fontWeight: "bold", color: dueText(sel.due).over ? C.danger : "#2f9e6e", background: dueText(sel.due).over ? "#fbe4e0" : "#e6f4ec", border: `2px solid ${dueText(sel.due).over ? C.danger : "#2f9e6e"}`, borderRadius: 8, padding: 8 }}>
                  {dueText(sel.due).txt}<div style={{ fontSize: 10, color: C.inkSoft, fontWeight: "normal", marginTop: 2 }}>마감 {new Date(sel.due).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              )}
              {done[sel.id] && typeof done[sel.id] === "string" && <div style={{ fontSize: 11, textAlign: "center", color: C.good, marginBottom: 8 }}>✅ {done[sel.id]}님이 완료했어요</div>}
              {lockReason(sel) && <div style={{ background: "#fbe4e0", border: `2px solid ${C.danger}`, borderRadius: 8, color: C.danger, padding: 9, fontSize: 12, margin: "10px 0", textAlign: "center", fontWeight: "bold" }}>🔒 {lockReason(sel)}</div>}
              {map.mode === "hard" && !done[sel.id] && !sel.isBoss && !lockReason(sel) && (
                <div style={{ background: "#fff6e8", border: `2px solid ${C.ink}`, borderRadius: 10, padding: 11, marginBottom: 10 }}>
                  {done[sel.id] ? (
                    <div style={{ fontSize: 12.5, color: C.good, textAlign: "center", padding: 10, fontWeight: "bold", background: "#e6f4ec", border: `2px solid ${C.good}`, borderRadius: 8 }}>
                      ✅ 이미 완료된 퀘스트예요<br /><span style={{ fontSize: 11, fontWeight: "normal", color: C.inkSoft }}>수락할 수 없어요</span>
                    </div>
                  ) : !accepted[sel.id] ? (
                    canJoin(sel)
                      ? <PxButton tone="gold" onClick={() => onAccept && onAccept(sel.id, sel.title)} style={{ width: "100%", padding: 11, fontSize: 13 }}>🤝 퀘스트 수락하기</PxButton>
                      : <div style={{ fontSize: 12, color: C.danger, textAlign: "center", padding: 8, fontWeight: "bold" }}>지정된 참가자만 수락할 수 있어요</div>
                  ) : (accepted[sel.id].locked && !(accepted[sel.id].party || []).includes(myName)) ? (
                    <div style={{ fontSize: 12, color: C.danger, textAlign: "center", padding: 8, fontWeight: "bold" }}>🔒 파티가 확정된 퀘스트예요. 참여할 수 없어요.</div>
                  ) : (
                    <div>
                      {!accepted[sel.id].started ? (
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                            <PxButton tone="ink" onClick={() => { setSel(null); setEditing(null); }} style={{ fontSize: 11, padding: "6px 10px" }}>← 뒤로</PxButton>
                            <span style={{ flex: 1, fontSize: 10.5, color: C.good, fontWeight: "bold" }}>🤝 수락됨 — 닫아도 유지돼요</span>
                          </div>
                          <div style={{ fontSize: 11, color: C.inkSoft, marginBottom: 6 }}>파티원을 모집한 뒤 시작하세요</div>
                          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                            <PxButton tone="wood" onClick={() => onShout && onShout(`📢 「${sel.title}」 퀘스트 같이 하실 분!`)} style={{ flex: 1, fontSize: 11, padding: 8 }}>📢 확성기 모집</PxButton>
                            <PxButton tone="wood" onClick={() => onBoard && onBoard(sel.title)} style={{ flex: 1, fontSize: 11, padding: 8 }}>📋 게시판 모집</PxButton>
                          </div>
                          {!accepted[sel.id].locked ? (
                            <PxButton tone={(accepted[sel.id].agree || []).includes(myName) ? "ink" : "danger"} onClick={() => onAgree && onAgree(sel.id)} style={{ width: "100%", padding: 9, fontSize: 12, marginBottom: 6 }}>
                              🔒 퀘스트 잠금 동의 ({(accepted[sel.id].agree || []).length}/{(accepted[sel.id].party || []).length})
                            </PxButton>
                          ) : (
                            <div style={{ fontSize: 11, color: C.good, textAlign: "center", marginBottom: 6, fontWeight: "bold" }}>🔒 파티 확정 — 더 이상 참여할 수 없어요</div>
                          )}
                          <PxButton tone="good" onClick={() => onStart && onStart(sel.id)} style={{ width: "100%", padding: 10, fontSize: 13 }}>▶ 퀘스트 시작</PxButton>
                          <PxButton tone="danger" onClick={() => onLeave && onLeave(sel.id)} style={{ width: "100%", padding: 9, fontSize: 12, marginTop: 6 }}>🚪 퀘스트에서 나가기</PxButton>
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "2px 0 8px" }}>
                            <PxButton tone="ink" onClick={() => { setSel(null); setEditing(null); }} style={{ fontSize: 11, padding: "6px 10px" }}>← 뒤로</PxButton>
                            <span style={{ flex: 1, fontSize: 10.5, color: C.good, fontWeight: "bold" }}>▶ 진행 중 — 닫아도 계속 유지돼요</span>
                          </div>
                          <div style={{ fontSize: 12, fontWeight: "bold", margin: "4px 0 5px" }}>💬 퀘스트 대화방</div>
                          <div ref={threadRef} style={{ height: 110, overflow: "auto", background: C.white, border: `2px solid ${C.ink}`, borderRadius: 6, padding: 7, display: "flex", flexDirection: "column", gap: 4 }}>
                            {(threads[sel.id] || []).length === 0 && <div style={{ fontSize: 11, color: C.inkSoft }}>대화를 시작해보세요</div>}
                            {(threads[sel.id] || []).map((m, i) => (
                              <div key={i} style={{ fontSize: 12 }}><b style={{ color: "#5b8def" }}>{m.who}</b> {m.text}</div>
                            ))}
                          </div>
                          <div style={{ display: "flex", gap: 5, marginTop: 6 }}>
                            <input value={tMsg} onChange={(e) => setTMsg(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && tMsg.trim()) { onThreadSend && onThreadSend(sel.id, tMsg.trim()); setTMsg(""); } }} placeholder="메시지" style={{ flex: 1, minWidth: 0, padding: 7, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 12 }} />
                            <PxButton tone="blue" onClick={() => { if (tMsg.trim()) { onThreadSend && onThreadSend(sel.id, tMsg.trim()); setTMsg(""); } }} style={{ fontSize: 11, padding: "7px 10px" }}>➤</PxButton>
                          </div>
                          <PxButton tone="danger" onClick={() => onLeave && onLeave(sel.id)} style={{ width: "100%", padding: 9, fontSize: 12, marginTop: 8 }}>🚪 퀘스트에서 나가기</PxButton>
                          <div style={{ fontSize: 12, fontWeight: "bold", margin: "10px 0 5px" }}>📓 퀘스트 일지</div>
                          <textarea value={notes[sel.id] || ""} onChange={(e) => onNote && onNote(sel.id, e.target.value)} placeholder="진행 상황·메모를 남겨두세요" style={{ width: "100%", boxSizing: "border-box", height: 70, padding: 8, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 12, resize: "none", background: C.white }} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {sel.level === "초보자" && sel.field && onGoSchool && !lockReason(sel) && (
                <PxButton tone="blue" onClick={() => onGoSchool(sel.field)} style={{ width: "100%", padding: 10, fontSize: 13, marginBottom: 10 }}>
                  {sel.field === "naverschool" ? "📗 네이버스쿨로 가서 배우기 →" : "🎬 영상스쿨로 가서 배우기 →"}
                </PxButton>
              )}
              {editing && editing.id === sel.id ? (
                <div style={{ background: "#fff", border: `2px solid ${C.ink}`, borderRadius: 10, padding: 11, marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 7 }}>✏️ 퀘스트 수정</div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                    <input value={editing.icon} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} maxLength={2} style={{ width: 46, textAlign: "center", padding: 8, border: `2px solid ${C.ink}`, borderRadius: 6, fontSize: 15 }} />
                    <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="이름" style={{ flex: 1, minWidth: 0, padding: 8, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 13 }} />
                    <input value={editing.gem} onChange={(e) => setEditing({ ...editing, gem: e.target.value })} type="number" style={{ width: 56, padding: 8, border: `2px solid ${C.ink}`, borderRadius: 6, fontSize: 13 }} />
                  </div>
                  <input value={editing.desc} onChange={(e) => setEditing({ ...editing, desc: e.target.value })} placeholder="한 줄 설명" style={{ width: "100%", boxSizing: "border-box", padding: 8, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 13, marginBottom: 6 }} />
                  <input value={editing.task} onChange={(e) => setEditing({ ...editing, task: e.target.value })} placeholder="목표" style={{ width: "100%", boxSizing: "border-box", padding: 8, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 13 }} />
                  <div style={{ display: "flex", gap: 7, marginTop: 9 }}>
                    <PxButton tone="ink" onClick={() => setEditing(null)} style={{ flex: 1, padding: 9, fontSize: 12 }}>취소</PxButton>
                    <PxButton tone="good" disabled={!editing.title.trim()} onClick={saveEdit} style={{ flex: 1, padding: 9, fontSize: 12 }}>저장</PxButton>
                  </div>
                </div>
              ) : canEdit(sel) && (
                <div style={{ display: "flex", gap: 7, marginBottom: 10 }}>
                  <PxButton tone="wood" onClick={() => setEditing({ id: sel.id, title: sel.title, icon: sel.icon, gem: sel.gem, desc: sel.desc || "", task: sel.task || "" })} style={{ flex: 1, padding: 9, fontSize: 12 }}>✏️ 수정</PxButton>
                  <PxButton tone="danger" onClick={() => { if (window.confirm(`「${sel.title}」 퀘스트를 삭제할까요?`)) delQuest(sel.id); }} style={{ flex: 1, padding: 9, fontSize: 12 }}>🗑 삭제</PxButton>
                </div>
              )}
              {sel.owner && <div style={{ fontSize: 10, color: C.inkSoft, textAlign: "center", marginBottom: 8 }}>✍️ 작성자 {sel.owner}{sel.registrar && sel.registrar !== sel.owner ? ` · 📋 등록자 ${sel.registrar}` : ""}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <PxButton tone="ink" onClick={() => { setSel(null); setEditing(null); }} style={{ flex: 1, padding: 10, fontSize: 13 }}>닫기</PxButton>
                <PxButton tone="gold" disabled={!!done[sel.id] || !!lockReason(sel)}
                  onClick={() => { const q = sel; if (q.isBoss) { clear(q); setSel(null); } else { setSubmitFor(q); setAnswer(""); } }}
                  style={{ flex: 1, padding: 10, fontSize: 13 }}>{done[sel.id] ? "완료됨 ✓" : sel.isBoss ? "⚔ 격파!" : "📮 제출"}</PxButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

/* ======================= 이케아(집꾸미기 · 교통수단) ======================= */
const IKEA_ITEMS = {
  house: [
    { id: "hw1", name: "화이트 우드", price: 12, wall: "#f5efe3", roof: "#c98ba0", bg: "#f7f3ea" },
    { id: "hw2", name: "네이비 모던", price: 15, wall: "#dfe6f2", roof: "#2c3e66", bg: "#eaf0f8" },
    { id: "hw3", name: "포레스트 그린", price: 15, wall: "#e3efe0", roof: "#2e7d5b", bg: "#edf6ea" },
    { id: "hw4", name: "테라코타", price: 18, wall: "#f7e6da", roof: "#c0563a", bg: "#faeee6" },
    { id: "hw5", name: "블랙 미니멀", price: 22, wall: "#dcdcdc", roof: "#2b2b2b", bg: "#ededed" },
  ],
  furni: [
    { id: "f1", name: "러그", price: 5, emoji: "🟫", color: "#c98a6a" },
    { id: "f2", name: "화분", price: 4, emoji: "🪴", color: "#7bbf8f" },
    { id: "f3", name: "책장", price: 8, emoji: "📚", color: "#a9814a" },
    { id: "f4", name: "스탠드 조명", price: 6, emoji: "💡", color: "#e0c060" },
    { id: "f5", name: "게이밍 의자", price: 12, emoji: "🪑", color: "#7a5cd6" },
    { id: "f6", name: "냉장고", price: 14, emoji: "🧊", color: "#cfe0ea" },
    { id: "f7", name: "피아노", price: 20, emoji: "🎹", color: "#2b2b2b" },
  ],
  vehicle: [
    { id: "v1", name: "킥보드", price: 8, emoji: "🛴", speed: 1.25 },
    { id: "v2", name: "자전거", price: 14, emoji: "🚲", speed: 1.5 },
    { id: "v3", name: "스쿠터", price: 22, emoji: "🛵", speed: 1.8 },
    { id: "v4", name: "자동차", price: 40, emoji: "🚗", speed: 2.2 },
    { id: "v5", name: "스포츠카", price: 80, emoji: "🏎️", speed: 2.8 },
  ],
};
const IKEA_TABS = { house: "🏠 집 외관", furni: "🛋 가구", vehicle: "🚲 교통수단" };

function IkeaView({ gems, owned, houseSkin, vehicle, myFurni, onBuy, onBack, bubble }) {
  const [tab, setTab] = useState(null);
  const furniture = [
    { id: "house", x: 70, y: 120, w: 130, h: 110, color: "#e0a13d", emoji: "🏠", label: "집 외관 코너", onInteract: () => setTab("house") },
    { id: "furni", x: 260, y: 120, w: 130, h: 110, color: "#7bbf8f", emoji: "🛋", label: "가구 코너", onInteract: () => setTab("furni") },
    { id: "vehicle", x: 450, y: 120, w: 130, h: 110, color: "#5b8def", emoji: "🚲", label: "교통수단 코너", onInteract: () => setTab("vehicle") },
    { id: "staff", x: 270, y: 300, w: 50, h: 82, npc: true, facing: 1, label: "직원 제임스", outfit: { top: { color: "#0051ba" }, bottom: { color: "#ffd93b" }, shoes: { color: "#ffffff" } }, toast: "안녕하세요, 제임스입니다! 필요한 거 있으면 말씀하세요 🛒" },
  ];
  const equippedId = (kind) => (kind === "house" ? (houseSkin && houseSkin.id) : kind === "vehicle" ? (vehicle && vehicle.id) : null);
  return (
    <RoomView title="이케아" icon="🛒" sub="집 외관 · 가구 · 교통수단을 사고 바로 적용해요" bg="#eef2f6" roomW={640} roomH={400} furniture={furniture} onBack={onBack} paused={!!tab} headerBg="#0051ba" bubble={bubble}>
      {tab && (
        <RoomModal title={`🛒 이케아 · ${IKEA_TABS[tab]}`} onClose={() => setTab(null)} maxW={430}>
          <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
            {Object.keys(IKEA_TABS).map((k) => (
              <PxButton key={k} tone={tab === k ? "good" : "wood"} onClick={() => setTab(k)} style={{ flex: 1, fontSize: 11, padding: "6px 4px" }}>{IKEA_TABS[k]}</PxButton>
            ))}
          </div>
          <div style={{ fontSize: 12, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: C.inkSoft }}>
              {tab === "house" ? "적용하면 내 집 분위기가 바뀌어요" : tab === "furni" ? "구매하면 내 집에 배치돼요" : "타면 마을에서 더 빨리 이동해요"}
            </span>
            <GemBadge kind="gold" amount={gems} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, maxHeight: 260, overflow: "auto" }}>
            {IKEA_ITEMS[tab].map((it) => {
              const has = !!owned[it.id];
              const on = tab === "furni" ? myFurni.includes(it.id) : equippedId(tab) === it.id;
              return (
                <div key={it.id} style={{ background: on ? C.gem : C.white, border: `3px solid ${C.ink}`, padding: 8, textAlign: "center" }}>
                  {tab === "house" ? (
                    <div style={{ height: 40, border: `2px solid ${C.ink}`, background: it.wall, position: "relative" }}>
                      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 14, background: it.roof }} />
                    </div>
                  ) : (
                    <div style={{ fontSize: 30, lineHeight: 1.2 }}>{it.emoji}</div>
                  )}
                  <div style={{ fontSize: 11, marginTop: 4 }}>{it.name}</div>
                  {tab === "vehicle" && <div style={{ fontSize: 9, color: C.inkSoft }}>속도 x{it.speed}</div>}
                  <PxButton tone={on ? "ink" : has ? "good" : gems < it.price ? "wood" : "gold"} disabled={!has && gems < it.price}
                    onClick={() => onBuy(tab, it)} style={{ marginTop: 5, fontSize: 10, padding: "5px 7px", width: "100%" }}>
                    {on ? (tab === "furni" ? "배치됨 ✓" : "사용중 ✓") : has ? (tab === "furni" ? "배치하기" : "적용하기") : gems < it.price ? `🪙${it.price} 부족` : `🪙${it.price} 구매`}
                  </PxButton>
                </div>
              );
            })}
          </div>
        </RoomModal>
      )}
    </RoomView>
  );
}
/* ======================= 코어사전 ======================= */
function BookIcon({ size = 96 }) {
  return (
    <svg width={size} height={size * 0.9} viewBox="0 0 22 20" shapeRendering="crispEdges" style={{ imageRendering: "pixelated" }}>
      <rect x="1" y="3" width="20" height="15" fill="#8a5a3b" stroke="#2b1f14" strokeWidth="0.6" />
      <rect x="2" y="4" width="8.5" height="13" fill="#fdf6e3" stroke="#2b1f14" strokeWidth="0.4" />
      <rect x="11.5" y="4" width="8.5" height="13" fill="#f7efdc" stroke="#2b1f14" strokeWidth="0.4" />
      <rect x="10.5" y="3" width="1" height="15" fill="#5e3a22" />
      <rect x="3.5" y="6" width="6" height="0.8" fill="#c9bfa5" /><rect x="3.5" y="8" width="6" height="0.8" fill="#c9bfa5" /><rect x="3.5" y="10" width="4" height="0.8" fill="#c9bfa5" />
      <rect x="12.5" y="6" width="6" height="0.8" fill="#c9bfa5" /><rect x="12.5" y="8" width="6" height="0.8" fill="#c9bfa5" /><rect x="12.5" y="10" width="5" height="0.8" fill="#c9bfa5" />
      <rect x="9" y="0" width="4" height="4" fill="#d9a441" stroke="#2b1f14" strokeWidth="0.4" />
    </svg>
  );
}

/* ============ 📖 코어사전 (단어 + 갤러리) ============ */
const DICT_KEY = "echotown_dict_v1";
const GALLERY_KEY = "echotown_dictgallery_v1";
const SECRET_KEY = "echotown_dictsecret_v1";

/* 서버 저장이 실패해도 단어가 사라지지 않도록 로컬 사본을 함께 유지합니다. */
function mergeDict(dbList, localList) {
  const byWord = {};
  [...(dbList || []), ...(localList || [])].forEach((it) => {
    if (!it || !it.word) return;
    const prev = byWord[it.word];
    if (!prev) { byWord[it.word] = it; return; }
    const a = new Date(prev.updated_at || 0).getTime();
    const b = new Date(it.updated_at || 0).getTime();
    if (b >= a) byWord[it.word] = it;
  });
  return Object.values(byWord).sort((a, b) => (a.word > b.word ? 1 : -1));
}

/* 업로드한 사진을 리사이즈·압축해서 용량을 줄입니다 (로컬 저장 한도 대비) */
function compressImage(file, maxSide = 900, quality = 0.72, mime = "image/jpeg") {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read fail"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode fail"));
      img.onload = () => {
        let { width: w, height: h } = img;
        const scale = Math.min(1, maxSide / Math.max(w, h));
        w = Math.round(w * scale); h = Math.round(h * scale);
        const cv = document.createElement("canvas");
        cv.width = w; cv.height = h;
        cv.getContext("2d").drawImage(img, 0, 0, w, h);
        // PNG 은 투명 배경을 유지해요 (건물 이미지에 필요)
        resolve(mime === "image/png" ? cv.toDataURL("image/png") : cv.toDataURL(mime, quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function CoreDictView({ onBack, myName = "", dict = [], gallery = [], onSaveWord, onDelWord, onAddPhotos, onCaption, onDelPhoto, onSync, netCount = 1 }) {
  const [tab, setTab] = useState("word");
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState(null);
  const say = (m) => { setMsg(m); setTimeout(() => setMsg(null), 2400); };

  /* 등록/수정은 모달로 (목록 화면을 넓게 쓰기 위해) */
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [word, setWord] = useState("");
  const [mean, setMean] = useState("");
  const openNew = () => { setEditing(null); setWord(""); setMean(""); setFormOpen(true); };
  const openEdit = (it) => { setEditing(it.word); setWord(it.word); setMean(it.meaning); setFormOpen(true); };
  const submit = () => {
    const w = word.trim(), m = mean.trim();
    if (!w || !m) return;
    onSaveWord(w, m, editing);
    setFormOpen(false); setEditing(null); setWord(""); setMean("");
    say(editing ? "수정했어요 ✏️ (모두에게 공유돼요)" : "등록했어요 📖 (모두에게 공유돼요)");
  };

  /* 가나다 순 정렬 + 검색 */
  const shown = useMemo(() => {
    const t = q.trim();
    return dict
      .filter((it) => !t || it.word.includes(t) || (it.meaning || "").includes(t) || (it.updated_by || "").includes(t))
      .slice()
      .sort((a, b) => a.word.localeCompare(b.word, "ko"));
  }, [dict, q]);

  /* 갤러리 */
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(null);
  const [gq, setGq] = useState("");
  const fileRef = useRef(null);
  const onPick = async (e) => {
    const files = Array.from(e.target.files || []);
    if (fileRef.current) fileRef.current.value = "";
    if (!files.length) return;
    setBusy(true);
    const added = [];
    for (const f of files.slice(0, 6)) {
      if (!f.type.startsWith("image/")) continue;
      try { added.push(await compressImage(f, 560, 0.55)); } catch (err) {}
    }
    setBusy(false);
    if (added.length) { onAddPhotos(added); say(`사진 ${added.length}장을 올렸어요 🖼 (모두에게 공유돼요)`); }
    else say("이미지 파일을 읽지 못했어요");
  };
  const shownPhotos = gallery.filter((p2) => !gq.trim() || (p2.caption || "").includes(gq.trim()) || (p2.by || "").includes(gq.trim()));

  /* 비밀사전 (내 기기 전용) */
  const [secrets, setSecrets] = useState(() => loadJSON(SECRET_KEY, []));
  const [sTitle, setSTitle] = useState(""); const [sBody, setSBody] = useState(""); const [sTag, setSTag] = useState("");
  const [sEdit, setSEdit] = useState(null); const [sQ, setSQ] = useState("");
  const persistSecrets = (v) => { setSecrets(v); saveJSON(SECRET_KEY, v); };
  const saveSecret = () => {
    const t = sTitle.trim(), b = sBody.trim();
    if (!t || !b) return;
    const at = new Date().toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
    if (sEdit) persistSecrets(secrets.map((x) => (x.id === sEdit ? { ...x, title: t, body: b, tag: sTag.trim(), by: myName || "익명", at } : x)));
    else persistSecrets([{ id: Date.now() + Math.random(), title: t, body: b, tag: sTag.trim(), by: myName || "익명", at }, ...secrets]);
    setSTitle(""); setSBody(""); setSTag(""); setSEdit(null);
    say(sEdit ? "수정했어요 ✏️" : "비밀사전에 저장했어요 🔒");
  };
  const shownSecrets = secrets.filter((x) => !sQ.trim() || (x.title + x.body + (x.tag || "")).includes(sQ.trim()));

  const tabBtn = (k, label) => (
    <button key={k} type="button" onClick={() => setTab(k)}
      style={{ flex: 1, cursor: "pointer", fontFamily: "'DotGothic16', monospace", fontSize: 13, padding: "10px 6px", borderRadius: 10, border: `2px solid ${C.ink}`,
        background: tab === k ? "linear-gradient(180deg,#b07a4e,#8a5a3b)" : C.white, color: tab === k ? C.white : C.ink, fontWeight: "bold",
        boxShadow: tab === k ? "0 3px 0 rgba(0,0,0,0.3)" : "0 2px 0 rgba(0,0,0,0.15)" }}>{label}</button>
  );

  return (
    <Panel style={{ padding: 0, overflow: "hidden" }}>
      <TitleBar icon="📖" title="코어사전" sub="우리만의 단어와 사진을 함께 모아요 · 모두에게 공유됩니다" onBack={onBack} bg="#8a5a3b" fg={C.white}
        right={<PxButton tone="wood" onClick={() => { onSync && onSync(); say("동기화 요청을 보냈어요 🔄"); }} style={{ fontSize: 11, padding: "5px 9px" }}>🔄 동기화</PxButton>} />
      <div style={{ padding: 14, background: "#f7efdc" }}>
        <div style={{ display: "flex", gap: 7, marginBottom: 12 }}>
          {tabBtn("word", `📗 단어 ${dict.length}`)}
          {tabBtn("gallery", `🖼 갤러리 ${gallery.length}`)}
          {tabBtn("secret", `🔒 비밀사전 ${secrets.length}`)}
        </div>

        {msg && <div style={{ fontSize: 12.5, color: C.good, textAlign: "center", marginBottom: 9, fontWeight: "bold" }}>{msg}</div>}

        {tab === "word" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 단어 · 뜻 · 작성자 검색"
                style={{ flex: 1, minWidth: 0, padding: 10, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 14 }} />
              <PxButton tone="gold" onClick={openNew} style={{ fontSize: 13, padding: "10px 14px", whiteSpace: "nowrap" }}>＋ 단어 등록</PxButton>
            </div>
            <div style={{ fontSize: 11, color: C.inkSoft, marginBottom: 8 }}>
              가나다 순 · {shown.length}개{q.trim() ? ` (전체 ${dict.length}개 중)` : ""} · 👥 접속 {netCount}명과 공유 중
            </div>
            <div style={{ maxHeight: 400, overflow: "auto", display: "flex", flexDirection: "column", gap: 7 }}>
              {shown.length === 0 ? (
                <div style={{ fontSize: 12.5, color: C.inkSoft, textAlign: "center", padding: 30, lineHeight: 1.9 }}>
                  {q.trim() ? "검색 결과가 없어요 🔍" : <>아직 등록된 단어가 없어요 📖<br />＋ 단어 등록으로 첫 단어를 남겨보세요!</>}
                </div>
              ) : shown.map((it) => (
                <div key={it.word} style={{ background: C.white, border: `2px solid ${C.ink}`, borderRadius: 8, padding: 11 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <b style={{ flex: 1, fontSize: 15, wordBreak: "break-word" }}>📗 {it.word}</b>
                    <PxButton tone="wood" onClick={() => openEdit(it)} style={{ fontSize: 10, padding: "4px 8px" }}>✏️</PxButton>
                    <PxButton tone="danger" onClick={() => { if (window.confirm(`「${it.word}」를 삭제할까요? 모두에게서 사라져요.`)) onDelWord(it.word); }} style={{ fontSize: 10, padding: "4px 8px" }}>🗑</PxButton>
                  </div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.75, marginTop: 6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{it.meaning}</div>
                  {it.updated_by && <div style={{ fontSize: 10.5, color: C.inkSoft, marginTop: 6 }}>✍️ {it.updated_by}</div>}
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "gallery" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
              <input value={gq} onChange={(e) => setGq(e.target.value)} placeholder="🔍 설명 · 올린 사람 검색"
                style={{ flex: 1, minWidth: 0, padding: 10, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 14 }} />
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={onPick} style={{ display: "none" }} />
              <PxButton tone="gold" disabled={busy} onClick={() => fileRef.current && fileRef.current.click()} style={{ fontSize: 13, padding: "10px 14px", whiteSpace: "nowrap" }}>
                {busy ? "올리는 중…" : "📷 사진 올리기"}
              </PxButton>
            </div>
            <div style={{ fontSize: 11, color: C.inkSoft, marginBottom: 8 }}>누구나 올리고 누구나 볼 수 있어요 · 한 번에 최대 6장 · 👥 접속 {netCount}명과 공유 중</div>
            {shownPhotos.length === 0 ? (
              <div style={{ fontSize: 12.5, color: C.inkSoft, textAlign: "center", padding: 34, lineHeight: 1.9 }}>
                {gq.trim() ? "검색 결과가 없어요 🔍" : <>아직 올라온 사진이 없어요 🖼<br />첫 사진을 올려보세요!</>}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, maxHeight: 420, overflow: "auto" }}>
                {shownPhotos.map((ph) => (
                  <div key={ph.id} style={{ background: C.white, border: `3px solid ${C.ink}`, borderRadius: 10, overflow: "hidden" }}>
                    <button type="button" onClick={() => setZoom(ph)} title="크게 보기" style={{ display: "block", width: "100%", padding: 0, border: "none", background: "#e9e3d6", cursor: "zoom-in" }}>
                      <img src={ph.src} alt={ph.caption || "사진"} style={{ display: "block", width: "100%", aspectRatio: "1/1", objectFit: "cover" }} />
                    </button>
                    <div style={{ padding: 7 }}>
                      <input defaultValue={ph.caption} onBlur={(e) => onCaption(ph.id, e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                        placeholder="한 줄 설명"
                        style={{ width: "100%", boxSizing: "border-box", padding: "6px 7px", border: `2px solid ${C.ink}`, borderRadius: 5, fontFamily: "'DotGothic16', monospace", fontSize: 12, background: "#fffdf6" }} />
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5 }}>
                        <span style={{ flex: 1, fontSize: 9.5, color: C.inkSoft, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>🧑 {ph.by} · {ph.at}</span>
                        <button type="button" onClick={() => { if (window.confirm("이 사진을 지울까요? 모두에게서 사라져요.")) onDelPhoto(ph.id); }} title="삭제" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: C.inkSoft }}>🗑</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "secret" && (
          <>
            <div style={{ background: "linear-gradient(180deg,#2b2455,#170f38)", border: `3px solid ${C.ink}`, borderRadius: 10, padding: 13, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                <span style={{ fontSize: 20 }}>🔒</span>
                <b style={{ color: "#7fe3ff", fontSize: 14 }}>{sEdit ? "요약 수정 중" : "새 핵심 요약"}</b>
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.62)", lineHeight: 1.6, marginBottom: 8 }}>나눈 얘기를 핵심만 남겨 보관하는 방이에요. (내 기기에만 저장 · AI 자동 요약 자리)</div>
              <input value={sTitle} onChange={(e) => setSTitle(e.target.value)} placeholder="제목 (예: 7월 상품기획 회의)"
                style={{ width: "100%", boxSizing: "border-box", padding: 9, border: "2px solid #7fe3ff", borderRadius: 7, background: "rgba(255,255,255,0.94)", fontFamily: "'DotGothic16', monospace", fontSize: 13.5, marginBottom: 6 }} />
              <textarea value={sBody} onChange={(e) => setSBody(e.target.value)} rows={4} placeholder={"핵심 요약\n· 결론\n· 다음 할 일"}
                style={{ width: "100%", boxSizing: "border-box", padding: 9, border: "2px solid rgba(127,227,255,0.4)", borderRadius: 7, background: "rgba(255,255,255,0.9)", fontFamily: "'DotGothic16', monospace", fontSize: 12.5, resize: "vertical", marginBottom: 6 }} />
              <input value={sTag} onChange={(e) => setSTag(e.target.value)} placeholder="태그 (선택)"
                style={{ width: "100%", boxSizing: "border-box", padding: 8, border: "2px solid rgba(127,227,255,0.4)", borderRadius: 7, background: "rgba(255,255,255,0.9)", fontFamily: "'DotGothic16', monospace", fontSize: 12.5 }} />
              <div style={{ display: "flex", gap: 7, marginTop: 8 }}>
                {sEdit && <PxButton tone="ink" onClick={() => { setSEdit(null); setSTitle(""); setSBody(""); setSTag(""); }} style={{ flex: 1, padding: 10, fontSize: 13 }}>취소</PxButton>}
                <PxButton tone="blue" disabled={!sTitle.trim() || !sBody.trim()} onClick={saveSecret} style={{ flex: 2, padding: 10, fontSize: 13 }}>{sEdit ? "수정 저장" : "🔒 저장"}</PxButton>
              </div>
            </div>
            <input value={sQ} onChange={(e) => setSQ(e.target.value)} placeholder="🔍 요약 검색"
              style={{ width: "100%", boxSizing: "border-box", padding: 9, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 13, marginBottom: 8 }} />
            <div style={{ maxHeight: 320, overflow: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {shownSecrets.length === 0 ? (
                <div style={{ fontSize: 12, color: C.inkSoft, textAlign: "center", padding: 26, lineHeight: 1.8 }}>아직 저장된 요약이 없어요 🔒</div>
              ) : shownSecrets.map((x) => (
                <div key={x.id} style={{ background: C.white, border: `2px solid ${C.ink}`, borderLeft: "6px solid #4b3c85", borderRadius: 8, padding: 11 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <b style={{ flex: 1, fontSize: 14, wordBreak: "break-word" }}>🔒 {x.title}</b>
                    <PxButton tone="wood" onClick={() => { setSEdit(x.id); setSTitle(x.title); setSBody(x.body); setSTag(x.tag || ""); }} style={{ fontSize: 10, padding: "4px 8px" }}>✏️</PxButton>
                    <PxButton tone="danger" onClick={() => { if (window.confirm("이 요약을 지울까요?")) persistSecrets(secrets.filter((y) => y.id !== x.id)); }} style={{ fontSize: 10, padding: "4px 8px" }}>🗑</PxButton>
                  </div>
                  {x.tag && <div style={{ marginTop: 4 }}><span style={{ fontSize: 10, background: "#e7e0f5", border: `1px solid ${C.ink}`, borderRadius: 10, padding: "1px 8px" }}>#{x.tag}</span></div>}
                  <div style={{ fontSize: 12.5, lineHeight: 1.8, marginTop: 6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{x.body}</div>
                  <div style={{ fontSize: 10, color: C.inkSoft, marginTop: 6 }}>✍️ {x.by} · {x.at}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 단어 등록 모달 */}
      {formOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 120, padding: 14 }} onClick={() => setFormOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 400, maxHeight: "calc(100vh - 28px)", overflowY: "auto" }}>
            <Panel style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 22 }}>📖</span>
                <b style={{ flex: 1, fontSize: 15 }}>{editing ? `「${editing}」 수정` : "새 단어 등록"}</b>
                <PxButton tone="ink" onClick={() => setFormOpen(false)} style={{ fontSize: 11, padding: "5px 9px" }}>✕</PxButton>
              </div>
              <input value={word} onChange={(e) => setWord(e.target.value)} autoFocus placeholder="단어 (예: 쩝쩝박사)"
                style={{ width: "100%", boxSizing: "border-box", padding: 10, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 15, marginBottom: 8 }} />
              <textarea value={mean} onChange={(e) => setMean(e.target.value)} rows={5} placeholder="뜻 · 설명을 자유롭게 적어주세요"
                style={{ width: "100%", boxSizing: "border-box", padding: 10, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 13.5, resize: "vertical" }} />
              <PxButton tone="gold" disabled={!word.trim() || !mean.trim()} onClick={submit} style={{ width: "100%", marginTop: 10, padding: 12, fontSize: 14 }}>
                {editing ? "수정 저장" : "📖 사전에 등록"}
              </PxButton>
              <div style={{ fontSize: 10.5, color: C.inkSoft, textAlign: "center", marginTop: 7 }}>등록하면 접속 중인 모두에게 바로 공유돼요</div>
            </Panel>
          </div>
        </div>
      )}

      {zoom && (
        <div onClick={() => setZoom(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 130, padding: 18, cursor: "zoom-out" }}>
          <img src={zoom.src} alt={zoom.caption || "사진"} style={{ maxWidth: "100%", maxHeight: "78%", objectFit: "contain", border: `3px solid ${C.white}`, borderRadius: 6 }} />
          <div style={{ color: C.white, fontSize: 14, marginTop: 12, textAlign: "center", fontFamily: "'DotGothic16', monospace" }}>{zoom.caption || "(설명 없음)"}</div>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 4 }}>🧑 {zoom.by} · {zoom.at} · 화면을 누르면 닫혀요</div>
        </div>
      )}
    </Panel>
  );
}

const SMOKE_PEOPLE = ["정인", "호중", "희정", "유리", "의준"];
const SMOKE_LINES = ["오늘 왜이렇게 춥냐 ㅋㅋ", "커피 한잔 하실분~", "아 마감 언제끝나ㅠ", "날씨 좋다 그치", "점심 뭐먹지", "주말에 뭐함?", "일 너무 많아 진짜", "ㅋㅋㅋㅋㅋㅋ", "맞아맞아", "와 대박", "나 이제 끊을거야 (3일째)", "치앙마이 가고싶다", "한 대 피우고 가자", "오늘도 화이팅~"];

function SmokeChat({ onClose, myName = "", msgs = [], onSend }) {
  const [text, setText] = useState("");
  const smokeRef = useAutoScroll(msgs.length);
  const net = useContext(NetContext);
  /* 지금 흡연의 방에 있는 사람들 */
  const here = net && net.others ? Object.values(net.others).filter((o) => o.v === "smoke") : [];
  const send = () => { const t = text.trim(); if (!t) return; onSend && onSend(t); setText(""); };
  const me = myName || "나";
  return (
    <RoomModal title="💬 재떨이 수다방" onClose={onClose} maxW={420}>
      {/* 접속자 목록 */}
      <div style={{ background: "#2a2420", border: `3px solid ${C.ink}`, borderRadius: 8, padding: "8px 10px", marginBottom: 8 }}>
        <div style={{ fontSize: 10.5, color: "#c9b8a4", marginBottom: 5 }}>🚬 지금 여기 있는 사람 {here.length + 1}명</div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11.5, background: C.gem, color: C.ink, border: `2px solid ${C.ink}`, borderRadius: 12, padding: "3px 9px", fontWeight: "bold" }}>🧑 {me} (나)</span>
          {here.map((o) => (
            <span key={o.id} style={{ fontSize: 11.5, background: "#4a3f36", color: C.white, border: `2px solid ${C.ink}`, borderRadius: 12, padding: "3px 9px" }}>🟢 {o.name}</span>
          ))}
          {here.length === 0 && <span style={{ fontSize: 11, color: "#8a7a6a", alignSelf: "center" }}>아직 혼자예요… 담배 한 대 태우며 기다려볼까요 🚬</span>}
        </div>
      </div>

      <div ref={smokeRef} style={{ height: 260, overflow: "auto", background: "#efe6d2", border: `3px solid ${C.ink}`, padding: 8, display: "flex", flexDirection: "column", gap: 5 }}>
        {msgs.length === 0 && (
          <div style={{ fontSize: 12, color: C.inkSoft, textAlign: "center", padding: 26, lineHeight: 1.8 }}>
            아직 대화가 없어요 💬<br />먼저 말을 걸어보세요!
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} style={{ alignSelf: m.me ? "flex-end" : "flex-start", maxWidth: "80%" }}>
            {!m.me && <div style={{ fontSize: 10, color: C.inkSoft, marginBottom: 1 }}>{m.who}</div>}
            <div style={{ background: m.me ? C.gem : C.white, border: `2px solid ${C.ink}`, padding: "5px 9px", fontSize: 13, wordBreak: "break-word" }}>{m.text}</div>
            <div style={{ fontSize: 9, color: C.inkSoft, textAlign: m.me ? "right" : "left", marginTop: 1 }}>{m.at}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="메시지 입력 후 Enter"
          style={{ flex: 1, minWidth: 0, padding: 8, border: `3px solid ${C.ink}`, fontFamily: "'DotGothic16', monospace", fontSize: 13, background: C.white }} />
        <PxButton tone="good" disabled={!text.trim()} onClick={send} style={{ fontSize: 12, padding: "8px 12px" }}>전송</PxButton>
      </div>
      <div style={{ fontSize: 10, color: C.inkSoft, textAlign: "center", marginTop: 7 }}>흡연의 방에 있는 사람들과 실시간으로 대화해요</div>
    </RoomModal>
  );
}

function CigaretteModal({ onClose }) {
  const [len, setLen] = useState(100);
  const iv = useRef(null);
  const start = () => { if (iv.current) return; iv.current = setInterval(() => setLen((l) => { const n = l - 2; if (n <= 0) { clearInterval(iv.current); iv.current = null; return 0; } return n; }), 90); };
  const stop = () => { if (iv.current) { clearInterval(iv.current); iv.current = null; } };
  useEffect(() => () => stop(), []);
  return (
    <RoomModal title="🚬 담배 (연초)" onClose={onClose} maxW={340}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 14 }}>버튼을 <b>꾹 누르면</b> 담배가 타들어가요</div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 40, marginBottom: 16 }}>
          {len > 0 && <div style={{ width: `${len * 1.7}px`, height: 16, background: "#f2ede4", border: `2px solid ${C.ink}`, borderRight: "none", transition: "width .09s linear" }} />}
          {len > 0 && <div style={{ width: 10, height: 16, background: "#ff6a2b", boxShadow: "0 0 8px #ff8c42", border: `2px solid ${C.ink}` }} />}
          <div style={{ width: 26, height: 16, background: "#d9a441", border: `2px solid ${C.ink}` }} />
        </div>
        {len <= 0 ? (
          <div>
            <div style={{ fontSize: 14, marginBottom: 10 }}>다 폈다… 꽁초만 남음 💨</div>
            <PxButton tone="good" onClick={() => setLen(100)} style={{ padding: "8px 16px", fontSize: 13 }}>새 담배</PxButton>
          </div>
        ) : (
          <button onMouseDown={start} onMouseUp={stop} onMouseLeave={stop} onTouchStart={start} onTouchEnd={stop} className="px-btn" style={{ padding: "12px 24px", fontSize: 15, background: C.wood, color: C.white, border: `3px solid ${C.ink}`, cursor: "pointer", fontFamily: "'DotGothic16', monospace" }}>🤏 꾹 눌러서 피우기</button>
        )}
      </div>
    </RoomModal>
  );
}

function VapeModal({ onClose }) {
  const [puffs, setPuffs] = useState([]);
  const iv = useRef(null);
  const idRef = useRef(0);
  const start = () => { if (iv.current) return; iv.current = setInterval(() => { idRef.current += 1; const id = idRef.current; setPuffs((p) => [...p, { id, x: 38 + Math.random() * 24 }]); setTimeout(() => setPuffs((p) => p.filter((q) => q.id !== id)), 1800); }, 220); };
  const stop = () => { if (iv.current) { clearInterval(iv.current); iv.current = null; } };
  useEffect(() => () => stop(), []);
  return (
    <RoomModal title="💨 전자담배" onClose={onClose} maxW={340}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 10 }}>버튼을 <b>꾹 누르면</b> 연기가 뭉게뭉게 🌫️</div>
        <div style={{ position: "relative", height: 160, marginBottom: 14, overflow: "hidden" }}>
          {puffs.map((p) => (
            <div key={p.id} className="smoke-puff" style={{ position: "absolute", bottom: 34, left: `${p.x}%`, fontSize: 30 }}>💨</div>
          ))}
          <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 22, height: 62, background: "#333", border: `2px solid ${C.ink}`, borderRadius: 4 }} />
        </div>
        <button onMouseDown={start} onMouseUp={stop} onMouseLeave={stop} onTouchStart={start} onTouchEnd={stop} className="px-btn" style={{ padding: "12px 24px", fontSize: 15, background: C.wood, color: C.white, border: `3px solid ${C.ink}`, cursor: "pointer", fontFamily: "'DotGothic16', monospace" }}>🤏 꾹 눌러서 흡입</button>
      </div>
    </RoomModal>
  );
}

function SmokeView({ onBack, bubble, myName = "", chat = [], onChat }) {
  const [modal, setModal] = useState(null);
  const [winOpen, setWinOpen] = useState(false);
  const furniture = [
    { id: "ashtray", x: 270, y: 180, w: 100, h: 80, color: "#7a8b99", emoji: "🚬", label: "재떨이 (수다방)", onInteract: () => setModal("chat") },
    { id: "cig", x: 90, y: 210, w: 80, h: 70, color: "#d9a441", emoji: "🚬", label: "담배(연초)", onInteract: () => setModal("cig") },
    { id: "vape", x: 470, y: 210, w: 80, h: 70, color: "#333", emoji: "💨", label: "전자담배", onInteract: () => setModal("vape") },
    { id: "window", x: 260, y: 40, w: 120, h: 60, color: winOpen ? "#bfe6f2" : "#6fc3e0", emoji: "🪟", label: winOpen ? "창문 (열림)" : "창문 (닫힘)", onInteract: () => setWinOpen((v) => !v) },
  ];
  return (
    <RoomView title="흡연의 방" icon="🚬" sub="재떨이 수다방 · 담배/전자담배 · 창문 환기" bg={winOpen ? "#eef6f8" : "#dfe3e6"} roomW={640} roomH={400} furniture={furniture} onBack={onBack} paused={!!modal} headerBg="#7a8b99" bubble={bubble}>
      {modal === "chat" && <SmokeChat onClose={() => setModal(null)} myName={myName} msgs={chat} onSend={onChat} />}
      {modal === "cig" && <CigaretteModal onClose={() => setModal(null)} />}
      {modal === "vape" && <VapeModal onClose={() => setModal(null)} />}
    </RoomView>
  );
}

/* ======================= 게시판(캘린더 + 공지) ======================= */
const UPDATE_NOTES = [
  { id: "u20260724ii", type: "업데이트", date: "2026-07-24", title: "🏆 제단 공유 · 📗 스쿨 진행도 저장",
    body: "· 🏆 제단에 봉헌한 파편이 접속자 모두에게 공유돼요 — 등록자가 직접 검토하고 체크할 수 있어요\n· 새로 접속하면 지금까지 쌓인 파편을 자동으로 받아옵니다\n· 「🙋 내 관련」 필터로 내가 올렸거나 내가 검토할 파편만 골라볼 수 있어요\n· 🛡 검토 · ⭐ 보상 체크도 실시간으로 모두에게 반영돼요\n· 📗 네이버스쿨 · 🎬 영상스쿨에서 깬 퀘스트가 저장돼요 (방을 나가도 유지)" },
  { id: "u20260724hh", type: "업데이트", date: "2026-07-24", title: "🏃 사람마다 걷는 속도가 다르던 문제 수정",
    body: "· 이동이 「화면이 그려지는 횟수」에 묶여 있어서, 성능이 낮은 기기에서는 절반 속도로 걸렸어요\n· 이제 「초 단위」로 이동해서 어떤 기기에서든 같은 속도가 나옵니다\n· 마을 · 실내 · 스쿨 · 보스맵 이동 전부 적용했어요\n· 🌧 비 효과가 저사양 기기·모바일에서는 자동으로 가벼워져요" },
  { id: "u20260724gg", type: "업데이트", date: "2026-07-24", title: "🏠 다른 집 사람이 보이던 버그 · 🐾 반려동물 돌보기",
    body: "· 서로 다른 집에 있어도 같은 방에 있는 것처럼 보이던 문제를 고쳤어요 — 이제 같은 집·같은 회의실에 있는 사람만 보여요\n· 🛵 탈것에서 내려도 속도가 그대로이던 버그 수정 + 상단에 「내리기」 버튼 추가\n· 📍 지역 설정이 새로고침해도 유지돼요 (계정 저장에도 포함)\n· 퀘스트 참가자 목록이 수락 전에도 보이고, 수락 후에는 「🤝 지금 참가 중」 명단도 함께 표시돼요\n· 퀘스트 확인창 등 남은 팝업에도 스크롤을 넣었어요\n· 🤲 반려동물 쓰다듬기(경험치+3) · 🍖 밥주기(HP+3, 골드+1)\n· 🍤 수족관에서 물고기 밥주기 — 먹이가 떨어지는 모습이 보여요" },
  { id: "u20260724ff", type: "업데이트", date: "2026-07-24", title: "🌐 공유 안 되던 것들 정리",
    body: "· 📋 게시판 글은 이제 쓴 사람만 ✏️ 수정 · 🗑 삭제 할 수 있어요 (내 글에는 「✍️ 내가 쓴 글」 표시)\n· 🍴 쩝쩝박사 메뉴 추천이 저장되고 모두에게 공유돼요 (예전엔 새로고침하면 사라졌어요)\n· 📱 릴스방에서 추가한 카테고리도 저장되고 공유됩니다\n· 새로 접속하면 지금까지 쌓인 추천·카테고리를 자동으로 받아와요" },
  { id: "u20260724ee", type: "업데이트", date: "2026-07-24", title: "🖱 가구 클릭 · 🐟 수족관 일원화",
    body: "· 가구를 마우스로 눌러도 작동해요 — 예전엔 다가가서 스페이스바를 눌러야만 했어요\n· 수족관 · 메모장 · 냉장고 · 마당 · 회의실 등 모든 가구에 적용됩니다\n· 🛒 이케아에서 팔던 수족관을 없앴어요\n· 이미 이케아에서 산 수족관도 자동으로 정리됩니다\n· 이제 수족관은 🐾 형욱이네에서만 살 수 있어요" },
  { id: "u20260724dd", type: "업데이트", date: "2026-07-24", title: "🐾 형욱이네 · 📜 팝업 스크롤 · 📋 게시판 정리",
    body: "· 🐾 펫샵 이름을 「형욱이네」로 바꿨어요\n· 📮 피드백이 게시판과 메세지함에서 완전히 빠졌어요 (이전에 올라간 것도 안 보여요)\n· 팝업창 내용이 길어지면 스크롤할 수 있어요 — 퀘스트 추가 · 도감 · 프로필 등 모든 창에 적용했어요\n· 화면이 작아도 아래쪽 버튼이 잘리지 않아요" },
  { id: "u20260724cc", type: "업데이트", date: "2026-07-24", title: "📋 퀘스트 등록자 · 📮 답변 제출",
    body: "· 퀘스트를 만들 때 📋 등록자를 「나」 또는 「타인」 중에 고를 수 있어요 (타인은 주민 목록에서 선택)\n· 작성자와 등록자만 그 퀘스트를 수정·삭제할 수 있어요\n· ✅ 완료 → 📮 제출 로 바뀌었어요\n· 제출을 누르면 답변 작성창이 뜨고, 어떻게 해결했는지 적어서 등록합니다\n· 등록하면 🏆 완료의 제단 「수락 파편」에 자동으로 올라가요 (제목·완료조건·답변·보상이 함께 기록)\n· 「완료의 제단에 등록되었습니다!」 안내와 함께 제단으로 이동하는 버튼이 나와요\n· 제단의 검수가 GM 검수 → 📋 등록자 검토 로 바뀌었어요" },
  { id: "u20260724bb", type: "업데이트", date: "2026-07-24", title: "🐟 수족관 시각화 · 🏗 시설 선행 구입",
    body: "· 🏗 시설 탭이 생겼어요 — 🐟 수족관(🪙120) · 🌳 마당(🪙100)\n· 🌳 마당을 사야 반려동물을 입양할 수 있어요\n· 🐟 수족관을 사야 물고기를 데려올 수 있어요\n· 물고기가 「어항」이 아니라 내가 산 수족관에 들어가요\n· 집에서 수족관을 누르면 진짜 수조처럼 보여요 — 물빛, 공기방울, 흔들리는 수초, 모래 바닥\n· 물고기마다 깊이·크기·속도가 달라 자유롭게 헤엄치고, 벽에 닿으면 방향을 바꿔요\n· 🌳 마당에는 데리고 나가지 않은 반려동물이 놀고 있어요" },
  { id: "u20260724aa", type: "업데이트", date: "2026-07-24", title: "🧠 사고 스킬 · 🔒 비밀번호 잠금 · 🐾 펫샵 이전",
    body: "· 🧠 하드모드(사고의 광장) 퀘스트를 깰 때마다 사고 스킬을 하나씩 배워요 (총 16종)\n· 관찰력 · 구조화 · 질문력 · 메타인지 · 역발상 · 본질파악 등\n· 배운 스킬은 🧑 내 프로필에서 확인할 수 있어요\n· ✅ 이미 완료된 퀘스트는 수락할 수 없게 막았어요\n· 🔒 남의 집 비밀번호를 5번 틀리면 경고와 함께 1분간 입력이 금지돼요 (남은 시간 표시)\n· 🐾 형욱이네를 쩝쩝박사 아래로 옮겼어요\n· 📮 피드백이 공지사항에 올라가지 않게 했어요 (메뉴 안에서만 보여요)" },
  { id: "u20260724z", type: "업데이트", date: "2026-07-24", title: "🐾 펫샵 오픈 · 🏃 찾아가기 · 📅 DAY 삭제",
    body: "· 🐾 형욱이네(펫샵)가 생겼어요 — 강아지·고양이·토끼·햄스터·앵무새·거북이·여우·펭귄 8종\n· 입양하면 마을에서 나를 졸졸 따라다니고, 다른 사람에게도 보여요\n· 여러 마리를 키워도 데리고 나가는 건 한 마리씩이에요\n· 🐠 반려물고기 8종은 우리 집 어항에서 헤엄쳐요 (집에서 어항을 눌러보세요)\n· 🏃 접속자 목록의 달리기 버튼을 누르면 그 사람 옆으로 바로 이동해요\n· 마을에서 다른 사람 캐릭터를 누르면 따라가기 · 찾아가기 · 선물하기 메뉴가 떠요\n· 📅 DAY 표시와 「다음 날」 기능을 없앴어요" },
  { id: "u20260724y", type: "업데이트", date: "2026-07-24", title: "🏃 친구 따라가기 · 🛵 탈것 조준 개선 · 💬 채팅 중복 수정",
    body: "· 우측 상단 접속자 목록에서 「🏃 따라가기」 를 누르면 그 친구를 자동으로 쫓아가요 (70px 이내면 멈춤)\n· 방향키를 누르면 내 조작이 우선이고, 상단 배너의 「멈춤」 으로 해제합니다\n· 🛵 탈것을 타면 건물 입장 판정 범위가 1.55배 넓어져 조준이 쉬워요\n· 기본 걷기 속도를 4.2 → 3.5 로 살짝 줄였어요 (탈것 속도는 그대로 배율 적용)\n· 💬 내가 보낸 채팅이 한 번 더 뜨던 중복 문제를 고쳤어요" },
  { id: "u20260724x", type: "업데이트", date: "2026-07-24", title: "🚬 재떨이 수다방 실시간 채팅",
    body: "· 자동으로 흘러가던 NPC 대화를 없애고, 실제 접속자들끼리 대화하도록 바꿨어요\n· 채팅창 위에 지금 흡연의 방에 있는 사람 목록이 나와요 (나는 노란색, 다른 사람은 🟢)\n· 보낸 시각도 함께 표시됩니다\n· 혼자면 「아직 혼자예요… 담배 한 대 태우며 기다려볼까요 🚬」 라고 알려줘요" },
  { id: "u20260724w", type: "업데이트", date: "2026-07-24", title: "🏠 슬이네·상하네 입주 안 되던 문제 수정",
    body: "· 현관 비밀번호가 브라우저에 하나만 저장돼서, 이름을 바꿔 접속하면 「이미 비번 있음」으로 처리돼 환영 화면이 안 뜨던 문제를 고쳤어요\n· 이제 비밀번호를 이름별로 따로 저장합니다\n· 집 주인 판정을 넓혔어요 — 「슬이네」는 슬이·슬, 「정인이네」는 정인·정인이 모두 주인으로 인정해요\n· 남의 집 방문 시 표시되는 주인 이름도 정확해졌어요" },
  { id: "u20260724v", type: "업데이트", date: "2026-07-24", title: "📮 피드백 익명 · 삭제 · 확인 체크",
    body: "· 🕶 익명 체크박스가 생겼어요 — 체크하면 작성자가 「익명」으로 표시됩니다\n· 익명으로 올려도 본인 글은 지울 수 있어요 (이름 대신 브라우저 고유 ID로 판별)\n· 🗑 삭제는 작성자 본인만 가능해요\n· ✅ 확인 체크박스는 누구나 누를 수 있어요 — 누가 확인했는지도 표시됩니다\n· 전체 / 미확인 / 확인됨 으로 걸러볼 수 있어요" },
  { id: "u20260724u", type: "업데이트", date: "2026-07-24", title: "🕵️ 라이어게임 실제 멀티플레이 · 💌 마음 우체통 공유",
    body: "· 🕵️ 라이어 게임이 AI 상대가 아니라 실제 접속자들끼리 하는 게임이 됐어요\n· 방 만들기 → 다른 사람이 참가 → 3명 이상이면 호스트가 시작\n· 라이어 한 명만 제시어를 모른 채, 돌아가며 힌트를 말합니다\n· 모두 힌트를 말하면 투표 → 최다 득표자 공개\n· 라이어를 잡으면 시민 🪙10, 라이어가 살아남으면 라이어 🪙15\n· 💌 마음의 방에 올린 고민이 이제 모두에게 익명으로 보여요 (예전엔 본인만 보였어요)\n· 마음의 방 글도 저장되고 새로 접속한 사람에게 동기화됩니다" },
  { id: "u20260724t", type: "업데이트", date: "2026-07-24", title: "🏠 슬이네 · 상하네 입주",
    body: "· 주택가에 🏠 슬이네와 🏠 상하네가 새로 생겼어요 (총 10채)\n· 기존 집들과 규칙은 똑같아요 — 이름을 「슬이」 또는 「상하」로 정하면 그 집이 내 집이 됩니다\n· 현관 비밀번호 설정, 가구 배치, 지붕·벽 색 변경, 방명록 모두 동일하게 쓸 수 있어요\n· 집 주인 판정 방식을 이름 규칙에서 명시적인 주인 정보로 바꿔 더 정확해졌어요" },
  { id: "u20260724s", type: "업데이트", date: "2026-07-24", title: "💾 쿠폰 골드 저장 안 되던 문제 수정",
    body: "· 웰컴 쿠폰을 받자마자 즉시 저장돼요 (예전엔 2초 뒤 저장이라 그 사이 새로고침하면 사라졌어요)\n· 새로고침 · 탭 닫기 · 탭 전환 직전에도 밀린 저장을 바로 반영합니다\n· 자동 저장 간격을 2초 → 0.8초로 줄였어요\n· 서버 조회를 두 번 하던 것을 한 번으로 정리했어요" },
  { id: "u20260724r", type: "업데이트", date: "2026-07-24", title: "🛠 스쿨 이동 버그 수정",
    body: "· 📗 네이버스쿨 · 🎬 영상스쿨에서 ← → 를 누르면 이동이 통째로 멈추던 문제를 고쳤어요\n· 원인은 없는 변수를 참조해 오류가 나면서 이동 루프가 죽어버린 것이었어요\n· 좌우 이동과 대각선 이동이 정상 동작합니다\n· 퀘스트 근처에서 버벅이던 것도 개선했어요 (불필요한 화면 갱신 제거)\n· 마을 · 실내 · 보스맵 이동에도 안전장치를 넣어, 오류가 나도 이동이 멈추지 않아요" },
  { id: "u20260724q", type: "업데이트", date: "2026-07-24", title: "💾 새로고침해도 골드·젬이 유지돼요",
    body: "· 지금까지는 서버(Supabase)에만 저장돼서, 서버 연결이 안 되면 새로고침 때 전부 초기화됐어요\n· 이제 이 브라우저에도 함께 저장돼서 서버가 안 돼도 그대로 이어집니다\n· 접속하면 브라우저 저장분을 즉시 복원하고, 서버 데이터가 더 최신이면 그걸로 덮어써요\n· 웰컴 쿠폰(💎100 젬 + 🪙200 골드)이 중복 지급되거나 사라지지 않아요\n· 화면 아래에 💾 저장 표시가 생겼어요 — 초록이면 서버까지, 주황이면 이 기기에만 저장된 상태입니다" },
  { id: "u20260724p", type: "업데이트", date: "2026-07-24", title: "🔌 접속 끊김 자동 복구 · 📮 피드백 공유",
    body: "· 실시간 연결이 끊기면 자동으로 다시 연결돼요 (예전엔 끊긴 채 방치돼 서로 안 보였어요)\n· 다른 탭에 갔다 오거나 인터넷이 복구되면 즉시 재연결합니다\n· 우측 상단 접속자 버튼을 누르면 연결 상태와 「🔄 다시 연결」 버튼이 보여요\n· 📮 피드백이 모두에게 공유돼요 — 올린 글과 작성자, 시각이 목록으로 보입니다\n· 피드백은 📋 게시판에도 「건의」로 함께 남습니다" },
  { id: "u20260724o", type: "업데이트", date: "2026-07-24", title: "🌦 실제 날씨 자동 갱신",
    body: "· 실제 날씨 예보를 10분마다 자동으로 다시 받아와요\n· 다른 탭에 갔다가 돌아오면 즉시 최신 날씨로 갱신됩니다\n· 실제로 비가 그치면 게임 속 비도 멈추고, 비가 오기 시작하면 게임에도 내려요\n· 기온 표시도 함께 바뀝니다\n· 상단 날씨 표시에 마우스를 올리면 마지막 갱신 시각이 보여요" },
  { id: "u20260724n", type: "업데이트", date: "2026-07-24", title: "📖 사용설명서에 지역 설정 안내 추가",
    body: "· 🌱 시작 탭에 「📍 지역 설정 · 실시간 날씨」 항목이 생겼어요\n· 🏛 생활 탭에도 「🌦 날씨」 항목을 추가했어요\n· 고른 지역의 실제 예보를 가져와 기온·날씨 아이콘이 바뀌고, 비 예보면 마을에 비가 내립니다\n· 지역 선택 창에도 실시간 예보 기반이라는 설명을 넣었어요" },
  { id: "u20260724m", type: "업데이트", date: "2026-07-24", title: "✅ 완료하면 광장에서 사라지고 도감으로",
    body: "· ✅ 완료를 누르면 바로 완료 처리돼요\n· 하드모드 광장에서는 완료한 퀘스트가 지도에서 사라지고 🧠 사고 도감에만 남아요\n· 진행도(n/n)는 전체 기준으로 계속 정확하게 표시돼요\n· 보상은 즉시 지급되지 않고, 🏆 제단에 완료 파편을 올려 GM 검수를 받아야 지급됩니다\n· ⚔ 보스 격파는 기존처럼 즉시 보상이에요" },
  { id: "u20260724l", type: "업데이트", date: "2026-07-24", title: "🔙 퀘스트 뒤로가기 · 🏆 완료는 제단에서",
    body: "· 하드모드 퀘스트 수락·시작 후 「← 뒤로」 버튼이 생겼어요\n· 닫아도 수락·시작 상태는 그대로 유지돼요 — 마을을 자유롭게 돌아다니다 다시 열면 됩니다\n· ✅ 완료를 누르면 바로 완료되지 않고, 「퀘스트 완료의 제단으로 이동해서 완료 파편을 올려야 검토 후 보상이 주어집니다」 안내가 떠요\n· 🏆 제단으로 바로 이동 버튼을 누르면 즉시 제단으로 가고, 퀘스트 제목·내용·보상이 수락 파편 칸에 자동으로 채워져요\n· GM 검수 완료 + 보상 완료가 체크되면 최종 지급됩니다\n· 보스는 기존처럼 ⚔ 격파 즉시 처리돼요" },
  { id: "u20260724k", type: "업데이트", date: "2026-07-24", title: "🎁 보상 종류 선택 · 👥 참가자 지정",
    body: "· 퀘스트 보상을 💎 젬 / 🪙 골드 / 🎁 직접 입력 중에 고를 수 있어요\n· 직접 입력하면 이모지와 이름을 정할 수 있어요 (예: ☕ 커피 기프티콘)\n· 개수도 따로 입력합니다\n· 직접 입력 보상은 완료 시 🎒 선물함에 증표로 들어가요\n· 👥 참가 가능한 사람을 모두 / 일부 지정 중에 고를 수 있어요 (여러 명 선택 가능)\n· 지정되지 않은 사람은 수락 버튼이 막혀요\n· 🎚 난이도(초보자·숙련자) 선택을 이지모드에서만 보이게 했어요 (하드모드는 전부 숙련자)" },
  { id: "u20260724j", type: "업데이트", date: "2026-07-24", title: "✈️ airport.png 인식 추가",
    body: "· public/sprites/airport.png 파일 하나로 인천공항·치앙마이공항이 모두 바뀌어요\n· 따로 쓰고 싶으면 airportIC.png · airportCM.png 로 나눠 넣고 코드의 SPRITE_FILES 를 수정하면 됩니다" },
  { id: "u20260724i", type: "업데이트", date: "2026-07-24", title: "🗺 보스맵 퀘스트 저장·공유",
    body: "· 추가 · 수정 · 삭제한 퀘스트가 새로고침해도 사라지지 않아요\n· 접속 중인 모두에게 실시간으로 반영돼요\n· 새로 접속하면 다른 사람의 퀘스트를 자동으로 받아와요\n· 📖 코어사전의 🔄 동기화 버튼을 누르면 보스맵도 같이 동기화돼요\n· 새로 만든 보스맵도 함께 공유됩니다" },
  { id: "u20260724h", type: "업데이트", date: "2026-07-24", title: "🌴 야자수·나무도 이미지 교체 가능",
    body: "· 건물뿐 아니라 지도 장식물도 내 이미지로 바꿀 수 있어요\n· public/sprites/palm.png → 🌴 야자수 4그루 전부 교체\n· public/sprites/tree.png → 🌳 마을 나무 6그루 전부 교체\n· ☰ 메뉴 → 🎨 건물 이미지 목록에도 추가됐어요 (누끼 강도 조절 가능)" },
  { id: "u20260724g", type: "업데이트", date: "2026-07-24", title: "✈️ 공항 정리 · 🌴 야자수 위치 수정",
    body: "· 🌴 야자수가 강물 위에 서 있던 문제를 고쳤어요 (물 구간 x2140~2260 밖으로)\n· 16그루 → 4그루로 줄이고 육지에 듬성듬성 배치했어요\n· ✈️ 공항 아이콘을 작게 줄이고 다리 바로 앞으로 옮겼어요\n· 여권 번호 → 🔒 비밀코드로 이름을 바꿨어요\n· 코드를 맞히면 「정답입니다!」와 함께 바로 반대편으로 넘어가요\n· 한 번 맞히면 그 계정은 계속 자유롭게 왕복할 수 있어요 (공항에서 바로 이동 버튼도 생겨요)" },
  { id: "u20260724f", type: "업데이트", date: "2026-07-24", title: "🛠 흰 화면 오류 수정",
    body: "· 유튜브 재생 상태가 배경음악 useEffect 의존성 배열에서 선언보다 먼저 참조돼 앱 전체가 멈추던 문제를 고쳤어요\n· 이제 렌더링 오류가 나도 흰 화면 대신 원인이 화면에 표시돼요\n· 저장된 데이터가 손상돼도 앱이 죽지 않도록 방어 코드를 넣었어요" },
  { id: "u20260724e", type: "업데이트", date: "2026-07-24", title: "✈️ 검문소 → 인천공항·치앙마이공항 · 💬 채팅 자동 사라짐",
    body: "· 🛂 검문소가 ✈️ 공항으로 바뀌었어요\n· 다리 양쪽에 ✈️ 인천공항(마을 쪽) · ✈️ 치앙마이공항(강 건너)이 생겼어요\n· 비행기 모양 터미널 + 활주로 + 관제탑(불빛 깜빡임) 디자인\n· 입국 심사는 딱 한 번만 — 통과하면 그 뒤로 계속 왕복할 수 있어요 (브라우저에 저장)\n· 이미 통과했으면 공항에서 🎫 탑승권 소지 중으로 표시돼요\n· 💬 일반 채팅은 5초 뒤 사라지고, 📢 확성기 채팅은 계속 남아요 (확성기는 금색 테두리)" },
  { id: "u20260724c", type: "업데이트", date: "2026-07-24", title: "📖 코어사전 전면 개편 — 모두와 공유",
    body: "· 등록한 단어가 접속 중인 모두에게 실시간으로 공유돼요\n· 접속하면 다른 사람이 등록한 단어를 자동으로 받아와요 (🔄 동기화 버튼으로 수동 요청도 가능)\n· 등록창을 없애고 ＋ 단어 등록 버튼 → 팝업으로 바꿔 목록을 넓게 썼어요\n· 단어 · 뜻 · 작성자를 검색할 수 있어요\n· 등록된 단어가 가나다 순으로 정렬돼요\n· 🖼 갤러리 탭이 정상 동작하고, 누구나 사진을 올리고 볼 수 있어요 (한 번에 최대 6장)" },
  { id: "u20260724b", type: "업데이트", date: "2026-07-24", title: "🚩 ECHO 깃발 · 🌴 야자수 보강",
    body: "· 주민센터에 길고 큰 초록 ECHO 깃발이 꽂혔어요\n· 옆에 작은 빨간 삼각 깃발이 빠르게 펄럭여요\n· 🌴 치앙마이 야자수를 10 → 16그루로 늘리고 크게 키웠어요 (다리 건너자마자 보이도록 배치)" },
  { id: "u20260724a", type: "업데이트", date: "2026-07-24", title: "🎁 선물 도착 알림 · 🎬 유튜브 계속 재생 · 🚩 ECHO 깃발",
    body: "· 선물을 받으면 「선물이 도착했습니다」 팝업이 떠요 — 🎒 선물함으로 이동 / 닫기 선택\n· 선물함에서 🙌 들고다니기 · 🏠 집에 두기 · 😋 먹기 · 🧊 냉장고 보관을 바로 고를 수 있어요\n· 🎬 유튜브로 재생한 곡이 리스닝 방을 나가도 계속 들려요 (좌측 하단 미니 플레이어)\n· 🔗 링크 · 🎤 가수 · 🎵 제목을 따로 입력해서 「가수 - 제목」으로 표시돼요\n· 🚩 주민센터 지붕에 초록 ECHO 글씨 깃발이 펄럭여요\n· 🌴 치앙마이에 야자수 10그루가 바람에 흔들려요\n· 🧠 사고 도감 글씨를 크게 키우고 3열로 넓혔어요" },
  { id: "u20260723y", type: "업데이트", date: "2026-07-23", title: "🎵 BGM 자동 재생·셔플 · 🌧 비 효과 리뉴얼",
    body: "· 한 곡이 끝나면 다음 곡이 자동으로 이어져요\n· ⏮ ⏭ 이전/다음 곡 버튼 추가\n· 🔀 셔플 버튼 — 누르면 바로 아무 곡이나 무작위 재생, 이후 곡도 무작위로 이어져요\n· 🌧 비가 굵기·길이·속도·투명도가 제각각인 세로 빗줄기로 바뀌었어요\n· 반투명이라 건물이 비쳐 보이지만 빗줄기는 또렷하게 보여요\n· 내가 있는 지역(마을 / 치앙마이)의 날씨에 맞춰 비가 내려요" },
  { id: "u20260723w", type: "업데이트", date: "2026-07-23", title: "🎁 선물 행동 · 🧑 외모 꾸미기 · 🏢 대형건물 정리",
    body: "· 선물마다 할 수 있는 행동이 달라졌어요\n· 💐 꽃다발·✉️ 편지지·🕯️ 향초 : 🙌 들고다니기 / 🏠 집에 두기\n· 🍰 케이크·☕ 커피·🍫 초콜릿 : 🙌 들고다니기 / 😋 먹기(HP+15 MP+10) / 🧊 냉장고 보관\n· 들고 다니면 마을·회의실·보스맵에서 다른 사람에게도 보여요\n· 집에 둔 선물은 내 집에 장식되고, 냉장고를 누르면 안에 든 게 보여요\n· 🧑 내 프로필에서 직업·아이콘·얼굴색·머리색·헤어스타일을 바꿀 수 있어요\n· 🏢 대형건물을 CS 하나만 남기고 정리했어요" },
  { id: "u20260723v", type: "업데이트", date: "2026-07-23", title: "🎥 회의실 채팅 · 📨 초대장 개선 · 💬 진짜 DM",
    body: "· 회의실 안에 채팅창이 생겼어요 — 같은 회의실 사람들과 실시간 대화\n· 초대장에 🚪 회의실 바로가기 버튼 추가\n· ✕ 거절하기를 누르면 사유를 적어 초대한 사람에게 회신돼요\n· 회신은 상대의 ✉️ 메세지함에 도착해요\n· DM이 AI 자동응답이 아니라 실제 접속자와 주고받는 방식으로 바뀌었어요\n· DM 대화가 저장되고, 상대 접속 여부(🟢/⚪)가 표시돼요\n· 메뉴 위에 DM 창이 가려지던 문제 해결" },
  { id: "u20260723t", type: "업데이트", date: "2026-07-23", title: "🎨 건물 이미지 내 그림으로 바꾸기",
    body: "· ☰ 메뉴 → 🎨 건물 이미지 에서 마을 건물 그림을 내가 올린 이미지로 바꿀 수 있어요\n· 파일 업로드(📁) 또는 이미지 주소(🔗) 둘 다 지원해요\n· 배경이 투명한 PNG를 쓰면 가장 자연스러워요\n· 건물별로 ↩ 버튼으로 기본 도트 그림으로 되돌릴 수 있어요\n· 지도에 있는 집·상점·시설·NPC 전부 교체 가능합니다" },
  { id: "u20260723s", type: "업데이트", date: "2026-07-23", title: "🪙 골드 · 💎 젬 화폐 분리 · 📊 경험치",
    body: "· 화폐가 두 종류로 나뉘었어요\n· 💎 젬 — 퀘스트(업무·사고) 보상 전용. 중앙은행에서 환전 가능\n· 🪙 골드 — 마을 안에서만 쓰는 화폐 (미니게임·수영·헬스·쩝쩝박사 보상)\n· 무신사·이케아·감사의 방·마음의 방·렌트·우편·확성기·신청곡은 모두 🪙 골드로 결제해요\n· 상단에 Lv 경험치 게이지가 생겼어요 — 활동할수록 레벨업\n· 웰컴 쿠폰이 💎100 젬 + 🪙200 골드로 바뀌었어요" },
  { id: "u20260723r", type: "업데이트", date: "2026-07-23", title: "🔐 자동 로그인 · 🔒 비밀사전 · 🎯 퀘스트 추가 개선",
    body: "· 한 번 이름을 정하면 이 브라우저에서는 다음부터 자동 로그인돼요 (캐시 삭제·시크릿 모드 제외)\n· 이름 창에서 「이 브라우저에서 로그아웃」 가능\n· 📖 코어사전에 🔒 비밀사전 탭 추가 — 나눈 얘기의 핵심 요약을 제목·내용·태그로 보관\n· 🗺 보스맵 ＋ 버튼이 항상 「퀘스트 추가」 탭으로 열려요 (실수로 새 보스맵이 생기던 문제 해결)\n· 퀘스트 추가 창에 📝 내용 설명 · ✅ 완료 조건 · ⏳ 제한시간(실시간 카운트다운) · 💎 보상 입력란 정리\n· 제한시간은 +1시간/+3시간/+6시간/내일/3일 빠른 버튼으로도 정할 수 있어요" },
  { id: "u20260723p", type: "업데이트", date: "2026-07-23", title: "📖 코어사전 저장 안정화 · 🖼 갤러리 추가",
    body: "· 등록한 단어가 서버 저장에 실패해도 사라지지 않게 이 기기에 함께 저장돼요\n· 서버와 로컬 기록을 합쳐서 보여주고, 최근 수정본이 우선됩니다\n· 🖼 갤러리 탭이 생겼어요 — 사진을 여러 장 한 번에 올릴 수 있어요\n· 사진 아래에 한 줄 설명을 바로 적을 수 있고, 사진을 누르면 크게 보여요\n· 업로드한 사진은 자동으로 압축돼요" },
  { id: "u20260723o", type: "업데이트", date: "2026-07-23", title: "🎵 유튜브 링크 즉시 재생 · 💬 채팅 자동 스크롤",
    body: "· 리스닝 방 디제이 부스에 「링크 붙여넣기 → 바로 재생」 칸이 생겼어요\n· 붙여넣는 순간 선곡 리스트에 등록되고 바로 재생됩니다\n· youtu.be · watch?v= · shorts · live 주소를 모두 인식해요\n· 신청곡에도 링크를 넣으면 바로 재생돼요\n· 모든 채팅창(주민센터·DM·재떨이 수다방·라이어게임·퀘스트 대화방·담당자·어시스턴트)이 자동으로 맨 아래로 스크롤돼요\n· 🗺 보스맵 상단에서 중복 아이콘을 정리하고 도감 아이콘만 남겼어요\n· 🧠 사고 도감은 등록된 퀘스트를 모두 보여주고, 작은 글씨는 주최한 사람, 완료한 건 빨간 ✓ 로 표시돼요" },
  { id: "u20260723n", type: "업데이트", date: "2026-07-23", title: "🏆 퀘스트 완료의 제단 오픈",
    body: "· 주민센터 남쪽에 신비로운 상징물 「퀘스트 완료의 제단」이 세워졌어요\n· 안에서 [퀘스트 신청 파편] · [퀘스트 수락 파편] 을 봉헌할 수 있어요\n· 항목마다 🛡 GM 검수 완료 / ⭐ 보상 완료 체크 가능\n· 둘 다 체크되면 ✦ 봉인 완료로 바뀌고 상단 봉인도 게이지가 올라가요\n· 신청/수락/미완/완료 필터와 검색 지원" },
  { id: "u20260723m", type: "업데이트", date: "2026-07-23", title: "🧭 우측 하단 버튼 4개로 정리 · ✉️ 메세지함 신설",
    body: "· 세로로 쌓여 잘리던 버튼들을 가로 4개 아이콘으로 정리했어요\n· ☰ 메뉴 : 마을주민들 · 피드백 보내기\n· 🧑 내 프로필 : 프로필 · 인벤토리 · 뱃지\n· 📖 안내책자 : 에코타운 사용설명서 · 코어사전\n· ✉️ 메세지 : 공지 · 초대장 · 선물/우편 · 메세지/DM · 부재중 통화\n· 안 읽은 항목이 있으면 빨간 숫자로 표시돼요\n· 📨 회의실 초대장 버튼을 회의실 안 큰 배너로 옮겨 잘 보이게 했어요" },
  { id: "u20260723l", type: "업데이트", date: "2026-07-23", title: "📖 코어사전 오픈 · ⏳ 퀘스트 제한시간",
    body: "· 주민센터 근처에 📖 코어사전이 생겼어요\n· 누구나 우리만의 단어와 뜻을 등록·수정·삭제할 수 있어요 (나무위키처럼)\n· 단어 검색과 최근 수정자 표시 지원\n· 퀘스트 추가 시 ⏳ 제한시간(마감 일시)을 정할 수 있어요 — 실시간 카운트다운 표시\n· 하드모드(광장)에서는 스테이지 선택 없이 바로 광장에 퀘스트가 추가돼요" },
  { id: "u20260723k", type: "업데이트", date: "2026-07-23", title: "🔧 편의 개선 모음",
    body: "· 🏅 이미 받은 뱃지가 반복해서 뜨던 문제 수정\n· 👥 상단 접속자수를 누르면 누가 접속 중인지 목록이 나와요\n· 마을주민들 목록에 🟢 접속 중 / ⚪ 오프라인 표시\n· 📅 회의 초대를 수락하면 주민센터 상단에 내 회의 일정이 떠요\n· 🪑 회의실 대형 테이블·라운지 테이블에 앉은 사람 이름이 보여요\n· 📜 게시판 업데이트 탭 아래에 확인한 업데이트 기록 보관\n· 보스맵 도감 버튼이 모드별 1개로 정리 (이지=보스도감, 하드=사고도감)" },
  { id: "u20260723j", type: "업데이트", date: "2026-07-23", title: "📚 퀘스트 도감 · 🧠 사고 도감 오픈",
    body: "· 보스맵 상단 📚 버튼으로 완료한 퀘스트를 모아볼 수 있어요\n· 🌱 이지 도감 / 🧠 사고 도감(하드) 탭으로 구분\n· 완료한 퀘스트만 아이콘·이름이 공개되고 미완료는 ??? 로 표시\n· 누가 완료했는지도 함께 표시돼요\n· 새 퀘스트는 기존 퀘스트보다 위쪽(보스 방향)에 생성돼요" },
  { id: "u20260723i", type: "업데이트", date: "2026-07-23", title: "👥 주민 목록 = 실제 접속자 기반",
    body: "· 마을주민들 · 회의 초대원 · 라이어 게임 초대 목록이 실제로 이름을 등록한 사람들로 바뀌었어요\n· 🟢 접속 중 / ⚪ 오프라인 상태가 표시돼요\n· 새로 이름을 등록하면 자동으로 목록에 추가돼요 (1분마다 갱신)\n· 퀘스트를 새로 만들면 기존 퀘스트보다 위쪽(보스 방향)에 배치돼요" },
  { id: "u20260723f", type: "업데이트", date: "2026-07-23", title: "🧠 하드모드 = 광장 형식으로 변경",
    body: "· 스테이지 구분 없이 하나의 넓은 광장에 퀘스트가 흩어져 배치돼요\n· 순서 상관없이 아무 퀘스트나 자유롭게 도전 가능\n· 광장 한가운데 보스 — 모든 퀘스트를 완료해야 도전할 수 있어요\n· 이지모드(어플·속옷·양말)는 기존 스테이지 방식 유지" },
  { id: "u20260723g", type: "업데이트", date: "2026-07-23", title: "👥 파티 기능 강화",
    body: "· 퀘스트 상단에 파티원 이름이 칩으로 표시돼요 (동의한 사람은 초록 ✓)\n· 🔒 파티 전원이 동의하면 퀘스트를 잠글 수 있어요 — 이후 다른 사람은 참여 불가\n· 🚪 진행 중인 퀘스트에서 나가기 버튼 추가\n· 보스맵 안에서도 다른 접속자가 보여요 (이름표·말풍선·춤·옷)" },
  { id: "u20260723h", type: "업데이트", date: "2026-07-23", title: "✏️ 퀘스트 수정·삭제 · 📨 회의 초대장",
    body: "· 퀘스트를 만든 사람이 직접 수정·삭제할 수 있어요 (작성자 표시)\n· 기존 기본 퀘스트는 누구나 수정·삭제 가능\n· 회의실에서 📨 초대장 보내기 추가 — 날짜·시간·예상 회의시간·초대원 선택\n· 받은 사람은 참석/불참으로 답할 수 있고, 초대장은 우체통에도 저장돼요\n· 게시판 🤝 모집 탭에 파티모집 글이 따로 모여요" },
  { id: "u20260723a", type: "업데이트", date: "2026-07-23", title: "🏠 집 시스템 오픈",
    body: "· 내 집 첫 방문 시 비밀번호 설정 (최초 1회)\n· 현관에서 비밀번호 입력 후 입장 — 비밀번호를 알면 누구나 입장 가능\n· 🔔 초인종: 집주인에게 알림 → 문 열어주기 / 거절하기 선택\n· 📮 우체통: 방명록·편지·선물 전송 (택배비 🪙0.3), 받은 편지함 확인\n· 🎁 마을에서 다른 사람 캐릭터를 클릭하면 바로 선물 주기" },
  { id: "u20260723b", type: "업데이트", date: "2026-07-23", title: "🗺 보스맵 도전기 개편",
    body: "· 🌱 이지모드(어플·속옷·양말) / 🔥 하드모드(사고력 훈련) 분리\n· 아래→위로 올라가는 세로 맵, 스테이지 구역 표시\n· 캐릭터 이동이 부드러워졌어요\n· 👾 보스 도감 추가 (처치 / 진행중 / ??? )\n· ＋ 버튼으로 퀘스트·보스맵 직접 추가 (초보자/숙련자, 네이버/영상 선택)\n· 하드모드 퀘스트: 🤝 수락 → 파티원 모집 → ▶ 시작 → 💬 대화방 · 📓 퀘스트 일지\n· [수정] 잠긴 퀘스트에서 진행되던 문제 해결" },
  { id: "u20260723c", type: "업데이트", date: "2026-07-23", title: "💾 서버 저장 시작",
    body: "· 이름으로 접속하면 젬·골드·옷·가구·탈것·뱃지·메모가 서버에 저장돼요\n· 새로고침하거나 다른 기기에서도 이어서 플레이 가능\n· 🏆 샌드백·수영 랭킹이 모두에게 공유돼요\n· 📮 편지·선물은 상대가 접속 중이 아니어도 도착해요\n· 🗺 보스맵 진행도는 팀 전체가 함께 봐요" },
  { id: "u20260723d", type: "업데이트", date: "2026-07-23", title: "📋 게시판 · 🗺 지도 개선",
    body: "· 게시판에 🤝 모집 / 🆕 업데이트 탭 추가\n· ✍️ 글쓰기로 공지·이벤트·모집·업데이트 직접 등록 (코드 수정 불필요)\n· 업데이트 글은 [확인했어요]를 누르면 사라져요\n· 미니맵 구역과 전체지도 건물 이름을 누르면 그곳으로 순간이동 🚀" },
  { id: "u20260723e", type: "업데이트", date: "2026-07-23", title: "👥 멀티플레이 · 편의 기능",
    body: "· 같은 방 안에서도 서로 보여요\n· 채팅·말풍선·춤·옷·집 외관이 실시간으로 공유돼요\n· 말풍선이 50자까지 줄바꿈돼요\n· 🔊 배경음악·리스닝방 볼륨 조절\n· 🏅 뱃지 시스템 (방문·소통·운동·흡연·샌드백·보스맵·노래)\n· 📖 게임 내 사용설명서 추가 (장소 바로가기 포함)\n· 입력창에서 방향키·스페이스가 막히던 문제 해결" },
];

function BoardView({ onBack, myName = "", myUid = "" }) {
  const [dbList, setDbList] = useState([]);
  const [edit, setEdit] = useState(null);   // 내가 쓴 글 수정
  const [wOpen, setWOpen] = useState(false);
  const [wType, setWType] = useState("공지");
  const [wTitle, setWTitle] = useState("");
  const [wBody, setWBody] = useState("");
  const [seen, setSeen] = useState(() => loadJSON("echotown_seen_updates", {}));
  const markSeen = (id) => setSeen((v) => { const n = { ...v, [id]: true }; saveJSON("echotown_seen_updates", n); return n; });
  const reload = () => dbNotices().then((r) => setDbList(r || []));
  useEffect(() => { reload(); }, []);
  const post = () => {
    if (!wTitle.trim()) return;
    dbAddNotice(wType, wTitle.trim(), wBody.trim(), myUid).then(() => { setWTitle(""); setWBody(""); setWOpen(false); reload(); });
  };
  const [tab, setTab] = useState("notice");
  const [openDoc, setOpenDoc] = useState(null);
  const [day, setDay] = useState(null);
  const first = new Date(2026, 6, 1);
  const startDow = first.getDay();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= 31; d++) cells.push(d);
  const key = (d) => `2026-07-${String(d).padStart(2, "0")}`;
  return (
    <Panel style={{ padding: 0, overflow: "hidden" }}>
      <TitleBar icon="📋" title="게시판" sub="공지사항 · 2026년 7월 캘린더" onBack={onBack} bg={C.wood} fg={C.white}
        right={<PxButton tone="gold" onClick={() => setWOpen(true)} style={{ fontSize: 11, padding: "5px 10px" }}>✍️ 글쓰기</PxButton>} />
      {edit && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 120, padding: 14 }} onClick={() => setEdit(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 400, maxHeight: "calc(100vh - 28px)", overflowY: "auto" }}>
            <Panel style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 22 }}>✏️</span>
                <b style={{ flex: 1, fontSize: 15 }}>내 글 수정</b>
                <PxButton tone="ink" onClick={() => setEdit(null)} style={{ fontSize: 11, padding: "5px 9px" }}>✕</PxButton>
              </div>
              <input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="제목"
                style={{ width: "100%", boxSizing: "border-box", padding: 10, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 14, marginBottom: 8 }} />
              <textarea value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} rows={6} placeholder="내용"
                style={{ width: "100%", boxSizing: "border-box", padding: 10, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 13, resize: "vertical" }} />
              <PxButton tone="gold" disabled={!edit.title.trim()} onClick={() => dbEditNotice(edit.id, edit.title.trim(), edit.body.trim()).then(() => { setEdit(null); reload(); })}
                style={{ width: "100%", marginTop: 10, padding: 12, fontSize: 14 }}>수정 저장</PxButton>
            </Panel>
          </div>
        </div>
      )}
      {wOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 14 }} onClick={() => setWOpen(false)}>
<div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 360, maxHeight: "calc(100vh - 28px)", overflowY: "auto" }}>
            <Panel style={{ padding: 16 }}>
              <b style={{ fontSize: 14 }}>✍️ 새 글 쓰기</b>
              <div style={{ display: "flex", gap: 6, margin: "10px 0" }}>
                {["공지", "이벤트", "모집", "업데이트"].map((t) => (
                  <PxButton key={t} tone={wType === t ? "good" : "wood"} onClick={() => setWType(t)} style={{ flex: 1, fontSize: 11, padding: 8 }}>{t}</PxButton>
                ))}
              </div>
              <input value={wTitle} onChange={(e) => setWTitle(e.target.value)} placeholder="제목" style={{ width: "100%", boxSizing: "border-box", padding: 9, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 13, marginBottom: 6 }} />
              <textarea value={wBody} onChange={(e) => setWBody(e.target.value)} placeholder="내용" style={{ width: "100%", boxSizing: "border-box", height: 90, padding: 9, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 13, resize: "none" }} />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <PxButton tone="ink" onClick={() => setWOpen(false)} style={{ flex: 1, padding: 10, fontSize: 13 }}>취소</PxButton>
                <PxButton tone="gold" disabled={!wTitle.trim()} onClick={post} style={{ flex: 1, padding: 10, fontSize: 13 }}>등록</PxButton>
              </div>
            </Panel>
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 6, padding: 10, background: C.parchLine, borderBottom: `3px solid ${C.parchEdge}` }}>
        <PxButton tone={tab === "notice" ? "gold" : "wood"} onClick={() => setTab("notice")} style={{ fontSize: 12, padding: "8px 12px" }}>📢 공지사항</PxButton>
        <PxButton tone={tab === "cal" ? "gold" : "wood"} onClick={() => setTab("cal")} style={{ fontSize: 12, padding: "8px 12px" }}>📅 캘린더</PxButton>
        <PxButton tone={tab === "party" ? "gold" : "wood"} onClick={() => setTab("party")} style={{ fontSize: 12, padding: "8px 12px" }}>🤝 모집</PxButton>
        <PxButton tone={tab === "update" ? "gold" : "wood"} onClick={() => setTab("update")} style={{ fontSize: 12, padding: "8px 12px" }}>
          🆕 업데이트{[...UPDATE_NOTES, ...dbList.filter((n) => n.type === "업데이트")].filter((n) => !seen[n.id]).length > 0 ? ` (${[...UPDATE_NOTES, ...dbList.filter((n) => n.type === "업데이트")].filter((n) => !seen[n.id]).length})` : ""}
        </PxButton>
      </div>

      <div style={{ padding: 16, background: `repeating-linear-gradient(0deg, ${C.parch} 0 40px, ${C.parchLine} 40px 80px)` }}>
        {tab === "party" && (
          <div style={{ display: "grid", gap: 8 }}>
            {dbList.filter((n) => n.type === "모집" || String(n.title || "").startsWith("[파티모집]")).length === 0 ? (
              <div style={{ fontSize: 12, color: C.inkSoft, textAlign: "center", padding: 24 }}>아직 모집 중인 파티가 없어요 🤝<br />보스맵 하드모드에서 퀘스트를 수락하고 모집해보세요!</div>
            ) : dbList.filter((n) => n.type === "모집" || String(n.title || "").startsWith("[파티모집]")).map((a) => (
              <div key={a.id} style={{ background: C.white, border: `3px solid ${C.ink}`, borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10, color: "#fff", background: "#8e5a9e", borderRadius: 10, padding: "2px 8px", whiteSpace: "nowrap" }}>🤝 모집</span>
                  <b style={{ fontSize: 14 }}>{a.title}</b>
                </div>
                <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 5, lineHeight: 1.6 }}>{a.body}</div>
                <div style={{ fontSize: 10, color: C.inkSoft, marginTop: 4 }}>{a.date}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "update" && (
          <div style={{ display: "grid", gap: 8 }}>
            {[...UPDATE_NOTES, ...dbList.filter((n) => n.type === "업데이트")].filter((n) => !seen[n.id]).length === 0 ? (
              <div style={{ fontSize: 12, color: C.inkSoft, textAlign: "center", padding: 24 }}>확인하지 않은 업데이트가 없어요 ✅</div>
            ) : [...UPDATE_NOTES, ...dbList.filter((n) => n.type === "업데이트")].filter((n) => !seen[n.id]).map((a) => (
              <div key={a.id} style={{ background: "#fffbe8", border: `3px solid ${C.ink}`, borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10, color: C.ink, background: "#ffd75e", borderRadius: 10, padding: "2px 8px", whiteSpace: "nowrap" }}>🆕 업데이트</span>
                  <b style={{ flex: 1, fontSize: 14 }}>{a.title}</b>
                </div>
                <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 5, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{a.body}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <span style={{ fontSize: 10, color: C.inkSoft, flex: 1 }}>{a.date}</span>
                  <PxButton tone="good" onClick={() => markSeen(a.id)} style={{ fontSize: 11, padding: "6px 12px" }}>확인했어요 ✓</PxButton>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "update" && [...UPDATE_NOTES, ...dbList.filter((n) => n.type === "업데이트")].filter((n) => seen[n.id]).length > 0 && (
          <div style={{ marginTop: 14, borderTop: `3px dashed ${C.parchEdge}`, paddingTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 8, color: C.inkSoft }}>📜 확인한 업데이트 기록</div>
            <div style={{ display: "grid", gap: 6 }}>
              {[...UPDATE_NOTES, ...dbList.filter((n) => n.type === "업데이트")].filter((n) => seen[n.id]).map((a) => (
                <details key={a.id} style={{ background: C.white, border: `2px solid ${C.parchEdge}`, borderRadius: 8, padding: "7px 10px" }}>
                  <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: "bold", color: C.inkSoft }}>✓ {a.title} <span style={{ fontSize: 10, fontWeight: "normal" }}>({a.date})</span></summary>
                  <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 6, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{a.body}</div>
                </details>
              ))}
            </div>
          </div>
        )}

        {tab === "notice" && (
          <div style={{ display: "grid", gap: 8 }}>
            {[...dbList.filter((n) => n.type !== "모집" && n.type !== "업데이트" && !String(n.title || "").startsWith("[파티모집]")), ...ANNOUNCEMENTS].map((a) => (
              <div key={a.id} style={{ background: C.white, border: `3px solid ${C.ink}`, padding: "10px 12px", fontFamily: "'DotGothic16', monospace" }}>
                <button onClick={() => setOpenDoc(a)} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                  <div style={{ fontSize: 14, fontWeight: "bold", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, color: "#fff", background: a.type === "이벤트" ? "#d76b96" : "#5b8def", padding: "2px 6px", whiteSpace: "nowrap" }}>{a.type || "공지"}</span>
                    {a.title}
                  </div>
                  <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 2 }}>{a.date} · 눌러서 열기</div>
                </button>
                {a.rawId && myUid && a.uid === myUid && (
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <span style={{ flex: 1, fontSize: 10, color: C.good, alignSelf: "center", fontWeight: "bold" }}>✍️ 내가 쓴 글</span>
                    <PxButton tone="wood" onClick={() => setEdit({ id: a.rawId, title: a.title, body: a.body || "" })} style={{ fontSize: 10, padding: "4px 8px" }}>✏️ 수정</PxButton>
                    <PxButton tone="danger" onClick={() => { if (window.confirm("이 글을 삭제할까요?")) dbDelNotice(a.rawId).then(reload); }} style={{ fontSize: 10, padding: "4px 8px" }}>🗑</PxButton>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "cal" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, background: C.white, border: `3px solid ${C.ink}`, padding: 8 }}>
              {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
                <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: "bold", color: i === 0 ? C.danger : C.inkSoft }}>{d}</div>
              ))}
              {cells.map((d, i) => (
                <button key={i} disabled={!d} onClick={() => d && setDay(d)} className={d ? "px-btn" : ""}
                  style={{ aspectRatio: "1/1", background: !d ? "transparent" : day === d ? C.gem : "#fffdf5", border: d ? `2px solid ${C.ink}` : "none", cursor: d ? "pointer" : "default", position: "relative", fontFamily: "'DotGothic16', monospace", fontSize: 13, color: C.ink }}>
                  {d === 31 ? <span style={{ display: "inline-block", border: `3px solid ${C.danger}`, borderRadius: "50%", width: 24, height: 24, lineHeight: "20px" }}>{d}</span> : d}
                  {d && CAL_EVENTS[key(d)] && d !== 31 && <span style={{ position: "absolute", bottom: 3, left: "50%", transform: "translateX(-50%)", width: 5, height: 5, background: C.bankRoof, borderRadius: "50%" }} />}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 12, background: C.white, border: `3px solid ${C.ink}`, padding: 12, minHeight: 60 }}>
              {day ? (
                <>
                  <div style={{ fontWeight: "bold", fontSize: 14, marginBottom: 6 }}>7월 {day}일 {day === 31 && "🔴"}</div>
                  {(CAL_EVENTS[key(day)] || ["등록된 일정이 없습니다."]).map((e, i) => (
                    <div key={i} style={{ fontSize: 13, color: C.inkSoft }}>• {e}</div>
                  ))}
                </>
              ) : <span style={{ fontSize: 13, color: C.inkSoft }}>날짜를 누르면 일정을 확인할 수 있어요. (7월 31일 🔴 월말 결산)</span>}
            </div>
          </div>
        )}
      </div>

      {openDoc && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30, padding: 14 }} onClick={() => setOpenDoc(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, maxHeight: "calc(100vh - 28px)", overflowY: "auto" }}>
            <Panel style={{ padding: 16 }}>
              <div style={{ fontSize: 15, fontWeight: "bold" }}>{openDoc.title}</div>
              <div style={{ fontSize: 11, color: C.inkSoft, margin: "4px 0 10px" }}>{openDoc.date}</div>
              <div style={{ fontSize: 14, lineHeight: 1.7 }}>{openDoc.body}</div>
              <PxButton tone="ink" onClick={() => setOpenDoc(null)} style={{ marginTop: 14, width: "100%", padding: 10, fontSize: 13 }}>닫기</PxButton>
            </Panel>
          </div>
        </div>
      )}
    </Panel>
  );
}

/* ======================= 치앙마이 렌트 ======================= */
function RentView({ house, gems, rented, onRent, onBack }) {
  return (
    <Panel style={{ padding: 0, overflow: "hidden" }}>
      <TitleBar icon="🌴" title={house.name} sub="치앙마이 · 한 달 살기 렌트" onBack={onBack} bg={C.villaDk} fg={C.white} right={<GemBadge kind="gold" amount={gems} />} />
      <div style={{ padding: 20, textAlign: "center", background: `repeating-linear-gradient(0deg, ${C.parch} 0 40px, ${C.parchLine} 40px 80px)` }}>
        <div style={{ display: "inline-block" }}><PixelHouse roof={house.roof} roofDk={house.roofDk} wall={house.wall} size={150} /></div>
        <div style={{ fontSize: 15, marginTop: 8 }}>강 건너 치앙마이의 아늑한 숙소</div>
        <div style={{ fontSize: 14, color: "#a86e13", margin: "8px 0 14px" }}>렌트비 <b>🪙 {house.rent}</b> ({fmt(house.rent * GEM_TO_WON)}원 상당)</div>
        {rented ? (
          <div>
            <div style={{ background: C.good, color: C.white, border: `3px solid ${C.ink}`, padding: 12, fontSize: 14 }}>✅ 렌트 완료! 아래 주소로 입주하세요.</div>
            <div style={{ marginTop: 10, background: C.white, border: `3px solid ${C.ink}`, padding: 12, fontSize: 13, lineHeight: 1.6 }}>
              📍 123/45 Sukhumvit Road, Khwaeng Khlong Toei, Khet Khlong Toei, Bangkok 10110, Thailand
            </div>
            <PxButton tone="blue" onClick={() => alert("태국 Siri에게 연락합니다… (데모)")} style={{ marginTop: 10, padding: "10px 18px", fontSize: 14 }}>📞 태국 Siri 연락</PxButton>
          </div>
        ) : (
          <PxButton tone={gems >= house.rent ? "danger" : "ink"} disabled={gems < house.rent} onClick={onRent} style={{ padding: "12px 22px", fontSize: 15 }}>
            {gems >= house.rent ? "🔑 렌트 신청하기" : "골드가 부족해요"}
          </PxButton>
        )}
        <div style={{ marginTop: 14, fontSize: 11, color: "rgba(42,30,20,0.6)" }}>* 렌트/결제는 시뮬레이션입니다.</div>
      </div>
    </Panel>
  );
}

/* ======================= 중앙은행 ======================= */
function BankView({ gems, lifetime, exchanged, history, onExchange, onBack }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [flash, setFlash] = useState(null);
  const canWithdraw = gems > 0;
  const validAmount = amount >= 1 && amount <= gems && Number.isFinite(amount);
  function confirm() {
    if (!validAmount) return;
    onExchange(amount);
    setOpen(false);
    setFlash({ amount, won: amount * GEM_TO_WON });
    setTimeout(() => setFlash(null), 2600);
  }
  return (
    <Panel style={{ padding: 0, overflow: "hidden" }}>
      <TitleBar icon="🏦" title="SYSTEM CORE BANK" sub="자산 결산 & 환전 게이트" onBack={onBack} bg={C.bankRoof} fg={C.white} />
      <div style={{ padding: 16, background: `repeating-linear-gradient(0deg, ${C.parch} 0 40px, ${C.parchLine} 40px 80px)` }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px,1fr))", gap: 12 }}>
          <StatCard label="현재 보유 젬" value={gems} accent={C.gem} icon="💎" />
          <StatCard label="총 채굴량 (누적)" value={lifetime} accent={C.good} icon="⛏" />
          <StatCard label="총 환전 젬" value={exchanged} accent={C.bankRoof} icon="🏦" />
        </div>
        <div style={{ marginTop: 14, background: C.white, border: `4px solid ${C.ink}`, boxShadow: `inset 0 0 0 3px ${C.parchEdge}`, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, marginBottom: 8 }}>EXCHANGE GATE</div>
              <div style={{ fontSize: 13 }}>환율 <b>1 💎 = {GEM_TO_WON.toLocaleString()}원</b></div>
              <div style={{ fontSize: 13, marginTop: 4, color: C.inkSoft }}>현재 보유 젬은 최대 <b>{fmt(gems * GEM_TO_WON)}원</b> 상당</div>
            </div>
            <PxButton tone={canWithdraw ? "danger" : "ink"} disabled={!canWithdraw} onClick={() => { setAmount(Math.floor(gems)); setOpen(true); }} style={{ padding: "12px 18px", fontSize: 14 }}>
              {canWithdraw ? "💰 출금/환전 신청" : "환전할 젬이 없어요"}
            </PxButton>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, background: C.parch, border: `2px solid ${C.ink}`, padding: "8px 10px" }}>
            <b>🎯 리워드 포인트 적립</b>
            <div style={{ color: C.inkSoft, marginTop: 3 }}>💎 젬 → 실물 리워드로 연동되는 정산 채널(시뮬레이션) · 🪙 골드는 환전 대상이 아니에요</div>
          </div>
        </div>
        {flash && (
          <div className="gem-pop" style={{ marginTop: 12, background: C.good, color: C.white, border: `3px solid ${C.ink}`, padding: 12, fontSize: 13 }}>
            ✅ 정산 완료(시뮬레이션): <b>{fmt(flash.amount)} 💎</b> → <b>{fmt(flash.won)}원</b>
          </div>
        )}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, marginBottom: 8 }}>SETTLEMENT LOG</div>
          {history.length === 0 ? (
            <div style={{ background: C.parch, border: `3px dashed ${C.ink}`, padding: 14, fontSize: 13, color: C.inkSoft, textAlign: "center" }}>아직 환전 내역이 없습니다.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {history.map((h) => (
                <div key={h.id} style={{ background: C.parch, border: `2px solid ${C.ink}`, padding: "8px 12px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6, fontSize: 13 }}>
                  <span>🧾 {h.time} · 리워드 포인트 적립</span>
                  <span><b>{fmt(h.amount)} 💎</b> → <b style={{ color: C.good }}>{fmt(h.won)}원</b> <span style={{ fontSize: 10, background: C.good, color: C.white, padding: "2px 6px", marginLeft: 6 }}>정산 완료</span></span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ marginTop: 14, background: "rgba(192,86,58,0.12)", border: `3px dashed ${C.danger}`, padding: 10, fontSize: 12, color: C.inkSoft }}>
          ⚠️ 환전/정산은 프로토타입 시뮬레이션입니다. 실제 현금 출금이 이루어지지 않습니다.
        </div>
      </div>

      {open && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30, padding: 16 }} onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, maxHeight: "calc(100vh - 28px)", overflowY: "auto" }}>
            <Panel style={{ padding: 16 }}>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, marginBottom: 12 }}>💰 환전 신청</div>
              <label style={{ fontSize: 12, color: C.inkSoft }}>환전할 스타 젬 (보유 {fmt(gems)})</label>
              <input type="number" value={amount} min={1} max={gems} onChange={(e) => setAmount(Math.floor(Number(e.target.value) || 0))}
                style={{ width: "100%", boxSizing: "border-box", marginTop: 6, padding: 10, fontFamily: "'DotGothic16', monospace", fontSize: 16, border: `3px solid ${C.ink}`, background: C.white }} />
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {[10, 50, 100].map((v) => <PxButton key={v} tone="wood" disabled={v > gems} onClick={() => setAmount(v)} style={{ fontSize: 11, padding: "6px 10px" }}>{v}💎</PxButton>)}
                <PxButton tone="wood" disabled={gems < 1} onClick={() => setAmount(Math.floor(gems))} style={{ fontSize: 11, padding: "6px 10px" }}>전액</PxButton>
              </div>
              <div style={{ marginTop: 12, background: C.white, border: `3px solid ${C.ink}`, padding: 10, fontSize: 14, textAlign: "center" }}>
                {fmt(amount)} 💎 → <b style={{ color: C.good }}>{fmt(amount * GEM_TO_WON)}원</b>
              </div>
              {!validAmount && <div style={{ marginTop: 8, fontSize: 12, color: C.danger }}>{amount < 1 ? "1 젬 이상 입력하세요." : "보유 젬을 초과했습니다."}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <PxButton tone="ink" onClick={() => setOpen(false)} style={{ flex: 1, padding: 12, fontSize: 13 }}>취소</PxButton>
                <PxButton tone="danger" disabled={!validAmount} onClick={confirm} style={{ flex: 1, padding: 12, fontSize: 13 }}>환전 확정</PxButton>
              </div>
            </Panel>
          </div>
        </div>
      )}
    </Panel>
  );
}
function StatCard({ label, value, accent, icon }) {
  return (
    <div style={{ background: C.white, border: `4px solid ${C.ink}`, boxShadow: `inset 0 0 0 3px ${C.parchEdge}`, padding: 12 }}>
      <div style={{ fontSize: 12, color: C.inkSoft }}>{icon} {label}</div>
      <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
        <b style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 16, color: accent === C.gem ? "#a86e13" : accent }}>{fmt(value)}</b>
        <span style={{ fontSize: 12, color: C.inkSoft }}>⭐</span>
      </div>
    </div>
  );
}

/* ===================== 항상 떠있는 UI ===================== */
function ChatDock({ messages, shout, onToggleShout, onSend, gems = 0 }) {
  const [text, setText] = useState("");
  const [warn, setWarn] = useState(false);
  const [now, setNow] = useState(Date.now());
  const send = () => { if (!text.trim()) return; onSend(text, shout); setText(""); };
  /* 확성기가 아닌 일반 채팅은 5초 뒤 사라져요 (확성기는 계속 남음) */
  const hasTemp = messages.some((m) => !m.shout);
  useEffect(() => {
    if (!hasTemp) return;
    const iv = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(iv);
  }, [hasTemp]);
  const visible = messages.filter((m) => m.shout || now - (m.at || m.id || 0) < 5000);
  return (
    <div className="chat-dock" style={{ position: "fixed", left: 12, bottom: 12, width: 250, zIndex: 60, fontFamily: "'DotGothic16', monospace" }}>
      {visible.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 6 }}>
          {visible.map((m) => (
            <div key={m.id} className="chat-line" style={{ background: m.shout ? "rgba(120,60,20,0.9)" : "rgba(43,31,20,0.86)", color: C.white, border: `2px solid ${m.shout ? C.gem : C.ink}`, padding: "4px 8px", fontSize: 12, alignSelf: "flex-start", maxWidth: "100%" }}>
              <span style={{ color: C.gem, fontSize: 10 }}>{m.nick}</span>{" "}
              <span style={{ fontWeight: m.shout ? "bold" : "normal", fontSize: m.shout ? 13 : 12 }}>{m.shout ? "📢 " : ""}{m.text}</span>
            </div>
          ))}
        </div>
      )}
      {warn && <div style={{ background: C.danger, color: C.white, border: `2px solid ${C.ink}`, padding: "3px 8px", fontSize: 11, marginBottom: 4 }}>🪙 골드가 부족해요 (확성기 1골드)</div>}
      <div style={{ display: "flex", gap: 4, background: C.parch, border: `3px solid ${C.ink}`, padding: 4 }}>
        <button onClick={() => { if (!shout && gems < 1) { setWarn(true); setTimeout(() => setWarn(false), 1600); return; } onToggleShout(); }} title={shout ? "확성기 ON" : "확성기 켜기 (🪙1)"} style={{ position: "relative", background: shout ? C.gem : C.white, border: `2px solid ${C.ink}`, cursor: "pointer", opacity: !shout && gems < 1 ? 0.6 : 1, fontSize: 15, width: 34, flexShrink: 0 }}>
          📢<span style={{ position: "absolute", right: 1, bottom: 0, fontSize: 8, color: C.ink, background: "#ffe680", border: `1px solid ${C.ink}`, padding: "0 1px", lineHeight: 1.2 }}>{shout ? "ON" : "1"}</span>
        </button>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder={shout ? "📢 확성기 ON · 크게 외치기" : gems < 1 ? "채팅 입력 (확성기는 🪙1 필요)" : "채팅 입력 후 Enter"} style={{ flex: 1, minWidth: 0, border: `2px solid ${C.ink}`, padding: "4px 6px", fontSize: 12, background: C.white, fontFamily: "'DotGothic16', monospace" }} />
        <button onClick={send} style={{ background: C.good, color: C.white, border: `2px solid ${C.ink}`, cursor: "pointer", fontSize: 12, padding: "0 8px", flexShrink: 0 }}>▶</button>
      </div>
    </div>
  );
}

/* ======================= 뱃지 ======================= */
const BADGES = [
  { id: "v1", cat: "방문", stat: "visit", need: 1, icon: "🌱", name: "웰컴", desc: "에코타운에 처음 방문했어요" },
  { id: "v2", cat: "방문", stat: "visit", need: 5, icon: "🚪", name: "시작이 좋아", desc: "5번 방문" },
  { id: "v3", cat: "방문", stat: "visit", need: 10, icon: "📅", name: "꾸준함이 곧 답", desc: "10번 방문" },
  { id: "v4", cat: "방문", stat: "visit", need: 30, icon: "🛋", name: "하루쯤은 쉬어도 좋아", desc: "30번 방문" },
  { id: "v5", cat: "방문", stat: "visit", need: 100, icon: "🏅", name: "에코타운 터줏대감", desc: "100번 방문" },

  { id: "c1", cat: "소통", stat: "chat", need: 1, icon: "💬", name: "첫 인사", desc: "채팅 1회" },
  { id: "c2", cat: "소통", stat: "chat", need: 10, icon: "🗣", name: "수다쟁이", desc: "채팅 10회" },
  { id: "c3", cat: "소통", stat: "chat", need: 50, icon: "📣", name: "마을의 입", desc: "채팅 50회" },
  { id: "c4", cat: "소통", stat: "shout", need: 3, icon: "📢", name: "확성기 주인", desc: "확성기 3회 사용" },

  { id: "g1", cat: "운동", stat: "gym", need: 1, icon: "💪", name: "운동 시작", desc: "헬스장 첫 운동" },
  { id: "g2", cat: "운동", stat: "gym", need: 5, icon: "🏋️", name: "땀 흘리는 중", desc: "운동 5회" },
  { id: "g3", cat: "운동", stat: "gym", need: 20, icon: "🦾", name: "근육 요정", desc: "운동 20회" },
  { id: "g4", cat: "운동", stat: "swim", need: 3, icon: "🏊", name: "물 만난 물고기", desc: "수영 대결 3회" },

  { id: "s1", cat: "흡연", stat: "smoke", need: 1, icon: "🚬", name: "잠깐의 여유", desc: "흡연의 방 첫 방문" },
  { id: "s2", cat: "흡연", stat: "smoke", need: 5, icon: "💨", name: "재떨이 단골", desc: "흡연의 방 5회" },
  { id: "s3", cat: "흡연", stat: "smoke", need: 20, icon: "🌬", name: "끊는 중 (3일째)", desc: "흡연의 방 20회" },

  { id: "b1", cat: "샌드백", stat: "punch", need: 100, icon: "🥊", name: "주먹왕 시작", desc: "누적 100회 타격" },
  { id: "b2", cat: "샌드백", stat: "punch", need: 1000, icon: "👊", name: "스트레스 해방", desc: "누적 1,000회 타격" },
  { id: "b3", cat: "샌드백", stat: "punch", need: 10000, icon: "🔥", name: "철권", desc: "누적 10,000회 타격" },

  { id: "m1", cat: "보스맵", stat: "quest", need: 1, icon: "🎯", name: "첫 퀘스트", desc: "퀘스트 1개 완료" },
  { id: "m2", cat: "보스맵", stat: "quest", need: 10, icon: "🗺", name: "성실한 모험가", desc: "퀘스트 10개 완료" },
  { id: "m3", cat: "보스맵", stat: "boss", need: 1, icon: "👑", name: "보스 슬레이어", desc: "보스 1마리 격파" },
  { id: "m4", cat: "보스맵", stat: "boss", need: 3, icon: "⚔️", name: "전설의 사냥꾼", desc: "보스 3마리 격파" },

  { id: "n1", cat: "노래", stat: "song", need: 1, icon: "🎵", name: "첫 선곡", desc: "노래 1곡 재생" },
  { id: "n2", cat: "노래", stat: "song", need: 10, icon: "🎧", name: "마을 디제이", desc: "노래 10곡 재생" },
  { id: "n3", cat: "노래", stat: "song", need: 30, icon: "🎤", name: "음악 없인 못 살아", desc: "노래 30곡 재생" },
];
const BADGE_CATS = ["방문", "소통", "운동", "흡연", "샌드백", "보스맵", "노래"];

function loadStats() {
  try {
    const raw = window.localStorage.getItem("echotown_stats");
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}
function saveStats(v) {
  try { window.localStorage.setItem("echotown_stats", JSON.stringify(v)); } catch (e) {}
}

/* ======================= 도움말 (사용설명서) ======================= */
const HELP_CATS = ["🌱 시작", "🏢 퀘스트", "🏛 생활", "🎮 놀이", "🏠 집", "👥 소통", "💎 젬·🪙 골드", "❓ FAQ"];
const HELP_DATA = {
  "🌱 시작": [
    { icon: "🧑", title: "이름 정하기", body: "처음 들어오면 이름을 정해요. 이름이 정인·창민·도희·유리·민지·희정·의준·호종·슬이·상하 중 하나면 그 집이 내 집이 됩니다. 상단 🧑 버튼으로 언제든 변경 가능해요." },
    { icon: "🎟️", title: "웰컴 쿠폰", body: "사전예약자 혜택으로 처음 한 번 💎100 젬을 드려요." },
    { icon: "🎮", title: "조작법", body: "W A S D 또는 방향키로 이동 · Space로 상호작용 · 스쿨/보스맵에서는 E로 퀘스트 열기 · 다른 사람 캐릭터를 클릭하면 선물 주기." },
    { icon: "🗺", title: "길 찾기", body: "우하단 미니맵을 클릭하면 전체 지도가 열려요. 구역과 건물 이름이 모두 표시됩니다." },
    { icon: "📍", title: "지역 설정 · 실시간 날씨", body: "상단 ＋지역 버튼으로 내가 사는 지역을 고를 수 있어요. 서울 · 영등포구 · 강동구 · 마포구 · 인천 · 용인 · 부산 · 대구 · 대전 · 제주 중에서 선택합니다.\n\n고른 지역의 실제 날씨 예보를 그대로 가져와요. 상단에 현재 기온과 날씨 아이콘이 뜨고, 진짜로 비가 오는 날에는 마을에도 비가 내립니다. 10분마다 자동으로 갱신되니, 실제로 비가 그치면 게임 속 비도 멈춰요. 강 건너 치앙마이는 태국 치앙마이의 실제 날씨를 따라가요.\n\n강을 건너면 상단 날씨 표시도 치앙마이 기준으로 자동으로 바뀝니다." },
  ],
  "🏢 퀘스트": [
    { icon: "🏆", title: "퀘스트 완료의 제단", body: "주민센터 남쪽의 신비한 상징물. 끝낸 퀘스트를 [퀘스트 신청 파편]과 [퀘스트 수락 파편]으로 봉헌하고, 항목마다 🛡 GM 검수 완료 / ⭐ 보상 완료를 체크해요. 둘 다 체크되면 '봉인 완료'로 바뀝니다.", go: "questdone", goLabel: "제단 가기" },
    { icon: "🗺", title: "보스맵 도전기 (숙련자용)", body: "프로젝트를 게임처럼. 이지모드(어플·속옷·양말)와 하드모드(사고력 훈련). 아래에서 위로 올라가며 스테이지를 클리어하고 꼭대기 보스를 잡아요. 상단 👾 보스도감 / 🧠 사고도감 버튼도 여기 있어요.", go: "project", goLabel: "보스맵 가기" },
    { icon: "📗", title: "네이버스쿨 (초보자용)", body: "개념정리 → 블로그 → 카페 → 지식인 순서로 배우는 학습 맵. 집(퀘스트) 앞에서 E.", go: "naverschool", goLabel: "네이버스쿨 가기" },
    { icon: "🎬", title: "영상스쿨 (초보자용)", body: "코어개념 → 레퍼런스 → 원고작성 → 영상제작. 프롬프트 복사 버튼과 어시스턴트가 있어요.", go: "videoschool", goLabel: "영상스쿨 가기" },
  ],
  "🏛 생활": [
    { icon: "🌦", title: "날씨", body: "상단 ＋지역에서 고른 지역의 실제 예보를 가져와요. 접속할 때 · 지역을 바꿀 때 · 10분마다 · 다른 탭에 갔다 돌아올 때 자동으로 다시 받아옵니다. 실제로 비가 그치면 게임 속 비도 멈춰요. 날씨 표시에 마우스를 올리면 마지막 갱신 시각이 보입니다." },
    { icon: "🏛", title: "주민센터", body: "회의실 예약, 음료 코너(HP·MP +20), 공지사항과 캘린더.", go: "center", goLabel: "주민센터 가기" },
    { icon: "🛍️", title: "무신사", body: "상의·하의·신발을 무료로 입어보고 마음에 들면 구매. 착용한 옷은 다른 접속자에게도 보여요.", go: "musinsa", goLabel: "무신사 가기" },
    { icon: "🛒", title: "이케아", body: "집 외관 · 가구 · 교통수단 구매. 탈것을 타면 마을에서 더 빨리 이동해요.", go: "ikea", goLabel: "이케아 가기" },
    { icon: "🍴", title: "쩝쩝박사", body: "원형 테이블에서 오늘의 메뉴 뽑기, 메뉴 추천 게시판, 점심술사(인증샷 제출 시 🪙5).", go: "jjeop", goLabel: "쩝쩝박사 가기" },
    { icon: "🏦", title: "중앙은행", body: "퀘스트로 모은 💎 젬을 원화로 환전해요. 🪙 골드는 환전할 수 없어요.", go: "bank", goLabel: "은행 가기" },
    { icon: "📋", title: "게시판", body: "공지·이벤트 라벨로 구분된 마을 소식과 캘린더.", go: "board", goLabel: "게시판 가기" },
  ],
  "🎮 놀이": [
    { icon: "🥊", title: "샌드백", body: "마우스/키보드로 타격. 상대 이름을 붙인 샌드백도 만들 수 있고 랭킹에 집계돼요.", go: "sandbag", goLabel: "샌드백 가기" },
    { icon: "🎮", title: "미니게임 방", body: "반응속도 · 가위바위보 · 숫자순서 · 라이어게임 · 대회 코너. 라이어는 방을 만들고 주민을 초대해요.", go: "minigame", goLabel: "미니게임 가기" },
    { icon: "🏊", title: "수영장", body: "스페이스바 연타로 레인 경주. 1등이면 🪙 골드를 받고 기록이 랭킹에 남아요.", go: "pool", goLabel: "수영장 가기" },
    { icon: "🏋️", title: "헬스장", body: "운동하고 🪙 골드 획득. 스트레칭 안내도 있어요.", go: "gym", goLabel: "헬스장 가기" },
    { icon: "🚬", title: "흡연의 방", body: "재떨이 수다방(티키타카), 담배·전자담배, 창문 환기.", go: "smoke", goLabel: "흡연의 방 가기" },
    { icon: "🎧", title: "리스닝 방", body: "음악 감상과 신청곡. 🔊 슬라이더로 볼륨 조절.", go: "listening", goLabel: "리스닝 방 가기" },
    { icon: "🎬", title: "릴스 방", body: "카테고리별 짧은 영상 모음. 카테고리 추가도 가능해요.", go: "reels", goLabel: "릴스 방 가기" },
    { icon: "🙏", title: "감사의 방", body: "선물을 사고 감사 포스트잇을 붙여요. 산 선물은 우체통·직접 선물로 보낼 수 있어요.", go: "thanks", goLabel: "감사의 방 가기" },
    { icon: "💌", title: "마음의 방", body: "고해성사함과 서운함 우체통. 익명으로 마음을 남겨요.", go: "heart", goLabel: "마음의 방 가기" },
  ],
  "🏠 집": [
    { icon: "🔒", title: "비밀번호", body: "내 집 첫 방문 때 비밀번호를 설정해요(최초 1회). 이후에는 방문할 때마다 현관에서 비밀번호를 입력해 들어갑니다. 비밀번호를 아는 사람은 누구나 들어올 수 있어요." },
    { icon: "🔔", title: "초인종", body: "누르면 딩동 소리와 함께 집주인에게 알림이 갑니다. 주인은 문 열어주기 / 거절하기를 선택할 수 있어요." },
    { icon: "📮", title: "우체통", body: "방명록·편지를 남기고 선물도 함께 보내요(택배비 🪙0.3). 보낼 선물은 🙏 감사의 방에서 미리 구매해두면 목록에 나와요. 내 집 우체통에서는 받은 편지함을 확인할 수 있어요.", go: "thanks", goLabel: "감사의 방 가기" },
    { icon: "🛋", title: "집 꾸미기", body: "이케아에서 산 외관과 가구가 내 집에 반영되고, 마을에서도 그 집이 바뀌어 보여요." },
  ],
  "👥 소통": [
    { icon: "💬", title: "채팅", body: "좌측 하단에서 입력하면 머리 위 말풍선으로 뜨고 모든 접속자에게 보여요(50자까지)." },
    { icon: "📢", title: "확성기", body: "⭐1을 내면 크게 외칠 수 있어요. 한 번 외치면 자동으로 꺼집니다." },
    { icon: "💃", title: "춤", body: "우상단 💃 버튼으로 동작 선택. 다른 사람에게도 춤추는 모습이 보여요." },
    { icon: "🎁", title: "선물 주기", body: "마을에서 다른 사람 캐릭터를 클릭하면 선물과 한마디를 바로 보낼 수 있어요." },
    { icon: "📞", title: "DM · 페이스톡", body: "메뉴(☰) → 마을주민들에서 1:1 채팅과 영상통화를 할 수 있어요." },
    { icon: "✈️", title: "치앙마이 가는 법", body: "다리 양 끝에 ✈️ 인천공항 · ✈️ 치앙마이공항이 있어요. 공항에서 🔒 비밀코드를 맞히면 바로 반대편으로 이동하고, 그 뒤로는 다리로 자유롭게 왕복할 수 있습니다. 비밀코드가 궁금하면 📋 게시판 공지를 확인하거나 마을 주민에게 물어보세요. 확성기로 외쳐보는 것도 방법!", go: "board", goLabel: "게시판 가기" },
  ],
  "💎 젬·🪙 골드": [
    { icon: "⭐", title: "젬 얻는 법", body: "퀘스트·보스 클리어, 미니게임 승리, 헬스장 운동, 점심술사 인증샷, 웰컴 쿠폰." },
    { icon: "🛒", title: "젬 쓰는 법", body: "옷·가구·집외관·탈것 구매, 선물 구매, 확성기(1젬), 우체통 택배(0.3젬), 치앙마이 렌트, 환전." },
    { icon: "🏅", title: "뱃지", body: "방문·소통·운동·흡연·샌드백·보스맵·노래 7개 카테고리. 조건을 채우면 축하 팝업이 뜨고 기록은 저장돼요." },
  ],
  "❓ FAQ": [
    { icon: "👥", title: "다른 사람이 안 보여요", body: "우상단 👥 표시가 초록색인지 확인하세요. 회색이면 연결 중이거나 실패입니다. Ctrl+Shift+R로 새로고침해보세요." },
    { icon: "🔊", title: "소리가 안 나요", body: "브라우저 정책상 한 번 클릭한 뒤에야 소리가 재생돼요. 상단 ♬ 바의 ▶를 눌러주세요." },
    { icon: "💾", title: "진행이 초기화돼요", body: "방문 횟수·뱃지·집 비밀번호·받은 편지를 빼면 대부분은 새로고침 시 초기화됩니다(데모 단계)." },
    { icon: "⌨️", title: "글자가 안 쳐져요", body: "입력창을 클릭한 뒤 입력하세요. 입력 중에는 이동키가 작동하지 않습니다." },
  ],
};

function HelpBody({ onGo }) {
  const [cat, setCat] = useState(HELP_CATS[0]);
  const list = HELP_DATA[cat] || [];
  return (
    <div>
      <div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 22 }}>📖</span>
            <b style={{ flex: 1, fontSize: 15 }}>에코타운 사용설명서</b>
          </div>
          <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
            {HELP_CATS.map((c) => (
              <button key={c} onClick={() => setCat(c)} style={{ cursor: "pointer", fontFamily: "'DotGothic16', monospace", fontSize: 11, padding: "6px 9px", borderRadius: 16, border: `2px solid ${C.ink}`, background: cat === c ? "linear-gradient(180deg,#3fa07a,#1d6b4a)" : C.white, color: cat === c ? C.white : C.ink, fontWeight: "bold" }}>{c}</button>
            ))}
          </div>
          <div style={{ maxHeight: 330, overflow: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {list.map((it, i) => (
              <div key={i} style={{ background: C.white, border: `2px solid ${C.ink}`, borderRadius: 10, padding: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 20 }}>{it.icon}</span>
                  <b style={{ flex: 1, fontSize: 14 }}>{it.title}</b>
                  {it.go && <PxButton tone="blue" onClick={() => onGo(it.go)} style={{ fontSize: 10, padding: "5px 9px" }}>▶ {it.goLabel || "이동하기"}</PxButton>}
                </div>
                <div style={{ fontSize: 12.5, color: C.inkSoft, lineHeight: 1.7 }}>{it.body}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: C.inkSoft, textAlign: "center", marginTop: 10 }}>▶ 버튼을 누르면 해당 장소로 바로 이동해요</div>
        </div>
      </div>
    </div>
  );
}

function BadgeBody({ stats }) {
  const [cat, setCat] = useState("방문");
  const list = BADGES.filter((b) => b.cat === cat);
  const have = (b) => (stats[b.stat] || 0) >= b.need;
  const total = BADGES.filter(have).length;
  return (
    <div>
      <div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 22 }}>🏅</span>
            <b style={{ flex: 1, fontSize: 15 }}>뱃지</b>
            <span style={{ fontSize: 12, color: C.inkSoft }}>{total}/{BADGES.length}</span>
          </div>
          <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
            {BADGE_CATS.map((c) => (
              <PxButton key={c} tone={cat === c ? "good" : "wood"} onClick={() => setCat(c)} style={{ flex: 1, minWidth: 58, fontSize: 11, padding: "6px 4px" }}>{c}</PxButton>
            ))}
          </div>
          <div style={{ maxHeight: 320, overflow: "auto", display: "flex", flexDirection: "column", gap: 7 }}>
            {list.map((b) => {
              const cur = stats[b.stat] || 0;
              const got = cur >= b.need;
              const pct = Math.min(100, Math.round((cur / b.need) * 100));
              return (
                <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, background: got ? C.white : "#e9e3d6", border: `2px solid ${C.ink}`, borderRadius: 10, padding: "9px 11px", opacity: got ? 1 : 0.85 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, background: got ? "radial-gradient(circle at 35% 30%,#fffbe8,#ffd75e)" : "#c9c3b6", border: `2px solid ${C.ink}`, filter: got ? "none" : "grayscale(1)" }}>{got ? b.icon : "🔒"}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: "bold" }}>{got ? b.name : "???"}</div>
                    <div style={{ fontSize: 11, color: C.inkSoft }}>{b.desc}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <div style={{ flex: 1, height: 7, background: "#ddd6c6", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: got ? C.good : "#b9ad94" }} />
                      </div>
                      <span style={{ fontSize: 10, color: C.inkSoft }}>{Math.min(cur, b.need)}/{b.need}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function InventoryBody({ gems, outfit, ownedClothes, ikeaOwned, houseSkin, vehicle, myFurni, thanksInv, onEquipCloth, onToggleIkea, carrying = null, onGiftAct = () => {} }) {
  const [tab, setTab] = useState("etc");
  const TABS = { etc: "🎁 선물함", vehicle: "🚲 탈것", cloth: "👕 의류", furni: "🛋 가구", house: "🏠 외관" };
  const clothList = [];
  Object.keys(CLOTHES).forEach((cat) => CLOTHES[cat].forEach((it) => { if (ownedClothes[it.id]) clothList.push({ ...it, cat }); }));
  const furniList = IKEA_ITEMS.furni.filter((it) => ikeaOwned[it.id]);
  const vehList = IKEA_ITEMS.vehicle.filter((it) => ikeaOwned[it.id]);
  const houseList = IKEA_ITEMS.house.filter((it) => ikeaOwned[it.id]);
  const empty = (t) => <div style={{ fontSize: 12, color: C.inkSoft, padding: 16, textAlign: "center" }}>{t}</div>;

  return (
    <div>
      <div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 22 }}>🎒</span>
            <b style={{ flex: 1, fontSize: 14 }}>인벤토리</b>
            <GemBadge kind="gold" amount={gems} />
          </div>
          <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
            {Object.keys(TABS).map((k) => (
              <PxButton key={k} tone={tab === k ? "good" : "wood"} onClick={() => setTab(k)} style={{ flex: 1, minWidth: 70, fontSize: 10, padding: "6px 4px" }}>{TABS[k]}</PxButton>
            ))}
          </div>

          <div style={{ maxHeight: 300, overflow: "auto" }}>
            {tab === "cloth" && (clothList.length === 0 ? empty("아직 산 옷이 없어요. 무신사에 가보세요! 🛍️") : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {clothList.map((it) => {
                  const on = outfit[it.cat] && outfit[it.cat].id === it.id;
                  return (
                    <button key={it.id} onClick={() => onEquipCloth(it.cat, it)} style={{ cursor: "pointer", background: on ? C.gem : C.white, border: `3px solid ${C.ink}`, padding: 7, textAlign: "center", fontFamily: "'DotGothic16', monospace" }}>
                      <div style={{ height: 34, background: it.color, border: `2px solid ${C.ink}` }} />
                      <div style={{ fontSize: 10, marginTop: 3 }}>{it.name}</div>
                      <div style={{ fontSize: 10, color: on ? C.ink : C.inkSoft, fontWeight: "bold" }}>{on ? "착용중 ✓" : "착용하기"}</div>
                    </button>
                  );
                })}
              </div>
            ))}

            {tab === "furni" && (furniList.length === 0 ? empty("가구가 없어요. 이케아에 가보세요! 🛒") : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {furniList.map((it) => {
                  const on = myFurni.includes(it.id);
                  return (
                    <button key={it.id} onClick={() => onToggleIkea("furni", it)} style={{ cursor: "pointer", background: on ? C.gem : C.white, border: `3px solid ${C.ink}`, padding: 7, textAlign: "center", fontFamily: "'DotGothic16', monospace" }}>
                      <div style={{ fontSize: 26 }}>{it.emoji}</div>
                      <div style={{ fontSize: 10 }}>{it.name}</div>
                      <div style={{ fontSize: 10, color: on ? C.ink : C.inkSoft, fontWeight: "bold" }}>{on ? "배치됨 ✓" : "배치하기"}</div>
                    </button>
                  );
                })}
              </div>
            ))}

            {tab === "vehicle" && (vehList.length === 0 ? empty("탈것이 없어요. 이케아 교통수단 코너로! 🚲") : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {vehList.map((it) => {
                  const on = vehicle && vehicle.id === it.id;
                  return (
                    <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 8, background: on ? C.gem : C.white, border: `3px solid ${C.ink}`, padding: "7px 9px" }}>
                      <span style={{ fontSize: 24 }}>{it.emoji}</span>
                      <span style={{ flex: 1, fontSize: 12 }}><b>{it.name}</b><br /><span style={{ fontSize: 10, color: C.inkSoft }}>속도 x{it.speed}</span></span>
                      <PxButton tone={on ? "ink" : "good"} onClick={() => onToggleIkea("vehicle", it)} style={{ fontSize: 10, padding: "5px 8px" }}>{on ? "내리기" : "타기"}</PxButton>
                    </div>
                  );
                })}
              </div>
            ))}

            {tab === "house" && (houseList.length === 0 ? empty("집 외관이 없어요. 이케아 집 외관 코너로! 🏠") : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {houseList.map((it) => {
                  const on = houseSkin && houseSkin.id === it.id;
                  return (
                    <button key={it.id} onClick={() => onToggleIkea("house", it)} style={{ cursor: "pointer", background: on ? C.gem : C.white, border: `3px solid ${C.ink}`, padding: 7, textAlign: "center", fontFamily: "'DotGothic16', monospace" }}>
                      <div style={{ height: 34, background: it.wall, border: `2px solid ${C.ink}`, position: "relative" }}>
                        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 12, background: it.roof }} />
                      </div>
                      <div style={{ fontSize: 10, marginTop: 3 }}>{it.name}</div>
                      <div style={{ fontSize: 10, color: on ? C.ink : C.inkSoft, fontWeight: "bold" }}>{on ? "적용중 ✓" : "적용하기"}</div>
                    </button>
                  );
                })}
              </div>
            ))}

            {tab === "etc" && (thanksInv.length === 0 ? empty("소지품이 없어요. 감사의 방에서 선물을 사보세요 🎁") : (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {thanksInv.map((it, i) => {
                  const acts = itemActs(it);
                  const held = carrying && carrying._i === i;
                  return (
                    <div key={i} style={{ background: held ? "#fff5d6" : C.white, border: `3px solid ${C.ink}`, borderRadius: 8, padding: 9 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <span style={{ fontSize: 28 }}>{it.emoji || "🎁"}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: "bold" }}>{it.name}</div>
                          <div style={{ fontSize: 10, color: C.inkSoft }}>{it.from ? `🎀 ${it.from}님의 선물` : "내 소지품"}{held ? " · 🙌 들고 있는 중" : ""}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 5, marginTop: 7, flexWrap: "wrap" }}>
                        {acts.map((a) => {
                          const meta = ACT_META[a];
                          const isCarry = a === "carry";
                          return (
                            <PxButton key={a} tone={isCarry && held ? "ink" : meta.tone}
                              onClick={() => onGiftAct(a, it, i)}
                              style={{ flex: "1 1 92px", fontSize: 11, padding: "8px 6px" }}>
                              {isCarry && held ? "🙌 내려놓기" : meta.label}
                            </PxButton>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeedbackBody({ onDone, myName = "", myUid = "", list = [], onSend, onDelete, onCheck }) {
  const [text, setText] = useState("");
  const [anon, setAnon] = useState(false);
  const [sent, setSent] = useState(false);
  const [filter, setFilter] = useState("all");
  const submit = () => {
    const t = text.trim(); if (!t) return;
    onSend && onSend(t, anon);
    setText(""); setSent(true);
    setTimeout(() => setSent(false), 1600);
  };
  const shown = list.filter((f) => filter === "all" || (filter === "todo" ? !f.done : !!f.done));
  const doneCount = list.filter((f) => f.done).length;

  return (
    <div>
      <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 8, lineHeight: 1.7 }}>
        개선 아이디어나 버그를 알려주세요.<br />
        <b>올린 글은 마을 주민 모두에게 보여요.</b>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="예: 회의실 초대장이 안 보여요" rows={3}
        style={{ width: "100%", boxSizing: "border-box", border: `3px solid ${C.ink}`, padding: 9, fontSize: 13, background: C.white, fontFamily: "'DotGothic16', monospace", resize: "vertical" }} />

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, cursor: "pointer", fontSize: 12.5, fontWeight: "bold" }}>
        <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} style={{ width: 17, height: 17, cursor: "pointer" }} />
        🕶 익명으로 올리기
        <span style={{ fontWeight: "normal", color: C.inkSoft, fontSize: 11 }}>
          — 작성자가 「{anon ? "익명" : (myName || "나")}」 으로 표시돼요
        </span>
      </label>

      <PxButton tone="good" disabled={!text.trim()} onClick={submit} style={{ width: "100%", marginTop: 8, padding: 11, fontSize: 13 }}>
        {sent ? "올렸어요! 감사합니다 ✨" : "📮 모두에게 올리기"}
      </PxButton>

      <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "14px 0 7px", flexWrap: "wrap" }}>
        <b style={{ fontSize: 11.5 }}>📋 올라온 피드백 {list.length}개</b>
        <span style={{ fontSize: 10.5, color: C.good }}>· 확인 {doneCount}</span>
        <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
          {[["all", "전체"], ["todo", "미확인"], ["done", "확인됨"]].map(([k, lb]) => (
            <button key={k} type="button" onClick={() => setFilter(k)}
              style={{ cursor: "pointer", fontFamily: "'DotGothic16', monospace", fontSize: 10.5, padding: "4px 9px", borderRadius: 12, border: `2px solid ${C.ink}`, background: filter === k ? C.gem : C.white, fontWeight: "bold" }}>{lb}</button>
          ))}
        </div>
      </div>

      <div style={{ maxHeight: 250, overflow: "auto", display: "flex", flexDirection: "column", gap: 7 }}>
        {shown.length === 0 ? (
          <div style={{ fontSize: 12, color: C.inkSoft, textAlign: "center", padding: 22, lineHeight: 1.8 }}>
            {list.length === 0 ? <>아직 올라온 피드백이 없어요 📭<br />첫 의견을 남겨보세요!</> : "해당하는 피드백이 없어요"}
          </div>
        ) : shown.map((f) => {
          const mine = !!myUid && f.uid === myUid;
          return (
            <div key={f.id} style={{ background: f.done ? "#eef6ef" : C.white, border: `2px solid ${C.ink}`, borderLeft: `6px solid ${f.done ? C.good : C.gem}`, borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 12.5, lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word", textDecoration: f.done ? "line-through" : "none", color: f.done ? C.inkSoft : C.ink }}>{f.text}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, color: C.inkSoft }}>{f.by === "익명" ? "🕶" : "✍️"} {f.by} · {f.at}</span>
                {mine && <span style={{ fontSize: 9, background: C.gem, border: `1px solid ${C.ink}`, borderRadius: 8, padding: "0 5px" }}>내 글</span>}
                <label style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 11, fontWeight: "bold", color: f.done ? C.good : C.inkSoft }}>
                  <input type="checkbox" checked={!!f.done} onChange={(e) => onCheck && onCheck(f.id, e.target.checked)} style={{ width: 15, height: 15, cursor: "pointer" }} />
                  확인
                </label>
                {mine && <button type="button" onClick={() => { if (window.confirm("내 피드백을 삭제할까요?")) onDelete && onDelete(f.id); }}
                  title="삭제" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: C.inkSoft }}>🗑</button>}
              </div>
              {f.done && f.doneBy && <div style={{ fontSize: 9.5, color: C.good, marginTop: 3 }}>✓ {f.doneBy} 님이 확인함</div>}
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: C.inkSoft, textAlign: "center", marginTop: 9 }}>확인 체크는 누구나 할 수 있고, 삭제는 작성자만 가능해요</div>
    </div>
  );
}

/* 프로필 데이터 */
const MY_PROFILE = {
  avatar: "🧑‍💻", name: "나 (플레이어)", job: "주니어 개발자",
  stats: { 체력: 78, 마나: 64, 집중: 82, 친화: 70 },
  equipment: ["🎧 노이즈캔슬 헤드셋", "☕ 무한 리필 텀블러", "💻 듀얼 모니터", "⌨️ 기계식 키보드"],
  achievements: ["🏅 첫 퀘스트 클리어", "🌴 치앙마이 렌트 성공", "💌 감사 포스트잇 10개", "🔥 7일 연속 출근"],
  quests: ["어플 v2.0 출시 준비", "월말 결산 정산하기", "워크샵 발표 자료 만들기"],
  affiliation: "ECHO TOWN · 개발팀",
};
const PROFILES = [
  { avatar: "👩‍🎨", name: "도희", job: "프로덕트 디자이너", stats: { 체력: 70, 마나: 80, 집중: 88, 친화: 85 }, equipment: ["🖊️ 태블릿펜", "🎨 컬러칩", "📐 그리드 자"], achievements: ["🏆 리디자인 대상", "✨ 디자인 시스템 구축"], quests: ["릴스방 UI 개편"], affiliation: "ECHO TOWN · 디자인팀" },
  { avatar: "🧑‍💼", name: "창민", job: "소싱 MD", stats: { 체력: 82, 마나: 60, 집중: 75, 친화: 90 }, equipment: ["📋 검수 클립보드", "🧦 샘플 양말", "📞 업체 다이얼"], achievements: ["🥇 항균양말 라인 런칭", "🤝 협력사 30곳"], quests: ["항균속옷 인증 미팅"], affiliation: "ECHO TOWN · 커머스팀" },
  { avatar: "👧", name: "유리", job: "그로스 마케터", stats: { 체력: 68, 마나: 74, 집중: 80, 친화: 88 }, equipment: ["📈 대시보드", "📣 캠페인 메가폰"], achievements: ["🚀 CTR 2배 달성"], quests: ["여름 프로모션 기획"], affiliation: "ECHO TOWN · 마케팅팀" },
  { avatar: "🧑‍🎬", name: "봉준호", job: "영상 감독", stats: { 체력: 72, 마나: 92, 집중: 95, 친화: 78 }, equipment: ["🎬 클래퍼보드", "🎥 시네마 카메라", "🕶️ 뿔테 안경"], achievements: ["🏆 마을 영상제 대상", "🎞️ 단편 12편"], quests: ["영상스쿨 특강 준비"], affiliation: "영상스쿨 · 마스터" },
  { avatar: "🗿", name: "황혼의 파수꾼", job: "디자인 스승", stats: { 체력: 99, 마나: 99, 집중: 99, 친화: 60 }, equipment: ["🛡️ 황혼의 방패", "🖌️ 전설의 붓"], achievements: ["🌌 마을 수호 300일"], quests: ["디자인스쿨 신입 지도"], affiliation: "디자인스쿨 · 수호자" },
];

function ProfileDetail({ p, onBack }) {
  const st = p.online === undefined ? null : (p.online ? "🟢 접속 중" : "⚪ 오프라인");
  const Row = ({ label, children }) => (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 11, color: C.inkSoft, marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
  return (
    <div>
      {onBack && <PxButton tone="ink" onClick={onBack} style={{ fontSize: 11, padding: "5px 9px", marginBottom: 10 }}>← 목록</PxButton>}
      <div style={{ display: "flex", alignItems: "center", gap: 12, background: C.white, border: `3px solid ${C.ink}`, padding: 12 }}>
        <div style={{ fontSize: 44 }}>{p.avatar}</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: "bold" }}>{p.name}</div>
          <div style={{ fontSize: 12, color: C.inkSoft }}>💼 {p.job}{st ? ` · ${st}` : ""}</div>
          <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 2 }}>🏷️ {p.affiliation}</div>
        </div>
      </div>
      <Row label="📊 스탯">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {Object.entries(p.stats).map(([k, v]) => (
            <div key={k} style={{ background: C.white, border: `2px solid ${C.ink}`, padding: "4px 8px" }}>
              <div style={{ fontSize: 11, display: "flex", justifyContent: "space-between" }}><span>{k}</span><b>{v}</b></div>
              <div style={{ height: 8, background: "#e2d3ab", border: `1px solid ${C.ink}`, marginTop: 3 }}><div style={{ height: "100%", width: `${v}%`, background: C.good }} /></div>
            </div>
          ))}
        </div>
      </Row>
      <Row label="🎒 장비"><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{p.equipment.map((e, i) => <span key={i} style={{ background: C.white, border: `2px solid ${C.ink}`, padding: "3px 7px", fontSize: 12 }}>{e}</span>)}</div></Row>
      <Row label="🏅 업적"><div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{p.achievements.map((a, i) => <div key={i} style={{ fontSize: 12 }}>{a}</div>)}</div></Row>
      <Row label="📜 진행중인 퀘스트"><div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{p.quests.map((q, i) => <div key={i} style={{ fontSize: 12, background: C.white, border: `2px solid ${C.ink}`, padding: "4px 8px" }}>▶ {q}</div>)}</div></Row>
    </div>
  );
}
function DMChatModal({ person, onClose, thread = [], onSend, online = false, myName = "" }) {
  const [text, setText] = useState("");
  const dmBoxRef = useAutoScroll(thread.length);
  const send = () => {
    const t = text.trim(); if (!t) return;
    onSend && onSend(t);
    setText("");
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 165, padding: 14 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 380, maxHeight: "calc(100vh - 28px)", overflowY: "auto" }}>
        <Panel style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "#5b8def", color: C.white, borderBottom: `3px solid ${C.ink}` }}>
            <span style={{ fontSize: 22 }}>{person.avatar || "🧑"}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b style={{ fontSize: 14 }}>{person.name}</b>
              <div style={{ fontSize: 10, opacity: 0.9 }}>{online ? "🟢 접속 중" : "⚪ 오프라인 — 접속하면 받아봐요"}</div>
            </div>
            <PxButton tone="ink" onClick={onClose} style={{ fontSize: 11, padding: "5px 9px" }}>✕</PxButton>
          </div>
          <div ref={dmBoxRef} style={{ height: 260, overflow: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 6, background: "#efe6d2" }}>
            {thread.length === 0 && (
              <div style={{ fontSize: 12, color: C.inkSoft, textAlign: "center", padding: 24, lineHeight: 1.8 }}>
                아직 주고받은 메세지가 없어요 💬<br />{person.name}님에게 먼저 말을 걸어보세요!
              </div>
            )}
            {thread.map((m, i) => (
              <div key={i} style={{ alignSelf: m.me ? "flex-end" : "flex-start", maxWidth: "78%" }}>
                <div style={{ background: m.me ? C.gem : C.white, border: `2px solid ${C.ink}`, padding: "5px 9px", fontSize: 13, wordBreak: "break-word" }}>{m.text}</div>
                <div style={{ fontSize: 9, color: C.inkSoft, textAlign: m.me ? "right" : "left", marginTop: 2 }}>{m.at}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, padding: 8, borderTop: `3px solid ${C.ink}` }}>
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="메시지 입력 후 Enter" style={{ flex: 1, minWidth: 0, padding: 8, border: `3px solid ${C.ink}`, fontFamily: "'DotGothic16', monospace", fontSize: 13, background: C.white }} />
            <PxButton tone="good" onClick={send} style={{ fontSize: 12, padding: "8px 12px" }}>전송</PxButton>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function FaceTalkModal({ person, onClose }) {
  const [sec, setSec] = useState(0);
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  useEffect(() => { const iv = setInterval(() => setSec((s) => s + 1), 1000); return () => clearInterval(iv); }, []);
  const mm = String(Math.floor(sec / 60)).padStart(2, "0"), ss = String(sec % 60).padStart(2, "0");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 165, padding: 14 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, maxHeight: "calc(100vh - 28px)", overflowY: "auto" }}>
        <Panel style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", background: C.ink, color: C.white, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <b style={{ fontSize: 13 }}>📞 페이스톡 · {person.name}</b>
            <span style={{ fontSize: 12, color: C.good }}>● 연결됨 {mm}:{ss}</span>
          </div>
          <div style={{ position: "relative", height: 240, background: "#2a3550", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: 96 }}>{cam ? person.avatar : "📷"}</div>
            <div style={{ position: "absolute", bottom: 8, left: 8, background: "rgba(0,0,0,0.5)", color: C.white, fontSize: 11, padding: "2px 8px" }}>{person.name} {mic ? "" : "🔇"}</div>
            <div style={{ position: "absolute", bottom: 8, right: 8, width: 70, height: 90, background: "#3a3550", border: `2px solid ${C.white}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34 }}>{cam ? "🧑" : "📷"}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, padding: 12, background: C.parch }}>
            <PxButton tone={mic ? "wood" : "danger"} onClick={() => setMic((v) => !v)} style={{ fontSize: 18, padding: "10px 14px" }}>{mic ? "🎙️" : "🔇"}</PxButton>
            <PxButton tone={cam ? "wood" : "danger"} onClick={() => setCam((v) => !v)} style={{ fontSize: 18, padding: "10px 14px" }}>{cam ? "📷" : "🚫"}</PxButton>
            <PxButton tone="danger" onClick={onClose} style={{ fontSize: 14, padding: "10px 18px" }}>📵 종료</PxButton>
          </div>
        </Panel>
      </div>
    </div>
  );
}
/* 마을주민들 목록 (메뉴 안에 들어감) */
function VillagersBody({ people = [], onDm, onCall }) {
  const [sel, setSel] = useState(null);
  const [q, setQ] = useState("");
  const list = (people.length ? people : PROFILES).filter((p) => !q.trim() || (p.name || "").includes(q.trim()));
  if (sel) return <ProfileDetail p={sel} onBack={() => setSel(null)} />;
  return (
    <div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 주민 이름 검색"
        style={{ width: "100%", boxSizing: "border-box", padding: 8, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 13, background: C.white, marginBottom: 8 }} />
      <div style={{ display: "grid", gap: 8, maxHeight: 330, overflow: "auto" }}>
        {list.length === 0 && <div style={{ fontSize: 12, color: C.inkSoft, textAlign: "center", padding: 20 }}>주민을 찾지 못했어요 🤔</div>}
        {list.map((p) => (
          <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 8, background: C.white, border: `3px solid ${C.ink}`, padding: 9 }}>
            <button onClick={() => setSel(p)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 9, flex: 1, minWidth: 0, textAlign: "left", padding: 0 }}>
              <span style={{ fontSize: 28 }}>{p.avatar}</span>
              <span style={{ minWidth: 0 }}><b style={{ fontSize: 13 }}>{p.name}</b>{p.me ? <span style={{ fontSize: 10, color: C.good }}> (나)</span> : null}<br /><span style={{ fontSize: 11, color: C.inkSoft }}>{p.online === undefined ? "💼 " + p.job : p.job}</span></span>
            </button>
            {!p.me && <PxButton tone="blue" onClick={() => onDm && onDm(p)} style={{ fontSize: 11, padding: "6px 8px" }}>💬 DM</PxButton>}
            {!p.me && <PxButton tone="good" onClick={() => onCall && onCall(p)} style={{ fontSize: 11, padding: "6px 8px" }}>📞</PxButton>}
          </div>
        ))}
      </div>
    </div>
  );
}
/* ============ 우측 하단 도크 (메뉴 · 내 프로필 · 안내책자 · 메세지) ============ */
function Sheet({ icon, title, onClose, tabs, tab, setTab, maxW = 470, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 95, padding: 14 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: maxW, maxHeight: "90%", overflow: "auto" }}>
        <Panel style={{ padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 22 }}>{icon}</span>
            <b style={{ flex: 1, fontSize: 15 }}>{title}</b>
            <PxButton tone="ink" onClick={onClose} style={{ fontSize: 11, padding: "5px 9px" }}>✕</PxButton>
          </div>
          {tabs && (
            <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
              {tabs.map((t) => (
                <button key={t.k} onClick={() => setTab(t.k)} style={{ position: "relative", cursor: "pointer", fontFamily: "'DotGothic16', monospace", fontSize: 11, padding: "7px 10px", borderRadius: 16, border: `2px solid ${C.ink}`, background: tab === t.k ? "linear-gradient(180deg,#3fa07a,#1d6b4a)" : C.white, color: tab === t.k ? C.white : C.ink, fontWeight: "bold" }}>
                  {t.label}
                  {t.n > 0 && <span style={{ marginLeft: 4, background: C.danger, color: C.white, border: `1px solid ${C.ink}`, borderRadius: 8, fontSize: 9, padding: "0 4px" }}>{t.n}</span>}
                </button>
              ))}
            </div>
          )}
          {children}
        </Panel>
      </div>
    </div>
  );
}

/* 🧑 내 프로필 (프로필 + 인벤토리 + 뱃지) */
function MyPanel({ onClose, myName, gems, gold = 0, lifetime, hp, mp, level = 1, stats, outfit, ownedClothes, ikeaOwned, houseSkin, vehicle, myFurni, thanksInv, onEquipCloth, onToggleIkea, day, profile, onProfile, carrying, onGiftAct, initialTab, skills = [] }) {
  const [tab, setTab] = useState(initialTab || "me");
  const [editOpen, setEditOpen] = useState(false);
  const prof = profile || { job: "", avatar: "🧑‍💻", look: DEFAULT_LOOK };
  const look = prof.look || DEFAULT_LOOK;
  const badgeCount = BADGES.filter((b) => (stats[b.stat] || 0) >= b.need).length;
  const invCount = Object.keys(ownedClothes).length + Object.keys(ikeaOwned).length + thanksInv.length;
  const me = {
    avatar: prof.avatar || "🧑‍💻", name: myName || "나 (플레이어)", job: (prof.job || "에코타운 주민") + ` · Lv.${level}`,
    stats: { 체력: Math.round(hp), 마나: Math.round(mp), 집중: Math.min(99, 50 + (stats.quest || 0) * 3), 친화: Math.min(99, 50 + (stats.chat || 0)) },
    equipment: [outfit.top ? `👕 ${outfit.top.name}` : "👕 기본 상의", outfit.bottom ? `👖 ${outfit.bottom.name}` : "👖 기본 하의", outfit.shoes ? `👟 ${outfit.shoes.name}` : "👟 기본 신발", vehicle ? `${vehicle.emoji} ${vehicle.name}` : "🚶 도보"],
    achievements: BADGES.filter((b) => (stats[b.stat] || 0) >= b.need).slice(-6).map((b) => `${b.icon} ${b.name}`).concat(badgeCount === 0 ? ["아직 뱃지가 없어요"] : []),
    quests: [`📅 DAY ${day} 진행 중`, `🗺 클리어한 퀘스트 ${stats.quest || 0}개`, `👹 잡은 보스 ${stats.boss || 0}마리`],
    affiliation: "ECHO TOWN",
  };
  return (
    <Sheet icon="🧑" title="내 프로필" onClose={onClose} tab={tab} setTab={setTab}
      tabs={[{ k: "me", label: "🧑 프로필" }, { k: "inv", label: "🎒 선물함·인벤토리" }, { k: "badge", label: "🏅 뱃지" }]}>
      {tab === "me" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1, background: C.white, border: `2px solid ${C.ink}`, padding: "7px 9px", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: C.inkSoft }}>골드</div><div style={{ fontSize: 15, fontWeight: "bold" }}>🪙 {fmt(gold)}</div>
            </div>
            <div style={{ flex: 1, background: C.white, border: `2px solid ${C.ink}`, padding: "7px 9px", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: C.inkSoft }}>젬</div><div style={{ fontSize: 15, fontWeight: "bold" }}>💎 {fmt(gems)}</div>
            </div>
            <div style={{ flex: 1, background: C.white, border: `2px solid ${C.ink}`, padding: "7px 9px", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: C.inkSoft }}>뱃지</div><div style={{ fontSize: 15, fontWeight: "bold" }}>🏅 {badgeCount}</div>
            </div>
            <div style={{ flex: 1, background: C.white, border: `2px solid ${C.ink}`, padding: "7px 9px", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: C.inkSoft }}>소지품</div><div style={{ fontSize: 15, fontWeight: "bold" }}>🎒 {invCount}</div>
            </div>
          </div>

          {/* ===== 프로필 · 외모 꾸미기 ===== */}
          <div style={{ background: C.white, border: `3px solid ${C.ink}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ background: "#efe6d2", border: `2px solid ${C.ink}`, borderRadius: 8, padding: "6px 10px" }}>
                <Hero size={44} look={look} outfit={outfit} carry={carrying} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: "bold" }}>{prof.avatar} {myName || "나"}</div>
                <div style={{ fontSize: 11, color: C.inkSoft }}>Lv.{level} · {prof.job || "직업 미설정"}</div>
              </div>
              <PxButton tone={editOpen ? "ink" : "blue"} onClick={() => setEditOpen((v) => !v)} style={{ fontSize: 11, padding: "6px 10px" }}>{editOpen ? "닫기" : "✏️ 꾸미기"}</PxButton>
            </div>

            {editOpen && (
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: "bold", marginBottom: 4 }}>💼 직업 (자유롭게)</div>
                  <input value={prof.job} onChange={(e) => onProfile({ job: e.target.value })} maxLength={20} placeholder="예: 콘텐츠 기획자"
                    style={{ width: "100%", boxSizing: "border-box", padding: 8, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 13 }} />
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: "bold", marginBottom: 4 }}>🙂 프로필 아이콘</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 5 }}>
                    <input value={prof.avatar} onChange={(e) => onProfile({ avatar: e.target.value })} maxLength={4}
                      style={{ width: 60, textAlign: "center", padding: 8, border: `2px solid ${C.ink}`, borderRadius: 6, fontSize: 20 }} />
                    <span style={{ fontSize: 11, color: C.inkSoft }}>직접 입력하거나 아래에서 골라주세요</span>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {["🧑","👩","🧑‍💻","👨‍💼","👩‍🎨","🧑‍🍳","👩‍🔬","🧑‍🎤","👨‍🌾","👩‍🏫","🐱","🐶","🦊","🐻","🌱","⭐","🔥","🍀"].map((e) => (
                      <button key={e} onClick={() => onProfile({ avatar: e })} style={{ cursor: "pointer", fontSize: 19, width: 34, height: 34, borderRadius: 6, border: `2px solid ${C.ink}`, background: prof.avatar === e ? C.gem : C.white }}>{e}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: "bold", marginBottom: 4 }}>🎨 얼굴색</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {SKIN_TONES.map((t) => (
                      <button key={t.id} onClick={() => onProfile({ look: { ...look, skin: t.color } })} title={t.name}
                        style={{ cursor: "pointer", width: 36, height: 36, borderRadius: "50%", background: t.color, border: `3px solid ${look.skin === t.color ? C.good : C.ink}` }} />
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: "bold", marginBottom: 4 }}>💇 머리색</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {HAIR_COLORS.map((t) => (
                      <button key={t.id} onClick={() => onProfile({ look: { ...look, hair: t.color } })} title={t.name}
                        style={{ cursor: "pointer", width: 36, height: 36, borderRadius: "50%", background: t.color, border: `3px solid ${look.hair === t.color ? C.good : C.ink}` }} />
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: "bold", marginBottom: 4 }}>✂️ 헤어스타일</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {HAIR_STYLES.map((h) => (
                      <PxButton key={h.id} tone={look.hairStyle === h.id ? "good" : "wood"} onClick={() => onProfile({ look: { ...look, hairStyle: h.id } })} style={{ flex: "1 1 70px", fontSize: 11, padding: "8px 6px" }}>{h.name}</PxButton>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 🧠 배운 사고 스킬 */}
          <div style={{ background: C.white, border: `3px solid ${C.ink}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>🧠</span>
              <b style={{ flex: 1, fontSize: 14 }}>사고 스킬</b>
              <span style={{ fontSize: 11.5, color: C.inkSoft }}>{(skills || []).length} / {SKILLS.length}</span>
            </div>
            {(skills || []).length === 0 ? (
              <div style={{ fontSize: 11.5, color: C.inkSoft, textAlign: "center", padding: 14, lineHeight: 1.7 }}>
                아직 배운 스킬이 없어요 🧠<br />🗺 보스맵 하드모드 퀘스트를 깨면 하나씩 배워요
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 6 }}>
                {SKILLS.filter((sk) => (skills || []).includes(sk.id)).map((sk) => (
                  <div key={sk.id} title={sk.desc} style={{ background: "#f2ecff", border: `2px solid ${C.ink}`, borderRadius: 8, padding: "8px 5px", textAlign: "center" }}>
                    <div style={{ fontSize: 22 }}>{sk.icon}</div>
                    <div style={{ fontSize: 11.5, fontWeight: "bold", marginTop: 2 }}>{sk.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <ProfileDetail p={me} />
        </div>
      )}
      {tab === "inv" && <InventoryBody carrying={carrying} onGiftAct={onGiftAct} gems={gold} outfit={outfit} ownedClothes={ownedClothes} ikeaOwned={ikeaOwned} houseSkin={houseSkin} vehicle={vehicle} myFurni={myFurni} thanksInv={thanksInv} onEquipCloth={onEquipCloth} onToggleIkea={onToggleIkea} />}
      {tab === "badge" && <BadgeBody stats={stats} />}
    </Sheet>
  );
}

/* 📖 안내책자 (사용설명서 + 코어사전) */
function GuideSheet({ onClose, onGo }) {
  const [tab, setTab] = useState("help");
  return (
    <Sheet icon="📖" title="안내책자" onClose={onClose} tab={tab} setTab={setTab}
      tabs={[{ k: "help", label: "📘 사용설명서" }, { k: "dict", label: "📚 코어사전" }]}>
      {tab === "help" && <HelpBody onGo={onGo} />}
      {tab === "dict" && (
        <div>
          <div style={{ background: C.white, border: `3px solid ${C.ink}`, borderRadius: 10, padding: 14 }}>
            <div style={{ textAlign: "center", fontSize: 40 }}>📚</div>
            <div style={{ textAlign: "center", fontSize: 15, fontWeight: "bold", margin: "8px 0 6px" }}>코어사전</div>
            <div style={{ fontSize: 12.5, color: C.inkSoft, lineHeight: 1.8 }}>
              에코타운에서 쓰는 우리만의 단어를 모아둔 사전이에요.<br />
              · 누구나 단어를 <b>등록 · 수정 · 삭제</b>할 수 있어요 (나무위키처럼)<br />
              · 🖼 <b>갤러리</b> 탭에서 사진을 올리고 한 줄 설명을 달 수 있어요<br />
              · 단어 검색과 최근 수정자가 표시돼요<br />
              · 마을 지도에서는 주민센터 왼쪽 위 📖 책 모양 건물이에요
            </div>
            <PxButton tone="good" onClick={() => onGo("coredict")} style={{ width: "100%", marginTop: 12, padding: 12, fontSize: 14 }}>📚 코어사전 열기</PxButton>
          </div>
        </div>
      )}
    </Sheet>
  );
}

/* ☰ 메뉴 (마을주민들 + 피드백) */
function MenuSheet({ onClose, people, onDm, onCall, sprites, userSprites, cutCfg, onSetCut, onSetSprite, onClearSprite, onClearSprites, myName, myUid, feedback = [], onFeedback, onDelFeedback, onCheckFeedback }) {
  const [tab, setTab] = useState("villagers");
  return (
    <Sheet icon="☰" title="메뉴" onClose={onClose} tab={tab} setTab={setTab}
      tabs={[{ k: "villagers", label: "🏘️ 마을주민들" }, { k: "skin", label: "🎨 건물 이미지" }, { k: "fb", label: "⚙️ 피드백" }]}>
      {tab === "villagers" && <VillagersBody people={people} onDm={onDm} onCall={onCall} />}
      {tab === "skin" && <SpriteSkinBody sprites={sprites} userSprites={userSprites} cutCfg={cutCfg} onSetCut={onSetCut} onSet={onSetSprite} onClear={onClearSprite} onClearAll={onClearSprites} />}
      {tab === "fb" && <FeedbackBody onDone={onClose} myName={myName} myUid={myUid} list={feedback} onSend={onFeedback} onDelete={onDelFeedback} onCheck={onCheckFeedback} />}
    </Sheet>
  );
}

/* ✉️ 메세지함 */
function MsgRow({ icon, title, body, at, unread, right, onClick }) {
  return (
    <div onClick={onClick} style={{ display: "flex", gap: 9, alignItems: "flex-start", background: unread ? "#fffbe8" : C.white, border: `2px solid ${C.ink}`, borderLeft: `6px solid ${unread ? C.danger : C.parchEdge}`, borderRadius: 8, padding: 10, cursor: onClick ? "pointer" : "default" }}>
      <span style={{ fontSize: 22, lineHeight: 1 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: "bold", wordBreak: "break-word" }}>{title}{unread && <span style={{ marginLeft: 5, color: C.danger, fontSize: 10 }}>● NEW</span>}</div>
        {body && <div style={{ fontSize: 12, color: C.inkSoft, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word", marginTop: 2 }}>{body}</div>}
        {at && <div style={{ fontSize: 10, color: C.inkSoft, marginTop: 4 }}>🕐 {at}</div>}
      </div>
      {right}
    </div>
  );
}

function MessageCenter({ onClose, myName, box, notices, onReadAll, onAnswerInvite, onOpenDm, onCallBack, onGoMeeting }) {
  const [tab, setTab] = useState("notice");
  const empty = (t) => <div style={{ fontSize: 12, color: C.inkSoft, textAlign: "center", padding: 26, lineHeight: 1.8 }}>{t}</div>;
  const unread = (k) => (box[k] || []).filter((m) => !m.read).length;
  const nUnreadNotice = notices.filter((n) => !n.read).length;
  useEffect(() => { onReadAll && onReadAll(tab); }, [tab]);
  return (
    <Sheet icon="✉️" title="메세지함" onClose={onClose} tab={tab} setTab={setTab}
      tabs={[
        { k: "notice", label: "📢 공지", n: nUnreadNotice },
        { k: "invite", label: "📨 초대장", n: unread("invite") },
        { k: "gift", label: "🎁 선물·우편", n: unread("gift") },
        { k: "dm", label: "💬 메세지·DM", n: unread("dm") },
        { k: "call", label: "📵 부재중", n: unread("call") },
      ]}>
      <div style={{ maxHeight: 350, overflow: "auto", display: "flex", flexDirection: "column", gap: 7 }}>
        {tab === "notice" && (notices.length === 0 ? empty("새로운 공지사항이 없어요 📭") : notices.map((n) => (
          <MsgRow key={n.id} icon={n.type === "공지" ? "📢" : n.type === "모집" ? "🤝" : "🛠"} title={`[${n.type}] ${n.title}`} body={n.body} at={n.date} unread={!n.read} />
        )))}

        {tab === "invite" && ((box.invite || []).length === 0 ? empty("받은 초대장이 없어요 📭\n주민센터 회의실에서 초대장을 주고받을 수 있어요!") : (box.invite || []).map((m) => (
          <MsgRow key={m.id} icon="📨" unread={!m.read}
            title={`${m.from}님의 회의 초대장`}
            body={`🗓 ${m.when}\n📍 ${m.room}\n⏱ 예상 ${m.dur}`}
            at={m.at}
            right={
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <PxButton tone="blue" onClick={() => onGoMeeting(m)} style={{ fontSize: 10, padding: "5px 7px" }}>🚪 바로가기</PxButton>
                {m.answered ? <span style={{ fontSize: 10, color: m.answered === "ok" ? C.good : C.inkSoft, textAlign: "center" }}>{m.answered === "ok" ? "참석 ✓" : "불참"}</span> : (
                  <>
                    <PxButton tone="good" onClick={() => onAnswerInvite(m, true)} style={{ fontSize: 10, padding: "5px 7px" }}>참석</PxButton>
                    <PxButton tone="danger" onClick={() => onAnswerInvite(m, false)} style={{ fontSize: 10, padding: "5px 7px" }}>거절</PxButton>
                  </>
                )}
              </div>
            } />
        )))}

        {tab === "gift" && ((box.gift || []).length === 0 ? empty("받은 선물이나 편지가 없어요 📭") : (box.gift || []).map((m) => (
          <MsgRow key={m.id} icon={m.item ? "🎁" : "💌"} unread={!m.read}
            title={`${m.from}님이 ${m.item ? "선물을 보냈어요" : "편지를 남겼어요"}`}
            body={(m.item ? `${m.item.emoji || "🎁"} ${m.item.name}\n` : "") + (m.text || "")} at={m.at} />
        )))}

        {tab === "dm" && ((box.dm || []).length === 0 ? empty("받은 메세지가 없어요 📭\n메뉴 → 마을주민들에서 DM을 보낼 수 있어요!") : (box.dm || []).map((m) => (
          <MsgRow key={m.id} icon="💬" unread={!m.read} title={`${m.from}님의 메세지`} body={m.text} at={m.at}
            right={<PxButton tone="blue" onClick={() => onOpenDm(m.from)} style={{ fontSize: 10, padding: "5px 7px" }}>답장</PxButton>} />
        )))}

        {tab === "call" && ((box.call || []).length === 0 ? empty("부재중 통화가 없어요 📞") : (box.call || []).map((m) => (
          <MsgRow key={m.id} icon="📵" unread={!m.read} title={`${m.from}님의 부재중 통화`} body={m.reason || "받지 못한 통화예요"} at={m.at}
            right={<PxButton tone="good" onClick={() => onCallBack(m.from)} style={{ fontSize: 10, padding: "5px 7px" }}>📞 콜백</PxButton>} />
        )))}
      </div>
    </Sheet>
  );
}

function DockBtn({ icon, label, onClick, bg, badge, pixel }) {
  return (
    <button onClick={onClick} title={label} className="dock-btn" style={{ position: "relative", width: 52, height: 52, background: bg, border: `3px solid ${C.ink}`, borderRadius: 10, boxShadow: `0 3px 0 ${C.ink}`, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, color: C.white, fontFamily: "'DotGothic16', monospace", padding: 0 }}>
      {pixel ? (
        <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>{[0, 1, 2].map((i) => <span key={i} style={{ width: 20, height: 3, background: C.ink, display: "block" }} />)}</span>
      ) : <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>}
      <span style={{ fontSize: 8.5, color: pixel ? C.ink : C.white, fontWeight: "bold" }}>{label}</span>
      {badge > 0 && <span style={{ position: "absolute", right: -5, top: -5, background: C.danger, color: C.white, border: `2px solid ${C.ink}`, borderRadius: 9, fontSize: 9, padding: "0 4px", fontWeight: "bold" }}>{badge > 99 ? "99+" : badge}</span>}
    </button>
  );
}

function CornerDock({ onMenu, onProfile, onGuide, onMsg, msgCount, badgeCount }) {
  return (
    <div className="corner-dock" style={{ position: "fixed", right: 12, bottom: 12, zIndex: 62, display: "flex", gap: 7, background: C.parch, border: `3px solid ${C.ink}`, borderRadius: 14, padding: 7, boxShadow: `0 4px 0 ${C.parchEdge}, 0 8px 18px rgba(0,0,0,0.28)` }}>
      <DockBtn pixel label="메뉴" bg={C.gem} onClick={onMenu} />
      <DockBtn icon="🧑" label="내 프로필" bg="linear-gradient(180deg,#6fa8e8,#3a6fb5)" onClick={onProfile} badge={badgeCount} />
      <DockBtn icon="📖" label="안내책자" bg="linear-gradient(180deg,#7bbf8f,#2f7d5e)" onClick={onGuide} />
      <DockBtn icon="✉️" label="메세지" bg="linear-gradient(180deg,#e0a13d,#a86e13)" onClick={onMsg} badge={msgCount} />
    </div>
  );
}

/* 🎨 건물 이미지 바꾸기 */
function SpriteSkinBody({ sprites, userSprites = {}, cutCfg = {}, onSetCut, onSet, onClear, onClearAll }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState(null);
  const [urlFor, setUrlFor] = useState(null);
  const [url, setUrl] = useState("");
  const fileRef = useRef(null);
  const pendingRef = useRef(null);

  const say = (m) => { setErr(m); setTimeout(() => setErr(null), 2600); };
  const pickFile = (id) => { pendingRef.current = id; if (fileRef.current) fileRef.current.click(); };
  const onFile = async (e) => {
    const f = (e.target.files || [])[0];
    const id = pendingRef.current;
    if (fileRef.current) fileRef.current.value = "";
    if (!f || !id) return;
    if (!f.type.startsWith("image/")) { say("이미지 파일만 올릴 수 있어요"); return; }
    setBusy(id);
    try {
      const data = await compressImage(f, 320, 1, "image/png");
      const ok = onSet(id, data);
      if (!ok) say("저장 공간이 가득 찼어요 — 다른 이미지를 지우고 다시 시도해주세요");
    } catch (x) { say("이미지를 읽지 못했어요"); }
    setBusy(null);
  };
  const applyUrl = () => {
    const u = url.trim();
    if (!u || !urlFor) return;
    if (!/^https?:\/\//i.test(u)) { say("http(s):// 로 시작하는 주소를 넣어주세요"); return; }
    onSet(urlFor, u);
    setUrl(""); setUrlFor(null);
  };

  const list = SPRITE_SLOTS.filter((s) => !q.trim() || s.label.includes(q.trim()));
  const changed = Object.keys(sprites || {}).length;

  return (
    <div>
      <div style={{ background: C.white, border: `2px solid ${C.ink}`, borderRadius: 8, padding: 10, fontSize: 11.5, lineHeight: 1.7, marginBottom: 10 }}>
건물 그림을 <b>내 이미지</b>로 바꿀 수 있어요.<br />
        · 📁 <b>프로젝트 폴더</b> : <code style={{ background: "#efe6d2", padding: "0 4px" }}>public/sprites/건물id.png</code> 로 넣으면 자동 인식 (모두에게 보임)<br />
        · 여기서 올리는 파일·링크는 <b>이 브라우저에만</b> 저장돼요<br />
        · 배경이 투명하지 않아도 ✂️ 누끼가 자동으로 잘라줘요
      </div>

      <div style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 9 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 건물 이름 검색"
          style={{ flex: 1, minWidth: 0, padding: 8, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 13 }} />
        {changed > 0 && <PxButton tone="danger" onClick={onClearAll} style={{ fontSize: 10.5, padding: "6px 9px" }}>전체 되돌리기 ({changed})</PxButton>}
      </div>

      {err && <div style={{ fontSize: 11.5, color: C.danger, fontWeight: "bold", marginBottom: 8 }}>⚠️ {err}</div>}
      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />

      <div style={{ maxHeight: 340, overflow: "auto", display: "flex", flexDirection: "column", gap: 7 }}>
        {list.length === 0 && <div style={{ fontSize: 12, color: C.inkSoft, textAlign: "center", padding: 20 }}>찾는 건물이 없어요 🤔</div>}
        {list.map((s) => {
          const cur = sprites[s.id];
          const fromFile = !!cur && !userSprites[s.id];
          const cfg = cutCfg[s.id] || {};
          const cut = cfg.cut !== undefined ? cfg.cut : true;
          const tol = cfg.tol !== undefined ? cfg.tol : 32;
          return (
            <div key={s.id} style={{ background: C.white, border: `2px solid ${C.ink}`, borderRadius: 8, padding: 9 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{ width: 46, height: 46, flexShrink: 0, background: "repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 50%/10px 10px", border: `2px solid ${C.ink}`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {cur ? <AutoSprite src={cur} cut={cut} tol={tol} width={42} alt={s.label} /> : <span style={{ fontSize: 18, opacity: 0.5 }}>🏚</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: "bold", wordBreak: "break-all" }}>{s.label}</div>
                  <div style={{ fontSize: 10, color: C.inkSoft }}>
                    <code style={{ background: "#efe6d2", padding: "0 4px", borderRadius: 3 }}>{s.id}</code>
                    {" · "}
                    {fromFile ? <span style={{ color: "#2f7fb5" }}>📁 sprites 폴더 파일</span>
                      : userSprites[s.id] ? <span style={{ color: C.good }}>업로드한 이미지 ✓</span>
                      : "기본 도트 그림"}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <PxButton tone="good" onClick={() => pickFile(s.id)} style={{ fontSize: 10, padding: "5px 8px" }}>{busy === s.id ? "…" : "📁 파일"}</PxButton>
                  <PxButton tone="blue" onClick={() => { setUrlFor(urlFor === s.id ? null : s.id); setUrl(typeof cur === "string" && /^https?:/.test(cur) ? cur : ""); }} style={{ fontSize: 10, padding: "5px 8px" }}>🔗 링크</PxButton>
                </div>
                {userSprites[s.id] && <PxButton tone="ink" onClick={() => onClear(s.id)} style={{ fontSize: 10, padding: "5px 7px" }}>↩</PxButton>}
              </div>

              {cur && (
                <div style={{ marginTop: 8, background: "#f7efdc", border: `2px solid ${C.ink}`, borderRadius: 6, padding: "7px 9px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: "bold", cursor: "pointer" }}>
                    <input type="checkbox" checked={cut} onChange={(e) => onSetCut(s.id, { cut: e.target.checked })} style={{ width: 16, height: 16, cursor: "pointer" }} />
                    ✂️ 배경 자동 제거(누끼)
                  </label>
                  {cut && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                      <span style={{ fontSize: 10.5, color: C.inkSoft, whiteSpace: "nowrap" }}>강도</span>
                      <input type="range" min="5" max="110" value={tol} onChange={(e) => onSetCut(s.id, { tol: Number(e.target.value) })} style={{ flex: 1, accentColor: "#8a5a3b", cursor: "pointer" }} />
                      <span style={{ fontSize: 10.5, width: 24, textAlign: "right" }}>{tol}</span>
                    </div>
                  )}
                  {cut && <div style={{ fontSize: 10, color: C.inkSoft, marginTop: 4 }}>배경이 덜 지워지면 강도를 올리고, 건물까지 파이면 내려주세요</div>}
                </div>
              )}

              {urlFor === s.id && (
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") applyUrl(); }}
                    placeholder="https://... 이미지 주소"
                    style={{ flex: 1, minWidth: 0, padding: 7, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 12 }} />
                  <PxButton tone="gold" disabled={!url.trim()} onClick={applyUrl} style={{ fontSize: 11, padding: "6px 10px" }}>적용</PxButton>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: C.inkSoft, textAlign: "center", marginTop: 10 }}>* 모두에게 보이게 하려면 public/sprites/ 폴더에 파일을 넣어주세요</div>
    </div>
  );
}

function VitalBar({ label, val, color }) {
  const v = Math.max(0, Math.min(100, val));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 10, width: 20, color: C.inkSoft }}>{label}</span>
      <div style={{ flex: 1, height: 12, minWidth: 84, background: "#e2d3ab", border: `2px solid ${C.ink}` }}>
        <div style={{ height: "100%", width: `${v}%`, background: color, transition: "width .3s" }} />
      </div>
      <span style={{ fontSize: 10, width: 24, textAlign: "right" }}>{Math.round(v)}</span>
    </div>
  );
}
/* ============================== 앱 =================================== */
function wxIcon(code) {
  if (code == null) return "⏳";
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "🌨️";
  if (code <= 82) return "🌦️";
  if (code <= 86) return "🌨️";
  if (code >= 95) return "⛈️";
  return "🌡️";
}
const REGIONS = {
  "서울": { lat: 37.5665, lon: 126.978 },
  "영등포구": { lat: 37.5264, lon: 126.8962 },
  "강동구": { lat: 37.5301, lon: 127.1238 },
  "마포구": { lat: 37.5637, lon: 126.9084 },
  "인천": { lat: 37.4563, lon: 126.7052 },
  "용인": { lat: 37.2411, lon: 127.1776 },
  "부산": { lat: 35.1796, lon: 129.0756 },
  "대구": { lat: 35.8714, lon: 128.6014 },
  "대전": { lat: 36.3504, lon: 127.3845 },
  "제주": { lat: 33.4996, lon: 126.5312 },
};
function isRain(code) { return code != null && ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95); }
/* 실제 날씨 예보(Open-Meteo)를 가져와 게임에 반영합니다.
   접속 시 · 지역 변경 시 · 10분마다 · 창으로 돌아올 때 자동으로 다시 받아와요. */
const WX_REFRESH_MS = 10 * 60 * 1000;
function useWeather(points) {
  const [wx, setWx] = useState({});
  const keyStr = JSON.stringify(points);
  useEffect(() => {
    let alive = true;
    const load = () => {
      Object.entries(points).forEach(([key, p]) => {
        if (!p) return;
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&current=temperature_2m,weather_code`)
          .then((r) => r.json())
          .then((d) => {
            if (!alive || !d || !d.current) return;
            setWx((w) => ({ ...w, [key]: { temp: Math.round(d.current.temperature_2m), code: d.current.weather_code, at: Date.now() } }));
          })
          .catch(() => {});
      });
    };
    load();
    const iv = setInterval(load, WX_REFRESH_MS);
    // 다른 탭에 갔다가 돌아오면 바로 최신 날씨로
    const onBack = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", onBack);
    window.addEventListener("focus", load);
    return () => {
      alive = false;
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onBack);
      window.removeEventListener("focus", load);
    };
  }, [keyStr]);
  return wx;
}
const WORLD_TRACKS = [
  { title: "BIRDS OF A FEATHER", file: "song (1).mp3" },
  { title: "짱구는 못말려 오프닝 오리지널", file: "song (2).mp3" },
  { title: "퇴근시간", file: "song (3).mp3" },
  { title: "Cafe", file: "song (4).mp3" },
  { title: "Be There", file: "song (5).mp3" },
  { title: "Chosen", file: "song (6).mp3" },
  { title: "파도", file: "song (7).mp3" },
  { title: "차우차우", file: "song (8).mp3" },
  { title: "Champagne Supernova (Remastered)", file: "song (9).mp3" },
  { title: "Born Hater ft. Beenzino, Verbal Jint, B.I", file: "song (10).mp3" },
  { title: "Bus 안에서", file: "song (11).mp3" },
  { title: "초록비 (Green Rain)", file: "song (12).mp3" },
  { title: "Bonnie & Clyde", file: "song (13).mp3" },
  { title: "Aqua Man", file: "song (14).mp3" },
  { title: "Automatic", file: "song (15).mp3" },
  { title: "Another One Bites the Dust", file: "song (16).mp3" },
];
/* ============ 🏆 퀘스트 완료의 제단 (내부) ============ */
const QD_KEY = "echotown_questdone_v1";
function QuestFragmentInput({ tone, icon, title, hint, placeholder, value, onChange, detail, onDetail, onAdd }) {
  const bg = tone === "req" ? "linear-gradient(180deg,#2b2455,#170f38)" : "linear-gradient(180deg,#5c3d13,#2e1d06)";
  const line = tone === "req" ? "#7fe3ff" : "#ffd75e";
  return (
    <div style={{ flex: "1 1 260px", minWidth: 0, background: bg, border: `3px solid ${C.ink}`, borderRadius: 12, padding: 13, boxShadow: `0 0 0 2px ${line}33, 0 6px 16px rgba(0,0,0,0.35)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <b style={{ color: line, fontSize: 14, letterSpacing: 0.5 }}>{title}</b>
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.62)", lineHeight: 1.6, marginBottom: 8 }}>{hint}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") onAdd(); }} placeholder={placeholder}
        style={{ width: "100%", boxSizing: "border-box", padding: 10, border: `2px solid ${line}`, borderRadius: 7, background: "rgba(255,255,255,0.94)", fontFamily: "'DotGothic16', monospace", fontSize: 13.5 }} />
      <textarea value={detail} onChange={(e) => onDetail(e.target.value)} rows={2} placeholder="세부 내용 · 결과물 링크 · 메모 (선택)"
        style={{ width: "100%", boxSizing: "border-box", marginTop: 7, padding: 9, border: `2px solid ${line}66`, borderRadius: 7, background: "rgba(255,255,255,0.9)", fontFamily: "'DotGothic16', monospace", fontSize: 12.5, resize: "vertical" }} />
      <PxButton tone={tone === "req" ? "blue" : "gold"} disabled={!value.trim()} onClick={onAdd} style={{ width: "100%", marginTop: 8, padding: 11, fontSize: 13 }}>✦ 파편 봉헌하기</PxButton>
    </div>
  );
}

function QuestDoneView({ myName = "", onBack, bubble, draft = null, onDraftUsed, items = [], onAdd, onToggle, onDelete }) {
  const [reqT, setReqT] = useState(""); const [reqD, setReqD] = useState("");
  const [accT, setAccT] = useState(""); const [accD, setAccD] = useState("");
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [toast, setToast] = useState(null);
  const ping = (t) => { setToast(t); setTimeout(() => setToast(null), 1800); };

  /* 보스맵에서 답변을 제출하면 파편이 자동으로 봉헌돼요 */
  useEffect(() => {
    if (!draft) return;
    if (draft.autoAdd) {
      onAdd && onAdd({ kind: draft.kind || "acc", text: draft.text, detail: draft.detail || "", reviewer: draft.reviewer || null });
      ping("🏆 완료의 제단에 등록되었습니다!");
    } else {
      setAccT(draft.text || "");
      setAccD(draft.detail || "");
    }
    onDraftUsed && onDraftUsed();
  }, [draft]);

  const add = (kind) => {
    const text = (kind === "req" ? reqT : accT).trim();
    if (!text) return;
    const detail = (kind === "req" ? reqD : accD).trim();
    onAdd && onAdd({ kind, text, detail });
    if (kind === "req") { setReqT(""); setReqD(""); } else { setAccT(""); setAccD(""); }
    ping(kind === "req" ? "✦ 신청 파편이 제단에 봉헌됐어요" : "✦ 수락 파편이 제단에 봉헌됐어요");
  };
  const toggle = (id, key) => {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    onToggle && onToggle(id, key, !it[key]);
    if (!it[key]) ping(key === "gm" ? "🛡 등록자 검토 완료로 표시했어요" : "⭐ 보상 완료로 표시했어요");
  };
  const remove = (id) => { if (window.confirm("이 파편을 제단에서 지울까요? 모두에게서 사라져요.")) onDelete && onDelete(id); };

  const shown = items.filter((it) => {
    if (filter === "req" && it.kind !== "req") return false;
    if (filter === "acc" && it.kind !== "acc") return false;
    if (filter === "mine" && it.who !== myName && it.reviewer !== myName) return false;
    if (filter === "wait" && (it.gm && it.reward)) return false;
    if (filter === "done" && !(it.gm && it.reward)) return false;
    if (q.trim() && !((it.text || "") + (it.detail || "") + (it.who || "") + (it.reviewer || "")).includes(q.trim())) return false;
    return true;
  });
  const nGm = items.filter((i) => i.gm).length;
  const nRw = items.filter((i) => i.reward).length;
  const pct = items.length ? Math.round(((nGm + nRw) / (items.length * 2)) * 100) : 0;

  const Chip = ({ k, label }) => (
    <button onClick={() => setFilter(k)} style={{ cursor: "pointer", fontFamily: "'DotGothic16', monospace", fontSize: 11, padding: "6px 11px", borderRadius: 16, border: `2px solid ${C.ink}`, background: filter === k ? "linear-gradient(180deg,#9a86d8,#4b3c85)" : C.white, color: filter === k ? C.white : C.ink, fontWeight: "bold" }}>{label}</button>
  );

  return (
    <Panel style={{ padding: 0, overflow: "hidden" }}>
      <TitleBar icon="🏆" title="퀘스트 완료의 제단" sub="신청 파편과 수락 파편을 봉헌하고, GM 검수·보상을 확인하는 곳" onBack={onBack} bg="#2e2455" fg="#ffd75e" />
      <div style={{ padding: 16, background: "radial-gradient(circle at 50% 0%, #3a2e6b 0%, #1a1436 60%, #120e28 100%)" }}>

        {/* 제단 헤더 */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", justifyContent: "center", marginBottom: 14 }}>
          <QuestShrine size={130} />
          <div style={{ flex: "1 1 220px", minWidth: 0 }}>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, color: "#ffd75e", marginBottom: 7 }}>QUEST COMPLETE</div>
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.75)", lineHeight: 1.8 }}>
              제단은 완료의 증거를 기억합니다.<br />
              파편을 봉헌하면 🛡 <b style={{ color: "#7fe3ff" }}>등록자 검토</b>와 ⭐ <b style={{ color: "#ffd75e" }}>보상 지급</b>이 순서대로 새겨져요.
            </div>
            <div style={{ marginTop: 10, background: "rgba(255,255,255,0.1)", border: `2px solid #ffd75e66`, borderRadius: 20, height: 16, overflow: "hidden", position: "relative" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#7fe3ff,#ffd75e)", transition: "width .3s" }} />
              <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: C.white, fontWeight: "bold" }}>제단 봉인도 {pct}%</span>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, background: "rgba(127,227,255,0.18)", border: "2px solid #7fe3ff", color: "#cdf4ff", borderRadius: 12, padding: "3px 9px" }}>총 파편 {items.length}</span>
              <span style={{ fontSize: 11, background: "rgba(127,227,255,0.18)", border: "2px solid #7fe3ff", color: "#cdf4ff", borderRadius: 12, padding: "3px 9px" }}>🛡 검토 {nGm}</span>
              <span style={{ fontSize: 11, background: "rgba(255,215,94,0.18)", border: "2px solid #ffd75e", color: "#ffeaa8", borderRadius: 12, padding: "3px 9px" }}>⭐ 보상 {nRw}</span>
            </div>
          </div>
        </div>

        {/* 두 개의 파편 입력창 */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <QuestFragmentInput tone="req" icon="🔷" title="퀘스트 신청 파편" hint="내가 올린 퀘스트 · 요청한 작업을 적어주세요."
            placeholder="예: 릴스 썸네일 10종 제작 신청" value={reqT} onChange={setReqT} detail={reqD} onDetail={setReqD} onAdd={() => add("req")} />
          <QuestFragmentInput tone="acc" icon="🔶" title="퀘스트 수락 파편" hint="내가 수락해서 끝낸 퀘스트를 적어주세요."
            placeholder="예: 항균양말 상세페이지 수락 · 완료" value={accT} onChange={setAccT} detail={accD} onDetail={setAccD} onAdd={() => add("acc")} />
        </div>

        {/* 필터 */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
          <Chip k="all" label="전체" /><Chip k="mine" label="🙋 내 관련" /><Chip k="req" label="🔷 신청" /><Chip k="acc" label="🔶 수락" />
          <Chip k="wait" label="⏳ 미완" /><Chip k="done" label="✅ 완료" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 검색"
            style={{ flex: "1 1 110px", minWidth: 90, padding: 7, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 12, background: C.white }} />
        </div>

        {/* 파편 목록 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 420, overflow: "auto" }}>
          {shown.length === 0 && (
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.55)", fontSize: 12.5, padding: 30, lineHeight: 1.9, border: "2px dashed rgba(255,255,255,0.25)", borderRadius: 12 }}>
              아직 제단에 봉헌된 파편이 없어요 ✦<br />위 입력창에 퀘스트를 적고 봉헌해보세요.
            </div>
          )}
          {shown.map((it) => {
            const all = it.gm && it.reward;
            const line = it.kind === "req" ? "#7fe3ff" : "#ffd75e";
            return (
              <div key={it.id} style={{ background: all ? "linear-gradient(180deg,#243d33,#16261f)" : "rgba(255,255,255,0.07)", border: `2px solid ${all ? "#5fd39a" : line + "77"}`, borderLeft: `7px solid ${all ? "#5fd39a" : line}`, borderRadius: 10, padding: 12 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 20 }}>{it.kind === "req" ? "🔷" : "🔶"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 9.5, background: line, color: "#14102b", borderRadius: 10, padding: "1px 7px", fontWeight: "bold" }}>{it.kind === "req" ? "신청 파편" : "수락 파편"}</span>
                      {all && <span style={{ fontSize: 9.5, background: "#5fd39a", color: "#0f2119", borderRadius: 10, padding: "1px 7px", fontWeight: "bold" }}>✦ 봉인 완료</span>}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: "bold", color: C.white, marginTop: 4, wordBreak: "break-word" }}>{it.text}</div>
                    {it.detail && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.66)", whiteSpace: "pre-wrap", wordBreak: "break-word", marginTop: 3, lineHeight: 1.6 }}>{it.detail}</div>}
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 5 }}>🧑 {it.who} · 🕐 {it.at}{it.reviewer ? ` · 📋 검토 ${it.reviewer}` : ""}</div>
                  </div>
                  <button onClick={() => remove(it.id)} title="삭제" style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 15 }}>🗑</button>
                </div>
                <div style={{ display: "flex", gap: 7, marginTop: 10, flexWrap: "wrap" }}>
                  <button onClick={() => toggle(it.id, "gm")} style={{ flex: "1 1 140px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: "'DotGothic16', monospace", fontSize: 12.5, padding: "9px 11px", borderRadius: 8, border: `2px solid ${it.gm ? "#5fd39a" : "rgba(255,255,255,0.3)"}`, background: it.gm ? "rgba(95,211,154,0.2)" : "rgba(255,255,255,0.05)", color: it.gm ? "#a8f0cd" : "rgba(255,255,255,0.7)", fontWeight: "bold" }}>
                    <span style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${it.gm ? "#5fd39a" : "rgba(255,255,255,0.4)"}`, background: it.gm ? "#5fd39a" : "transparent", color: "#10261c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>{it.gm ? "✔" : ""}</span>
                    🛡 {it.reviewer ? `${it.reviewer} 검토 완료` : "등록자 검토 완료"}
                  </button>
                  <button onClick={() => toggle(it.id, "reward")} style={{ flex: "1 1 140px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: "'DotGothic16', monospace", fontSize: 12.5, padding: "9px 11px", borderRadius: 8, border: `2px solid ${it.reward ? "#ffd75e" : "rgba(255,255,255,0.3)"}`, background: it.reward ? "rgba(255,215,94,0.2)" : "rgba(255,255,255,0.05)", color: it.reward ? "#ffeaa8" : "rgba(255,255,255,0.7)", fontWeight: "bold" }}>
                    <span style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${it.reward ? "#ffd75e" : "rgba(255,255,255,0.4)"}`, background: it.reward ? "#ffd75e" : "transparent", color: "#2e1d06", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>{it.reward ? "✔" : ""}</span>
                    💎 보상 완료
                  </button>
                </div>
                {(it.gmBy || it.rewardBy) && (
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.42)", marginTop: 6 }}>
                    {it.gm && it.gmBy ? `🛡 검토: ${it.gmBy}` : ""}{it.gm && it.gmBy && it.reward && it.rewardBy ? " · " : ""}{it.reward && it.rewardBy ? `⭐ 보상: ${it.rewardBy}` : ""}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: "center", fontSize: 10.5, color: "rgba(255,255,255,0.4)", marginTop: 12 }}>* 제단 기록은 이 브라우저에 저장돼요.</div>
        {toast && (
          <div style={{ position: "fixed", left: "50%", bottom: 90, transform: "translateX(-50%)", zIndex: 120, background: "#2e2455", color: "#ffd75e", border: "3px solid #ffd75e", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontFamily: "'DotGothic16', monospace", boxShadow: "0 6px 18px rgba(0,0,0,0.5)" }}>{toast}</div>
        )}
      </div>
    </Panel>
  );
}

function EchoTown() {
  const [view, setView] = useState("world");
  const [houseId, setHouseId] = useState(null);
  const houseIdRef = useRef(null);
  const [bigId, setBigId] = useState(null);
  const [meetingId, setMeetingId] = useState(null);
  const [rentId, setRentId] = useState(null);

  const [gems, setGems] = useState(0);
  const [gold, setGold] = useState(0);
  const [exp, setExp] = useState(0);
  const [lifetime, setLifetime] = useState(0);
  const [hp, setHp] = useState(100);
  const [mp, setMp] = useState(100);
  const [exchanged, setExchanged] = useState(0);
  const [history, setHistory] = useState([]);
  const [day, setDay] = useState(1);

  const [worldPos, setWorldPos] = useState({ x: 1300, y: 950 });
  const [qs, setQs] = useState(() => {
    const o = {};
    BIG_BUILDINGS.forEach((b) => b.quests.forEach((q) => (o[q.id] = { running: false, progress: 0, doneDay: 0, doneOnce: false })));
    return o;
  });

  const [memos, setMemos] = useState({});
  const [meetingRooms, setMeetingRooms] = useState({
    m1: { reserved: false, by: "", time: "", locked: false },
    m2: { reserved: true, by: "도희", time: "14:00", locked: false },
    m3: { reserved: false, by: "", time: "", locked: true },
  });
  const [centerChat, setCenterChat] = useState([
    { who: "도희", text: "다들 점심 뭐 먹었어요?", me: false },
    { who: "창민", text: "뭐야!", me: false },
  ]);
  const [thanksInv, setThanksInv] = useState([]);
  const [postits, setPostits] = useState([
    { id: 1, to: "정인", from: "창민", msg: "저번에 도와줘서 고마워요!", color: "#ffe680" },
  ]);
  /* 🕵️ 라이어 게임 — 호스트가 상태를 계산하고 모두에게 방송 */
  const [liarGame, setLiarGame] = useState(null);
  const lgRef = useRef(null); lgRef.current = liarGame;
  const lgBroadcast = (next) => { setLiarGame(next); if (netSendEvent) netSendEvent("lg", { state: next }); };
  const lgAction = (type, payload) => {
    const me = myName || "나";
    const g = lgRef.current;
    // 방 만들기는 누구나 (호스트가 됨)
    if (type === "create") {
      const cats = Object.keys(LIAR_TOPICS);
      const cat = payload.cat && payload.cat !== "랜덤" ? payload.cat : cats[Math.floor(Math.random() * cats.length)];
      lgBroadcast({ phase: "lobby", host: me, cat, players: [me], log: [], votes: {} });
      return;
    }
    if (!g) return;
    // 호스트가 아니면 요청만 보냄
    if (g.host !== me) { if (netSendEvent) netSendEvent("lg", { req: { type, payload, from: me } }); return; }
    lgApply(type, payload, me);
  };
  /* 호스트에서만 실행되는 실제 규칙 처리 */
  const lgApply = (type, payload, who) => {
    const g = lgRef.current;
    if (!g) return;
    const P = g.players || [];
    if (type === "join") {
      if (P.includes(who) || g.phase !== "lobby") return;
      lgBroadcast({ ...g, players: [...P, who] });
      return;
    }
    if (type === "leave") {
      const rest = P.filter((n) => n !== who);
      if (!rest.length || who === g.host) { lgBroadcast({ phase: "idle" }); return; }
      lgBroadcast({ ...g, players: rest, phase: g.phase === "lobby" ? "lobby" : "lobby" });
      return;
    }
    if (type === "start") {
      if (P.length < 3) return;
      const words = LIAR_TOPICS[g.cat] || LIAR_TOPICS["음식"];
      const word = words[Math.floor(Math.random() * words.length)];
      const liar = P[Math.floor(Math.random() * P.length)];
      lgBroadcast({ ...g, phase: "hint", word, liar, turn: 0, log: [], votes: {} });
      return;
    }
    if (type === "hint") {
      if (g.phase !== "hint" || P[g.turn] !== who) return;
      const log = [...(g.log || []), { who, text: payload.text }].slice(-40);
      const next = g.turn + 1;
      if (next >= P.length) lgBroadcast({ ...g, log, phase: "vote", votes: {} });
      else lgBroadcast({ ...g, log, turn: next });
      return;
    }
    if (type === "vote") {
      if (g.phase !== "vote") return;
      const votes = { ...(g.votes || {}), [who]: payload.target };
      if (Object.keys(votes).length < P.length) { lgBroadcast({ ...g, votes }); return; }
      const tally = {};
      Object.values(votes).forEach((t) => { tally[t] = (tally[t] || 0) + 1; });
      let topVoted = null, best = -1;
      Object.entries(tally).forEach(([n, c]) => { if (c > best) { best = c; topVoted = n; } });
      lgBroadcast({ ...g, votes, phase: "result", topVoted, caught: topVoted === g.liar });
      return;
    }
    if (type === "again") { lgBroadcast({ ...g, phase: "lobby", log: [], votes: {}, word: null, liar: null }); return; }
  };
  /* 결과가 나오면 각자 자기 보상을 받습니다 */
  const lgApplyRef = useRef(null);
  lgApplyRef.current = lgApply;
  const lgPaidRef = useRef(null);
  useEffect(() => {
    const g = liarGame;
    if (!g || g.phase !== "result") { return; }
    const key = `${g.host}_${g.word}_${g.liar}`;
    if (lgPaidRef.current === key) return;
    lgPaidRef.current = key;
    const me = myName || "나";
    if (!(g.players || []).includes(me)) return;
    const iAmLiar = g.liar === me;
    if (g.caught && !iAmLiar) { awardGold(10); showNotice("🎉 라이어를 잡았어요! 🪙10 획득"); }
    else if (!g.caught && iAmLiar) { awardGold(15); showNotice("😈 끝까지 속였어요! 🪙15 획득"); }
  }, [liarGame]);

  /* 🏆 퀘스트 완료의 제단 — 저장 + 모두 공유 (등록자가 검토해야 하므로) */
  const [shrineItems, setShrineItems] = useState(() => { const v = loadJSON(QD_KEY, []); return Array.isArray(v) ? v : []; });
  const shrineRef = useRef(shrineItems); shrineRef.current = shrineItems;
  useEffect(() => { saveJSON(QD_KEY, shrineItems.slice(0, 120)); }, [shrineItems]);
  const addShrine = (row) => {
    const it = {
      id: Date.now() + Math.random(), kind: row.kind || "acc", text: row.text, detail: row.detail || "",
      who: myName || "익명", reviewer: row.reviewer || null,
      at: new Date().toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      gm: false, reward: false,
    };
    setShrineItems((v) => [it, ...v].slice(0, 120));
    if (netSendEvent) netSendEvent("shr", { row: it });
  };
  const toggleShrine = (id, key, val) => {
    const by = val ? (myName || "익명") : null;
    setShrineItems((v) => v.map((x) => (x.id === id ? { ...x, [key]: val, [key + "By"]: by } : x)));
    if (netSendEvent) netSendEvent("shr", { patch: { id, key, val, by } });
  };
  const delShrine = (id) => {
    setShrineItems((v) => v.filter((x) => x.id !== id));
    if (netSendEvent) netSendEvent("shr", { del: id });
  };

  /* 🍴 쩝쩝박사 메뉴 추천 — 저장 + 모두 공유 */
  const REC_KEY = "echotown_recs_v1";
  const [recList, setRecList] = useState(() => {
    const v = loadJSON(REC_KEY, null);
    return Array.isArray(v) ? v : [{ id: 1, nick: "정인", text: "저 오늘 국밥 땡겨요...🍚" }, { id: 2, nick: "도희", text: "마라탕 각인데?" }];
  });
  const recRef = useRef(recList); recRef.current = recList;
  useEffect(() => { saveJSON(REC_KEY, recList.slice(-60)); }, [recList]);
  const addRec = (nick, text) => {
    const row = { id: Date.now() + Math.random(), nick, text };
    setRecList((v) => [...v, row].slice(-60));
    if (netSendEvent) netSendEvent("rec", { row });
  };

  /* 📱 릴스 카테고리 — 저장 + 모두 공유 */
  const REEL_KEY = "echotown_reels_v1";
  const [reelExtra, setReelExtra] = useState(() => { const v = loadJSON(REEL_KEY, null); return (v && typeof v === "object") ? v : {}; });
  const reelRef = useRef(reelExtra); reelRef.current = reelExtra;
  useEffect(() => { saveJSON(REEL_KEY, reelExtra); }, [reelExtra]);
  const addReel = (key, data) => {
    setReelExtra((v) => ({ ...v, [key]: data }));
    if (netSendEvent) netSendEvent("reel", { key, data });
  };

  /* 💌 마음의 방 — 저장 + 접속자 모두와 공유 (익명) */
  const WORRY_KEY = "echotown_worries_v1";
  const [worries, setWorries] = useState(() => { const v = loadJSON(WORRY_KEY, []); return Array.isArray(v) ? v : []; });
  const worryRef = useRef(worries); worryRef.current = worries;
  useEffect(() => { saveJSON(WORRY_KEY, worries.slice(0, 80)); }, [worries]);
  const addWorry = (text, kind) => {
    const row = { id: Date.now() + Math.random(), text, kind,
      at: new Date().toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) };
    setWorries((w) => [row, ...w].slice(0, 80));
    if (netSendEvent) netSendEvent("worry", { row });
  };
  const [rented, setRented] = useState({});
  const [myName, setMyName] = useState("");
  const netPosRef = useRef({ x: 1300, y: 950 });
  const netFacingRef = useRef(1);
  useEffect(() => { netPosRef.current = worldPos; }, [worldPos]);
  useEffect(() => { netViewRef.current = view; }, [view]);
  /* 같은 화면이라도 다른 집·회의실이면 서로 안 보이게 방 id 를 함께 알립니다 */
  useEffect(() => {
    netRoomIdRef.current =
      view === "house" ? houseId :
      view === "meeting" ? meetingId :
      view === "rent" ? rentId :
      view === "big" ? bigId : null;
  }, [view, houseId, meetingId, rentId, bigId]);
  const onChatRef = useRef(null);
  const netOutfitRef = useRef(null);
  const netViewRef = useRef("world");
  const netDanceRef = useRef(null);
  const netHouseRef = useRef(null);
  const netLookRef = useRef(null);
  const netSendEventRef = useRef(null);
  const myNameRef = useRef("");
  const netCarryRef = useRef(null);
  const netPetRef = useRef(null);
  const netRoomIdRef = useRef(null);   // 같은 집·회의실에 있는 사람만 보이게
  const netRoomPosRef = useRef({ x: 0, y: 0 });
  const { others: netOthers, count: netCount, status: netStatus, sendChat: netSendChat, sendEvent: netSendEvent, reconnect: netReconnect } = useMultiplayer(myName, netPosRef, netFacingRef, onChatRef, netOutfitRef, netViewRef, netRoomPosRef, netDanceRef, netHouseRef, netLookRef, netCarryRef, netPetRef, netRoomIdRef);
  useEffect(() => { netSendEventRef.current = netSendEvent; }, [netSendEvent]);
  useEffect(() => { myNameRef.current = myName; }, [myName]);
  const [nameOpen, setNameOpen] = useState(() => !loadJSON("echotown_myname", ""));
  const [nameInput, setNameInput] = useState("");
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponDone, setCouponDone] = useState(false);
  /* 계정별 로컬 저장 키 — 서버 저장이 실패해도 새로고침 후 그대로 이어져요 */
  const saveKey = (n) => "echotown_save_" + (n || "");
  const applySave = (d) => {
    if (!d) return false;
    if (typeof d.gems === "number") setGems(d.gems);
    if (typeof d.gold === "number") setGold(d.gold);
    if (typeof d.exp === "number") setExp(d.exp);
    if (d.profile) setProfile({ job: "", avatar: "🧑‍💻", ...d.profile, look: { ...DEFAULT_LOOK, ...(d.profile.look || {}) } });
    if (d.townRegion && REGIONS[d.townRegion]) { setTownRegion(d.townRegion); saveJSON("echotown_region", d.townRegion); }
    if (d.schoolDone) setSchoolDone(d.schoolDone);
    if (d.skills) setSkills(d.skills);
    if (d.pets) setPets(d.pets);
    if (d.activePet !== undefined) setActivePet(d.activePet);
    if (d.fishes) setFishes(d.fishes);
    if (d.facilities) setFacilities(d.facilities);
    if (d.homeGifts) setHomeGifts(d.homeGifts);
    if (d.fridge) setFridge(d.fridge);
    if (typeof d.lifetime === "number") setLifetime(d.lifetime);
    if (d.outfit) setOutfit(d.outfit);
    if (d.owned) setOwned(d.owned);
    if (d.ikeaOwned) { const n = { ...d.ikeaOwned }; delete n.f8; setIkeaOwned(n); }   // 이케아 수족관은 폐지 → 형욱이네에서만
    if (d.myFurni) setMyFurni((d.myFurni || []).filter((x) => x !== "f8"));
    if (d.houseSkin !== undefined) setHouseSkin(d.houseSkin);
    if (d.vehicle !== undefined) setVehicle(d.vehicle);
    if (d.thanksInv) setThanksInv(d.thanksInv);
    if (d.memos) setMemos(d.memos);
    if (d.stats) { setStats(d.stats); saveJSON("echotown_stats", d.stats); }
    if (d.housePw) setPwMap((m) => { const n = { ...m, [d.owner || myNameRef.current || "__legacy"]: d.housePw }; saveJSON("echotown_pw_v2", n); return n; });
    if (d.couponDone) setCouponDone(true);
    if (d.qNotes) setQNotes(d.qNotes);
    if (d.qAccept) setQAccept(d.qAccept);
    return true;
  };
  const confirmName = (nm) => {
    const t = (nm || "").trim(); if (!t) return;
    setMyName(t); setNameOpen(false);
    saveJSON("echotown_myname", t);
    // ① 이 브라우저에 저장된 게 있으면 즉시 복원
    const local = loadJSON(saveKey(t), null);
    if (local) applySave(local);
    setOutfit((o) => (o.top || o.bottom || o.shoes) ? o : {
      top: CLOTHES.top[Math.floor(Math.random() * CLOTHES.top.length)],
      bottom: CLOTHES.bottom[Math.floor(Math.random() * CLOTHES.bottom.length)],
      shoes: CLOTHES.shoes[Math.floor(Math.random() * CLOTHES.shoes.length)],
    });
    // ② 서버는 한 번만 조회 (더 최신이면 덮어쓰고, 처음이면 쿠폰 지급)
    dbLoadProfile(t).then((d) => {
      const serverNewer = d && (!local || (d.savedAt || 0) >= (local.savedAt || 0));
      if (serverNewer) applySave(d);
      if (d || local) showNotice(`💾 ${t}님의 저장 데이터를 불러왔어요`);
      dbLoadMail(t).then((ms) => { if (ms && ms.length) setMail(ms); });
      if (!d && !local && !couponDone) {
        setCouponDone(true);
        setGems((g) => g + 100); setLifetime((l) => l + 100); setGold((g) => g + 200);
        setCouponOpen(true);
        // 쿠폰은 받자마자 바로 저장 (디바운스를 기다리지 않아요)
        setTimeout(() => flushSaveRef.current && flushSaveRef.current(t), 80);
      }
    });
  };
  /* 이 브라우저에 저장된 이름이 있으면 바로 로그인 (캐시 삭제·시크릿 모드면 다시 물어봐요) */
  const bootedRef = useRef(false);
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    const saved = loadJSON("echotown_myname", "");
    if (saved) confirmName(saved);
  }, []);
  const forgetName = () => {
    try { window.localStorage.removeItem("echotown_myname"); } catch (e) {}
    setMyName(""); setNameInput(""); setNameOpen(true);
  };
  const isMyHouse = (n) => {
    if (!n || !myName) return false;
    const h = HOUSES.find((x) => x.name === n);
    return houseOwnerNames(h || { name: n }).includes(myName.trim());
  };
  const [ikeaOwned, setIkeaOwned] = useState({});
  const [houseSkin, setHouseSkin] = useState(null);
  useEffect(() => { netHouseRef.current = houseSkin; }, [houseSkin]);
  const [vehicle, setVehicle] = useState(null);
  const [myFurni, setMyFurni] = useState([]);
  /* 폐지된 이케아 수족관(f8) 흔적 정리 — 수족관은 이제 형욱이네에서만 */
  useEffect(() => {
    setIkeaOwned((v) => (v && v.f8 ? (() => { const n = { ...v }; delete n.f8; return n; })() : v));
    setMyFurni((v) => (v.includes("f8") ? v.filter((x) => x !== "f8") : v));
  }, []);
  const buyIkea = (kind, item) => {
    const has = !!ikeaOwned[item.id];
    if (!has) {
      if (gold < item.price) return;
      setGold((g) => g - item.price);
      setIkeaOwned((v) => ({ ...v, [item.id]: true }));
    }
    if (kind === "house") setHouseSkin((h) => (h && h.id === item.id ? null : item));
    else if (kind === "vehicle") setVehicle((v) => (v && v.id === item.id ? null : item));
    else setMyFurni((v) => (v.includes(item.id) ? v.filter((x) => x !== item.id) : [...v, item.id]));
  };
  const [swimScores, setSwimScores] = useState([{ nick: "유리", time: 8.2 }, { nick: "정인", time: 9.1 }, { nick: "호중", time: 9.8 }, { nick: "의준", time: 10.4 }]);
  const [boxScores, setBoxScores] = useState([{ nick: "창민", count: 18294719 }, { nick: "정인", count: 129572 }]);
  const reloadRanks = useCallback(() => {
    dbTopRanks("sandbag", true).then((r) => { if (r.length) setBoxScores([{ nick: "창민", count: 18294719 }, { nick: "정인", count: 129572 }, ...r.map((x) => ({ nick: x.nick, count: Number(x.score), target: x.target }))]); });
    dbTopRanks("swim", false).then((r) => { if (r.length) setSwimScores(r.map((x) => ({ nick: x.nick, time: Number(x.score) }))); });
  }, []);
  useEffect(() => { reloadRanks(); }, [reloadRanks]);
  const [townRegion, setTownRegion] = useState(() => loadJSON("echotown_region", "서울") || "서울");
  const [regionOpen, setRegionOpen] = useState(false);
  const wxPoints = useMemo(() => ({ town: REGIONS[townRegion], chiangmai: { lat: 18.7883, lon: 98.9853 } }), [townRegion]);
  const weather = useWeather(wxPoints);
  const wxZone = worldPos.x >= RIVER_X ? "chiangmai" : "town";
  const wxName = wxZone === "chiangmai" ? "치앙마이" : townRegion;
  const curWx = weather[wxZone];
  const townRain = isRain(weather.town && weather.town.code);
  const cmRain = isRain(weather.chiangmai && weather.chiangmai.code);
  const [outfit, setOutfit] = useState({ top: null, bottom: null, shoes: null });
  useEffect(() => { netOutfitRef.current = outfit; }, [outfit]);
  const [owned, setOwned] = useState({});
  const tryOnClothing = (catKey, item) => setOutfit((o) => ({ ...o, [catKey]: item }));
  const buyClothing = (catKey, item) => {
    if (owned[item.id]) { setOutfit((o) => ({ ...o, [catKey]: item })); return; }
    if (gold < item.price) return;
    setGold((g) => g - item.price);
    setOwned((v) => ({ ...v, [item.id]: true }));
    setOutfit((o) => ({ ...o, [catKey]: item }));
  };

  // 신규: 배경음악 / 채팅 / 말풍선 / 피드백 / 메뉴
  const [worldBgm, setWorldBgm] = useState({ title: WORLD_TRACKS[0].title, file: WORLD_TRACKS[0].file, playing: false, seq: 0 });
  const selectTrack = (t) => { setWorldBgm((b) => ({ ...b, title: t.title, file: t.file, playing: true, seq: (b.seq || 0) + 1 })); bump("song"); };
  /* 🔀 셔플 · 한 곡이 끝나면 자동으로 다음 곡 */
  const [shuffle, setShuffle] = useState(false);
  const shuffleRef = useRef(false);
  shuffleRef.current = shuffle;
  const stepTrack = useCallback((dir) => {
    setWorldBgm((b) => {
      const n = WORLD_TRACKS.length;
      if (n === 0) return b;
      const cur = WORLD_TRACKS.findIndex((t) => t.file === b.file);
      let idx;
      if (dir === 0 || (dir > 0 && shuffleRef.current)) {
        if (n === 1) idx = 0;
        else { do { idx = Math.floor(Math.random() * n); } while (idx === cur); }
      } else {
        idx = ((cur < 0 ? 0 : cur) + (dir >= 0 ? 1 : -1) + n) % n;
      }
      const t = WORLD_TRACKS[idx];
      return { ...b, title: t.title, file: t.file, playing: true, seq: (b.seq || 0) + 1 };
    });
  }, []);
  const toggleShuffle = () => {
    setShuffle((v) => {
      const nv = !v;
      shuffleRef.current = nv;
      if (nv) { stepTrack(0); showNotice("🔀 셔플 ON — 아무 곡이나 재생해요"); }   // 켜면 바로 무작위 재생
      else showNotice("🔀 셔플 OFF — 순서대로 재생해요");
      return nv;
    });
  };
  /* 🎬 유튜브 재생 상태 — 아래 오디오 useEffect 의 의존성으로 쓰이므로 반드시 먼저 선언 */
  const [ytNow, setYtNow] = useState(null);
  const [ytOpen, setYtOpen] = useState(true);
  const audioRef = useRef(null);
  const [bgmVol, setBgmVol] = useState(0.6);
  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    a.volume = bgmVol;
    // 같은 곡을 다시 고른 경우에도 처음부터 재생되도록
    if (worldBgm.playing && !ytNow) { if (a.currentTime > 0 && a.ended) a.currentTime = 0; a.play().catch(() => {}); } else a.pause();
  }, [worldBgm.playing, worldBgm.file, worldBgm.seq, bgmVol, ytNow]);
  const [chat, setChat] = useState([]);
  const [shout, setShout] = useState(false);
  const [bubble, setBubble] = useState(null);
  const bubbleTimer = useRef(null);
  /* 🎨 건물 이미지 : public/sprites/ 파일 + 내가 올린 이미지 */
  const [fileSprites, setFileSprites] = useState({});
  useEffect(() => { probeSpriteFiles().then(setFileSprites); }, []);
  const [sprites, setSprites] = useState(() => loadJSON(SPRITE_KEY, {}) || {});
  const [cutCfg, setCutCfg] = useState(() => loadJSON(SPRITE_CUT_KEY, {}) || {});
  const allSprites = useMemo(() => ({ ...fileSprites, ...sprites }), [fileSprites, sprites]);
  const writeSprites = (v) => {
    try { window.localStorage.setItem(SPRITE_KEY, JSON.stringify(v)); setSprites(v); return true; }
    catch (e) { return false; }
  };
  const setSprite = (id, src) => writeSprites({ ...sprites, [id]: src });
  const clearSprite = (id) => { const n = { ...sprites }; delete n[id]; writeSprites(n); };
  const clearAllSprites = () => { if (window.confirm("업로드한 건물 이미지를 모두 지울까요? (public/sprites 파일은 그대로예요)")) writeSprites({}); };
  const setCut = (id, patch) => {
    const n = { ...cutCfg, [id]: { cut: true, tol: 32, ...(cutCfg[id] || {}), ...patch } };
    setCutCfg(n); saveJSON(SPRITE_CUT_KEY, n);
  };

  /* 🚬 흡연의 방 수다방 (실시간) */
  const [smokeChat, setSmokeChat] = useState([]);
  const pushSmoke = useCallback((row) => setSmokeChat((v) => [...v, row].slice(-80)), []);

  /* 💬 회의실 채팅 */
  const [meetingChat, setMeetingChat] = useState({});
  const pushMeetingChat = useCallback((room, row) => {
    setMeetingChat((v) => ({ ...v, [room]: [...(v[room] || []), row].slice(-120) }));
  }, []);

  /* 💬 DM 대화 (상대 이름별) */
  const DM_KEY = "echotown_dm_v1";
  const [dmThreads, setDmThreads] = useState(() => loadJSON(DM_KEY, {}) || {});
  const pushDm = useCallback((who, row) => {
    setDmThreads((v) => {
      const n = { ...v, [who]: [...(v[who] || []), { ...row, at: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) }].slice(-200) };
      saveJSON(DM_KEY, n);
      return n;
    });
  }, []);

  /* 🧑 내 프로필 (직업 · 아이콘 · 외모) */
  const [profile, setProfile] = useState(() => { const v = loadJSON("echotown_profile", null); return { job: "", avatar: "🧑‍💻", ...(v && typeof v === "object" ? v : {}), look: { ...DEFAULT_LOOK, ...((v && v.look) || {}) } }; });
  const patchProfile = (patch) => setProfile((p) => {
    const n = { ...p, ...patch, look: { ...DEFAULT_LOOK, ...(p.look || {}), ...(patch.look || {}) } };
    saveJSON("echotown_profile", n);
    return n;
  });
  const myLook = profile.look || DEFAULT_LOOK;
  useEffect(() => { netLookRef.current = myLook; }, [myLook]);

  /* 🎁 선물 행동 : 들고다니기 · 집에 두기 · 먹기 · 냉장고 */
  /* 📗🎬 스쿨 진행도 (저장됨) */
  const [schoolDone, setSchoolDone] = useState({});
  const clearSchool = (qid) => setSchoolDone((v) => (v[qid] ? v : { ...v, [qid]: true }));

  /* 🧠 배운 사고 스킬 */
  const [skills, setSkills] = useState([]);
  const [skillPop, setSkillPop] = useState(null);
  const learnSkill = (questTitle) => {
    setSkills((cur) => {
      const left = SKILLS.filter((sk) => !cur.includes(sk.id));
      const pool = left.length ? left : SKILLS;                 // 다 모으면 중복 허용 대신 그대로
      if (!left.length) { setSkillPop({ all: true }); return cur; }
      const got = pool[Math.floor(Math.random() * pool.length)];
      setSkillPop({ ...got, from: questTitle });
      return [...cur, got.id];
    });
  };

  /* 🐾 반려동물 · 🐠 어항 */
  const [pets, setPets] = useState([]);
  const [activePet, setActivePet] = useState(null);
  const [fishes, setFishes] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [aquaOpen, setAquaOpen] = useState(false);
  const petEmoji = useMemo(() => { const p = PETS.find((x) => x.id === activePet); return p ? p.emoji : null; }, [activePet]);
  useEffect(() => { netPetRef.current = petEmoji; }, [petEmoji]);

  const [carrying, setCarrying] = useState(null);        // { ...item, _i }
  const [homeGifts, setHomeGifts] = useState([]);        // 집에 둔 선물
  const [fridge, setFridge] = useState([]);              // 냉장고에 넣은 음식
  useEffect(() => { netCarryRef.current = carrying; }, [carrying]);
  const giftAct = (act, it, i) => {
    // 소지품에서 빼면 뒤쪽 인덱스가 당겨지므로 들고 있는 위치도 같이 보정
    const removeAt = (idx) => {
      setThanksInv((v) => v.filter((_, k) => k !== idx));
      setCarrying((c) => {
        if (!c) return c;
        if (c._i === idx) return null;
        return c._i > idx ? { ...c, _i: c._i - 1 } : c;
      });
    };
    if (act === "carry") {
      if (carrying && carrying._i === i) { setCarrying(null); showNotice("🙌 선물을 내려놨어요"); }
      else { setCarrying({ ...it, _i: i }); showNotice(`🙌 ${it.name}을(를) 들고 다녀요!`); }
      return;
    }
    if (act === "eat") {
      setHp((h) => Math.min(100, h + 15));
      setMp((m) => Math.min(100, m + 10));
      removeAt(i);
      awardGold(1);
      showNotice(`😋 ${it.name} 냠냠! HP+15 MP+10`);
      return;
    }
    if (act === "home") {
      setHomeGifts((v) => [...v, it]);
      removeAt(i);
      showNotice(`🏠 ${it.name}을(를) 집에 뒀어요`);
      return;
    }
    if (act === "fridge") {
      setFridge((v) => [...v, it]);
      removeAt(i);
      showNotice(`🧊 ${it.name}을(를) 냉장고에 넣었어요`);
      return;
    }
  };

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  const [dmWith, setDmWith] = useState(null);
  const [callWith, setCallWith] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const callTimer = useRef(null);

  /* ===== 메세지함 ===== */
  const MSG_KEY = "echotown_msgbox_v1";
  const [noticeSeen, setNoticeSeen] = useState(() => loadJSON("echotown_noticeseen_ids", {}) || {});
  const [msgBox, setMsgBox] = useState(() => { const v = loadJSON(MSG_KEY, null); return (v && typeof v === "object") ? { invite: [], gift: [], dm: [], call: [], ...v } : { invite: [], gift: [], dm: [], call: [] }; });
  const pushMsg = useCallback((kind, item) => {
    setMsgBox((v) => {
      const row = { id: Date.now() + Math.random(), read: false, at: new Date().toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }), ...item };
      const next = { ...v, [kind]: [row, ...(v[kind] || [])].slice(0, 80) };
      saveJSON(MSG_KEY, next);
      return next;
    });
  }, []);
  const readAll = useCallback((kind) => {
    if (kind === "notice") {
      setNoticeSeen((prev) => {
        const next = { ...prev };
        (allNoticesRef.current || []).forEach((n) => { next[n.id] = true; });
        saveJSON("echotown_noticeseen_ids", next);
        return next;
      });
      return;
    }
    setMsgBox((v) => {
      if (!(v[kind] || []).some((m) => !m.read)) return v;
      const next = { ...v, [kind]: (v[kind] || []).map((m) => ({ ...m, read: true })) };
      saveJSON(MSG_KEY, next);
      return next;
    });
  }, []);
  const patchMsg = (kind, id, patch) => setMsgBox((v) => {
    const next = { ...v, [kind]: (v[kind] || []).map((m) => (m.id === id ? { ...m, ...patch } : m)) };
    saveJSON(MSG_KEY, next);
    return next;
  });
  /* 팝업에서 초대에 답하면 메세지함 사본도 같이 갱신 */
  const syncInvite = (inv, ok) => setMsgBox((v) => {
    const next = { ...v, invite: (v.invite || []).map((m) => (m.from === inv.from && m.when === inv.when && !m.answered ? { ...m, answered: ok ? "ok" : "no", read: true } : m)) };
    saveJSON(MSG_KEY, next);
    return next;
  });
  const [dbNoticeList, setDbNoticeList] = useState([]);
  useEffect(() => {
    const load = () => dbNotices().then((r) => setDbNoticeList(r || []));
    load();
    const iv = setInterval(load, 90000);
    return () => clearInterval(iv);
  }, []);
  const allNotices = useMemo(() => {
    const base = [...ANNOUNCEMENTS.map((a) => ({ id: "a" + a.id, type: a.type || "공지", title: a.title, body: a.body || "", date: a.date }))];
    const upd = UPDATE_NOTES.slice(0, 6).map((u) => ({ id: u.id, type: u.type || "업데이트", title: u.title, body: u.body, date: u.date }));
    const all = [...dbNoticeList, ...upd, ...base].sort((a, b) => (a.date < b.date ? 1 : -1));
    return all.map((n) => ({ ...n, read: !!noticeSeen[n.id] })).slice(0, 40);
  }, [dbNoticeList, noticeSeen]);
  const allNoticesRef = useRef([]);
  allNoticesRef.current = allNotices;
  const unreadMsgCount = (msgBox.invite || []).filter((m) => !m.read).length
    + (msgBox.gift || []).filter((m) => !m.read).length
    + (msgBox.dm || []).filter((m) => !m.read).length
    + (msgBox.call || []).filter((m) => !m.read).length
    + allNotices.filter((n) => !n.read).length;
  const [dbPlayers, setDbPlayers] = useState([]);
  useEffect(() => {
    dbAllPlayers().then(setDbPlayers);
    const iv = setInterval(() => dbAllPlayers().then(setDbPlayers), 60000);
    return () => clearInterval(iv);
  }, []);
  const [qAccept, setQAccept] = useState({});
  const [qNotes, setQNotes] = useState({});
  const [qThreads, setQThreads] = useState({});
  /* 현관 비밀번호는 이름(집주인)별로 따로 저장합니다.
     예전엔 브라우저에 하나만 저장돼서, 다른 이름으로 접속해도 「비번 있음」으로 처리됐어요. */
  const [pwMap, setPwMap] = useState(() => {
    const m = loadJSON("echotown_pw_v2", null);
    if (m && typeof m === "object") return m;
    const legacy = loadJSON("echotown_pw", null);   // 예전 형식 이어받기
    return legacy ? { __legacy: legacy } : {};
  });
  const housePw = (myName && pwMap[myName]) || null;
  const setHousePw = (pw) => setPwMap((m) => {
    const n = { ...m, [myName || "__legacy"]: pw };
    saveJSON("echotown_pw_v2", n);
    return n;
  });
  const [mail, setMail] = useState(() => loadJSON("echotown_mail", []));
  const [unlocked, setUnlocked] = useState({});
  const [mailTarget, setMailTarget] = useState(null);
  const [giftTarget, setGiftTarget] = useState(null);
  const [giftAlert, setGiftAlert] = useState(null);
  const [shrineDraft, setShrineDraft] = useState(null);   // 보스맵 완료 → 제단 자동 입력

  /* 📮 피드백 — 모두에게 공유 */
  const FB_KEY = "echotown_feedback_v1";
  const [feedback, setFeedback] = useState(() => { const v = loadJSON(FB_KEY, []); return Array.isArray(v) ? v : []; });
  const fbRef = useRef(feedback); fbRef.current = feedback;
  useEffect(() => { saveJSON(FB_KEY, feedback.slice(0, 60)); }, [feedback]);
  /* 이 브라우저의 고유 ID — 익명으로 올려도 본인 글은 지울 수 있게 (이름은 안 남겨요) */
  const myUid = useMemo(() => {
    let u = loadJSON("echotown_uid", "");
    if (!u) { u = "u" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); saveJSON("echotown_uid", u); }
    return u;
  }, []);
  const addFeedback = (text, anon) => {
    const row = { id: Date.now() + Math.random(), text, by: anon ? "익명" : (myName || "익명"), uid: myUid, done: false, doneBy: null,
      at: new Date().toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) };
    setFeedback((v) => [row, ...v].slice(0, 60));
    if (netSendEvent) netSendEvent("fb", { row });

  };
  const delFeedback = (id) => {
    setFeedback((v) => v.filter((x) => !(x.id === id && x.uid === myUid)));
    if (netSendEvent) netSendEvent("fb", { del: id, uid: myUid });
  };
  const checkFeedback = (id, done) => {
    const by = done ? (myName || "익명") : null;
    setFeedback((v) => v.map((x) => (x.id === id ? { ...x, done, doneBy: by } : x)));
    if (netSendEvent) netSendEvent("fb", { check: { id, done, by } });
  };

  /* 🗺 보스맵 퀘스트 — 저장 + 접속자 모두와 공유 */
  const [bossMaps, setBossMaps] = useState(() => mergeMaps(BOSS_MAPS_INIT, loadJSON(BOSSMAP_KEY, null)));
  const bossMapsRef = useRef(bossMaps); bossMapsRef.current = bossMaps;
  useEffect(() => { saveJSON(BOSSMAP_KEY, bossMaps); }, [bossMaps]);

  const applyBossOp = useCallback((op) => {
    setBossMaps((ms) => {
      if (op.addMap) return ms.some((m) => m.id === op.addMap.id) ? ms : [...ms, op.addMap];
      return ms.map((m) => {
        if (m.id !== op.mapId) return m;
        if (op.addQuest) {
          if (m.stages.some((st) => st.quests.some((q) => q.id === op.addQuest.id))) return m;
          return { ...m, stages: m.stages.map((st) => (st.n !== op.stageN ? st : { ...st, quests: [op.addQuest, ...st.quests] })) };
        }
        if (op.editQuest) {
          return { ...m, stages: m.stages.map((st) => ({ ...st, quests: st.quests.map((q) => (q.id !== op.editQuest.id ? q : { ...q, ...op.editQuest, gem: op.editQuest.gem || q.gem, icon: op.editQuest.icon || q.icon })) })) };
        }
        if (op.delQuest) {
          return { ...m, stages: m.stages.map((st) => ({ ...st, quests: st.quests.filter((q) => q.id !== op.delQuest) })) };
        }
        return m;
      });
    });
  }, []);
  const sendBoss = (op) => { applyBossOp(op); if (netSendEvent) netSendEvent("bmap", op); };

  /* 📖 코어사전 · 🖼 갤러리 — 접속자 모두와 공유 */
  const [dict, setDict] = useState(() => { const v = loadJSON(DICT_KEY, []); return Array.isArray(v) ? v : []; });
  const [gallery, setGallery] = useState(() => { const v = loadJSON(GALLERY_KEY, []); return Array.isArray(v) ? v : []; });
  const dictRef = useRef(dict); dictRef.current = dict;
  const galRef = useRef(gallery); galRef.current = gallery;
  useEffect(() => { saveJSON(DICT_KEY, dict); }, [dict]);
  useEffect(() => { try { window.localStorage.setItem(GALLERY_KEY, JSON.stringify(gallery.slice(0, 40))); } catch (e) {} }, [gallery]);
  /* 서버(supabase) 사전도 함께 읽어와 합칩니다 */
  const loadDict = useCallback(() => {
    dbDictList().then((r) => { if (r && r.length) setDict((v) => mergeDict(r, v)); }).catch(() => {});
  }, []);
  useEffect(() => { loadDict(); }, [loadDict]);
  /* 접속 후 다른 사람들에게 사전·갤러리를 요청 */
  const askSync = useCallback(() => {
    if (netSendEventRef.current) netSendEventRef.current("dictreq", { from: myNameRef.current || "" });
  }, []);
  useEffect(() => {
    if (!myName) return;
    const t = setTimeout(askSync, 2500);
    return () => clearTimeout(t);
  }, [myName, askSync]);

  const saveWord = (w, m, renamedFrom) => {
    const row = { word: w, meaning: m, updated_by: myName || "익명", updated_at: new Date().toISOString() };
    setDict((v) => mergeDict([row], v.filter((x) => x.word !== w && x.word !== renamedFrom)));
    if (netSendEvent) netSendEvent("dict", { row, renamedFrom: renamedFrom || null });
    if (renamedFrom && renamedFrom !== w) dbDictDelete(renamedFrom);
    dbDictSave(w, m, myName || "익명").then((ok) => { if (ok) loadDict(); });
  };
  const delWord = (w) => {
    setDict((v) => v.filter((x) => x.word !== w));
    if (netSendEvent) netSendEvent("dict", { del: w });
    dbDictDelete(w);
  };
  const addPhotos = (srcs) => {
    const at = new Date().toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
    const rows = srcs.map((src, i) => ({ id: `${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`, src, caption: "", by: myName || "익명", at }));
    setGallery((v) => [...rows, ...v].slice(0, 80));
    rows.forEach((ph, i) => setTimeout(() => { if (netSendEvent) netSendEvent("gal", { photo: ph }); }, 260 * i));
  };
  const setCaption = (id, caption) => {
    setGallery((v) => v.map((x) => (x.id === id ? { ...x, caption } : x)));
    if (netSendEvent) netSendEvent("gal", { cap: { id, caption } });
  };
  const delPhoto = (id) => {
    setGallery((v) => v.filter((x) => x.id !== id));
    if (netSendEvent) netSendEvent("gal", { del: id });
  };
  const [songs, setSongs] = useState(() => [
    { id: 1, artist: "Bazzi", title: "Mine", desc: "요즘 즐겨듣는 노래에요", videoId: null, q: "Bazzi Mine" },
    { id: 2, artist: "LANY", title: "ILYSB", desc: "드라이브할 때 최고 🚗", videoId: null, q: "LANY ILYSB" },
    { id: 3, artist: "아이유", title: "밤편지", desc: "자기 전에 듣기 좋아요 🌙", videoId: null, q: "아이유 밤편지" },
  ]);
  const playYt = (s) => {
    setYtNow(s); setYtOpen(true);
    setWorldBgm((b) => ({ ...b, playing: false }));   // 마을 BGM 은 잠시 멈춤
    showNotice(`▶ ${s.artist ? s.artist + " - " : ""}${s.title} 재생 중`);
  };
  const [profileTab, setProfileTab] = useState(null);
  const [notice, setNotice] = useState(null);
  const showNotice = (t) => { setNotice(t); setTimeout(() => setNotice(null), 3200); };
  const [visitor, setVisitor] = useState(null);
  const [invite, setInvite] = useState(null);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineWhy, setDeclineWhy] = useState("");
  const [myMeetings, setMyMeetings] = useState([]);
  const [stats, setStats] = useState(() => loadStats());
  const [newBadge, setNewBadge] = useState(null);
  const statsRef = useRef(stats);
  statsRef.current = stats;
  const gotRef = useRef(loadJSON("echotown_got", {}));
  const awardBadge = (b) => {
    if (!b || gotRef.current[b.id]) return;
    gotRef.current = { ...gotRef.current, [b.id]: true };
    saveJSON("echotown_got", gotRef.current);
    setTimeout(() => setNewBadge(b), 300);
  };
  const bump = useCallback((k, n = 1) => {
    setStats((prev) => {
      const before = prev[k] || 0;
      const next = { ...prev, [k]: before + n };
      saveStats(next);
      const got = BADGES.filter((b) => b.stat === k && next[k] >= b.need).sort((a, b2) => b2.need - a.need)[0];
      if (got) awardBadge(got);
      return next;
    });
  }, []);
  useEffect(() => {
    const cur = loadStats();
    const next = { ...cur, visit: (cur.visit || 0) + 1 };
    saveStats(next);
    setStats(next);
    const got = BADGES.filter((b) => b.stat === "visit" && next.visit >= b.need).sort((a, b2) => b2.need - a.need)[0];
    if (got && !gotRef.current[got.id]) { gotRef.current = { ...gotRef.current, [got.id]: true }; saveJSON("echotown_got", gotRef.current); setTimeout(() => setNewBadge(got), 1200); }
  }, []);

  const timers = useRef({});
  useEffect(() => () => Object.values(timers.current).forEach(clearInterval), []);

  // 폰트
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=DotGothic16&family=Press+Start+2P&display=swap";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  const expInfo = useMemo(() => {
    let lv = 1, rem = Math.max(0, Math.round(exp)), need = 100;
    while (rem >= need && lv < 99) { rem -= need; lv++; need = Math.round(need * 1.3); }
    return { lv, rem, need, pct: Math.min(100, Math.round((rem / need) * 100)) };
  }, [exp]);
  const lvRef = useRef(null);
  useEffect(() => {
    if (lvRef.current !== null && expInfo.lv > lvRef.current) showNotice(`🎉 레벨 업! Lv.${expInfo.lv} 달성`);
    lvRef.current = expInfo.lv;
  }, [expInfo.lv]);

  const bigMeta = useMemo(() => BIG_BUILDINGS.find((b) => b.id === bigId) || null, [bigId]);
  const houseMeta = useMemo(() => HOUSES.find((h) => h.id === houseId) || null, [houseId]);
  const rentMeta = useMemo(() => RENT_HOUSES.find((h) => h.id === rentId) || null, [rentId]);

  /* 💎 젬 = 퀘스트(업무·사고) 보상 전용 · 중앙은행에서 실제 화폐로 환전 가능 */
  const award = useCallback((n) => { setGems((g) => g + n); setLifetime((l) => l + n); setExp((e) => e + Math.max(1, Math.round(n * 3))); }, []);
  /* 🪙 골드 = 마을 안에서만 쓰는 화폐 (놀이·운동·생활 보상) */
  const awardGold = useCallback((n) => { setGold((g) => g + n); setExp((e) => e + Math.max(1, Math.round(n))); }, []);

  const sayBubble = useCallback((text) => {
    const t = String(text || "");
    setBubble(t.length > 50 ? t.slice(0, 50) + "…" : t);
    clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubble(null), 3000);
  }, []);
  useEffect(() => () => clearTimeout(bubbleTimer.current), []);
  const postChat = useCallback((text, isShout) => {
    const t = text.trim(); if (!t) return;
    setChat((c) => [...c, { id: Date.now() + Math.random(), at: Date.now(), nick: myName || "나", text: t, shout: isShout, me: true }].slice(-12));
    sayBubble(t);
    if (netSendChat) netSendChat(t, isShout);
    bump("chat");
    if (isShout) bump("shout");
    if (isShout) setShout(false);
  }, [sayBubble, myName, netSendChat, bump]);
  useEffect(() => {
    onChatRef.net = (kind, p) => {
      if (!p) return;
      if (kind === "qchat" || kind === "qparty" || kind === "qlock" || kind === "qleave" || kind === "mchat" || kind === "dict" || kind === "dictreq" || kind === "gal" || kind === "bmap" || kind === "fb" || kind === "worry" || kind === "lg" || kind === "schat" || kind === "rec" || kind === "reel" || kind === "shr") { /* 전체 공유 */ } else if (p.to !== (myName || "")) return;
      if (kind === "bell") { playBell(); setVisitor(p.from); }
      if (kind === "invite") { playBell(); setInvite(p); pushMsg("invite", { from: p.from, when: p.when, dur: p.dur, room: p.room, roomId: p.roomId }); }
      if (kind === "inviteack") {
        showNotice(`${p.from}님이 회의에 ${p.ok ? "참석" : "불참"}한다고 답했어요${!p.ok && p.reason ? " — " + p.reason : ""}`);
        pushMsg("dm", { from: p.from, text: p.ok ? "회의 초대에 참석하겠습니다 👍" : `회의 초대 불참합니다.\n사유: ${p.reason || "(사유 없음)"}` });
      }
      if (kind === "dict") {
        if (p.del) setDict((v) => v.filter((x) => x.word !== p.del));
        else if (p.row) setDict((v) => mergeDict([p.row], v.filter((x) => x.word !== p.row.word && x.word !== p.renamedFrom)));
        return;
      }
      if (kind === "gal") {
        if (p.del) setGallery((v) => v.filter((x) => x.id !== p.del));
        else if (p.cap) setGallery((v) => v.map((x) => (x.id === p.cap.id ? { ...x, caption: p.cap.caption } : x)));
        else if (p.photo) setGallery((v) => (v.some((x) => x.id === p.photo.id) ? v : [p.photo, ...v].slice(0, 80)));
        return;
      }
      if (kind === "dictreq") {
        if (p.from === (myName || "")) return;
        const mine = dictRef.current || [];
        if (netSendEvent) netSendEvent("dictres", { to: p.from, dict: mine, maps: bossMapsRef.current, fb: fbRef.current, worry: worryRef.current, rec: recRef.current, reel: reelRef.current, shr: shrineRef.current });
        const gs = galRef.current || [];
        gs.slice(0, 12).forEach((ph, i) => setTimeout(() => { if (netSendEvent) netSendEvent("gal", { photo: ph }); }, 350 * (i + 1)));
        return;
      }
      if (kind === "dictres") {
        if (p.dict) setDict((v) => mergeDict(p.dict, v));
        if (p.maps) setBossMaps((v) => mergeMaps(BOSS_MAPS_INIT, mergeMaps(v, p.maps)));
        if (Array.isArray(p.fb)) setFeedback((v) => { const ids = new Set(v.map((x) => x.id)); return [...v, ...p.fb.filter((x) => !ids.has(x.id))].sort((a, b) => b.id - a.id).slice(0, 60); });
        if (Array.isArray(p.shr)) setShrineItems((v) => { const ids = new Set(v.map((x) => x.id)); return [...v, ...p.shr.filter((x) => !ids.has(x.id))].sort((a, b) => b.id - a.id).slice(0, 120); });
        if (Array.isArray(p.rec)) setRecList((v) => { const ids = new Set(v.map((x) => x.id)); return [...v, ...p.rec.filter((x) => !ids.has(x.id))].slice(-60); });
        if (p.reel && typeof p.reel === "object") setReelExtra((v) => ({ ...p.reel, ...v }));
        if (Array.isArray(p.worry)) setWorries((v) => { const ids = new Set(v.map((x) => x.id)); return [...v, ...p.worry.filter((x) => !ids.has(x.id))].sort((a, b) => b.id - a.id).slice(0, 80); });
        return;
      }
      if (kind === "bmap") { applyBossOp(p); return; }
      if (kind === "fb") {
        if (p.row) setFeedback((v) => (v.some((x) => x.id === p.row.id) ? v : [p.row, ...v].slice(0, 60)));
        else if (p.del) setFeedback((v) => v.filter((x) => !(x.id === p.del && x.uid === p.uid)));   // 작성자 본인만 삭제
        else if (p.check) setFeedback((v) => v.map((x) => (x.id === p.check.id ? { ...x, done: p.check.done, doneBy: p.check.by } : x)));
        return;
      }
      if (kind === "lg") {
        if (p.state) { setLiarGame(p.state); return; }
        // 호스트만 참가자 요청을 처리합니다
        if (p.req) { const g = lgRef.current; if (g && g.host === (myName || "나")) lgApplyRef.current && lgApplyRef.current(p.req.type, p.req.payload, p.req.from); }
        return;
      }
      if (kind === "shr") {
        if (p.row) setShrineItems((v) => (v.some((x) => x.id === p.row.id) ? v : [p.row, ...v].slice(0, 120)));
        else if (p.del) setShrineItems((v) => v.filter((x) => x.id !== p.del));
        else if (p.patch) setShrineItems((v) => v.map((x) => (x.id === p.patch.id ? { ...x, [p.patch.key]: p.patch.val, [p.patch.key + "By"]: p.patch.by } : x)));
        return;
      }
      if (kind === "rec") { if (p.row) setRecList((v) => (v.some((x) => x.id === p.row.id) ? v : [...v, p.row].slice(-60))); return; }
      if (kind === "reel") { if (p.key) setReelExtra((v) => ({ ...v, [p.key]: p.data })); return; }
      if (kind === "worry") { if (p.row) setWorries((v) => (v.some((x) => x.id === p.row.id) ? v : [p.row, ...v].slice(0, 80))); return; }
      if (kind === "mchat") { if (p.who !== (myName || "나")) pushMeetingChat(p.room, { who: p.who, text: p.text, me: false }); return; }
      if (kind === "schat") { if (p.who !== (myName || "나")) pushSmoke({ who: p.who, text: p.text, me: false, at: p.at }); return; }
      if (kind === "dm") { pushDm(p.from, { me: false, text: p.text }); pushMsg("dm", { from: p.from, text: p.text }); showNotice(`💬 ${p.from}님: ${String(p.text).slice(0, 20)}`); }
      if (kind === "call") {
        playBell();
        setIncomingCall({ from: p.from, avatar: "🧑" });
        clearTimeout(callTimer.current);
        callTimer.current = setTimeout(() => {
          setIncomingCall((c) => {
            if (c && c.from === p.from) { pushMsg("call", { from: p.from, reason: "받지 못한 통화예요" }); showNotice(`📵 ${p.from}님의 부재중 통화`); return null; }
            return c;
          });
        }, 15000);
      }
      if (kind === "qchat") {
        setQThreads((t) => ({ ...t, [p.qid]: [...(t[p.qid] || []), { who: p.who, text: p.text }] }));
        return;
      }
      if (kind === "qparty") {
        setQAccept((a) => (a[p.qid] ? { ...a, [p.qid]: { ...a[p.qid], party: Array.from(new Set([...(a[p.qid].party || []), p.who])) } } : a));
        return;
      }
      if (kind === "qleave") {
        setQAccept((a) => {
          const cur = a[p.qid]; if (!cur) return a;
          const party = (cur.party || []).filter((n) => n !== p.who);
          const agree = (cur.agree || []).filter((n) => n !== p.who);
          if (party.length === 0) { const n = { ...a }; delete n[p.qid]; return n; }
          return { ...a, [p.qid]: { ...cur, party, agree, locked: party.length > 0 && party.every((n) => agree.includes(n)) } };
        });
        return;
      }
      if (kind === "qlock") {
        setQAccept((a) => {
          const cur = a[p.qid]; if (!cur) return a;
          const agree = Array.from(new Set([...(cur.agree || []), p.who]));
          const party = cur.party || [];
          const locked = party.length > 0 && party.every((n) => agree.includes(n));
          return { ...a, [p.qid]: { ...cur, agree, locked } };
        });
        return;
      }
      if (kind === "pwtry") {
        const ok = !!housePw && p.pw === housePw;
        if (netSendEvent) netSendEvent("door", { to: p.from, from: myName, ok });
        if (ok) showNotice(`🔓 ${p.from}님이 비밀번호로 들어왔어요`);
      }
      if (kind === "door") {
        if (p.ok) { setUnlocked((u) => (houseIdRef.current ? { ...u, [houseIdRef.current]: true } : u)); showNotice("🚪 문이 열렸어요! 들어가세요"); }
        else showNotice("🚫 지금은 곤란하대요…");
      }
      if (kind === "mail") {
        const item = { from: p.from, text: p.text, item: p.item, at: new Date().toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) };
        setMail((v) => [...v, item]);
        if (p.item) setThanksInv((v) => [...v, p.item]);
        pushMsg("gift", { from: p.from, text: p.text, item: p.item || null });
        playBell();
        setGiftAlert({ from: p.from, text: p.text, item: p.item || null });
      }
    };
  }, [myName, housePw, netSendEvent]);
  useEffect(() => {
    onChatRef.current = (m) => {
      if (!m || m.id === MY_ID) return;
      setChat((c) => [...c, { id: Date.now() + Math.random(), at: Date.now(), nick: m.name || "익명", text: m.text, shout: m.shout }].slice(-12));
    };
  }, []);
  const sendMail = (payload) => {
    if (gold < 0.3) return;
    setGold((g) => g - 0.3);
    if (payload.item) setThanksInv((v) => v.filter((_, i) => i !== payload.item._i));
    if (netSendEvent) netSendEvent("mail", payload);
    dbSendMail(payload.to, payload.from, payload.text, payload.item || null);
    showNotice("📮 우체통에 넣었어요!");
  };
  const sendGift = (payload) => {
    if (payload.item) setThanksInv((v) => v.filter((_, i) => i !== payload.item._i));
    if (netSendEvent) netSendEvent("mail", payload);
    dbSendMail(payload.to, payload.from, payload.text, payload.item || null);
    showNotice(`🎁 ${payload.to}님에게 보냈어요!`);
  };
  const ringBell = (owner) => { if (netSendEvent) netSendEvent("bell", { to: owner, from: myName || "익명" }); };
  const [savedAt, setSavedAt] = useState(null);
  const saveTimer = useRef(null);
  /* 현재 저장할 내용을 항상 최신으로 들고 있습니다 */
  const payloadRef = useRef(null);
  payloadRef.current = { gems, gold, exp, lifetime, townRegion, profile, skills, schoolDone, pets, activePet, fishes, facilities, homeGifts, fridge, outfit, owned, ikeaOwned, houseSkin, vehicle, myFurni, thanksInv, memos, stats, housePw, couponDone, qNotes, qAccept };
  const flushSaveRef = useRef(null);
  const flushSave = useCallback((name) => {
    const n = name || myNameRef.current;
    if (!n || !payloadRef.current) return;
    const payload = { savedAt: Date.now(), ...payloadRef.current };
    const okLocal = saveJSON(saveKey(n), payload);   // 이 브라우저에 먼저 (서버가 안 돼도 유지)
    setSavedAt({ at: Date.now(), local: okLocal !== false, server: null });
    dbSaveProfile(n, payload).then((ok) => setSavedAt((v) => ({ ...(v || {}), server: !!ok })));
  }, []);
  flushSaveRef.current = flushSave;

  useEffect(() => {
    if (!myName) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => flushSave(myName), 800);
    return () => clearTimeout(saveTimer.current);
  }, [myName, gems, gold, exp, lifetime, townRegion, profile, skills, schoolDone, pets, activePet, fishes, facilities, homeGifts, fridge, outfit, owned, ikeaOwned, houseSkin, vehicle, myFurni, thanksInv, memos, stats, housePw, couponDone, qNotes, qAccept, flushSave]);

  /* 새로고침·탭 닫기·탭 전환 직전에 밀린 저장을 즉시 반영 */
  useEffect(() => {
    const flush = () => { if (myNameRef.current) flushSave(myNameRef.current); };
    const onHide = () => { if (document.hidden) flush(); };
    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [flushSave]);

  const AVATARS = ["🧑", "👩", "🧑‍💻", "👨‍💼", "👩‍🎨", "🧑‍🍳", "👩‍🔬", "🧑‍🎤", "👨‍🌾", "👩‍🏫"];
  const people = useMemo(() => {
    const online = Object.values(netOthers).map((o) => o.name).filter(Boolean);
    const bad = /[ㄱ-ㅎㅏ-ㅣ]/;
    const names = Array.from(new Set([...(myName ? [myName] : []), ...online, ...dbPlayers])).filter((n) => n && !bad.test(n));
    return names.map((n, i) => ({
      avatar: AVATARS[(n.charCodeAt(0) + n.length) % AVATARS.length],
      name: n,
      me: n === myName,
      online: n === myName || online.includes(n),
      job: n === myName ? "나" : (online.includes(n) ? "🟢 접속 중" : "⚪ 오프라인"),
      stats: { 체력: 70, 마나: 70, 집중: 70, 친화: 70 },
      equipment: ["🎒 인벤토리"], achievements: ["🌱 에코타운 주민"], quests: ["마을 생활"], affiliation: "ECHO TOWN",
    }));
  }, [netOthers, dbPlayers, myName]);

  const requestWorldSong = (title) => {
    if (gold < 5) return;
    setGold((g) => g - 5);
    setWorldBgm((b) => ({ ...b, title, playing: true, seq: (b.seq || 0) + 1 }));
  };

  const runQuest = useCallback((q) => {
    setQs((prev) => {
      const st = prev[q.id];
      if (st.running) return prev;
      if (q.repeat ? st.doneDay === day : st.doneOnce) return prev;
      const step = 40, inc = 100 / (q.duration / step);
      timers.current[q.id] = setInterval(() => {
        setQs((p) => {
          const cur = p[q.id];
          const np = cur.progress + inc;
          if (np >= 100) {
            clearInterval(timers.current[q.id]); delete timers.current[q.id];
            award(q.reward);
            setHp((h) => Math.max(0, h - 8));
            setMp((m) => Math.max(0, m - 6));
            return { ...p, [q.id]:{ ...cur, running: false, progress: 100, doneDay: q.repeat ? day : cur.doneDay, doneOnce: q.repeat ? cur.doneOnce : true } };
          }
          return { ...p, [q.id]: { ...cur, progress: np } };
        });
      }, step);
      return { ...prev, [q.id]: { ...st, running: true, progress: 0 } };
    });
  }, [day, award]);

  const nextDay = () => {
    setDay((d) => d + 1);
    setHp(100); setMp(100);
    setQs((p) => {
      const o = { ...p };
      Object.keys(o).forEach((k) => { o[k] = { ...o[k], progress: o[k].doneOnce ? 100 : 0 }; });
      return o;
    });
  };

  const handleEnter = (o) => {
    switch (o.kind) {
      case "center": setView("center"); break;
      case "bank": setView("bank"); break;
      case "board": setView("board"); break;
      case "big": setBigId(o.id); setView("big"); break;
      case "house": setUnlocked({}); houseIdRef.current = o.id; setHouseId(o.id); setView("house"); break;
      case "small": if (o.id === "smoke") bump("smoke"); setView(o.id); break; // thanks/heart/listening/reels/smoke
      case "shrine": setView("questdone"); break;
      case "facility": setView(o.id); break; // pool/gym
      case "rent": setRentId(o.id); setView("rent"); break;
      default: break;
    }
  };

  const doExchange = (amount) => {
    setGems((g) => g - amount);
    setExchanged((e) => e + amount);
    setHistory((h) => [{ id: Date.now(), amount, won: amount * GEM_TO_WON, time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) }, ...h]);
  };

  const backToWorld = () => setView("world");

  return (
    <NetContext.Provider value={{ others: netOthers, view, room: netRoomIdRef.current, roomPosRef: netRoomPosRef }}>
    <div style={{ fontFamily: "'DotGothic16', monospace", minHeight: "100vh", background: `repeating-linear-gradient(45deg, ${C.grass} 0 24px, ${C.grassDark} 24px 48px)`, color: C.ink, padding: 14, boxSizing: "border-box" }}>
      <StyleBlock />
      <audio ref={audioRef} src={import.meta.env.BASE_URL + encodeURIComponent(worldBgm.file)} preload="auto" onEnded={() => stepTrack(1)} />
      <div style={{ maxWidth: 960, margin: "0 auto 12px" }}>
        <Panel style={{ padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🌱</span>
            <div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, color: C.inkSoft }}>ECHO TOWN <span style={{ fontSize: 7, opacity: 0.7 }}>{APP_VERSION}</span></div>
              <div style={{ fontSize: 13, color: C.inkSoft }}>오픈월드 워크 시뮬레이터</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 168 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 10, width: 20, color: C.inkSoft, fontWeight: "bold" }}>Lv{expInfo.lv}</span>
                <div style={{ flex: 1, height: 9, background: "#e2d3ab", border: `2px solid ${C.ink}`, position: "relative", overflow: "hidden" }} title={`경험치 ${expInfo.rem} / ${expInfo.need}`}>
                  <div style={{ height: "100%", width: `${expInfo.pct}%`, background: "linear-gradient(90deg,#7fe3ff,#5b8def)", transition: "width .3s" }} />
                </div>
                <span style={{ fontSize: 9, color: C.inkSoft, width: 30, textAlign: "right" }}>{expInfo.pct}%</span>
              </div>
              <VitalBar label="HP" val={hp} color={C.danger} />
              <VitalBar label="MP" val={mp} color="#3a7bd5" />
            </div>
            <div title={curWx && curWx.at ? `${wxName} 실시간 예보 · ${new Date(curWx.at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 기준 (10분마다 갱신)` : "날씨 불러오는 중"}
              style={{ display: "flex", alignItems: "center", gap: 6, background: C.parch, border: `2px solid ${C.ink}`, padding: "4px 8px" }}>
              <span style={{ fontSize: 16 }}>{curWx ? wxIcon(curWx.code) : "⏳"}</span>
              <div style={{ lineHeight: 1.1 }}>
                <div style={{ fontSize: 13, fontWeight: "bold" }}>{curWx ? `${curWx.temp}°` : "--"}</div>
                <div style={{ fontSize: 9, color: C.inkSoft }}>{wxName}</div>
              </div>
            </div>
            <PxButton tone="wood" onClick={() => setRegionOpen(true)} style={{ fontSize: 10, padding: "5px 7px" }}>＋지역</PxButton>
            {regionOpen && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 14 }} onClick={() => setRegionOpen(false)}>
                <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 340, maxHeight: "calc(100vh - 28px)", overflowY: "auto" }}>
                  <Panel style={{ padding: 14 }}>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, marginBottom: 10 }}>📍 마을 지역 선택</div>
                    <div style={{ fontSize: 11, color: C.inkSoft, marginBottom: 8, lineHeight: 1.7 }}>실제 날씨 예보를 10분마다 가져와요.<br />비가 오는 날에는 마을에도 비가 내립니다 🌧</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {Object.keys(REGIONS).map((r) => (
                        <PxButton key={r} tone={r === townRegion ? "good" : "wood"} onClick={() => { setTownRegion(r); saveJSON("echotown_region", r); setRegionOpen(false); }} style={{ padding: 10, fontSize: 13 }}>{r}</PxButton>
                      ))}
                    </div>
                  </Panel>
                </div>
              </div>
            )}
            <PxButton tone="wood" onClick={() => { setNameInput(myName); setNameOpen(true); }} style={{ fontSize: 11, padding: "5px 9px" }}>🧑 {myName || "이름 설정"}</PxButton>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: C.inkSoft }}>🪙 골드 (마을 전용)</div>
              <GemBadge kind="gold" amount={gold} big />
              <div style={{ fontSize: 10, color: C.inkSoft, marginTop: 4 }}>💎 젬 (환전 가능)</div>
              <GemBadge amount={gems} big />
            </div>
          </div>
        </Panel>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        {view === "world" && <WorldView pos={worldPos} setPos={setWorldPos} day={day} gems={gold} sprites={allSprites} cutCfg={cutCfg} look={myLook} carry={carrying} pet={petEmoji} shuffle={shuffle} onShuffle={toggleShuffle} onNextTrack={() => stepTrack(1)} onPrevTrack={() => stepTrack(-1)} onReconnect={netReconnect} onDismount={() => { setVehicle(null); showNotice("🚶 탈것에서 내렸어요"); }} rentedHouses={rented} onEnter={handleEnter} onNextDay={nextDay} bgm={worldBgm} onToggleBgm={() => setWorldBgm((b) => ({ ...b, playing: !b.playing }))} onRequestSong={requestWorldSong} tracks={WORLD_TRACKS} onSelectTrack={selectTrack} outfit={outfit} vehicle={vehicle} houseSkin={houseSkin} isMyHouse={isMyHouse} bubble={bubble} townRain={townRain} cmRain={cmRain} others={netOthers} netCount={netCount} netStatus={netStatus} facingRef={netFacingRef} bgmVol={bgmVol} onBgmVol={setBgmVol} danceRef={netDanceRef} myNick={myName} onGift={(n) => setGiftTarget(n)} />}
        {view === "center" && <CenterView meetings={myMeetings} meetingRooms={meetingRooms} chat={centerChat} onSend={(t) => setCenterChat((c) => [...c, { who: "나", text: t, me: true }])} onEnterMeeting={(id) => { setMeetingId(id); setView("meeting"); }} onBack={backToWorld} bubble={bubble} onDrink={() => { setHp((h) => Math.min(100, h + 20)); setMp((m) => Math.min(100, m + 20)); }} />}
        {view === "meeting" && meetingId && <MeetingView roomId={meetingId} room={meetingRooms[meetingId]} myName={myName} people={people}
          chat={meetingChat[meetingId] || []}
          onChat={(t) => { pushMeetingChat(meetingId, { who: myName || "나", text: t, me: true }); if (netSendEvent) netSendEvent("mchat", { room: meetingId, who: myName || "나", text: t }); }}
          onInvite={(p) => {
            const body = `📨 회의 초대장\n${p.when} 회의 / 초대원 : ${p.to}\n예상 회의시간 : ${p.dur}\n장소 : ${p.room} · 주최 ${myName || "나"}`;
            if (netSendEvent) netSendEvent("invite", { to: p.to, from: myName || "나", when: p.when, dur: p.dur, room: p.room, roomId: p.roomId });
            dbSendMail(p.to, myName || "나", body, null);
            showNotice(`📨 ${p.to}님에게 초대장을 보냈어요`);
          }}
          onUpdate={(id, patch) => setMeetingRooms((m) => ({ ...m, [id]: { ...m[id], ...patch } }))} onBack={() => setView("center")} />}
        {view === "big" && bigMeta && (bigMeta.id === "alba" ? <AlbaView onBack={backToWorld} /> : <BigBuildingView b={bigMeta} qs={qs} day={day} onRun={runQuest} onBack={backToWorld} />)}        {view === "house" && houseMeta && (unlocked[houseId] ? (
          <HomeView fishes={isMyHouse(houseMeta.name) ? fishes : []} hasAquarium={isMyHouse(houseMeta.name) && facilities.includes("aquarium")} hasYard={isMyHouse(houseMeta.name) && facilities.includes("yard")} petsAtHome={isMyHouse(houseMeta.name) ? PETS.filter((x) => pets.includes(x.id) && x.id !== activePet).map((x) => `${x.emoji} ${x.name}`) : []} onOpenAqua={() => setAquaOpen(true)} gifts={isMyHouse(houseMeta.name) ? homeGifts : []} fridge={isMyHouse(houseMeta.name) ? fridge : []} house={houseMeta} skin={isMyHouse(houseMeta.name) ? houseSkin : null} extras={isMyHouse(houseMeta.name) ? myFurni : []} memo={memos[houseId]} onSaveMemo={(t) => setMemos((m) => ({ ...m, [houseId]: t }))} onBack={backToWorld} bubble={bubble} />
        ) : (
          <HouseGate house={houseMeta} isMine={isMyHouse(houseMeta.name)} myName={myName} hasPw={!!housePw}
            onSetPw={(p) => { setHousePw(p); }}
            onEnter={(p) => {
              if (!p) return false;
              if (isMyHouse(houseMeta.name)) {
                if (p === housePw) { setUnlocked((u) => ({ ...u, [houseId]: true })); return true; }
                return false;
              }
              const ow = (houseMeta.name || "").replace(/이네$|네$/, "");
              if (netSendEvent) { netSendEvent("pwtry", { to: ow, from: myName, pw: p }); return "wait"; }
              return false;
            }}
            onBell={ringBell} onMail={(owner) => { setMailTarget(owner); if (owner === myName) dbLoadMail(owner).then((ms) => setMail(ms || [])); }} onBack={backToWorld} />
        ))}
        {view === "thanks" && <ThanksView gems={gold} inventory={thanksInv} postits={postits} onBuy={(it) => { setGold((g) => g - it.price); setThanksInv((v) => [...v, it]); }} onPost={(p) => setPostits((v) => [...v, { ...p, id: Date.now() }])} onBack={backToWorld} bubble={bubble} />}
        {view === "heart" && <HeartView gems={gold} worries={worries} onPost={(text, cost, kind) => { setGold((g) => g - cost); addWorry(text, kind); }} onBack={backToWorld} bubble={bubble} />}
        {view === "listening" && <ListeningView onBack={backToWorld} gems={gold} onSpend={(n) => setGold((g) => g - n)} bubble={bubble} songs={songs} setSongs={setSongs} onPlayYt={playYt} ytNow={ytNow} />}
        {view === "reels" && <ReelsView onBack={backToWorld} bubble={bubble} extraCats={reelExtra} onAddCat={addReel} />}
        {view === "minigame" && <MiniGameRoom myName={myName} people={people} onBack={backToWorld} onReward={(n) => awardGold(n)} bubble={bubble} liarGame={liarGame} onLiarAction={lgAction} />}
        {view === "pool" && <PoolView myName={myName} onBack={backToWorld} onReward={(n) => awardGold(n)} scores={swimScores} onRecord={(nick, time) => { setSwimScores((s) => [...s, { nick, time }]); bump("swim"); dbAddRank("swim", nick, time, null).then(reloadRanks); }} bubble={bubble} />}
        {view === "gym" && <GymView onBack={backToWorld} onWork={() => { awardGold(4); bump("gym"); }} bubble={bubble} />}
        {view === "smoke" && <SmokeView onBack={backToWorld} bubble={bubble} myName={myName} chat={smokeChat}
          onChat={(t) => {
            const at = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
            pushSmoke({ who: myName || "나", text: t, me: true, at });
            if (netSendEvent) netSendEvent("schat", { who: myName || "나", text: t, at });
          }} />}
        {view === "coredict" && <CoreDictView myName={myName} onBack={backToWorld} netCount={netCount}
          dict={dict} gallery={gallery} onSaveWord={saveWord} onDelWord={delWord}
          onAddPhotos={addPhotos} onCaption={setCaption} onDelPhoto={delPhoto} onSync={askSync} />}
        {view === "petshop" && <PetShop onBack={backToWorld} bubble={bubble} gold={gold} pets={pets} activePet={activePet} fishes={fishes} facilities={facilities}
          onBuyFacility={(fc) => { if (gold < fc.price || facilities.includes(fc.id)) return; setGold((g) => g - fc.price); setFacilities((v) => [...v, fc.id]); showNotice(`${fc.emoji} ${fc.name}을(를) 마련했어요!`); }}
          onBuyPet={(pt) => { if (gold < pt.price || !facilities.includes("yard")) return; setGold((g) => g - pt.price); setPets((v) => [...v, pt.id]); setActivePet(pt.id); showNotice(`${pt.emoji} ${pt.name}를 입양했어요!`); }}
          onSetActive={(id) => setActivePet(id)}
          onBuyFish={(f) => { if (gold < f.price || !facilities.includes("aquarium")) return; setGold((g) => g - f.price); setFishes((v) => [...v, f.id]); showNotice(`${f.emoji} ${f.name}를 수족관에 넣었어요!`); }}
          onCare={(pt, kind) => {
            if (kind === "pet") { setExp((e) => e + 3); showNotice(`${pt.emoji} ${pt.name}가 기분이 좋아졌어요! (경험치 +3)`); }
            else { awardGold(1); setHp((h) => Math.min(100, h + 3)); showNotice(`🍖 ${pt.name}가 맛있게 먹었어요!`); }
          }} />}
        {view === "questdone" && <QuestDoneView myName={myName} onBack={backToWorld} bubble={bubble} draft={shrineDraft} onDraftUsed={() => setShrineDraft(null)}
          items={shrineItems} onAdd={addShrine} onToggle={toggleShrine} onDelete={delShrine} />}
        {view === "ikea" && <IkeaView gems={gold} owned={ikeaOwned} houseSkin={houseSkin} vehicle={vehicle} myFurni={myFurni} onBuy={buyIkea} onBack={backToWorld} bubble={bubble} />}
        {view === "project" && <BossMapView myName={myName} onBack={backToWorld} onGoSchool={(id) => setView(id)} onClearQuest={(isBoss, mode, title) => { bump(isBoss ? "boss" : "quest"); if (!isBoss && mode === "hard") learnSkill(title); }}
          people={people}
          onReward={(r) => {
            if (typeof r === "number") { award(r); showNotice(`💎 젬 ${r} 획득!`); return; }
            if (!r || !r.qty) return;
            if (r.kind === "gold") { awardGold(r.qty); showNotice(`🪙 골드 ${r.qty} 획득!`); return; }
            if (r.kind === "item") {
              // 실물 보상은 🎒 선물함에 증표로 들어가요
              setThanksInv((v) => [...v, { id: "qr" + Date.now(), name: `${r.name} ×${r.qty}`, emoji: r.emoji || "🎁", acts: ["carry", "home"], from: "퀘스트 보상" }]);
              setExp((e) => e + 10);
              showNotice(`${r.emoji || "🎁"} ${r.name} ${r.qty}개 획득! 선물함을 확인하세요`);
              return;
            }
            award(r.qty); showNotice(`💎 젬 ${r.qty} 획득!`);
          }}
          onSubmitAnswer={(q, ans) => {
            const reward = q.reward
              ? (q.reward.kind === "gold" ? `🪙 골드 ${q.reward.qty}` : q.reward.kind === "item" ? `${q.reward.emoji || "🎁"} ${q.reward.name} ${q.reward.qty}개` : `💎 젬 ${q.reward.qty}`)
              : `💎 젬 ${q.gem || 0}`;
            setShrineDraft({
              autoAdd: true, kind: "acc",
              text: q.title,
              detail: `${q.desc ? q.desc + "\n" : ""}✅ 완료 조건 : ${q.task || "-"}\n\n✍️ 제출 답변\n${ans}\n\n🎁 보상 : ${reward}`,
              reviewer: q.registrar || q.owner || "등록자",
            });
            showNotice("🏆 완료의 제단에 등록되었습니다!");
          }}
          onGoShrine={() => setView("questdone")}
          maps={bossMaps}
          onAddQuest={(mapId, stageN, quest) => { sendBoss({ mapId, stageN, addQuest: quest }); showNotice("🎯 퀘스트를 추가했어요 (모두에게 공유)"); }}
          onEditQuest={(mapId, quest) => { sendBoss({ mapId, editQuest: quest }); showNotice("✏️ 퀘스트를 수정했어요"); }}
          onDelQuest={(mapId, qid) => { sendBoss({ mapId, delQuest: qid }); showNotice("🗑 퀘스트를 삭제했어요"); }}
          onAddMap={(m) => { sendBoss({ addMap: m }); showNotice("👹 새 보스맵을 만들었어요"); }}
          accepted={qAccept} notes={qNotes} threads={qThreads}
          onAccept={(qid, title) => { setQAccept((a) => (a[qid] && a[qid].locked ? a : { ...a, [qid]: a[qid] ? { ...a[qid], party: Array.from(new Set([...(a[qid].party || []), myName || "나"])) } : { party: [myName || "나"], agree: [], locked: false, started: false, title } })); if (netSendEvent) netSendEvent("qparty", { qid, who: myName || "나" }); showNotice("🤝 퀘스트를 수락했어요"); }}
          onAgree={(qid) => {
            const me = myName || "나";
            setQAccept((a) => {
              const cur = a[qid]; if (!cur) return a;
              const agree = Array.from(new Set([...(cur.agree || []), me]));
              const party = cur.party || [];
              const locked = party.length > 0 && party.every((n) => agree.includes(n));
              if (locked) showNotice("🔒 파티 전원 동의 — 퀘스트가 확정됐어요!");
              return { ...a, [qid]: { ...cur, agree, locked } };
            });
            if (netSendEvent) netSendEvent("qlock", { qid, who: me });
          }}
          onLeave={(qid) => {
            const me = myName || "나";
            setQAccept((a) => {
              const cur = a[qid]; if (!cur) return a;
              const party = (cur.party || []).filter((n) => n !== me);
              const agree = (cur.agree || []).filter((n) => n !== me);
              if (party.length === 0) { const n = { ...a }; delete n[qid]; return n; }
              return { ...a, [qid]: { ...cur, party, agree, locked: party.length > 0 && party.every((n) => agree.includes(n)) } };
            });
            if (netSendEvent) netSendEvent("qleave", { qid, who: me });
            showNotice("🚪 퀘스트에서 나왔어요");
          }}
          onStart={(qid) => { setQAccept((a) => ({ ...a, [qid]: { ...a[qid], started: true } })); showNotice("▶ 퀘스트를 시작했어요!"); }}
          onShout={(msg) => { postChat(msg, true); showNotice("📢 마을에 알렸어요"); }}
          onBoard={(title) => { dbAddNotice("모집", `[파티모집] ${title}`, `${myName || "익명"}님이 「${title}」 퀘스트 파티원을 찾고 있어요!`); showNotice("📋 게시판에 모집글을 올렸어요"); }}
          onNote={(qid, v) => setQNotes((n) => ({ ...n, [qid]: v }))}
          onThreadSend={(qid, text) => { setQThreads((t) => ({ ...t, [qid]: [...(t[qid] || []), { who: myName || "나", text }] })); if (netSendEvent) netSendEvent("qchat", { qid, who: myName || "나", text }); }} />}
        {(view === "naverschool" || view === "videoschool") && <SchoolView school={view} onBack={backToWorld} cleared={schoolDone} onClear={clearSchool} />}
        {view === "sandbag" && <SandbagView myName={myName} onBack={backToWorld} scores={boxScores} onEnd={(nick, count, target) => { setBoxScores((s) => [...s, { nick, count, target }]); bump("punch", count); dbAddRank("sandbag", nick, count, target).then(reloadRanks); }} />}
        {view === "musinsa" && <MusinsaView gems={gold} outfit={outfit} owned={owned} onTryOn={tryOnClothing} onBuy={buyClothing} onBack={backToWorld} bubble={bubble} />}
        {view === "jjeop" && <JjeopView onBack={backToWorld} bubble={bubble} onReward={(n) => awardGold(n)} myName={myName} recList={recList} onRec={addRec} />}
        {view === "board" && <BoardView myName={myName} onBack={backToWorld} />}
        {view === "bank" && <BankView gems={gems} lifetime={lifetime} exchanged={exchanged} history={history} onExchange={doExchange} onBack={backToWorld} />}
        {view === "rent" && rentMeta && <RentView house={rentMeta} gems={gold} rented={!!rented[rentId]} onRent={() => { setGold((g) => g - rentMeta.rent); setRented((r) => ({ ...r, [rentId]: true })); }} onBack={backToWorld} />}
      </div>

      <div style={{ maxWidth: 960, margin: "14px auto 0", textAlign: "center", fontSize: 11, color: "rgba(42,30,20,0.65)" }}>
        프로토타입 데모 · 화폐/환전/렌트/통화·채팅은 모두 시뮬레이션(로컬)입니다.
        <div style={{ marginTop: 4, fontSize: 10, display: "flex", gap: 6, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ background: C.ink, color: C.gem, borderRadius: 8, padding: "2px 9px", fontFamily: "'Press Start 2P', monospace", fontSize: 9 }}>BUILD {APP_VERSION}</span>
          {savedAt && (
            <span title={savedAt.server ? "서버 + 이 브라우저에 저장됨" : "이 브라우저에 저장됨 (서버 연결 대기 중)"}
              style={{ background: savedAt.server ? "#2f9e6e" : "#a86e13", color: C.white, borderRadius: 8, padding: "2px 9px", fontSize: 9.5 }}>
              💾 {savedAt.server ? "서버 저장됨" : "기기에 저장됨"} · {new Date(savedAt.at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      </div>

      {/* 항상 떠있는 UI: 채팅 / 메뉴 / 피드백 */}
      {nameOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 120, padding: 14 }}>
          <div style={{ width: "100%", maxWidth: 340 }}>
            <Panel style={{ padding: 18 }}>
              <div style={{ textAlign: "center", fontSize: 34 }}>🌱</div>
              <div style={{ textAlign: "center", fontFamily: "'Press Start 2P', monospace", fontSize: 12, margin: "8px 0" }}>ECHO TOWN</div>
              <div style={{ fontSize: 13, textAlign: "center", marginBottom: 10 }}>마을에서 사용할 이름을 알려주세요!</div>
              <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") confirmName(nameInput); }} maxLength={8} autoFocus placeholder="예: 정인" style={{ width: "100%", boxSizing: "border-box", padding: 10, border: `3px solid ${C.ink}`, fontFamily: "'DotGothic16', monospace", fontSize: 15, background: C.white, textAlign: "center" }} />
              <div style={{ fontSize: 10, color: C.inkSoft, marginTop: 6, textAlign: "center" }}>주민 이름(정인·창민·도희·유리·민지·희정·의준·호종·슬이·상하)과 같으면 그 집이 내 집이 돼요!</div>
              <div style={{ fontSize: 10, color: C.inkSoft, marginTop: 4, textAlign: "center" }}>🔐 한 번 정하면 이 브라우저에서는 다음부터 자동으로 로그인돼요</div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                {myName && <PxButton tone="ink" onClick={() => setNameOpen(false)} style={{ flex: 1, padding: 10, fontSize: 13 }}>취소</PxButton>}
                <PxButton tone="good" disabled={!nameInput.trim()} onClick={() => confirmName(nameInput)} style={{ flex: 1, padding: 10, fontSize: 13 }}>시작하기</PxButton>
              </div>
              {myName && <PxButton tone="danger" onClick={forgetName} style={{ width: "100%", marginTop: 8, padding: 9, fontSize: 12 }}>🚪 이 브라우저에서 로그아웃</PxButton>}
            </Panel>
          </div>
        </div>
      )}
      {couponOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 130, padding: 14 }} onClick={() => setCouponOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 340, maxHeight: "calc(100vh - 28px)", overflowY: "auto" }}>
            <div style={{ background: "linear-gradient(180deg,#fff8e1,#ffe9a8)", border: `4px solid ${C.ink}`, borderRadius: 14, padding: 20, textAlign: "center", boxShadow: "0 12px 30px rgba(0,0,0,0.5)" }}>
              <div style={{ fontSize: 46 }}>🎟️</div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, margin: "10px 0 6px", color: "#a86e13" }}>WELCOME COUPON</div>
              <div style={{ fontSize: 15, fontWeight: "bold", marginBottom: 8 }}>{myName}님, 사전예약 감사합니다!</div>
              <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.7, marginBottom: 12 }}>
                에코타운 사전예약자에게 드리는<br />웰컴 쿠폰이 발급되었어요.
              </div>
              <div style={{ background: C.white, border: `3px dashed ${C.ink}`, borderRadius: 10, padding: "14px 10px", marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: C.inkSoft }}>지급 보상</div>
                <div style={{ fontSize: 22, fontWeight: "bold", color: "#2f7fb5" }}>💎 100 젬</div>
                <div style={{ fontSize: 22, fontWeight: "bold", color: "#a86e13", marginTop: 4 }}>🪙 200 골드</div>
              </div>
              <PxButton tone="gold" onClick={() => setCouponOpen(false)} style={{ width: "100%", padding: 12, fontSize: 14 }}>받고 시작하기 🌱</PxButton>
            </div>
          </div>
        </div>
      )}
      <ChatDock messages={chat} shout={shout} gems={gold} onSend={postChat}
        onToggleShout={() => {
          if (shout) { setShout(false); return; }
          if (gold < 1) return;
          setGold((g) => g - 1);
          setShout(true);
        }} />
      {mailTarget && <MailboxModal owner={mailTarget} isMine={mailTarget === myName} myName={myName} gems={gold} inventory={thanksInv} mail={mail} onSend={sendMail} onClose={() => setMailTarget(null)} />}
      {giftTarget && <GiftModal target={giftTarget} inventory={thanksInv} myName={myName} onSend={sendGift} onClose={() => setGiftTarget(null)} />}
      {invite && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 150, padding: 14 }}>
          <div style={{ width: "100%", maxWidth: 330 }}>
            <div style={{ background: C.parch, border: `4px solid ${C.ink}`, borderRadius: 14, padding: 20, boxShadow: "0 10px 26px rgba(0,0,0,0.5)" }}>
              <div style={{ textAlign: "center", fontSize: 42 }}>📨</div>
              <div style={{ textAlign: "center", fontSize: 15, fontWeight: "bold", margin: "8px 0 10px" }}>회의 초대장이 도착했어요</div>
              <div style={{ background: C.white, border: `2px dashed ${C.ink}`, borderRadius: 8, padding: 12, fontSize: 13, lineHeight: 1.8 }}>
                <b>{invite.when}</b> 회의<br />
                초대원 : {myName}<br />
                예상 회의시간 : {invite.dur}<br />
                <span style={{ color: C.inkSoft }}>{invite.room} · 주최 {invite.from}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
                {declineOpen ? (
                  <>
                    <div style={{ fontSize: 12, fontWeight: "bold" }}>✍️ 불참 사유 (초대한 분께 회신돼요)</div>
                    <textarea value={declineWhy} onChange={(e) => setDeclineWhy(e.target.value)} rows={3} autoFocus
                      placeholder="예: 그 시간에 다른 일정이 있어요. 4시 이후면 가능합니다!"
                      style={{ width: "100%", boxSizing: "border-box", padding: 9, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 13, resize: "vertical" }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <PxButton tone="ink" onClick={() => setDeclineOpen(false)} style={{ flex: 1, padding: 10, fontSize: 13 }}>뒤로</PxButton>
                      <PxButton tone="danger" disabled={!declineWhy.trim()} onClick={() => {
                        if (netSendEvent) netSendEvent("inviteack", { to: invite.from, from: myName, ok: false, reason: declineWhy.trim() });
                        syncInvite(invite, false);
                        showNotice(`✉️ ${invite.from}님에게 불참 사유를 보냈어요`);
                        setDeclineOpen(false); setDeclineWhy(""); setInvite(null);
                      }} style={{ flex: 1, padding: 10, fontSize: 13 }}>회신 보내기</PxButton>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", gap: 8 }}>
                      <PxButton tone="danger" onClick={() => setDeclineOpen(true)} style={{ flex: 1, padding: 11, fontSize: 13 }}>✕ 거절하기</PxButton>
                      <PxButton tone="good" onClick={() => { if (netSendEvent) netSendEvent("inviteack", { to: invite.from, from: myName, ok: true }); syncInvite(invite, true); setMyMeetings((m) => [...m, { when: invite.when, room: invite.room, roomId: invite.roomId, from: invite.from, dur: invite.dur }]); showNotice(`📅 ${invite.room} ${invite.when} 일정에 추가했어요`); setInvite(null); }} style={{ flex: 1, padding: 11, fontSize: 13 }}>참석할게요</PxButton>
                    </div>
                    <PxButton tone="blue" onClick={() => {
                      const rid = invite.roomId || "m1";
                      if (netSendEvent) netSendEvent("inviteack", { to: invite.from, from: myName, ok: true });
                      syncInvite(invite, true);
                      setMyMeetings((m) => [...m, { when: invite.when, room: invite.room, roomId: rid, from: invite.from, dur: invite.dur }]);
                      setInvite(null); setMeetingId(rid); setView("meeting");
                    }} style={{ width: "100%", padding: 11, fontSize: 13 }}>🚪 회의실 바로가기</PxButton>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {visitor && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 150, padding: 14 }}>
          <div style={{ width: "100%", maxWidth: 320 }}>
            <div style={{ background: C.parch, border: `4px solid ${C.ink}`, borderRadius: 14, padding: 20, textAlign: "center", boxShadow: "0 10px 26px rgba(0,0,0,0.5)" }}>
              <div style={{ fontSize: 44 }}>🔔</div>
              <div style={{ fontSize: 16, fontWeight: "bold", margin: "10px 0 4px" }}>손님이 왔습니다!</div>
              <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 16 }}><b style={{ color: "#5b8def" }}>{visitor}</b>님이 초인종을 눌렀어요</div>
              <div style={{ display: "flex", gap: 8 }}>
                <PxButton tone="ink" onClick={() => { if (netSendEvent) netSendEvent("door", { to: visitor, from: myName, ok: false }); setVisitor(null); }} style={{ flex: 1, padding: 11, fontSize: 13 }}>거절하기</PxButton>
                <PxButton tone="good" onClick={() => { if (netSendEvent) netSendEvent("door", { to: visitor, from: myName, ok: true }); showNotice(`🚪 ${visitor}님에게 문을 열어줬어요`); setVisitor(null); }} style={{ flex: 1, padding: 11, fontSize: 13 }}>문 열어주기</PxButton>
              </div>
            </div>
          </div>
        </div>
      )}
      {aquaOpen && <Aquarium fishes={fishes} onClose={() => setAquaOpen(false)} onFeed={() => { awardGold(1); showNotice("🍤 물고기들이 신나게 먹어요!"); }} />}
      {skillPop && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 153, padding: 14 }} onClick={() => setSkillPop(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 320, maxHeight: "calc(100vh - 28px)", overflowY: "auto" }}>
            <div style={{ background: "radial-gradient(circle at 50% 0%, #3a2e6b, #1a1436 70%)", border: `4px solid ${C.ink}`, borderRadius: 14, padding: 22, textAlign: "center", boxShadow: "0 12px 30px rgba(0,0,0,0.55)" }}>
              {skillPop.all ? (
                <>
                  <div style={{ fontSize: 46 }}>🏅</div>
                  <div style={{ fontSize: 16, fontWeight: "bold", color: "#ffd75e", margin: "10px 0 6px" }}>모든 사고 스킬을 배웠어요!</div>
                  <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.7)" }}>{SKILLS.length}개 전부 수집 완료 ✨</div>
                </>
              ) : (
                <>
                  <div className="gift-pop" style={{ fontSize: 52 }}>{skillPop.icon}</div>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: "#7fe3ff", margin: "12px 0 8px" }}>SKILL LEARNED</div>
                  <div style={{ fontSize: 19, fontWeight: "bold", color: "#ffd75e" }}>{skillPop.name}</div>
                  <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.75)", lineHeight: 1.8, margin: "8px 0 4px" }}>{skillPop.desc}</div>
                  {skillPop.from && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>「{skillPop.from}」 를 해결하며 배웠어요</div>}
                </>
              )}
              <PxButton tone="gold" onClick={() => setSkillPop(null)} style={{ width: "100%", padding: 12, fontSize: 14, marginTop: 16 }}>확인</PxButton>
            </div>
          </div>
        </div>
      )}
      {giftAlert && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.62)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 152, padding: 14 }}>
          <div style={{ width: "100%", maxWidth: 330 }}>
            <div style={{ background: "linear-gradient(180deg,#fff8e1,#ffe9a8)", border: `4px solid ${C.ink}`, borderRadius: 14, padding: 20, textAlign: "center", boxShadow: "0 12px 30px rgba(0,0,0,0.5)" }}>
              <div className="gift-pop" style={{ fontSize: 52 }}>{giftAlert.item ? (giftAlert.item.emoji || "🎁") : "💌"}</div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, margin: "10px 0 8px", color: "#a86e13" }}>GIFT ARRIVED</div>
              <div style={{ fontSize: 16, fontWeight: "bold", marginBottom: 6 }}>선물이 도착했습니다!</div>
              <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.8, marginBottom: 12 }}>
                <b style={{ color: "#5b8def" }}>{giftAlert.from}</b>님이 보냈어요<br />
                {giftAlert.item ? <b>{giftAlert.item.emoji || "🎁"} {giftAlert.item.name}</b> : "💌 편지"}
              </div>
              {giftAlert.text && (
                <div style={{ background: C.white, border: `2px dashed ${C.ink}`, borderRadius: 8, padding: 10, fontSize: 12.5, lineHeight: 1.7, marginBottom: 12, whiteSpace: "pre-wrap", wordBreak: "break-word", textAlign: "left" }}>{giftAlert.text}</div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <PxButton tone="ink" onClick={() => setGiftAlert(null)} style={{ flex: 1, padding: 11, fontSize: 13 }}>닫기</PxButton>
                <PxButton tone="good" onClick={() => { setGiftAlert(null); setProfileOpen(true); setProfileTab("inv"); }} style={{ flex: 2, padding: 11, fontSize: 13 }}>🎒 선물함으로 이동</PxButton>
              </div>
              <div style={{ fontSize: 10.5, color: C.inkSoft, marginTop: 9 }}>선물함에서 들고다니기 · 집에 두기 · 먹기 · 냉장고 보관을 고를 수 있어요</div>
            </div>
          </div>
        </div>
      )}
      {/* 🎬 유튜브 미니 플레이어 — 리스닝 방을 나가도 계속 재생돼요 */}
      {ytNow && ytNow.videoId && (
        <div style={{ position: "fixed", left: 12, bottom: 96, zIndex: 61, width: ytOpen ? 250 : 250, background: "#241a33", border: `3px solid ${C.ink}`, borderRadius: 10, boxShadow: `0 4px 0 ${C.ink}, 0 8px 18px rgba(0,0,0,0.35)`, overflow: "hidden", fontFamily: "'DotGothic16', monospace" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", color: "#ffe680" }}>
            <span className="gem-spin" style={{ fontSize: 13 }}>♬</span>
            <b style={{ flex: 1, fontSize: 11.5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {ytNow.artist ? `${ytNow.artist} - ${ytNow.title}` : ytNow.title}
            </b>
            <button onClick={() => setYtOpen((v) => !v)} title={ytOpen ? "접기" : "펼치기"} style={{ background: "none", border: "none", color: "#ffe680", cursor: "pointer", fontSize: 13 }}>{ytOpen ? "▾" : "▴"}</button>
            <button onClick={() => setYtNow(null)} title="정지" style={{ background: "none", border: "none", color: "#ff9a8a", cursor: "pointer", fontSize: 13 }}>✕</button>
          </div>
          <div style={{ display: ytOpen ? "block" : "none", background: "#000" }}>
            <iframe key={ytNow.videoId} title={ytNow.title} width="250" height="141" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen
              src={`https://www.youtube.com/embed/${ytNow.videoId}?autoplay=1&playsinline=1&rel=0&enablejsapi=1`} style={{ border: 0, display: "block" }} />
          </div>
          {!ytOpen && <div style={{ fontSize: 9.5, color: "#b9a7d6", padding: "0 8px 6px" }}>▴ 를 눌러 펼치면 소리/화면이 보여요</div>}
        </div>
      )}
      {notice && (
        <div style={{ position: "fixed", left: "50%", top: 16, transform: "translateX(-50%)", zIndex: 150, background: C.ink, color: C.white, border: `3px solid ${C.gem}`, borderRadius: 10, padding: "10px 18px", fontSize: 13, fontFamily: "'DotGothic16', monospace", boxShadow: "0 6px 16px rgba(0,0,0,0.4)" }}>{notice}</div>
      )}
      <CornerDock
        msgCount={unreadMsgCount}
        onMenu={() => setMenuOpen(true)}
        onProfile={() => setProfileOpen(true)}
        onGuide={() => setGuideOpen(true)}
        onMsg={() => setMsgOpen(true)} />

      {menuOpen && <MenuSheet people={people} onClose={() => setMenuOpen(false)} myName={myName} myUid={myUid} feedback={feedback} onFeedback={addFeedback} onDelFeedback={delFeedback} onCheckFeedback={checkFeedback}
        sprites={allSprites} userSprites={sprites} cutCfg={cutCfg} onSetCut={setCut}
        onSetSprite={setSprite} onClearSprite={clearSprite} onClearSprites={clearAllSprites}
        onDm={(p) => setDmWith(p)}
        onCall={(p) => { setCallWith(p); if (netSendEvent) netSendEvent("call", { to: p.name, from: myName || "나" }); }} />}

      {profileOpen && <MyPanel key={profileTab || "me"} onClose={() => { setProfileOpen(false); setProfileTab(null); }} myName={myName} gems={gems} gold={gold} level={expInfo.lv} lifetime={lifetime} hp={hp} mp={mp} day={day}
        profile={profile} onProfile={patchProfile} carrying={carrying} onGiftAct={giftAct} initialTab={profileTab} skills={skills}
        stats={stats} outfit={outfit} ownedClothes={owned} ikeaOwned={ikeaOwned} houseSkin={houseSkin} vehicle={vehicle} myFurni={myFurni}
        thanksInv={thanksInv} onEquipCloth={tryOnClothing} onToggleIkea={buyIkea} />}

      {guideOpen && <GuideSheet onClose={() => setGuideOpen(false)} onGo={(v) => { setGuideOpen(false); if (v === "world") backToWorld(); else setView(v); }} />}

      {msgOpen && <MessageCenter onClose={() => setMsgOpen(false)} myName={myName} box={msgBox} notices={allNotices} onReadAll={readAll}
        onAnswerInvite={(m, ok) => {
          let reason = "";
          if (!ok) {
            reason = (window.prompt(`${m.from}님에게 보낼 불참 사유를 적어주세요`, "") || "").trim();
            if (!reason) return;
          }
          if (netSendEvent) netSendEvent("inviteack", { to: m.from, from: myName, ok, reason });
          patchMsg("invite", m.id, { answered: ok ? "ok" : "no", read: true });
          if (ok) { setMyMeetings((v) => [...v, { when: m.when, room: m.room, roomId: m.roomId, from: m.from, dur: m.dur }]); showNotice(`📅 ${m.room} ${m.when} 일정에 추가했어요`); }
          else showNotice(`✉️ ${m.from}님에게 불참 사유를 보냈어요`);
        }}
        onGoMeeting={(m) => { setMsgOpen(false); setMeetingId(m.roomId || "m1"); setView("meeting"); }}
        onOpenDm={(name) => { setMsgOpen(false); setDmWith({ name, avatar: "🧑" }); }}
        onCallBack={(name) => { setMsgOpen(false); setCallWith({ name, avatar: "🧑" }); if (netSendEvent) netSendEvent("call", { to: name, from: myName || "나" }); }} />}

      {dmWith && <DMChatModal person={dmWith} myName={myName} onClose={() => setDmWith(null)}
        thread={dmThreads[dmWith.name] || []}
        online={Object.values(netOthers).some((o) => o.name === dmWith.name)}
        onSend={(text) => { pushDm(dmWith.name, { me: true, text }); if (netSendEvent) netSendEvent("dm", { to: dmWith.name, from: myName || "나", text }); }} />}
      {callWith && <FaceTalkModal person={callWith} onClose={() => setCallWith(null)} />}

      {incomingCall && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 155, padding: 14 }}>
          <div style={{ width: "100%", maxWidth: 320 }}>
            <div style={{ background: C.parch, border: `4px solid ${C.ink}`, borderRadius: 14, padding: 20, textAlign: "center", boxShadow: "0 10px 26px rgba(0,0,0,0.5)" }}>
              <div style={{ fontSize: 44 }}>📞</div>
              <div style={{ fontSize: 16, fontWeight: "bold", margin: "10px 0 4px" }}>걸려온 전화</div>
              <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 16 }}><b style={{ color: "#5b8def" }}>{incomingCall.from}</b>님이 페이스톡을 걸었어요</div>
              <div style={{ display: "flex", gap: 8 }}>
                <PxButton tone="danger" onClick={() => { clearTimeout(callTimer.current); pushMsg("call", { from: incomingCall.from, reason: "내가 거절한 통화예요" }); setIncomingCall(null); }} style={{ flex: 1, padding: 11, fontSize: 13 }}>📵 거절</PxButton>
                <PxButton tone="good" onClick={() => { clearTimeout(callTimer.current); setCallWith({ name: incomingCall.from, avatar: "🧑" }); setIncomingCall(null); }} style={{ flex: 1, padding: 11, fontSize: 13 }}>📞 받기</PxButton>
              </div>
            </div>
          </div>
        </div>
      )}
      {newBadge && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 140, padding: 14 }} onClick={() => setNewBadge(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 300 }}>
            <div style={{ background: "linear-gradient(180deg,#fff8e1,#ffe9a8)", border: `4px solid ${C.ink}`, borderRadius: 14, padding: 20, textAlign: "center", boxShadow: "0 12px 30px rgba(0,0,0,0.5)" }}>
              <div style={{ fontSize: 12, color: "#a86e13", fontWeight: "bold" }}>🏅 새 뱃지 획득!</div>
              <div style={{ width: 84, height: 84, margin: "12px auto", borderRadius: "50%", background: "radial-gradient(circle at 35% 30%,#fffbe8,#ffd75e)", border: `3px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42 }}>{newBadge.icon}</div>
              <div style={{ fontSize: 17, fontWeight: "bold" }}>{newBadge.name}</div>
              <div style={{ fontSize: 12, color: C.inkSoft, margin: "6px 0 14px" }}>{newBadge.desc}</div>
              <PxButton tone="gold" onClick={() => setNewBadge(null)} style={{ width: "100%", padding: 11, fontSize: 13 }}>확인</PxButton>
            </div>
          </div>
        </div>
      )}
    </div>
    </NetContext.Provider>
  );
}

/* ============================== 오류 안전망 ============================= */
/* 렌더링 중 오류가 나면 흰 화면 대신 원인을 화면에 보여줍니다. */
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null, info: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) {
    this.setState({ info });
    try { console.error("[ECHO TOWN] 렌더링 오류:", err, info); } catch (e) {}
  }
  render() {
    if (!this.state.err) return this.props.children;
    const err = this.state.err;
    const stack = (this.state.info && this.state.info.componentStack) || "";
    const box = { background: "#fffdf6", border: "3px solid #2a1e14", borderRadius: 10, padding: 12, marginTop: 10,
      fontFamily: "monospace", fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 260, overflow: "auto" };
    return (
      <div style={{ minHeight: "100vh", background: "#e9e3d6", padding: 20, boxSizing: "border-box", fontFamily: "'DotGothic16', monospace", color: "#2a1e14" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", background: "#f0e4cf", border: "4px solid #2a1e14", borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 40, textAlign: "center" }}>🚧</div>
          <h2 style={{ textAlign: "center", fontSize: 18, margin: "10px 0 4px" }}>에코타운에 문제가 생겼어요</h2>
          <p style={{ textAlign: "center", fontSize: 13, color: "#4a382a", margin: "0 0 14px" }}>
            아래 내용을 개발자에게 그대로 알려주시면 바로 고칠 수 있어요.
          </p>
          <div style={{ fontSize: 12, fontWeight: "bold" }}>오류 메시지</div>
          <div style={box}>{String((err && err.message) || err)}</div>
          {err && err.stack && (<>
            <div style={{ fontSize: 12, fontWeight: "bold", marginTop: 12 }}>스택</div>
            <div style={box}>{String(err.stack).slice(0, 1600)}</div>
          </>)}
          {stack && (<>
            <div style={{ fontSize: 12, fontWeight: "bold", marginTop: 12 }}>컴포넌트 위치</div>
            <div style={box}>{stack.slice(0, 1200)}</div>
          </>)}
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={() => window.location.reload()}
              style={{ flex: 1, cursor: "pointer", fontFamily: "inherit", fontSize: 14, padding: 12, borderRadius: 8, border: "3px solid #2a1e14", background: "#4a9e6e", color: "#fff", fontWeight: "bold" }}>
              🔄 새로고침
            </button>
            <button onClick={() => { try { window.localStorage.clear(); } catch (e) {} window.location.reload(); }}
              style={{ flex: 1, cursor: "pointer", fontFamily: "inherit", fontSize: 14, padding: 12, borderRadius: 8, border: "3px solid #2a1e14", background: "#c0563a", color: "#fff", fontWeight: "bold" }}>
              🧹 저장데이터 초기화 후 새로고침
            </button>
          </div>
          <div style={{ fontSize: 11, color: "#4a382a", textAlign: "center", marginTop: 10 }}>
            * 초기화하면 이름 · 사전 · 갤러리 · 건물이미지 등 이 브라우저 저장분이 지워져요
          </div>
        </div>
      </div>
    );
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <EchoTown />
    </ErrorBoundary>
  );
}

/* ============================== 전역 CSS ============================= */
function StyleBlock() {
  return (
    <style>{`
      * { -webkit-tap-highlight-color: transparent; }
      button { font-family: 'DotGothic16', monospace; }
      input, textarea { color: ${C.ink}; }
      .px-btn { transition: transform .05s ease, box-shadow .05s ease; }
      .px-btn:not(:disabled):active { transform: translateY(3px); box-shadow: none !important; }
      .px-btn:focus-visible { outline: 3px solid ${C.bankRoof}; outline-offset: 2px; }
      .map-obj { transition: transform .1s ease, filter .1s ease; }
      .map-obj:hover { transform: translate(-50%,-50%) scale(1.05); filter: drop-shadow(0 5px 0 rgba(0,0,0,.25)); }
      .map-obj:focus-visible { outline: 3px solid ${C.gem}; outline-offset: 3px; }
      @keyframes gemFloat { 0%{ transform: translateY(0); opacity:0;} 20%{opacity:1;} 100%{ transform: translateY(-40px); opacity:0;} }
      .gem-pop { animation: gemFloat 1.6s ease-out forwards; }
      @keyframes bob { 0%,100%{ transform: translateY(0);} 50%{ transform: translateY(-3px);} }
      .hero-bob { animation: bob .45s steps(2) infinite; }
      @keyframes spin { 0%{transform:rotate(0);} 100%{transform:rotate(360deg);} }
      .gem-spin { display:inline-block; animation: spin 6s linear infinite; }
      @keyframes promptPulse { 0%,100%{ transform: translateX(-50%) translateY(0);} 50%{ transform: translateX(-50%) translateY(-3px);} }
      .enter-prompt { animation: promptPulse .8s ease-in-out infinite; }
      @keyframes danceSway { 0%, 100% { transform: rotate(-13deg) translateX(-2px); } 50% { transform: rotate(13deg) translateX(2px); } }
      .dancing { animation: danceSway .5s ease-in-out infinite; }
      @keyframes danceTwerk { 0%,100% { transform: translateX(-3px) scaleY(0.94); } 25% { transform: translateX(3px) scaleY(1); } 50% { transform: translateX(-3px) scaleY(0.94); } 75% { transform: translateX(3px) scaleY(1); } }
      @keyframes danceJump { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
      @keyframes danceSpin { from { transform: rotateY(0); } to { transform: rotateY(360deg); } }
      @keyframes danceShake2 { 0%,100% { transform: translateX(-2px) rotate(-3deg); } 50% { transform: translateX(2px) rotate(3deg); } }
      .dance-sway { animation: danceSway .5s ease-in-out infinite; }
      .dance-twerk { animation: danceTwerk .28s linear infinite; }
      .dance-jump { animation: danceJump .5s ease-in-out infinite; }
      .dance-spin { animation: danceSpin .7s linear infinite; }
      .dance-shake { animation: danceShake2 .12s linear infinite; }
      @keyframes smokeRise { 0% { transform: translateY(0) scale(0.6); opacity: 0.9; } 100% { transform: translateY(-120px) scale(1.9); opacity: 0; } }
      .smoke-puff { animation: smokeRise 1.8s ease-out forwards; }
      @keyframes bagHit { 0%{transform:translateX(0) rotate(0);} 25%{transform:translateX(7px) rotate(5deg);} 55%{transform:translateX(-6px) rotate(-4deg);} 100%{transform:translateX(0) rotate(0);} }
      .bag-hit { animation: bagHit .18s ease-out; }
      /* 🚩 주민센터 ECHO 깃발 · 🌴 야자수 흔들림 */
      @keyframes echoWave { 0%,100% { transform: skewY(0deg) scaleY(1); } 25% { transform: skewY(-5deg) scaleY(0.96); } 50% { transform: skewY(0deg) scaleY(1.03); } 75% { transform: skewY(5deg) scaleY(0.96); } }
      .echo-flag { animation: echoWave 2s ease-in-out infinite; }
      @keyframes redWave { 0%,100% { transform: skewY(0deg) scaleX(1); } 30% { transform: skewY(-9deg) scaleX(0.93); } 60% { transform: skewY(8deg) scaleX(1.04); } }
      .red-flag { animation: redWave .85s ease-in-out infinite; }
      @keyframes petTrot { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
      .pet-trot { animation: petTrot .55s ease-in-out infinite; }

      /* 🐠 수족관 */
      @keyframes aqSwim { from { transform: translateX(-12%); } to { transform: translateX(112%); } }
      .aq-swim { animation-name: aqSwim; animation-timing-function: ease-in-out; animation-iteration-count: infinite; animation-direction: alternate; will-change: transform; }
      @keyframes aqFlip { 0%, 100% { transform: scaleX(-1); } }
      .aq-flip { animation-name: aqFlip; animation-timing-function: steps(1, end); animation-iteration-count: infinite; animation-direction: alternate; }
      @keyframes aqRise { 0% { transform: translateY(0) scale(.7); opacity: .1; } 15% { opacity: .75; } 100% { transform: translateY(-230px) scale(1.15); opacity: 0; } }
      .aq-bubble { position: absolute; bottom: 22px; border-radius: 50%; background: rgba(255,255,255,0.75); box-shadow: inset 0 0 3px rgba(255,255,255,0.9); animation-name: aqRise; animation-timing-function: linear; animation-iteration-count: infinite; z-index: 2; }
      @keyframes aqWeed { 0%,100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
      .aq-weed { transform-origin: bottom center; animation: aqWeed 3.6s ease-in-out infinite; }
      @keyframes aqFood { 0% { transform: translateY(-10px); opacity: 0; } 10% { opacity: 1; } 100% { transform: translateY(200px); opacity: .2; } }
      .aq-food { position: absolute; top: 0; width: 5px; height: 5px; border-radius: 50%; background: #d98c3a; box-shadow: 0 0 3px rgba(0,0,0,0.2); z-index: 3; animation: aqFood 3s ease-in forwards; }
      @keyframes aqCaustic { from { background-position: 0 0; } to { background-position: 120px 0; } }
      .aq-caustic { animation: aqCaustic 6s linear infinite; }
      @keyframes beaconBlink { 0%,100% { opacity: 1; } 50% { opacity: 0.25; } }
      .beacon { animation: beaconBlink 1.1s ease-in-out infinite; }
      @keyframes chatIn { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: none; } }
      .chat-line { animation: chatIn .18s ease-out; }
      @keyframes giftPop { 0% { transform: scale(0.4) rotate(-12deg); opacity: 0; } 60% { transform: scale(1.15) rotate(6deg); opacity: 1; } 100% { transform: scale(1) rotate(0deg); } }
      .gift-pop { display: inline-block; animation: giftPop .5s cubic-bezier(.34,1.56,.64,1) both; }
      @keyframes palmSway { 0%,100% { transform: rotate(-3.5deg); } 50% { transform: rotate(3.5deg); } }
      .palm-sway { animation: palmSway 3.4s ease-in-out infinite; }

      /* 🌧 비 — 무작위 세로 빗줄기 (건물이 비쳐 보이도록 투명하게) */
      .rain-vp { position: absolute; inset: 0; overflow: hidden; pointer-events: none;
        background: linear-gradient(180deg, rgba(24,34,54,0.20) 0%, rgba(24,34,54,0.10) 45%, rgba(24,34,54,0.06) 100%); }
      .rain-drop { position: absolute; top: 0; display: block; border-radius: 1px;
        background: linear-gradient(to bottom, rgba(226,238,255,0) 0%, rgba(226,238,255,0.55) 40%, rgba(255,255,255,0.95) 100%);
        will-change: transform;
        animation-name: rainDrop; animation-timing-function: linear; animation-iteration-count: infinite; }
      @keyframes rainDrop { from { transform: translate3d(0,-200px,0); } to { transform: translate3d(0,var(--fall,660px),0); } }
      @keyframes bubblePop { 0%{ transform: translateX(-50%) scale(.6); opacity:0;} 60%{ transform: translateX(-50%) scale(1.05);} 100%{ transform: translateX(-50%) scale(1); opacity:1;} }
      .chat-bubble { animation: bubblePop .2s ease-out; }
      .game-vp:focus, .game-vp:focus-visible { outline: none; }

      /* 🏆 퀘스트 완료의 제단 */
      @keyframes qsAuraPulse { 0%,100% { opacity: .55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.08); } }
      .qs-aura { animation: qsAuraPulse 3.2s ease-in-out infinite; transform-origin: 60px 62px; }
      @keyframes qsRingSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .qs-ring { animation: qsRingSpin 14s linear infinite; }
      @keyframes qsFloat { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-6px) scale(1.04); } }
      .qs-float { animation: qsFloat 2.6s ease-in-out infinite; }
      @keyframes qsTwinkle { 0%,100% { opacity: .25; } 50% { opacity: 1; } }
      .qs-spark circle { animation: qsTwinkle 1.8s ease-in-out infinite; }
      .qs-spark circle:nth-child(2) { animation-delay: .45s; }
      .qs-spark circle:nth-child(3) { animation-delay: .9s; }
      .qs-spark circle:nth-child(4) { animation-delay: 1.3s; }

      /* 우측 하단 도크 */
      .dock-btn { transition: transform .06s ease, box-shadow .06s ease; }
      .dock-btn:active { transform: translateY(3px); box-shadow: none !important; }
      .dock-btn:focus-visible { outline: 3px solid ${C.gem}; outline-offset: 3px; }

      /* 좁은 화면에서 채팅창이 도크를 가리지 않도록 */
      @media (max-width: 700px) {
        .chat-dock { bottom: 84px !important; width: calc(100vw - 24px) !important; }
      }

      @media (prefers-reduced-motion: reduce) {
        .gem-pop,.hero-bob,.gem-spin,.enter-prompt,.chat-bubble,.px-btn,.map-obj,.qs-aura,.qs-ring,.qs-float,.qs-spark circle,.rain-drop,.echo-flag,.red-flag,.palm-sway,.beacon,.chat-line,.pet-trot,.aq-swim,.aq-flip,.aq-bubble,.aq-weed,.aq-caustic { animation:none !important; transition:none !important; }
      }
    `}</style>
  );
}
