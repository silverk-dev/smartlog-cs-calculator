# Smartlog CS Calculator

스마트로그 CS 전용 계산기입니다.

현재 버전: **v1.0.0**  
요금 기준: **2026년**

## 파일 구조

```text
smartlog-cs-calculator/
├─ index.html      # 화면 구조
├─ styles.css      # UI / 반응형 스타일
├─ app.js          # 계산 로직 + 버전 번호
├─ CHANGELOG.md    # 버전별 변경 이력
└─ README.md       # 운영 / 배포 가이드
```

## 버전 관리 규칙

이 프로젝트는 `MAJOR.MINOR.PATCH` 형식을 사용합니다.

- `1.0.0 → 1.0.1` : 오타, 버그 수정, 작은 UI 수정
- `1.0.0 → 1.1.0` : 새로운 기능 추가
- `1.0.0 → 2.0.0` : 요금 정책 또는 계산 구조가 크게 변경되는 경우

### 버전 번호는 어디서 바꾸나요?

`app.js` 최상단의 아래 값이 기준입니다.

```js
const APP_VERSION = '1.0.0';
const RELEASE_DATE = '2026-09-10';
const PRICING_YEAR = '2026';
```

`APP_VERSION`을 바꾸면 화면 상단과 하단의 버전 표시는 자동으로 변경됩니다.

## 새 버전 배포 순서

예: `v1.1.0` 배포

1. `app.js`의 `APP_VERSION`을 `1.1.0`으로 변경
2. `RELEASE_DATE`를 배포일로 변경
3. `CHANGELOG.md` 최상단에 `v1.1.0` 변경사항 기록
4. 수정한 파일들을 GitHub에 Commit
5. Netlify 자동 배포 완료 확인
6. GitHub에서 태그 `v1.1.0` 또는 Release 생성

권장 Commit 메시지:

```text
Release v1.1.0
```

## GitHub 태그 / Release 권장 방식

GitHub 저장소에서:

`Releases` → `Draft a new release` → `Choose a tag` → `v1.1.0`

Release 제목도 `v1.1.0`으로 하고 `CHANGELOG.md`의 해당 버전 내용을 복사하면 됩니다.

이렇게 해두면 문제가 생겼을 때 이전 버전 코드를 쉽게 확인하거나 되돌릴 수 있습니다.

## Netlify 배포

`index.html`, `styles.css`, `app.js`를 GitHub 저장소 최상위 경로에 두면 됩니다.

GitHub와 Netlify가 연결된 상태에서는 `main` 브랜치에 Commit하면 Netlify가 자동으로 새 버전을 배포합니다.

## 유지보수 위치

- 화면 구성 / 문구 수정 → `index.html`
- 색상 / 레이아웃 / 모바일 UI 수정 → `styles.css`
- 요금 / 계산식 / 동작 / 버전 수정 → `app.js`
- 변경 이력 기록 → `CHANGELOG.md`

## 배포 전 체크

- 일반회원 환불 계산
- 파트너회원 환불 계산
- 일반회원 PV 업그레이드
- 파트너회원 PV 업그레이드
- 실제 결제금액 자동 표시
- 날짜 역전 입력 시 오류 메시지
- CS 전달용 문구 생성 / 복사
- 모바일 화면 확인
