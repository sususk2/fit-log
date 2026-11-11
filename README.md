# FitLog · 운동·식단 기록

운동 기록과 식단 기록을 남기고, 하루 목표 대비 달성률을 확인하는 웹 서비스입니다.
초급프로젝트 Term Project (개인).

- 화면: React 19 + Vite
- 로그인·데이터: Firebase Authentication(이메일/비밀번호), Cloud Firestore
- 테스트: Vitest · CI: GitHub Actions

## 로컬 실행

필요: Node.js 20 이상

```bash
npm install
cp .env.example .env.local   # 값 채우기 (아래 Firebase 설정 참고)
npm run dev                  # http://localhost:5173
```

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm test` | 단위 테스트 (Vitest) |
| `npm run build` | 배포용 빌드 → `dist/` |
| `npm run preview` | 빌드 결과 미리보기 |

## Firebase 설정

1. Firebase 콘솔에서 프로젝트 생성 → 웹 앱 추가 → `firebaseConfig` 값을 `.env.local`에 입력
2. Authentication → 로그인 방법 → **이메일/비밀번호** 사용 설정
3. Firestore Database 생성 후 `firestore.rules` 내용을 규칙 탭에 게시

### 에뮬레이터로 실행 (Firebase 프로젝트 없이)

```bash
npm install -g firebase-tools
firebase emulators:start --project demo-fitlog
# .env.local 에 VITE_USE_EMULATOR=true 설정 후
npm run dev
```

## 데이터 구조

| 경로 | 내용 | 접근 |
|------|------|------|
| `users/{uid}` | 닉네임, 가입 시각 | 본인만 읽기·쓰기 |

## 출처

- Vite React 템플릿 구조 참고, 코드는 본 프로젝트용으로 작성
- AI(Claude)를 활용해 초안을 작성하고 직접 실행·검토
