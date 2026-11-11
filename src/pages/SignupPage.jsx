import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase.js';
import { authErrorMessage, validateCredentials } from '../authErrors.js';
import AuthCard from '../components/AuthCard.jsx';

export default function SignupPage() {
  const [form, setForm] = useState({ nickname: '', email: '', password: '', passwordConfirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nickname.trim()) return setError('닉네임을 입력해 주세요.');
    const invalid = validateCredentials(form, true);
    if (invalid) return setError(invalid);
    setError('');
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      const nickname = form.nickname.trim();
      await updateProfile(cred.user, { displayName: nickname });
      // 사용자 프로필 문서: users/{uid}
      await setDoc(doc(db, 'users', cred.user.uid), {
        nickname,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      setError(authErrorMessage(err));
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="회원가입"
      subtitle="이메일로 가입하고 바로 기록을 시작하세요."
      footer={<>이미 계정이 있나요? <Link to="/login">로그인</Link></>}
    >
      <form onSubmit={handleSubmit} noValidate>
        <label>닉네임
          <input value={form.nickname} maxLength={20} onChange={set('nickname')} />
        </label>
        <label>이메일
          <input type="email" autoComplete="email" value={form.email} onChange={set('email')} />
        </label>
        <label>비밀번호 <span className="hint">6자 이상</span>
          <input type="password" autoComplete="new-password" value={form.password} onChange={set('password')} />
        </label>
        <label>비밀번호 확인
          <input type="password" autoComplete="new-password" value={form.passwordConfirm} onChange={set('passwordConfirm')} />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? '가입 중…' : '가입하기'}
        </button>
      </form>
    </AuthCard>
  );
}
