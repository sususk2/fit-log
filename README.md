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
| `npm test` | 단위 테스트 (Vitest) |
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

## 출처

| 출처 | 가져온 부분 | 본 프로젝트에서 바꾼 점 |
|------|-------------|-------------------------|
| 초급프로젝트 7주차 실습 코드 (mini-todo) | `firebase.js` 설정 검사, `useAuth` 로그인 상태 관찰, 연속 클릭 방지(`pending` ref), `errors.js` 오류 안내, `check-env.mjs`, Nginx 설정, Rules 작성 방식 | 회원가입·닉네임 프로필, 화면 라우팅, 오류 문구 보완, 운동·식단 데이터 구조와 규칙 |
| AI (Claude) | 코드 초안 작성 | 직접 실행·검토 후 수정 |
