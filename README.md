# FitLog · 운동·식단 기록

운동 기록과 식단 기록을 남기고, 하루 목표 대비 달성률과 최근 7일 달성 현황을 확인하는 웹 서비스입니다.
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
5. (배포 후) Authentication → 설정 → **승인된 도메인**에 JCloud 접속 주소(도메인 또는 IP)를 추가
   — 추가하지 않으면 배포 주소에서 로그인 요청이 거절될 수 있습니다. `localhost`는 기본으로 들어 있습니다.

테스트 계정의 비밀번호와 Firebase 설정값은 저장소에 넣지 않습니다. (`.env.local`은 `.gitignore` 대상, 테스트 계정은 LMS 제출란에 기재)

## 기능 확인 순서 (채점용)

1. 회원가입(닉네임, 이메일, 비밀번호 12자 이상) 또는 제출한 테스트 계정으로 로그인
2. 처음 로그인하면 **프로필·목표 설정**: 체중 입력 → `권장값 채우기` → 저장
3. **운동** 탭: 유산소(예: 달리기 30분)와 근력(예: 스쿼트 5세트×10회 60kg) 기록 → 소모 칼로리 자동 계산 확인
4. **계획** 탭: 계획 추가 → `완료` → `보관` (완료 후에는 수정 버튼이 없고, 서버에서도 수정이 거절됨)
5. **식단** 탭: 자주 먹는 음식 버튼으로 점심 기록 → 같은 날 점심을 한 번 더 추가하면 "하루에 하나만" 안내 / 간식은 여러 개 가능 / 기록 수정
6. **요약** 탭: 섭취·소모·순섭취, 목표 달성 여부, 연속 기록일, 최근 7일 달성 현황
7. 기록 삭제 → 안내 옆 `실행 취소`로 복구
8. 새로고침, 로그아웃 후 재로그인 → 기록 유지 확인
9. 다른 계정(계정 B)으로 로그인 → 계정 A의 기록이 보이지 않음 (Rules에서 다른 사용자 요청 거절)
10. 예외 상황: 빈 칼로리로 저장, 미래 날짜 선택, 브라우저 개발자 도구에서 Offline 전환 후 저장

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

조회는 `date` 한 필드 조건(`==` 또는 7일 통계용 `>=`·`<=` 범위)만 사용하고 정렬은 화면에서 하므로 복합 색인이 필요 없습니다.

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

서로 다른 디자인 패턴 **10종**을 적용했습니다. (같은 패턴을 여러 곳에 쓴 경우 1종으로 셈)

| # | 패턴 | 위치 | 하는 일 |
|---|------|------|---------|
| 1 | Strategy | `domain/burnStrategies.js` (CardioBurnStrategy·StrengthBurnStrategy), `domain/goalStrategies.js` (Lose·Maintain·GainStrategy) | 운동 종류별 소모 칼로리 계산, 목표별 권장값과 달성 판단 |
| 2 | Factory | `domain/workoutFactory.js` `createWorkout` | 화면 입력 → 종류에 맞게 검사·계산된 운동 기록 생성 |
| 3 | State | `domain/planState.js` (Planned·Done·ArchivedState) | 계획 예정 → 완료 → 보관, 상태별 허용 동작 |
| 4 | Chain of Responsibility | `domain/mealValidation.js` (MealHandler 하위 처리자 5개) | 식단 입력 단계별 검사(끼니·음식·칼로리·단백질·중복) |
| 5 | Facade | `domain/DailySummaryService.js` | 오늘의 요약·최근 7일 통계 계산 창구 |
| 6 | Command | `domain/commands.js` (DeleteRecordCommand·CommandHistory) | 삭제와 실행 취소 |
| 7 | Repository | `data/firestoreRepository.js`, `data/memoryRepository.js` | Firestore/메모리 저장소를 같은 인터페이스로 |
| 8 | Adapter | `data/adapters.js` | Firebase User·Snapshot·Timestamp → 앱 객체 |
| 9 | Observer | `lib/Subject.js`, `data/authStore.js` → `useAuth.js` | 로그인 상태·데이터 변경 알림 |
| 10 | Singleton | `lib/singleton.js`, `firebase.js` `getFirebase` | Firebase 연결 하나만 생성 |

패턴 적용 전(모든 기능을 `HomePage.jsx` 하나에 둔 버전)은 커밋 "feat: 프로필·운동·계획·식단·요약 기능 (변경 전: 단일 컴포넌트 버전)"에 남겨 두었습니다.

## 예외 처리

| 상황 | 처리 | 위치 |
|------|------|------|
| 입력 오류 (빈 값·범위·형식) | 저장 전에 막고 폼 바로 아래에 안내 | `domain/*` 검사, `components/Feedback.jsx` |
| 끼니 중복 (같은 날 점심 두 번) | 화면에서 막고, 서버 Rules에서도 거절 | `domain/mealValidation.js`, `firestore.rules` |
| 계획 상태 역행·완료 후 수정 | 버튼을 숨기고, 서버 Rules에서도 거절 | `domain/planState.js`, `firestore.rules` |
| 로그인 실패 | 오류 코드를 한국어로 안내, 비밀번호 칸 비움 | `pages/LoginPage.jsx`, `errors.js` |
| 로딩 | 프로필·목록마다 "불러오는 중" 표시 | 각 패널 |
| 빈 목록 | 목록마다 첫 기록을 안내 | 각 패널 |
| 저장 실패 (권한·서버 오류) | 오류 안내, 입력값 유지 | `hooks/useActionRunner.js` |
| 오프라인 | 상단 표시, 저장 요청을 보내지 않음 (연결 후 중복 저장 방지) | `hooks/useOnlineStatus.js`, `useActionRunner.js` |
| 저장 지연 (10초 초과) | 기다리기를 멈추고 안내, 버튼 다시 사용 가능 | `lib/withTimeout.js` |
| 연속 클릭 | 첫 요청이 끝날 때까지 무시 | `useActionRunner.js` (pending ref) |
| 미래·잘못된 날짜 | 날짜 이동을 막고 안내 | `lib/dates.js` `checkRecordDate` |
| 실수로 삭제 | 실행 취소 버튼 (보관한 계획은 확인창) | `domain/commands.js` |
| 화면 오류 | 흰 화면 대신 새로고침 안내 | `components/ErrorBoundary.jsx` |
| Firebase 설정 누락 | "Firebase 연결 준비" 안내, 빌드 중단 | `App.jsx`, `scripts/check-env.mjs` |

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
