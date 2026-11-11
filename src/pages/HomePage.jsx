import { signOut } from 'firebase/auth';
import { auth } from '../firebase.js';

export default function HomePage({ user }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark" aria-hidden="true" />FitLog</div>
        <div className="topbar-right">
          <span className="muted">{user.displayName || user.email}님</span>
          <button className="btn-ghost" onClick={() => signOut(auth)}>로그아웃</button>
        </div>
      </header>
      <main className="content">
        <h1>오늘의 기록</h1>
        <p className="muted">운동 기록과 식단 기록 기능을 이곳에 추가할 예정입니다.</p>
      </main>
    </div>
  );
}
