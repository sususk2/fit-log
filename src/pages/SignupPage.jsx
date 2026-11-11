import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase.js';
import { errorMessage, validateCredentials, PASSWORD_MIN } from '../errors.js';
import AuthCard from '../components/AuthCard.jsx';

export default function SignupPage() {
  const [form, setForm] = useState({ nickname: '', email: '', password: '', passwordConfirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    if (pending.current) return;
    const nickname = form.nickname.trim();
    if (!nickname) return setError('닉네임을 입력해 주세요.');
    const invalid = validateCredentials(form, true);
    if (invalid) return setError(invalid);
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      await updateProfile(cred.user, { displayName: nickname });
      // 사용자 프로필 문서: users/{uid}
      await setDoc(doc(db, 'users', cred.user.uid), { nickname, createdAt: serverTimestamp() });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      pending.current = false;
      setBusy(false);
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
          <input value={form.nickname} maxLength={20} disabled={busy} onChange={set('nickname')} />
        </label>
        <label>이메일
          <input type="email" autoComplete="username" value={form.email} disabled={busy} onChange={set('email')} />
        </label>
        <label>비밀번호 <span className="hint">{PASSWORD_MIN}자 이상</span>
          <input type="password" autoComplete="new-password" value={form.password} disabled={busy} onChange={set('password')} />
        </label>
        <label>비밀번호 확인
          <input type="password" autoComplete="new-password" value={form.passwordConfirm} disabled={busy} onChange={set('passwordConfirm')} />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? '가입 중…' : '가입하기'}
        </button>
      </form>
    </AuthCard>
  );
}
