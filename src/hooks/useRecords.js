// 저장소(Repository)를 구독(Observer)해 화면 상태로 바꾸는 훅 모음
import { useEffect, useState } from 'react';
import { errorMessage } from '../errors.js';

export function useProfile(repository) {
  const [state, setState] = useState({ profile: null, loading: true, error: '' });

  useEffect(() => {
    setState({ profile: null, loading: true, error: '' });
    return repository.watch(
      (profile) => setState({ profile, loading: false, error: '' }),
      (error) => setState({ profile: null, loading: false, error: errorMessage(error) }),
    );
  }, [repository]);

  return state;
}

export function useDayRecords(repository, date) {
  const [state, setState] = useState({ items: [], loading: true, error: '' });

  useEffect(() => {
    setState({ items: [], loading: true, error: '' });
    return repository.watchByDate(
      date,
      (items) => setState({ items, loading: false, error: '' }),
      (error) => setState({ items: [], loading: false, error: errorMessage(error) }),
    );
  }, [repository, date]);

  return state;
}

/** 여러 저장소의 최근 기록 날짜를 합친다 (연속 기록일 계산용, 실패해도 화면을 막지 않음) */
export function useRecentDates(repositories) {
  const [datesByIndex, setDatesByIndex] = useState([]);

  useEffect(() => {
    setDatesByIndex([]);
    const stops = repositories.map((repository, index) => repository.watchRecentDates(
      (dates) => setDatesByIndex((prev) => {
        const next = [...prev];
        next[index] = dates;
        return next;
      }),
      () => {},
    ));
    return () => stops.forEach((stop) => stop());
  }, [repositories]);

  return datesByIndex.flat().filter(Boolean);
}
