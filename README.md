# 작은 주니어 네이버 · 오픈월드 에디션

스타듀밸리풍 16비트 도트 감성의 메타버스 업무 시뮬레이터 프로토타입입니다.
카메라가 캐릭터를 따라 움직이는 오픈월드에서 주민센터·대형건물(퀘스트)·개인집·사이드건물·수영장/헬스장·중앙은행·게시판을 오가고, 강 건너 치앙마이 하우스를 렌트할 수 있습니다.

> 프로토타입 안내: 화폐/환전/렌트/통화·채팅·BGM은 모두 **로컬 시뮬레이션(단일 유저)** 입니다. 실제 금전 거래·실시간 멀티플레이·오디오 재생은 포함되어 있지 않습니다.

## 실행 방법

Node.js 18+ 가 필요합니다.

```bash
npm install
npm run dev
```

브라우저에서 안내되는 주소(기본 http://localhost:5173)로 접속하세요.

빌드/미리보기:

```bash
npm run build
npm run preview
```

## 조작

- 이동: 방향키(⬆⬇⬅➡) 또는 WASD
- 입장/상호작용: 문 앞이나 가구 앞에서 **Space**
- 강은 다리에서만 건널 수 있습니다.

## 폴더 구조

```
little-junior-world/
├─ index.html
├─ package.json
├─ vite.config.js
├─ .gitignore
├─ README.md
└─ src/
   ├─ main.jsx                # 앱 진입점
   └─ LittleJuniorWorld.jsx   # 게임 전체 컴포넌트 (default export App)
```

## GitHub에 올려서 공동작업하기

이 폴더에는 이미 git 초기화와 최초 커밋이 되어 있습니다(`git log`로 확인).
GitHub에 빈 저장소를 만든 뒤 원격만 연결해 push 하면 됩니다.

### 1) GitHub에서 빈 저장소 생성

- github.com → New repository → 이름 입력(예: `little-junior-world`) → **README/gitignore 체크 해제** → Create.
- 또는 GitHub CLI 사용: `gh repo create little-junior-world --public --source=. --remote=origin --push`
  (이 경우 아래 2~3단계는 생략됩니다.)

### 2) 원격 연결 & 푸시 (HTTPS 예시)

```bash
git remote add origin https://github.com/<사용자명>/little-junior-world.git
git branch -M main
git push -u origin main
```

SSH를 쓰면 원격 주소만 `git@github.com:<사용자명>/little-junior-world.git` 로 바꾸면 됩니다.

### 3) 공동작업자 초대

- 저장소 → **Settings → Collaborators** 에서 팀원을 초대하거나,
- 조직(Organization) 저장소로 만들고 팀 권한을 부여하세요.

### 협업 흐름 제안

```bash
git checkout -b feature/내작업          # 기능 브랜치 생성
# ... 코드 수정 ...
git add . && git commit -m "작업 내용"
git push -u origin feature/내작업        # 푸시 후 GitHub에서 Pull Request 생성
```

- `main`은 보호 브랜치로 두고 PR 리뷰 후 병합하는 방식을 권장합니다.
- 이슈(Issues)와 프로젝트 보드로 할 일을 나눠 관리하면 좋아요.

## 다음 단계(선택)

- **실시간 멀티플레이**: 서버(WebSocket 등)로 다른 유저 캐릭터·채팅·회의실 상태를 동기화. 화상/통화는 WebRTC 시그널링 서버 필요.
- **데이터 영속화**: 지금은 새로고침 시 초기화됩니다. DB/백엔드 연동으로 젬·메모·포스트잇 등을 저장.
