# Smartlog CX Calculator

스마트로그 CX 전용 계산기입니다.

## 버전 관리 방식

버전 정보의 **단일 기준(Single Source of Truth)** 은 `version.js`입니다.

```js
window.APP_META = Object.freeze({
  version: '1.0.0',
  releaseDate: '2026-09-10',
  pricingYear: '2026'
});
```

새 버전을 배포할 때는 `version.js`만 수정하면 계산기 화면 상단/하단의 버전 표기가 자동으로 변경됩니다.

README에는 현재 버전 숫자를 별도로 적지 않으므로 버전 번호를 중복 수정할 필요가 없습니다.

## 파일 구조

```text
smartlog-cx-calculator/
├─ index.html
├─ styles.css
├─ version.js
├─ app.js
├─ CHANGELOG.md
└─ README.md
```

- `index.html` — 화면 구조
- `styles.css` — UI / 반응형 스타일
- `version.js` — 버전 / 배포일 / 요금 기준 연도
- `app.js` — 계산 로직 및 인터랙션
- `CHANGELOG.md` — 버전별 실제 변경 내용
- `README.md` — 운영 / 배포 가이드

## 버전 규칙

`MAJOR.MINOR.PATCH` 형식을 사용합니다.

- `1.0.0 → 1.0.1` : 오타, 버그, 작은 UI 수정
- `1.0.0 → 1.1.0` : 기능 추가
- `1.0.0 → 2.0.0` : 요금 정책이나 계산 구조의 큰 변경

## v1.1.0으로 업그레이드하는 예시

### 1. 기능 수정

필요한 `index.html`, `styles.css`, `app.js`를 수정합니다.

### 2. version.js 한 곳만 수정

```js
window.APP_META = Object.freeze({
  version: '1.1.0',
  releaseDate: '2026-10-01',
  pricingYear: '2026'
});
```

### 3. CHANGELOG.md에 변경 내용 추가

```md
## [1.1.0] - 2026-10-01

### Added
- 새로운 기능 추가

### Changed
- 기존 기능 개선

### Fixed
- 오류 수정
```

`CHANGELOG.md`는 변경 사항 자체를 기록하는 문서이므로 이 부분은 직접 작성합니다.

### 4. GitHub Commit

권장 Commit 메시지:

```text
Release v1.1.0
```

GitHub와 Netlify가 연결되어 있으면 Commit 후 자동 재배포됩니다.

### 5. GitHub Release / Tag

권장 태그:

```text
v1.1.0
```

## 유지보수 위치

- 화면 구성 / 문구 → `index.html`
- 디자인 / 반응형 → `styles.css`
- 버전 / 배포일 / 요금연도 → `version.js`
- 요금 / 계산식 / 동작 → `app.js`
- 변경 기록 → `CHANGELOG.md`

## 핵심 원칙

앞으로 버전 번호를 변경할 때는 **`version.js`만 수정**합니다.

`index.html`, `README.md`, `app.js`에 현재 버전 번호를 따로 기록하지 않습니다.


## 24개월 파트너 할인 규칙

일반 파트너회원 환불 계산에서 24개월 상품은 **최소 30% 할인**이 기본 적용됩니다.

- 선택 25% → 실제 30% 적용
- 선택 30% → 실제 30% 적용
- 선택 42.5% → 실제 42.5% 적용

예: 10만PV / 24개월 / 선택 할인율 25% → **498,900원**
