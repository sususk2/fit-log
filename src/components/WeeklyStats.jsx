// 최근 7일 달성 통계 — DailySummaryService.weekly()(Facade)가 만든 값을 막대로 보여 준다.
export default function WeeklyStats({ weekly, loading, selectedDate }) {
  const w = weekly;
  const goalPct = w.calorieGoal ? Math.min((w.calorieGoal / w.maxKcal) * 100, 100) : null;

  return (
    <div className="weekly">
      <div className="section-heading">
        <h3>최근 7일 달성 현황</h3>
        {w.goalRule && <span className="hint">달성 기준: {w.goalRule}</span>}
      </div>

      <div className="weekly-summary">
        <span><strong>{w.achievedDays}</strong>/7일 목표 달성</span>
        <span><strong>{w.workoutDays}</strong>일 운동</span>
        <span>평균 섭취 <strong>{w.avgIntake}</strong>kcal</span>
        <span>총 소모 <strong>{w.totalBurned}</strong>kcal</span>
      </div>

      {loading ? <p className="empty" role="status">최근 기록을 불러오는 중…</p>
        : w.mealDays === 0 && !w.workoutDays ? <p className="empty">최근 7일 동안 기록이 없습니다.</p>
          : (
            <ul className="week-bars" aria-label="최근 7일 섭취 칼로리">
              {w.days.map((d) => (
                <li key={d.date} className={d.date === selectedDate ? 'current' : ''}>
                  <span className="week-day">{d.label}</span>
                  <span className="week-track">
                    <span className={`week-fill${d.achieved ? ' ok' : ''}`}
                      style={{ width: `${(d.intake / w.maxKcal) * 100}%` }} />
                    {goalPct !== null && <span className="week-goal" style={{ left: `${goalPct}%` }} aria-hidden="true" />}
                  </span>
                  <span className="week-value">
                    {d.hasMeals ? `${d.intake}kcal` : '-'}
                    {d.burned > 0 && <small> · 소모 {d.burned}</small>}
                  </span>
                  <span className="week-mark" aria-label={d.achieved ? '달성' : '미달성'}>{d.achieved ? '✓' : ''}</span>
                </li>
              ))}
            </ul>
          )}
      <p className="hint">막대는 섭취 칼로리, 세로선은 목표 칼로리입니다. 초록 막대는 목표를 달성한 날입니다.</p>
    </div>
  );
}
