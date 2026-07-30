import React, { useState } from "react";

/* ============================================================================
 *  🎬 VideoProducts — 제품별 영상스쿨 콘텐츠 (관리자 폼 → 자동 생성)
 *    React 외 의존성 없음 (자립형 · 순환참조/TDZ 안전). 어디서든 재사용 가능.
 *
 *    제품 데이터 모델:
 *    { id, name, coreRule, impactTip,
 *      situations:[{tag,title,hook}], scripts:[전문…],
 *      refTone, refEdit:[…],
 *      editGuide:{ shorts:{top,bottom,side}, reels:{top,bottom,side} },
 *      sourceTools:[{name,icon,desc,link}], keywords:{ ko:[], zh:[] … },
 *      spec:{ length, ratio }, reward:{ submit, approve, bonus } }
 * ========================================================================== */

const P = { parch: "#f6efdd", edge: "#d8c9a6", ink: "#3a3228", soft: "#8a7f6a", white: "#fffdf6", accent: "#4f46e5", accentSoft: "#e0e2fc", accentDeep: "#3730a3", accent2: "#4f46e5", warn: "#e0a13d", pink: "#ffb8d2", pinkBg: "#ffe1ec", pinkInk: "#9d174d", gold: "#f0a900", goldDeep: "#a86b00", goldSoft: "#fff3d6", ok: "#4e9a3a", danger: "#c0563a", font: "var(--game-font, 'DotGothic16', monospace)" };
const btn = (bg, fg = "#fff") => ({ cursor: "pointer", fontFamily: P.font, fontSize: 12, fontWeight: "bold", padding: "7px 11px", borderRadius: 8, border: `2px solid ${P.ink}`, background: bg, color: fg });
const inp = { width: "100%", boxSizing: "border-box", fontFamily: P.font, fontSize: 12.5, padding: 8, border: `2px solid ${P.ink}`, borderRadius: 8, background: P.white, color: P.ink, resize: "vertical" };
const lbl = { fontSize: 12, fontWeight: "bold", color: P.ink, margin: "10px 0 4px" };
const hint = { fontSize: 10.5, color: P.soft, marginBottom: 4, lineHeight: 1.5 };

export const REWARD_DEFAULT = { submit: 2, approve: 2, bonus: 4 };
export function productReward(p) {
  const r = (p && p.reward) || {};
  return { submit: r.submit == null ? REWARD_DEFAULT.submit : r.submit, approve: r.approve == null ? REWARD_DEFAULT.approve : r.approve, bonus: r.bonus == null ? REWARD_DEFAULT.bonus : r.bonus };
}
export function emptyProduct() {
  return { id: "p" + Date.now(), name: "", coreRule: "", impactTip: "", situations: [], scripts: ["", ""], refTone: "", refEdit: [""], editGuide: { shorts: { top: 120, bottom: 320, side: 40 }, reels: { top: 140, bottom: 360, side: 60 } }, sourceTools: [], keywords: { ko: [] }, spec: { length: "30초", ratio: "9:16" }, reward: {} };
}

export const DEFAULT_PRODUCTS = [{
  id: "gohum", name: "고음확장기",
  coreRule: "사랑받고 싶고 인정받고 싶은 마음을 건들이기 — 타겟의 상상 속에서, 노래를 통해 이성에게(또는 주변 사람들에게) 어필하는 그 순간에 집중하세요.",
  impactTip: "영상 중간에 이런 자극도 넣어보세요 — “노래 한번 배우면 10년은 써먹는거 알아?” 같은 자존감 자극 대사나, 멋진 노래를 불렀을 때 주변 반응(“우와~” 같은 것)을 구체적으로 묘사하면 몰입도가 올라가요.",
  situations: [
    { tag: "학교", title: "학교 장기자랑 인생역전", hook: "소심했던 반에서 그냥 있는 애1이었는데, 담임쌤 추천으로 장기자랑 무대에 서고 나서 인생이 바뀐 이야기." },
    { tag: "행사", title: "행사 무대에서 다들 놀란 순간", hook: "행사 사회자가 갑자기 노래 시켰는데 예상 밖으로 잘 불러서 다들 놀라는 상황." },
    { tag: "노래방", title: "노래방에서 고음 실패 걱정", hook: "친구들이랑 노래방 왔는데 하이라이트 고음에서 삑사리 날까봐 마이크 잡기가 두려운 순간." },
    { tag: "회식", title: "회식 자리에서 노래 시킴", hook: "팀장님이 갑자기 한 곡 시켜서, 부담스럽지만 결국 무대에 서게 되는 회식 자리." },
    { tag: "버스킹", title: "버스킹 구경하다가 즉흥 참여", hook: "길거리 버스킹 구경하다가 얼떨결에 마이크를 넘겨받고 노래하게 되는 순간." },
    { tag: "코노", title: "코인노래방, 옆방이 구경하러 옴", hook: "코인노래방에서 부르는데 옆방 사람들이 궁금해서 구경하러 오는 민망하지만 뿌듯한 순간." },
    { tag: "술집", title: "술자리에서 한 곡 뽑을 때", hook: "술자리 분위기가 무르익고, 누군가 노래 한 곡 하라고 할 때의 그 부담과 짜릿함." },
    { tag: "결혼식", title: "축가 망칠까봐 불안한 신랑·신부", hook: "결혼식 축가, 고음에서 삑사리 나면 평생 놀림거리 — 그 공포를 극복하고 완창하는 이야기." },
  ],
  scripts: [
    "① 수학여행 인생역전\n수학여행에서 노래 불렀다가 인생역전.\n나 진짜 소심하고 반에 그냥 있는 애1 이었는데 담임쌤 추천으로 장기자랑 올라갔다가 진짜 바로 인생역전 됨..\n애들 다 계속 물어보고 여자애들도 연락오고. 노래 잘 부르는게 그렇게 큰가??\n나 그냥 이주동안 형이 쓰는 기구 몰래 쓴게 다인데.. 암튼 아직도 안믿긴다ㅋㅋㅋ\n다들 꼭 노래 연습해서 장기자랑 서봐..! 기구 뭔지 궁금하면 댓글로 따로 알려줄게",
    "② 썸녀 통화 노래\n썸녀 -> 여친 만들어준 노래 들어볼사람.\n썸녀랑 전화하는데 이상형이 노래 잘부르는 사람이라고 노래 불러달라는거야.\n근데 나 진짜 음치ㅜ 음색도 별로임. 그래서 일주일만 기다려달라 하고 미친듯이 검색하고 다님.\n인터넷에서 본 방법으로 딱 일주일 연습했더니 와.. 노래 실력 완전 늘었음 음색도 너무 좋아졌어.\n일주일 연습으로 되나? 싶은데 내가 그 증거야.. 여친 됐다니 아 너무 행복하다ㅎㅎ\n혹시 방법 알고 싶으면 댓글 달아줘",
  ],
  refTone: "https://www.instagram.com/p/DYADwGhAKl4/?igsh=NmxobzltbXcxMXJk",
  refEdit: ["https://www.instagram.com/p/DZB8B6AAE0y/?igsh=MWQxMnFiaWhmdXpzbg%3D%3D"],
  editGuide: { shorts: { top: 120, bottom: 320, side: 40 }, reels: { top: 140, bottom: 360, side: 60 } },
  sourceTools: [
    { name: "샤오홍슈", icon: "📕", desc: "중국 레퍼런스 탐색", link: "https://www.xiaohongshu.com" },
    { name: "도우인", icon: "🎵", desc: "숏폼 트렌드", link: "https://www.douyin.com" },
    { name: "국내 참고 채널", icon: "📺", desc: "톤·구성 벤치마크", link: "" },
    { name: "AI 영상 생성", icon: "🤖", desc: "컷/이미지 생성", link: "" },
    { name: "다운로드 툴", icon: "⬇️", desc: "영상 소스 저장", link: "" },
  ],
  keywords: { ko: ["고음 내는 법", "삑사리 교정", "발성 연습", "성대 결절", "노래 잘하는 법"], zh: ["高音技巧", "唱歌方法", "嗓音训练"] },
  spec: { length: "30초", ratio: "9:16" },
  reward: { submit: 2, approve: 2, bonus: 4 },
}];

/* ---------- 🎬 규격 배지 ---------- */
export function SpecBadge({ spec }) {
  const s = spec || {};
  if (!s.length && !s.ratio) return null;
  return <span style={{ fontSize: 10.5, fontWeight: "bold", color: "#fff", background: P.accent, border: `2px solid ${P.ink}`, borderRadius: 10, padding: "2px 9px" }}>🎬 {[s.length, s.ratio].filter(Boolean).join(" · ")}</span>;
}

/* ---------- 📖 튜토리얼 (4슬라이드 · 전체화면 팝업 · STEP0 온보딩) ---------- */
export function ProductTutorial({ product, open = false, onClose = () => {} }) {
  const [i, setI] = useState(0);
  React.useEffect(() => { if (open) setI(0); }, [open]);
  if (!open) return null;
  const p = product || {};
  const situations = p.situations || [];
  const scripts = (p.scripts || []).filter(Boolean);
  const refs = [];
  if (p.refTone) refs.push({ label: "레퍼런스 영상 1", sub: "원고 톤 참고용", url: p.refTone });
  (p.refEdit || []).filter(Boolean).forEach((u) => refs.push({ label: "레퍼런스 영상 " + (refs.length + 1), sub: "편집할 때 참고 (세이프존 가이드 관련)", url: u }));
  const box = { borderRadius: 12, padding: 12, fontSize: 12.5, lineHeight: 1.65 };
  const desc = { fontSize: 13, color: "#5a5570", lineHeight: 1.7 };
  const slides = [
    { eyebrow: "STEP 0 · 영상 코어 확인하기", title: "영상 만들기 전에, 코어부터 확인해요", body: (
      <div>
        <div style={desc}>모든 영상은 이야기도, 상황도 자유롭게 각색해도 괜찮아요. 딱 하나, 아래 <b style={{ color: P.ink }}>코어(핵심 룰)</b>만은 꼭 지켜주세요. 이 코어에 각자의 진짜 경험을 녹이는 게 이 프로젝트의 포인트예요.</div>
        <div style={{ ...box, marginTop: 14, background: "#eef0fb", color: "#3b3560", fontWeight: 700, fontSize: 13 }}>💡 {p.coreRule || "핵심 코어 룰을 입력하세요"}</div>
      </div>
    ) },
    { eyebrow: "STEP 0 · " + (situations.length || 8) + "가지 상황", title: "이런 상황들 속에서 이야기를 골라보세요", body: (
      <div>
        <div style={desc}>아래 {situations.length}개 상황이 실제로 검증된 소재예요. 원고 탭 포스터도 이 상황들로 되어 있어요.</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, margin: "12px 0" }}>
          {situations.map((s, k) => <span key={k} style={{ background: "#eef0fb", color: "#4b3fb0", borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 700 }}>{s.tag}</span>)}
        </div>
        {p.impactTip && <div style={{ ...box, background: "#fff7d6", color: "#6b5a1a" }}>🎤 {p.impactTip}</div>}
      </div>
    ) },
    { eyebrow: "STEP 0 · 원고 예시", title: "실제로 이런 톤으로 쓰면 돼요", body: (
      <div>
        <div style={desc}>아래는 참고용 원고 예시예요. 이 톤과 구조(경험담처럼 → 반전 → 궁금증 유발)를 참고해서, 본인 이야기처럼 각색해보세요.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {scripts.length === 0 && <div style={{ fontSize: 12, color: P.soft }}>원고 예시가 아직 없어요.</div>}
          {scripts.map((sc, k) => { const lines = String(sc).split("\n"); const head = lines[0]; const rest = lines.slice(1).join("\n"); return (
            <div key={k} style={{ ...box, background: "#f4f3fb", color: "#3a3550", whiteSpace: "pre-wrap" }}>
              <b style={{ color: P.ink, fontSize: 13 }}>{head}</b>{rest ? <><br />{rest}</> : null}
            </div>
          ); })}
        </div>
      </div>
    ) },
    { eyebrow: "STEP 0 · 레퍼런스 영상", title: "참고할 레퍼런스 영상이에요", body: (
      <div>
        <div style={desc}>원고 톤은 첫 번째 영상을, 편집 스타일(세이프존 등)은 두 번째 영상을 참고하세요.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {refs.length === 0 && <div style={{ fontSize: 12, color: P.soft }}>레퍼런스 영상이 아직 없어요.</div>}
          {refs.map((r, k) => (
            <a key={k} href={r.url} target="_blank" rel="noreferrer" style={{ ...box, background: "#f1f0fb", textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>📸</span>
              <span><b style={{ color: P.ink, fontSize: 13 }}>{r.label}</b><br /><span style={{ color: P.soft, fontSize: 11.5 }}>{r.sub}</span></span>
            </a>
          ))}
        </div>
      </div>
    ) },
  ];
  const s = slides[i];
  const isLast = i === slides.length - 1;
  const ghost = { cursor: "pointer", fontFamily: P.font, background: "#fff", border: "1.5px solid #d8d5e5", color: "#6a6580", borderRadius: 10, padding: "9px 15px", fontSize: 12.5, fontWeight: 700 };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,14,40,0.55)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: P.font }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, maxWidth: 440, width: "100%", padding: 24, boxSizing: "border-box", boxShadow: "0 24px 60px rgba(0,0,0,0.35)", maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.3, color: P.accent, marginBottom: 6 }}>{s.eyebrow}</div>
        <div style={{ fontSize: 19, fontWeight: 900, color: "#2a2540", lineHeight: 1.35, marginBottom: 12 }}>{s.title}</div>
        <div style={{ minHeight: 110 }}>{s.body}</div>
        <div style={{ display: "flex", alignItems: "center", marginTop: 18, gap: 8 }}>
          <div style={{ flex: 1, display: "flex", gap: 5, alignItems: "center" }}>
            {slides.map((_, k) => <span key={k} style={{ width: k === i ? 18 : 7, height: 7, borderRadius: 999, background: k === i ? P.accent : "#d5d2e5", transition: "all .2s" }} />)}
          </div>
          <button type="button" onClick={onClose} style={ghost}>건너뛰기</button>
          {i > 0 && <button type="button" onClick={() => setI(i - 1)} style={ghost}>이전</button>}
          {isLast
            ? <button type="button" onClick={onClose} style={{ cursor: "pointer", fontFamily: P.font, background: P.ok, color: "#fff", border: "none", borderRadius: 10, padding: "9px 16px", fontSize: 12.5, fontWeight: 800 }}>확인 완료, 시작하기!</button>
            : <button type="button" onClick={() => setI(i + 1)} style={{ cursor: "pointer", fontFamily: P.font, background: P.accent, color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 12.5, fontWeight: 800 }}>다음</button>}
        </div>
      </div>
    </div>
  );
}

/* ---------- 📐 편집 세이프존 다이어그램 (접이식) ---------- */
export function SafeZoneDiagram({ editGuide }) {
  const [open, setOpen] = useState(false);
  const [plat, setPlat] = useState("shorts");
  const g = (editGuide && editGuide[plat]) || { top: 0, bottom: 0, side: 0 };
  const BW = 132, BH = 234, REF_W = 1080, REF_H = 1920;
  const top = Math.round((g.top || 0) / REF_H * BH), bot = Math.round((g.bottom || 0) / REF_H * BH), side = Math.round((g.side || 0) / REF_W * BW);
  const band = { position: "absolute", background: "rgba(192,86,58,0.24)", borderColor: P.danger };
  return (
    <div style={{ marginBottom: 10, fontFamily: P.font }}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={{ ...btn(P.warn), width: "100%", padding: 9 }}>{open ? "▲ 세이프존 가이드 접기" : "📐 편집 세이프존 가이드 펼치기"}</button>
      {open && (
        <div style={{ background: P.white, border: `2px solid ${P.edge}`, borderRadius: 10, padding: 12, marginTop: 8 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {["shorts", "reels"].map((pl) => (
              <button key={pl} type="button" onClick={() => setPlat(pl)} style={btn(plat === pl ? P.accent : P.white, plat === pl ? "#fff" : P.ink)}>{pl === "shorts" ? "▶️ 쇼츠" : "📸 릴스"}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ position: "relative", width: BW, height: BH, background: "#2a2340", border: `3px solid ${P.ink}`, borderRadius: 10, flexShrink: 0, overflow: "hidden" }}>
              <div style={{ ...band, top: 0, left: 0, right: 0, height: top, borderBottom: `2px dashed ${P.danger}` }} />
              <div style={{ ...band, bottom: 0, left: 0, right: 0, height: bot, borderTop: `2px dashed ${P.danger}` }} />
              <div style={{ ...band, top: 0, bottom: 0, left: 0, width: side, borderRight: `2px dashed ${P.danger}` }} />
              <div style={{ ...band, top: 0, bottom: 0, right: 0, width: side, borderLeft: `2px dashed ${P.danger}` }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, opacity: 0.85 }}>안전 영역</div>
            </div>
            <div style={{ fontSize: 12, color: P.ink, lineHeight: 1.9 }}>
              <div>⬆️ 상단 <b>{g.top}px</b> — 프로필·시간</div>
              <div>⬇️ 하단 <b>{g.bottom}px</b> — 캡션·버튼</div>
              <div>↔️ 좌우 <b>{g.side}px</b> — UI 여백</div>
              <div style={{ fontSize: 10, color: P.soft, marginTop: 6 }}>* 핑크 영역엔 핵심 자막을 넣지 마세요 (기준 {REF_W}×{REF_H})</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- 🎒 소스 찾기 도구 벨트 ---------- */
export function SourceBelt({ tools = [] }) {
  const [pick, setPick] = useState(null);
  if (!tools.length) return null;
  const cur = pick != null ? tools[pick] : null;
  return (
    <div style={{ marginBottom: 10, fontFamily: P.font }}>
      <div style={{ fontSize: 12, fontWeight: "bold", color: P.ink, marginBottom: 6 }}>🎒 소스 찾기 도구</div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "2px 2px 6px" }}>
        {tools.map((tl, k) => (
          <button key={k} type="button" onClick={() => setPick(pick === k ? null : k)} title={tl.desc}
            style={{ flexShrink: 0, width: 70, cursor: "pointer", fontFamily: P.font, background: pick === k ? P.parch : P.white, border: `2px solid ${pick === k ? P.accent : P.ink}`, borderRadius: 10, padding: "8px 4px", textAlign: "center" }}>
            <div style={{ fontSize: 24, lineHeight: 1 }}>{tl.icon || "🧰"}</div>
            <div style={{ fontSize: 10, color: P.ink, marginTop: 4, wordBreak: "keep-all" }}>{tl.name}</div>
          </button>
        ))}
      </div>
      {cur && (
        <div style={{ background: P.white, border: `2px solid ${P.edge}`, borderRadius: 8, padding: 9, marginTop: 4 }}>
          <div style={{ fontSize: 12, fontWeight: "bold", color: P.ink }}>{cur.icon} {cur.name}</div>
          {cur.desc && <div style={{ fontSize: 11, color: P.soft, margin: "3px 0 6px", lineHeight: 1.5 }}>{cur.desc}</div>}
          {cur.link ? <a href={cur.link} target="_blank" rel="noreferrer" style={{ ...btn(P.accent2), textDecoration: "none", display: "inline-block", fontSize: 11 }}>열기 ↗</a> : <span style={{ fontSize: 10.5, color: P.soft }}>링크 없음</span>}
        </div>
      )}
    </div>
  );
}

/* ---------- 🏷 키워드 칩 (언어별 · 클릭 복사) ---------- */
const LANG_LABEL = { ko: "🇰🇷 한국어", zh: "🇨🇳 중국어", en: "🇺🇸 영어", ja: "🇯🇵 일본어" };
export function KeywordChips({ keywords = {} }) {
  const langs = Object.keys(keywords).filter((l) => (keywords[l] || []).length);
  const [lang, setLang] = useState(langs[0] || "ko");
  const [copied, setCopied] = useState("");
  if (!langs.length) return null;
  const list = keywords[lang] || [];
  const copy = (w) => { try { navigator.clipboard.writeText(w); setCopied(w); setTimeout(() => setCopied(""), 1000); } catch (e) {} };
  return (
    <div style={{ marginBottom: 10, fontFamily: P.font }}>
      <div style={{ fontSize: 12, fontWeight: "bold", color: P.ink, marginBottom: 6 }}>🏷 키워드 <span style={{ fontSize: 10, color: P.soft }}>· 눌러서 복사</span></div>
      {langs.length > 1 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          {langs.map((l) => (
            <button key={l} type="button" onClick={() => setLang(l)} style={{ ...btn(lang === l ? P.accent : P.white, lang === l ? "#fff" : P.ink), fontSize: 11, padding: "5px 9px" }}>{LANG_LABEL[l] || l}</button>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {list.map((w, k) => (
          <button key={k} type="button" onClick={() => copy(w)} style={{ cursor: "pointer", fontFamily: P.font, fontSize: 11.5, padding: "5px 10px", borderRadius: 14, border: `2px solid ${P.ink}`, background: copied === w ? P.ok : P.white, color: copied === w ? "#fff" : P.ink }}>{copied === w ? "복사됨 ✓" : w}</button>
        ))}
      </div>
    </div>
  );
}

/* ---------- 🧭 제품 선택 바 (+ 관리자 추가/편집) ---------- */
export function ProductBar({ products = [], selectedId, onSelect, isAdmin, onAdd, onEdit }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 10, fontFamily: P.font }}>
      {products.map((p) => (
        <button key={p.id} type="button" onClick={() => onSelect && onSelect(p.id)} style={{ ...btn(selectedId === p.id ? P.accent : P.white, selectedId === p.id ? "#fff" : P.ink) }}>📦 {p.name}</button>
      ))}
      {products.length === 0 && <span style={{ fontSize: 11.5, color: P.soft }}>아직 제품이 없어요 · 관리자가 추가할 수 있어요</span>}
      <span style={{ flex: 1 }} />
      {isAdmin && selectedId && onEdit && <button type="button" onClick={onEdit} style={btn(P.white, P.ink)}>✏️ 편집</button>}
      {isAdmin && <button type="button" onClick={onAdd} style={btn(P.ok)}>➕ 제품 추가</button>}
    </div>
  );
}

/* 폼용 리스트 (모듈 레벨 = 렌더 시 재생성 안 됨 · 입력 포커스 유지) */
function FieldList({ items, render, add, addLabel }) {
  return (
    <div>
      {items.map((it, i) => render(it, i))}
      <button type="button" onClick={add} style={{ ...btn(P.white, P.ink), fontSize: 11, marginTop: 4 }}>＋ {addLabel}</button>
    </div>
  );
}

/* ---------- 📝 제품 추가/편집 폼 ---------- */
export function ProductForm({ initial, onSave, onCancel, onDelete }) {
  const [p, setP] = useState(() => ({ ...emptyProduct(), ...(initial || {}), editGuide: { shorts: { ...(initial && initial.editGuide && initial.editGuide.shorts || { top: 120, bottom: 320, side: 40 }) }, reels: { ...(initial && initial.editGuide && initial.editGuide.reels || { top: 140, bottom: 360, side: 60 }) } }, spec: { ...(initial && initial.spec || { length: "30초", ratio: "9:16" }) }, keywords: { ...(initial && initial.keywords || { ko: [] }) }, reward: { ...(initial && initial.reward || {}) } }));
  const set = (k, v) => setP((o) => ({ ...o, [k]: v }));
  const setGuide = (pl, k, v) => setP((o) => ({ ...o, editGuide: { ...o.editGuide, [pl]: { ...o.editGuide[pl], [k]: Number(v) || 0 } } }));
  const [newLang, setNewLang] = useState("");

  const save = () => {
    if (!p.name.trim()) { window.alert("제품명을 입력하세요."); return; }
    const clean = { ...p, name: p.name.trim(), scripts: (p.scripts || []).map((s) => s.trim()).filter(Boolean), refEdit: (p.refEdit || []).map((s) => s.trim()).filter(Boolean), situations: (p.situations || []).filter((s) => (s.title || s.tag || s.hook)) };
    // reward: 빈칸이면 제거(→ 기본값 사용)
    const rw = {}; ["submit", "approve", "bonus"].forEach((k) => { if (p.reward && p.reward[k] !== "" && p.reward[k] != null) rw[k] = Number(p.reward[k]); });
    clean.reward = rw;
    onSave && onSave(clean);
  };

  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 12, fontFamily: P.font }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, maxHeight: "92%", overflow: "auto", background: P.parch, border: `4px solid ${P.ink}`, borderRadius: 14, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <b style={{ flex: 1, fontSize: 15, color: P.ink }}>{initial && initial.id ? "✏️ 제품 편집" : "➕ 제품 추가"}</b>
          <button type="button" onClick={onCancel} style={{ cursor: "pointer", background: "none", border: "none", fontSize: 16 }}>✕</button>
        </div>
        <div style={{ ...hint, marginBottom: 10 }}>이 양식을 채우면 그 제품 전용 튜토리얼 + 원고/소스/편집 세트가 자동으로 만들어져요.</div>

        <div style={lbl}>제품명 *</div>
        <input value={p.name} onChange={(e) => set("name", e.target.value)} placeholder="예: 고음확장기" style={inp} />

        <div style={lbl}>핵심 코어 룰 (한 줄)</div>
        <input value={p.coreRule} onChange={(e) => set("coreRule", e.target.value)} placeholder='예: 사랑받고 싶고 인정받고 싶은 마음을 건드리기' style={inp} />

        <div style={lbl}>중간 임팩트 팁</div>
        <input value={p.impactTip} onChange={(e) => set("impactTip", e.target.value)} placeholder="예: 노래 한번 배우면 10년은 써먹는 거 알아?" style={inp} />

        <div style={lbl}>기본 상황 리스트</div>
        <div style={hint}>태그 / 포스터 제목 / 한 줄 훅 — 원고 작성 탭의 시작 포스터가 돼요</div>
        <FieldList items={p.situations} addLabel="상황 추가" add={() => set("situations", [...p.situations, { tag: "", title: "", hook: "" }])}
          render={(s, i) => (
            <div key={i} style={{ background: P.white, border: `2px solid ${P.edge}`, borderRadius: 8, padding: 8, marginBottom: 6 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 5 }}>
                <input value={s.tag} onChange={(e) => set("situations", p.situations.map((x, j) => j === i ? { ...x, tag: e.target.value } : x))} placeholder="태그" style={{ ...inp, flex: "0 0 90px" }} />
                <input value={s.title} onChange={(e) => set("situations", p.situations.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} placeholder="포스터 제목" style={{ ...inp, flex: 1 }} />
                <button type="button" onClick={() => set("situations", p.situations.filter((_, j) => j !== i))} style={{ ...btn(P.white, P.danger), padding: "6px 8px" }}>✕</button>
              </div>
              <input value={s.hook} onChange={(e) => set("situations", p.situations.map((x, j) => j === i ? { ...x, hook: e.target.value } : x))} placeholder="한 줄 훅" style={inp} />
            </div>
          )} />

        <div style={lbl}>원고 예시 (2개 이상 권장)</div>
        <FieldList items={p.scripts} addLabel="원고 예시 추가" add={() => set("scripts", [...p.scripts, ""])}
          render={(sc, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <textarea value={sc} onChange={(e) => set("scripts", p.scripts.map((x, j) => j === i ? e.target.value : x))} rows={2} placeholder={`원고 예시 ${i + 1} 전문`} style={{ ...inp, flex: 1 }} />
              <button type="button" onClick={() => set("scripts", p.scripts.filter((_, j) => j !== i))} style={{ ...btn(P.white, P.danger), padding: "6px 8px" }}>✕</button>
            </div>
          )} />

        <div style={lbl}>레퍼런스 영상</div>
        <input value={p.refTone} onChange={(e) => set("refTone", e.target.value)} placeholder="원고 톤 레퍼런스 링크" style={{ ...inp, marginBottom: 6 }} />
        <FieldList items={p.refEdit} addLabel="편집 레퍼런스 추가" add={() => set("refEdit", [...p.refEdit, ""])}
          render={(r, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input value={r} onChange={(e) => set("refEdit", p.refEdit.map((x, j) => j === i ? e.target.value : x))} placeholder={`편집 스타일 레퍼런스 ${i + 1}`} style={{ ...inp, flex: 1 }} />
              <button type="button" onClick={() => set("refEdit", p.refEdit.filter((_, j) => j !== i))} style={{ ...btn(P.white, P.danger), padding: "6px 8px" }}>✕</button>
            </div>
          )} />

        <div style={lbl}>편집 가이드 (세이프존 px)</div>
        {["shorts", "reels"].map((pl) => (
          <div key={pl} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11, width: 44, color: P.soft }}>{pl === "shorts" ? "쇼츠" : "릴스"}</span>
            {["top", "bottom", "side"].map((k) => (
              <input key={k} type="number" value={p.editGuide[pl][k]} onChange={(e) => setGuide(pl, k, e.target.value)} placeholder={k} title={k} style={{ ...inp, flex: 1 }} />
            ))}
          </div>
        ))}
        <div style={hint}>상단 / 하단 / 좌우 안전영역 (기준 1080×1920)</div>

        <div style={lbl}>소스 찾기 도구</div>
        <FieldList items={p.sourceTools} addLabel="도구 추가" add={() => set("sourceTools", [...p.sourceTools, { name: "", icon: "", desc: "", link: "" }])}
          render={(tl, i) => (
            <div key={i} style={{ background: P.white, border: `2px solid ${P.edge}`, borderRadius: 8, padding: 8, marginBottom: 6 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 5 }}>
                <input value={tl.icon} onChange={(e) => set("sourceTools", p.sourceTools.map((x, j) => j === i ? { ...x, icon: e.target.value } : x))} placeholder="🎵" style={{ ...inp, flex: "0 0 54px", textAlign: "center" }} />
                <input value={tl.name} onChange={(e) => set("sourceTools", p.sourceTools.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="이름" style={{ ...inp, flex: 1 }} />
                <button type="button" onClick={() => set("sourceTools", p.sourceTools.filter((_, j) => j !== i))} style={{ ...btn(P.white, P.danger), padding: "6px 8px" }}>✕</button>
              </div>
              <input value={tl.desc} onChange={(e) => set("sourceTools", p.sourceTools.map((x, j) => j === i ? { ...x, desc: e.target.value } : x))} placeholder="설명" style={{ ...inp, marginBottom: 5 }} />
              <input value={tl.link} onChange={(e) => set("sourceTools", p.sourceTools.map((x, j) => j === i ? { ...x, link: e.target.value } : x))} placeholder="링크 (선택)" style={inp} />
            </div>
          )} />

        <div style={lbl}>키워드 모음집 (언어별)</div>
        {Object.keys(p.keywords).map((l) => (
          <div key={l} style={{ marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <span style={{ fontSize: 11, fontWeight: "bold", flex: 1, color: P.ink }}>{LANG_LABEL[l] || l}</span>
              <button type="button" onClick={() => setP((o) => { const kw = { ...o.keywords }; delete kw[l]; return { ...o, keywords: kw }; })} style={{ ...btn(P.white, P.danger), fontSize: 10, padding: "3px 7px" }}>언어 삭제</button>
            </div>
            <textarea value={(p.keywords[l] || []).join("\n")} onChange={(e) => setP((o) => ({ ...o, keywords: { ...o.keywords, [l]: e.target.value.split(/\n+/).map((x) => x.trim()).filter(Boolean) } }))} rows={2} placeholder="한 줄에 하나씩" style={inp} />
          </div>
        ))}
        <div style={{ display: "flex", gap: 6 }}>
          <input value={newLang} onChange={(e) => setNewLang(e.target.value)} placeholder="언어코드 추가 (ko/zh/en/ja)" style={{ ...inp, flex: 1 }} />
          <button type="button" onClick={() => { const l = newLang.trim(); if (l && !p.keywords[l]) { setP((o) => ({ ...o, keywords: { ...o.keywords, [l]: [] } })); setNewLang(""); } }} style={btn(P.white, P.ink)}>＋ 언어</button>
        </div>

        <div style={lbl}>영상 규격</div>
        <div style={{ display: "flex", gap: 6 }}>
          <input value={p.spec.length} onChange={(e) => setP((o) => ({ ...o, spec: { ...o.spec, length: e.target.value } }))} placeholder="길이 (예: 30초)" style={{ ...inp, flex: 1 }} />
          <input value={p.spec.ratio} onChange={(e) => setP((o) => ({ ...o, spec: { ...o.spec, ratio: e.target.value } }))} placeholder="비율 (예: 9:16)" style={{ ...inp, flex: 1 }} />
        </div>

        <div style={lbl}>리워드 정책 (선택 · 비우면 기본값 2/2/보너스4)</div>
        <div style={{ display: "flex", gap: 6 }}>
          {[["submit", "제출G"], ["approve", "승인G"], ["bonus", "완주보너스"]].map(([k, ph]) => (
            <input key={k} type="number" value={p.reward[k] == null ? "" : p.reward[k]} onChange={(e) => setP((o) => ({ ...o, reward: { ...o.reward, [k]: e.target.value } }))} placeholder={ph} style={{ ...inp, flex: 1 }} />
          ))}
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
          {initial && initial.id && onDelete && <button type="button" onClick={() => { if (window.confirm("이 제품을 삭제할까요? (제출 데이터는 남아있어요)")) onDelete(initial.id); }} style={{ ...btn(P.white, P.danger) }}>🗑 삭제</button>}
          <span style={{ flex: 1 }} />
          <button type="button" onClick={onCancel} style={btn(P.white, P.ink)}>취소</button>
          <button type="button" onClick={save} style={btn(P.ok)}>💾 저장</button>
        </div>
      </div>
    </div>
  );
}
