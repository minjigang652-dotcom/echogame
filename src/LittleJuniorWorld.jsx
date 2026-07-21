import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";

/* =============================================================================
   작은 주니어 네이버 : 주민센터 에디션
   - 스타듀밸리풍 16비트 도트 메타버스 업무 시뮬레이터 (프로토타입)
   - 단일 파일 React SPA. 외부 의존성 없음(순수 React).
   - 마을의 중심은 주민센터(허브) — 큰 테이블(대화/채팅) + 회의실 3개(예약/잠금/화상)
     + 커피포트/자판기/정수기, 그리고 환전 창구(기존 은행 기능 유지)
   - 대형건물 4곳(어플/항균속옷/항균양말/알바) = 업무 퀘스트. 반복 퀘스트는 "하루 1회"
     완료하면 다음날 자동 초기화(날짜 비교 방식, localStorage에 저장되어 실제로
     하루가 지나면 다시 수행할 수 있습니다)
   - 집 8채(정인/창민/도희/유리/민지/희정/의준/호정) = 침대·소파·티비·책상, 책상은 개인 메모장
   - 소형건물 5곳: 감사의 방 / 마음의 방 / 몰입의 방 / 수면의 방 / 흡연의 방
   - 게시판(목조 패널): 캘린더(2026년 7월, 31일 빨간 동그라미) + 공지사항
   - 재화: ⭐ 스타 젬 (Star Gem)
   =============================================================================
   ⚠️ 안내: '환전'은 전부 시뮬레이션입니다. 실제 금전 거래·출금 기능이 아니며
   프로토타입의 리워드 정산 UI 흐름을 보여주기 위한 데모입니다.
============================================================================= */

/* -------------------------- 디자인 토큰(팔레트) --------------------------- */
const C = {
  ink: "#2a1e14",
  inkSoft: "#4a382a",
  grass: "#6ab04c",
  grassDark: "#57a03d",
  grassShadow: "#3f7d2c",
  path: "#c9a25f",
  pathDark: "#a9814a",
  parch: "#f3e2bd",
  parchLine: "#e6ce9a",
  parchEdge: "#c39a54",
  wood: "#8b5a2b",
  woodDark: "#6b4423",
  gem: "#ffcb2b",
  gemGlow: "#ffe680",
  bankRoof: "#3a8fb7",
  bankRoofDk: "#2b6c8f",
  hallRoof: "#c0563a",
  hallRoofDk: "#96412c",
  water: "#4bb4d8",
  white: "#fff7e6",
  danger: "#c0563a",
  good: "#4e9a3a",
  locked: "#8f4a4a",
  unlocked: "#4e9a3a",
  floor: "#e6cf9d",
  floorLine: "#d3b87d",
};

const GEM_TO_WON = 10000;
const COOLDOWN_MS = 1200;

/* ------------------------------ 날짜 유틸 --------------------------------- */
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

/* ------------------------------ 저장/불러오기 ------------------------------ */
const SAVE_KEY = "ljt-save-v2";
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function writeSave(data) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    /* 저장 공간이 없으면 조용히 무시 (프로토타입) */
  }
}

/* ============================== 마을 데이터 =============================== */

const LARGE_BUILDINGS = [
  {
    id: "app",
    name: "어플",
    subtitle: "서비스 개발팀",
    icon: "📱",
    roof: "#3a8fb7",
    roofDk: "#2b6c8f",
    wall: "#dfeaf2",
    blurb: "우리 앱의 버그를 잡고 기능을 다듬는 곳.",
    quests: [
      { id: "app1", title: "버그 리포트 처리", desc: "쌓인 버그 티켓을 하나씩 정리", reward: 10, duration: 1400, repeat: true },
      { id: "app2", title: "앱스토어 리뷰 답글", desc: "사용자 리뷰에 진심 어린 답글 작성", reward: 12, duration: 1600, repeat: true },
      { id: "app3", title: "푸시 알림 캠페인 발송", desc: "타겟팅된 푸시 알림 발송 준비", reward: 16, duration: 2000, repeat: true },
      { id: "app4", title: "신규 기능 런칭", desc: "이번 스프린트 대형 기능을 배포", reward: 60, duration: 3200, repeat: false },
    ],
  },
  {
    id: "antiwear",
    name: "항균속옷",
    subtitle: "항균 이너웨어 생산팀",
    icon: "🩲",
    roof: "#8e5a9e",
    roofDk: "#6f4480",
    wall: "#eee0f0",
    blurb: "원단 항균 처리부터 품질 검수까지 책임지는 곳.",
    quests: [
      { id: "aw1", title: "원단 항균 테스트", desc: "신규 원단 샘플 항균력 측정", reward: 11, duration: 1500, repeat: true },
      { id: "aw2", title: "생산라인 품질검수", desc: "라인별 불량률 체크 및 기록", reward: 14, duration: 1800, repeat: true },
      { id: "aw3", title: "포장 라벨 부착", desc: "출고 전 라벨 부착 및 최종 확인", reward: 9, duration: 1200, repeat: true },
      { id: "aw4", title: "항균속옷 신제품 출시", desc: "신규 라인업 최종 승인 및 출시", reward: 65, duration: 3300, repeat: false },
    ],
  },
  {
    id: "antisocks",
    name: "항균양말",
    subtitle: "항균 삭스 생산팀",
    icon: "🧦",
    roof: "#3fa07a",
    roofDk: "#2f7d5e",
    wall: "#dcefe2",
    blurb: "발냄새 걱정 끝, 항균 양말을 만드는 곳.",
    quests: [
      { id: "as1", title: "양말 항균 코팅", desc: "코팅 공정 투입 및 결과 확인", reward: 10, duration: 1400, repeat: true },
      { id: "as2", title: "사이즈별 검수", desc: "사이즈 편차를 하나씩 검사", reward: 13, duration: 1700, repeat: true },
      { id: "as3", title: "재고 정리", desc: "창고 재고를 정리하고 라벨링", reward: 9, duration: 1200, repeat: true },
      { id: "as4", title: "항균양말 시즌 컬렉션 출시", desc: "시즌 컬렉션 최종 출시 확정", reward: 58, duration: 3100, repeat: false },
    ],
  },
  {
    id: "albar",
    name: "알바",
    subtitle: "매장 아르바이트",
    icon: "🛒",
    roof: "#d9a441",
    roofDk: "#b7842c",
    wall: "#f6ecd0",
    blurb: "매장을 지키고 손님을 응대하는 곳.",
    quests: [
      { id: "al1", title: "매장 정리", desc: "진열대와 매대를 깔끔하게 정돈", reward: 8, duration: 1100, repeat: true },
      { id: "al2", title: "포스기 마감", desc: "하루 매출을 정산하고 마감", reward: 12, duration: 1600, repeat: true },
      { id: "al3", title: "재고 발주 체크", desc: "부족한 물품을 확인하고 발주", reward: 10, duration: 1400, repeat: true },
      { id: "al4", title: "알바 우수사원 선정", desc: "이번 달 우수 근무자를 선정", reward: 50, duration: 2800, repeat: false },
    ],
  },
];

const HOUSES = [
  { id: "h1", name: "정인이네", owner: "정인", roof: "#c0563a", roofDk: "#96412c", wall: "#f1dcc0" },
  { id: "h2", name: "창민이네", owner: "창민", roof: "#3a8fb7", roofDk: "#2b6c8f", wall: "#dcecf3" },
  { id: "h3", name: "도희네", owner: "도희", roof: "#8e5a9e", roofDk: "#6f4480", wall: "#ecdcf0" },
  { id: "h4", name: "유리네", owner: "유리", roof: "#3fa07a", roofDk: "#2f7d5e", wall: "#dcf0e5" },
  { id: "h5", name: "민지네", owner: "민지", roof: "#d9a441", roofDk: "#b7842c", wall: "#f6ecd2" },
  { id: "h6", name: "희정이네", owner: "희정", roof: "#c77dab", roofDk: "#a0568a", wall: "#f7e2ee" },
  { id: "h7", name: "의준이네", owner: "의준", roof: "#6c7fd6", roofDk: "#4c5cb0", wall: "#e2e6f8" },
  { id: "h8", name: "호정이네", owner: "호정", roof: "#7fb03f", roofDk: "#5c8a29", wall: "#e5f1d5" },
];

const SMALL_BUILDINGS = [
  { id: "gratitude", name: "감사의 방", icon: "🙏", roof: "#d9a441", roofDk: "#b7842c", wall: "#f6ecd2", blurb: "고마운 마음을 물건과 편지로 전하는 곳" },
  { id: "heart", name: "마음의 방", icon: "💌", roof: "#c77dab", roofDk: "#a0568a", wall: "#f7e2ee", blurb: "퇴근길 마음속 이야기를 살짝 털어놓는 곳" },
  { id: "focus", name: "몰입의 방", icon: "🎯", roof: "#3a8fb7", roofDk: "#2b6c8f", wall: "#dcecf3", blurb: "각자 퀘스트하며 함께 허들링하는 곳" },
  { id: "sleep", name: "수면의 방", icon: "😴", roof: "#6c7fd6", roofDk: "#4c5cb0", wall: "#e2e6f8", blurb: "휴식·집중 중 — 조용히 해주세요" },
  { id: "smoking", name: "흡연의 방", icon: "🚬", roof: "#8a8a8a", roofDk: "#666666", wall: "#e4e4e4", blurb: "잠깐 바람 쐬러 나가는 곳" },
];

const MEETING_ROOMS = [
  { id: "m1", name: "회의실 1", cap: 6 },
  { id: "m2", name: "회의실 2", cap: 8 },
  { id: "m3", name: "회의실 3", cap: 4 },
];
const TIME_SLOTS = Array.from({ length: 10 }, (_, i) => `${9 + i}:00`); // 09:00~18:00

const NOTICES = [
  { id: "n1", date: "2026-07-02", title: "7월 정기 워크숍 안내", body: "7월 정기 워크숍이 진행됩니다. 참석 대상자는 주민센터 회의실 1로 모여주세요. 준비물은 없으며 편하게 참석하시면 됩니다." },
  { id: "n2", date: "2026-07-10", title: "항균양말 시즌 컬렉션 킥오프", body: "항균양말 팀의 시즌 컬렉션 프로젝트가 시작됩니다. 관련 퀘스트가 대형건물 '항균양말'에 추가되었으니 확인해주세요." },
  { id: "n3", date: "2026-07-18", title: "감사의 방 이용 안내", body: "감사의 방에서 편지지와 케이크를 스타 젬으로 구매하실 수 있습니다. 동료에게 감사 편지를 남겨보세요." },
  { id: "n4", date: "2026-07-31", title: "7월 월간 정산 마감", body: "7월 월간 스타 젬 정산이 마감됩니다. 정산은 주민센터 환전 창구에서 가능합니다. 마감 전 꼭 확인해주세요." },
];

const MOCK_EVENTS = {
  "2026-07-02": ["정기 워크숍 (회의실 1, 10:00)"],
  "2026-07-10": ["항균양말 시즌 컬렉션 킥오프"],
  "2026-07-15": ["중간 점검 미팅 (회의실 2, 14:00)"],
  "2026-07-18": ["감사의 방 오픈 이벤트"],
  "2026-07-24": ["전체 회식 (회의실 3, 18:30)"],
  "2026-07-31": ["🔴 월간 정산 마감일"],
};

const SHOP_ITEMS = [
  { id: "letter", name: "편지지", icon: "✉️", cost: 4, desc: "정성스러운 손편지지 한 세트" },
  { id: "cake", name: "케이크", icon: "🍰", cost: 15, desc: "작은 축하를 전하는 조각 케이크" },
  { id: "flower", name: "꽃 한 송이", icon: "🌷", cost: 6, desc: "책상 위에 두면 기분이 좋아지는" },
  { id: "card", name: "감사 카드", icon: "💳", cost: 3, desc: "짧지만 따뜻한 카드" },
];

/* ============================== 재사용 UI 조각 ============================= */
function Panel({ children, style, className = "" }) {
  return (
    <div
      className={"pnl " + className}
      style={{
        background: C.parch,
        border: `4px solid ${C.ink}`,
        boxShadow: `inset 0 0 0 3px ${C.parchEdge}, 6px 6px 0 rgba(0,0,0,0.25)`,
        ...style,
      }}
    >
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
    ink: { bg: "#4a382a", bgDk: "#2a1e14", fg: C.white },
    bank: { bg: C.bankRoof, bgDk: C.bankRoofDk, fg: C.white },
  }[tone];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="px-btn"
      style={{
        fontFamily: "'DotGothic16', monospace",
        color: tones.fg,
        background: disabled ? "#9a8f7d" : tones.bg,
        border: `3px solid ${C.ink}`,
        boxShadow: disabled ? "none" : `0 4px 0 ${disabled ? "#6b6355" : tones.bgDk}`,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.75 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function GemBadge({ amount, big }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
      <span className="gem-spin" style={{ fontSize: big ? 22 : 15 }}>⭐</span>
      <b style={{ color: "#a86e13", fontSize: big ? 22 : 15 }}>{Number(amount).toLocaleString()}</b>
    </span>
  );
}

function Modal({ onClose, children, maxWidth = 460 }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 80, padding: 16 }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth }}>
        {children}
      </div>
    </div>
  );
}

function ScreenHeader({ title, subtitle, icon, onBack, right }) {
  return (
    <Panel style={{ padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <PxButton tone="ink" onClick={onBack} style={{ padding: "8px 12px", fontSize: 12 }}>← 나가기</PxButton>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <div>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, lineHeight: 1.6 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: C.inkSoft }}>{subtitle}</div>}
        </div>
      </div>
      {right}
    </Panel>
  );
}

/* ============================== 픽셀풍 건물 스프라이트 ===================== */
/* SVG 대신 CSS 블록으로 구성된 경량 도트풍 스프라이트 (지붕+벽+문+창) */
function Sprite({ roof, roofDk, wall, icon, w = 96, h = 84, label, badge }) {
  return (
    <div style={{ position: "relative", width: w, display: "flex", flexDirection: "column", alignItems: "center" }}>
      {badge && (
        <div style={{ position: "absolute", top: -14, right: -6, background: C.danger, color: C.white, fontSize: 10, padding: "2px 5px", border: `2px solid ${C.ink}`, zIndex: 2 }}>
          {badge}
        </div>
      )}
      {/* 지붕 */}
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: `${w / 2 + 6}px solid transparent`,
          borderRight: `${w / 2 + 6}px solid transparent`,
          borderBottom: `${h * 0.34}px solid ${roof}`,
          filter: `drop-shadow(0 3px 0 ${roofDk})`,
        }}
      />
      {/* 벽 */}
      <div
        style={{
          width: w,
          height: h * 0.62,
          background: wall,
          border: `3px solid ${C.ink}`,
          borderTop: "none",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
        }}
      >
        <span style={{ fontSize: w * 0.34 }}>{icon}</span>
        {/* 문 */}
        <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: w * 0.24, height: h * 0.26, background: C.woodDark, border: `2px solid ${C.ink}`, borderBottom: "none" }} />
      </div>
      {label && (
        <div style={{ marginTop: 6, background: C.ink, color: C.white, fontSize: 11, padding: "3px 8px", borderRadius: 3, whiteSpace: "nowrap", textAlign: "center" }}>
          {label}
        </div>
      )}
    </div>
  );
}

function HallSprite({ w = 190, h = 140 }) {
  return (
    <div style={{ position: "relative", width: w, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: `${w / 2 + 10}px solid transparent`,
          borderRight: `${w / 2 + 10}px solid transparent`,
          borderBottom: `${h * 0.32}px solid ${C.hallRoof}`,
          filter: `drop-shadow(0 4px 0 ${C.hallRoofDk})`,
        }}
      />
      <div
        style={{
          width: w,
          height: h * 0.62,
          background: C.parch,
          border: `4px solid ${C.ink}`,
          borderTop: "none",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {[9, 17, 25].map((_, i) => (
          <div key={i} style={{ width: 10, height: h * 0.4, background: C.white, border: `2px solid ${C.ink}` }} />
        ))}
        <span style={{ position: "absolute", top: 6, fontSize: 22 }}>🏛️</span>
        <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: w * 0.22, height: h * 0.3, background: C.woodDark, border: `2px solid ${C.ink}`, borderBottom: "none" }} />
      </div>
      <div style={{ marginTop: 6, background: C.hallRoofDk, color: C.white, fontSize: 12, padding: "4px 10px", fontFamily: "'Press Start 2P', monospace" }}>
        주민센터
      </div>
    </div>
  );
}

function BoardSprite({ w = 74, h = 60 }) {
  return (
    <div style={{ width: w, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div
        style={{
          width: w,
          height: h,
          background: "repeating-linear-gradient(90deg, #a9764a 0 8px, #93643c 8px 16px)",
          border: `3px solid ${C.ink}`,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 22 }}>📌</span>
      </div>
      <div style={{ width: 6, height: 16, background: C.woodDark, border: `2px solid ${C.ink}`, borderTop: "none" }} />
      <div style={{ marginTop: 4, background: C.ink, color: C.white, fontSize: 10, padding: "2px 6px" }}>게시판</div>
    </div>
  );
}

/* 플레이어 캐릭터 */
function Hero({ facing = 1, moving = false }) {
  return (
    <div aria-hidden style={{ transform: `scaleX(${facing})` }}>
      <svg width="30" height="38" viewBox="0 0 17 21" shapeRendering="crispEdges" className={moving ? "hero-bob" : ""}>
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

/* ============================== 걷기/카메라 훅 ============================= */
/* worldW/H: 월드 크기(px) · viewW/H: 화면(뷰포트) 크기(px) · spots: 입장 지점들 */
function useWalker({ worldW, worldH, viewW, viewH, spots, initial, active }) {
  const [pos, setPos] = useState(initial);
  const [facing, setFacing] = useState(1);
  const [moving, setMoving] = useState(false);
  const [near, setNear] = useState(null);
  const keys = useRef({});
  const posRef = useRef(pos);
  const rafRef = useRef(null);
  const spotsRef = useRef(spots);
  spotsRef.current = spots;

  useEffect(() => {
    posRef.current = initial;
    setPos(initial);
    // eslint-disable-next-line
  }, [worldW, worldH]);

  useEffect(() => {
    if (!active) return undefined;
    const norm = (k) => (k.length === 1 ? k.toLowerCase() : k);
    const down = (e) => {
      const raw = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(raw)) e.preventDefault();
      keys.current[norm(e.key)] = true;
    };
    const up = (e) => { keys.current[norm(e.key)] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    let last = performance.now();
    function loop(t) {
      const dt = Math.min(32, t - last);
      last = t;
      const k = keys.current;
      let dx = 0, dy = 0;
      if (k["arrowleft"] || k["a"]) dx -= 1;
      if (k["arrowright"] || k["d"]) dx += 1;
      if (k["arrowup"] || k["w"]) dy -= 1;
      if (k["arrowdown"] || k["s"]) dy += 1;

      if (dx || dy) {
        const len = Math.hypot(dx, dy) || 1;
        const speed = 0.26 * dt;
        let nx = posRef.current.x + (dx / len) * speed;
        let ny = posRef.current.y + (dy / len) * speed;
        nx = Math.max(30, Math.min(worldW - 30, nx));
        ny = Math.max(30, Math.min(worldH - 30, ny));
        posRef.current = { x: nx, y: ny };
        setPos({ x: nx, y: ny });
        setMoving(true);
        if (dx !== 0) setFacing(dx > 0 ? 1 : -1);
      } else {
        setMoving(false);
      }

      let bestId = null, bestD = Infinity;
      spotsRef.current.forEach((s) => {
        const d = Math.hypot(posRef.current.x - s.cx, posRef.current.y - s.cy);
        if (d < s.r && d < bestD) { bestD = d; bestId = s.id; }
      });
      setNear((prev) => (prev === bestId ? prev : bestId));

      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      cancelAnimationFrame(rafRef.current);
    };
  }, [active, worldW, worldH]);

  const camX = Math.max(0, Math.min(Math.max(0, worldW - viewW), pos.x - viewW / 2));
  const camY = Math.max(0, Math.min(Math.max(0, worldH - viewH), pos.y - viewH / 2));

  return { pos, setPos, facing, moving, near, camX, camY };
}

/* 스페이스/엔터 입장 단축키 */
function useEnterKey(nearId, onEnter, active) {
  useEffect(() => {
    if (!active) return undefined;
    const h = (e) => {
      if ((e.key === " " || e.key === "Enter") && nearId) {
        e.preventDefault();
        onEnter(nearId);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [active, nearId, onEnter]);
}

/* ============================== 뷰포트(카메라) 프레임 ====================== */
function CameraFrame({ viewW, viewH, worldW, worldH, camX, camY, floorStyle, children }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: viewW,
        height: viewH,
        margin: "0 auto",
        overflow: "hidden",
        position: "relative",
        border: `4px solid ${C.ink}`,
        boxShadow: `inset 0 0 0 3px ${C.parchEdge}, 6px 6px 0 rgba(0,0,0,0.25)`,
        ...floorStyle,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: -camX,
          top: -camY,
          width: worldW,
          height: worldH,
          transition: "left .05s linear, top .05s linear",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function EnterPrompt({ text = "스페이스로 입장" }) {
  return (
    <div
      className="enter-prompt"
      style={{
        position: "absolute", left: "50%", bottom: "100%", transform: "translateX(-50%)",
        background: C.ink, color: C.white, fontSize: 11, padding: "4px 8px", whiteSpace: "nowrap", marginBottom: 6,
      }}
    >
      {text}
    </div>
  );
}

/* ============================== 메인 앱 =================================== */
export default function App() {
  const saved = useRef(loadSave());

  const [screen, setScreen] = useState({ type: "town" }); // town | townhall | meeting | building | house | small
  const [gems, setGems] = useState(saved.current?.gems ?? 30);
  const [lifetime, setLifetime] = useState(saved.current?.lifetime ?? 0);
  const [exchanged, setExchanged] = useState(saved.current?.exchanged ?? 0);
  const [history, setHistory] = useState(saved.current?.history ?? []);

  // 퀘스트 상태: { [buildingId]: { [qid]: {running,progress,completedDate,doneForever} } }
  const [quests, setQuests] = useState(() => {
    if (saved.current?.quests) return saved.current.quests;
    const o = {};
    LARGE_BUILDINGS.forEach((b) => {
      o[b.id] = {};
      b.quests.forEach((q) => { o[b.id][q.id] = { running: false, progress: 0, completedDate: null, doneForever: false }; });
    });
    return o;
  });

  const [houseNotes, setHouseNotes] = useState(saved.current?.houseNotes ?? {});
  const [gratitudeNotes, setGratitudeNotes] = useState(saved.current?.gratitudeNotes ?? []);
  const [heartNotes, setHeartNotes] = useState(saved.current?.heartNotes ?? []);
  const [inventory, setInventory] = useState(saved.current?.inventory ?? {});
  const [rooms, setRooms] = useState(() => { if (saved.current?.rooms) return saved.current.rooms;
    const o = {};
    MEETING_ROOMS.forEach((r) => { o[r.id] = { locked: false, reservations: [], screenShare: false, cam: false, call: false }; });
    return o;
  });
  const [hallChat, setHallChat] = useState(saved.current?.hallChat ?? [
    { id: uid(), who: "시스템", text: "주민센터 큰 테이블에 오신 걸 환영해요! 여기서 자유롭게 이야기 나눠요 :)" },
  ]);
  const [focusChat, setFocusChat] = useState(saved.current?.focusChat ?? []);
  const [myStatus, setMyStatus] = useState(saved.current?.myStatus ?? { smoking: false, mode: "집중중" });

  const [popups, setPopups] = useState([]);
  const popupSeq = useRef(0);
  const timers = useRef({});
  const [now, setNow] = useState(Date.now());

  // 저장된 마을 좌표
  const [townPos] = useState(saved.current?.townPos ?? { x: 1300, y: 1230 });

  // 폰트 주입
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=DotGothic16&family=Press+Start+2P&display=swap";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 400);
    return () => clearInterval(t);
  }, []);

  useEffect(() => () => Object.values(timers.current).forEach(clearInterval), []);

  // 자동 저장
  useEffect(() => {
    writeSave({ gems, lifetime, exchanged, history, quests, houseNotes, gratitudeNotes, heartNotes, inventory, rooms, hallChat, focusChat, myStatus });
  }, [gems, lifetime, exchanged, history, quests, houseNotes, gratitudeNotes, heartNotes, inventory, rooms, hallChat, focusChat, myStatus]);

  /* --- 퀘스트 실행 --- */
  function runQuest(buildingId, q) {
    const st = quests[buildingId]?.[q.id];
    if (!st || st.running) return;
    const today = todayStr();
    if (q.repeat && st.completedDate === today) return;
    if (!q.repeat && st.doneForever) return;

    setQuests((p) => ({ ...p, [buildingId]: { ...p[buildingId], [q.id]: { ...p[buildingId][q.id], running: true, progress: 0 } } }));

    const step = 40;
    const inc = 100 / (q.duration / step);
    const timerKey = `${buildingId}:${q.id}`;
    timers.current[timerKey] = setInterval(() => {
      setQuests((p) => {
        const cur = p[buildingId][q.id];
        const np = cur.progress + inc;
        if (np >= 100) {
          clearInterval(timers.current[timerKey]);
          delete timers.current[timerKey];
          setGems((g) => g + q.reward);
          setLifetime((l) => l + q.reward);
          spawnPopup(q.reward);
          return {
            ...p,
            [buildingId]: {
              ...p[buildingId],
              [q.id]: {
                running: false,
                progress: 100,
                completedDate: q.repeat ? todayStr() : cur.completedDate,
                doneForever: q.repeat ? false : true,
              },
            },
          };
        }
        return { ...p, [buildingId]: { ...p[buildingId], [q.id]: { ...cur, progress: np } } };
      });
    }, step);
  }

  function spawnPopup(amount) {
    const id = ++popupSeq.current;
    const xOffset = 40 + Math.random() * 20;
    setPopups((p) => [...p, { id, amount, x: xOffset }]);
    setTimeout(() => setPopups((p) => p.filter((x) => x.id !== id)), 1100);
  }

  function doExchange({ amount, type }) {
    setGems((g) => g - amount);
    setExchanged((e) => e + amount);
    const rec = { id: Date.now(), amount, won: amount * GEM_TO_WON, type, time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) };
    setHistory((h) => [rec, ...h]);
  }

  function buyItem(item) {
    if (gems < item.cost) return false;
    setGems((g) => g - item.cost);
    setInventory((inv) => ({ ...inv, [item.id]: (inv[item.id] || 0) + 1 }));
    return true;
  }

  const go = useCallback((next) => setScreen(next), []);

  return (
    <div
      style={{
        fontFamily: "'DotGothic16', monospace",
        minHeight: "100vh",
        background: `repeating-linear-gradient(45deg, ${C.grass} 0 24px, ${C.grassDark} 24px 48px)`,
        color: C.ink,
        padding: "14px",
        boxSizing: "border-box",
      }}
    >
      <StyleBlock />

      {/* ---- 상단 HUD ---- */}
      <div style={{ maxWidth: 940, margin: "0 auto 12px" }}>
        <Panel style={{ padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🌱</span>
            <div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, color: C.inkSoft, lineHeight: 1.6 }}>LITTLE JUNIOR TOWN</div>
              <div style={{ fontSize: 13, color: C.inkSoft }}>작은 주니어 네이버 · 주민센터 에디션</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: C.inkSoft }}>보유 스타 젬</div>
              <GemBadge amount={gems} big />
            </div>
          </div>
        </Panel>
      </div>

      {/* ---- 화면 전환 ---- */}
      <div style={{ maxWidth: 940, margin: "0 auto" }}>
        {screen.type === "town" && (
          <TownView
            initial={townPos}
            onEnterHall={() => go({ type: "townhall" })}
            onEnterBuilding={(id) => go({ type: "building", id })}
            onEnterHouse={(id) => go({ type: "house", id })}
            onEnterSmall={(id) => go({ type: "small", id })}
          />
        )}

        {screen.type === "townhall" && (
          <TownHallView
            onBack={() => go({ type: "town" })}
            onEnterMeeting={(id) => go({ type: "meeting", id })}
            onEnterBank={() => go({ type: "bank" })}
            hallChat={hallChat}
            setHallChat={setHallChat}
          />
        )}

        {screen.type === "meeting" && (
          <MeetingRoomView
            room={MEETING_ROOMS.find((r) => r.id === screen.id)}
            state={rooms[screen.id]}
            setState={(updater) => setRooms((p) => ({ ...p, [screen.id]: typeof updater === "function" ? updater(p[screen.id]) : updater }))}
            onBack={() => go({ type: "townhall" })}
          />
        )}

        {screen.type === "building" && (
          <BuildingView
            building={LARGE_BUILDINGS.find((b) => b.id === screen.id)}
            quests={quests[screen.id]}
            now={now}
            popups={popups}
            onRun={(q) => runQuest(screen.id, q)}
            onBack={() => go({ type: "town" })}
          />
        )}

        {screen.type === "house" && (
          <HouseView
            house={HOUSES.find((h) => h.id === screen.id)}
            note={houseNotes[screen.id] || ""}
            setNote={(text) => setHouseNotes((p) => ({ ...p, [screen.id]: text }))}
            onBack={() => go({ type: "town" })}
          />
        )}

        {screen.type === "small" && screen.id === "gratitude" && (
          <GratitudeRoomView
            gems={gems}
            onBuy={buyItem}
            notes={gratitudeNotes}
            onAddNote={(n) => setGratitudeNotes((p) => [{ id: uid(), ...n }, ...p])}
            onBack={() => go({ type: "town" })}
          />
        )}

        {screen.type === "small" && screen.id === "heart" && (
          <HeartRoomView
            gems={gems}
            onPay={(cost) => { if (gems < cost) return false; setGems((g) => g - cost); return true; }}
            notes={heartNotes}
            onAddNote={(text) => setHeartNotes((p) => [{ id: uid(), text, time: new Date().toLocaleString("ko-KR") }, ...p])}
            onBack={() => go({ type: "town" })}
          />
        )}

        {screen.type === "small" && screen.id === "focus" && (
          <FocusRoomView
            quests={quests}
            chat={focusChat}
            setChat={setFocusChat}
            onGoBuilding={(id) => go({ type: "building", id })}
            onBack={() => go({ type: "town" })}
          />
        )}

        {screen.type === "small" && screen.id === "sleep" && <SleepRoomView onBack={() => go({ type: "town" })} />}

        {screen.type === "small" && screen.id === "smoking" && (
          <SmokingRoomView status={myStatus} setStatus={setMyStatus} onBack={() => go({ type: "town" })} />
        )}

        {screen.type === "bank" && (
          <BankView
            gems={gems}
            lifetime={lifetime}
            exchanged={exchanged}
            history={history}
            onExchange={doExchange}
            onBack={() => go({ type: "townhall" })}
          />
        )}
      </div>

      <div style={{ maxWidth: 940, margin: "14px auto 0", textAlign: "center", fontSize: 11, color: "rgba(42,30,20,0.65)" }}>
        프로토타입 데모 · 모든 &lsquo;환전/정산&rsquo;은 시뮬레이션이며 실제 금전 거래가 아닙니다.
      </div>
    </div>
  );
}

/* ============================== 마을 맵(허브) 뷰 =========================== */
function TownView({ initial, onEnterHall, onEnterBuilding, onEnterHouse, onEnterSmall }) {
  const worldW = 2600, worldH = 1700;
  const viewW = 900, viewH = 520;

  const hall = { cx: 1300, cy: 760 };
  const largeSpots = [
    { b: LARGE_BUILDINGS[0], cx: 1950, cy: 480 },
    { b: LARGE_BUILDINGS[1], cx: 2320, cy: 480 },
    { b: LARGE_BUILDINGS[2], cx: 1950, cy: 820 },
    { b: LARGE_BUILDINGS[3], cx: 2320, cy: 820 },
  ];
  const houseSpots = [
    { h: HOUSES[0], cx: 260, cy: 320 },
    { h: HOUSES[1], cx: 560, cy: 320 },
    { h: HOUSES[2], cx: 860, cy: 320 },
    { h: HOUSES[3], cx: 1160, cy: 320 },
    { h: HOUSES[4], cx: 260, cy: 620 },
    { h: HOUSES[5], cx: 560, cy: 620 },
    { h: HOUSES[6], cx: 860, cy: 620 },
    { h: HOUSES[7], cx: 1160, cy: 620 },
  ];
  const smallSpots = [
    { s: SMALL_BUILDINGS[0], cx: 400, cy: 1350 },
    { s: SMALL_BUILDINGS[1], cx: 750, cy: 1400 },
    { s: SMALL_BUILDINGS[2], cx: 1100, cy: 1350 },
    { s: SMALL_BUILDINGS[3], cx: 1450, cy: 1400 },
    { s: SMALL_BUILDINGS[4], cx: 1800, cy: 1350 },
  ];
  const board = { cx: 1620, cy: 1080 };

  const spots = useMemo(() => ([
    { type: "hall", id: "hall", cx: hall.cx, cy: hall.cy + 60, r: 100 },
    ...largeSpots.map((s) => ({ type: "building", id: s.b.id, cx: s.cx, cy: s.cy + 55, r: 85 })),
    ...houseSpots.map((s) => ({ type: "house", id: s.h.id, cx: s.cx, cy: s.cy + 45, r: 75 })),
    ...smallSpots.map((s) => ({ type: "small", id: s.s.id, cx: s.cx, cy: s.cy + 40, r: 75 })),
    { type: "board", id: "board", cx: board.cx, cy: board.cy + 30, r: 65 },
    // eslint-disable-next-line
  ]), []);

  const [boardOpen, setBoardOpen] = useState(false);

  const { pos, facing, moving, near, camX, camY } = useWalker({ worldW, worldH, viewW, viewH, spots, initial, active: !boardOpen });

  const enterHandler = useCallback((id) => {
    if (id === "hall") return onEnterHall();
    if (id === "board") return setBoardOpen(true);
    const largeMatch = largeSpots.find((s) => s.b.id === id);
    if (largeMatch) return onEnterBuilding(id);
    const houseMatch = houseSpots.find((s) => s.h.id === id);
    if (houseMatch) return onEnterHouse(id);
    const smallMatch = smallSpots.find((s) => s.s.id === id);
    if (smallMatch) return onEnterSmall(id);
    // eslint-disable-next-line
  }, [onEnterHall, onEnterBuilding, onEnterHouse, onEnterSmall]);

  useEnterKey(near, enterHandler, !boardOpen);

  return (
    <div>
      <Panel style={{ padding: "8px 14px", marginBottom: 10, fontSize: 12, color: C.inkSoft, textAlign: "center" }}>
        방향키 / WASD로 이동 · 가까이 가서 <b>스페이스</b> 또는 건물을 <b>클릭</b>해서 입장하세요 🏠
      </Panel>

      <CameraFrame
        viewW={viewW} viewH={viewH} worldW={worldW} worldH={worldH} camX={camX} camY={camY}
        floorStyle={{ background: `repeating-linear-gradient(45deg, ${C.grass} 0 26px, ${C.grassDark} 26px 52px)` }}
      >
        {/* 오솔길 */}
        <div style={{ position: "absolute", left: hall.cx - 620, top: hall.cy + 55, width: 1240, height: 26, background: C.path, opacity: 0.85 }} />
        <div style={{ position: "absolute", left: hall.cx - 10, top: 260, width: 26, height: hall.cy - 260 + 40, background: C.path, opacity: 0.85 }} />
        <div style={{ position: "absolute", left: hall.cx - 10, top: hall.cy, width: 26, height: 420, background: C.path, opacity: 0.85 }} />

        {/* 주민센터 */}
        <button
          onClick={() => enterHandler("hall")}
          className="map-obj house-obj"
          style={{ position: "absolute", left: hall.cx, top: hall.cy, transform: "translate(-50%,-30%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          {near === "hall" && <EnterPrompt />}
          <HallSprite />
        </button>

        {/* 대형건물 4곳 */}
        {largeSpots.map((s) => (
          <button
            key={s.b.id}
            onClick={() => enterHandler(s.b.id)}
            className="map-obj house-obj"
            style={{ position: "absolute", left: s.cx, top: s.cy, transform: "translate(-50%,-30%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            {near === s.b.id && <EnterPrompt />}
            <Sprite roof={s.b.roof} roofDk={s.b.roofDk} wall={s.b.wall} icon={s.b.icon} w={104} h={92} label={s.b.name} />
          </button>
        ))}

        {/* 집 8채 */}
        {houseSpots.map((s) => (
          <button
            key={s.h.id}
            onClick={() => enterHandler(s.h.id)}
            className="map-obj house-obj"
            style={{ position: "absolute", left: s.cx, top: s.cy, transform: "translate(-50%,-30%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            {near === s.h.id && <EnterPrompt />}
            <Sprite roof={s.h.roof} roofDk={s.h.roofDk} wall={s.h.wall} icon="🏠" w={78} h={68} label={s.h.name} />
          </button>
        ))}

        {/* 소형건물 5곳 */}
        {smallSpots.map((s) => (
          <button
            key={s.s.id}
            onClick={() => enterHandler(s.s.id)}
            className="map-obj house-obj"
            style={{ position: "absolute", left: s.cx, top: s.cy, transform: "translate(-50%,-30%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            {near === s.s.id && <EnterPrompt />}
            <Sprite roof={s.s.roof} roofDk={s.s.roofDk} wall={s.s.wall} icon={s.s.icon} w={64} h={56} label={s.s.name} />
          </button>
        ))}

        {/* 게시판 */}
        <button
          onClick={() => enterHandler("board")}
          className="map-obj house-obj"
          style={{ position: "absolute", left: board.cx, top: board.cy, transform: "translate(-50%,-30%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          {near === "board" && <EnterPrompt />}
          <BoardSprite />
        </button>

        {/* 플레이어 */}
        <div style={{ position: "absolute", left: pos.x, top: pos.y, transform: "translate(-50%,-70%)", zIndex: 5 }}>
          <Hero facing={facing} moving={moving} />
        </div>
      </CameraFrame>

      {boardOpen && <BulletinBoardModal onClose={() => setBoardOpen(false)} />}
    </div>
  );
}

/* ============================== 주민센터 내부 ============================== */
function TownHallView({ onBack, onEnterMeeting, onEnterBank, hallChat, setHallChat }) {
  const worldW = 1500, worldH = 820;
  const viewW = 900, viewH = 480;

  const bigTable = { cx: 380, cy: 480 };
  const coffee = { cx: 150, cy: 250 };
  const vending = { cx: 260, cy: 250 };
  const water = { cx: 370, cy: 250 };
  const bankDesk = { cx: 1300, cy: 620 };
  const roomDoors = [
    { r: MEETING_ROOMS[0], cx: 950, cy: 240 },
    { r: MEETING_ROOMS[1], cx: 1180, cy: 240 },
    { r: MEETING_ROOMS[2], cx: 1410, cy: 240 },
  ];

  const spots = useMemo(() => ([
    { type: "table", id: "table", cx: bigTable.cx, cy: bigTable.cy, r: 110 },
    { type: "amenity", id: "coffee", cx: coffee.cx, cy: coffee.cy, r: 55 },
    { type: "amenity", id: "vending", cx: vending.cx, cy: vending.cy, r: 55 },
    { type: "amenity", id: "water", cx: water.cx, cy: water.cy, r: 55 },
    { type: "bank", id: "bank", cx: bankDesk.cx, cy: bankDesk.cy, r: 90 },
    ...roomDoors.map((d) => ({ type: "meeting", id: d.r.id, cx: d.cx, cy: d.cy + 40, r: 75 })),
    // eslint-disable-next-line
  ]), []);

  const [chatOpen, setChatOpen] = useState(false);
  const [amenityMsg, setAmenityMsg] = useState(null);

  const { pos, facing, moving, near } = useWalker({
    worldW, worldH, viewW, viewH, spots, initial: { x: 380, y: 620 }, active: !chatOpen,
  });
  const camX = Math.max(0, Math.min(worldW - viewW, pos.x - viewW / 2));
  const camY = Math.max(0, Math.min(worldH - viewH, pos.y - viewH / 2));

  const enterHandler = useCallback((id) => {
    if (id === "table") { setChatOpen(true); return; }
    if (id === "bank") { onEnterBank(); return; }
    if (id === "coffee") { setAmenityMsg("☕ 따뜻한 커피 한 잔, 잠깐 쉬어가요."); return; }
    if (id === "vending") { setAmenityMsg("🥤 자판기에서 시원한 음료를 뽑았어요!"); return; }
    if (id === "water") { setAmenityMsg("🚰 시원한 물 한 잔 마시고 다시 힘내볼까요."); return; }
    const room = MEETING_ROOMS.find((r) => r.id === id);
    if (room) { onEnterMeeting(id); return; }
  }, [onEnterBank, onEnterMeeting]);

  useEnterKey(near, enterHandler, !chatOpen);

  useEffect(() => {
    if (!amenityMsg) return undefined;
    const t = setTimeout(() => setAmenityMsg(null), 1800);
    return () => clearTimeout(t);
  }, [amenityMsg]);

  return (
    <div>
      <ScreenHeader title="주민센터" subtitle="마을의 중심 — 큰 테이블 · 회의실 3개 · 환전 창구" icon="🏛️" onBack={onBack} />
      <Panel style={{ padding: "8px 14px", marginBottom: 10, fontSize: 12, color: C.inkSoft, textAlign: "center" }}>
        이동 후 <b>스페이스</b> 또는 오브젝트를 <b>클릭</b> — 큰 테이블(대화/채팅) · 회의실 문(예약/화상) · 탕비실 · 환전 창구
      </Panel>

      <CameraFrame viewW={viewW} viewH={viewH} worldW={worldW} worldH={worldH} camX={camX} camY={camY} floorStyle={{ background: `repeating-linear-gradient(0deg, ${C.floor} 0 20px, ${C.floorLine} 20px 21px)` }}>
        {/* 탕비실 구역 */}
        <div style={{ position: "absolute", left: 60, top: 140, width: 380, height: 170, border: `3px dashed ${C.parchEdge}` }} />
        <div style={{ position: "absolute", left: 70, top: 148, fontSize: 11, color: C.inkSoft }}>탕비실</div>
        {[
          { pos: coffee, icon: "☕", label: "커피포트" },
          { pos: vending, icon: "🥤", label: "자판기" },
          { pos: water, icon: "🚰", label: "정수기" },
        ].map((a) => (
          <button key={a.label} onClick={() => enterHandler(a.label === "커피포트" ? "coffee" : a.label === "자판기" ? "vending" : "water")}
            className="map-obj" style={{ position: "absolute", left: a.pos.cx, top: a.pos.cy, transform: "translate(-50%,-50%)", background: "none", border: "none", cursor: "pointer" }}>
            {near === (a.label === "커피포트" ? "coffee" : a.label === "자판기" ? "vending" : "water") && <EnterPrompt />}
            <div style={{ width: 60, height: 70, background: C.white, border: `3px solid ${C.ink}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <span style={{ fontSize: 26 }}>{a.icon}</span>
              <span style={{ fontSize: 9 }}>{a.label}</span>
            </div>
          </button>
        ))}

        {/* 큰 테이블 */}
        <button onClick={() => enterHandler("table")} className="map-obj" style={{ position: "absolute", left: bigTable.cx, top: bigTable.cy, transform: "translate(-50%,-50%)", background: "none", border: "none", cursor: "pointer" }}>
          {near === "table" && <EnterPrompt text="스페이스로 대화/채팅 참여" />}
          <div style={{ width: 260, height: 140, background: "#c9975f", border: `4px solid ${C.ink}`, borderRadius: 70, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `inset 0 0 0 4px #b1824c` }}>
            <span style={{ fontSize: 30 }}>🪑🗣️🪑</span>
          </div>
          <div style={{ textAlign: "center", marginTop: 4, fontSize: 11, background: C.ink, color: C.white, padding: "2px 8px", display: "inline-block" }}>큰 테이블</div>
        </button>

        {/* 회의실 문 3개 */}
        {roomDoors.map((d) => (
          <button key={d.r.id} onClick={() => enterHandler(d.r.id)} className="map-obj" style={{ position: "absolute", left: d.cx, top: d.cy, transform: "translate(-50%,-40%)", background: "none", border: "none", cursor: "pointer" }}>
            {near === d.r.id && <EnterPrompt />}
            <Sprite roof={C.bankRoof} roofDk={C.bankRoofDk} wall="#eef4f8" icon="🚪" w={92} h={84} label={d.r.name} />
          </button>
        ))}

        {/* 환전 창구 */}
        <button onClick={() => enterHandler("bank")} className="map-obj" style={{ position: "absolute", left: bankDesk.cx, top: bankDesk.cy, transform: "translate(-50%,-50%)", background: "none", border: "none", cursor: "pointer" }}>
          {near === "bank" && <EnterPrompt />}
          <div style={{ width: 150, height: 90, background: C.parch, border: `4px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 26 }}>🏦</span>
            <span style={{ fontSize: 11 }}>환전 창구</span>
          </div>
        </button>

        {/* 플레이어 */}
        <div style={{ position: "absolute", left: pos.x, top: pos.y, transform: "translate(-50%,-70%)", zIndex: 5 }}>
          <Hero facing={facing} moving={moving} />
        </div>
      </CameraFrame>

      {amenityMsg && (
        <div style={{ maxWidth: 900, margin: "10px auto 0" }}>
          <Panel style={{ padding: "10px 14px", fontSize: 13, textAlign: "center" }}>{amenityMsg}</Panel>
        </div>
      )}

      {chatOpen && <TableChatModal messages={hallChat} setMessages={setHallChat} onClose={() => setChatOpen(false)} />}
    </div>
  );
}

function TableChatModal({ messages, setMessages, onClose, title = "큰 테이블 대화" }) {
  const [text, setText] = useState("");
  const listRef = useRef(null);
  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [messages]);
  function send() {
    const t = text.trim();
    if (!t) return;
    setMessages((p) => [...p, { id: uid(), who: "나", text: t }]);
    setText("");
  }
  return (
    <Modal onClose={onClose} maxWidth={520}>
      <Panel style={{ padding: 16 }}>
        <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, marginBottom: 12 }}>🗣️ {title}</div>
        <div ref={listRef} style={{ height: 260, overflowY: "auto", background: C.white, border: `3px solid ${C.ink}`, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          {messages.length === 0 && <div style={{ fontSize: 12, color: C.inkSoft, textAlign: "center", marginTop: 20 }}>아직 대화가 없어요. 첫 메시지를 남겨보세요!</div>}
          {messages.map((m) => (
            <div key={m.id} style={{ fontSize: 13 }}>
              <b style={{ color: m.who === "나" ? C.good : C.bankRoof }}>{m.who}</b> <span style={{ color: C.inkSoft }}>·</span> {m.text}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder="메시지를 입력하세요"
            style={{ flex: 1, padding: "10px", fontFamily: "'DotGothic16', monospace", fontSize: 14, border: `3px solid ${C.ink}`, background: C.white, color: C.ink }}
          />
          <PxButton tone="good" onClick={send} style={{ padding: "10px 16px" }}>전송</PxButton>
        </div>
        <div style={{ marginTop: 10, textAlign: "right" }}>
          <PxButton tone="ink" onClick={onClose} style={{ padding: "8px 14px", fontSize: 12 }}>닫기</PxButton>
        </div>
      </Panel>
    </Modal>
  );
}

/* ============================== 회의실 화면 ================================ */
function MeetingRoomView({ room, state, setState, onBack }) {
  const [form, setForm] = useState({ title: "", who: "", slot: TIME_SLOTS[0] });
  const today = todayStr();

  if (!room || !state) return null;

  function book() {
    if (!form.title.trim() || !form.who.trim()) return;
    if (state.reservations.some((r) => r.slot === form.slot && r.date === today)) return;
    setState((p) => ({ ...p, reservations: [...p.reservations, { id: uid(), date: today, slot: form.slot, title: form.title.trim(), who: form.who.trim() }] }));
    setForm({ title: "", who: "", slot: TIME_SLOTS[0] });
  }
  function cancelRes(id) {
    setState((p) => ({ ...p, reservations: p.reservations.filter((r) => r.id !== id) }));
  }
  function toggleLock() { setState((p) => ({ ...p, locked: !p.locked })); }

  const todays = state.reservations.filter((r) => r.date === today).sort((a, b) => TIME_SLOTS.indexOf(a.slot) - TIME_SLOTS.indexOf(b.slot));
  const bookedSlots = new Set(todays.map((r) => r.slot));

  return (
    <div>
      <ScreenHeader
        title={room.name}
        subtitle={`정원 ${room.cap}명 · ${state.locked ? "🔒 잠김" : "🔓 열림"}`}
        icon="🚪"
        onBack={onBack}
        right={<PxButton tone={state.locked ? "danger" : "good"} onClick={toggleLock} style={{ padding: "8px 14px", fontSize: 12 }}>{state.locked ? "🔒 잠금 해제" : "🔓 방 잠그기"}</PxButton>}
      />

      {/* 회의실은 다른 건물처럼 별도 화면으로 표시됩니다 */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 12 }}>
        <Panel style={{ padding: 16 }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, marginBottom: 10 }}>📹 화상회의</div>
          <div style={{ background: "#1c1c1c", height: 220, position: "relative", border: `3px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {state.locked && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: 13 }}>
                🔒 잠긴 방입니다
              </div>
            )}
            <div style={{ color: C.white, textAlign: "center", fontSize: 13 }}>
              {state.call ? (state.cam ? "🧑 내 카메라 On" : "🔇 카메라 Off · 통화 중") : "통화 대기 중"}
              {state.screenShare && <div style={{ marginTop: 8, background: "#2a2a2a", padding: "10px 16px", fontSize: 11 }}>🖥️ 화면 공유 중...</div>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <PxButton tone={state.call ? "danger" : "good"} onClick={() => setState((p) => ({ ...p, call: !p.call }))} style={{ padding: "10px 14px", fontSize: 12 }}>
              {state.call ? "📴 통화 종료" : "📞 통화 시작"}
            </PxButton>
            <PxButton tone={state.cam ? "gold" : "wood"} disabled={!state.call} onClick={() => setState((p) => ({ ...p, cam: !p.cam }))} style={{ padding: "10px 14px", fontSize: 12 }}>
              {state.cam ? "🧑 얼굴 On" : "🙈 얼굴 Off"}
            </PxButton>
            <PxButton tone={state.screenShare ? "gold" : "wood"} disabled={!state.call} onClick={() => setState((p) => ({ ...p, screenShare: !p.screenShare }))} style={{ padding: "10px 14px", fontSize: 12 }}>
              {state.screenShare ? "🖥️ 공유 중지" : "🖥️ 화면 공유"}
            </PxButton>
          </div>
        </Panel>

        <Panel style={{ padding: 16 }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, marginBottom: 10 }}>📅 오늘 예약 ({today})</div>
          <div style={{ display: "grid", gap: 6, maxHeight: 150, overflowY: "auto" }}>
            {todays.length === 0 && <div style={{ fontSize: 12, color: C.inkSoft }}>오늘 예약이 없습니다.</div>}
            {todays.map((r) => (
              <div key={r.id} style={{ background: C.white, border: `2px solid ${C.ink}`, padding: "6px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                <span><b>{r.slot}</b> · {r.title} ({r.who})</span>
                <button onClick={() => cancelRes(r.id)} style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", fontSize: 12 }}>취소</button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14, borderTop: `2px dashed ${C.parchEdge}`, paddingTop: 12 }}>
            <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 6 }}>새 예약</div>
            <div style={{ display: "grid", gap: 6 }}>
              <input placeholder="회의 제목" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                style={{ padding: 8, fontFamily: "'DotGothic16', monospace", border: `2px solid ${C.ink}`, background: C.white }} />
              <input placeholder="예약자 이름" value={form.who} onChange={(e) => setForm((f) => ({ ...f, who: e.target.value }))}
                style={{ padding: 8, fontFamily: "'DotGothic16', monospace", border: `2px solid ${C.ink}`, background: C.white }} />
              <select value={form.slot} onChange={(e) => setForm((f) => ({ ...f, slot: e.target.value }))}
                style={{ padding: 8, fontFamily: "'DotGothic16', monospace", border: `2px solid ${C.ink}`, background: C.white }}>
                {TIME_SLOTS.map((s) => (
                  <option key={s} value={s} disabled={bookedSlots.has(s)}>{s} {bookedSlots.has(s) ? "(예약됨)" : ""}</option>
                ))}
              </select>
              <PxButton tone="good" onClick={book} style={{ padding: "10px", fontSize: 12 }}>✅ 예약하기</PxButton>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ============================== 대형건물(퀘스트) 화면 ======================= */
function BuildingView({ building, quests, now, popups, onRun, onBack }) {
  if (!building || !quests) return null;
  const today = todayStr();
  return (
    <div>
      <ScreenHeader title={building.name} subtitle={building.subtitle} icon={building.icon} onBack={onBack} />
      <Panel style={{ padding: 16, position: "relative" }}>
        <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 12 }}>{building.blurb}</div>
        <div style={{ display: "grid", gap: 10 }}>
          {building.quests.map((q) => {
            const st = quests[q.id];
            const doneToday = q.repeat && st.completedDate === today;
            const doneForever = !q.repeat && st.doneForever;
            const locked = doneToday || doneForever;
            return (
              <div key={q.id} style={{ background: C.white, border: `3px solid ${C.ink}`, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: "bold", fontSize: 14 }}>
                      {q.title} {q.repeat ? <span style={{ fontSize: 10, background: C.bankRoof, color: C.white, padding: "2px 6px", marginLeft: 4 }}>매일 반복</span> : <span style={{ fontSize: 10, background: C.gem, color: C.ink, padding: "2px 6px", marginLeft: 4 }}>1회성</span>}
                    </div>
                    <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 3 }}>{q.desc}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <GemBadge amount={q.reward} />
                    <PxButton
                      tone={locked ? "ink" : "good"}
                      disabled={st.running || locked}
                      onClick={() => onRun(q)}
                      style={{ padding: "9px 14px", fontSize: 12 }}
                    >
                      {doneForever ? "완료됨" : doneToday ? "오늘 완료 ✓" : st.running ? "진행 중..." : "수행하기"}
                    </PxButton>
                  </div>
                </div>
                {st.running && (
                  <div style={{ marginTop: 8, height: 10, background: C.parchLine, border: `2px solid ${C.ink}` }}>
                    <div style={{ width: `${st.progress}%`, height: "100%", background: C.good, transition: "width .05s linear" }} />
                  </div>
                )}
                {doneToday && <div style={{ marginTop: 6, fontSize: 11, color: C.inkSoft }}>내일 다시 수행할 수 있어요.</div>}
              </div>
            );
          })}
        </div>

        {popups.map((p) => (
          <div key={p.id} className="gem-pop" style={{ position: "absolute", left: `${p.x}%`, top: 40, fontFamily: "'Press Start 2P', monospace", fontSize: 13, color: "#a86e13", pointerEvents: "none" }}>
            +{p.amount}⭐
          </div>
        ))}
      </Panel>
    </div>
  );
}

/* ============================== 집 내부 화면 ================================ */
function HouseView({ house, note, setNote, onBack }) {
  const [deskOpen, setDeskOpen] = useState(false);
  const [flash, setFlash] = useState(null);
  if (!house) return null;

  function poke(msg) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 1400);
  }

  return (
    <div>
      <ScreenHeader title={house.name} subtitle={`${house.owner}의 집`} icon="🏠" onBack={onBack} />
      <Panel style={{ padding: 16 }}>
        <div style={{ position: "relative", width: "100%", maxWidth: 760, margin: "0 auto", height: 380, background: C.floor, border: `4px solid ${C.ink}`, boxShadow: `inset 0 0 0 4px ${C.floorLine}` }}>
          {/* 벽지 라인 */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 60, background: house.wall, borderBottom: `3px solid ${C.ink}` }} />

          {/* 침대 */}
          <button onClick={() => poke("🛏️ 폭신폭신, 잠깐 눕고 싶네요.")} style={{ position: "absolute", left: 24, top: 80, background: "none", border: "none", cursor: "pointer" }}>
            <div style={{ width: 130, height: 90, background: "#e8a6a6", border: `3px solid ${C.ink}`, position: "relative" }}>
              <div style={{ position: "absolute", left: 6, top: 6, width: 34, height: 24, background: C.white, border: `2px solid ${C.ink}` }} />
            </div>
            <div style={{ textAlign: "center", fontSize: 11, marginTop: 4 }}>침대</div>
          </button>

          {/* 소파 */}
          <button onClick={() => poke("🛋️ 폭 앉으니 편안해요.")} style={{ position: "absolute", left: 220, top: 220, background: "none", border: "none", cursor: "pointer" }}>
            <div style={{ width: 140, height: 70, background: "#8fae6b", border: `3px solid ${C.ink}`, borderRadius: 8 }} />
            <div style={{ textAlign: "center", fontSize: 11, marginTop: 4 }}>소파</div>
          </button>

          {/* 티비 */}
          <button onClick={() => poke("📺 오늘 저녁 뉴스가 나오고 있어요.")} style={{ position: "absolute", left: 250, top: 90, background: "none", border: "none", cursor: "pointer" }}>
            <div style={{ width: 100, height: 66, background: "#2a2a2a", border: `3px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: 18 }}>📺</div>
            <div style={{ textAlign: "center", fontSize: 11, marginTop: 4 }}>티비</div>
          </button>

          {/* 책상 */}
          <button onClick={() => setDeskOpen(true)} style={{ position: "absolute", right: 24, top: 220, background: "none", border: "none", cursor: "pointer" }}>
            <div style={{ width: 150, height: 80, background: C.wood, border: `3px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: 22 }}>📝</div>
            <div style={{ textAlign: "center", fontSize: 11, marginTop: 4 }}>책상 (메모장)</div>
          </button>
        </div>

        {flash && <div style={{ marginTop: 12, textAlign: "center", fontSize: 13, color: C.inkSoft }}>{flash}</div>}
      </Panel>

      {deskOpen && (
        <Modal onClose={() => setDeskOpen(false)} maxWidth={480}>
          <Panel style={{ padding: 16 }}>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, marginBottom: 10 }}>📝 {house.owner}의 메모장</div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="여기에 개인 메모를 자유롭게 남겨보세요..."
              rows={8}
              style={{ width: "100%", boxSizing: "border-box", padding: 10, fontFamily: "'DotGothic16', monospace", fontSize: 14, border: `3px solid ${C.ink}`, background: C.white, resize: "vertical" }}
            />
            <div style={{ marginTop: 10, textAlign: "right" }}>
              <PxButton tone="good" onClick={() => setDeskOpen(false)} style={{ padding: "9px 16px", fontSize: 12 }}>저장하고 닫기</PxButton>
            </div>
          </Panel>
        </Modal>
      )}
    </div>
  );
}

/* ============================== 감사의 방 ================================== */
function GratitudeRoomView({ gems, onBuy, notes, onAddNote, onBack }) {
  const [shopOpen, setShopOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [form, setForm] = useState({ to: "", message: "" });
  const [buyFlash, setBuyFlash] = useState(null);

  function submitNote() {
    if (!form.to.trim() || !form.message.trim()) return;
    onAddNote({ to: form.to.trim(), message: form.message.trim() });
    setForm({ to: "", message: "" });
    setNoteOpen(false);
  }

  return (
    <div>
      <ScreenHeader title="감사의 방" subtitle="고마운 마음을 물건과 편지로 전해요" icon="🙏" onBack={onBack} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Panel style={{ padding: 16 }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, marginBottom: 10 }}>🧓 선반 &amp; 테이블</div>
          <button onClick={() => setShopOpen(true)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <div style={{ width: 90, height: 130, background: "#c9975f", border: `3px solid ${C.ink}`, display: "grid", gridTemplateRows: "repeat(3,1fr)", gap: 4, padding: 4 }}>
                <div style={{ background: C.white, border: `1px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>✉️</div>
                <div style={{ background: C.white, border: `1px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🍰</div>
                <div style={{ background: C.white, border: `1px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🌷</div>
              </div>
              <div style={{ width: 120, height: 60, background: C.wood, border: `3px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🧓</div>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: C.inkSoft }}>클릭해서 물건을 구매해보세요</div>
          </button>
        </Panel>

        <Panel style={{ padding: 16 }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, marginBottom: 10 }}>🗒️ 감사 칠판</div>
          <button onClick={() => setNoteOpen(true)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer" }}>
            <div style={{ minHeight: 150, background: "#3a4a3a", border: `4px solid ${C.woodDark}`, padding: 10, display: "flex", flexWrap: "wrap", gap: 6, alignContent: "flex-start" }}>
              {notes.length === 0 && <div style={{ color: "#dfe8df", fontSize: 12 }}>아직 붙은 감사 편지가 없어요. 클릭해서 첫 편지를 남겨보세요!</div>}
              {notes.map((n) => (
                <div key={n.id} style={{ background: "#fff4a8", width: 110, minHeight: 80, padding: 6, fontSize: 10, border: `1px solid #d8c866`, transform: `rotate(${(n.id.charCodeAt(0) % 5) - 2}deg)`, boxShadow: "2px 2px 3px rgba(0,0,0,0.3)" }}>
                  <b>To. {n.to}</b>
                  <div style={{ marginTop: 4 }}>{n.message}</div>
                </div>
              ))}
            </div>
          </button>
        </Panel>
      </div>

      {shopOpen && (
        <Modal onClose={() => setShopOpen(false)} maxWidth={480}>
          <Panel style={{ padding: 16 }}>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, marginBottom: 10 }}>🛍️ 물건 구매 (보유 {gems}⭐)</div>
            <div style={{ display: "grid", gap: 8 }}>
              {SHOP_ITEMS.map((it) => (
                <div key={it.id} style={{ background: C.white, border: `2px solid ${C.ink}`, padding: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13 }}>{it.icon} <b>{it.name}</b></div>
                    <div style={{ fontSize: 11, color: C.inkSoft }}>{it.desc}</div>
                  </div>
                  <PxButton tone="gold" disabled={gems < it.cost} onClick={() => { const ok = onBuy(it); setBuyFlash(ok ? `${it.name} 구매 완료!` : "젬이 부족해요"); setTimeout(() => setBuyFlash(null), 1200); }} style={{ padding: "8px 12px", fontSize: 12 }}>
                    {it.cost}⭐
                  </PxButton>
                </div>
              ))}
            </div>
            {buyFlash && <div style={{ marginTop: 10, textAlign: "center", fontSize: 12, color: C.good }}>{buyFlash}</div>}
            <div style={{ marginTop: 12, textAlign: "right" }}>
              <PxButton tone="ink" onClick={() => setShopOpen(false)} style={{ padding: "8px 14px", fontSize: 12 }}>닫기</PxButton>
            </div>
          </Panel>
        </Modal>
      )}

      {noteOpen && (
        <Modal onClose={() => setNoteOpen(false)} maxWidth={420}>
          <Panel style={{ padding: 16 }}>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, marginBottom: 10 }}>💌 감사 편지 남기기</div>
            <input placeholder="누구에게? (예: 도희)" value={form.to} onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))}
              style={{ width: "100%", boxSizing: "border-box", padding: 8, fontFamily: "'DotGothic16', monospace", border: `2px solid ${C.ink}`, marginBottom: 8 }} />
            <textarea placeholder="감사한 마음을 적어주세요" rows={4} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              style={{ width: "100%", boxSizing: "border-box", padding: 8, fontFamily: "'DotGothic16', monospace", border: `2px solid ${C.ink}` }} />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <PxButton tone="ink" onClick={() => setNoteOpen(false)} style={{ flex: 1, padding: 10, fontSize: 12 }}>취소</PxButton>
              <PxButton tone="good" onClick={submitNote} style={{ flex: 1, padding: 10, fontSize: 12 }}>칠판에 붙이기</PxButton>
            </div>
          </Panel>
        </Modal>
      )}
    </div>
  );
}

/* ============================== 마음의 방 ================================== */
function HeartRoomView({ gems, onPay, notes, onAddNote, onBack }) {
  const [open, setOpen] = useState(false);
  const [cost, setCost] = useState(0.5);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState(null);

  function submit() {
    if (!text.trim()) return;
    const ok = onPay(cost);
    if (!ok) { setMsg("젬이 부족해요 😢"); return; }
    onAddNote(text.trim());
    setText("");
    setOpen(false);
    setMsg("마음우체통에 익명으로 잘 전달됐어요.");
    setTimeout(() => setMsg(null), 2000);
  }

  return (
    <div>
      <ScreenHeader title="마음의 방" subtitle="퇴근길 마음속 이야기를 살짝 털어놓는 곳" icon="💌" onBack={onBack} />
      <Panel style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button onClick={() => setOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", textAlign: "center" }}>
            <div style={{ width: 100, height: 120, background: C.danger, border: `4px solid ${C.ink}`, borderRadius: "10px 10px 4px 4px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, margin: "0 auto" }}>📮</div>
            <div style={{ marginTop: 8, fontSize: 12 }}>마음우체통 (클릭)</div>
          </button>
        </div>
        {msg && <div style={{ marginTop: 12, textAlign: "center", fontSize: 13, color: C.good }}>{msg}</div>}

        <div style={{ marginTop: 18, fontFamily: "'Press Start 2P', monospace", fontSize: 10, marginBottom: 8 }}>📬 최근 익명 사연</div>
        <div style={{ display: "grid", gap: 8, maxHeight: 220, overflowY: "auto" }}>
          {notes.length === 0 && <div style={{ fontSize: 12, color: C.inkSoft, textAlign: "center" }}>아직 도착한 사연이 없어요.</div>}
          {notes.map((n) => (
            <div key={n.id} style={{ background: C.white, border: `2px solid ${C.ink}`, padding: "8px 10px", fontSize: 12 }}>
              <div style={{ color: C.inkSoft, fontSize: 10 }}>익명 · {n.time}</div>
              <div style={{ marginTop: 4 }}>{n.text}</div>
            </div>
          ))}
        </div>
      </Panel>

      {open && (
        <Modal onClose={() => setOpen(false)} maxWidth={420}>
          <Panel style={{ padding: 16 }}>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, marginBottom: 10 }}>📮 익명 사연 남기기 (보유 {gems}⭐)</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {[0.5, 1].map((c) => (
                <PxButton key={c} tone={cost === c ? "gold" : "wood"} onClick={() => setCost(c)} style={{ padding: "8px 14px", fontSize: 12 }}>{c}⭐</PxButton>
              ))}
            </div>
            <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="퇴근길 마음속 이야기를 적어보세요 (완전 익명입니다)"
              style={{ width: "100%", boxSizing: "border-box", padding: 8, fontFamily: "'DotGothic16', monospace", border: `2px solid ${C.ink}` }} />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <PxButton tone="ink" onClick={() => setOpen(false)} style={{ flex: 1, padding: 10, fontSize: 12 }}>취소</PxButton>
              <PxButton tone="good" onClick={submit} style={{ flex: 1, padding: 10, fontSize: 12 }}>우체통에 넣기 ({cost}⭐)</PxButton>
            </div>
          </Panel>
        </Modal>
      )}
    </div>
  );
}

/* ============================== 몰입의 방 ================================== */
function FocusRoomView({ quests, chat, setChat, onGoBuilding, onBack }) {
  const today = todayStr();
  const active = [];
  LARGE_BUILDINGS.forEach((b) => {
    b.quests.forEach((q) => {
      const st = quests[b.id][q.id];
      const doneToday = q.repeat && st.completedDate === today;
      const doneForever = !q.repeat && st.doneForever;
      if (!doneToday && !doneForever) active.push({ b, q, st });
    });
  });

  return (
    <div>
      <ScreenHeader title="몰입의 방" subtitle="각자 퀘스트하며 자유롭게 허들링하는 곳" icon="🎯" onBack={onBack} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Panel style={{ padding: 16 }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, marginBottom: 10 }}>📋 오늘의 진행 가능한 퀘스트</div>
          <div style={{ display: "grid", gap: 8, maxHeight: 320, overflowY: "auto" }}>
            {active.length === 0 && <div style={{ fontSize: 12, color: C.inkSoft }}>오늘 남은 퀘스트가 없어요. 대단해요!</div>}
            {active.map(({ b, q, st }) => (
              <div key={q.id} style={{ background: C.white, border: `2px solid ${C.ink}`, padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                <span>{b.icon} <b>{b.name}</b> · {q.title} {st.running && "(진행 중)"}</span>
                <PxButton tone="wood" onClick={() => onGoBuilding(b.id)} style={{ padding: "6px 10px", fontSize: 11 }}>이동</PxButton>
              </div>
            ))}
          </div>
        </Panel>
        <Panel style={{ padding: 16 }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, marginBottom: 10 }}>💬 허들 채팅</div>
          <MiniChat messages={chat} setMessages={setChat} />
        </Panel>
      </div>
    </div>
  );
}

function MiniChat({ messages, setMessages }) {
  const [text, setText] = useState("");
  function send() {
    const t = text.trim();
    if (!t) return;
    setMessages((p) => [...p, { id: uid(), who: "나", text: t }]);
    setText("");
  }
  return (
    <div>
      <div style={{ height: 200, overflowY: "auto", background: C.white, border: `2px solid ${C.ink}`, padding: 8, display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
        {messages.length === 0 && <div style={{ color: C.inkSoft, textAlign: "center", marginTop: 20 }}>편하게 이야기 나눠보세요.</div>}
        {messages.map((m) => (
          <div key={m.id}><b style={{ color: C.good }}>{m.who}</b> · {m.text}</div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} style={{ flex: 1, padding: 8, fontFamily: "'DotGothic16', monospace", border: `2px solid ${C.ink}` }} />
        <PxButton tone="good" onClick={send} style={{ padding: "8px 12px", fontSize: 12 }}>전송</PxButton>
      </div>
    </div>
  );
}

/* ============================== 수면의 방 / 흡연의 방 ======================= */
function SleepRoomView({ onBack }) {
  return (
    <div>
      <ScreenHeader title="수면의 방" subtitle="휴식 중이거나 집중 중입니다" icon="😴" onBack={onBack} />
      <Panel style={{ padding: 30, textAlign: "center" }}>
        <div style={{ fontSize: 44 }}>😴💤</div>
        <div style={{ marginTop: 10, fontSize: 14, color: C.inkSoft }}>이 방은 휴식·집중 용도예요. 조용히 지나가 주세요.</div>
      </Panel>
    </div>
  );
}

function SmokingRoomView({ status, setStatus, onBack }) {
  return (
    <div>
      <ScreenHeader title="흡연의 방" subtitle="잠깐 바람 쐬러 나가는 곳" icon="🚬" onBack={onBack} />
      <Panel style={{ padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 44 }}>🚬</div>
        <div style={{ marginTop: 10, fontSize: 14 }}>현재 상태: <b>{status.smoking ? "흡연 중" : "쉬는 중 아님"}</b></div>
        <PxButton tone={status.smoking ? "danger" : "wood"} onClick={() => setStatus((s) => ({ ...s, smoking: !s.smoking }))} style={{ marginTop: 14, padding: "10px 18px", fontSize: 13 }}>
          {status.smoking ? "흡연 종료" : "흡연 시작"}
        </PxButton>
      </Panel>
    </div>
  );
}

/* ============================== 게시판(캘린더/공지) ========================= */
function BulletinBoardModal({ onClose }) {
  const [tab, setTab] = useState("calendar");
  const [selDay, setSelDay] = useState(31);
  const [noticeOpen, setNoticeOpen] = useState(null);

  const year = 2026, month = 7; // 2026년 7월
  const firstDow = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dateKey = (d) => `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return (
    <Modal onClose={onClose} maxWidth={560}>
      <Panel style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11 }}>📌 게시판</div>
          <PxButton tone="ink" onClick={onClose} style={{ padding: "6px 12px", fontSize: 11 }}>닫기</PxButton>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <PxButton tone={tab === "calendar" ? "gold" : "wood"} onClick={() => setTab("calendar")} style={{ padding: "8px 14px", fontSize: 12 }}>📅 캘린더</PxButton>
          <PxButton tone={tab === "notice" ? "gold" : "wood"} onClick={() => setTab("notice")} style={{ padding: "8px 14px", fontSize: 12 }}>📢 공지사항</PxButton>
        </div>

        {tab === "calendar" && (
          <div>
            <div style={{ textAlign: "center", fontFamily: "'Press Start 2P', monospace", fontSize: 12, marginBottom: 10 }}>2026년 7월</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, fontSize: 11, textAlign: "center", marginBottom: 4, color: C.inkSoft }}>
              {["일", "월", "화", "수", "목", "금", "토"].map((d) => <div key={d}>{d}</div>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
              {cells.map((d, i) => {
                if (d === null) return <div key={i} />;
                const key = dateKey(d);
                const hasEvent = !!MOCK_EVENTS[key];
                const isMarked = d === 31; // 7월 31일 빨간 동그라미
                const selected = selDay === d;
                return (
                  <button key={i} onClick={() => setSelDay(d)}
                    style={{
                      position: "relative", padding: "8px 0", background: selected ? C.gemGlow : C.white,
                      border: `2px solid ${C.ink}`, cursor: "pointer", fontSize: 12, fontFamily: "'DotGothic16', monospace",
                    }}>
                    {d}
                    {hasEvent && <div style={{ position: "absolute", bottom: 3, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: "50%", background: C.bankRoof }} />}
                    {isMarked && (
                      <div style={{ position: "absolute", inset: -2, border: `3px solid ${C.danger}`, borderRadius: "50%", pointerEvents: "none" }} />
                    )}
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 12, background: C.white, border: `2px solid ${C.ink}`, padding: 10, minHeight: 60, fontSize: 12 }}>
              <b>{month}월 {selDay}일 일정</b>
              <div style={{ marginTop: 6, color: C.inkSoft }}>
                {(MOCK_EVENTS[dateKey(selDay)] || ["등록된 일정이 없습니다."]).map((e, idx) => <div key={idx}>• {e}</div>)}
              </div>
            </div>
          </div>
        )}

        {tab === "notice" && !noticeOpen && (
          <div style={{ display: "grid", gap: 8, maxHeight: 320, overflowY: "auto" }}>
            {NOTICES.map((n) => (
              <button key={n.id} onClick={() => setNoticeOpen(n)} style={{ textAlign: "left", background: C.white, border: `2px solid ${C.ink}`, padding: "10px 12px", cursor: "pointer", fontFamily: "'DotGothic16', monospace" }}>
                <div style={{ fontSize: 11, color: C.inkSoft }}>{n.date}</div>
                <div style={{ fontSize: 13, marginTop: 2 }}>{n.title}</div>
              </button>
            ))}
          </div>
        )}

        {tab === "notice" && noticeOpen && (
          <div>
            <button onClick={() => setNoticeOpen(null)} style={{ background: "none", border: "none", color: C.inkSoft, cursor: "pointer", fontSize: 12, marginBottom: 8 }}>← 목록으로</button>
            <div style={{ background: C.white, border: `2px solid ${C.ink}`, padding: 14 }}>
              <div style={{ fontSize: 11, color: C.inkSoft }}>{noticeOpen.date}</div>
              <div style={{ fontSize: 15, fontWeight: "bold", marginTop: 4 }}>{noticeOpen.title}</div>
              <div style={{ fontSize: 13, marginTop: 10, lineHeight: 1.6 }}>{noticeOpen.body}</div>
            </div>
          </div>
        )}
      </Panel>
    </Modal>
  );
}

/* ============================== 환전 창구(기존 은행 기능) =================== */
function BankView({ gems, lifetime, exchanged, history, onExchange, onBack }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [flash, setFlash] = useState(null);
  const canWithdraw = gems >= 1;
  const validAmount = amount >= 1 && amount <= gems;

  function confirm() {
    if (!validAmount) return;
    onExchange({ amount, type: "리워드 포인트 적립" });
    setFlash({ amount, won: amount * GEM_TO_WON, type: "리워드 포인트 적립" });
    setOpen(false);
    setTimeout(() => setFlash(null), 2600);
  }

  return (
    <div>
      <ScreenHeader title="환전 창구" subtitle="주민센터 내 스타 젬 정산소" icon="🏦" onBack={onBack} />
      <Panel style={{ padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          <StatCard label="보유 스타 젬" value={gems} accent={C.gem} icon="⭐" />
          <StatCard label="총 채굴량 (누적)" value={lifetime} accent={C.good} icon="⛏" />
          <StatCard label="총 환전 젬" value={exchanged} accent={C.bankRoof} icon="🏦" />
        </div>

        <div style={{ marginTop: 14, background: C.white, border: `4px solid ${C.ink}`, boxShadow: `inset 0 0 0 3px ${C.parchEdge}`, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, marginBottom: 8 }}>EXCHANGE GATE</div>
              <div style={{ fontSize: 13 }}>환율 &nbsp;<b>1 ⭐ = {GEM_TO_WON.toLocaleString()}원</b></div>
              <div style={{ fontSize: 13, marginTop: 4, color: C.inkSoft }}>현재 보유 젬은 최대 <b>{(gems * GEM_TO_WON).toLocaleString()}원</b> 상당</div>
            </div>
            <PxButton tone={canWithdraw ? "danger" : "ink"} disabled={!canWithdraw} onClick={() => { setAmount(gems); setOpen(true); }} style={{ padding: "12px 18px", fontSize: 14 }}>
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
            ✅ 정산 완료(시뮬레이션): <b>{flash.amount.toLocaleString()} ⭐</b> → <b>{flash.won.toLocaleString()}원</b> · {flash.type}
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, marginBottom: 8 }}>SETTLEMENT LOG</div>
          {history.length === 0 ? (
            <div style={{ background: C.parch, border: `3px dashed ${C.ink}`, padding: 14, fontSize: 13, color: C.inkSoft, textAlign: "center" }}>
              아직 환전 내역이 없습니다. 대형건물에서 퀘스트를 깨고 ⭐를 모아 첫 정산을 신청해 보세요.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {history.map((h) => (
                <div key={h.id} style={{ background: C.parch, border: `2px solid ${C.ink}`, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6, fontSize: 13 }}>
                  <span>🧾 {h.time} · {h.type}</span>
                  <span><b>{h.amount.toLocaleString()} ⭐</b> → <b style={{ color: C.good }}>{h.won.toLocaleString()}원</b> <span style={{ fontSize: 10, background: C.good, color: C.white, padding: "2px 6px", marginLeft: 6 }}>정산 완료</span></span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 14, background: "rgba(192,86,58,0.12)", border: `3px dashed ${C.danger}`, padding: 10, fontSize: 12, color: C.inkSoft }}>
          ⚠️ 본 환전/정산 기능은 <b>프로토타입 시뮬레이션</b>입니다. 실제 금전 출금·현금화가 이루어지지 않으며, 실서비스 연동 시에는 관련 법규·본인인증·정산 정책이 별도로 필요합니다.
        </div>
      </Panel>

      {open && (
        <Modal onClose={() => setOpen(false)} maxWidth={420}>
          <Panel style={{ padding: 16 }}>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, marginBottom: 12 }}>💰 환전 신청</div>
            <label style={{ fontSize: 12, color: C.inkSoft }}>환전할 스타 젬 (보유 {gems.toLocaleString()})</label>
            <input type="number" value={amount} min={1} max={gems} onChange={(e) => setAmount(Math.floor(Number(e.target.value) || 0))}
              style={{ width: "100%", boxSizing: "border-box", marginTop: 6, padding: "10px", fontFamily: "'DotGothic16', monospace", fontSize: 16, border: `3px solid ${C.ink}`, background: C.white, color: C.ink }} />
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {[10, 50, 100].map((v) => (
                <PxButton key={v} tone="wood" disabled={v > gems} onClick={() => setAmount(v)} style={{ fontSize: 11, padding: "6px 10px" }}>{v}⭐</PxButton>
              ))}
              <PxButton tone="wood" disabled={gems < 1} onClick={() => setAmount(gems)} style={{ fontSize: 11, padding: "6px 10px" }}>전액</PxButton>
            </div>
            <div style={{ marginTop: 12, background: C.white, border: `3px solid ${C.ink}`, padding: 10, fontSize: 14, textAlign: "center" }}>
              {amount.toLocaleString()} ⭐ &nbsp;→&nbsp; <b style={{ color: C.good }}>{(amount * GEM_TO_WON).toLocaleString()}원</b>
            </div>
            {!validAmount && <div style={{ marginTop: 8, fontSize: 12, color: C.danger }}>{amount < 1 ? "1 젬 이상 입력하세요." : "보유 젬을 초과했습니다."}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <PxButton tone="ink" onClick={() => setOpen(false)} style={{ flex: 1, padding: "12px", fontSize: 13 }}>취소</PxButton>
              <PxButton tone="danger" disabled={!validAmount} onClick={confirm} style={{ flex: 1, padding: "12px", fontSize: 13 }}>환전 확정</PxButton>
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: "rgba(42,30,20,0.6)", textAlign: "center" }}>시뮬레이션 · 실제 현금 출금이 아닙니다.</div>
          </Panel>
        </Modal>
      )}
    </div>
  );
}

function StatCard({ label, value, accent, icon }) {
  return (
    <div style={{ background: C.white, border: `4px solid ${C.ink}`, boxShadow: `inset 0 0 0 3px ${C.parchEdge}`, padding: 12 }}>
      <div style={{ fontSize: 12, color: C.inkSoft }}>{icon} {label}</div>
      <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
        <b style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 16, color: accent === C.gem ? "#a86e13" : accent }}>{value.toLocaleString()}</b>
        <span style={{ fontSize: 12, color: C.inkSoft }}>⭐</span>
      </div>
    </div>
  );
}

/* ============================== 전역 CSS 주입 ============================= */
function StyleBlock() {
  return (
    <style>{`
      * { -webkit-tap-highlight-color: transparent; }
      button { font-family: 'DotGothic16', monospace; }
      .px-btn { transition: transform .05s ease, box-shadow .05s ease; }
      .px-btn:not(:disabled):active { transform: translateY(3px); box-shadow: none !important; }
      .px-btn:focus-visible { outline: 3px solid ${C.bankRoof}; outline-offset: 2px; }

      .map-obj { transition: transform .12s ease, filter .12s ease; }
      .map-obj:hover { transform: translate(-50%, -34%) scale(1.06); filter: drop-shadow(0 6px 0 rgba(0,0,0,.25)); }
      .house-obj:hover { transform: translate(-50%,-34%) scale(1.06); filter: drop-shadow(0 6px 0 rgba(0,0,0,.25)); }
      .map-obj:focus-visible { outline: 3px solid ${C.gem}; outline-offset: 4px; }

      @keyframes gemFloat {
        0%   { transform: translateY(0);   opacity: 0; }
        20%  { opacity: 1; }
        100% { transform: translateY(-46px); opacity: 0; }
      }
      .gem-pop { animation: gemFloat 1.1s ease-out forwards; }

      @keyframes bob { 0%,100%{ transform: translateY(0);} 50%{ transform: translateY(-3px);} }
      .hero-bob { animation: bob .35s steps(2) infinite; }

      @keyframes spin { 0%{ transform: rotate(0);} 100%{ transform: rotate(360deg);} }
      .gem-spin { display: inline-block; animation: spin 6s linear infinite; }

      @keyframes promptPulse { 0%,100%{ transform: translateX(-50%) translateY(0);} 50%{ transform: translateX(-50%) translateY(-3px);} }
      .enter-prompt { animation: promptPulse .8s ease-in-out infinite; }

      @media (prefers-reduced-motion: reduce) {
        .gem-pop, .hero-bob, .gem-spin, .enter-prompt, .px-btn, .map-obj { animation: none !important; transition: none !important; }
      }
    `}</style>
  );
}
