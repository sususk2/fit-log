import { Component } from 'react';

// 화면을 그리다 예상하지 못한 오류가 나도 흰 화면 대신 안내를 보여 준다.
// (React 19에서도 오류 경계는 클래스 컴포넌트로만 만들 수 있다)
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[FitLog] 화면 오류', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="center-screen">
        <main className="auth-card">
          <div className="brand"><span className="brand-mark" aria-hidden="true" />FitLog</div>
          <h1>화면을 표시하지 못했습니다</h1>
          <p className="muted">일시적인 문제일 수 있습니다. 새로고침해도 계속되면 잠시 뒤 다시 시도해 주세요.</p>
          <p className="muted">저장한 기록은 서버에 그대로 남아 있습니다.</p>
          <button type="button" className="btn-primary" onClick={() => window.location.reload()}>새로고침</button>
        </main>
      </div>
    );
  }
}
