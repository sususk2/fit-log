import { useState } from 'react';
import { Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase.js';
import { authErrorMessage, validateCredentials } from '../authErrors.js';
import AuthCard from '../components/AuthCard.jsx';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const invalid = validateCredentials({ email, password });
    if (invalid) return setError(invalid);
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // 성공하면 App의 onAuthStateChanged가 홈으로 보낸다.
    } catch (err) {
      setError(authErrorMessage(err));
      setLoading(false);
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
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>비밀번호
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? '로그인 중…' : '로그인'}
        </button>
      </form>
    </AuthCard>
  );
}
