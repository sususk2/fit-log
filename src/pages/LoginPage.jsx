import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase.js';
import { errorMessage, validateCredentials } from '../errors.js';
import AuthCard from '../components/AuthCard.jsx';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false); // 연속 클릭 방지

  async function handleSubmit(e) {
    e.preventDefault();
    if (pending.current) return;
    const invalid = validateCredentials({ email, password });
    if (invalid) return setError(invalid);
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // 성공하면 useAuth가 로그인 상태를 받아 홈으로 이동한다.
    } catch (err) {
      setError(errorMessage(err));
      setPassword('');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="로그인"
      subtitle="운동과 식단을 기록하고 오늘의 목표를 확인하세요."
      footer={<>계정이 없나요? <Link to="/signup">회원가입</Link></>}
    >
      <form onSubmit={handleSubmit} noValidate>
        <label>이메일
          <input type="email" autoComplete="username" value={email} disabled={busy} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>비밀번호
          <input type="password" autoComplete="current-password" value={password} disabled={busy} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? '로그인 중…' : '로그인'}
        </button>
      </form>
    </AuthCard>
  );
}
