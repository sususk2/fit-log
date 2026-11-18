// 저장 요청 공통 처리: 연속 클릭 방지(pending ref) · 진행 중 표시 · 오류/완료 안내
// (7주차 실습 useTodos의 run() 방식을 훅으로 분리하고 예외 처리를 보강)
// - 오프라인이면 요청을 보내지 않는다 (연결 후 몰래 저장되어 중복 기록이 생기는 것 방지)
// - 10초 안에 끝나지 않으면 기다리기를 멈추고 안내한다 (버튼이 "저장 중…"에 멈추지 않게)
// - 완료 안내는 몇 초 뒤 자동으로 사라진다
import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../errors.js';
import { withTimeout } from '../lib/withTimeout.js';

export const SAVE_TIMEOUT_MS = 10000;
export const NOTICE_MS = 6000;

function offlineError() {
  const error = new Error('offline');
  error.code = 'fitlog/offline';
  return error;
}

export function useActionRunner({ timeoutMs = SAVE_TIMEOUT_MS, noticeMs = NOTICE_MS } = {}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const pending = useRef(false);

  // 완료 안내 자동 숨김
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), noticeMs);
    return () => clearTimeout(timer);
  }, [notice, noticeMs]);

  /**
   * @param action 실행할 비동기 함수
   * @param doneText 성공 시 보여 줄 안내
   * @param options.requireOnline false면 오프라인에서도 실행 (로그아웃 등)
   */
  const run = useCallback(async (action, doneText = '', { requireOnline = true } = {}) => {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    setMessage('');
    setNotice('');
    try {
      if (requireOnline && typeof navigator !== 'undefined' && navigator.onLine === false) throw offlineError();
      await withTimeout(action(), timeoutMs);
      if (doneText) setNotice(doneText);
      return true;
    } catch (error) {
      setMessage(errorMessage(error));
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }, [timeoutMs]);

  /** 화면에서 먼저 막은 입력 오류를 보여 주고 false를 돌려준다 */
  const fail = useCallback((text) => {
    setNotice('');
    setMessage(text);
    return false;
  }, []);

  const clear = useCallback(() => {
    setMessage('');
    setNotice('');
  }, []);

  return { busy, message, notice, run, fail, clear };
}
