import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase.js';
import { errorMessage } from '../errors.js';

export default function HomePage({ user }) {
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState('');

  async function logout() {
    if (leaving) return;
    setLeaving(true);
    setError('');
    try { await signOut(auth); } catch (err) { setError(errorMessage(err)); setLeaving(false); }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark" aria-hidden="true" />FitLog</div>
        <div className="topbar-right">
          <span className="muted">{user.displayName || user.email}님</span>
          <button className="btn-ghost" disabled={leaving} onClick={logout}>로그아웃</button>
        </div>
      </header>
      <main className="content">
        {error && <p className="form-error" role="alert">{error}</p>}
        <h1>오늘의 기록</h1>
        <p className="muted">운동 기록과 식단 기록 기능을 이곳에 추가할 예정입니다.</p>
      </main>
    </div>
  );
}
