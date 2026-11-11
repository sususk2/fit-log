// 로그인·회원가입 화면이 함께 쓰는 카드 틀
export default function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="center-screen">
      <main className="auth-card">
        <div className="brand"><span className="brand-mark" aria-hidden="true" />FitLog</div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
        {children}
        {footer && <p className="auth-footer">{footer}</p>}
      </main>
    </div>
  );
}
