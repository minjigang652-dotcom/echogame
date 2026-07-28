import React, { useEffect, useRef, useState } from "react";
// 📡 네이버스쿨용 서버 DB 함수는 메인 파일(LittleJuniorWorld.jsx)에 정의돼 있어요.
//    분리 후 이 함수들이 "not defined" 로 뜨던 문제 → 여기서 import 해서 연결합니다.
import {
  dbLoadNspKw, dbSaveNspKw, dbLoadNspUrls, dbSaveNspUrls,
  dbLoadNspTut, dbSaveNspTut,
  dbLoadKinKw, dbSaveKinKw, dbLoadKinState, dbSaveKinState, dbLoadKinEx, dbSaveKinEx,
  dbLoadCafeKw, dbSaveCafeKw, dbLoadCafeState, dbSaveCafeState,
} from "./LittleJuniorWorld.jsx";

// ============================================================================
//  NaverSchoolPanel.jsx  —  에코월드 "네이버 스쿨" 패널
//  몰입의 방 기능을 게임 안에 그대로 표시:
//    ① 네이버키워드(순위)  ② URL(발행 URL 풀)  ③ 카페 최신글  ④ 지식인 최신글
//
//  [적용 방법]  src/ 폴더에 이 파일을 넣고, LittleJuniorWorld.jsx 에서:
//
//    import NaverSchoolPanel from './NaverSchoolPanel';
//    const [naverOpen, setNaverOpen] = useState(false);
//    // 플레이어가 "네이버 스쿨" 건물에 들어가 E를 누를 때 -> setNaverOpen(true)
//    ...
//    <NaverSchoolPanel open={naverOpen} onClose={() => setNaverOpen(false)} />
//
//  MOIP_API 만 네 몰입의 방 도메인으로 맞춰주면 돼요.
//  서버 API가 아직 없으면 자동으로 예시(mock) 데이터를 보여줍니다.
// ============================================================================
const MOIP_API = 'https://ad.onlychat.co.kr'; // ← 몰입의 방 도메인
// 카페 발행 시트 바로가기 링크
const SHEETS = {
  jehyu:  'https://docs.google.com/spreadsheets/d/1MMZOIT9KFcck6DfY3lT6Khsx8eZF695kpuc7G_OWk90/edit?pli=1&gid=903765666#gid=903765666',
  molbal: 'https://docs.google.com/spreadsheets/d/1MMZOIT9KFcck6DfY3lT6Khsx8eZF695kpuc7G_OWk90/edit?pli=1&gid=214235798#gid=214235798',
};
// ---- 상태 뱃지 (몰입의 방 4단계와 동일) ------------------------------------
const ST = {
  high: { cls: 'st-high', label: '상위노출' },
  low:  { cls: 'st-low',  label: '하위노출' },
  miss: { cls: 'st-miss', label: '누락' },
};
// 서버가 '상위노출'/'하위노출'/'누락'(한글) 또는 'high'/'low'/'miss' 어느 쪽으로 줘도 처리
function normStatus(s) {
  const t = String(s || '');
  if (t === 'high' || t.includes('상위')) return 'high';
  if (t === 'low' || t.includes('하위')) return 'low';
  return 'miss';
}
// ---- 출처 뱃지 --------------------------------------------------------------
const SRC = {
  cafe: { cls: 'tag-cafe', label: '카페' },
  kin:  { cls: 'tag-kin',  label: '지식인' },
  blog: { cls: 'tag-blog', label: '블로그' },
};
// 카페 답변 처리 상태 (드롭다운 4종)
const WORK = {
  answered: '답변 완료',
  deleted:  '삭제',
  joinwait: '가입대기',
  levelup:  '등업 요망',
};
const WORK_ORDER = ['answered', 'deleted', 'joinwait', 'levelup'];
// ---- 서버가 아직 없을 때 보여줄 예시 데이터 ---------------------------------
const MOCK = {
  keywords: [
    // 그린레이
    { keyword: '그린레이 효과',   product: '그린레이', ourRank: 1,    status: 'high', volume: 9200, important: true },
    { keyword: '그린레이 후기',   product: '그린레이', ourRank: 4,    status: 'high', volume: 6100, important: false },
    { keyword: '그린레이 부작용', product: '그린레이', ourRank: 12,   status: 'low',  volume: 3300, important: true },
    { keyword: '그린레이 가격',   product: '그린레이', ourRank: null, status: 'miss', volume: 2100, important: false },
    // 보이실린
    { keyword: '보이실린 효과',   product: '보이실린', ourRank: 2,    status: 'high', volume: 7400, important: true },
    { keyword: '보이실린 복용법', product: '보이실린', ourRank: 8,    status: 'high', volume: 2600, important: false },
    { keyword: '보이실린 후기',   product: '보이실린', ourRank: 15,   status: 'low',  volume: 1800, important: false },
    { keyword: '보이실린 성분',   product: '보이실린', ourRank: null, status: 'miss', volume: 900,  important: false },
    // 키워드신고
    { keyword: '키워드신고 방법',     product: '키워드신고', ourRank: 3,  status: 'high', volume: 5200, important: true },
    { keyword: '키워드신고 기준',     product: '키워드신고', ourRank: 11, status: 'low',  volume: 1400, important: false },
    { keyword: '키워드신고 처리기간', product: '키워드신고', ourRank: 19, status: 'low',  volume: 800,  important: false },
    // 고음확장기
    { keyword: '고음확장기 사용법', product: '고음확장기', ourRank: 1,    status: 'high', volume: 4300, important: true },
    { keyword: '고음확장기 효과',   product: '고음확장기', ourRank: 6,    status: 'high', volume: 3900, important: false },
    { keyword: '고음확장기 추천',   product: '고음확장기', ourRank: null, status: 'miss', volume: 2700, important: false },
  ],
  urls: [
    { source: 'cafe', title: '목소리가 안 나와요 대처법 정리',   url: '#' },
    { source: 'cafe', title: '성대결절 후기 모음',              url: '#' },
    { source: 'kin',  title: '목쉼 질문 답변 (지식iN)',          url: '#' },
    { source: 'kin',  title: '발성 연습 관련 답변',              url: '#' },
  ],
  cafe: [
    { title: '목소리가 안 나와요 어떡하죠ㅠ 3일차 후기', date: '2026-07-27', url: '#' },
    { title: '목쉼 빨리 낫는 법 (병원 다녀온 후기)',      date: '2026-07-25', url: '#' },
    { title: '이비인후과 목소리 진료 비용 정리',          date: '2026-07-23', url: '#' },
  ],
  kin: [
    { id: 'k1',  title: '목소리가 갈라지는데 성대결절일까요?',     date: '2026-07-27', url: '#' },
    { id: 'k2',  title: '발성 연습 하루 몇 분이 적당한가요?',      date: '2026-07-27', url: '#' },
    { id: 'k3',  title: '목쉼이 2주째인데 병원 가야 하나요?',      date: '2026-07-27', url: '#' },
    { id: 'k4',  title: '그린레이 복용 중인데 물 많이 마셔야 하나요?', date: '2026-07-27', url: '#' },
    { id: 'k5',  title: '고음이 안 올라가요 연습법 있을까요?',     date: '2026-07-27', url: '#' },
    { id: 'k6',  title: '보이실린 언제 먹는 게 좋나요?',          date: '2026-07-27', url: '#' },
    { id: 'k7',  title: '목소리 관리 영양제 추천해주세요',        date: '2026-07-27', url: '#' },
    { id: 'k8',  title: '노래방 다녀오면 목이 쉬어요 왜그럴까요',  date: '2026-07-27', url: '#' },
    { id: 'k9',  title: '성대결절 수술까지 가야 하는 경우는?',    date: '2026-07-27', url: '#' },
    { id: 'k10', title: '아침에 목소리가 안 나오는데 정상인가요?', date: '2026-07-27', url: '#' },
    { id: 'k11', title: '발성 좋아지는 습관 뭐가 있을까요?',      date: '2026-07-27', url: '#' },
    { id: 'k12', title: '목 통증이랑 목소리 변화 같이 오는데요',  date: '2026-07-27', url: '#' },
  ],
  // 답변 요망: 키워드별로 수집한 카페 링크
  cafeLinks: [
    { id: 'c1', keyword: '그린레이 효과',   title: '그린레이 드셔보신 분 후기 부탁드려요',   url: 'https://cafe.naver.com/sample/1' },
    { id: 'c2', keyword: '그린레이 효과',   title: '그린레이 3주차인데 효과 있나요?',        url: 'https://cafe.naver.com/sample/2' },
    { id: 'c3', keyword: '그린레이 부작용', title: '그린레이 먹고 속쓰림 있으신 분?',        url: 'https://cafe.naver.com/sample/3' },
    { id: 'c4', keyword: '보이실린 효과',   title: '보이실린 목소리에 도움되나요?',          url: 'https://cafe.naver.com/sample/4' },
    { id: 'c5', keyword: '고음확장기 사용법', title: '고음확장기 사용법 알려주실 분ㅠ',       url: 'https://cafe.naver.com/sample/5' },
  ],
};
const NSP_ROOMS = [
  { id: 'tutorial', icon: '📖', label: '튜토리얼', desc: '작성 방법·프롬프트·답변/댓글 사진', color: '#c0563a' },
  { id: 'cafe', icon: '☕', label: '카페 최신글', desc: '답변 요망·완료·캘린더 워크플로우', color: '#3fa07a' },
  { id: 'kw',   icon: '🔗', label: '카페 외부',   desc: '네이버 키워드 순위 추적', color: '#5b8def' },
  { id: 'kinTop', icon: '📊', label: '지식인 상위', desc: '준비 중이에요', color: '#e0a13d', soon: true },
  { id: 'kin',  icon: '💬', label: '지식인 최신글', desc: '답변 카운터·타이머 워크플로우', color: '#b76bd7' },
  { id: 'yt',   icon: '▶️', label: '유튜브 최신글', desc: '준비 중이에요', color: '#d94f70', soon: true },
];
// ---- 답변 예시 등록 (링크 + 이미지) : 카페/지식인 탭에서 재사용 -------------
// 지금은 화면(메모리)에만 저장돼요. 서버에 영구 저장하려면 addLink/onImages 에서
// fetch(`${MOIP_API}/api/echo/examples`, {method:'POST', ...}) 로 보내면 됩니다.
function ExampleRegister({ statusText, buttonLabel }) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState('');
  const [links, setLinks] = useState([]);
  const [images, setImages] = useState([]);
  const addLink = () => { const v = link.trim(); if (!v) return; setLinks((a) => [...a, v]); setLink(''); };
  const removeLink = (i) => setLinks((a) => a.filter((_, k) => k !== i));
  const onImages = (e) => {
    Array.from(e.target.files || []).forEach((f) => {
      const r = new FileReader();
      r.onload = () => setImages((a) => [...a, { url: r.result, name: f.name }]);
      r.readAsDataURL(f);
    });
    e.target.value = '';
  };
  const removeImage = (i) => setImages((a) => a.filter((_, k) => k !== i));
  return (
    <>
      <div className="nsp-toolbar">
        <span className="nsp-status">{statusText}</span>
        <button className="nsp-btn nsp-right" onClick={() => setOpen((v) => !v)}>{buttonLabel}</button>
      </div>
      {open && (
        <div className="nsp-expanel">
          <div className="nsp-ex-h">답변 예시 등록</div>
          <div className="nsp-ex-label">예시 링크</div>
          <div className="nsp-ex-row">
            <input
              className="nsp-input"
              placeholder="예시 링크 붙여넣기 (https://...)"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addLink(); }}
            />
            <button className="nsp-btn" onClick={addLink}>추가</button>
          </div>
          {links.length > 0 && (
            <ul className="nsp-ex-links">
              {links.map((l, i) => (
                <li key={i}>
                  <a href={l} target="_blank" rel="noreferrer">{l}</a>
                  <button className="nsp-x" onClick={() => removeLink(i)}>✕</button>
                </li>
              ))}
            </ul>
          )}
          <div className="nsp-ex-label">예시 이미지</div>
          <div className="nsp-ex-row">
            <label className="nsp-btn nsp-file">
              🖼 이미지 등록
              <input type="file" accept="image/*" multiple hidden onChange={onImages} />
            </label>
            <span className="nsp-status">
              {images.length > 0 ? `${images.length}개 등록됨` : '이미지를 추가하세요 (여러 장 가능)'}
            </span>
          </div>
          {images.length > 0 && (
            <div className="nsp-ex-imgs">
              {images.map((im, i) => (
                <div key={i} className="nsp-thumb">
                  <img src={im.url} alt={im.name} />
                  <button className="nsp-x" onClick={() => removeImage(i)}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
// ---- 작업자별 집계 ----------------------------------------------------------
function workerSummary(processed) {
  const m = {};
  processed.forEach((p) => {
    const w = (m[p.worker] = m[p.worker] || { name: p.worker, total: 0, answered: 0, deleted: 0, joinwait: 0, levelup: 0 });
    w.total++;
    if (w[p.status] != null) w[p.status]++;
  });
  return Object.values(m).sort((a, b) => b.total - a.total);
}
// ---- 캘린더 (날짜별 처리 건수) ----------------------------------------------
function CafeCalendar({ processed }) {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const startDow = new Date(ym.y, ym.m, 1).getDay();
  const days = new Date(ym.y, ym.m + 1, 0).getDate();
  const counts = {};
  processed.forEach((p) => {
    const d = new Date(p.at);
    if (d.getFullYear() === ym.y && d.getMonth() === ym.m) counts[d.getDate()] = (counts[d.getDate()] || 0) + 1;
  });
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  const prev = () => setYm(({ y, m }) => (m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }));
  const next = () => setYm(({ y, m }) => (m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 }));
  return (
    <div className="nsp-cal">
      <div className="nsp-calhd">
        <button className="nsp-pill" onClick={prev}>‹</button>
        <span>{ym.y}년 {ym.m + 1}월</span>
        <button className="nsp-pill" onClick={next}>›</button>
      </div>
      <div className="nsp-calgrid">
        {['일', '월', '화', '수', '목', '금', '토'].map((w) => (<div key={w} className="nsp-caldow">{w}</div>))}
        {cells.map((d, i) => (
          <div key={i} className={`nsp-calcell ${d ? '' : 'empty'}`}>
            {d && <span className="nsp-calnum">{d}</span>}
            {d && counts[d] && <span className="nsp-calbadge">{counts[d]}</span>}
          </div>
        ))}
      </div>
      <div className="nsp-status" style={{ marginTop: 8 }}>완료·처리한 작업이 날짜별로 표시돼요.</div>
    </div>
  );
}
// ---- 카페 최신글 워크플로우 (답변 요망 / 답변 완료 / 캘린더) ----------------
/* ======================= ☕ 카페 최신글 방 ======================= */
const CAFE_STATUSES = [
  { id: 'wait_join', label: '가입대기', color: '#e0a13d' },
  { id: 'wait_up',   label: '등업대기', color: '#5b8def' },
  { id: 'female',    label: '여자만',   color: '#d76b96' },
  { id: 'work',      label: '작업글',   color: '#8e5a9e' },
  { id: 'done',      label: '완료',     color: '#3fa07a' },
];
const CAFE_ADMIN_PW = 'ckdals987?';
function cafeStatusInfo(id) { return CAFE_STATUSES.find((s) => s.id === id) || null; }

function CafeRoom({ crawledLinks = [], nickname = '' }) {
  const [products, setProducts] = useState([]);      // [{id,name,keywords:[{id,word,important}]}]
  const [state, setState] = useState({ links: {}, doneLog: [] }); // links:{url:{status,at,by,keyword}}, doneLog:[{url,keyword,at,by}]
  const [prodFilter, setProdFilter] = useState('');
  const [admin, setAdmin] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [pw, setPw] = useState(''); const [pwErr, setPwErr] = useState(false);
  const [newProd, setNewProd] = useState('');
  const [newKw, setNewKw] = useState({});
  const [ansOpen, setAnsOpen] = useState(false);
  const [ansTab, setAnsTab] = useState('wait_join');
  const [calOpen, setCalOpen] = useState(false);
  const [calDay, setCalDay] = useState(null);
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [timer, setTimer] = useState({ phase: 'idle', start: 0, count: 0 }); // 1시간 목표 40개

  const saveProducts = (list) => { setProducts(list); dbSaveCafeKw(list); };
  const saveState = (st) => { setState(st); dbSaveCafeState(st); };

  useEffect(() => {
    dbLoadCafeKw().then((d) => { if (Array.isArray(d)) setProducts(d); });
    dbLoadCafeState().then((d) => { if (d && typeof d === 'object') setState({ links: d.links || {}, doneLog: d.doneLog || [] }); });
  }, []);
  useEffect(() => { if (products.length && !products.some((p) => p.id === prodFilter)) setProdFilter(products[0].id); }, [products]); // eslint-disable-line

  const today = () => new Date().toISOString().slice(0, 10);
  const nowISO = () => new Date().toISOString();

  // 링크 상태 변경 (알바/관리자)
  const setLinkStatus = (url, keyword, status) => {
    const links = { ...state.links, [url]: { status, at: nowISO(), by: nickname || '익명', keyword } };
    let doneLog = state.doneLog.slice();
    if (status === 'done') {
      // 완료로 바뀌면 오늘 날짜로 완료 이력에 기록 (같은 url 있으면 갱신)
      doneLog = doneLog.filter((x) => x.url !== url);
      doneLog.unshift({ url, keyword, at: nowISO(), day: today(), by: nickname || '익명' });
    } else {
      // 완료가 아니면 완료 이력에서 제거
      doneLog = doneLog.filter((x) => x.url !== url);
    }
    saveState({ links, doneLog: doneLog.slice(0, 2000) });
  };

  const curProduct = products.find((p) => p.id === prodFilter);
  const curKeywords = curProduct ? (curProduct.keywords || []) : [];
  // 크롤링된 링크를 키워드별로 묶기
  const linksByKeyword = {};
  curKeywords.forEach((kw) => { linksByKeyword[kw.word] = []; });
  crawledLinks.forEach((lk) => {
    const w = (lk.keyword || '').trim();
    if (w in linksByKeyword) linksByKeyword[w].push(lk);
  });
  const totalLinks = crawledLinks.filter((lk) => curKeywords.some((k) => k.word === (lk.keyword || '').trim())).length;

  // 1시간 목표 타이머
  const GOAL = 40;
  const elapsedMin = timer.phase === 'running' ? Math.floor((Date.now() - timer.start) / 60000) : 0;

  return (
    <>
      {/* 상단 우측 액션 (방 목록으로 행에 넣기 위해 별도 렌더 — 여기선 방 안 상단바로 대체) */}
      <div className="cafe-top">
        <div className="cafe-prods">
          {products.map((p) => (
            <button key={p.id} className={`cafe-prodbtn ${prodFilter === p.id ? 'on' : ''}`} onClick={() => setProdFilter(p.id)}>📦 {p.name}</button>
          ))}
          {products.length === 0 && <span className="cafe-hint">⚙️ 설정에서 제품·키워드를 등록하세요</span>}
        </div>
        <div className="cafe-actions">
          <button className="nsp-iconbtn" title="답변 (상태별 링크)" onClick={() => setAnsOpen(true)}>💬 답변</button>
          <button className="nsp-iconbtn" title="설정 (관리자)" onClick={() => setAdminOpen(true)}>⚙️</button>
          <button className="nsp-iconbtn" title="캘린더" onClick={() => setCalOpen(true)}>📅</button>
        </div>
      </div>

      {/* 제품 아래: 카운트 + 목표 타이머 */}
      {curProduct && (
        <div className="cafe-meta">
          <span className="cafe-count">🔗 크롤링 링크 {totalLinks}개 · 🏷 키워드 {curKeywords.length}개</span>
          <span className="cafe-goal">
            {timer.phase === 'running'
              ? <><b>{timer.count}</b>/{GOAL}개 · {elapsedMin}분/60분 <button className="cafe-gbtn" onClick={() => setTimer({ phase: 'idle', start: 0, count: 0 })}>■</button></>
              : <>1시간 목표 {GOAL}개 <button className="cafe-gbtn" onClick={() => setTimer({ phase: 'running', start: Date.now(), count: 0 })}>▶ 시작</button></>}
          </span>
        </div>
      )}

      {/* 키워드별 네모칸 */}
      {curProduct && (
        <div className="cafe-grid">
          {curKeywords.length === 0 && <div className="nsp-empty">이 제품에 키워드가 없어요 · ⚙️ 설정에서 추가하세요</div>}
          {curKeywords.map((kw) => (
            <div key={kw.id} className="cafe-kwbox">
              <div className="cafe-kwtitle">{kw.important && <span className="nsp-imp">★</span>}<b>{kw.word}</b><span className="cafe-kwn">{(linksByKeyword[kw.word] || []).length}</span></div>
              <div className="cafe-links">
                {(linksByKeyword[kw.word] || []).length === 0 && <div className="cafe-nolink">아직 크롤링된 링크가 없어요</div>}
                {(linksByKeyword[kw.word] || []).map((lk, i) => {
                  const cur = state.links[lk.url];
                  return (
                    <div key={i} className="cafe-linkrow">
                      <select className="cafe-dd" value={cur ? cur.status : ''} onChange={(e) => setLinkStatus(lk.url, kw.word, e.target.value)}>
                        <option value="">상태</option>
                        {CAFE_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                      <a className="cafe-link" href={lk.url} target="_blank" rel="noreferrer">{lk.title || lk.url}</a>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ⚙️ 관리자 설정 */}
      {adminOpen && (
        <div className="nsp-modal-bg" onClick={() => setAdminOpen(false)}>
          <div className="nsp-modal" onClick={(e) => e.stopPropagation()}>
            {!admin ? (
              <>
                <div className="nsp-modal-h">🔑 관리자 설정</div>
                <div className="nsp-modal-sub">비밀번호를 입력하세요</div>
                <input className="nsp-modal-input" type="password" autoFocus value={pw}
                  onChange={(e) => { setPw(e.target.value); setPwErr(false); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { if (pw === CAFE_ADMIN_PW) setAdmin(true); else setPwErr(true); } }} />
                {pwErr && <div className="nsp-modal-err">비밀번호가 틀렸어요</div>}
                <div className="nsp-modal-btns">
                  <button className="nsp-btn ghost" onClick={() => setAdminOpen(false)}>취소</button>
                  <button className="nsp-btn" onClick={() => { if (pw === CAFE_ADMIN_PW) setAdmin(true); else setPwErr(true); }}>확인</button>
                </div>
              </>
            ) : (
              <>
                <div className="nsp-modal-h">⚙️ 제품 · 키워드 관리</div>
                <div className="nsp-modal-sub">제품을 등록하고 키워드를 한 줄에 하나씩 일괄 등록하세요</div>
                <div className="nsp-addrow">
                  <input className="nsp-modal-input" placeholder="새 제품 이름" value={newProd}
                    onChange={(e) => setNewProd(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && newProd.trim()) { saveProducts([...products, { id: 'p' + Date.now(), name: newProd.trim(), keywords: [] }]); setNewProd(''); } }} />
                  <button className="nsp-btn" onClick={() => { if (newProd.trim()) { saveProducts([...products, { id: 'p' + Date.now(), name: newProd.trim(), keywords: [] }]); setNewProd(''); } }}>＋ 제품</button>
                </div>
                <div className="nsp-prodlist">
                  {products.length === 0 && <div className="nsp-modal-empty">아직 제품이 없어요</div>}
                  {products.map((p) => (
                    <div key={p.id} className="nsp-prodcard">
                      <div className="nsp-prodhead">
                        <b>📦 {p.name}</b>
                        <span className="nsp-prodcnt">{(p.keywords || []).length}개</span>
                        <button className="nsp-x2" onClick={() => saveProducts(products.filter((x) => x.id !== p.id))}>삭제</button>
                      </div>
                      <div className="nsp-kwtags">
                        {(p.keywords || []).map((kw) => (
                          <span key={kw.id} className={`nsp-kwtag ${kw.important ? 'imp' : ''}`}>
                            <button className="nsp-kwstar" onClick={() => saveProducts(products.map((x) => x.id === p.id ? { ...x, keywords: x.keywords.map((y) => y.id === kw.id ? { ...y, important: !y.important } : y) } : x))}>{kw.important ? '⭐' : '☆'}</button>
                            {kw.word}
                            <button className="nsp-kwdel" onClick={() => saveProducts(products.map((x) => x.id === p.id ? { ...x, keywords: x.keywords.filter((y) => y.id !== kw.id) } : x))}>✕</button>
                          </span>
                        ))}
                      </div>
                      <div className="nsp-kwadd">
                        <textarea className="nsp-modal-ta sm" placeholder={"키워드를 한 줄에 하나씩\n예:\n그린레이 효과\n그린레이 후기"} value={newKw[p.id] || ''}
                          onChange={(e) => setNewKw((v) => ({ ...v, [p.id]: e.target.value }))} />
                        <button className="nsp-btn" onClick={() => {
                          const words = (newKw[p.id] || '').split(/\n+/).map((x) => x.trim()).filter(Boolean);
                          if (!words.length) return;
                          const exist = new Set((p.keywords || []).map((k) => k.word));
                          const add = words.filter((w) => !exist.has(w)).map((w, i) => ({ id: 'k' + Date.now() + '_' + i, word: w }));
                          saveProducts(products.map((x) => x.id === p.id ? { ...x, keywords: [...(x.keywords || []), ...add] } : x));
                          setNewKw((v) => ({ ...v, [p.id]: '' }));
                        }}>＋ 일괄 등록</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="nsp-modal-btns">
                  <button className="nsp-btn ghost" onClick={() => setAdmin(false)}>관리자 잠그기</button>
                  <button className="nsp-btn" onClick={() => setAdminOpen(false)}>닫기</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 💬 답변 (상태별 링크) */}
      {ansOpen && (() => {
        const byStatus = {};
        CAFE_STATUSES.forEach((s) => { byStatus[s.id] = []; });
        Object.keys(state.links).forEach((url) => {
          const it = state.links[url];
          if (it && byStatus[it.status]) byStatus[it.status].push({ url, ...it });
        });
        const list = byStatus[ansTab] || [];
        return (
          <div className="nsp-modal-bg" onClick={() => setAnsOpen(false)}>
            <div className="nsp-modal" onClick={(e) => e.stopPropagation()}>
              <div className="nsp-modal-h">💬 답변 — 상태별 링크</div>
              <div className="cafe-anstabs">
                {CAFE_STATUSES.map((s) => (
                  <button key={s.id} className={`cafe-anstab ${ansTab === s.id ? 'on' : ''}`} style={ansTab === s.id ? { background: s.color, color: '#fff' } : {}} onClick={() => setAnsTab(s.id)}>{s.label} ({byStatus[s.id].length})</button>
                ))}
              </div>
              <div className="cafe-anslist">
                {list.length === 0 && <div className="nsp-modal-empty">이 상태의 링크가 없어요</div>}
                {list.map((it, i) => (
                  <div key={i} className="cafe-ansrow">
                    {/* 완료 탭이 아니면 드롭다운 표시 (완료 탭은 드롭다운 없음) */}
                    {ansTab !== 'done' && (
                      <select className="cafe-dd" value={it.status} onChange={(e) => setLinkStatus(it.url, it.keyword, e.target.value)}>
                        {CAFE_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    )}
                    <a className="cafe-link" href={it.url} target="_blank" rel="noreferrer">{it.keyword ? `[${it.keyword}] ` : ''}{it.url}</a>
                    <span className="cafe-ansby">{it.by}</span>
                  </div>
                ))}
              </div>
              <div className="nsp-modal-btns"><button className="nsp-btn" onClick={() => setAnsOpen(false)}>닫기</button></div>
            </div>
          </div>
        );
      })()}

      {/* 📅 캘린더 */}
      {calOpen && (() => {
        const { y, m } = calMonth;
        const first = new Date(y, m, 1);
        const startDow = first.getDay();
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        const doneByDay = {};
        state.doneLog.forEach((d) => { const day = d.day || (d.at || '').slice(0, 10); if (!doneByDay[day]) doneByDay[day] = []; doneByDay[day].push(d); });
        const cells = [];
        for (let i = 0; i < startDow; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(d);
        const dayStr = (d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const selList = calDay ? (doneByDay[calDay] || []) : [];
        return (
          <div className="nsp-modal-bg" onClick={() => { setCalOpen(false); setCalDay(null); }}>
            <div className="nsp-modal" onClick={(e) => e.stopPropagation()}>
              <div className="cafe-calhead">
                <button className="nsp-btn ghost" onClick={() => setCalMonth({ y: m === 0 ? y - 1 : y, m: m === 0 ? 11 : m - 1 })}>‹</button>
                <b>{y}년 {m + 1}월</b>
                <button className="nsp-btn ghost" onClick={() => setCalMonth({ y: m === 11 ? y + 1 : y, m: m === 11 ? 0 : m + 1 })}>›</button>
              </div>
              <div className="cafe-cal">
                {['일','월','화','수','목','금','토'].map((d) => <div key={d} className="cafe-caldow">{d}</div>)}
                {cells.map((d, i) => {
                  if (!d) return <div key={i} className="cafe-calcell empty" />;
                  const ds = dayStr(d);
                  const cnt = (doneByDay[ds] || []).length;
                  return (
                    <button key={i} className={`cafe-calcell ${calDay === ds ? 'on' : ''}`} onClick={() => setCalDay(ds)}>
                      <span className="cafe-calnum">{d}</span>
                      {cnt > 0 && <span className="cafe-caldone">완료 {cnt}건</span>}
                    </button>
                  );
                })}
              </div>
              {calDay && (
                <div className="cafe-calsel">
                  <div className="cafe-calsel-h">📅 {calDay} · 완료 {selList.length}건</div>
                  <div className="cafe-anslist">
                    {selList.length === 0 && <div className="nsp-modal-empty">이 날 완료된 링크가 없어요</div>}
                    {selList.map((it, i) => (
                      <div key={i} className="cafe-ansrow">
                        <a className="cafe-link" href={it.url} target="_blank" rel="noreferrer">{it.keyword ? `[${it.keyword}] ` : ''}{it.url}</a>
                        <span className="cafe-ansby">{it.by}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="nsp-modal-btns"><button className="nsp-btn" onClick={() => { setCalOpen(false); setCalDay(null); }}>닫기</button></div>
            </div>
          </div>
        );
      })()}
    </>
  );
}

function CafeWorkflow({ nickname, setNickname, links }) {
  const GOAL = 30, LIMIT_MIN = 60;
  const COUNTED = ['answered', 'joinwait', 'levelup']; // 삭제는 카운트 제외
  const [sub, setSub] = useState('todo');          // todo | done | calendar
  const [doneSub, setDoneSub] = useState('answered');
  const [pending, setPending] = useState(links || []);
  const [processed, setProcessed] = useState([]);
  const [count, setCount] = useState(0);
  const [startAt, setStartAt] = useState(null);
  const [completedMs, setCompletedMs] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [warnNick, setWarnNick] = useState(false);

  // 서버에서 links가 새로 오면, 아직 처리 안 한 것만 pending 으로
  useEffect(() => {
    const doneIds = new Set(processed.map((p) => p.id));
    setPending((links || []).filter((l) => !doneIds.has(l.id)));
  }, [links]); // eslint-disable-line

  // 타이머 tick
  useEffect(() => {
    if (!startAt || completedMs != null) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startAt, completedMs]);

  const assign = (item, statusKey) => {
    if (!(nickname || '').trim()) { setWarnNick(true); return; } // 작업자 이름 없으면 처리 막기
    setWarnNick(false);
    const rec = { ...item, status: statusKey, worker: nickname.trim(), at: new Date().toISOString() };
    setProcessed((a) => [rec, ...a]);
    setPending((a) => a.filter((x) => x.id !== item.id));
    if (COUNTED.includes(statusKey)) {          // 답변완료/가입대기/등업요망만 카운트
      setStartAt((s) => s || Date.now());
      setCount((c) => {
        const nc = c + 1;
        if (nc >= GOAL && completedMs == null) setCompletedMs(Date.now() - (startAt || Date.now()));
        return nc;
      });
    }
  };
  const fmt = (iso) => {
    const d = new Date(iso);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  const elapsedMin = startAt ? Math.floor((now - startAt) / 60000) : 0;
  const overtime = startAt && completedMs == null && (now - startAt) / 60000 >= LIMIT_MIN;
  const doneMin = completedMs != null ? Math.max(1, Math.ceil(completedMs / 60000)) : null;
  const pct = Math.min(100, (count / GOAL) * 100);

  // 답변 요망: 키워드별 그룹
  const byKeyword = {};
  pending.forEach((l) => { (byKeyword[l.keyword] = byKeyword[l.keyword] || []).push(l); });

  return (
    <>
      {/* 좌측 상단 서브탭 */}
      <div className="nsp-subtabs">
        <button className={`nsp-subtab ${sub === 'todo' ? 'on' : ''}`} onClick={() => setSub('todo')}>답변 요망</button>
        <button className={`nsp-subtab ${sub === 'done' ? 'on' : ''}`} onClick={() => setSub('done')}>답변 완료</button>
        <button className={`nsp-subtab ${sub === 'calendar' ? 'on' : ''}`} onClick={() => setSub('calendar')}>캘린더</button>
        <span className="nsp-worker">
          👤 작업자
          <input
            className={`nsp-nick ${warnNick ? 'warn' : ''}`}
            value={nickname}
            onChange={(e) => { setNickname(e.target.value); if (e.target.value.trim()) setWarnNick(false); }}
            placeholder="닉네임 입력"
          />
          {warnNick && <span className="nsp-nickwarn">← 이름 먼저 입력</span>}
        </span>
      </div>

      {/* 답변 요망 */}
      {sub === 'todo' && (
        <>
          <ExampleRegister
            statusText={`키워드별 수집 카페 링크 · ${pending.length}건`}
            buttonLabel="📝 답변 예시"
          />
          <div className="nsp-kinwrap">
            <div className="nsp-kinlist">
              {Object.keys(byKeyword).length === 0 && <div className="nsp-empty">남은 링크가 없어요</div>}
              {Object.entries(byKeyword).map(([kw, list]) => (
                <div key={kw} className="nsp-kwgroup">
                  <div className="nsp-kwhead">🔑 {kw}</div>
                  {list.map((l) => (
                    <div key={l.id} className="nsp-linkrow">
                      <a className="nsp-title" href={l.url} target="_blank" rel="noreferrer">{l.title}</a>
                      <select
                        className="nsp-dd"
                        value=""
                        onChange={(e) => { if (e.target.value) assign(l, e.target.value); }}
                      >
                        <option value="">상태 선택 ▾</option>
                        {WORK_ORDER.map((k) => (<option key={k} value={k}>{WORK[k]}</option>))}
                      </select>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="nsp-timer">
              <div className="nsp-tmr-h">⏱ 1시간 목표</div>
              <div className={`nsp-tmr-count ${count >= GOAL ? 'done' : ''}`}>{count}<small>/{GOAL}</small></div>
              <div className="nsp-tmr-bar"><span style={{ width: `${pct}%` }} /></div>
              {completedMs != null ? (
                <div className="nsp-tmr-time done">🎉 완료!<br />{doneMin}분/60분</div>
              ) : startAt ? (
                <div className={`nsp-tmr-time ${overtime ? 'over' : ''}`}>{overtime ? '⏰ 시간 초과' : `${elapsedMin}분/60분`}</div>
              ) : (
                <div className="nsp-tmr-time wait">답변완료·가입대기<br />·등업요망 시 시작</div>
              )}
              <div className="nsp-tmr-note">답변완료·가입대기·등업요망만 카운트</div>
            </div>
          </div>
        </>
      )}

      {/* 답변 완료 */}
      {sub === 'done' && (
        <>
          <div className="nsp-subtabs2">
            {WORK_ORDER.map((k) => (
              <button key={k} className={`nsp-pill ${doneSub === k ? 'on' : ''}`} onClick={() => setDoneSub(k)}>
                {WORK[k]} ({processed.filter((p) => p.status === k).length})
              </button>
            ))}
            <button className={`nsp-pill ${doneSub === 'worker' ? 'on' : ''}`} onClick={() => setDoneSub('worker')}>작업자</button>
          </div>

          {doneSub !== 'worker' && (
            <>
              {processed.filter((p) => p.status === doneSub).length === 0 && <div className="nsp-empty">아직 없어요</div>}
              {processed.filter((p) => p.status === doneSub).map((p, i) => (
                <div key={i} className="nsp-linkrow">
                  <a className="nsp-title" href={p.url} target="_blank" rel="noreferrer">{p.title}</a>
                  <span className="nsp-meta">👤 {p.worker}</span>
                  <span className="nsp-meta">{fmt(p.at)}</span>
                </div>
              ))}
            </>
          )}

          {doneSub === 'worker' && (
            <>
              {workerSummary(processed).length === 0 && <div className="nsp-empty">아직 작업 내역이 없어요</div>}
              {workerSummary(processed).map((w) => (
                <div key={w.name} className="nsp-workrow">
                  <span className="nsp-wname">👤 {w.name}</span>
                  <span className="nsp-meta">총 {w.total}건</span>
                  <span className="nsp-wbreak">
                    답변완료 {w.answered} · 삭제 {w.deleted} · 가입대기 {w.joinwait} · 등업 {w.levelup}
                  </span>
                </div>
              ))}
            </>
          )}
        </>
      )}

      {/* 캘린더 */}
      {sub === 'calendar' && <CafeCalendar processed={processed} />}
    </>
  );
}

// ---- 지식인 최신글: 답변 카운터 + 1시간 50개 타이머 + 답변완료/답변X 분리 ----
/* ======================= 💬 지식인 최신글 방 ======================= */
const KIN_ADMIN_PW = 'ckdals987?';
function KinRoom({ crawledLinks = [], nickname = '' }) {
  const [products, setProducts] = useState([]);
  const [state, setState] = useState({ links: {} });   // { url: { status:'done'|'fail', at, by, keyword } }
  const [exposts, setExposts] = useState([]);          // 예시 게시판 [{id,title,body,at,by}]
  const [prodFilter, setProdFilter] = useState('');
  const [admin, setAdmin] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [pw, setPw] = useState(''); const [pwErr, setPwErr] = useState(false);
  const [newProd, setNewProd] = useState('');
  const [newKw, setNewKw] = useState({});
  const [ansOpen, setAnsOpen] = useState(false);
  const [ansTab, setAnsTab] = useState('done');
  const [exOpen, setExOpen] = useState(false);
  const [exWrite, setExWrite] = useState(false);
  const [exTitle, setExTitle] = useState(''); const [exBody, setExBody] = useState('');
  const [exView, setExView] = useState(null);
  const [timer, setTimer] = useState({ phase: 'idle', start: 0, count: 0 });
  const GOAL = 50;

  const saveProducts = (list) => { setProducts(list); dbSaveKinKw(list); };
  const saveState = (st) => { setState(st); dbSaveKinState(st); };
  const saveExposts = (list) => { setExposts(list); dbSaveKinEx(list); };

  useEffect(() => {
    dbLoadKinKw().then((d) => { if (Array.isArray(d)) setProducts(d); });
    dbLoadKinState().then((d) => { if (d && typeof d === 'object') setState({ links: d.links || {} }); });
    dbLoadKinEx().then((d) => { if (Array.isArray(d)) setExposts(d); });
  }, []);
  useEffect(() => { if (products.length && !products.some((p) => p.id === prodFilter)) setProdFilter(products[0].id); }, [products]); // eslint-disable-line

  const nowISO = () => new Date().toISOString();
  const curProduct = products.find((p) => p.id === prodFilter);
  const curKeywords = curProduct ? (curProduct.keywords || []) : [];
  const kwset = new Set(curKeywords.map((k) => k.word));
  const links = crawledLinks.filter((lk) => kwset.has((lk.keyword || '').trim()));

  const mark = (lk, status) => {
    const cur = state.links[lk.url];
    // 답변 카운터: 새로 done 표시할 때 +1
    if (status === 'done' && (!cur || cur.status !== 'done') && timer.phase === 'running') setTimer((t) => ({ ...t, count: t.count + 1 }));
    saveState({ links: { ...state.links, [lk.url]: { status, at: nowISO(), by: nickname || '익명', keyword: (lk.keyword || '').trim(), title: lk.title || '' } } });
  };

  const elapsedMin = timer.phase === 'running' ? Math.floor((Date.now() - timer.start) / 60000) : 0;

  return (
    <>
      <div className="cafe-top">
        <div className="cafe-prods">
          {products.map((p) => (
            <button key={p.id} className={`cafe-prodbtn kin ${prodFilter === p.id ? 'on' : ''}`} onClick={() => setProdFilter(p.id)}>📦 {p.name}</button>
          ))}
          {products.length === 0 && <span className="cafe-hint">⚙️ 설정에서 제품·키워드를 등록하세요</span>}
        </div>
        <div className="cafe-actions">
          <button className="nsp-iconbtn" title="예시 (튜토리얼 게시판)" onClick={() => setExOpen(true)}>📚 예시</button>
          <button className="nsp-iconbtn" title="답변 (완료/불가)" onClick={() => setAnsOpen(true)}>💬 답변</button>
          <button className="nsp-iconbtn" title="설정 (관리자)" onClick={() => setAdminOpen(true)}>⚙️</button>
        </div>
      </div>

      {curProduct && (
        <div className="cafe-meta">
          <span className="cafe-count">🔗 크롤링 링크 {links.length}개 · 🏷 키워드 {curKeywords.length}개</span>
          <span className="cafe-goal">
            {timer.phase === 'running'
              ? <><b>{timer.count}</b>/{GOAL}개 · {elapsedMin}분/60분 <button className="cafe-gbtn" onClick={() => setTimer({ phase: 'idle', start: 0, count: 0 })}>■</button></>
              : <>1시간 목표 {GOAL}개 <button className="cafe-gbtn" onClick={() => setTimer({ phase: 'running', start: Date.now(), count: 0 })}>▶ 시작</button></>}
          </span>
        </div>
      )}

      {/* 링크 나열 (한 줄에 하나, 우측 답변불가/답변완료 버튼) */}
      {curProduct && (
        <div className="kin-list">
          {links.length === 0 && <div className="nsp-empty">아직 크롤링된 링크가 없어요 · 몰입의방 연결 시 자동으로 채워져요</div>}
          {links.map((lk, i) => {
            const cur = state.links[lk.url];
            return (
              <div key={i} className="kin-row">
                <a className="kin-link" href={lk.url} target="_blank" rel="noreferrer">{lk.keyword ? `[${lk.keyword}] ` : ''}{lk.title || lk.url}</a>
                <div className="kin-btns">
                  <button className={`kin-b fail ${cur && cur.status === 'fail' ? 'on' : ''}`} onClick={() => mark(lk, 'fail')}>답변불가</button>
                  <button className={`kin-b done ${cur && cur.status === 'done' ? 'on' : ''}`} onClick={() => mark(lk, 'done')}>답변완료</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ⚙️ 관리자 설정 (제품·키워드) */}
      {adminOpen && (
        <div className="nsp-modal-bg" onClick={() => setAdminOpen(false)}>
          <div className="nsp-modal" onClick={(e) => e.stopPropagation()}>
            {!admin ? (
              <>
                <div className="nsp-modal-h">🔑 관리자 설정</div>
                <div className="nsp-modal-sub">비밀번호를 입력하세요</div>
                <input className="nsp-modal-input" type="password" autoFocus value={pw}
                  onChange={(e) => { setPw(e.target.value); setPwErr(false); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { if (pw === KIN_ADMIN_PW) setAdmin(true); else setPwErr(true); } }} />
                {pwErr && <div className="nsp-modal-err">비밀번호가 틀렸어요</div>}
                <div className="nsp-modal-btns">
                  <button className="nsp-btn ghost" onClick={() => setAdminOpen(false)}>취소</button>
                  <button className="nsp-btn" onClick={() => { if (pw === KIN_ADMIN_PW) setAdmin(true); else setPwErr(true); }}>확인</button>
                </div>
              </>
            ) : (
              <>
                <div className="nsp-modal-h">⚙️ 제품 · 키워드 관리</div>
                <div className="nsp-modal-sub">제품을 등록하고 키워드를 한 줄에 하나씩 일괄 등록하세요</div>
                <div className="nsp-addrow">
                  <input className="nsp-modal-input" placeholder="새 제품 이름" value={newProd}
                    onChange={(e) => setNewProd(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && newProd.trim()) { saveProducts([...products, { id: 'p' + Date.now(), name: newProd.trim(), keywords: [] }]); setNewProd(''); } }} />
                  <button className="nsp-btn" onClick={() => { if (newProd.trim()) { saveProducts([...products, { id: 'p' + Date.now(), name: newProd.trim(), keywords: [] }]); setNewProd(''); } }}>＋ 제품</button>
                </div>
                <div className="nsp-prodlist">
                  {products.length === 0 && <div className="nsp-modal-empty">아직 제품이 없어요</div>}
                  {products.map((p) => (
                    <div key={p.id} className="nsp-prodcard">
                      <div className="nsp-prodhead">
                        <b>📦 {p.name}</b><span className="nsp-prodcnt">{(p.keywords || []).length}개</span>
                        <button className="nsp-x2" onClick={() => saveProducts(products.filter((x) => x.id !== p.id))}>삭제</button>
                      </div>
                      <div className="nsp-kwtags">
                        {(p.keywords || []).map((kw) => (
                          <span key={kw.id} className={`nsp-kwtag ${kw.important ? 'imp' : ''}`}>
                            <button className="nsp-kwstar" onClick={() => saveProducts(products.map((x) => x.id === p.id ? { ...x, keywords: x.keywords.map((y) => y.id === kw.id ? { ...y, important: !y.important } : y) } : x))}>{kw.important ? '⭐' : '☆'}</button>
                            {kw.word}
                            <button className="nsp-kwdel" onClick={() => saveProducts(products.map((x) => x.id === p.id ? { ...x, keywords: x.keywords.filter((y) => y.id !== kw.id) } : x))}>✕</button>
                          </span>
                        ))}
                      </div>
                      <div className="nsp-kwadd">
                        <textarea className="nsp-modal-ta sm" placeholder={"키워드를 한 줄에 하나씩"} value={newKw[p.id] || ''}
                          onChange={(e) => setNewKw((v) => ({ ...v, [p.id]: e.target.value }))} />
                        <button className="nsp-btn" onClick={() => {
                          const words = (newKw[p.id] || '').split(/\n+/).map((x) => x.trim()).filter(Boolean);
                          if (!words.length) return;
                          const exist = new Set((p.keywords || []).map((k) => k.word));
                          const add = words.filter((w) => !exist.has(w)).map((w, i) => ({ id: 'k' + Date.now() + '_' + i, word: w }));
                          saveProducts(products.map((x) => x.id === p.id ? { ...x, keywords: [...(x.keywords || []), ...add] } : x));
                          setNewKw((v) => ({ ...v, [p.id]: '' }));
                        }}>＋ 일괄 등록</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="nsp-modal-btns">
                  <button className="nsp-btn ghost" onClick={() => setAdmin(false)}>관리자 잠그기</button>
                  <button className="nsp-btn" onClick={() => setAdminOpen(false)}>닫기</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 💬 답변 (답변완료 / 답변불가, 최신순) */}
      {ansOpen && (() => {
        const rows = Object.keys(state.links).map((url) => ({ url, ...state.links[url] })).filter((x) => x.status === ansTab);
        rows.sort((a, b) => (b.at || '').localeCompare(a.at || ''));   // 최신순
        return (
          <div className="nsp-modal-bg" onClick={() => setAnsOpen(false)}>
            <div className="nsp-modal" onClick={(e) => e.stopPropagation()}>
              <div className="nsp-modal-h">💬 답변</div>
              <div className="cafe-anstabs">
                <button className={`cafe-anstab ${ansTab === 'done' ? 'on' : ''}`} style={ansTab === 'done' ? { background: '#3fa07a', color: '#fff' } : {}} onClick={() => setAnsTab('done')}>답변완료 ({Object.values(state.links).filter((x) => x.status === 'done').length})</button>
                <button className={`cafe-anstab ${ansTab === 'fail' ? 'on' : ''}`} style={ansTab === 'fail' ? { background: '#c0563a', color: '#fff' } : {}} onClick={() => setAnsTab('fail')}>답변불가 ({Object.values(state.links).filter((x) => x.status === 'fail').length})</button>
              </div>
              <div className="cafe-anslist">
                {rows.length === 0 && <div className="nsp-modal-empty">해당하는 링크가 없어요</div>}
                {rows.map((it, i) => (
                  <div key={i} className="cafe-ansrow">
                    <a className="cafe-link" href={it.url} target="_blank" rel="noreferrer">{it.keyword ? `[${it.keyword}] ` : ''}{it.title || it.url}</a>
                    <span className="cafe-ansby">{it.by} · {(it.at || '').slice(5, 16).replace('T', ' ')}</span>
                  </div>
                ))}
              </div>
              <div className="nsp-modal-btns"><button className="nsp-btn" onClick={() => setAnsOpen(false)}>닫기</button></div>
            </div>
          </div>
        );
      })()}

      {/* 📚 예시 (튜토리얼 게시판 — 관리자 글쓰기, 모두 열람) */}
      {exOpen && (
        <div className="nsp-modal-bg" onClick={() => { setExOpen(false); setExWrite(false); setExView(null); }}>
          <div className="nsp-modal" onClick={(e) => e.stopPropagation()}>
            {exView ? (
              <>
                <div className="nsp-modal-h">📄 {exView.title}</div>
                <div className="kin-ex-meta">✍️ {exView.by} · {(exView.at || '').slice(0, 10)}</div>
                <div className="kin-ex-body">{exView.body}</div>
                <div className="nsp-modal-btns"><button className="nsp-btn" onClick={() => setExView(null)}>← 목록</button></div>
              </>
            ) : exWrite ? (
              <>
                {!admin ? (
                  <>
                    <div className="nsp-modal-h">🔑 관리자 확인</div>
                    <div className="nsp-modal-sub">글쓰기는 관리자만 가능해요</div>
                    <input className="nsp-modal-input" type="password" autoFocus value={pw}
                      onChange={(e) => { setPw(e.target.value); setPwErr(false); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { if (pw === KIN_ADMIN_PW) setAdmin(true); else setPwErr(true); } }} />
                    {pwErr && <div className="nsp-modal-err">비밀번호가 틀렸어요</div>}
                    <div className="nsp-modal-btns">
                      <button className="nsp-btn ghost" onClick={() => setExWrite(false)}>취소</button>
                      <button className="nsp-btn" onClick={() => { if (pw === KIN_ADMIN_PW) setAdmin(true); else setPwErr(true); }}>확인</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="nsp-modal-h">✍️ 튜토리얼 글쓰기</div>
                    <input className="nsp-modal-input" placeholder="제목" value={exTitle} onChange={(e) => setExTitle(e.target.value)} />
                    <textarea className="nsp-modal-ta" style={{ height: 180, marginTop: 8 }} placeholder="내용을 입력하세요" value={exBody} onChange={(e) => setExBody(e.target.value)} />
                    <div className="nsp-modal-btns">
                      <button className="nsp-btn ghost" onClick={() => { setExWrite(false); setExTitle(''); setExBody(''); }}>취소</button>
                      <button className="nsp-btn" onClick={() => {
                        if (!exTitle.trim() || !exBody.trim()) return;
                        saveExposts([{ id: 'e' + Date.now(), title: exTitle.trim(), body: exBody.trim(), at: nowISO(), by: nickname || '관리자' }, ...exposts].slice(0, 200));
                        setExTitle(''); setExBody(''); setExWrite(false);
                      }}>등록</button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="nsp-modal-h">📚 예시 · 튜토리얼 게시판</div>
                <div className="nsp-modal-sub">모두가 볼 수 있어요 · 글쓰기는 관리자만</div>
                <button className="nsp-btn" style={{ width: '100%', marginBottom: 10 }} onClick={() => setExWrite(true)}>✍️ 등록</button>
                <div className="kin-ex-list">
                  {exposts.length === 0 && <div className="nsp-modal-empty">아직 등록된 글이 없어요</div>}
                  {exposts.map((p) => (
                    <button key={p.id} className="kin-ex-item" onClick={() => setExView(p)}>
                      <span className="kin-ex-title">{p.title}</span>
                      <span className="kin-ex-sub">✍️ {p.by} · {(p.at || '').slice(0, 10)}</span>
                      {admin && <span className="kin-ex-del" onClick={(e) => { e.stopPropagation(); saveExposts(exposts.filter((x) => x.id !== p.id)); }}>🗑</span>}
                    </button>
                  ))}
                </div>
                <div className="nsp-modal-btns"><button className="nsp-btn" onClick={() => setExOpen(false)}>닫기</button></div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function KinWorkflow({ posts: initial }) {
  const GOAL = 50, LIMIT_MIN = 60;
  const [sub, setSub] = useState('todo');       // todo | done | x
  const [posts, setPosts] = useState([]);
  const [processed, setProcessed] = useState([]); // { ...post, kind:'done'|'x', at }
  const [count, setCount] = useState(0);
  const [startAt, setStartAt] = useState(null);
  const [completedMs, setCompletedMs] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setPosts((initial || []).map((p, i) => ({ id: p.id ?? `k${i}`, ...p })));
  }, [initial]);

  useEffect(() => {
    if (!startAt || completedMs != null) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startAt, completedMs]);

  // 답변완료('done') / 답변X('x') 둘 다 카운트 (버튼 1개 = +1)
  const act = (item, kind) => {
    setPosts((a) => a.filter((x) => x.id !== item.id));
    setProcessed((a) => [{ ...item, kind, at: new Date().toISOString() }, ...a]);
    setStartAt((s) => s || Date.now());
    setCount((c) => {
      const nc = c + 1;
      if (nc >= GOAL && completedMs == null) setCompletedMs(Date.now() - (startAt || Date.now()));
      return nc;
    });
  };
  const fmt = (iso) => { const d = new Date(iso); const p = (n) => String(n).padStart(2, '0'); return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`; };

  const elapsedMin = startAt ? Math.floor((now - startAt) / 60000) : 0;
  const overtime = startAt && completedMs == null && (now - startAt) / 60000 >= LIMIT_MIN;
  const doneMin = completedMs != null ? Math.max(1, Math.ceil(completedMs / 60000)) : null;
  const pct = Math.min(100, (count / GOAL) * 100);
  const doneList = processed.filter((p) => p.kind === 'done');
  const xList = processed.filter((p) => p.kind === 'x');

  const ProcRow = ({ p, kind }) => (
    <div className="nsp-linkrow">
      <a className="nsp-title" href={p.url} target="_blank" rel="noreferrer">{p.title}</a>
      <span className={`nsp-badgek ${kind === 'done' ? 'kdone' : 'kx'}`}>{kind === 'done' ? '답변완료' : '답변X'}</span>
      <span className="nsp-meta">{fmt(p.at)}</span>
    </div>
  );

  return (
    <>
      {/* 서브탭 */}
      <div className="nsp-subtabs">
        <button className={`nsp-subtab ${sub === 'todo' ? 'on' : ''}`} onClick={() => setSub('todo')}>답변 요망 ({posts.length})</button>
        <button className={`nsp-subtab ${sub === 'done' ? 'on' : ''}`} onClick={() => setSub('done')}>답변완료 ({doneList.length})</button>
        <button className={`nsp-subtab ${sub === 'x' ? 'on' : ''}`} onClick={() => setSub('x')}>답변X ({xList.length})</button>
      </div>

      {/* 답변 요망 (목록 + 버튼 + 타이머) */}
      {sub === 'todo' && (
        <>
          <ExampleRegister statusText="지식iN 최신글 · 매일 갱신" buttonLabel="📝 지식인 답변 예시" />
          <div className="nsp-kinwrap">
            <div className="nsp-kinlist">
              {posts.length === 0 && <div className="nsp-empty">오늘 수집분을 모두 처리했어요 🎉</div>}
              {posts.map((p) => (
                <div key={p.id} className="nsp-linkrow">
                  <a className="nsp-title" href={p.url} target="_blank" rel="noreferrer">{p.title}</a>
                  <span className="nsp-meta">{p.date}</span>
                  <button className="nsp-kbtn kx" onClick={() => act(p, 'x')}>답변X</button>
                  <button className="nsp-kbtn kdone" onClick={() => act(p, 'done')}>답변완료</button>
                </div>
              ))}
            </div>
            <div className="nsp-timer">
              <div className="nsp-tmr-h">⏱ 1시간 목표</div>
              <div className={`nsp-tmr-count ${count >= GOAL ? 'done' : ''}`}>{count}<small>/{GOAL}</small></div>
              <div className="nsp-tmr-bar"><span style={{ width: `${pct}%` }} /></div>
              {completedMs != null ? (
                <div className="nsp-tmr-time done">🎉 완료!<br />{doneMin}분/60분</div>
              ) : startAt ? (
                <div className={`nsp-tmr-time ${overtime ? 'over' : ''}`}>{overtime ? '⏰ 시간 초과' : `${elapsedMin}분/60분`}</div>
              ) : (
                <div className="nsp-tmr-time wait">버튼을 누르면<br />타이머 시작</div>
              )}
              <div className="nsp-tmr-note">답변완료·답변X 모두 카운트</div>
            </div>
          </div>
        </>
      )}

      {/* 답변완료 글 */}
      {sub === 'done' && (
        <>
          {doneList.length === 0 && <div className="nsp-empty">아직 답변완료한 글이 없어요</div>}
          {doneList.map((p, i) => (<ProcRow key={i} p={p} kind="done" />))}
        </>
      )}

      {/* 답변X 글 */}
      {sub === 'x' && (
        <>
          {xList.length === 0 && <div className="nsp-empty">아직 답변X한 글이 없어요</div>}
          {xList.map((p, i) => (<ProcRow key={i} p={p} kind="x" />))}
        </>
      )}
    </>
  );
}

// ---- 튜토리얼: 메모(직접 입력/ txt 업로드/ 서버 저장/ 삭제/ 날짜) + 사진 ----
function TutorialTab({ data, setData }) {
  const [status, setStatus] = useState({}); // key -> 'saving' | 'saved' | 'error'
  const nowStr = () => {
    const d = new Date(); const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  const setSlot = (key, patch) => setData((t) => ({ ...t, [key]: { ...t[key], ...patch } }));
  const onTxt = (key, file) => {
    const r = new FileReader();
    r.onload = () => setSlot(key, { text: r.result, fileName: file.name, date: nowStr() });
    r.readAsText(file);
  };
  const save = async (key) => {
    setStatus((s) => ({ ...s, [key]: 'saving' }));
    const slot = data[key] || {};
    const date = slot.date || nowStr();
    try {
      const ok = await dbSaveNspTut(key, { text: slot.text || '', fileName: slot.fileName || '', date });
      if (!ok) throw new Error();
      setSlot(key, { date });
      setStatus((s) => ({ ...s, [key]: 'saved' }));
    } catch (e) { setStatus((s) => ({ ...s, [key]: 'error' })); }
  };
  const del = async (key) => {
    setSlot(key, { text: '', fileName: '', date: '' });
    setStatus((s) => ({ ...s, [key]: '' }));
    try { await dbSaveNspTut(key, { text: '', fileName: '', date: '' }); } catch (e) { /* noop */ }
  };
  const downloadImg = (im) => {
    try {
      const a = document.createElement('a');
      a.href = im.url; a.download = im.name || 'image.png';
      document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { /* noop */ }
  };
  const DEF_NAME = { method: '작성방법.txt', promptGreen: '그린레이_프롬프트.txt', promptBoy: '보이실린_프롬프트.txt', promptHigh: '고음확장기_프롬프트.txt' };
  const download = (key) => {
    const slot = data[key];
    const name = slot.fileName || DEF_NAME[key] || `${key}.txt`;
    const blob = new Blob([slot.text || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };
  const saveImgs = (k, arr) => { try { dbSaveNspTut(k, { images: arr }); } catch (e) {} };
  const addImgs = async (k, files) => {
    const list = Array.from(files || []);
    for (const f of list) {
      try {
        const url = await compressImage(f, 1000, 0.75, 'image/jpeg');
        setData((t) => { const next = [...(t[k] || []), { url, name: f.name }].slice(0, 12); saveImgs(k, next); return { ...t, [k]: next }; });
      } catch (e) { /* skip */ }
    }
  };
  const rmImg = (k, i) => setData((t) => { const next = (t[k] || []).filter((_, x) => x !== i); saveImgs(k, next); return { ...t, [k]: next }; });

  // 인라인 호출(컴포넌트 아님) → textarea 포커스 유지
  const Memo = (label, key, ph) => {
    const slot = data[key]; const st = status[key];
    return (
      <div className="nsp-memo" key={key}>
        <div className="nsp-memo-l">
          <b>{label}</b>
          {slot.fileName && <span className="nsp-memo-file">📄 {slot.fileName}</span>}
          {slot.date && <span className="nsp-memo-date">올린 날짜: {slot.date}</span>}
        </div>
        <textarea className="nsp-ta" value={slot.text} placeholder={ph} onChange={(e) => setSlot(key, { text: e.target.value })} />
        <div className="nsp-memo-btns">
          <label className="nsp-btn ghost nsp-file">📄 txt 올리기
            <input type="file" accept=".txt,text/plain" hidden onChange={(e) => { if (e.target.files[0]) onTxt(key, e.target.files[0]); e.target.value = ''; }} />
          </label>
          <button className="nsp-btn ghost" onClick={() => download(key)} disabled={!slot.text}>⬇ 다운로드</button>
          <button className="nsp-btn" onClick={() => save(key)}>💾 저장</button>
          <button className="nsp-btn danger" onClick={() => del(key)}>🗑 삭제</button>
          {st === 'saving' && <span className="nsp-memo-st">저장 중…</span>}
          {st === 'saved' && <span className="nsp-memo-st ok">저장됨 ✓</span>}
          {st === 'error' && <span className="nsp-memo-st err">저장 실패 (서버 API 필요)</span>}
        </div>
      </div>
    );
  };
  const Imgs = (label, field) => (
    <div className="nsp-memo" key={field}>
      <div className="nsp-memo-l"><b>{label}</b></div>
      <label className="nsp-btn nsp-file">🖼 사진 올리기
        <input type="file" accept="image/*" multiple hidden onChange={(e) => { addImgs(field, e.target.files); e.target.value = ''; }} />
      </label>
      {data[field].length > 0 && (
        <div className="nsp-ex-imgs">
          {data[field].map((im, i) => (
            <div key={i} className="nsp-thumb"><img src={im.url} alt={im.name} /><button className="nsp-dl" title="다운로드" onClick={() => downloadImg(im)}>⬇</button><button className="nsp-x" onClick={() => rmImg(field, i)}>✕</button></div>
          ))}
        </div>
      )}
    </div>
  );

  const LinkRow = (label, key, ph) => {
    const slot = data[key]; const st = status[key];
    return (
      <div className="nsp-memo" key={key}>
        <div className="nsp-memo-l"><b>{label}</b>{slot.date && <span className="nsp-memo-date">저장: {slot.date}</span>}</div>
        <div className="nsp-memo-btns">
          <input className="nsp-linkinput" value={slot.text} placeholder={ph} onChange={(e) => setSlot(key, { text: e.target.value })} />
          <button className="nsp-btn ghost" onClick={() => { if (slot.text) window.open(slot.text, '_blank'); }}>열기</button>
          <button className="nsp-btn" onClick={() => save(key)}>💾 저장</button>
          <button className="nsp-btn danger" onClick={() => del(key)}>🗑 삭제</button>
          {st === 'saving' && <span className="nsp-memo-st">저장 중…</span>}
          {st === 'saved' && <span className="nsp-memo-st ok">저장됨 ✓</span>}
          {st === 'error' && <span className="nsp-memo-st err">저장 실패 (서버 API 필요)</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="nsp-tut">
      <div className="nsp-tut-h">1. 지식인 최신글 작성 방법</div>
      {Memo('작성 방법 메모', 'method', '직접 적거나, 아래 [📄 txt 올리기]로 메모장 파일을 올리세요…')}

      <div className="nsp-tut-h">2. 지식인 최신글 프롬프트</div>
      {Memo('🟢 그린레이', 'promptGreen', '그린레이 프롬프트…')}
      {Memo('🔵 보이실린', 'promptBoy', '보이실린 프롬프트…')}
      {Memo('🟣 고음확장기', 'promptHigh', '고음확장기 프롬프트…')}

      <div className="nsp-tut-h">3. 지식인 답변 사진</div>
      {Imgs('🟢 그린레이', 'imgGreen')}
      {Imgs('🔵 보이실린', 'imgBoy')}

      <div className="nsp-tut-h">4. 댓글 사진</div>
      {Imgs('🟢 그린레이 댓글 사진', 'imgCommentGreen')}
      {Imgs('🔵 보이실린 댓글 사진', 'imgCommentBoy')}

      <div className="nsp-tut-h">5. 수정발행 원고 &amp; 댓글</div>
      {LinkRow('📄 원고 시트 링크', 'manuscriptUrl', '원고 구글시트 주소 붙여넣기…')}
      {LinkRow('💬 댓글 시트 링크', 'commentUrl', '댓글 구글시트 주소 붙여넣기…')}
    </div>
  );
}

// ---- 카페 발행: 발행 개수 입력 + 1시간 타이머 + 시트 바로가기 --------------
function CafePublishTab() {
  const [phase, setPhase] = useState('idle'); // idle → running → done
  const [startAt, setStartAt] = useState(null);
  const [endMin, setEndMin] = useState(null);  // 완료 시 걸린 분
  const [now, setNow] = useState(Date.now());
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (phase !== 'running') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const startTimer = () => { setStartAt(Date.now()); setNow(Date.now()); setPhase('running'); };
  const finishTimer = () => { setEndMin(Math.max(1, Math.ceil((Date.now() - startAt) / 60000))); setPhase('done'); };
  const reset = () => { setPhase('idle'); setStartAt(null); setEndMin(null); setCount(0); };

  const min = startAt ? Math.floor((now - startAt) / 60000) : 0;
  const over = phase === 'running' && (now - startAt) / 60000 >= 60;

  return (
    <div className="nsp-kinwrap">
      <div className="nsp-kinlist">
        <div className="nsp-tut-h">발행 시트 바로가기</div>
        <a className="nsp-sheet" href={SHEETS.jehyu} target="_blank" rel="noreferrer">📗 1. 제휴 시트 열기</a>
        <a className="nsp-sheet" href={SHEETS.molbal} target="_blank" rel="noreferrer">📗 2. 몰발 (비실계) 시트 열기</a>

        <div className="nsp-tut-h">발행 개수 입력</div>
        {phase !== 'done' ? (
          <div className="nsp-status">⏱ 타이머를 <b>시작 → 완료</b> 한 뒤에 발행 개수를 입력할 수 있어요.</div>
        ) : (
          <div className="nsp-pub-row">
            <button className="nsp-btn ghost" onClick={() => setCount((c) => Math.max(0, c - 1))}>−</button>
            <input className="nsp-pub-num" type="number" min="0" value={count}
              onChange={(e) => { const n = parseInt(e.target.value, 10); setCount(Number.isFinite(n) ? Math.max(0, n) : 0); }} />
            <button className="nsp-btn" onClick={() => setCount((c) => c + 1)}>+1 발행</button>
            <span className="nsp-status">몇 개 발행했는지 적어주세요</span>
          </div>
        )}
      </div>

      <div className="nsp-timer">
        <div className="nsp-tmr-h">⏱ 1시간 타이머</div>
        {phase === 'idle' && (
          <>
            <div className="nsp-tmr-time wait">시작 전</div>
            <button className="nsp-btn" onClick={startTimer}>▶ 타이머 시작</button>
          </>
        )}
        {phase === 'running' && (
          <>
            <div className={`nsp-tmr-time ${over ? 'over' : ''}`}>{over ? '⏰ 시간 초과' : `${min}분/60분`}</div>
            <button className="nsp-btn danger" onClick={finishTimer}>■ 완료</button>
          </>
        )}
        {phase === 'done' && (
          <>
            <div className="nsp-tmr-count">{count}<small>개</small></div>
            <div className="nsp-tmr-time done">🎉 완료!<br />{endMin}분 걸림</div>
            <button className="nsp-btn ghost" onClick={reset}>↺ 다시</button>
          </>
        )}
      </div>
    </div>
  );
}

function NaverSchoolPanel({ open, onClose, nickname: nicknameProp }) {
  const [tab, setTab] = useState(null);
  const [nickname, setNickname] = useState(nicknameProp || ''); // 접속된 닉네임(작업자)
  const [tutorial, setTutorial] = useState({
    method:        { text: '', fileName: '', date: '' },
    promptGreen:   { text: '', fileName: '', date: '' },
    promptBoy:     { text: '', fileName: '', date: '' },
    promptHigh:    { text: '', fileName: '', date: '' },
    manuscriptUrl: { text: '', fileName: '', date: '' },
    commentUrl:    { text: '', fileName: '', date: '' },
    imgGreen: [], imgBoy: [],
    imgCommentGreen: [], imgCommentBoy: [],
  });
  const [data, setData] = useState({ keywords: [], urls: [], cafe: [], kin: [], cafeLinks: [] });
  /* 🔗 카페 외부: 관리자 제품·키워드 설정 (서버 저장) */
  const [kwProducts, setKwProducts] = useState([]);   // [{ id, name, keywords:[{id,word}] }]
  const [kwAdmin, setKwAdmin] = useState(false);
  const [kwAdminOpen, setKwAdminOpen] = useState(false);
  const [kwPw, setKwPw] = useState(''); const [kwPwErr, setKwPwErr] = useState(false);
  const [newProduct, setNewProduct] = useState('');
  const [newKw, setNewKw] = useState({});   // { productId: '일괄입력값' }
  const [kwProductFilter, setKwProductFilter] = useState('');   // 제품id (전체 없음)
  const [kwStatusFilter, setKwStatusFilter] = useState('all');   // all | important | high | low | miss
  // 제품이 로드되면 첫 제품을 자동 선택
  useEffect(() => { if (kwProducts.length && !kwProducts.some((p) => p.id === kwProductFilter)) setKwProductFilter(kwProducts[0].id); }, [kwProducts]); // eslint-disable-line
  /* 🔗 카페 외부: 발행 URL 등록 (알바) */
  const [urlOpen, setUrlOpen] = useState(false);
  const [urlText, setUrlText] = useState('');
  const [nspUrls, setNspUrls] = useState([]);   // [{ url, by, at }]
  const KW_ADMIN_PW = 'ckdals987?';
  const saveKwProducts = (list) => { setKwProducts(list); dbSaveNspKw(list); };
  const saveNspUrls = (list) => { setNspUrls(list); dbSaveNspUrls(list); };
  useEffect(() => { if (!open) return;
    dbLoadNspKw().then((d) => { if (Array.isArray(d)) setKwProducts(d); });
    dbLoadNspUrls().then((d) => { if (Array.isArray(d)) setNspUrls(d); });
  }, [open]);
  const [loading, setLoading] = useState(false);
  const [usingMock, setUsingMock] = useState(false);
  const [updatedAt, setUpdatedAt] = useState('');

  // 네이버키워드 필터 상태 (제품별 / 노출별 / 우리순위 정렬)
  const [product, setProduct] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | important | high | low | miss
  const [sortDir, setSortDir] = useState('asc');            // asc=높은순, desc=낮은순

  async function load() {
    setLoading(true);
    try {
      const j = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(); return r.json(); };
      const [kw, urls, cafe, kin, clinks] = await Promise.all([
        j(`${MOIP_API}/api/echo/keywords`),
        j(`${MOIP_API}/api/echo/urls`),
        j(`${MOIP_API}/api/echo/posts?source=cafe`),
        j(`${MOIP_API}/api/echo/posts?source=kin`),
        j(`${MOIP_API}/api/echo/cafe-links`),
      ]);
      const pick = (x) => x.items || x;
      setData({ keywords: pick(kw), urls: pick(urls), cafe: pick(cafe), kin: pick(kin), cafeLinks: pick(clinks) });
      setUpdatedAt(kw.updatedAt || '');
      setUsingMock(false);
    } catch (e) {
      setData(MOCK);            // 서버 API 미설정/CORS 미허용 → 예시 데이터
      setUsingMock(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (open) load(); /* eslint-disable-next-line */ }, [open]);

  // 튜토리얼 메모: 우리 Supabase(nsptut)에서 불러오기 (모두 공유·영구)
  useEffect(() => {
    if (!open) return;
    (async () => {
      const all = await dbLoadNspTut();
      if (all && typeof all === 'object') {
        setTutorial((prev) => {
          const next = { ...prev };
          Object.keys(all).forEach((k) => {
            const v = all[k];
            if (!v || typeof v !== 'object') return;
            if ('images' in v && Array.isArray(v.images)) next[k] = v.images;   // 사진 슬롯 복원
            else if ('text' in v) next[k] = { ...next[k], ...v };                // 메모/링크 슬롯 복원
          });
          return next;
        });
      }
    })();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // 데이터가 바뀌면 제품 선택 기본값을 첫 제품으로
  useEffect(() => {
    const ps = [...new Set(data.keywords.map((k) => k.product).filter(Boolean))];
    if (ps.length && !ps.includes(product)) setProduct(ps[0]);
  }, [data.keywords]); // eslint-disable-line

  if (!open) return null;
  const num = (n) => (n || n === 0 ? Number(n).toLocaleString() : '–');
  const mockTag = usingMock ? ' · (예시 데이터)' : '';

  // ---- 네이버키워드: 제품별 필터 → 노출별 필터 → 우리순위 정렬 ----
  const products = [...new Set(data.keywords.map((k) => k.product).filter(Boolean))];
  const inProduct = data.keywords.filter((k) => (products.length ? k.product === product : true));
  const counts = {
    high:      inProduct.filter((k) => normStatus(k.status) === 'high').length,
    low:       inProduct.filter((k) => normStatus(k.status) === 'low').length,
    miss:      inProduct.filter((k) => normStatus(k.status) === 'miss').length,
    important: inProduct.filter((k) => k.important).length,
  };
  let kwRows = inProduct.filter((k) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'important') return k.important;
    return normStatus(k.status) === statusFilter;
  });
  kwRows = kwRows.slice().sort((a, b) => {
    const ra = a.ourRank == null ? Infinity : a.ourRank;
    const rb = b.ourRank == null ? Infinity : b.ourRank;
    if (ra === Infinity && rb === Infinity) return 0;
    if (ra === Infinity) return 1;   // 누락(순위없음)은 항상 맨 뒤
    if (rb === Infinity) return -1;
    return sortDir === 'asc' ? ra - rb : rb - ra;
  });

  const PostList = ({ rows }) => (
    <>{rows.map((p, i) => (
      <a key={i} className="nsp-post" href={p.url || '#'} target="_blank" rel="noreferrer">
        <span className="nsp-title">{p.title}</span>
        <span className="nsp-date">{p.date}</span>
      </a>
    ))}</>
  );

  return (
    <div className="nsp-overlay" onClick={onClose}>
      <style>{CSS}</style>
      <div className="nsp-panel" onClick={(e) => e.stopPropagation()}>
        <div className="nsp-hd">
          <span className="nsp-badge">🏫</span>
          <h1>네이버 스쿨</h1>
          <span className="nsp-sub">· 방을 골라 들어가세요</span>
          <button className="nsp-exit" onClick={onClose}>← 나가기</button>
        </div>

        {/* 방 목록 (탭이 null 일 때) */}
        {!tab && (
          <div className="nsp-bd">
            <div className="nsp-roomgrid">
              {NSP_ROOMS.map((r) => (
                <button key={r.id} className="nsp-roomcard" style={{ borderColor: r.color }} onClick={() => setTab(r.id)}>
                  <span className="nsp-roomicon" style={{ background: r.color }}>{r.icon}</span>
                  <span className="nsp-roomname">{r.label}</span>
                  <span className="nsp-roomdesc">{r.desc}</span>
                  {r.soon && <span className="nsp-roomsoon">준비 중</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab && (
        <div className="nsp-bd">
          {tab === 'kw' && <div className="nsp-tinytop">{updatedAt ? `마지막 확인: ${updatedAt}` : '자동 2시간 주기'}{mockTag}</div>}
          <div className="nsp-roomrow">
            <button className="nsp-roomback" onClick={() => setTab(null)}>← 방 목록으로</button>
            {tab === 'kw' && (
              <div className="nsp-roomrow-actions">
                <button className="nsp-iconbtn" title="URL 등록" onClick={() => { setUrlOpen(true); setUrlText(''); }}>🔗 URL 등록</button>
                <button className="nsp-iconbtn" title="새로고침 (크롤링)" onClick={() => load && load()} disabled={loading}>{loading ? '⏳' : '🔄'}</button>
                <button className="nsp-iconbtn" title="환경설정 (관리자)" onClick={() => { if (kwAdmin) setKwAdminOpen(true); else { setKwPw(''); setKwPwErr(false); setKwAdminOpen(true); } }}>⚙️</button>
              </div>
            )}
          </div>
          {tab === 'kw' && kwProducts.length > 0 && (
            <div className="nsp-prodfilter">
              {kwProducts.map((p) => (
                <button key={p.id} className={`nsp-prodbtn ${kwProductFilter === p.id ? 'on' : ''}`} onClick={() => setKwProductFilter(p.id)}>📦 {p.name}</button>
              ))}
            </div>
          )}
          {tab === 'kw' && kwProducts.length > 0 && (
            <div className="nsp-statfilter">
              {[['all','전체'],['important','⭐ 중요'],['high','상위'],['low','하위'],['miss','누락']].map(([k, lb]) => (
                <button key={k} className={`nsp-statbtn ${kwStatusFilter === k ? 'on' : ''}`} onClick={() => setKwStatusFilter(k)}>{lb}</button>
              ))}
            </div>
          )}
          {/* 튜토리얼 방 */}
          {tab === 'tutorial' && <TutorialTab data={tutorial} setData={setTutorial} />}
          {/* 빈 방: 지식인 상위 */}
          {tab === 'kinTop' && (
            <div className="nsp-soon"><div className="nsp-soon-ic">📊</div><div className="nsp-soon-t">지식인 상위</div><div className="nsp-soon-d">아직 준비 중이에요 · 곧 채워질 예정입니다</div></div>
          )}
          {/* 빈 방: 유튜브 최신글 */}
          {tab === 'yt' && (
            <div className="nsp-soon"><div className="nsp-soon-ic">▶️</div><div className="nsp-soon-t">유튜브 최신글</div><div className="nsp-soon-d">아직 준비 중이에요 · 곧 채워질 예정입니다</div></div>
          )}
          {/* ① 카페 외부 (네이버 키워드) */}
          {tab === 'kw' && (() => {
            // 관리자가 등록한 제품·키워드를, 크롤링 결과(data.keywords)와 매칭해 표를 만들어요
            const kwByWord = {};
            (data.keywords || []).forEach((k) => { kwByWord[(k.keyword || '').trim()] = k; });
            const urlByWord = {};
            (data.urls || []).forEach((u) => { if (u.keyword) urlByWord[(u.keyword || '').trim()] = u.url; });
            let rows = [];
            kwProducts.filter((p) => p.id === kwProductFilter).forEach((p) => (p.keywords || []).forEach((kw) => {
              const w = (kw.word || '').trim();
              const src = kwByWord[w] || {};
              rows.push({
                product: p.name, keyword: w, important: !!kw.important,
                cafeRank: src.cafeRank ?? src.ourRank ?? null,
                totalRank: src.totalRank ?? src.rank ?? null,
                status: src.status, volume: src.volume, url: src.url || urlByWord[w] || '',
              });
            }));
            // 상태 필터
            rows = rows.filter((r) => {
              if (kwStatusFilter === 'all') return true;
              if (kwStatusFilter === 'important') return r.important;
              return normStatus(r.status) === kwStatusFilter;
            });
            return (
            <>
              <table className="nsp-table nsp-table-c">
                <thead><tr>
                  <th>키워드</th>
                  <th>카페순위</th>
                  <th>전체순위</th>
                  <th>상태</th>
                  <th>매칭 URL</th>
                  <th>검색량</th>
                </tr></thead>
                <tbody>
                  {rows.map((k, i) => {
                    const st = ST[normStatus(k.status)] || ST.miss;
                    return (
                      <tr key={i}>
                        <td className="nsp-kw">{k.important && <span className="nsp-imp">★</span>}{k.keyword}</td>
                        <td className="nsp-rank">{k.cafeRank ?? '–'}</td>
                        <td className="nsp-rank">{k.totalRank ?? '–'}</td>
                        <td><span className={`nsp-st ${st.cls}`}>{st.label}</span></td>
                        <td className="nsp-urlcell">{k.url ? <a href={k.url} target="_blank" rel="noreferrer">열기 ↗</a> : <span className="nsp-nourl">–</span>}</td>
                        <td className="nsp-vol">{k.volume != null ? num(k.volume) : '–'}</td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr><td colSpan={6} className="nsp-empty">해당하는 키워드가 없어요</td></tr>
                  )}
                </tbody>
              </table>
            </>
            );
          })()}

          {/* ③ 카페 최신글 (답변 요망 / 답변 완료 / 캘린더 워크플로우) */}
          {tab === 'cafe' && (
            <CafeRoom crawledLinks={data.cafe || []} nickname={nicknameProp || nickname} />
          )}

          {/* ④ 지식인 최신글 (답변 카운터 + 1시간 50개 타이머) */}
          {tab === 'kin' && <KinRoom crawledLinks={data.kin || []} nickname={nicknameProp || nickname} />}

          {/* ⚙️ 관리자 환경설정 (제품·키워드 등록) */}
          {kwAdminOpen && (
            <div className="nsp-modal-bg" onClick={() => setKwAdminOpen(false)}>
              <div className="nsp-modal" onClick={(e) => e.stopPropagation()}>
                {!kwAdmin ? (
                  <>
                    <div className="nsp-modal-h">🔑 관리자 환경설정</div>
                    <div className="nsp-modal-sub">비밀번호를 입력하세요</div>
                    <input className="nsp-modal-input" type="password" autoFocus value={kwPw}
                      onChange={(e) => { setKwPw(e.target.value); setKwPwErr(false); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { if (kwPw === KW_ADMIN_PW) { setKwAdmin(true); setKwPwErr(false); } else setKwPwErr(true); } }} />
                    {kwPwErr && <div className="nsp-modal-err">비밀번호가 틀렸어요</div>}
                    <div className="nsp-modal-btns">
                      <button className="nsp-btn ghost" onClick={() => setKwAdminOpen(false)}>취소</button>
                      <button className="nsp-btn" onClick={() => { if (kwPw === KW_ADMIN_PW) { setKwAdmin(true); setKwPwErr(false); } else setKwPwErr(true); }}>확인</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="nsp-modal-h">⚙️ 제품 · 키워드 관리</div>
                    <div className="nsp-modal-sub">제품을 등록하고, 제품마다 키워드를 넣으세요 (모두 서버에 저장돼요)</div>
                    {/* 제품 추가 */}
                    <div className="nsp-addrow">
                      <input className="nsp-modal-input" placeholder="새 제품 이름 (예: 그린레이)" value={newProduct}
                        onChange={(e) => setNewProduct(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && newProduct.trim()) { saveKwProducts([...kwProducts, { id: 'p' + Date.now(), name: newProduct.trim(), keywords: [] }]); setNewProduct(''); } }} />
                      <button className="nsp-btn" onClick={() => { if (newProduct.trim()) { saveKwProducts([...kwProducts, { id: 'p' + Date.now(), name: newProduct.trim(), keywords: [] }]); setNewProduct(''); } }}>＋ 제품</button>
                    </div>
                    {/* 제품 목록 */}
                    <div className="nsp-prodlist">
                      {kwProducts.length === 0 && <div className="nsp-modal-empty">아직 제품이 없어요</div>}
                      {kwProducts.map((p) => (
                        <div key={p.id} className="nsp-prodcard">
                          <div className="nsp-prodhead">
                            <b>📦 {p.name}</b>
                            <span className="nsp-prodcnt">{(p.keywords || []).length}개 키워드</span>
                            <button className="nsp-x2" title="제품 삭제" onClick={() => saveKwProducts(kwProducts.filter((x) => x.id !== p.id))}>삭제</button>
                          </div>
                          <div className="nsp-kwtags">
                            {(p.keywords || []).map((kw) => (
                              <span key={kw.id} className={`nsp-kwtag ${kw.important ? 'imp' : ''}`}>
                                <button className="nsp-kwstar" title={kw.important ? '중요 해제' : '중요로 설정'}
                                  onClick={() => saveKwProducts(kwProducts.map((x) => x.id === p.id ? { ...x, keywords: x.keywords.map((y) => y.id === kw.id ? { ...y, important: !y.important } : y) } : x))}>{kw.important ? '⭐' : '☆'}</button>
                                {kw.word}
                                <button className="nsp-kwdel" title="삭제" onClick={() => saveKwProducts(kwProducts.map((x) => x.id === p.id ? { ...x, keywords: x.keywords.filter((y) => y.id !== kw.id) } : x))}>✕</button>
                              </span>
                            ))}
                          </div>
                          <div className="nsp-kwadd">
                            <textarea className="nsp-modal-ta sm" placeholder={"키워드를 한 줄에 하나씩 넣으세요\n예:\n그린레이 효과\n그린레이 후기\n그린레이 가격"} value={newKw[p.id] || ''}
                              onChange={(e) => setNewKw((v) => ({ ...v, [p.id]: e.target.value }))} />
                            <button className="nsp-btn" onClick={() => {
                              const words = (newKw[p.id] || '').split(/\n+/).map((x) => x.trim()).filter(Boolean);
                              if (!words.length) return;
                              const exist = new Set((p.keywords || []).map((k) => k.word));
                              const add = words.filter((w) => !exist.has(w)).map((w, i) => ({ id: 'k' + Date.now() + '_' + i, word: w }));
                              saveKwProducts(kwProducts.map((x) => x.id === p.id ? { ...x, keywords: [...(x.keywords || []), ...add] } : x));
                              setNewKw((v) => ({ ...v, [p.id]: '' }));
                            }}>＋ 일괄 등록</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="nsp-modal-btns">
                      <button className="nsp-btn ghost" onClick={() => setKwAdmin(false)}>관리자 잠그기</button>
                      <button className="nsp-btn" onClick={() => setKwAdminOpen(false)}>닫기</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 🔗 URL 등록 (알바) */}
          {urlOpen && (
            <div className="nsp-modal-bg" onClick={() => setUrlOpen(false)}>
              <div className="nsp-modal" onClick={(e) => e.stopPropagation()}>
                <div className="nsp-modal-h">🔗 발행 URL 등록</div>
                <div className="nsp-modal-sub">내가 발행한 카페 링크를 넣어주세요 · 여러 개는 줄바꿈으로 한 번에 등록돼요</div>
                <textarea className="nsp-modal-ta" placeholder={"https://cafe.naver.com/...\nhttps://cafe.naver.com/...\n(한 줄에 하나씩)"} value={urlText} onChange={(e) => setUrlText(e.target.value)} />
                <div className="nsp-modal-btns">
                  <button className="nsp-btn ghost" onClick={() => setUrlOpen(false)}>취소</button>
                  <button className="nsp-btn" onClick={() => {
                    const lines = urlText.split(/\n+/).map((x) => x.trim()).filter((x) => /^https?:\/\//.test(x));
                    if (!lines.length) return;
                    const add = lines.map((u) => ({ url: u, by: nicknameProp || '익명', at: new Date().toISOString().slice(0, 10) }));
                    const existing = new Set(nspUrls.map((x) => x.url));
                    const merged = [...add.filter((x) => !existing.has(x.url)), ...nspUrls].slice(0, 500);
                    saveNspUrls(merged); setUrlText(''); setUrlOpen(false);
                  }}>＋ 일괄 등록</button>
                </div>
                <div className="nsp-urlcount">등록된 링크 {nspUrls.length}개</div>
                <div className="nsp-urllist">
                  {nspUrls.length === 0 && <div className="nsp-modal-empty">아직 등록된 링크가 없어요</div>}
                  {nspUrls.map((u, i) => (
                    <div key={i} className="nsp-urlrow">
                      <a href={u.url} target="_blank" rel="noreferrer">{u.url}</a>
                      <span className="nsp-urlby">{u.by} · {u.at}</span>
                      <button className="nsp-x2" onClick={() => saveNspUrls(nspUrls.filter((_, x) => x !== i))}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}


        </div>
        )}
      </div>
    </div>
  );
}

const CSS = `
.nsp-overlay{position:fixed;inset:0;z-index:9999;background:rgba(20,30,12,.55);
  display:flex;align-items:center;justify-content:center;padding:18px;
  font-family:'Galmuri11','DungGeunMo','Apple SD Gothic Neo','Malgun Gothic',monospace;color:#3a2d18;}
.nsp-panel{width:min(880px,100%);background:#f6eccf;border:4px solid #4a3a22;
  box-shadow:0 0 0 4px #8a6a3a,8px 8px 0 rgba(0,0,0,.3);display:flex;flex-direction:column;max-height:92vh;overflow:hidden;}
.nsp-hd{background:#4aa03a;border-bottom:4px solid #2f6b25;color:#fff;padding:10px 14px;
  display:flex;align-items:center;gap:10px;text-shadow:2px 2px 0 rgba(0,0,0,.35);}
.nsp-badge{background:#fff;color:#2f6b25;padding:2px 8px;border:2px solid #2f6b25;font-size:13px;}
.nsp-hd h1{font-size:19px;margin:0;letter-spacing:1px;}
.nsp-sub{font-size:12px;opacity:.9;}
.nsp-exit{margin-left:auto;background:#4a3a22;color:#fff;border:3px solid #000;padding:6px 12px;
  font-family:inherit;font-size:13px;cursor:pointer;text-shadow:1px 1px 0 #000;}
.nsp-exit:active{transform:translate(2px,2px);}
.nsp-tabs{display:flex;gap:6px;padding:10px 12px 0;background:#efe0bd;border-bottom:4px solid #4a3a22;flex-wrap:wrap;}
.nsp-roomgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px;padding:6px;}
.nsp-roomcard{position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;background:#fff;border:3px solid #4a3a22;border-radius:14px;padding:20px 12px;cursor:pointer;font-family:'DotGothic16',monospace;transition:transform .1s;}
.nsp-roomcard:hover{transform:translateY(-3px);}
.nsp-roomicon{width:54px;height:54px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26px;border:3px solid #4a3a22;}
.nsp-roomname{font-size:15px;font-weight:bold;color:#4a3a22;}
.nsp-roomdesc{font-size:11px;color:#8a7a5a;text-align:center;line-height:1.4;}
.nsp-roomsoon{position:absolute;top:8px;right:8px;font-size:9px;background:#b5ad9c;color:#fff;border-radius:8px;padding:2px 7px;}
.nsp-roomback{background:#efe0bd;border:2px solid #4a3a22;border-radius:8px;padding:7px 13px;cursor:pointer;font-family:'DotGothic16',monospace;font-size:12.5px;font-weight:bold;color:#4a3a22;}
.nsp-tinytop{position:absolute;top:8px;right:14px;font-size:9.5px;color:#a89a78;z-index:5;}
.nsp-roomrow{display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap;}
.nsp-roomrow-actions{display:flex;align-items:center;gap:8px;margin-left:auto;}
.nsp-roomrow-actions .nsp-iconbtn{padding:7px 11px;font-size:12.5px;line-height:1;}
.nsp-prodfilter{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;}
.nsp-prodbtn{background:#fff;border:2px solid #4a3a22;border-radius:16px;padding:6px 13px;cursor:pointer;font-family:'DotGothic16',monospace;font-size:12px;font-weight:bold;color:#4a3a22;}
.nsp-prodbtn.on{background:#5b8def;color:#fff;}
.nsp-statfilter{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;}
.nsp-statbtn{background:#fff;border:2px solid #4a3a22;border-radius:14px;padding:5px 12px;cursor:pointer;font-family:'DotGothic16',monospace;font-size:11.5px;font-weight:bold;color:#4a3a22;}
.nsp-statbtn.on{background:#4a3a22;color:#fff;}
.nsp-table-c th,.nsp-table-c td{text-align:center !important;vertical-align:middle;}
.nsp-table-c .nsp-urlcell a{justify-content:center;}
.nsp-kwtag.imp{background:#fff3d6;border-color:#e0a13d;}
.nsp-kwstar{background:none;border:none;cursor:pointer;font-size:12px;padding:0;margin-right:2px;}
.nsp-kwdel{background:none;border:none;cursor:pointer;color:#8a7a5a;font-size:11px;padding:0;margin-left:2px;}
.cafe-top{display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;flex-wrap:wrap;}
.cafe-prods{display:flex;flex-wrap:wrap;gap:6px;flex:1;}
.cafe-prodbtn{background:#fff;border:2px solid #4a3a22;border-radius:16px;padding:6px 13px;cursor:pointer;font-family:'DotGothic16',monospace;font-size:12px;font-weight:bold;color:#4a3a22;}
.cafe-prodbtn.on{background:#3fa07a;color:#fff;}
.cafe-hint{font-size:11.5px;color:#8a7a5a;}
.cafe-actions{display:flex;gap:6px;align-items:center;}
.cafe-meta{display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;}
.cafe-count{font-size:12px;color:#4a3a22;font-weight:bold;flex:1;}
.cafe-goal{font-size:12px;color:#4a3a22;background:#f7efd8;border:2px solid #4a3a22;border-radius:8px;padding:5px 10px;}
.cafe-gbtn{background:#3fa07a;color:#fff;border:2px solid #4a3a22;border-radius:6px;padding:2px 8px;cursor:pointer;font-family:'DotGothic16',monospace;font-size:11px;margin-left:4px;}
.cafe-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;}
.cafe-kwbox{background:#fff;border:2px solid #4a3a22;border-radius:10px;padding:10px;}
.cafe-kwtitle{display:flex;align-items:center;gap:5px;font-size:13.5px;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid #efe0bd;}
.cafe-kwtitle b{flex:1;}
.cafe-kwn{font-size:10.5px;color:#fff;background:#3fa07a;border-radius:10px;padding:1px 8px;}
.cafe-links{display:flex;flex-direction:column;gap:5px;max-height:260px;overflow:auto;}
.cafe-nolink{font-size:11px;color:#b5ad9c;text-align:center;padding:12px;}
.cafe-linkrow{display:flex;align-items:center;gap:5px;}
.cafe-dd{border:2px solid #4a3a22;border-radius:6px;padding:3px 4px;font-family:'DotGothic16',monospace;font-size:10.5px;background:#f7efd8;cursor:pointer;flex-shrink:0;}
.cafe-link{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#2f7d5e;text-decoration:none;font-size:11.5px;}
.cafe-anstabs{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px;}
.cafe-anstab{background:#fff;border:2px solid #4a3a22;border-radius:14px;padding:5px 11px;cursor:pointer;font-family:'DotGothic16',monospace;font-size:11.5px;font-weight:bold;color:#4a3a22;}
.cafe-anslist{display:flex;flex-direction:column;gap:5px;max-height:300px;overflow:auto;}
.cafe-ansrow{display:flex;align-items:center;gap:6px;background:#fff;border:1px solid #d9c79b;border-radius:6px;padding:5px 8px;}
.cafe-ansby{font-size:10px;color:#8a7a5a;white-space:nowrap;}
.cafe-calhead{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;font-size:15px;}
.cafe-cal{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;}
.cafe-caldow{text-align:center;font-size:11px;color:#8a7a5a;padding:4px 0;font-weight:bold;}
.cafe-calcell{min-height:52px;background:#fff;border:2px solid #d9c79b;border-radius:6px;cursor:pointer;display:flex;flex-direction:column;align-items:center;padding:3px;gap:2px;font-family:'DotGothic16',monospace;}
.cafe-calcell.empty{background:transparent;border:none;cursor:default;}
.cafe-calcell.on{border-color:#3fa07a;background:#f2f9f4;}
.cafe-calnum{font-size:12px;color:#4a3a22;font-weight:bold;}
.cafe-caldone{font-size:9px;color:#fff;background:#3fa07a;border-radius:6px;padding:1px 4px;}
.cafe-calsel{margin-top:12px;border-top:2px solid #efe0bd;padding-top:10px;}
.cafe-calsel-h{font-size:13px;font-weight:bold;color:#4a3a22;margin-bottom:8px;}
.cafe-prodbtn.kin.on{background:#b76bd7;}
.kin-list{display:flex;flex-direction:column;gap:6px;}
.kin-row{display:flex;align-items:center;gap:8px;background:#fff;border:2px solid #4a3a22;border-radius:8px;padding:8px 10px;}
.kin-link{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#2f7d5e;text-decoration:none;font-size:12.5px;}
.kin-btns{display:flex;gap:5px;flex-shrink:0;}
.kin-b{border:2px solid #4a3a22;border-radius:6px;padding:5px 10px;cursor:pointer;font-family:'DotGothic16',monospace;font-size:11px;font-weight:bold;background:#fff;color:#4a3a22;}
.kin-b.fail.on{background:#c0563a;color:#fff;}
.kin-b.done.on{background:#3fa07a;color:#fff;}
.kin-ex-list{display:flex;flex-direction:column;gap:6px;max-height:320px;overflow:auto;}
.kin-ex-item{display:flex;flex-direction:column;gap:2px;align-items:flex-start;background:#fff;border:2px solid #4a3a22;border-radius:8px;padding:9px 11px;cursor:pointer;text-align:left;position:relative;font-family:'DotGothic16',monospace;}
.kin-ex-title{font-size:13px;font-weight:bold;color:#4a3a22;}
.kin-ex-sub{font-size:10.5px;color:#8a7a5a;}
.kin-ex-del{position:absolute;top:8px;right:10px;font-size:12px;}
.kin-ex-meta{font-size:11px;color:#8a7a5a;margin-bottom:10px;}
.kin-ex-body{font-size:13px;line-height:1.7;color:#3a2f1e;white-space:pre-wrap;word-break:break-word;max-height:50vh;overflow:auto;background:#fff;border:2px solid #efe0bd;border-radius:8px;padding:12px;}
.nsp-kwadd{display:flex;gap:6px;align-items:flex-start;margin-top:8px;}
.nsp-kwadd .nsp-modal-ta.sm{height:66px;font-size:11.5px;flex:1;}
.nsp-kwadd .nsp-btn{white-space:nowrap;}
.nsp-soon{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:60px 20px;text-align:center;}
.nsp-soon-ic{font-size:54px;}
.nsp-soon-t{font-size:18px;font-weight:bold;color:#4a3a22;}
.nsp-soon-d{font-size:12.5px;color:#8a7a5a;}
.nsp-toolbar2{display:flex;align-items:center;gap:8px;margin-bottom:12px;}
.nsp-iconbtn{background:#efe0bd;border:2px solid #4a3a22;border-radius:8px;padding:7px 11px;cursor:pointer;font-family:'DotGothic16',monospace;font-size:13px;font-weight:bold;color:#4a3a22;}
.nsp-iconbtn:hover{background:#e5d3a5;}
.nsp-urlcell a{color:#2f7d5e;font-weight:bold;text-decoration:none;}
.nsp-nourl{color:#b5ad9c;}
.nsp-modal-bg{position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:200;padding:16px;}
.nsp-modal{width:100%;max-width:460px;max-height:88vh;overflow:auto;background:#f7efd8;border:4px solid #4a3a22;border-radius:14px;padding:18px;font-family:'DotGothic16',monospace;}
.nsp-modal-h{font-size:16px;font-weight:bold;color:#4a3a22;margin-bottom:4px;}
.nsp-modal-sub{font-size:11.5px;color:#8a7a5a;margin-bottom:12px;line-height:1.5;}
.nsp-modal-input{width:100%;box-sizing:border-box;padding:9px;border:2px solid #4a3a22;border-radius:6px;font-family:'DotGothic16',monospace;font-size:13px;background:#fff;}
.nsp-modal-input.sm{font-size:12px;padding:7px;}
.nsp-modal-ta{width:100%;box-sizing:border-box;height:120px;padding:9px;border:2px solid #4a3a22;border-radius:6px;font-family:'DotGothic16',monospace;font-size:12px;background:#fff;resize:vertical;}
.nsp-modal-err{color:#c0392b;font-size:11.5px;margin-top:6px;font-weight:bold;}
.nsp-modal-btns{display:flex;gap:8px;justify-content:flex-end;margin-top:12px;}
.nsp-modal-empty{font-size:12px;color:#8a7a5a;text-align:center;padding:16px;}
.nsp-addrow{display:flex;gap:6px;margin-top:8px;}
.nsp-prodlist{margin-top:12px;display:flex;flex-direction:column;gap:10px;}
.nsp-prodcard{background:#fff;border:2px solid #4a3a22;border-radius:10px;padding:10px;}
.nsp-prodhead{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
.nsp-prodhead b{flex:1;font-size:13.5px;}
.nsp-prodcnt{font-size:10.5px;color:#8a7a5a;}
.nsp-x2{background:#e7cfc9;border:2px solid #4a3a22;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:10.5px;font-family:'DotGothic16',monospace;}
.nsp-kwtags{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px;}
.nsp-kwtag{display:inline-flex;align-items:center;gap:4px;background:#eef4ff;border:2px solid #4a3a22;border-radius:14px;padding:3px 9px;font-size:11.5px;}
.nsp-kwtag button{background:none;border:none;cursor:pointer;color:#8a7a5a;font-size:11px;padding:0;}
.nsp-urlcount{font-size:12px;font-weight:bold;color:#4a3a22;margin:12px 0 6px;}
.nsp-urllist{display:flex;flex-direction:column;gap:5px;max-height:180px;overflow:auto;}
.nsp-urlrow{display:flex;align-items:center;gap:6px;background:#fff;border:1px solid #d9c79b;border-radius:6px;padding:5px 8px;font-size:11px;}
.nsp-urlrow a{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#2f7d5e;text-decoration:none;}
.nsp-urlby{color:#8a7a5a;font-size:10px;white-space:nowrap;}
.nsp-tab{font-family:inherit;font-size:13px;cursor:pointer;color:#6b5836;background:#f6eccf;
  border:3px solid #4a3a22;border-bottom:none;padding:8px 14px;position:relative;top:4px;}
.nsp-tab.on{background:#fff;color:#3a2d18;font-weight:bold;top:2px;padding-bottom:12px;}
.nsp-bd{padding:14px;overflow:auto;background:#f6eccf;}
.nsp-toolbar{display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;}
.nsp-status{font-size:12px;color:#6b5836;}
.nsp-btn{font-family:inherit;font-size:13px;cursor:pointer;color:#fff;background:#4aa03a;
  border:3px solid #2f6b25;padding:7px 12px;text-shadow:1px 1px 0 rgba(0,0,0,.3);}
.nsp-btn:active{transform:translate(2px,2px);}
.nsp-btn:disabled{opacity:.6;cursor:default;}
.nsp-table{width:100%;border-collapse:collapse;font-size:13px;}
.nsp-table thead th{background:#2f6b25;color:#fff;padding:8px 6px;text-align:left;
  border:2px solid #4a3a22;text-shadow:1px 1px 0 #000;font-size:12px;}
.nsp-table tbody td{padding:8px 6px;border:2px solid #d9c79b;background:#fff;}
.nsp-table tbody tr:nth-child(even) td{background:#fbf5e6;}
.nsp-kw{font-weight:bold;color:#3a2d18;}
.nsp-rank{text-align:center;font-variant-numeric:tabular-nums;}
.nsp-vol{text-align:right;font-variant-numeric:tabular-nums;color:#6b5836;}
.nsp-st{display:inline-block;padding:3px 8px;border:2px solid rgba(0,0,0,.35);color:#fff;
  font-size:11px;text-shadow:1px 1px 0 rgba(0,0,0,.35);white-space:nowrap;}
.st-top{background:#e6a41e;}.st-high{background:#3fae4b;}.st-low{background:#3a86d1;}.st-expo{background:#3a86d1;}.st-miss{background:#c1503f;}
.nsp-filter{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:8px;}
.nsp-flabel{font-size:11px;color:#fff;background:#2f6b25;padding:5px 8px;border:2px solid #4a3a22;white-space:nowrap;}
.nsp-pill{font-family:inherit;font-size:12px;cursor:pointer;color:#3a2d18;background:#fff;border:2px solid #8a6a3a;padding:5px 10px;}
.nsp-pill.on{background:#4aa03a;color:#fff;border-color:#2f6b25;text-shadow:1px 1px 0 rgba(0,0,0,.3);}
.nsp-sort{display:inline-flex;align-items:center;gap:6px;margin-left:auto;}
.nsp-imp{color:#e6a41e;margin-right:3px;}
.nsp-empty{text-align:center;color:#6b5836;padding:16px;}
.nsp-subtabs{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:10px;border-bottom:3px solid #d9c79b;padding-bottom:8px;}
.nsp-subtab{font-family:inherit;font-size:13px;cursor:pointer;color:#3a2d18;background:#efe0bd;border:3px solid #4a3a22;padding:7px 14px;}
.nsp-subtab.on{background:#4aa03a;color:#fff;border-color:#2f6b25;text-shadow:1px 1px 0 rgba(0,0,0,.3);}
.nsp-worker{margin-left:auto;font-size:12px;color:#6b5836;display:inline-flex;align-items:center;gap:6px;}
.nsp-nick{font-family:inherit;font-size:12px;padding:5px 8px;border:2px solid #8a6a3a;background:#fdf8ec;color:#3a2d18;width:110px;}
.nsp-nick.warn{border-color:#c1503f;background:#fdecea;}
.nsp-nickwarn{color:#c1503f;font-size:11px;}
.nsp-subtabs2{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;}
.nsp-kwgroup{margin-bottom:12px;}
.nsp-kwhead{font-size:12px;font-weight:bold;color:#2f6b25;background:#eef6e4;border:2px solid #cfe3bd;padding:5px 8px;margin-bottom:6px;}
.nsp-linkrow{display:flex;align-items:center;gap:10px;background:#fff;border:2px solid #d9c79b;padding:8px 10px;margin-bottom:6px;}
.nsp-linkrow .nsp-title{flex:1;font-size:13px;color:#3a86d1;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.nsp-meta{font-size:11px;color:#6b5836;white-space:nowrap;}
.nsp-dd{font-family:inherit;font-size:12px;padding:5px 6px;border:2px solid #8a6a3a;background:#fdf8ec;color:#3a2d18;cursor:pointer;}
.nsp-workrow{display:flex;align-items:center;gap:10px;background:#fff;border:2px solid #d9c79b;padding:8px 10px;margin-bottom:6px;flex-wrap:wrap;}
.nsp-wname{font-weight:bold;color:#3a2d18;font-size:13px;}
.nsp-wbreak{font-size:11px;color:#6b5836;}
.nsp-cal{max-width:520px;}
.nsp-calhd{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:10px;font-size:14px;color:#3a2d18;}
.nsp-calgrid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;}
.nsp-caldow{text-align:center;font-size:11px;color:#6b5836;padding:4px 0;}
.nsp-calcell{position:relative;min-height:46px;border:2px solid #d9c79b;background:#fff;padding:3px;}
.nsp-calcell.empty{background:transparent;border-color:transparent;}
.nsp-calnum{font-size:11px;color:#6b5836;}
.nsp-calbadge{position:absolute;bottom:4px;right:4px;background:#4aa03a;color:#fff;font-size:11px;padding:1px 6px;border:2px solid #2f6b25;}
.nsp-kinwrap{display:flex;gap:12px;align-items:flex-start;}
.nsp-kinlist{flex:1;min-width:0;}
.nsp-kbtn{font-family:inherit;font-size:12px;cursor:pointer;border:2px solid rgba(0,0,0,.3);padding:5px 10px;color:#fff;text-shadow:1px 1px 0 rgba(0,0,0,.3);white-space:nowrap;}
.nsp-kbtn:active{transform:translate(1px,1px);}
.kx{background:#c1503f;}
.kdone{background:#4aa03a;}
.nsp-badgek{font-size:11px;color:#fff;padding:2px 7px;border:2px solid rgba(0,0,0,.3);white-space:nowrap;text-shadow:1px 1px 0 rgba(0,0,0,.3);}
.nsp-timer{width:150px;flex:none;background:#fff;border:3px solid #4a3a22;box-shadow:3px 3px 0 rgba(0,0,0,.2);padding:12px;text-align:center;position:sticky;top:0;}
.nsp-tmr-h{font-size:12px;color:#2f6b25;font-weight:bold;margin-bottom:8px;}
.nsp-tmr-count{font-size:30px;color:#3a2d18;line-height:1;}
.nsp-tmr-count small{font-size:14px;color:#6b5836;}
.nsp-tmr-count.done{color:#4aa03a;}
.nsp-tmr-bar{height:10px;background:#eee;border:2px solid #8a6a3a;margin:8px 0;overflow:hidden;}
.nsp-tmr-bar span{display:block;height:100%;background:#4aa03a;}
.nsp-tmr-time{font-size:15px;color:#3a2d18;font-weight:bold;line-height:1.4;margin:6px 0;}
.nsp-tmr-time.done{color:#4aa03a;}
.nsp-tmr-time.over{color:#c1503f;}
.nsp-tmr-time.wait{font-size:12px;font-weight:normal;color:#6b5836;}
.nsp-tmr-note{font-size:10px;color:#6b5836;margin-top:6px;}
.nsp-tut-h{font-size:14px;font-weight:bold;color:#2f6b25;background:#eef6e4;border:2px solid #cfe3bd;padding:7px 10px;margin:14px 0 8px;}
.nsp-tut > .nsp-tut-h:first-child{margin-top:0;}
.nsp-memo{margin-bottom:10px;}
.nsp-memo-l{font-size:12px;color:#6b5836;margin-bottom:4px;}
.nsp-ta{width:100%;min-height:84px;font-family:inherit;font-size:13px;padding:8px;border:2px solid #8a6a3a;background:#fdf8ec;color:#3a2d18;resize:vertical;line-height:1.6;}
.nsp-memo-l{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.nsp-memo-file{font-size:11px;color:#2f6b25;}
.nsp-memo-date{font-size:11px;color:#6b5836;}
.nsp-memo-btns{display:flex;align-items:center;gap:8px;margin-top:6px;flex-wrap:wrap;}
.nsp-btn.ghost{background:#efe0bd;color:#3a2d18;border-color:#8a6a3a;text-shadow:none;}
.nsp-btn.danger{background:#c1503f;border-color:#7a2f24;}
.nsp-memo-st{font-size:11px;color:#6b5836;}
.nsp-memo-st.ok{color:#2f6b25;}
.nsp-memo-st.err{color:#c1503f;}
.nsp-linkinput{flex:1;min-width:220px;font-family:inherit;font-size:12px;padding:7px 9px;border:2px solid #8a6a3a;background:#fdf8ec;color:#3a2d18;}
.nsp-sheet{display:block;background:#fff;border:2px solid #cfe3bd;color:#2f6b25;text-decoration:none;padding:9px 12px;margin-bottom:6px;font-size:13px;}
.nsp-sheet:hover{background:#eef6e4;}
.nsp-pub-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;}
.nsp-pub-num{width:90px;font-family:inherit;font-size:16px;padding:6px 8px;border:2px solid #8a6a3a;background:#fdf8ec;color:#3a2d18;text-align:center;}
.nsp-legend{display:flex;gap:12px;flex-wrap:wrap;margin-top:12px;font-size:11px;color:#6b5836;}
.nsp-legend span{display:inline-flex;align-items:center;gap:5px;}
.nsp-dot{width:11px;height:11px;border:2px solid rgba(0,0,0,.35);display:inline-block;}
.nsp-post{display:flex;align-items:center;gap:10px;background:#fff;border:2px solid #d9c79b;
  padding:9px 10px;margin-bottom:7px;cursor:pointer;text-decoration:none;}
.nsp-post:hover{background:#fbf5e6;border-color:#8a6a3a;}
.nsp-tag{font-size:11px;color:#fff;padding:2px 7px;border:2px solid rgba(0,0,0,.3);white-space:nowrap;}
.tag-cafe{background:#2db400;}.tag-kin{background:#00b1a4;}.tag-blog{background:#00a86b;}
.nsp-title{flex:1;color:#3a2d18;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.nsp-date{font-size:11px;color:#6b5836;white-space:nowrap;}
.nsp-right{margin-left:auto;}
.nsp-expanel{background:#fff;border:2px solid #d9c79b;padding:12px;margin-bottom:12px;}
.nsp-ex-h{font-weight:bold;color:#2f6b25;margin-bottom:10px;font-size:13px;}
.nsp-ex-label{font-size:11px;color:#6b5836;margin:8px 0 4px;}
.nsp-ex-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
.nsp-input{flex:1;min-width:180px;font-family:inherit;font-size:13px;padding:7px 9px;border:2px solid #8a6a3a;background:#fdf8ec;color:#3a2d18;}
.nsp-file{display:inline-flex;align-items:center;cursor:pointer;}
.nsp-ex-links{list-style:none;margin:8px 0 0;padding:0;}
.nsp-ex-links li{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px dashed #e0d3ad;font-size:12px;}
.nsp-ex-links a{color:#3a86d1;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.nsp-x{font-family:inherit;cursor:pointer;background:#c1503f;color:#fff;border:2px solid rgba(0,0,0,.3);font-size:10px;padding:2px 6px;}
.nsp-ex-imgs{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;}
.nsp-thumb{position:relative;width:84px;height:84px;border:2px solid #d9c79b;background:#fbf5e6;}
.nsp-thumb img{width:100%;height:100%;object-fit:cover;}
.nsp-thumb .nsp-x{position:absolute;top:-6px;right:-6px;}
.nsp-thumb .nsp-dl{position:absolute;bottom:-6px;right:-6px;background:#2f7d5e;color:#fff;border:2px solid #1c1c1c;border-radius:6px;width:22px;height:22px;cursor:pointer;font-size:11px;padding:0;}
`;

export default NaverSchoolPanel;
