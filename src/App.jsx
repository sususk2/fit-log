import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase.js';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import HomePage from './pages/HomePage.jsx';

export default function App() {
  // undefined: 아직 확인 중 / null: 비로그인 / 객체: 로그인한 사용자
  const [user, setUser] = useState(undefined);

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);

  if (user === undefined) {
    return <div className="center-screen"><p className="muted">로그인 상태를 확인하는 중…</p></div>;
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/signup" element={user ? <Navigate to="/" replace /> : <SignupPage />} />
        <Route path="/" element={user ? <HomePage user={user} /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
