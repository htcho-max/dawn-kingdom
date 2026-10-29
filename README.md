# 새벽의 왕국

브라우저에서 바로 돌아가는 아이소메트릭 실시간 전략(RTS) 게임입니다. 자원을 모으고, 시대를 발전시키고, 군대를 키워 적 부족의 마을회관을 무너뜨리면 승리합니다.

- 외부 라이브러리, 이미지, 오디오 파일이 없습니다. 그래픽(스프라이트·지형)과 효과음은 모두 코드로 생성합니다.
- 컴퓨터(마우스·키보드)와 태블릿(터치) 모두 지원합니다.
- 맵 크기 3종, 부족 2~8, 팀 직접 구성, 부족별 AI 난이도, 지형 6종.

## 바로 해 보기

```bash
npm run build      # dist/index.html 생성
open dist/index.html   # 또는 브라우저로 파일을 직접 열기
```

`main` 브랜치에 push하면 GitHub Pages에 자동 배포됩니다(아래 "배포" 참고).

## 개발

필요한 것: Node.js 20 이상.

```bash
npm ci
npx playwright install chromium   # 처음 한 번 (테스트용 브라우저)
```

개발 중에는 빌드 없이 `src/index.html`을 브라우저로 열면 됩니다. 스크립트 파일을 순서대로 불러오므로 수정 후 새로고침만 하면 반영됩니다.

| 명령 | 하는 일 |
| --- | --- |
| `npm run build` | `src/`를 하나의 HTML로 묶어 `dist/index.html`, `dist/artifact.html` 생성 |
| `npm test` | 빌드 후 묶인 파일로 전체 테스트 |
| `npm run test:src` | 묶지 않은 원본(`src/index.html`)으로 전체 테스트 |
| `npm run serve` | `dist/`를 로컬 서버로 띄우기 (http://localhost:8080) |

### 폴더 구조

```
src/
  index.html          화면 뼈대 (HUD, 패널, 오버레이)
  style.css           스타일 (터치 모드 포함)
  js/                 게임 코드 — 번호 순서대로 불러옴
    00-data.js        상수, 유닛·건물·연구·지형 데이터
    01-utils.js       유틸, 연구 효과가 반영된 능력치
    02-pathfinding.js A* 길찾기
    03-world.js       맵 생성 (지형 6종, 시작 위치, 자원 배치)
    04-simulation.js  엔티티, 명령, 전투, 유닛·건물 갱신, 주둔, 교역, 시장, 시야
    05-ai.js          컴퓨터 부족 AI
    06-step.js        시뮬레이션 한 틱
    07-sprites.js     아이소메트릭 투영, 스프라이트 생성
    08-render.js      지형 베이킹, 월드 렌더링, 미니맵
    09-input.js       마우스·키보드·터치 입력
    10-sound.js       합성 효과음
    11-save.js        저장 / 불러오기 / 저장 코드
    12-ui.js          명령 패널, 정보창, 목표 안내
    13-screens.js     시작 설정, 일시정지, 결과 리포트
    14-main.js        게임 루프, 테스트용 훅(window.__rts)
scripts/build.mjs     번들러 (의존성 없음)
tests/                Playwright + node:test 테스트
docs/                 설계 메모, 변경 이력
```

모든 `src/js` 파일은 하나의 스코프를 공유합니다. 개발 시에는 일반 `<script>`로 전역 스코프에서, 빌드 시에는 하나의 strict IIFE로 묶여 실행됩니다. 그래서 **파일 최상위에서 실행되는 코드는 앞 번호 파일에 정의된 것만 사용해야** 합니다. 함수 안에서 참조하는 것은 순서와 무관합니다. 새 파일을 추가하면 `src/index.html`의 `build:js` 블록에 순서대로 넣으세요.

### 테스트

`tests/`의 테스트는 헤드리스 Chromium에서 게임을 띄우고 `window.__rts` 훅으로 시뮬레이션을 빠르게 돌려 검증합니다.

- `boot` — 원본·빌드 모두 오류 없이 시작
- `ai` — AI가 15분 안에 시대 발전·경제·군대 구성
- `maps` — 지형 6종 × 맵 크기에서 모든 마을회관이 서로 도달 가능
- `gameplay` — 성 유닛·투석기, 교역 수레 수익, 저장 코드 왕복, 팀 구성 검증
- `saves` — v5·v6·v8에서 내보낸 저장 코드가 계속 불러와짐 (`tests/fixtures/`)
- `touch` — 탭, 두 번 탭, 팬, 핀치, 범위 선택, 부대 지정, 건설 확인, 길게 누르기

저장 형식을 바꿀 때는 기존 fixture가 계속 통과하는지 꼭 확인하고, 새 버전의 저장 코드를 fixture로 추가하세요.

## 배포

- **GitHub Pages:** `main`에 push하면 `.github/workflows/pages.yml`이 빌드해 배포합니다. 저장소 Settings → Pages → Source를 **GitHub Actions**로 한 번 설정해야 합니다.
- **Claude 아티팩트:** `dist/artifact.html`은 아티팩트로 게시하기 위한 본문 조각입니다. 빠른 미리보기·공유용으로 계속 쓸 수 있습니다.
- **CI:** push·PR마다 `.github/workflows/ci.yml`이 빌드된 파일과 원본 모두로 테스트합니다.

## 조작 요약

| 컴퓨터 | 태블릿 | 동작 |
| --- | --- | --- |
| 좌클릭 / 드래그 | 탭 / 길게 누른 뒤 끌기 | 선택 / 범위 선택 |
| 우클릭 | 선택 후 탭 | 이동·채집·건설·공격 |
| 더블클릭 | 두 번 탭 | 같은 종류 선택 |
| A + 클릭 | 빈 땅 길게 누르기 | 공격 이동 |
| 방향키·가장자리·휠 | 한 손가락 끌기·두 손가락 핀치 | 시야 이동·확대 |
| Ctrl+숫자 / 숫자 | 오른쪽 부대 버튼 길게 / 탭 | 부대 지정 / 불러오기 |

전체 조작법은 게임 안의 일시정지 → 도움말에 있습니다.

변경 이력은 [docs/CHANGELOG.md](docs/CHANGELOG.md), 설계 메모는 [docs/DESIGN.md](docs/DESIGN.md)를 참고하세요.
