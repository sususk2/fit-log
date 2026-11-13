# FitLog · 운동·식단 기록

운동 기록과 식단 기록을 남기고, 하루 목표 대비 달성률을 확인하는 웹 서비스입니다.
초급프로젝트 Term Project (개인).

- 화면: React 19 + Vite
- 로그인·데이터: Firebase Authentication(이메일/비밀번호), Cloud Firestore
- 테스트: Vitest · CI: GitHub Actions

## 로컬 실행

필요: Node.js 24 (`.nvmrc`), Git Bash 기준

```bash
npm install
cp .env.example .env.local   # Firebase 웹 앱 설정값 4개 입력
npm run dev                  # http://127.0.0.1:5173
```

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm test` | 단위 테스트 (Vitest, 에뮬레이터 불필요) |
| `npm run test:rules:emulator` | Firestore 에뮬레이터에서 Security Rules 테스트 (아래 참고) |
| `npm run build` | 설정값 검사 후 배포용 빌드 → `dist/` |
| `npm run preview` | 빌드 결과 미리보기 |

설정값이 비어 있으면 앱은 "Firebase 연결 준비" 안내를 보여 주고, `npm run build`는 누락된 항목을 알려 주며 멈춥니다.

## Firebase 설정 (콘솔에서 진행, CLI 불필요)

1. 프로젝트 생성 → 웹 앱 등록(Hosting 체크 안 함) → `apiKey`, `authDomain`, `projectId`, `appId`를 `.env.local`에 입력
2. Authentication → 로그인 방법 → **이메일/비밀번호** 사용 설정
3. Firestore Database → Standard, `(default)`, `asia-northeast3`, 프로덕션 모드로 생성
4. Firestore → 규칙 탭에 `firestore.rules` 전체를 붙여 넣고 게시

## 배포 (JCloud)

```bash
VITE_BASE_PATH=/ npm run build
# dist/ 안의 파일을 서버의 /var/www/fit-log 로 업로드
```

Nginx 설정은 `deploy/nginx-fitlog.conf`를 사용합니다. 화면 경로를 새로고침해도 `index.html`을 돌려주도록 `try_files`가 설정되어 있습니다.

## 데이터 구조

| 경로 | 내용 | 접근 |
|------|------|------|
| `users/{uid}` | 닉네임, 체중, 목표(감량/유지/증량), 목표 칼로리·단백질, 가입 시각 | 본인만 읽기·쓰기 |
| `users/{uid}/workouts/{자동ID}` | 날짜, 종류(유산소/근력), 이름, 시간·거리 또는 세트·횟수·무게, 소모 칼로리 | 본인만 |
| `users/{uid}/meals/{날짜_끼니}` | 날짜, 끼니, 음식, 칼로리, 단백질 (간식은 자동ID) | 본인만 |
| `users/{uid}/plans/{자동ID}` | 날짜, 제목, 상태(planned → done → archived) | 본인만 |

조회는 `where('date', '==', 날짜)`만 사용하고 정렬은 화면에서 하므로 복합 색인이 필요 없습니다.

## 코드 구조와 디자인 패턴

```
src/
├─ domain/   계산·서비스 규칙 (Firebase를 모름)
├─ data/     저장소·변환·로그인 상태 (Firebase를 아는 유일한 곳)
├─ lib/      Subject·Singleton·날짜·입력 검사 도구
├─ hooks/    저장소 구독(useRecords), 저장 요청 공통 처리(useActionRunner)
├─ components/  Profile·Summary·Workout·Plan·Meal 패널
└─ pages/HomePage.jsx  화면 조립
```

| # | 패턴 | 위치 | 하는 일 |
|---|------|------|---------|
| 1 | Strategy | `domain/burnStrategies.js` | 유산소/근력 소모 칼로리 계산 교체 |
| 2 | Strategy | `domain/goalStrategies.js` | 감량/유지/증량 권장 칼로리·단백질 |
| 3 | Factory | `domain/workoutFactory.js` | 화면 입력 → 검사된 운동 기록 생성 |
| 4 | State | `domain/planState.js` | 계획 예정 → 완료 → 보관, 상태별 허용 동작 |
| 5 | Chain of Responsibility | `domain/mealValidation.js` | 식단 입력 단계별 검사(끼니·음식·칼로리·단백질·중복) |
| 6 | Facade | `domain/DailySummaryService.js` | 오늘의 요약 계산을 한 창구로 |
| 7 | Command | `domain/commands.js` | 삭제와 실행 취소 |
| 8 | Repository | `data/firestoreRepository.js`, `data/memoryRepository.js` | Firestore/메모리 저장소를 같은 인터페이스로 |
| 9 | Adapter | `data/adapters.js` | Firebase User·Snapshot·Timestamp → 앱 객체 |
| 10 | Observer | `lib/Subject.js`, `data/authStore.js` | 로그인 상태·데이터 변경 알림 |
| 11 | Singleton | `lib/singleton.js`, `firebase.js` | Firebase 연결 하나만 생성 |

패턴 적용 전(모든 기능을 `HomePage.jsx` 하나에 둔 버전)은 커밋 "feat: 프로필·운동·계획·식단·요약 기능 (변경 전: 단일 컴포넌트 버전)"에 남겨 두었습니다.

## Security Rules 테스트

`firestore.rules`는 비로그인·다른 사용자 요청, 잘못된 값, 끼니 중복, 계획 상태 역행을 서버에서 거절합니다.
`tests/rules/`의 테스트는 GitHub Actions(`rules-test` 작업)에서 Firestore 에뮬레이터로 자동 실행됩니다.
내 PC에서 돌리려면 Java 21이 필요합니다.

```bash
npm install --no-save --legacy-peer-deps @firebase/rules-unit-testing firebase-tools
npx firebase emulators:exec --only firestore --project demo-fitlog "npm run test:rules"
```

## 출처

| 출처 | 가져온 부분 | 본 프로젝트에서 바꾼 점 |
|------|-------------|-------------------------|
| 초급프로젝트 7주차 실습 코드 (mini-todo) | `firebase.js` 설정 검사, `useAuth` 로그인 상태 관찰, 연속 클릭 방지(`pending` ref), `errors.js` 오류 안내, `check-env.mjs`, Nginx 설정, Rules 작성 방식 | 회원가입·닉네임 프로필, 화면 라우팅, 오류 문구 보완, 운동·식단 데이터 구조와 규칙 |
| 초급프로젝트 7주차 실습 코드 (mini-todo) `useTodos.run()` | 저장 요청 공통 처리 | `hooks/useActionRunner.js`로 분리, 완료 안내 추가 |
| AI (Claude) | 코드 초안 작성 (패턴 구조, 테스트, Rules) | 직접 실행·검토 후 수정 |
