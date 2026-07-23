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
  { id: "alba", name: "초보자", icon: "🛠", color: "#7a8b99", colorDk: "#5c6b78",
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

function Hero({ facing = 1, moving = false, size = 34, outfit = null }) {
  const top = (outfit && outfit.top) ? outfit.top.color : C.bankRoof;
  const bottom = (outfit && outfit.bottom) ? outfit.bottom.color : C.woodDark;
  const shoes = (outfit && outfit.shoes) ? outfit.shoes.color : null;
  return (
    <div aria-hidden style={{ transform: `scaleX(${facing})` }}>
      <svg width={size} height={size * 1.24} viewBox="0 0 17 21" shapeRendering="crispEdges" className={moving ? "hero-bob" : ""}>
        <rect x="5" y="1" width="7" height="6" fill="#f4c9a0" stroke={C.ink} strokeWidth="0.6" />
        <rect x="4" y="0" width="9" height="3" fill={C.woodDark} />
        <rect x="6" y="4" width="1" height="1" fill={C.ink} />
        <rect x="10" y="4" width="1" height="1" fill={C.ink} />
        <rect x="4" y="7" width="9" height="8" fill={top} stroke={C.ink} strokeWidth="0.6" />
        <rect x="2" y="8" width="2" height="5" fill="#f4c9a0" />
        <rect x="13" y="8" width="2" height="5" fill="#f4c9a0" />
        <rect x="5" y="15" width="3" height="5" fill={bottom} />
        <rect x="9" y="15" width="3" height="5" fill={bottom} />
        {shoes && <rect x="4.5" y="19" width="3.5" height="2" fill={shoes} stroke={C.ink} strokeWidth="0.4" />}
        {shoes && <rect x="9" y="19" width="3.5" height="2" fill={shoes} stroke={C.ink} strokeWidth="0.4" />}
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
function RoomView({ title, icon, sub, bg, roomW = 640, roomH = 400, furniture, start, onBack, paused = false, children, headerBg = C.parch, banner = null, bubble = null, outfit = null }) {
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
                    <Hero facing={f.facing || 1} moving={false} size={f.spriteSize || 40} outfit={f.outfit} />
                  </div>
                  <span style={{ fontSize: 10, color: C.ink, marginTop: 2, fontWeight: "bold", background: C.parch, border: `2px solid ${C.ink}`, padding: "0 5px", whiteSpace: "nowrap" }}>{f.label}</span>
                </div>
              );
            }
            return (
              <div key={f.id} style={{ position: "absolute", left: f.x, top: f.y, width: f.w, height: f.h,
                background: f.color || "#c9a15f", border: `3px solid ${C.ink}`, borderRadius: f.round ? "50%" : 0,
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
            <Hero facing={facing} moving={moving} size={30} outfit={outfit} />
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
  list.push({ id: "project", kind: "small", x: 1120, y: 970, r: 60, label: "🗺 보스맵 도전기" });
  list.push({ id: "naverschool", kind: "small", x: 1800, y: 300, r: 70, label: "📗 네이버스쿨" });
  list.push({ id: "videoschool", kind: "small", x: 2030, y: 300, r: 70, label: "🎬 영상스쿨" });
  list.push({ id: "sandbag", kind: "small", x: 800, y: 360, r: 55, label: "🥊 샌드백", tint: "#c0563a" });
  list.push({ id: "musinsa", kind: "small", x: 1650, y: 1260, r: 55, label: "🛍️ 무신사", tint: "#2b2b2b" });
list.push({ id: "jjeop", kind: "small", x: 1820, y: 1210, r: 55, label: "🍴 쩝쩝박사", tint: "#c0563a" });
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
  list.push({ id: "guard", kind: "npc", npc: "guard", x: 2075, y: 745, r: 55, label: "🛂 검문소" });
  const rPos = [[2360, 800], [2510, 780], [2380, 1000], [2520, 1010]];
  RENT_HOUSES.forEach((h, i) => list.push({ id: h.id, kind: "rent", x: rPos[i][0], y: rPos[i][1], r: 60, label: h.name, meta: h }));
  return list;
}
const WORLD_OBJS = buildWorld();
const WORLD = { w: 2620, h: 1520 };
const RIVER_X = 2140, RIVER_W = 120;
const BRIDGE_Y1 = 690, BRIDGE_Y2 = 800;   // 이 구간(다리)에서만 강을 건널 수 있음
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
function BigMap({ pos, onClose }) {
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
                <div key={o.id} style={{ position: "absolute", left: pct(o.x, WORLD.w), top: pct(o.y, WORLD.h), transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 2 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.ink, border: "1px solid #fff" }} />
                  <span style={{ fontSize: 12, whiteSpace: "nowrap", background: "rgba(255,255,255,0.92)", border: `1px solid ${C.ink}`, padding: "1px 5px", marginTop: 2, fontWeight: "bold" }}>{o.label}</span>
                </div>
              ))}
              <div style={{ position: "absolute", left: pct(pos.x, WORLD.w), top: pct(pos.y, WORLD.h), transform: "translate(-50%,-50%)", width: 12, height: 12, borderRadius: "50%", background: "#fff", border: `3px solid ${C.danger}`, boxShadow: "0 0 6px #fff", zIndex: 5 }} />
            </div>
          </div>
          <div style={{ fontSize: 10, color: C.inkSoft, marginTop: 6, textAlign: "center" }}>흰 점 = 내 위치 · 점선 = 구역</div>
        </Panel>
      </div>
    </div>
  );
}
function MiniMap({ pos }) {
  const [open, setOpen] = useState(false);
  const W = 168, H = Math.round((W * WORLD.h) / WORLD.w);
  const sx = W / WORLD.w, sy = H / WORLD.h;
  return (
    <>
      <div onClick={() => setOpen(true)} title="클릭하면 전체 지도" style={{ position: "absolute", right: 10, bottom: 10, width: W, height: H, background: "rgba(20,28,18,0.85)", border: `2px solid ${C.ink}`, zIndex: 16, overflow: "hidden", cursor: "pointer" }}>
        <div style={{ position: "absolute", left: RIVER_X * sx, top: 0, width: Math.max(2, RIVER_W * sx), height: "100%", background: "#3a6ea5" }} />
        {MAP_ZONES.map((z) => (
          <div key={z.label} style={{ position: "absolute", left: z.x1 * sx, top: z.y1 * sy, width: (z.x2 - z.x1) * sx, height: (z.y2 - z.y1) * sy, background: z.color + "cc", border: "1px solid rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 8, color: "#fff", fontWeight: "bold", textShadow: "0 1px 1px rgba(0,0,0,0.6)", whiteSpace: "nowrap" }}>{z.label}</span>
          </div>
        ))}
        <div style={{ position: "absolute", left: pos.x * sx - 3, top: pos.y * sy - 3, width: 6, height: 6, borderRadius: "50%", background: "#fff", border: `2px solid ${C.danger}`, boxShadow: "0 0 4px #fff", zIndex: 2 }} />
        <div style={{ position: "absolute", right: 2, top: 1, fontSize: 9, color: "#fff", background: "rgba(0,0,0,0.4)", padding: "0 3px" }}>🔍</div>
      </div>
      {open && <BigMap pos={pos} onClose={() => setOpen(false)} />}
    </>
  );
}
function GuardGate({ onPass, onClose }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState(false);
  const [ok, setOk] = useState(false);
  const submit = () => {
    if (code.trim().toLowerCase() === "chiang") { setOk(true); onPass(); setTimeout(onClose, 1000); }
    else { setErr(true); setCode(""); }
  };
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40, padding: 14 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 320 }}>
        <Panel style={{ padding: 16 }}>
          <div style={{ fontSize: 40, textAlign: "center" }}>🛂</div>
          {ok ? (
            <div style={{ textAlign: "center", fontSize: 15, margin: "10px 0", color: C.good, fontWeight: "bold" }}>✅ 통과! 다리를 건너세요 🌉</div>
          ) : (
            <>
              <div style={{ fontSize: 14, textAlign: "center", margin: "8px 0" }}>치앙마이 통행코드를 입력하세요</div>
              <input value={code} onChange={(e) => { setCode(e.target.value); setErr(false); }} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} autoFocus placeholder="통행코드" style={{ width: "100%", boxSizing: "border-box", padding: 9, border: `3px solid ${err ? C.danger : C.ink}`, fontFamily: "'DotGothic16', monospace", fontSize: 14, background: C.white }} />
              {err && <div style={{ color: C.danger, fontSize: 12, marginTop: 6, textAlign: "center" }}>❌ 코드가 틀렸어요. 통과할 수 없습니다.</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <PxButton tone="ink" onClick={onClose} style={{ flex: 1, padding: 9, fontSize: 13 }}>돌아가기</PxButton>
                <PxButton tone="good" onClick={submit} style={{ flex: 1, padding: 9, fontSize: 13 }}>확인</PxButton>
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

function useMultiplayer(myName, posRef, facingRef, onChatRef) {
  const [others, setOthers] = useState({});
  const [count, setCount] = useState(1);
  const [status, setStatus] = useState("연결 중…");
  const chRef = useRef(null);

  useEffect(() => {
    if (!myName) return;
    let alive = true;
    let sendIv = null, pruneIv = null;
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
          if (onChatRef && onChatRef.current) onChatRef.current(payload);
          if (payload.id === MY_ID) return;
          const bid = Date.now() + Math.random();
          setOthers((o) => ({ ...o, [payload.id]: { ...(o[payload.id] || { id: payload.id, name: payload.name, x: 0, y: 0 }), bubble: payload.text, bubbleId: bid, ts: Date.now() } }));
          setTimeout(() => setOthers((o) => (o[payload.id] && o[payload.id].bubbleId === bid ? { ...o, [payload.id]: { ...o[payload.id], bubble: null } } : o)), 3600);
        });
        ch.on("broadcast", { event: "bye" }, ({ payload }) => {
          if (!payload) return;
          setOthers((o) => { const n = { ...o }; delete n[payload.id]; return n; });
        });

        await ch.subscribe(async (st) => {
          if (!alive) return;
          if (st === "SUBSCRIBED") {
            setStatus("접속됨");
            await ch.track({ name: myName });
            sendIv = setInterval(() => {
              const p = posRef.current || { x: 0, y: 0 };
              ch.send({ type: "broadcast", event: "pos", payload: { id: MY_ID, name: myName, x: Math.round(p.x), y: Math.round(p.y), f: facingRef.current || 1, mv: !!(facingRef.movingRef && facingRef.movingRef.current) } });
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
        setStatus("연결 실패");
      }
    })();

    return () => {
      alive = false;
      if (sendIv) clearInterval(sendIv);
      if (pruneIv) clearInterval(pruneIv);
      const ch = chRef.current;
      if (ch) { try { ch.send({ type: "broadcast", event: "bye", payload: { id: MY_ID } }); ch.unsubscribe(); } catch (e) {} }
    };
  }, [myName]);

  const sendChat = useCallback((text, shout) => {
    const ch = chRef.current;
    if (!ch || !text) return;
    try { ch.send({ type: "broadcast", event: "chat", payload: { id: MY_ID, name: myName, text, shout: !!shout } }); } catch (e) {}
  }, [myName]);

  return { others, count, status, sendChat };
}

function WorldView({ pos, setPos, day, gems, rentedHouses, onEnter, onNextDay, bgm, onToggleBgm, onRequestSong, bubble, townRain = false, cmRain = false, tracks = [], onSelectTrack, outfit = null, vehicle = null, houseSkin = null, isMyHouse = () => false, others = {}, netCount = 1, netStatus = "", facingRef = null }) {
  const [songOpen, setSongOpen] = useState(false);
  const vehicleRef = useRef(vehicle);
  vehicleRef.current = vehicle;
  const [facing, setFacing] = useState(1);
  const [moving, setMoving] = useState(false);
  const [near, setNear] = useState(null);
  const [dialog, setDialog] = useState(null);   // NPC 대화 {label,lines,shown}
  const [guardOpen, setGuardOpen] = useState(false);
  const passRef = useRef(false);  // NPC 대화 {label,lines,shown}
  const [hint, setHint] = useState(true);        // "클릭하면 이동" 안내
  const [danceMove, setDanceMove] = useState(null);
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
  const handleObj = (o) => { if (!o) return; if (o.kind === "npc") { if (o.npc === "guard") setGuardOpen(true); else startDialog(o); } else onEnter(o); };
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
    const loop = () => {
      const SPEED = 4.2 * (vehicleRef.current ? vehicleRef.current.speed : 1);
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
    if (o.id === "project") return <Board size={110} />;
    if (o.id === "sandbag") return <Sandbag size={92} />;
    if (o.id === "naverschool") return <School wall="#bfe3c8" roof="#2db400" size={140} />;
    if (o.id === "videoschool") return <School wall="#e7cfe9" roof="#8e5a9e" size={140} />;
    switch (o.kind) {
      case "center": return <Villa size={230} />;
      case "bank": return <PixelBank size={150} />;
      case "board": return <Board size={120} />;
      case "big": return <BigBuilding color={o.meta.color} colorDk={o.meta.colorDk} size={150} />;
      case "house": { const mine = isMyHouse(o.meta.name); const sk = mine && houseSkin; return <PixelHouse roof={sk ? sk.roof : o.meta.roof} roofDk={sk ? sk.roof : o.meta.roofDk} wall={sk ? sk.wall : o.meta.wall} size={110} />; }
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

          {/* 비 효과 (마을 / 치앙마이 각각) */}
          {townRain && <div className="rain-layer" style={{ position: "absolute", left: 0, top: 0, width: RIVER_X, height: WORLD.h, pointerEvents: "none", zIndex: 15 }} />}
          {cmRain && <div className="rain-layer" style={{ position: "absolute", left: RIVER_X, top: 0, width: WORLD.w - RIVER_X, height: WORLD.h, pointerEvents: "none", zIndex: 15 }} />}

          {/* 다른 접속자 */}
          {Object.values(others).map((o) => (
            <div key={o.id} style={{ position: "absolute", left: o.x, top: o.y, transform: "translate(-50%,-100%)", zIndex: 17, opacity: 0.95, transition: "left .18s linear, top .18s linear" }}>
              {o.bubble && (
                <div className="chat-bubble" style={{ position: "absolute", bottom: "150%", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", background: C.white, color: C.ink, border: `2px solid ${C.ink}`, borderRadius: 8, fontSize: 12, padding: "4px 8px", boxShadow: `0 2px 0 ${C.parchEdge}` }}>{o.bubble}</div>
              )}
              <div style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 3, whiteSpace: "nowrap", background: "#5b8def", color: "#fff", border: `2px solid ${C.ink}`, fontSize: 10, padding: "1px 6px" }}>{o.name}</div>
              <Hero facing={o.f || 1} moving={o.mv ? true : false} size={34} />
            </div>
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
            <div className={danceMove ? "dance-" + danceMove : ""} style={{ transformOrigin: "bottom center" }}>
              <Hero facing={facing} moving={moving} size={36} outfit={outfit} />
              {vehicle && <div style={{ position: "absolute", left: "50%", bottom: -6, transform: "translateX(-50%)", fontSize: 20 }}>{vehicle.emoji}</div>}
            </div>
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
          <span style={{ background: netStatus === "접속됨" ? "#2f9e6e" : C.ink, color: C.white, fontSize: 12, padding: "5px 9px", border: `2px solid ${C.gem}` }} title={netStatus}>👥 {netCount}</span>
          <span style={{ background: C.ink, color: C.white, fontSize: 12, padding: "5px 9px", border: `2px solid ${C.gem}` }}>📅 DAY {day}</span>
          <PxButton tone="blue" onClick={onNextDay} style={{ fontSize: 11, padding: "6px 9px" }}>🌙 다음 날</PxButton>
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

        <MiniMap pos={pos} />

        {guardOpen && <GuardGate onPass={() => { passRef.current = true; }} onClose={() => setGuardOpen(false)} />}

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
  const [text, setText] = useState("");
  const replies = ["네 확인했어요!", "그건 이렇게 진행하면 돼요 👍", "잠시만요, 알아볼게요", "오케이 바로 처리할게요", "좋은 질문이에요!", "그 건은 내일까지 부탁해요 🙏"];
  const send = () => { const t = text.trim(); if (!t) return; setMsgs((m) => [...m, { me: true, text: t }]); setText(""); setTimeout(() => setMsgs((m) => [...m, { me: false, text: replies[Math.floor(Math.random() * replies.length)] }]), 700); };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 90, padding: 14 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 380 }}>
        <Panel style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "#7a8b99", color: C.white, borderBottom: `3px solid ${C.ink}` }}>
            <span style={{ fontSize: 20 }}>🧑‍💼</span><b style={{ flex: 1 }}>담당자 {name}</b>
            <PxButton tone="ink" onClick={onClose} style={{ fontSize: 11, padding: "5px 9px" }}>✕</PxButton>
          </div>
          <div style={{ height: 240, overflow: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 6, background: "#efe6d2" }}>
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
function HomeView({ house, memo, onSaveMemo, onBack, bubble, skin = null, extras = [] }) {
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
            <span style={{ color: C.inkSoft }}>익명으로 남겨요. 아무도 누군지 몰라요.</span><GemBadge amount={gems} />
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {[0.5, 1].map((v) => (
              <PxButton key={v} tone={cost === v ? "gold" : "wood"} onClick={() => setCost(v)} style={{ fontSize: 12, padding: "6px 10px" }}>⭐ {v} 넣기</PxButton>
            ))}
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={isConfess ? "고백할 것을 털어놓아 보세요…" : "서운했던 일을 남겨보세요…"}
            style={{ width: "100%", boxSizing: "border-box", height: 100, padding: 10, border: `3px solid ${C.ink}`, fontFamily: "'DotGothic16', monospace", fontSize: 13, background: "#fffdf5", resize: "none" }} />
          <PxButton tone="good" disabled={!text.trim() || gems < cost} onClick={() => { onPost(text.trim(), cost, open); setText(""); }} style={{ width: "100%", marginTop: 8, padding: 10, fontSize: 13 }}>
            {gems < cost ? "젬이 부족해요" : `⭐ ${cost} 내고 익명으로 넣기`}
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

function LiarGame({ onClose, onReward, myName = "" }) {
  const [phase, setPhase] = useState("lobby");
  const [cat, setCat] = useState("랜덤");
  const [size, setSize] = useState(5);
  const [players, setPlayers] = useState([{ name: myName || "나", avatar: "🧑‍💻" }]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invited, setInvited] = useState({});
  const [toast, setToast] = useState(null);
  const [word, setWord] = useState("");
  const [usedCat, setUsedCat] = useState("");
  const [liarIdx, setLiarIdx] = useState(0);
  const [turnIdx, setTurnIdx] = useState(-1);
  const [bubbles, setBubbles] = useState({});
  const [log, setLog] = useState([]);
  const [text, setText] = useState("");
  const [votes, setVotes] = useState(null);
  const [guess, setGuess] = useState("");
  const [outcome, setOutcome] = useState(null);
  const timers = useRef([]);
  const logEnd = useRef(null);
  const iAmLiar = liarIdx === 0;
  const myTurn = phase === "round" && turnIdx === 0;

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => { if (logEnd.current) logEnd.current.scrollIntoView({ behavior: "smooth" }); }, [log]);

  const say = (idx, txt, kind) => {
    const id = Date.now() + Math.random();
    setBubbles((b) => ({ ...b, [idx]: { text: txt, id } }));
    setLog((l) => [...l.slice(-40), { who: players[idx] ? players[idx].name : "?", text: txt, kind }]);
    const t = setTimeout(() => setBubbles((b) => (b[idx] && b[idx].id === id ? { ...b, [idx]: null } : b)), 4200);
    timers.current.push(t);
  };
  const showToast = (m) => { setToast(m); const t = setTimeout(() => setToast(null), 1600); timers.current.push(t); };

  useEffect(() => {
    if (phase !== "round") return;
    if (turnIdx <= 0 || turnIdx >= players.length) {
      if (turnIdx >= players.length && players.length > 1) { const t = setTimeout(() => setPhase("vote"), 900); timers.current.push(t); }
      return;
    }
    const t = setTimeout(() => {
      say(turnIdx, LIAR_LINES[Math.floor(Math.random() * LIAR_LINES.length)], "turn");
      setTurnIdx((v) => v + 1);
    }, 1500);
    timers.current.push(t);
    return () => clearTimeout(t);
  }, [phase, turnIdx, players.length]);

  useEffect(() => {
    if (phase !== "round" && phase !== "vote") return;
    const iv = setInterval(() => {
      if (players.length < 2) return;
      const i = 1 + Math.floor(Math.random() * (players.length - 1));
      say(i, LIAR_CHAT[Math.floor(Math.random() * LIAR_CHAT.length)], "chat");
    }, 5200);
    return () => clearInterval(iv);
  }, [phase, players.length]);

  const invite = (p) => {
    if (players.length >= size) { showToast("자리가 가득 찼어요"); return; }
    if (invited[p.name]) return;
    setInvited((v) => ({ ...v, [p.name]: "sent" }));
    showToast(`📨 ${p.name}님에게 초대장을 보냈어요`);
    const t = setTimeout(() => {
      setInvited((v) => ({ ...v, [p.name]: "joined" }));
      setPlayers((ps) => (ps.length < size && !ps.find((x) => x.name === p.name) ? [...ps, { name: p.name, avatar: p.avatar }] : ps));
      showToast(`✅ ${p.name}님이 입장했어요!`);
    }, 1300);
    timers.current.push(t);
  };

  const start = () => {
    const cats = Object.keys(LIAR_TOPICS);
    const useCat = cat === "랜덤" ? cats[Math.floor(Math.random() * cats.length)] : cat;
    const list = LIAR_TOPICS[useCat];
    setUsedCat(useCat);
    setWord(list[Math.floor(Math.random() * list.length)]);
    setLiarIdx(Math.floor(Math.random() * players.length));
    setBubbles({}); setLog([]); setVotes(null); setGuess(""); setOutcome(null); setTurnIdx(-1);
    setPhase("reveal");
  };

  const sendChat = () => {
    const t = text.trim(); if (!t) return;
    say(0, t, myTurn ? "turn" : "chat");
    setText("");
    if (myTurn) setTurnIdx(1);
  };

  const doVote = (targetIdx) => {
    const tally = { [targetIdx]: 1 };
    for (let i = 1; i < players.length; i++) {
      let v = Math.floor(Math.random() * players.length);
      if (i === liarIdx && v === liarIdx) v = (v + 1) % players.length;
      tally[v] = (tally[v] || 0) + 1;
    }
    let top = 0, best = -1;
    Object.entries(tally).forEach(([k, n]) => { if (n > best) { best = n; top = Number(k); } });
    setVotes({ tally, top });
    if (top === liarIdx) {
      if (iAmLiar) setPhase("guess");
      else { setOutcome("win"); onReward && onReward(8); setPhase("result"); }
    } else {
      setOutcome(iAmLiar ? "liarwin" : "lose");
      if (iAmLiar) onReward && onReward(10);
      setPhase("result");
    }
  };
  const submitGuess = () => {
    const ok = guess.trim() === word;
    setOutcome(ok ? "liarwin" : "lose");
    if (ok) onReward && onReward(12);
    setPhase("result");
  };

  const seatPos = (i, n) => {
    const ang = (Math.PI / 2) + (i * 2 * Math.PI) / n;
    return { left: `${50 + 38 * Math.cos(ang)}%`, top: `${50 + 33 * Math.sin(ang)}%` };
  };

  const Table = () => (
    <div style={{ position: "relative", width: "100%", height: 230, background: "#2f2440", border: `3px solid ${C.ink}`, overflow: "visible", marginBottom: 8 }}>
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "44%", height: "42%", borderRadius: "50%", background: "#4a3a63", border: `3px solid ${C.ink}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 9, color: "#cfc0e8" }}>카테고리</span>
        <b style={{ fontSize: 12, color: C.white }}>{usedCat || "-"}</b>
      </div>
      {players.map((p, i) => {
        const pos = seatPos(i, players.length);
        const active = phase === "round" && turnIdx === i;
        const b = bubbles[i];
        return (
          <div key={i} style={{ position: "absolute", ...pos, transform: "translate(-50%,-50%)", textAlign: "center", zIndex: b ? 5 : 2 }}>
            {b && (
              <div className="chat-bubble" style={{ position: "absolute", bottom: "108%", left: "50%", transform: "translateX(-50%)", background: C.white, border: `2px solid ${C.ink}`, borderRadius: 8, padding: "3px 7px", fontSize: 11, whiteSpace: "nowrap", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis" }}>{b.text}</div>
            )}
            <div style={{ fontSize: 26, filter: active ? "drop-shadow(0 0 6px #ffe680)" : "none" }}>{p.avatar}</div>
            <div style={{ fontSize: 9, color: C.white, background: active ? "#a86e13" : "rgba(0,0,0,0.55)", border: `1px solid ${C.ink}`, padding: "0 4px", whiteSpace: "nowrap" }}>{p.name}</div>
          </div>
        );
      })}
    </div>
  );

  return (
    <RoomModal title="🕵️ 라이어 게임" onClose={onClose} maxW={440}>
      {toast && <div style={{ position: "absolute", left: "50%", top: 8, transform: "translateX(-50%)", background: C.ink, color: C.white, border: `2px solid ${C.gem}`, padding: "5px 12px", fontSize: 12, zIndex: 50 }}>{toast}</div>}

      {phase === "lobby" && (
        <div>
          <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 10 }}>방을 만들고 주민들을 초대해요. 라이어 한 명만 제시어를 몰라요!</div>
          <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 5 }}>카테고리</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
            {["랜덤", ...Object.keys(LIAR_TOPICS)].map((c) => (
              <PxButton key={c} tone={cat === c ? "good" : "wood"} onClick={() => setCat(c)} style={{ fontSize: 11, padding: "5px 9px" }}>{c === "랜덤" ? "🎲 랜덤" : c}</PxButton>
            ))}
          </div>
          <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 5 }}>인원</div>
          <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
            {[4, 5, 6, 7].map((n) => (
              <PxButton key={n} tone={size === n ? "gold" : "wood"} onClick={() => setSize(n)} style={{ fontSize: 12, padding: "6px 12px" }}>{n}명</PxButton>
            ))}
          </div>
          <PxButton tone="good" onClick={() => { setPlayers([{ name: myName || "나", avatar: "🧑‍💻" }]); setInvited({}); setPhase("wait"); }} style={{ width: "100%", padding: 11, fontSize: 14 }}>🚪 방 만들기</PxButton>
        </div>
      )}

      {phase === "wait" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <b style={{ fontSize: 13 }}>대기실 · {cat === "랜덤" ? "🎲 랜덤" : cat}</b>
            <span style={{ fontSize: 11, color: C.inkSoft }}>{players.length}/{size}명</span>
          </div>
          <Table />
          <div style={{ display: "flex", gap: 6 }}>
            <PxButton tone="wood" onClick={() => setInviteOpen(true)} disabled={players.length >= size} style={{ flex: 1, padding: 9, fontSize: 12 }}>📨 초대하기</PxButton>
            <PxButton tone="good" onClick={start} disabled={players.length < 4} style={{ flex: 1, padding: 9, fontSize: 12 }}>▶ 게임 시작 ({players.length}/4~)</PxButton>
          </div>
          {inviteOpen && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 95, padding: 14 }} onClick={() => setInviteOpen(false)}>
              <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 340 }}>
                <Panel style={{ padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <b style={{ fontSize: 13 }}>🏘️ 마을 주민 초대</b>
                    <PxButton tone="ink" onClick={() => setInviteOpen(false)} style={{ fontSize: 11, padding: "4px 8px" }}>✕</PxButton>
                  </div>
                  <div style={{ maxHeight: 260, overflow: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                    {PROFILES.map((p) => {
                      const st = invited[p.name];
                      return (
                        <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 8, background: C.white, border: `2px solid ${C.ink}`, padding: "6px 8px" }}>
                          <span style={{ fontSize: 22 }}>{p.avatar}</span>
                          <span style={{ flex: 1, fontSize: 12 }}><b>{p.name}</b><br /><span style={{ fontSize: 10, color: C.inkSoft }}>{p.job}</span></span>
                          <PxButton tone={st === "joined" ? "good" : st === "sent" ? "ink" : "blue"} disabled={!!st} onClick={() => invite(p)} style={{ fontSize: 10, padding: "5px 8px" }}>{st === "joined" ? "참가중 ✓" : st === "sent" ? "발송됨…" : "초대장"}</PxButton>
                        </div>
                      );
                    })}
                  </div>
                </Panel>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === "reveal" && (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, color: C.inkSoft, marginBottom: 6 }}>카테고리 · {usedCat}</div>
          <div style={{ background: iAmLiar ? "#c0563a" : C.white, color: iAmLiar ? C.white : C.ink, border: `4px solid ${C.ink}`, padding: "22px 12px", marginBottom: 12 }}>
            {iAmLiar ? (
              <>
                <div style={{ fontSize: 34 }}>🤫</div>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, marginTop: 8 }}>당신은 라이어!</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>제시어를 모르는 척 티 안 나게 말해보세요</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 11, color: C.inkSoft }}>제시어</div>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, margin: "10px 0" }}>{word}</div>
                <div style={{ fontSize: 12, color: C.inkSoft }}>라이어가 눈치채지 못하게 설명하세요</div>
              </>
            )}
          </div>
          <PxButton tone="good" onClick={() => { setPhase("round"); setTurnIdx(0); }} style={{ width: "100%", padding: 10, fontSize: 13 }}>확인했어요 ▶</PxButton>
        </div>
      )}

      {(phase === "round" || phase === "vote") && (
        <div>
          <Table />
          {phase === "round" && (
            <div style={{ fontSize: 12, textAlign: "center", marginBottom: 6, color: myTurn ? C.danger : C.inkSoft, fontWeight: myTurn ? "bold" : "normal" }}>
              {myTurn ? "🎤 내 차례! 설명을 입력하세요" : `${players[Math.min(turnIdx, players.length - 1)] ? players[Math.min(turnIdx, players.length - 1)].name : ""} 님이 말하는 중...`}
            </div>
          )}
          <div style={{ height: 92, overflow: "auto", background: "#efe6d2", border: `2px solid ${C.ink}`, padding: 6, marginBottom: 6, display: "flex", flexDirection: "column", gap: 3 }}>
            {log.map((l, i) => (
              <div key={i} style={{ fontSize: 11 }}>
                <b style={{ color: l.kind === "turn" ? "#a86e13" : "#5b8def" }}>{l.who}</b> {l.kind === "turn" ? "🎤" : "💬"} {l.text}
              </div>
            ))}
            <div ref={logEnd} />
          </div>
          <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendChat(); }} placeholder={myTurn ? "제시어 설명 (내 차례)" : "자유 채팅…"} style={{ flex: 1, minWidth: 0, padding: 7, border: `2px solid ${C.ink}`, fontFamily: "'DotGothic16', monospace", fontSize: 12, background: C.white }} />
            <PxButton tone={myTurn ? "gold" : "good"} onClick={sendChat} style={{ fontSize: 12, padding: "7px 11px" }}>{myTurn ? "🎤 설명" : "전송"}</PxButton>
          </div>
          {phase === "vote" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 6 }}>🗳 누가 라이어일까요?</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {players.map((p, i) => i !== 0 && (
                  <PxButton key={i} tone="wood" onClick={() => doVote(i)} style={{ padding: 9, fontSize: 12 }}>{p.avatar} {p.name}</PxButton>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {phase === "guess" && (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 34 }}>😱</div>
          <div style={{ fontSize: 14, margin: "8px 0" }}>들켰어요! 마지막 기회 — 제시어를 맞히면 역전승!</div>
          <input value={guess} onChange={(e) => setGuess(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submitGuess(); }} placeholder="제시어는?" style={{ width: "100%", boxSizing: "border-box", padding: 9, border: `3px solid ${C.ink}`, fontFamily: "'DotGothic16', monospace", fontSize: 14, background: C.white }} />
          <PxButton tone="gold" onClick={submitGuess} style={{ width: "100%", marginTop: 10, padding: 10, fontSize: 13 }}>정답 제출</PxButton>
        </div>
      )}

      {phase === "result" && (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40 }}>{outcome === "win" ? "🎉" : outcome === "liarwin" ? "🕵️" : "😵"}</div>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, margin: "8px 0" }}>
            {outcome === "win" ? "라이어 검거 성공!" : outcome === "liarwin" ? "라이어 승리!" : "라이어가 도망쳤다..."}
          </div>
          <div style={{ fontSize: 13, marginBottom: 6 }}>라이어는 <b style={{ color: C.danger }}>{players[liarIdx] ? players[liarIdx].name : "?"}</b> 였어요</div>
          <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 10 }}>제시어 · {word} ({usedCat})</div>
          {outcome === "win" && <div style={{ fontSize: 13, color: C.good, marginBottom: 10 }}>+8 ⭐ 획득!</div>}
          {outcome === "liarwin" && <div style={{ fontSize: 13, color: C.good, marginBottom: 10 }}>⭐ 획득!</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <PxButton tone="ink" onClick={onClose} style={{ flex: 1, padding: 10, fontSize: 13 }}>나가기</PxButton>
            <PxButton tone="good" onClick={() => setPhase("lobby")} style={{ flex: 1, padding: 10, fontSize: 13 }}>🔄 다시</PxButton>
          </div>
        </div>
      )}
    </RoomModal>
  );
}
function MiniGameRoom({ onBack, onReward, bubble, myName = "" }) {
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
      {game === "liar" && <LiarGame onClose={() => setGame(null)} onReward={onReward} myName={myName} />}
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
                <div style={{ fontSize: 16, fontWeight: "bold", marginBottom: 6 }}>{result.win ? "🥇 1등! +10⭐" : `${result.place}등 · 아쉽다!`} ({result.time}초)</div>
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
    { date: "8/3 (일) 15:00", title: "자유형 50m 오픈전", note: "누구나 참가 가능 · 우승 50⭐" },
    { date: "8/10 (일) 15:00", title: "에코타운 수영 챔피언십", note: "예선 통과자 본선 진출" },
    { date: "8/17 (일) 15:00", title: "릴레이 단체전", note: "4인 1팀 · 팀 우승 100⭐" },
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
function JjeopView({ onBack, bubble, onReward }) {
  const [modal, setModal] = useState(null);
  const [today, setToday] = useState(null);
  const [recList, setRecList] = useState([{ nick: "정인", text: "저 오늘 국밥 땡겨요...🍚" }, { nick: "도희", text: "마라탕 각인데?" }]);
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
    setRecList((v) => [...v, { nick: recNick.trim() || "익명", text: recText.trim() }]);
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
                <div style={{ fontSize: 13, marginBottom: 8 }}>점심술사가 추천해준 화면 캡처랑, 실제로 먹은 인증샷을 보내봐~ 확인되면 젬을 줄게 ⭐</div>
                <input ref={fileRef} type="file" accept="image/*" onChange={pickProof} style={{ display: "none" }} />
                {proofImg && <img src={proofImg} alt="인증샷" style={{ width: "100%", maxHeight: 160, objectFit: "contain", border: `2px solid ${C.ink}`, marginBottom: 8, background: "#eee" }} />}
                <div style={{ display: "flex", gap: 6 }}>
                  <PxButton tone="wood" onClick={() => fileRef.current && fileRef.current.click()} style={{ flex: 1, padding: 9, fontSize: 12 }}>📎 사진 업로드</PxButton>
                  <PxButton tone="good" disabled={!proofImg || proofDone} onClick={submitProof} style={{ flex: 1, padding: 9, fontSize: 12 }}>{proofDone ? "받음 ✓" : "제출하고 젬 받기"}</PxButton>
                </div>
                {proofDone && <div style={{ fontSize: 12, color: C.good, marginTop: 8, fontWeight: "bold" }}>맛있게 먹었네! ⭐5 지급 완료 ♥</div>}
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
    const onKey = (e) => { if ((e.code === "Space" || e.key === " ") && !ending) { e.preventDefault(); hit(); } };
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
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 320 }}>
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
  const endRef = useRef(null);
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
  useEffect(() => { if (endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ fontSize: 11, fontWeight: "bold", marginBottom: 6 }}>🤖 어시스턴트</div>
      <div style={{ flex: 1, minHeight: 150, maxHeight: 220, overflow: "auto", background: "#eef0fb", border: `2px solid ${C.ink}`, padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ alignSelf: m.me ? "flex-end" : "flex-start", background: m.me ? C.gem : C.white, border: `2px solid ${C.ink}`, padding: "5px 8px", fontSize: 12, maxWidth: "88%", whiteSpace: "pre-wrap" }}>{m.text}</div>
        ))}
        <div ref={endRef} />
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
function SchoolView({ school, onBack }) {
  const s = SCHOOLS[school];
  const MAP_W = 640, MAP_H = 420;
  const [pos, setPos] = useState({ x: MAP_W / 2, y: MAP_H - 50 });
  const [facing, setFacing] = useState(1);
  const [moving, setMoving] = useState(false);
  const [near, setNear] = useState(null);
  const [open, setOpen] = useState(null);
  const [cleared, setCleared] = useState({});
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

  useEffect(() => {
    let raf;
    const SPEED = 3.4;
    const loop = () => {
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
          setMoving(true);
          if (dx) { setFacing(dx > 0 ? 1 : -1); if (facingRef) facingRef.current = dx > 0 ? 1 : -1; }
        } else setMoving(false);
        let found = null;
        for (const h of housesRef.current) {
          if (Math.hypot(h.x - posRef.current.x, (h.y + 30) - posRef.current.y) < 70) { found = h.id; break; }
        }
        if (found !== nearRef.current) { nearRef.current = found; setNear(found); }
      }
      raf = requestAnimationFrame(loop);
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
                    <PxButton tone="good" disabled={!!cleared[open.id]} onClick={() => { setCleared((c) => ({ ...c, [open.id]: true })); setOpen(null); }} style={{ flex: 1, padding: 9, fontSize: 13 }}>{cleared[open.id] ? "완료됨" : "✅ 완료"}</PxButton>
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
    id: "bm1", name: "어플", icon: "📱", color: "#2f9e6e", soft: "#e6f4ec", deep: "#1d6b4a",
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
    id: "bm2", name: "속옷", icon: "🩲", color: "#2e9bc4", soft: "#e4f3fa", deep: "#1d6c8c",
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
    id: "bm3", name: "양말", icon: "🧦", color: "#8a5cc4", soft: "#efe7f8", deep: "#5e3a8c",
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
];

function BossMapView({ onBack, onReward, onGoSchool }) {
  const [maps, setMaps] = useState(BOSS_MAPS_INIT);
  const [mapIdx, setMapIdx] = useState(0);
  const [collOpen, setCollOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addTab, setAddTab] = useState("quest");
  const [fQ, setFQ] = useState({ stage: 1, title: "", icon: "🎯", gem: 5, desc: "", task: "", level: "초보자", field: "naverschool" });
  const [fM, setFM] = useState({ name: "", icon: "🗺", boss: "", bossIcon: "👹" });
  const [cleared, setCleared] = useState({});
  const [sel, setSel] = useState(null);
  const [warn, setWarn] = useState(null);
  const [pos, setPos] = useState({ x: 300, y: 90 });
  const [facing, setFacing] = useState(1);
  const [moving, setMoving] = useState(false);
  const [near, setNear] = useState(null);
  const [cam, setCam] = useState(0);
  const keys = useRef({});
  const posRef = useRef({ x: 300, y: 90 });
  const nearRef = useRef(null);
  const openRef = useRef(false);
  const nodesRef = useRef([]);
  const VIEW_H = 440, MAP_W = 600, STAGE_H = 330, BOSS_H = 300;

  const map = maps[mapIdx];
  const MAP_H = map.stages.length * STAGE_H + BOSS_H;
  const done = cleared[map.id] || {};

  const nodes = [];
  map.stages.forEach((st, si) => {
    const baseY = BOSS_H + (map.stages.length - 1 - si) * STAGE_H;
    st.quests.forEach((q, qi) => {
      const col = qi % 3, row = Math.floor(qi / 3);
      nodes.push({ ...q, stage: st.n, stageName: st.name, x: 110 + col * 190, y: baseY + 130 + row * 120 });
    });
  });
  nodes.push({ ...map.boss, stage: map.stages.length, stageName: "보스", isBoss: true, x: MAP_W / 2, y: 150 });
  nodesRef.current = nodes;

  const stageDone = (n) => map.stages.filter((s) => s.n <= n).every((s) => s.quests.every((q) => done[q.id]));
  const stageOpen = (n) => n === 1 || stageDone(n - 1);
  const lockReason = (nd) => {
    if (!stageOpen(nd.stage)) return `${nd.stage - 1}스테이지를 먼저 클리어해야 합니다`;
    if (nd.isBoss && !stageDone(map.stages.length)) return "모든 스테이지를 완료해야 보스에 도전할 수 있습니다";
    if (nd.need && !done[nd.need]) {
      const pq = nodes.find((x) => x.id === nd.need);
      return `「${pq ? pq.title : nd.need}」 완료해야 진행할 수 있습니다`;
    }
    return null;
  };
  const clear = (nd) => {
    const r = lockReason(nd);
    if (r) { setWarn(r); setTimeout(() => setWarn(null), 2000); return; }
    if (done[nd.id]) return;
    setCleared((c) => ({ ...c, [map.id]: { ...(c[map.id] || {}), [nd.id]: true } }));
    onReward && onReward(nd.gem);
    setSel(null);
  };

  useEffect(() => { openRef.current = !!sel; }, [sel]);
  useEffect(() => {
    const down = (e) => {
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
    const loop = () => {
      if (!openRef.current) {
        const k = keys.current; let { x, y } = posRef.current; let dx = 0, dy = 0;
        if (k["arrowleft"] || k["a"]) dx -= 1;
        if (k["arrowright"] || k["d"]) dx += 1;
        if (k["arrowup"] || k["w"]) dy -= 1;
        if (k["arrowdown"] || k["s"]) dy += 1;
        if (dx || dy) {
          const len = Math.hypot(dx, dy) || 1;
          x = Math.max(30, Math.min(MAP_W - 30, x + (dx / len) * 4.2));
          y = Math.max(40, Math.min(MAP_H - 30, y + (dy / len) * 4.2));
          posRef.current = { x, y }; setPos({ x, y }); setMoving(true);
          if (dx) setFacing(dx > 0 ? 1 : -1);
        } else setMoving(false);
        let f = null;
        for (const nd of nodesRef.current) if (Math.hypot(nd.x - posRef.current.x, nd.y - posRef.current.y) < 52) { f = nd.id; break; }
        if (f !== nearRef.current) { nearRef.current = f; setNear(f); }
        setCam(Math.max(0, Math.min(MAP_H - VIEW_H, posRef.current.y - VIEW_H / 2)));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [MAP_H]);

  useEffect(() => {
    const y = MAP_H - 70;
    posRef.current = { x: 300, y };
    setPos({ x: 300, y });
    setCam(Math.max(0, MAP_H - VIEW_H));
  }, [mapIdx, MAP_H]);
  const switchMap = (i) => { setMapIdx(i); setSel(null); };
  const addQuest = () => {
    if (!fQ.title.trim()) return;
    const id = "cq" + Date.now();
    const nq = { id, title: fQ.title.trim(), icon: fQ.icon || "🎯", gem: Number(fQ.gem) || 5, desc: fQ.desc.trim() || "새로 추가된 퀘스트", task: fQ.task.trim() || fQ.title.trim(), level: fQ.level, field: fQ.level === "초보자" ? fQ.field : null };
    setMaps((ms) => ms.map((m, i) => {
      if (i !== mapIdx) return m;
      const stages = m.stages.map((st) => (st.n !== Number(fQ.stage) ? st : { ...st, quests: [...st.quests, nq] }));
      return { ...m, stages };
    }));
    setFQ({ ...fQ, title: "", desc: "", task: "" });
    setAddOpen(false);
  };
  const addMap = () => {
    if (!fM.name.trim()) return;
    const id = "cm" + Date.now();
    setMaps((ms) => [...ms, {
      id, name: fM.name.trim(), icon: fM.icon || "🗺", color: "#c07a2f", soft: "#f7ecdc", deep: "#8c5418",
      boss: { id: id + "_b", title: fM.boss.trim() || "이름 없는 보스", icon: fM.bossIcon || "👹", gem: 30, desc: "새로 등장한 보스.", task: "모든 스테이지를 클리어하고 격파" },
      stages: [{ n: 1, name: "1 스테이지", deco: "✨", quests: [] }],
    }]);
    setFM({ name: "", icon: "🗺", boss: "", bossIcon: "👹" });
    setAddOpen(false);
    setMapIdx(maps.length);
  };
  const bossState = (m) => (cleared[m.id] && cleared[m.id][m.boss.id]) ? "done" : "now";
  const totalQ = nodes.length;
  const doneQ = nodes.filter((n) => done[n.id]).length;

  return (
    <Panel style={{ padding: 0, overflow: "hidden" }}>
      <TitleBar icon="🗺" title="보스맵 도전기" sub="WASD로 이동 · 아래에서 위로 진행 · 퀘스트 앞에서 E" onBack={onBack} bg="#241c33" fg={C.white} />
      <div style={{ padding: 14, background: "linear-gradient(180deg,#f6f2e8,#eae3d4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, background: C.white, border: `2px solid ${C.ink}`, borderRadius: 10, padding: "8px 12px", boxShadow: "0 2px 0 rgba(0,0,0,0.15)" }}>
          <button onClick={() => setCollOpen(true)} title="보스 도감" style={{ cursor: "pointer", border: `2px solid ${C.ink}`, borderRadius: 8, background: "linear-gradient(180deg,#6b4f8f,#3f2c5c)", color: C.white, fontSize: 16, padding: "4px 8px" }}>👾</button>
          <span style={{ fontSize: 20 }}>{map.icon}</span>
          <b style={{ fontSize: 14, flex: 1 }}>{map.name}</b>
          <button onClick={() => setAddOpen(true)} title="퀘스트/보스맵 추가" style={{ cursor: "pointer", border: `2px solid ${C.ink}`, borderRadius: 8, background: "linear-gradient(180deg,#e0a13d,#a86e13)", color: C.white, fontSize: 14, padding: "4px 9px", fontWeight: "bold" }}>＋</button>
          <div style={{ width: 120, height: 10, background: "#e7e2d6", borderRadius: 6, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(doneQ / totalQ) * 100}%`, background: `linear-gradient(90deg,${map.color},${map.deep})`, transition: "width .35s" }} />
          </div>
          <b style={{ fontSize: 12, color: map.deep }}>{doneQ}/{totalQ}</b>
        </div>

        <div style={{ position: "relative", width: "100%", maxWidth: MAP_W, height: VIEW_H, margin: "0 auto", border: `3px solid ${C.ink}`, borderRadius: 12, overflow: "hidden", boxShadow: "inset 0 0 40px rgba(0,0,0,0.12)" }}>
          <div style={{ position: "absolute", left: 0, top: -cam, width: MAP_W, height: MAP_H, transition: "top .1s linear" }}>
            {map.stages.map((st, si) => {
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
            <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: BOSS_H, background: "radial-gradient(circle at 50% 55%, #4a2f4f, #241c33)" }}>
              <div style={{ position: "absolute", left: 14, top: 12, background: "linear-gradient(90deg,#c0563a,#8c2f21)", color: C.white, borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: "bold", boxShadow: "0 2px 4px rgba(0,0,0,0.4)" }}>👑 BOSS</div>
            </div>

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
                    {nd.level ? (nd.level === "초보자" ? "🌱" : "🔥") : ""}{nd.title}
                  </div>
                </div>
              );
            })}

            <div style={{ position: "absolute", left: pos.x, top: pos.y, transform: "translate(-50%,-100%)", zIndex: 6, filter: "drop-shadow(0 4px 3px rgba(0,0,0,0.35))" }}>
              <Hero facing={facing} moving={moving} size={38} />
            </div>
          </div>

          {near && <div className="enter-prompt" style={{ position: "absolute", left: "50%", bottom: 12, transform: "translateX(-50%)", background: "rgba(20,16,28,0.9)", color: C.white, border: `2px solid ${C.gem}`, borderRadius: 20, padding: "6px 16px", fontSize: 12, zIndex: 8 }}>E · 퀘스트 열기</div>}
          {warn && <div style={{ position: "absolute", left: "50%", top: 12, transform: "translateX(-50%)", background: "rgba(192,86,58,0.95)", color: C.white, borderRadius: 20, padding: "6px 16px", fontSize: 12, zIndex: 9, boxShadow: "0 3px 8px rgba(0,0,0,0.3)" }}>🔒 {warn}</div>}
          <div style={{ position: "absolute", right: 8, top: 8, background: "rgba(0,0,0,0.4)", color: C.white, borderRadius: 12, padding: "3px 9px", fontSize: 10, zIndex: 8 }}>↑ 위로 올라갈수록 보스!</div>
        </div>

        <div style={{ display: "flex", gap: 7, marginTop: 12, flexWrap: "wrap" }}>
          {maps.map((m, i) => {
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

      {collOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 95, padding: 14 }} onClick={() => setCollOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440 }}>
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

      {addOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 95, padding: 14 }} onClick={() => setAddOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 380 }}>
            <div style={{ background: C.parch, border: `3px solid ${C.ink}`, borderRadius: 14, padding: 16 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                <PxButton tone={addTab === "quest" ? "good" : "wood"} onClick={() => setAddTab("quest")} style={{ flex: 1, fontSize: 12, padding: 8 }}>🎯 퀘스트 추가</PxButton>
                <PxButton tone={addTab === "map" ? "good" : "wood"} onClick={() => setAddTab("map")} style={{ flex: 1, fontSize: 12, padding: 8 }}>👹 보스맵 추가</PxButton>
              </div>
              {addTab === "quest" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <div style={{ fontSize: 11, color: C.inkSoft }}>「{map.name}」 맵에 퀘스트를 추가해요</div>
                  <select value={fQ.stage} onChange={(e) => setFQ({ ...fQ, stage: e.target.value })} style={{ padding: 8, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 13 }}>
                    {map.stages.map((st) => <option key={st.n} value={st.n}>{st.n} 스테이지 · {st.name}</option>)}
                  </select>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input value={fQ.icon} onChange={(e) => setFQ({ ...fQ, icon: e.target.value })} maxLength={2} placeholder="🎯" style={{ width: 52, textAlign: "center", padding: 8, border: `2px solid ${C.ink}`, borderRadius: 6, fontSize: 16 }} />
                    <input value={fQ.title} onChange={(e) => setFQ({ ...fQ, title: e.target.value })} placeholder="퀘스트 이름" style={{ flex: 1, minWidth: 0, padding: 8, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 13 }} />
                    <input value={fQ.gem} onChange={(e) => setFQ({ ...fQ, gem: e.target.value })} type="number" style={{ width: 60, padding: 8, border: `2px solid ${C.ink}`, borderRadius: 6, fontSize: 13 }} />
                  </div>
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
                  <input value={fQ.desc} onChange={(e) => setFQ({ ...fQ, desc: e.target.value })} placeholder="한 줄 설명 (선택)" style={{ padding: 8, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 13 }} />
                  <input value={fQ.task} onChange={(e) => setFQ({ ...fQ, task: e.target.value })} placeholder="목표 (선택)" style={{ padding: 8, border: `2px solid ${C.ink}`, borderRadius: 6, fontFamily: "'DotGothic16', monospace", fontSize: 13 }} />
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <PxButton tone="ink" onClick={() => setAddOpen(false)} style={{ flex: 1, padding: 10, fontSize: 13 }}>취소</PxButton>
                    <PxButton tone="gold" disabled={!fQ.title.trim()} onClick={addQuest} style={{ flex: 1, padding: 10, fontSize: 13 }}>추가하기</PxButton>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <div style={{ fontSize: 11, color: C.inkSoft }}>새 보스맵(프로젝트)을 만들어요</div>
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
              <div style={{ fontSize: 12, textAlign: "center", margin: "10px 0", color: "#a86e13", fontWeight: "bold" }}>보상 ⭐ {sel.gem}</div>
              {sel.level === "초보자" && sel.field && onGoSchool && (
                <PxButton tone="blue" onClick={() => onGoSchool(sel.field)} style={{ width: "100%", padding: 10, fontSize: 13, marginBottom: 10 }}>
                  {sel.field === "naverschool" ? "📗 네이버스쿨로 가서 배우기 →" : "🎬 영상스쿨로 가서 배우기 →"}
                </PxButton>
              )}
              {lockReason(sel) && <div style={{ background: "#fbe4e0", border: `2px solid ${C.danger}`, borderRadius: 8, color: C.danger, padding: 9, fontSize: 12, marginBottom: 10, textAlign: "center" }}>🔒 {lockReason(sel)}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <PxButton tone="ink" onClick={() => setSel(null)} style={{ flex: 1, padding: 10, fontSize: 13 }}>닫기</PxButton>
                <PxButton tone="gold" disabled={!!done[sel.id] || !!lockReason(sel)} onClick={() => clear(sel)} style={{ flex: 1, padding: 10, fontSize: 13 }}>{done[sel.id] ? "완료됨 ✓" : sel.isBoss ? "⚔ 격파!" : "✅ 완료"}</PxButton>
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
    { id: "f8", name: "수족관", price: 18, emoji: "🐠", color: "#4bb4d8" },
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
            <GemBadge amount={gems} />
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
                    {on ? (tab === "furni" ? "배치됨 ✓" : "사용중 ✓") : has ? (tab === "furni" ? "배치하기" : "적용하기") : gems < it.price ? `⭐${it.price} 부족` : `⭐${it.price} 구매`}
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
/* ======================= 흡연의 방(플레이버) ======================= */
const SMOKE_PEOPLE = ["정인", "호중", "희정", "유리", "의준"];
const SMOKE_LINES = ["오늘 왜이렇게 춥냐 ㅋㅋ", "커피 한잔 하실분~", "아 마감 언제끝나ㅠ", "날씨 좋다 그치", "점심 뭐먹지", "주말에 뭐함?", "일 너무 많아 진짜", "ㅋㅋㅋㅋㅋㅋ", "맞아맞아", "와 대박", "나 이제 끊을거야 (3일째)", "치앙마이 가고싶다", "한 대 피우고 가자", "오늘도 화이팅~"];

function SmokeChat({ onClose }) {
  const [msgs, setMsgs] = useState([{ who: "정인", text: "왔어? 여기 앉아 ㅋㅋ" }]);
  const [text, setText] = useState("");
  const endRef = useRef(null);
  useEffect(() => {
    const iv = setInterval(() => {
      setMsgs((m) => [...m.slice(-30), { who: SMOKE_PEOPLE[Math.floor(Math.random() * SMOKE_PEOPLE.length)], text: SMOKE_LINES[Math.floor(Math.random() * SMOKE_LINES.length)] }]);
    }, 2500);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => { if (endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  const send = () => { const t = text.trim(); if (!t) return; setMsgs((m) => [...m, { who: "나", text: t, me: true }]); setText(""); };
  return (
    <RoomModal title="💬 재떨이 수다방" onClose={onClose} maxW={400}>
      <div style={{ height: 280, overflow: "auto", background: "#efe6d2", border: `3px solid ${C.ink}`, padding: 8, display: "flex", flexDirection: "column", gap: 5 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ alignSelf: m.me ? "flex-end" : "flex-start", maxWidth: "80%" }}>
            {!m.me && <div style={{ fontSize: 10, color: C.inkSoft, marginBottom: 1 }}>{m.who}</div>}
            <div style={{ background: m.me ? C.gem : C.white, border: `2px solid ${C.ink}`, padding: "5px 9px", fontSize: 13 }}>{m.text}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="메시지 입력 후 Enter" style={{ flex: 1, padding: 8, border: `3px solid ${C.ink}`, fontFamily: "'DotGothic16', monospace", fontSize: 13, background: C.white }} />
        <PxButton tone="good" onClick={send} style={{ fontSize: 12, padding: "8px 12px" }}>전송</PxButton>
      </div>
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

function SmokeView({ onBack, bubble }) {
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
      {modal === "chat" && <SmokeChat onClose={() => setModal(null)} />}
      {modal === "cig" && <CigaretteModal onClose={() => setModal(null)} />}
      {modal === "vape" && <VapeModal onClose={() => setModal(null)} />}
    </RoomView>
  );
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
                <div style={{ fontSize: 14, fontWeight: "bold", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10, color: "#fff", background: a.type === "이벤트" ? "#d76b96" : "#5b8def", padding: "2px 6px", whiteSpace: "nowrap" }}>{a.type || "공지"}</span>
                  {a.title}
                </div>
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
function ChatDock({ messages, shout, onToggleShout, onSend, gems = 0 }) {
  const [text, setText] = useState("");
  const [warn, setWarn] = useState(false);
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
      {warn && <div style={{ background: C.danger, color: C.white, border: `2px solid ${C.ink}`, padding: "3px 8px", fontSize: 11, marginBottom: 4 }}>⭐ 젬이 부족해요 (확성기 1젬)</div>}
      <div style={{ display: "flex", gap: 4, background: C.parch, border: `3px solid ${C.ink}`, padding: 4 }}>
        <button onClick={() => { if (!shout && gems < 1) { setWarn(true); setTimeout(() => setWarn(false), 1600); return; } onToggleShout(); }} title={shout ? "확성기 ON" : "확성기 켜기 (⭐1)"} style={{ position: "relative", background: shout ? C.gem : C.white, border: `2px solid ${C.ink}`, cursor: "pointer", opacity: !shout && gems < 1 ? 0.6 : 1, fontSize: 15, width: 34, flexShrink: 0 }}>
          📢<span style={{ position: "absolute", right: 1, bottom: 0, fontSize: 8, color: C.ink, background: "#ffe680", border: `1px solid ${C.ink}`, padding: "0 1px", lineHeight: 1.2 }}>{shout ? "ON" : "1"}</span>
        </button>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder={shout ? "📢 확성기 ON · 크게 외치기" : gems < 1 ? "채팅 입력 (확성기는 ⭐1 필요)" : "채팅 입력 후 Enter"} style={{ flex: 1, minWidth: 0, border: `2px solid ${C.ink}`, padding: "4px 6px", fontSize: 12, background: C.white, fontFamily: "'DotGothic16', monospace" }} />
        <button onClick={send} style={{ background: C.good, color: C.white, border: `2px solid ${C.ink}`, cursor: "pointer", fontSize: 12, padding: "0 8px", flexShrink: 0 }}>▶</button>
      </div>
    </div>
  );
}

function InventoryButton({ onClick, count }) {
  return (
    <button onClick={onClick} title="인벤토리" style={{ position: "fixed", right: 14, bottom: 132, zIndex: 60, width: 46, height: 46, background: C.wood, border: `3px solid ${C.ink}`, boxShadow: `0 3px 0 ${C.ink}`, cursor: "pointer", fontSize: 20, color: C.white }}>
      🎒
      {count > 0 && <span style={{ position: "absolute", right: -4, top: -4, background: C.danger, color: C.white, border: `2px solid ${C.ink}`, fontSize: 9, padding: "0 4px" }}>{count}</span>}
    </button>
  );
}

function InventoryModal({ onClose, gems, outfit, ownedClothes, ikeaOwned, houseSkin, vehicle, myFurni, thanksInv, onEquipCloth, onToggleIkea }) {
  const [tab, setTab] = useState("vehicle");
  const TABS = { vehicle: "🚲 탈것", cloth: "👕 의류", furni: "🛋 가구", house: "🏠 외관", etc: "🎁 소지품" };
  const clothList = [];
  Object.keys(CLOTHES).forEach((cat) => CLOTHES[cat].forEach((it) => { if (ownedClothes[it.id]) clothList.push({ ...it, cat }); }));
  const furniList = IKEA_ITEMS.furni.filter((it) => ikeaOwned[it.id]);
  const vehList = IKEA_ITEMS.vehicle.filter((it) => ikeaOwned[it.id]);
  const houseList = IKEA_ITEMS.house.filter((it) => ikeaOwned[it.id]);
  const empty = (t) => <div style={{ fontSize: 12, color: C.inkSoft, padding: 16, textAlign: "center" }}>{t}</div>;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 14 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 420 }}>
        <Panel style={{ padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 22 }}>🎒</span>
            <b style={{ flex: 1, fontSize: 14 }}>인벤토리</b>
            <GemBadge amount={gems} />
            <PxButton tone="ink" onClick={onClose} style={{ fontSize: 11, padding: "5px 9px" }}>✕</PxButton>
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {thanksInv.map((it, i) => (
                  <div key={i} style={{ background: C.white, border: `3px solid ${C.ink}`, padding: 7, textAlign: "center" }}>
                    <div style={{ fontSize: 26 }}>{it.emoji || "🎁"}</div>
                    <div style={{ fontSize: 11 }}>{it.name}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Panel>
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
function useWeather(points) {
  const [wx, setWx] = useState({});
  const keyStr = JSON.stringify(points);
  useEffect(() => {
    let alive = true;
    Object.entries(points).forEach(([key, p]) => {
      if (!p) return;
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&current=temperature_2m,weather_code`)
        .then((r) => r.json())
        .then((d) => { if (alive && d && d.current) setWx((w) => ({ ...w, [key]: { temp: Math.round(d.current.temperature_2m), code: d.current.weather_code } })); })
        .catch(() => {});
    });
    return () => { alive = false; };
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
  const [myName, setMyName] = useState("");
  const netPosRef = useRef({ x: 1300, y: 950 });
  const netFacingRef = useRef(1);
  useEffect(() => { netPosRef.current = worldPos; }, [worldPos]);
  const onChatRef = useRef(null);
  const { others: netOthers, count: netCount, status: netStatus, sendChat: netSendChat } = useMultiplayer(myName, netPosRef, netFacingRef, onChatRef);
  const [nameOpen, setNameOpen] = useState(true);
  const [nameInput, setNameInput] = useState("");
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponDone, setCouponDone] = useState(false);
  const confirmName = (nm) => {
    const t = (nm || "").trim(); if (!t) return;
    setMyName(t); setNameOpen(false);
    if (!couponDone) { setCouponDone(true); setGems((g) => g + 100); setLifetime((l) => l + 100); setCouponOpen(true); }
  };
  const isMyHouse = (n) => !!(n && myName && n.replace(/이네$|네$/, "") === myName);
  const [ikeaOwned, setIkeaOwned] = useState({});
  const [houseSkin, setHouseSkin] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [myFurni, setMyFurni] = useState([]);
  const buyIkea = (kind, item) => {
    const has = !!ikeaOwned[item.id];
    if (!has) {
      if (gems < item.price) return;
      setGems((g) => g - item.price);
      setIkeaOwned((v) => ({ ...v, [item.id]: true }));
    }
    if (kind === "house") setHouseSkin((h) => (h && h.id === item.id ? null : item));
    else if (kind === "vehicle") setVehicle((v) => (v && v.id === item.id ? null : item));
    else setMyFurni((v) => (v.includes(item.id) ? v.filter((x) => x !== item.id) : [...v, item.id]));
  };
  const [swimScores, setSwimScores] = useState([{ nick: "유리", time: 8.2 }, { nick: "정인", time: 9.1 }, { nick: "호중", time: 9.8 }, { nick: "의준", time: 10.4 }]);
  const [boxScores, setBoxScores] = useState([{ nick: "창민", count: 18294719 }, { nick: "정인", count: 129572 }]);
  const [townRegion, setTownRegion] = useState("서울");
  const [regionOpen, setRegionOpen] = useState(false);
  const wxPoints = useMemo(() => ({ town: REGIONS[townRegion], chiangmai: { lat: 18.7883, lon: 98.9853 } }), [townRegion]);
  const weather = useWeather(wxPoints);
  const wxZone = worldPos.x >= RIVER_X ? "chiangmai" : "town";
  const wxName = wxZone === "chiangmai" ? "치앙마이" : townRegion;
  const curWx = weather[wxZone];
  const townRain = isRain(weather.town && weather.town.code);
  const cmRain = isRain(weather.chiangmai && weather.chiangmai.code);
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
  const [worldBgm, setWorldBgm] = useState({ title: WORLD_TRACKS[0].title, file: WORLD_TRACKS[0].file, playing: false });
  const selectTrack = (t) => setWorldBgm((b) => ({ ...b, title: t.title, file: t.file, playing: true }));
  const audioRef = useRef(null);
  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    if (worldBgm.playing) a.play().catch(() => {}); else a.pause();
  }, [worldBgm.playing, worldBgm.file]);
  const [chat, setChat] = useState([]);
  const [shout, setShout] = useState(false);
  const [bubble, setBubble] = useState(null);
  const bubbleTimer = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [invOpen, setInvOpen] = useState(false);

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
    setChat((c) => [...c, { id: Date.now(), nick: myName || "나", text: t, shout: isShout, me: true }].slice(-5));
    sayBubble(t);
    if (netSendChat) netSendChat(t, isShout);
    if (isShout) setShout(false);
  }, [sayBubble, myName, netSendChat]);
  useEffect(() => {
    onChatRef.current = (m) => {
      if (!m || m.id === MY_ID) return;
      setChat((c) => [...c, { id: Date.now() + Math.random(), nick: m.name || "익명", text: m.text, shout: m.shout }].slice(-5));
    };
  }, []);
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
      <audio ref={audioRef} src={import.meta.env.BASE_URL + encodeURIComponent(worldBgm.file)} loop preload="auto" />
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
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.parch, border: `2px solid ${C.ink}`, padding: "4px 8px" }}>
              <span style={{ fontSize: 16 }}>{curWx ? wxIcon(curWx.code) : "⏳"}</span>
              <div style={{ lineHeight: 1.1 }}>
                <div style={{ fontSize: 13, fontWeight: "bold" }}>{curWx ? `${curWx.temp}°` : "--"}</div>
                <div style={{ fontSize: 9, color: C.inkSoft }}>{wxName}</div>
              </div>
            </div>
            <PxButton tone="wood" onClick={() => setRegionOpen(true)} style={{ fontSize: 10, padding: "5px 7px" }}>＋지역</PxButton>
            {regionOpen && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 14 }} onClick={() => setRegionOpen(false)}>
                <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 340 }}>
                  <Panel style={{ padding: 14 }}>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, marginBottom: 10 }}>📍 마을 지역 선택</div>
                    <div style={{ fontSize: 11, color: C.inkSoft, marginBottom: 8 }}>고르면 상단 날씨가 그 지역으로 바로 바뀌어요.</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {Object.keys(REGIONS).map((r) => (
                        <PxButton key={r} tone={r === townRegion ? "good" : "wood"} onClick={() => { setTownRegion(r); setRegionOpen(false); }} style={{ padding: 10, fontSize: 13 }}>{r}</PxButton>
                      ))}
                    </div>
                  </Panel>
                </div>
              </div>
            )}
            <PxButton tone="wood" onClick={() => { setNameInput(myName); setNameOpen(true); }} style={{ fontSize: 11, padding: "5px 9px" }}>🧑 {myName || "이름 설정"}</PxButton>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: C.inkSoft }}>보유 스타 젬</div>
              <GemBadge amount={gems} big />
            </div>
          </div>
        </Panel>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        {view === "world" && <WorldView pos={worldPos} setPos={setWorldPos} day={day} gems={gems} rentedHouses={rented} onEnter={handleEnter} onNextDay={nextDay} bgm={worldBgm} onToggleBgm={() => setWorldBgm((b) => ({ ...b, playing: !b.playing }))} onRequestSong={requestWorldSong} tracks={WORLD_TRACKS} onSelectTrack={selectTrack} outfit={outfit} vehicle={vehicle} houseSkin={houseSkin} isMyHouse={isMyHouse} bubble={bubble} townRain={townRain} cmRain={cmRain} others={netOthers} netCount={netCount} netStatus={netStatus} facingRef={netFacingRef} />}
        {view === "center" && <CenterView meetingRooms={meetingRooms} chat={centerChat} onSend={(t) => setCenterChat((c) => [...c, { who: "나", text: t, me: true }])} onEnterMeeting={(id) => { setMeetingId(id); setView("meeting"); }} onBack={backToWorld} bubble={bubble} onDrink={() => { setHp((h) => Math.min(100, h + 20)); setMp((m) => Math.min(100, m + 20)); }} />}
        {view === "meeting" && meetingId && <MeetingView roomId={meetingId} room={meetingRooms[meetingId]} onUpdate={(id, patch) => setMeetingRooms((m) => ({ ...m, [id]: { ...m[id], ...patch } }))} onBack={() => setView("center")} />}
        {view === "big" && bigMeta && (bigMeta.id === "alba" ? <AlbaView onBack={backToWorld} /> : <BigBuildingView b={bigMeta} qs={qs} day={day} onRun={runQuest} onBack={backToWorld} />)}        {view === "house" && houseMeta && <HomeView house={houseMeta} skin={houseMeta && isMyHouse(houseMeta.name) ? houseSkin : null} extras={houseMeta && isMyHouse(houseMeta.name) ? myFurni : []} extras={myFurni} memo={memos[houseId]} onSaveMemo={(t) => setMemos((m) => ({ ...m, [houseId]: t }))} onBack={backToWorld} bubble={bubble} />}
        {view === "thanks" && <ThanksView gems={gems} inventory={thanksInv} postits={postits} onBuy={(it) => { setGems((g) => g - it.price); setThanksInv((v) => [...v, it]); }} onPost={(p) => setPostits((v) => [...v, { ...p, id: Date.now() }])} onBack={backToWorld} bubble={bubble} />}
        {view === "heart" && <HeartView gems={gems} worries={worries} onPost={(text, cost, kind) => { setGems((g) => g - cost); setWorries((w) => [{ id: Date.now(), text, kind }, ...w]); }} onBack={backToWorld} bubble={bubble} />}
        {view === "listening" && <ListeningView onBack={backToWorld} gems={gems} onSpend={(n) => setGems((g) => g - n)} bubble={bubble} />}
        {view === "reels" && <ReelsView onBack={backToWorld} bubble={bubble} />}
        {view === "minigame" && <MiniGameRoom myName={myName} onBack={backToWorld} onReward={(n) => award(n)} bubble={bubble} />}
        {view === "pool" && <PoolView myName={myName} onBack={backToWorld} onReward={(n) => award(n)} scores={swimScores} onRecord={(nick, time) => setSwimScores((s) => [...s, { nick, time }])} bubble={bubble} />}
        {view === "gym" && <GymView onBack={backToWorld} onWork={() => award(4)} bubble={bubble} />}
        {view === "smoke" && <SmokeView onBack={backToWorld} bubble={bubble} />}
        {view === "ikea" && <IkeaView gems={gems} owned={ikeaOwned} houseSkin={houseSkin} vehicle={vehicle} myFurni={myFurni} onBuy={buyIkea} onBack={backToWorld} bubble={bubble} />}
        {view === "project" && <BossMapView onBack={backToWorld} onReward={(n) => award(n)} onGoSchool={(id) => setView(id)} />}
        {(view === "naverschool" || view === "videoschool") && <SchoolView school={view} onBack={backToWorld} />}
        {view === "sandbag" && <SandbagView myName={myName} onBack={backToWorld} scores={boxScores} onEnd={(nick, count, target) => setBoxScores((s) => [...s, { nick, count, target }])} />}
        {view === "musinsa" && <MusinsaView gems={gems} outfit={outfit} owned={owned} onTryOn={tryOnClothing} onBuy={buyClothing} onBack={backToWorld} bubble={bubble} />}
        {view === "jjeop" && <JjeopView onBack={backToWorld} bubble={bubble} onReward={(n) => award(n)} />}
        {view === "board" && <BoardView onBack={backToWorld} />}
        {view === "bank" && <BankView gems={gems} lifetime={lifetime} exchanged={exchanged} history={history} onExchange={doExchange} onBack={backToWorld} />}
        {view === "rent" && rentMeta && <RentView house={rentMeta} gems={gems} rented={!!rented[rentId]} onRent={() => { setGems((g) => g - rentMeta.rent); setRented((r) => ({ ...r, [rentId]: true })); }} onBack={backToWorld} />}
      </div>

      <div style={{ maxWidth: 960, margin: "14px auto 0", textAlign: "center", fontSize: 11, color: "rgba(42,30,20,0.65)" }}>
        프로토타입 데모 · 화폐/환전/렌트/통화·채팅은 모두 시뮬레이션(로컬)입니다. 새로고침 시 초기화됩니다.
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
              <div style={{ fontSize: 10, color: C.inkSoft, marginTop: 6, textAlign: "center" }}>주민 이름(정인·창민·도희·유리·민지·희정·의준·호종)과 같으면 그 집이 내 집이 돼요!</div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                {myName && <PxButton tone="ink" onClick={() => setNameOpen(false)} style={{ flex: 1, padding: 10, fontSize: 13 }}>취소</PxButton>}
                <PxButton tone="good" disabled={!nameInput.trim()} onClick={() => confirmName(nameInput)} style={{ flex: 1, padding: 10, fontSize: 13 }}>시작하기</PxButton>
              </div>
            </Panel>
          </div>
        </div>
      )}
      {couponOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 130, padding: 14 }} onClick={() => setCouponOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 340 }}>
            <div style={{ background: "linear-gradient(180deg,#fff8e1,#ffe9a8)", border: `4px solid ${C.ink}`, borderRadius: 14, padding: 20, textAlign: "center", boxShadow: "0 12px 30px rgba(0,0,0,0.5)" }}>
              <div style={{ fontSize: 46 }}>🎟️</div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, margin: "10px 0 6px", color: "#a86e13" }}>WELCOME COUPON</div>
              <div style={{ fontSize: 15, fontWeight: "bold", marginBottom: 8 }}>{myName}님, 사전예약 감사합니다!</div>
              <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.7, marginBottom: 12 }}>
                에코타운 사전예약자에게 드리는<br />웰컴 쿠폰이 발급되었어요.
              </div>
              <div style={{ background: C.white, border: `3px dashed ${C.ink}`, borderRadius: 10, padding: "14px 10px", marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: C.inkSoft }}>지급 보상</div>
                <div style={{ fontSize: 26, fontWeight: "bold", color: "#a86e13" }}>⭐ 100 젬</div>
              </div>
              <PxButton tone="gold" onClick={() => setCouponOpen(false)} style={{ width: "100%", padding: 12, fontSize: 14 }}>받고 시작하기 🌱</PxButton>
            </div>
          </div>
        </div>
      )}
      <ChatDock messages={chat} shout={shout} gems={gems} onSend={postChat}
        onToggleShout={() => {
          if (shout) { setShout(false); return; }
          if (gems < 1) return;
          setGems((g) => g - 1);
          setShout(true);
        }} />
      <InventoryButton onClick={() => setInvOpen(true)} count={Object.keys(owned).length + Object.keys(ikeaOwned).length + thanksInv.length} />
      {invOpen && <InventoryModal onClose={() => setInvOpen(false)} gems={gems} outfit={outfit} ownedClothes={owned} ikeaOwned={ikeaOwned} houseSkin={houseSkin} vehicle={vehicle} myFurni={myFurni} thanksInv={thanksInv} onEquipCloth={tryOnClothing} onToggleIkea={buyIkea} />}
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
      @keyframes rainFall { from { background-position: 0 0; } to { background-position: -60px 240px; } }
      .rain-layer { background-color: rgba(40,50,70,0.16); background-image: repeating-linear-gradient(105deg, transparent 0 9px, rgba(200,215,235,0.5) 9px 10px); animation: rainFall .45s linear infinite; }
      @keyframes bubblePop { 0%{ transform: translateX(-50%) scale(.6); opacity:0;} 60%{ transform: translateX(-50%) scale(1.05);} 100%{ transform: translateX(-50%) scale(1); opacity:1;} }
      .chat-bubble { animation: bubblePop .2s ease-out; }
      .game-vp:focus, .game-vp:focus-visible { outline: none; }
      @media (prefers-reduced-motion: reduce) {
        .gem-pop,.hero-bob,.gem-spin,.enter-prompt,.chat-bubble,.px-btn,.map-obj { animation:none !important; transition:none !important; }
      }
    `}</style>
  );
}
