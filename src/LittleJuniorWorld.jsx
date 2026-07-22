import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";

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

/* -------------------------- 데이터 --------------------------- */
// 대형건물: 퀘스트 보유. 반복(업무) 퀘스트는 하루 1회, 다음 날 초기화.
const BIG_BUILDINGS = [
  { id: "alba", name: "알바", icon: "🛠", color: "#7a8b99", colorDk: "#5c6b78",
    categories: ["네이버", "영상", "기타"],
    quests: [
      { id: "ab_n1", cat: "네이버", title: "최신글 작업", desc: "몰입의방 - 최신글 댓글 작업", reward: 12, duration: 1600, repeat: true },
      { id: "ab_n2", cat: "네이버", title: "지식인 작업", desc: "몰입의방 - 지식인 답변 작업", reward: 14, duration: 1800, repeat: true },
      { id: "ab_n3", cat: "네이버", title: "몰발 작업", desc: "네이버 카페 글&댓글 작업 10건", reward: 40, duration: 2600, repeat: false },
      { id: "ab_v1", cat: "영상", title: "숏폼 제작", desc: "30초 분량 2개 제작", reward: 16, duration: 2000, repeat: true },
      { id: "ab_v2", cat: "영상", title: "영상 소스 수집", desc: "20개 수집", reward: 11, duration: 1500, repeat: true },
      { id: "ab_v3", cat: "영상", title: "영상 원고 작성", desc: "원고 10개 작성", reward: 55, duration: 3000, repeat: false },
      { id: "ab_e1", cat: "기타", title: "공장 리스트업", desc: "양말 관련 공장 리스트업", reward: 12, duration: 1400, repeat: true },
      { id: "ab_e2", cat: "기타", title: "인플루언서 리스트업", desc: "뷰티패션 인플루언서 리스트업", reward: 17, duration: 2000, repeat: true },
      { id: "ab_e3", cat: "기타", title: "재롱", desc: "메롱", reward: 60, duration: 3000, repeat: false },
    ] },
  { id: "underwear", name: "항균속옷", icon: "🩲", color: "#d76b96", colorDk: "#b24d78",
    quests: [
      { id: "uw1", title: "원단 항균 테스트", desc: "샘플 원단 항균 수치 측정", reward: 16, duration: 1700, repeat: true },
      { id: "uw2", title: "패키지 샘플 확인", desc: "일정 확인", reward: 22, duration: 2300, repeat: true },
      { id: "uw3", title: "계약금 관련 소통", desc: "정보 취합 및 일정 확인", reward: 75, duration: 3300, repeat: false },
    ] },
  { id: "socks", name: "항균양말", icon: "🧦", color: "#e0a13d", colorDk: "#bd8226",
    quests: [
      { id: "sk1", title: "발수 코팅 도포", desc: "양말 표면 코팅 작업", reward: 15, duration: 1600, repeat: true },
      { id: "sk2", title: "사이즈별 검수", desc: "S~XL 규격 검수", reward: 21, duration: 2200, repeat: true },
      { id: "sk3", title: "시즌 컬렉션 런칭", desc: "가을 컬렉션 출시 (1회)", reward: 70, duration: 3200, repeat: false },
    ] },
  { id: "cs", name: "CS", icon: "🛠", color: "#7a8b99", colorDk: "#5c6b78",
    quests: [
      { id: "cs1", title: "채널톡 답변", desc: "답변답변", reward: 12, duration: 1400, repeat: true },
      { id: "cs2", title: "카페24 게시판 답변", desc: "24~~", reward: 17, duration: 2000, repeat: true },
      { id: "cs3", title: "취소접수건 취소처리", desc: "취소취소", reward: 60, duration: 3000, repeat: false },
    ] },
  { id: "app", name: "어플", icon: "🎧", color: "#3fa0a0", colorDk: "#2e7d7d",
    quests: [
      { id: "cs1", title: "중국어 컨텐츠 제작", desc: "니하오", reward: 12, duration: 1400, repeat: true },
      { id: "cs2", title: "영어 컨텐츠 제작", desc: "하이", reward: 17, duration: 2000, repeat: true },
      { id: "cs3", title: "1T 수집", desc: "20개 수집", reward: 60, duration: 3000, repeat: false },
    ] },
];

const HOUSES = [
  { id: "h1", name: "정인이네", roof: "#c0563a", roofDk: "#9c4028", wall: "#e9c98f" },
  { id: "h2", name: "창민이네", roof: "#3fa07a", roofDk: "#2f7d5e", wall: "#d9e6c7" },
  { id: "h3", name: "도희네", roof: "#8e5a9e", roofDk: "#6f4480", wall: "#e7cfe9" },
  { id: "h4", name: "유리네", roof: "#d9a441", roofDk: "#b7842c", wall: "#f1e2b0" },
  { id: "h5", name: "민지네", roof: "#5b8def", roofDk: "#3f6bc4", wall: "#d3e0f7" },
  { id: "h6", name: "희정이네", roof: "#d76b96", roofDk: "#b24d78", wall: "#f6d8e5" },
  { id: "h7", name: "의준이네", roof: "#4bb4d8", roofDk: "#2e8fb3", wall: "#cdeaf4" },
  { id: "h8", name: "호종이네", roof: "#9a7b4f", roofDk: "#7a5f38", wall: "#ecdcc0" },
];

const SHOP_ITEMS = [
  { id: "letter", name: "편지지", emoji: "✉️", price: 2 },
  { id: "cake", name: "케이크", emoji: "🍰", price: 5 },
  { id: "flower", name: "꽃다발", emoji: "💐", price: 4 },
  { id: "coffee", name: "커피 기프티콘", emoji: "☕", price: 3 },
  { id: "choco", name: "초콜릿", emoji: "🍫", price: 2 },
  { id: "candle", name: "향초", emoji: "🕯️", price: 3 },
];

const RENT_HOUSES = [
  { id: "r1", name: "치앙마이 A동", rent: 30, roof: "#e0a13d", roofDk: "#bd8226", wall: "#f1e2b0" },
  { id: "r2", name: "치앙마이 B동", rent: 45, roof: "#3fa07a", roofDk: "#2f7d5e", wall: "#d9e6c7" },
  { id: "r3", name: "치앙마이 C동", rent: 60, roof: "#5b8def", roofDk: "#3f6bc4", wall: "#d3e0f7" },
  { id: "r4", name: "치앙마이 리버뷰", rent: 90, roof: "#d76b96", roofDk: "#b24d78", wall: "#f6d8e5" },
];

const ANNOUNCEMENTS = [
  { id: "a1", title: "7월 워크샵 안내", date: "2026-07-10", body: "31일 만나요~~" },
  { id: "a2", title: "게임 개발중..", date: "2026-07-20", body: "좀만 기다려주세용" },
  { id: "a3", title: "치앙마이 한 달 살기 신청", date: "2026-07-12", body: "강 건너 치앙마이 하우스 렌트 신청을 받습니다. 렌트비는 스타 젬으로 결제되며, 리버뷰 동은 조기 마감될 수 있습니다." },
  { id: "a4", title: "감사의 방 리뉴얼", date: "2026-07-18", body: "감사의 방 선반에 신규 상품(향초, 꽃다발)이 입고되었습니다. 감사 칠판에 포스트잇도 자유롭게 붙여주세요." },
  { id: "a5", title: "월말 결산 & 정산 안내", date: "2026-07-28", body: "7월 31일 월말 결산이 있습니다. 중앙은행에서 보유 젬을 확인하고 정산(환전)을 진행해 주세요." },
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
    <svg width={size} height={size * 0.72} viewBox="0 0 60 44" shapeRendering="crispEdges" style={{ imageRendering: "pixelated" }}>
      <rect x="4" y="16" width="52" height="24" fill={C.parch} stroke={C.ink} strokeWidth="1" />
      <polygon points="30,2 58,16 2,16" fill={C.villa} />
      <polygon points="30,2 58,16 52,16 30,6 8,16 2,16" fill={C.villaDk} />
      <polygon points="30,2 58,16 2,16" fill="none" stroke={C.ink} strokeWidth="1" />
      {/* 깃발 */}
      <rect x="29" y="0" width="1" height="4" fill={C.ink} />
      <polygon points="30,0 36,2 30,4" fill={C.gem} />
      {/* 기둥 */}
      {[8, 18, 42, 52].map((x) => <rect key={x} x={x} y="19" width="4" height="18" fill={C.white} stroke={C.ink} strokeWidth="0.4" />)}
      {/* 문 */}
      <rect x="26" y="24" width="8" height="16" fill={C.woodDark} stroke={C.ink} strokeWidth="0.5" />
      <rect x="32" y="31" width="1" height="1" fill={C.gem} />
      {/* 창 */}
      <rect x="12" y="22" width="6" height="6" fill={C.water} stroke={C.ink} strokeWidth="0.5" />
      <rect x="42" y="22" width="6" height="6" fill={C.water} stroke={C.ink} strokeWidth="0.5" />
      <rect x="4" y="38" width="52" height="2" fill={C.parchEdge} />
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

function Hero({ facing = 1, moving = false, size = 34 }) {
  return (
    <div aria-hidden style={{ transform: `scaleX(${facing})` }}>
      <svg width={size} height={size * 1.24} viewBox="0 0 17 21" shapeRendering="crispEdges" className={moving ? "hero-bob" : ""}>
        <rect x="5" y="1" width="7" height="6" fill="#f4c9a0" stroke={C.ink} strokeWidth="0.6" />
        <rect x="4" y="0" width="9" height="3" fill={C.woodDark} />
        <rect x="6" y="4" width="1" height="1" fill={C.ink} />
        <rect x="10" y="4" width="1" height="1" fill={C.ink} />
        <rect x="4" y="7" width="9" height="8" fill={C.bankRoof} stroke={C.ink} strokeWidth="0.6" />
        <rect x="2" y="8" width="2" height="5" fill="#f4c9a0" />
        <rect x="13" y="8" width="2" height="5" fill="#f4c9a0" />
        <rect x="5" y="15" width="3" height="5" fill={C.woodDark} />
        <rect x="9" y="15" width="3" height="5" fill={C.woodDark} />
      </svg>
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

function GemBadge({ amount, big }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
      <span className="gem-spin" style={{ fontSize: big ? 22 : 15 }}>⭐</span>
      <b style={{ color: "#a86e13", fontSize: big ? 22 : 15 }}>{fmt(amount)}</b>
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
function RoomView({ title, icon, sub, bg, roomW = 640, roomH = 400, furniture, start, onBack, paused = false, children, headerBg = C.parch, banner = null, bubble = null }) {
  const [pos, setPos] = useState(start || { x: roomW / 2, y: roomH - 60 });
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
    const SPEED = 3.2;
    const loop = () => {
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
      raf = requestAnimationFrame(loop);
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
                    <Hero facing={f.facing || 1} moving={false} size={f.spriteSize || 40} />
                  </div>
                  <span style={{ fontSize: 10, color: C.ink, marginTop: 2, fontWeight: "bold", background: C.parch, border: `2px solid ${C.ink}`, padding: "0 5px", whiteSpace: "nowrap" }}>{f.label}</span>
                </div>
              );
            }
            return (
              <div key={f.id} style={{ position: "absolute", left: f.x, top: f.y, width: f.w, height: f.h,
                background: f.color || "#c9a15f", border: `3px solid ${C.ink}`,
                boxShadow: active ? `0 0 0 3px ${C.gem}` : "inset 0 0 0 2px rgba(255,255,255,0.25)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                <span style={{ fontSize: Math.min(f.w, f.h) > 46 ? 26 : 18, lineHeight: 1 }}>{f.emoji}</span>
                <span style={{ fontSize: 10, color: C.ink, marginTop: 2, fontWeight: "bold" }}>{f.label}</span>
              </div>
            );
          })}
          {/* 플레이어 */}
          <div style={{ position: "absolute", left: pos.x, top: pos.y, transform: "translate(-50%,-70%)", zIndex: 6, pointerEvents: "none" }}>
            {bubble && (
              <div className="chat-bubble" style={{ position: "absolute", bottom: "112%", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", maxWidth: 220, background: C.white, color: C.ink, border: `2px solid ${C.ink}`, borderRadius: 8, fontSize: 12, padding: "4px 8px", boxShadow: `0 2px 0 ${C.parchEdge}` }}>
                {bubble}
              </div>
            )}
            {nearFur && !bubble && (
              <div className="enter-prompt" style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 4, whiteSpace: "nowrap", background: C.ink, color: C.gem, border: `2px solid ${C.gem}`, fontSize: 10, padding: "2px 6px" }}>
                Space · {nearFur.label}
              </div>
            )}
            <Hero facing={facing} moving={moving} size={30} />
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
  list.push({ id: "musinsa", kind: "small", x: 1650, y: 1260, r: 55, label: "🛍️ 무신사", tint: "#2b2b2b" });
  // 은행 / 게시판
  list.push({ id: "bank", kind: "bank", x: 1000, y: 640, r: 65, label: "🏦 중앙은행" });
  list.push({ id: "board", kind: "board", x: 1585, y: 700, r: 60, label: "📋 게시판" });
  // 대형건물(상단)
  const bigPos = { app: [960, 320], underwear: [1250, 300], socks: [1560, 320], alba: [1120, 520], cs: [1440, 520] };
  BIG_BUILDINGS.forEach((b) => { const p = bigPos[b.id] || [1300, 400]; list.push({ id: b.id, kind: "big", x: p[0], y: p[1], r: 75, label: `${b.icon} ${b.name}`, meta: b }); });
  // 집(좌측 클러스터)
  const hPos = [[470, 560], [730, 545], [455, 780], [720, 775], [470, 1000], [730, 1000], [470, 1210], [730, 1210]];
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
  list.push({ id: "gym", kind: "facility", x: 1440, y: 1260, r: 78, label: "💪 헬스장", color: "#c0563a", colorDk: "#96412c", icon: "🏋️" });
  // NPC: 동상 & 봉준호
  list.push({ id: "statue", kind: "npc", npc: "statue", x: 900, y: 900, r: 55, label: "🗿 황혼의 파수꾼",
    lines: ["안녕 나는 황혼의 파수꾼이야", "디자인에 대해 배우고 싶다면 디자인스쿨을 찾아가봐"] });
  list.push({ id: "bong", kind: "npc", npc: "bong", x: 1650, y: 1000, r: 55, label: "🎬 봉준호",
    lines: ["안녕 나는 봉준호야", "영상에 대해 배우고 싶다면 영상스쿨을 찾아가봐"] });
  // 치앙마이 표지판 + 렌트 하우스(강 건너)
  list.push({ id: "sign", kind: "sign", x: 2300, y: 640, r: 0, label: "🌴 치앙마이" });
  const rPos = [[2360, 800], [2510, 780], [2380, 1000], [2520, 1010]];
  RENT_HOUSES.forEach((h, i) => list.push({ id: h.id, kind: "rent", x: rPos[i][0], y: rPos[i][1], r: 60, label: h.name, meta: h }));
  return list;
}
const WORLD_OBJS = buildWorld();
const WORLD = { w: 2620, h: 1520 };
const RIVER_X = 2140, RIVER_W = 120;
const BRIDGE_Y1 = 690, BRIDGE_Y2 = 800;   // 이 구간(다리)에서만 강을 건널 수 있음

function WorldView({ pos, setPos, day, gems, rentedHouses, onEnter, onNextDay, bgm, onToggleBgm, onRequestSong, bubble }) {
  const [facing, setFacing] = useState(1);
  const [moving, setMoving] = useState(false);
  const [near, setNear] = useState(null);
  const [dialog, setDialog] = useState(null);   // NPC 대화 {label,lines,shown}
  const [hint, setHint] = useState(true);        // "클릭하면 이동" 안내
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
  const handleObj = (o) => { if (!o) return; if (o.kind === "npc") startDialog(o); else onEnter(o); };
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
    let raf;
    const SPEED = 4.2;
    const loop = () => {
      const k = keys.current;
      let { x, y } = posRef.current;
      let dx = 0, dy = 0;
      if (k["ArrowLeft"] || k["a"]) dx -= 1;
      if (k["ArrowRight"] || k["d"]) dx += 1;
      if (k["ArrowUp"] || k["w"]) dy -= 1;
      if (k["ArrowDown"] || k["s"]) dy += 1;
      if (dx || dy) {
        const px = posRef.current.x;
        const len = Math.hypot(dx, dy) || 1;
        x += (dx / len) * SPEED; y += (dy / len) * SPEED;
        x = Math.max(30, Math.min(WORLD.w - 30, x));
        y = Math.max(40, Math.min(WORLD.h - 30, y));
        // 강: 다리(BRIDGE_Y1~Y2)에서만 건너갈 수 있음
        if (!(y >= BRIDGE_Y1 && y <= BRIDGE_Y2)) {
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
        if (d < o.r && d < best) { best = d; found = o; }
      }
      const key = found ? found.id : null;
      const prev = nearRef.current ? nearRef.current.id : null;
      if (key !== prev) { nearRef.current = found; setNear(found); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [setPos]);

  // 카메라 오프셋(플레이어 중심, 경계 클램프)
  const camX = Math.max(0, Math.min(WORLD.w - vp.w, pos.x - vp.w / 2));
  const camY = Math.max(0, Math.min(WORLD.h - vp.h, pos.y - vp.h / 2));

  const spriteFor = (o) => {
    switch (o.kind) {
      case "center": return <Villa size={230} />;
      case "bank": return <PixelBank size={150} />;
      case "board": return <Board size={120} />;
      case "big": return <BigBuilding color={o.meta.color} colorDk={o.meta.colorDk} size={150} />;
      case "house": return <PixelHouse roof={o.meta.roof} roofDk={o.meta.roofDk} wall={o.meta.wall} size={110} />;
      case "small": return <SmallHut tint={o.tint} size={100} />;
      case "facility": return <Facility color={o.color} colorDk={o.colorDk} icon={o.icon} size={160} />;
      case "sign": return <Signpost size={100} />;
      case "npc": return o.npc === "statue" ? <Statue size={72} /> : <ManBong size={48} />;
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
          <b style={{ fontSize: 12 }}>{bgm.title}</b>
          <PxButton tone="gold" onClick={onToggleBgm} style={{ fontSize: 11, padding: "3px 8px" }}>{bgm.playing ? "⏸" : "▶"}</PxButton>
          <PxButton tone="blue" onClick={() => setReqOpen(true)} style={{ fontSize: 11, padding: "3px 8px" }}>🎵 신청곡(5젬)</PxButton>
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
            <div key={i} style={{ position: "absolute", left: tx, top: ty }}><Tree /></div>
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

          {/* 플레이어 */}
          <div style={{ position: "absolute", left: pos.x, top: pos.y, transform: "translate(-50%,-70%)", zIndex: 20, pointerEvents: "none" }}>
            {bubble && (
              <div className="chat-bubble" style={{ position: "absolute", bottom: "112%", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", maxWidth: 220, background: C.white, color: C.ink, border: `2px solid ${C.ink}`, borderRadius: 8, fontSize: 12, padding: "4px 8px", boxShadow: `0 2px 0 ${C.parchEdge}` }}>
                {bubble}
              </div>
            )}
            {near && !bubble && (
              <div className="enter-prompt" style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 4, whiteSpace: "nowrap", background: C.ink, color: C.gem, border: `2px solid ${C.gem}`, fontSize: 11, padding: "3px 7px" }}>
                {near.kind === "npc" ? "💬 Space" : "🚪 Space"} · {near.label}
              </div>
            )}
            <Hero facing={facing} moving={moving} size={36} />
          </div>
        </div>

        {/* 처음 이동 안내 */}
        {hint && (
          <div style={{ position: "absolute", left: 10, bottom: 10, background: C.ink, color: C.gem, border: `2px solid ${C.gem}`, fontSize: 11, padding: "5px 9px", zIndex: 15 }}>
            👆 화면을 한 번 클릭하면 방향키로 바로 움직여요
          </div>
        )}

        {/* HUD 오버레이: 날짜 */}
        <div style={{ position: "absolute", right: 10, top: 10, display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ background: C.ink, color: C.white, fontSize: 12, padding: "5px 9px", border: `2px solid ${C.gem}` }}>📅 DAY {day}</span>
          <PxButton tone="blue" onClick={onNextDay} style={{ fontSize: 11, padding: "6px 9px" }}>🌙 다음 날</PxButton>
        </div>

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
            <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 360 }}>
              <Panel style={{ padding: 14 }}>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, marginBottom: 10 }}>🎵 신청곡</div>
                <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 8 }}>5젬을 사용해 마을 배경음악을 바꿔요. (보유 {fmt(gems)}⭐)</div>
                <input value={reqText} onChange={(e) => setReqText(e.target.value)} placeholder="예: NewJeans - Ditto" style={{ width: "100%", boxSizing: "border-box", padding: 9, border: `3px solid ${C.ink}`, fontFamily: "'DotGothic16', monospace", fontSize: 14, background: C.white }} />
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <PxButton tone="ink" onClick={() => setReqOpen(false)} style={{ flex: 1, padding: 10, fontSize: 13 }}>취소</PxButton>
                  <PxButton tone="gold" disabled={!reqText.trim() || gems < 5} onClick={() => { onRequestSong(reqText.trim()); setReqText(""); setReqOpen(false); }} style={{ flex: 1, padding: 10, fontSize: 13 }}>
                    {gems < 5 ? "젬 부족" : "5젬 신청"}
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
          💡 획득한 ⭐는 <b>중앙은행</b>에 자동 집계됩니다. 일일 업무는 <b>🌙 다음 날</b>을 누르면 초기화돼요.
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

function CenterView({ meetingRooms, chat, onSend, onEnterMeeting, onBack, bubble, onDrink }) {
  const [showChat, setShowChat] = useState(false);
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
    <RoomView title="주민센터" icon="🏛" sub="테이블에서 대화 · 회의실 3곳 · 커피/자판기/정수기로 HP·MP 충전" bg="#f0e4cf" roomW={640} roomH={400} furniture={furniture} onBack={onBack} paused={showChat || !!station} headerBg={C.villa} bubble={bubble}>
      {station && <DrinkStation name={station.name} color={station.color} onClose={() => setStation(null)} onDrink={onDrink} />}
      {showChat && (
        <RoomModal title="🪑 라운지 테이블 채팅" onClose={() => setShowChat(false)}>
          <div style={{ fontSize: 11, color: C.inkSoft, marginBottom: 8 }}>* 데모용 로컬 채팅입니다.</div>
          <div style={{ height: 200, overflow: "auto", background: C.white, border: `3px solid ${C.ink}`, padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
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
function MeetingView({ roomId, room, onUpdate, onBack }) {
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [share, setShare] = useState(false);
  const [resName, setResName] = useState("");
  const [time, setTime] = useState("");
  const num = roomId.replace("m", "");
  const participants = [{ name: "나", me: true }, { name: "도희", me: false }, { name: "창민", me: false }];
  return (
    <Panel style={{ padding: 0, overflow: "hidden" }}>
      <TitleBar icon="🎥" title={`회의실 ${num}`} sub={room.locked ? "🔒 잠긴 회의실" : "화상 회의 (데모)"} onBack={onBack} bg={C.bankRoof} fg={C.white}
        right={<span style={{ fontSize: 11, background: room.reserved ? C.gem : "rgba(255,255,255,0.25)", color: room.reserved ? C.ink : C.white, padding: "4px 8px", border: `2px solid ${C.ink}` }}>{room.reserved ? `📌 ${room.by} · ${room.time}` : "예약 없음"}</span>} />
      <div style={{ padding: 16, background: "#20303a" }}>
        {/* 화면 공유 영역 */}
        {share && (
          <div style={{ height: 120, background: "#0e171d", border: `3px solid ${C.gem}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.gem, marginBottom: 12, fontSize: 13 }}>
            🖥 화면 공유 중… (데모)
          </div>
        )}
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
        <div style={{ marginTop: 10, fontSize: 11, color: "rgba(255,255,255,0.7)", textAlign: "center" }}>* 화상/통화/공유는 데모 목업입니다.</div>
      </div>
    </Panel>
  );
}

/* ======================= 집(가구 + 메모장) ======================= */
function HomeView({ house, memo, onSaveMemo, onBack, bubble }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(memo || "");
  const furniture = [
    { id: "bed", x: 40, y: 60, w: 150, h: 90, color: "#c98ba0", emoji: "🛏️", label: "침대", toast: "잠깐 누워 쉬었다 😌" },
    { id: "sofa", x: 40, y: 260, w: 130, h: 70, color: "#8ea9c9", emoji: "🛋️", label: "쇼파", toast: "쇼파에 앉아 한숨 돌린다 🛋️" },
    { id: "tv", x: 250, y: 280, w: 120, h: 56, color: "#3a3a3a", emoji: "📺", label: "티비", toast: "TV를 켰다 📺 예능이 나온다" },
    { id: "desk", x: 430, y: 90, w: 150, h: 90, color: "#a9814a", emoji: "🖥️", label: "책상(메모)", onInteract: () => { setText(memo || ""); setOpen(true); } },
  ];
  return (
    <RoomView title={house.name} icon="🏠" sub="침대·쇼파·티비·책상 · 책상에서 메모 작성" bg="#efe6d2" roomW={640} roomH={400} furniture={furniture} onBack={onBack} paused={open} headerBg={house.wall} bubble={bubble}>
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
            <span style={{ color: C.inkSoft }}>노인 상점 주인이 미소짓는다.</span><GemBadge amount={gems} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
            {SHOP_ITEMS.map((it) => (
              <div key={it.id} style={{ background: C.white, border: `3px solid ${C.ink}`, padding: 8, textAlign: "center" }}>
                <div style={{ fontSize: 26 }}>{it.emoji}</div>
                <div style={{ fontSize: 13, fontWeight: "bold" }}>{it.name}</div>
                <div style={{ fontSize: 12, color: "#a86e13", margin: "2px 0 6px" }}>⭐ {it.price}</div>
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
  const [open, setOpen] = useState(false);
  const [cost, setCost] = useState(1);
  const [text, setText] = useState("");
  const furniture = [
    { id: "mailbox", x: 260, y: 120, w: 110, h: 140, color: "#c0563a", emoji: "📮", label: "마음우체통", onInteract: () => setOpen(true) },
    { id: "bench", x: 60, y: 300, w: 120, h: 56, color: "#a9814a", emoji: "🪑", label: "벤치", toast: "잠시 앉아 마음을 가라앉힌다" },
  ];
  return (
    <RoomView title="마음의 방" icon="💌" sub="퇴근길코어 고민을 익명으로 털어놓는 곳" bg="#efe0e6" roomW={640} roomH={400} furniture={furniture} onBack={onBack} paused={open} headerBg="#d76b96" bubble={bubble}>
      {open && (
        <RoomModal title="📮 마음우체통" onClose={() => setOpen(false)}>
          <div style={{ fontSize: 12, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: C.inkSoft }}>익명으로 남겨요. 아무도 누군지 몰라요.</span><GemBadge amount={gems} />
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {[0.5, 1].map((v) => (
              <PxButton key={v} tone={cost === v ? "gold" : "wood"} onClick={() => setCost(v)} style={{ fontSize: 12, padding: "6px 10px" }}>⭐ {v} 넣기</PxButton>
            ))}
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="오늘의 고민을 털어놓아 보세요…"
            style={{ width: "100%", boxSizing: "border-box", height: 100, padding: 10, border: `3px solid ${C.ink}`, fontFamily: "'DotGothic16', monospace", fontSize: 13, background: "#fffdf5", resize: "none" }} />
          <PxButton tone="good" disabled={!text.trim() || gems < cost} onClick={() => { onPost(text.trim(), cost); setText(""); setOpen(false); }} style={{ width: "100%", marginTop: 8, padding: 10, fontSize: 13 }}>
            {gems < cost ? "젬이 부족해요" : `⭐ ${cost} 내고 익명으로 넣기`}
          </PxButton>
          {worries.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: C.inkSoft, marginBottom: 6 }}>우체통에 쌓인 익명의 마음들</div>
              <div style={{ maxHeight: 140, overflow: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                {worries.map((w) => (
                  <div key={w.id} style={{ background: "#fff", border: `2px solid ${C.ink}`, padding: 8, fontSize: 12 }}>🕊️ 익명 · {w.text}</div>
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
  const m = String(url).match(/(?:youtu\.be\/|[?&]v=|embed\/)([\w-]{11})/);
  return m ? m[1] : null;
}
function ListeningView({ onBack, gems, onSpend, bubble }) {
  const inp = { padding: 8, border: `3px solid ${C.ink}`, fontFamily: "'DotGothic16', monospace", fontSize: 13, background: C.white };
  const [songs, setSongs] = useState([
    { id: 1, title: "Bazzi - Mine", desc: "요즘 제가 즐겨듣는 노래에요", videoId: null, q: "Bazzi Mine" },
    { id: 2, title: "LANY - ILYSB", desc: "드라이브할 때 최고 🚗", videoId: null, q: "LANY ILYSB" },
    { id: 3, title: "아이유 - 밤편지", desc: "자기 전에 듣기 좋아요 🌙", videoId: null, q: "아이유 밤편지" },
  ]);
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(null);
  const [adding, setAdding] = useState(false);
  const [nt, setNt] = useState(""); const [nu, setNu] = useState(""); const [nd, setNd] = useState("");
  const [playing, setPlaying] = useState(true);
  const [track, setTrack] = useState("Bazzi - Mine");
  const [reqOpen, setReqOpen] = useState(false);
  const [reqText, setReqText] = useState("");

  const requestSong = () => {
    const t = reqText.trim();
    if (!t || gems < 5) return;
    onSpend(5);
    setSongs((v) => [...v, { id: Date.now(), title: t, desc: "신청곡 🎶", videoId: null, q: t }]);
    setTrack(t); setPlaying(true); setReqText(""); setReqOpen(false);
  };

  const pickSong = (s) => { setSel(s); setTrack(s.title); setPlaying(true); };
  const addSong = () => {
    if (!nt.trim()) return;
    setSongs((v) => [...v, { id: Date.now(), title: nt.trim(), desc: nd.trim() || "추가한 곡", videoId: parseYouTubeId(nu), q: nt.trim() }]);
    setNt(""); setNu(""); setNd(""); setAdding(false);
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
      <span className={playing ? "gem-spin" : ""} style={{ fontSize: 16 }}>♬</span>
      <b style={{ fontSize: 13 }}>{track}</b>
      <PxButton tone="gold" onClick={() => setPlaying((p) => !p)} style={{ fontSize: 12, padding: "4px 10px", marginLeft: 6 }}>{playing ? "⏸ 일시정지" : "▶ 재생"}</PxButton>
      <PxButton tone="blue" onClick={() => setReqOpen(true)} style={{ fontSize: 12, padding: "4px 10px" }}>🎵 신청곡(5젬)</PxButton>
      <span style={{ fontSize: 10, color: "#b9a7d6", marginLeft: "auto" }}>보유 {fmt(gems)}⭐</span>
    </div>
  );

  return (
    <RoomView title="리스닝 방" icon="🎵" sub="디제이 부스에서 선곡 · 관객석에서 감상" bg="#2a2140" roomW={640} roomH={400} furniture={furniture} onBack={onBack} paused={open || reqOpen} headerBg="#5b8def" banner={banner} bubble={bubble}>
      {reqOpen && (
        <RoomModal title="🎵 신청곡" onClose={() => setReqOpen(false)} maxW={360}>
          <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 8 }}>5젬으로 신청하면 상단 배경음악 제목이 바뀌어요. (보유 {fmt(gems)}⭐)</div>
          <input value={reqText} onChange={(e) => setReqText(e.target.value)} placeholder="예: NewJeans - Ditto" style={{ ...inp, width: "100%", boxSizing: "border-box", fontSize: 14 }} />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <PxButton tone="ink" onClick={() => setReqOpen(false)} style={{ flex: 1, padding: 10, fontSize: 13 }}>취소</PxButton>
            <PxButton tone="gold" disabled={!reqText.trim() || gems < 5} onClick={requestSong} style={{ flex: 1, padding: 10, fontSize: 13 }}>{gems < 5 ? "젬 부족" : "5젬 신청"}</PxButton>
          </div>
        </RoomModal>
      )}
      {open && (
        <RoomModal title="🎧 디제이 · 선곡 리스트" onClose={() => { setOpen(false); setSel(null); setAdding(false); }} maxW={520}>
          {!sel && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                {songs.map((s) => (
                  <button key={s.id} onClick={() => pickSong(s)} className="px-btn" style={{ textAlign: "left", background: C.white, border: `3px solid ${C.ink}`, padding: "8px 10px", cursor: "pointer", fontFamily: "'DotGothic16', monospace" }}>
                    <b style={{ fontSize: 13 }}>🎵 {s.title}</b>
                    <div style={{ fontSize: 11, color: C.inkSoft }}>{s.desc}</div>
                  </button>
                ))}
              </div>
              {adding ? (
                <div style={{ background: C.parch, border: `3px solid ${C.ink}`, padding: 10, display: "grid", gap: 6 }}>
                  <input value={nt} onChange={(e) => setNt(e.target.value)} placeholder="곡 제목" style={inp} />
                  <input value={nu} onChange={(e) => setNu(e.target.value)} placeholder="유튜브 링크 (붙여넣으면 바로 재생돼요)" style={inp} />
                  <input value={nd} onChange={(e) => setNd(e.target.value)} placeholder="한 줄 소개" style={inp} />
                  <div style={{ display: "flex", gap: 6 }}>
                    <PxButton tone="ink" onClick={() => setAdding(false)} style={{ flex: 1, fontSize: 12, padding: 8 }}>취소</PxButton>
                    <PxButton tone="good" disabled={!nt.trim()} onClick={addSong} style={{ flex: 1, fontSize: 12, padding: 8 }}>추가</PxButton>
                  </div>
                </div>
              ) : (
                <PxButton tone="gold" onClick={() => setAdding(true)} style={{ width: "100%", fontSize: 13, padding: 10 }}>＋ 노래 추가</PxButton>
              )}
            </>
          )}
          {sel && (
            <div>
              <PxButton tone="ink" onClick={() => setSel(null)} style={{ fontSize: 12, padding: "6px 10px", marginBottom: 10 }}>← 목록</PxButton>
              <div style={{ background: "#000", border: `3px solid ${C.ink}`, aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {sel.videoId ? (
                  <iframe title={sel.title} width="100%" height="100%" src={`https://www.youtube.com/embed/${sel.videoId}?autoplay=1`} allow="autoplay; encrypted-media" allowFullScreen style={{ border: 0 }} />
                ) : (
                  <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(sel.q)}`} target="_blank" rel="noreferrer" style={{ color: "#ffe680", textDecoration: "none", textAlign: "center", fontFamily: "'DotGothic16', monospace" }}>
                    <div style={{ fontSize: 46 }}>▶</div>
                    <div style={{ fontSize: 13 }}>유튜브에서 재생하기</div>
                    <div style={{ fontSize: 10, color: "#b9a7d6", marginTop: 4 }}>('노래 추가'로 링크를 넣으면 여기서 바로 재생돼요)</div>
                  </a>
                )}
              </div>
              <div style={{ marginTop: 8, fontSize: 13 }}><b>{sel.title}</b></div>
              <div style={{ fontSize: 12, color: C.inkSoft }}>💬 {sel.desc}</div>
            </div>
          )}
        </RoomModal>
      )}
    </RoomView>
  );
}

/* ======================= 릴스방(핸드폰 · 동물/쾌감/밈 + 카테고리 추가) ======================= */
function ReelsView({ onBack, bubble }) {
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
    setReels((r) => ({ ...r, [key]: { label: name, bg: palette[Object.keys(r).length % palette.length], title: `${name} 릴스 🎬`, content: <div style={{ fontSize: 46 }}>🎬✨</div> } }));
    setAddText(""); setAddOpen(false);
  };

  const phoneColors = ["#3fa07a", "#5b8def", "#e0a13d", "#d76b96", "#8e5a9e", "#c0563a"];
  const cats = Object.keys(reels);
  const furniture = cats.map((key, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    return { id: key, x: 40 + col * 150, y: 90 + row * 170, w: 90, h: 150, color: phoneColors[i % phoneColors.length], emoji: "📱", label: reels[key].label, onInteract: () => setOpen(key) };
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
        <RoomModal title={`📱 릴스 · ${reels[open].label}`} onClose={() => setOpen(null)} maxW={320}>
          <div style={{ margin: "0 auto", width: 230, background: "#111", border: "6px solid #000", borderRadius: 24, padding: "12px 10px" }}>
            <div style={{ width: 56, height: 6, background: "#333", borderRadius: 6, margin: "0 auto 8px" }} />
            <div style={{ aspectRatio: "9/16", background: reels[open].bg, border: "2px solid #000", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
              {reels[open].content}
              <div style={{ position: "absolute", bottom: 8, left: 8, right: 8, color: "#fff", fontSize: 12, textShadow: "1px 1px 0 #000" }}>{reels[open].title}</div>
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
function MiniGameRoom({ onBack, onReward, bubble }) {
  const [game, setGame] = useState(null); // 'reaction' | 'rps' | 'sequence'
  const furniture = [
    { id: "reaction", x: 60, y: 110, w: 130, h: 100, color: "#5b8def", emoji: "⚡", label: "반응속도", onInteract: () => setGame("reaction") },
    { id: "rps", x: 260, y: 110, w: 130, h: 100, color: "#d76b96", emoji: "✊", label: "가위바위보", onInteract: () => setGame("rps") },
    { id: "seq", x: 460, y: 110, w: 130, h: 100, color: "#e0a13d", emoji: "🔢", label: "숫자 순서", onInteract: () => setGame("sequence") },
  ];
  return (
    <RoomView title="미니게임 방" icon="🎮" sub="게임 테이블에 다가가 Space · 마우스로 플레이" bg="#20182e" roomW={640} roomH={400} furniture={furniture} onBack={onBack} paused={!!game} headerBg="#8e5a9e" bubble={bubble}>
      {game === "reaction" && <ReactionGame onClose={() => setGame(null)} onReward={onReward} />}
      {game === "rps" && <RpsGame onClose={() => setGame(null)} onReward={onReward} />}
      {game === "sequence" && <SequenceGame onClose={() => setGame(null)} onReward={onReward} />}
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
        {state === "result" && `${ms}ms ${ms < 350 ? "⚡ +3⭐" : "😅 조금 느려요"} · 다시하기`}
      </button>
      <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 8, textAlign: "center" }}>350ms 이내면 3젬 획득</div>
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
    else if (win[me] === cpu) { r = "승리! +2⭐"; onReward(2); }
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
      <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 8, textAlign: "center" }}>이기면 2젬 획득</div>
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
      {done && <div style={{ textAlign: "center", marginTop: 10, color: C.good, fontWeight: "bold" }}>클리어! +3⭐</div>}
      <PxButton tone="ink" onClick={reset} style={{ width: "100%", marginTop: 10, padding: 8, fontSize: 12 }}>다시 섞기</PxButton>
    </RoomModal>
  );
}

/* ======================= 수영장 / 헬스장 ======================= */
function PoolView({ onBack, bubble }) {
  const furniture = [
    { id: "lane", x: 130, y: 150, w: 380, h: 120, color: "#3aa0c9", emoji: "🏊", label: "수영 레인", toast: "시원하게 한 바퀴! 🏊" },
    { id: "dive", x: 50, y: 40, w: 90, h: 70, color: "#c0563a", emoji: "🤿", label: "다이빙대", toast: "첨벙! 다이빙 성공 🤿" },
    { id: "sunbed", x: 500, y: 300, w: 110, h: 60, color: "#e0a13d", emoji: "⛱️", label: "선베드", toast: "선베드에서 일광욕 ☀️" },
    { id: "tube", x: 270, y: 310, w: 80, h: 60, color: "#ffe680", emoji: "🛟", label: "튜브", toast: "둥둥~ 물 위에 떠 있다 🛟" },
  ];
  return <RoomView title="수영장" icon="🏊" sub="시원한 물놀이 · 레인/다이빙/선베드" bg="#bfe6f2" roomW={640} roomH={400} furniture={furniture} onBack={onBack} headerBg="#4bb4d8" bubble={bubble} />;
}
function GymView({ onBack, onWork, bubble }) {
  const [stretch, setStretch] = useState(false);
  const furniture = [
    { id: "tread", x: 45, y: 80, w: 110, h: 90, color: "#5a6b78", emoji: "🏃", label: "러닝머신", toast: "유산소 완료! 심박수 상승 🏃" },
    { id: "weight", x: 220, y: 110, w: 120, h: 100, color: "#c0563a", emoji: "🏋️", label: "웨이트 존(+4⭐)", onInteract: onWork, toast: "💪 운동하고 +4⭐ 획득!" },
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
    <RoomView title="헬스장" icon="💪" sub="러닝머신·웨이트·스트레칭 · 웨이트 존에서 젬 획득" bg="#e6e2da" roomW={640} roomH={400} furniture={furniture} onBack={onBack} headerBg="#c0563a" paused={stretch} bubble={bubble}>
      {stretch && (
        <RoomModal title="🧘 스트레칭 가이드" onClose={() => setStretch(false)} maxW={460}>
          <Steps title="👀 눈 스트레칭" arr={eye} />
          <Steps title="💪 어깨 스트레칭" arr={shoulder} />
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
    <RoomView title="무신사" icon="🛍️" sub="직원 2명 · 옷을 눌러 입어보고(무료), 맘에 들면 구매" bg="#e7e2da" roomW={640} roomH={400} furniture={furniture} onBack={onBack} paused={!!cat} headerBg="#2b2b2b" bubble={bubble}>
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
                      <div style={{ fontSize: 11, fontWeight: "bold", color: has ? C.good : "#a86e13" }}>{has ? "보유중" : `⭐ ${item.price}`}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          {worn && (
            <div style={{ marginTop: 12, background: C.white, border: `3px solid ${C.ink}`, padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, fontSize: 13 }}>
                착용중: <b>{worn.name}</b>{owned[worn.id] ? <span style={{ color: C.good }}> · 보유중 ✓</span> : <span style={{ color: "#a86e13" }}> · ⭐{worn.price} (보유 {fmt(gems)})</span>}
              </div>
              {!owned[worn.id] && (
                <PxButton tone="gold" disabled={gems < worn.price} onClick={() => onBuy(cat, worn)} style={{ padding: "8px 14px", fontSize: 13 }}>{gems < worn.price ? "젬 부족" : "구매하기"}</PxButton>
              )}
            </div>
          )}
        </RoomModal>
      )}
    </RoomView>
  );
}
/* ======================= 흡연의 방(플레이버) ======================= */
function SmokeView({ onBack, bubble }) {
  const furniture = [
    { id: "ashtray", x: 260, y: 180, w: 100, h: 70, color: "#7a8b99", emoji: "🚬", label: "재떨이", toast: "후… 잠깐의 여유 💨" },
    { id: "window", x: 260, y: 40, w: 120, h: 60, color: "#6fc3e0", emoji: "🪟", label: "환기창", toast: "창문을 열어 환기했다 🌬️" },
  ];
  return <RoomView title="흡연의 방" icon="🚬" sub="흡연 중 💨 · 환기 필수" bg="#dfe3e6" roomW={640} roomH={400} furniture={furniture} onBack={onBack} headerBg="#7a8b99" bubble={bubble} />;
}

/* ======================= 게시판(캘린더 + 공지) ======================= */
function BoardView({ onBack }) {
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
      <TitleBar icon="📋" title="게시판" sub="공지사항 · 2026년 7월 캘린더" onBack={onBack} bg={C.wood} fg={C.white} />
      <div style={{ display: "flex", gap: 6, padding: 10, background: C.parchLine, borderBottom: `3px solid ${C.parchEdge}` }}>
        <PxButton tone={tab === "notice" ? "gold" : "wood"} onClick={() => setTab("notice")} style={{ fontSize: 12, padding: "8px 12px" }}>📢 공지사항</PxButton>
        <PxButton tone={tab === "cal" ? "gold" : "wood"} onClick={() => setTab("cal")} style={{ fontSize: 12, padding: "8px 12px" }}>📅 캘린더</PxButton>
      </div>

      <div style={{ padding: 16, background: `repeating-linear-gradient(0deg, ${C.parch} 0 40px, ${C.parchLine} 40px 80px)` }}>
        {tab === "notice" && (
          <div style={{ display: "grid", gap: 8 }}>
            {ANNOUNCEMENTS.map((a) => (
              <button key={a.id} onClick={() => setOpenDoc(a)} className="px-btn" style={{ textAlign: "left", background: C.white, border: `3px solid ${C.ink}`, padding: "10px 12px", cursor: "pointer", fontFamily: "'DotGothic16', monospace" }}>
                <div style={{ fontSize: 14, fontWeight: "bold" }}>📄 {a.title}</div>
                <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 2 }}>{a.date} · 눌러서 열기</div>
              </button>
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
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 480 }}>
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
      <TitleBar icon="🌴" title={house.name} sub="치앙마이 · 한 달 살기 렌트" onBack={onBack} bg={C.villaDk} fg={C.white} right={<GemBadge amount={gems} />} />
      <div style={{ padding: 20, textAlign: "center", background: `repeating-linear-gradient(0deg, ${C.parch} 0 40px, ${C.parchLine} 40px 80px)` }}>
        <div style={{ display: "inline-block" }}><PixelHouse roof={house.roof} roofDk={house.roofDk} wall={house.wall} size={150} /></div>
        <div style={{ fontSize: 15, marginTop: 8 }}>강 건너 치앙마이의 아늑한 숙소</div>
        <div style={{ fontSize: 14, color: "#a86e13", margin: "8px 0 14px" }}>렌트비 <b>⭐ {house.rent}</b> ({fmt(house.rent * GEM_TO_WON)}원 상당)</div>
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
            {gems >= house.rent ? "🔑 렌트 신청하기" : "젬이 부족해요"}
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
          <StatCard label="현재 보유 젬" value={gems} accent={C.gem} icon="⭐" />
          <StatCard label="총 채굴량 (누적)" value={lifetime} accent={C.good} icon="⛏" />
          <StatCard label="총 환전 젬" value={exchanged} accent={C.bankRoof} icon="🏦" />
        </div>
        <div style={{ marginTop: 14, background: C.white, border: `4px solid ${C.ink}`, boxShadow: `inset 0 0 0 3px ${C.parchEdge}`, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, marginBottom: 8 }}>EXCHANGE GATE</div>
              <div style={{ fontSize: 13 }}>환율 <b>1 ⭐ = {GEM_TO_WON.toLocaleString()}원</b></div>
              <div style={{ fontSize: 13, marginTop: 4, color: C.inkSoft }}>현재 보유 젬은 최대 <b>{fmt(gems * GEM_TO_WON)}원</b> 상당</div>
            </div>
            <PxButton tone={canWithdraw ? "danger" : "ink"} disabled={!canWithdraw} onClick={() => { setAmount(Math.floor(gems)); setOpen(true); }} style={{ padding: "12px 18px", fontSize: 14 }}>
              {canWithdraw ? "💰 출금/환전 신청" : "환전할 젬이 없어요"}
            </PxButton>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, background: C.parch, border: `2px solid ${C.ink}`, padding: "8px 10px" }}>
            <b>🎯 리워드 포인트 적립</b>
            <div style={{ color: C.inkSoft, marginTop: 3 }}>자체 화폐 ⭐ → 실물 리워드 시스템으로 연동되는 정산 채널(시뮬레이션)</div>
          </div>
        </div>
        {flash && (
          <div className="gem-pop" style={{ marginTop: 12, background: C.good, color: C.white, border: `3px solid ${C.ink}`, padding: 12, fontSize: 13 }}>
            ✅ 정산 완료(시뮬레이션): <b>{fmt(flash.amount)} ⭐</b> → <b>{fmt(flash.won)}원</b>
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
                  <span><b>{fmt(h.amount)} ⭐</b> → <b style={{ color: C.good }}>{fmt(h.won)}원</b> <span style={{ fontSize: 10, background: C.good, color: C.white, padding: "2px 6px", marginLeft: 6 }}>정산 완료</span></span>
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
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 420 }}>
            <Panel style={{ padding: 16 }}>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, marginBottom: 12 }}>💰 환전 신청</div>
              <label style={{ fontSize: 12, color: C.inkSoft }}>환전할 스타 젬 (보유 {fmt(gems)})</label>
              <input type="number" value={amount} min={1} max={gems} onChange={(e) => setAmount(Math.floor(Number(e.target.value) || 0))}
                style={{ width: "100%", boxSizing: "border-box", marginTop: 6, padding: 10, fontFamily: "'DotGothic16', monospace", fontSize: 16, border: `3px solid ${C.ink}`, background: C.white }} />
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {[10, 50, 100].map((v) => <PxButton key={v} tone="wood" disabled={v > gems} onClick={() => setAmount(v)} style={{ fontSize: 11, padding: "6px 10px" }}>{v}⭐</PxButton>)}
                <PxButton tone="wood" disabled={gems < 1} onClick={() => setAmount(Math.floor(gems))} style={{ fontSize: 11, padding: "6px 10px" }}>전액</PxButton>
              </div>
              <div style={{ marginTop: 12, background: C.white, border: `3px solid ${C.ink}`, padding: 10, fontSize: 14, textAlign: "center" }}>
                {fmt(amount)} ⭐ → <b style={{ color: C.good }}>{fmt(amount * GEM_TO_WON)}원</b>
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
function ChatDock({ messages, shout, onToggleShout, onSend }) {
  const [text, setText] = useState("");
  const send = () => { if (!text.trim()) return; onSend(text, shout); setText(""); };
  return (
    <div style={{ position: "fixed", left: 12, bottom: 12, width: 250, zIndex: 60, fontFamily: "'DotGothic16', monospace" }}>
      {messages.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 6 }}>
          {messages.map((m) => (
            <div key={m.id} style={{ background: "rgba(43,31,20,0.86)", color: C.white, border: `2px solid ${C.ink}`, padding: "4px 8px", fontSize: 12, alignSelf: "flex-start", maxWidth: "100%" }}>
              <span style={{ color: C.gem, fontSize: 10 }}>{m.nick}</span>{" "}
              <span style={{ fontWeight: m.shout ? "bold" : "normal", fontSize: m.shout ? 13 : 12 }}>{m.shout ? "📢 " : ""}{m.text}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 4, background: C.parch, border: `3px solid ${C.ink}`, padding: 4 }}>
        <button onClick={onToggleShout} title="확성기" style={{ background: shout ? C.gem : C.white, border: `2px solid ${C.ink}`, cursor: "pointer", fontSize: 15, width: 32, flexShrink: 0 }}>📢</button>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder={shout ? "확성기 ON · 크게 외치기" : "채팅 입력 후 Enter"} style={{ flex: 1, minWidth: 0, border: `2px solid ${C.ink}`, padding: "4px 6px", fontSize: 12, background: C.white, fontFamily: "'DotGothic16', monospace" }} />
        <button onClick={send} style={{ background: C.good, color: C.white, border: `2px solid ${C.ink}`, cursor: "pointer", fontSize: 12, padding: "0 8px", flexShrink: 0 }}>▶</button>
      </div>
    </div>
  );
}

function MenuButton({ onClick }) {
  return (
    <button onClick={onClick} title="메뉴" style={{ position: "fixed", right: 14, bottom: 74, zIndex: 60, width: 46, height: 46, background: C.gem, border: `3px solid ${C.ink}`, boxShadow: `0 3px 0 ${C.ink}`, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
      {[0, 1, 2].map((i) => <span key={i} style={{ width: 22, height: 3, background: C.ink, display: "block" }} />)}
    </button>
  );
}

function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const submit = () => { if (!text.trim()) return; setSent(true); setText(""); setTimeout(() => { setSent(false); setOpen(false); }, 1400); };
  return (
    <>
      <button onClick={() => setOpen(true)} title="피드백" style={{ position: "fixed", right: 14, bottom: 16, zIndex: 60, width: 46, height: 46, background: C.wood, color: C.white, border: `3px solid ${C.ink}`, boxShadow: `0 3px 0 ${C.ink}`, cursor: "pointer", fontSize: 22 }}>⚙️</button>
      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 80, padding: 14 }} onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 380 }}>
            <Panel style={{ padding: 16 }}>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, marginBottom: 10 }}>⚙️ 피드백 보내기</div>
              {sent ? (
                <div style={{ background: C.good, color: C.white, border: `3px solid ${C.ink}`, padding: 14, textAlign: "center", fontSize: 14 }}>소중한 의견 감사합니다! ✨</div>
              ) : (
                <>
                  <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="개선 아이디어나 버그를 알려주세요!" rows={4}
                    style={{ width: "100%", boxSizing: "border-box", border: `3px solid ${C.ink}`, padding: 9, fontSize: 13, background: C.white, fontFamily: "'DotGothic16', monospace", resize: "vertical" }} />
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <PxButton tone="ink" onClick={() => setOpen(false)} style={{ flex: 1, padding: 10, fontSize: 13 }}>닫기</PxButton>
                    <PxButton tone="good" disabled={!text.trim()} onClick={submit} style={{ flex: 1, padding: 10, fontSize: 13 }}>제출</PxButton>
                  </div>
                </>
              )}
            </Panel>
          </div>
        </div>
      )}
    </>
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
          <div style={{ fontSize: 12, color: C.inkSoft }}>💼 {p.job}</div>
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
function DMChatModal({ person, onClose }) {
  const [msgs, setMsgs] = useState([{ me: false, text: `안녕하세요! ${person.name}이에요 👋 무슨 일이에요?` }]);
  const [text, setText] = useState("");
  const replies = ["오 좋아요!", "ㅋㅋㅋ 그러게요", "저도 그렇게 생각해요 👍", "언제 커피 한잔 해요 ☕", "지금 좀 바빠서요, 이따 봬요!", "헐 대박", "알겠어요, 확인해볼게요 📝"];
  const endRef = useRef(null);
  const send = () => {
    const t = text.trim(); if (!t) return;
    setMsgs((m) => [...m, { me: true, text: t }]); setText("");
    setTimeout(() => setMsgs((m) => [...m, { me: false, text: replies[Math.floor(Math.random() * replies.length)] }]), 700 + Math.random() * 600);
  };
  useEffect(() => { if (endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 90, padding: 14 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 380 }}>
        <Panel style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "#5b8def", color: C.white, borderBottom: `3px solid ${C.ink}` }}>
            <span style={{ fontSize: 22 }}>{person.avatar}</span>
            <b style={{ flex: 1 }}>{person.name}</b>
            <PxButton tone="ink" onClick={onClose} style={{ fontSize: 11, padding: "5px 9px" }}>✕</PxButton>
          </div>
          <div style={{ height: 260, overflow: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 6, background: "#efe6d2" }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ alignSelf: m.me ? "flex-end" : "flex-start", background: m.me ? C.gem : C.white, border: `2px solid ${C.ink}`, padding: "5px 9px", fontSize: 13, maxWidth: "78%" }}>{m.text}</div>
            ))}
            <div ref={endRef} />
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

function FaceTalkModal({ person, onClose }) {
  const [sec, setSec] = useState(0);
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  useEffect(() => { const iv = setInterval(() => setSec((s) => s + 1), 1000); return () => clearInterval(iv); }, []);
  const mm = String(Math.floor(sec / 60)).padStart(2, "0"), ss = String(sec % 60).padStart(2, "0");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 90, padding: 14 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 420 }}>
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
function ProfileMenu({ onClose }) {
  const [tab, setTab] = useState(null); // null | 'me' | 'villagers'
  const [sel, setSel] = useState(null);
  const [dm, setDm] = useState(null);
  const [call, setCall] = useState(null);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 80, padding: 14 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, maxHeight: "88%", overflow: "auto" }}>
        <Panel style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11 }}>☰ 메뉴</div>
            <PxButton tone="ink" onClick={onClose} style={{ fontSize: 11, padding: "5px 9px" }}>✕</PxButton>
          </div>

          {!tab && (
            <div style={{ display: "grid", gap: 10 }}>
              <PxButton tone="blue" onClick={() => setTab("me")} style={{ padding: 16, fontSize: 15 }}>🧑‍💻 내 프로필</PxButton>
              <PxButton tone="good" onClick={() => { setTab("villagers"); setSel(null); }} style={{ padding: 16, fontSize: 15 }}>🏘️ 마을주민들</PxButton>
            </div>
          )}

          {tab === "me" && (
            <div>
              <PxButton tone="ink" onClick={() => setTab(null)} style={{ fontSize: 11, padding: "5px 9px", marginBottom: 10 }}>← 뒤로</PxButton>
              <ProfileDetail p={MY_PROFILE} />
            </div>
          )}

          {tab === "villagers" && !sel && (
            <div>
              <PxButton tone="ink" onClick={() => setTab(null)} style={{ fontSize: 11, padding: "5px 9px", marginBottom: 10 }}>← 뒤로</PxButton>
              <div style={{ display: "grid", gap: 8 }}>
                {PROFILES.map((p) => (
                  <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 10, background: C.white, border: `3px solid ${C.ink}`, padding: 10 }}>
                    <button onClick={() => setSel(p)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, flex: 1, textAlign: "left", padding: 0 }}>
                      <span style={{ fontSize: 32 }}>{p.avatar}</span>
                      <span><b style={{ fontSize: 14 }}>{p.name}</b><br /><span style={{ fontSize: 11, color: C.inkSoft }}>💼 {p.job}</span></span>
                    </button>
                    <PxButton tone="blue" onClick={() => setDm(p)} style={{ fontSize: 11, padding: "6px 8px" }}>DM</PxButton>
                    <PxButton tone="good" onClick={() => setCall(p)} style={{ fontSize: 11, padding: "6px 8px" }}>📞 페이스톡</PxButton>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "villagers" && sel && <ProfileDetail p={sel} onBack={() => setSel(null)} />}

          {dm && <DMChatModal person={dm} onClose={() => setDm(null)} />}
          {call && <FaceTalkModal person={call} onClose={() => setCall(null)} />}
        </Panel>
      </div>
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
export default function App() {
  const [view, setView] = useState("world");
  const [houseId, setHouseId] = useState(null);
  const [bigId, setBigId] = useState(null);
  const [meetingId, setMeetingId] = useState(null);
  const [rentId, setRentId] = useState(null);

  const [gems, setGems] = useState(0);
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
  const [worries, setWorries] = useState([]);
  const [rented, setRented] = useState({});
  const [outfit, setOutfit] = useState({ top: null, bottom: null, shoes: null });
  const [owned, setOwned] = useState({});
  const tryOnClothing = (catKey, item) => setOutfit((o) => ({ ...o, [catKey]: item }));
  const buyClothing = (catKey, item) => {
    if (owned[item.id]) { setOutfit((o) => ({ ...o, [catKey]: item })); return; }
    if (gems < item.price) return;
    setGems((g) => g - item.price);
    setOwned((v) => ({ ...v, [item.id]: true }));
    setOutfit((o) => ({ ...o, [catKey]: item }));
  };

  // 신규: 배경음악 / 채팅 / 말풍선 / 피드백 / 메뉴
  const [worldBgm, setWorldBgm] = useState({ title: "Keshi - 2 Soon", playing: true });
  const [chat, setChat] = useState([]);
  const [shout, setShout] = useState(false);
  const [bubble, setBubble] = useState(null);
  const bubbleTimer = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

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

  const bigMeta = useMemo(() => BIG_BUILDINGS.find((b) => b.id === bigId) || null, [bigId]);
  const houseMeta = useMemo(() => HOUSES.find((h) => h.id === houseId) || null, [houseId]);
  const rentMeta = useMemo(() => RENT_HOUSES.find((h) => h.id === rentId) || null, [rentId]);

  const award = useCallback((n) => { setGems((g) => g + n); setLifetime((l) => l + n); }, []);

  const sayBubble = useCallback((text) => {
    setBubble(text);
    clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubble(null), 3000);
  }, []);
  useEffect(() => () => clearTimeout(bubbleTimer.current), []);
  const postChat = useCallback((text, isShout) => {
    const t = text.trim(); if (!t) return;
    setChat((c) => [...c, { id: Date.now(), nick: "나", text: t, shout: isShout }].slice(-4));
    sayBubble(t);
  }, [sayBubble]);
  const requestWorldSong = (title) => {
    if (gems < 5) return;
    setGems((g) => g - 5);
    setWorldBgm((b) => ({ ...b, title, playing: true }));
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
      case "house": setHouseId(o.id); setView("house"); break;
      case "small": setView(o.id); break; // thanks/heart/listening/reels/smoke
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
    <div style={{ fontFamily: "'DotGothic16', monospace", minHeight: "100vh", background: `repeating-linear-gradient(45deg, ${C.grass} 0 24px, ${C.grassDark} 24px 48px)`, color: C.ink, padding: 14, boxSizing: "border-box" }}>
      <StyleBlock />
      <div style={{ maxWidth: 960, margin: "0 auto 12px" }}>
        <Panel style={{ padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🌱</span>
            <div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, color: C.inkSoft }}>ECHO TOWN</div>
              <div style={{ fontSize: 13, color: C.inkSoft }}>오픈월드 워크 시뮬레이터</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 150 }}>
              <VitalBar label="HP" val={hp} color={C.danger} />
              <VitalBar label="MP" val={mp} color="#3a7bd5" />
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: C.inkSoft }}>보유 스타 젬</div>
              <GemBadge amount={gems} big />
            </div>
          </div>
        </Panel>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        {view === "world" && <WorldView pos={worldPos} setPos={setWorldPos} day={day} gems={gems} rentedHouses={rented} onEnter={handleEnter} onNextDay={nextDay} bgm={worldBgm} onToggleBgm={() => setWorldBgm((b) => ({ ...b, playing: !b.playing }))} onRequestSong={requestWorldSong} bubble={bubble} />}
        {view === "center" && <CenterView meetingRooms={meetingRooms} chat={centerChat} onSend={(t) => setCenterChat((c) => [...c, { who: "나", text: t, me: true }])} onEnterMeeting={(id) => { setMeetingId(id); setView("meeting"); }} onBack={backToWorld} bubble={bubble} onDrink={() => { setHp((h) => Math.min(100, h + 20)); setMp((m) => Math.min(100, m + 20)); }} />}
        {view === "meeting" && meetingId && <MeetingView roomId={meetingId} room={meetingRooms[meetingId]} onUpdate={(id, patch) => setMeetingRooms((m) => ({ ...m, [id]: { ...m[id], ...patch } }))} onBack={() => setView("center")} />}
        {view === "big" && bigMeta && <BigBuildingView b={bigMeta} qs={qs} day={day} onRun={runQuest} onBack={backToWorld} />}
        {view === "house" && houseMeta && <HomeView house={houseMeta} memo={memos[houseId]} onSaveMemo={(t) => setMemos((m) => ({ ...m, [houseId]: t }))} onBack={backToWorld} bubble={bubble} />}
        {view === "thanks" && <ThanksView gems={gems} inventory={thanksInv} postits={postits} onBuy={(it) => { setGems((g) => g - it.price); setThanksInv((v) => [...v, it]); }} onPost={(p) => setPostits((v) => [...v, { ...p, id: Date.now() }])} onBack={backToWorld} bubble={bubble} />}
        {view === "heart" && <HeartView gems={gems} worries={worries} onPost={(text, cost) => { setGems((g) => g - cost); setWorries((w) => [{ id: Date.now(), text }, ...w]); }} onBack={backToWorld} bubble={bubble} />}
        {view === "listening" && <ListeningView onBack={backToWorld} gems={gems} onSpend={(n) => setGems((g) => g - n)} bubble={bubble} />}
        {view === "reels" && <ReelsView onBack={backToWorld} bubble={bubble} />}
        {view === "minigame" && <MiniGameRoom onBack={backToWorld} onReward={(n) => award(n)} bubble={bubble} />}
        {view === "pool" && <PoolView onBack={backToWorld} bubble={bubble} />}
        {view === "gym" && <GymView onBack={backToWorld} onWork={() => award(4)} bubble={bubble} />}
        {view === "smoke" && <SmokeView onBack={backToWorld} bubble={bubble} />}
        {view === "musinsa" && <MusinsaView gems={gems} outfit={outfit} owned={owned} onTryOn={tryOnClothing} onBuy={buyClothing} onBack={backToWorld} bubble={bubble} />}
        {view === "board" && <BoardView onBack={backToWorld} />}
        {view === "bank" && <BankView gems={gems} lifetime={lifetime} exchanged={exchanged} history={history} onExchange={doExchange} onBack={backToWorld} />}
        {view === "rent" && rentMeta && <RentView house={rentMeta} gems={gems} rented={!!rented[rentId]} onRent={() => { setGems((g) => g - rentMeta.rent); setRented((r) => ({ ...r, [rentId]: true })); }} onBack={backToWorld} />}
      </div>

      <div style={{ maxWidth: 960, margin: "14px auto 0", textAlign: "center", fontSize: 11, color: "rgba(42,30,20,0.65)" }}>
        프로토타입 데모 · 화폐/환전/렌트/통화·채팅은 모두 시뮬레이션(로컬)입니다. 새로고침 시 초기화됩니다.
      </div>

      {/* 항상 떠있는 UI: 채팅 / 메뉴 / 피드백 */}
      <ChatDock messages={chat} shout={shout} onToggleShout={() => setShout((s) => !s)} onSend={postChat} />
      <MenuButton onClick={() => setMenuOpen(true)} />
      <FeedbackButton />
      {menuOpen && <ProfileMenu onClose={() => setMenuOpen(false)} />}
    </div>
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
      @keyframes bubblePop { 0%{ transform: translateX(-50%) scale(.6); opacity:0;} 60%{ transform: translateX(-50%) scale(1.05);} 100%{ transform: translateX(-50%) scale(1); opacity:1;} }
      .chat-bubble { animation: bubblePop .2s ease-out; }
      .game-vp:focus, .game-vp:focus-visible { outline: none; }
      @media (prefers-reduced-motion: reduce) {
        .gem-pop,.hero-bob,.gem-spin,.enter-prompt,.chat-bubble,.px-btn,.map-obj { animation:none !important; transition:none !important; }
      }
    `}</style>
  );
}
