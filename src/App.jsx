import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { setupError } from './firebase.js';
import { useAuth } from './useAuth.js';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import HomePage from './pages/HomePage.jsx';

function SetupNotice() {
  return (
    <div className="center-screen">
      <main className="auth-card">
        <div className="brand"><span className="brand-mark" aria-hidden="true" />FitLog</div>
        <h1>Firebase 연결 준비</h1>
        <p className="muted">.env.example을 .env.local로 복사한 뒤 Firebase 웹 앱의 설정값 4개를 입력하세요.</p>
        <p className="muted">저장 후 개발 서버를 다시 시작하면 로그인 화면이 나타납니다.</p>
      </main>
    </div>
  );
}

export default function App() {
  const { user, ready, message } = useAuth();

  if (setupError) return <SetupNotice />;
  if (!ready) {
    return <div className="center-screen"><p className="muted" role="status">로그인 상태를 확인하는 중…</p></div>;
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      {message && <p className="form-error banner" role="alert">{message}</p>}
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/signup" element={user ? <Navigate to="/" replace /> : <SignupPage />} />
        {/* key: 계정이 바뀌면 화면 상태를 새로 만든다 */}
        <Route path="/" element={user ? <HomePage key={user.uid} user={user} /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
