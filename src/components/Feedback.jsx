// 저장 결과 안내: 입력 폼 바로 아래에 보여 준다 (화면 맨 위에 띄우면 폼 근처에서 보이지 않음)
export default function Feedback({ message, notice, action }) {
  if (!message && !notice) return null;
  return (
    <div className="feedback" aria-live="polite">
      {message && <p className="form-error" role="alert">{message}</p>}
      {notice && (
        <p className="form-ok" role="status">
          {notice}
          {action}
        </p>
      )}
    </div>
  );
}
