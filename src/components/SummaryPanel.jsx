function Stat({ label, value, unit, pct, note }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}{unit && <small>{unit}</small>}</strong>
      {pct !== undefined && <div className="bar"><div style={{ width: `${Math.min(pct, 100)}%` }} /></div>}
      {note && <small>{note}</small>}
    </div>
  );
}

// 화면은 DailySummaryService(Facade)가 만든 요약 객체를 보여 주기만 한다.
export default function SummaryPanel({ summary, dayLabel }) {
  const s = summary;
  return (
    <section className="panel">
      <h2>{dayLabel}의 요약</h2>
      <p className="muted">목표: {s.goalLabel} · {s.calorieGoal}kcal · 단백질 {s.proteinGoal}g</p>
      <div className="stats">
        <Stat label="섭취" value={s.intake} unit="kcal" pct={s.caloriePct} note={`목표의 ${s.caloriePct}%`} />
        <Stat label="단백질" value={s.protein} unit="g" pct={s.proteinPct} note={`목표의 ${s.proteinPct}%`} />
        <Stat label="소모" value={s.burned} unit="kcal" note={`운동 ${s.workoutCount}건`} />
        <Stat label="순섭취" value={s.net} unit="kcal" note="섭취 − 소모" />
        <Stat label="계획 달성" value={`${s.plans.done}/${s.plans.total}`} note="완료/전체" />
        <Stat label="연속 기록" value={s.streak} unit="일" note="운동 또는 식단" />
      </div>
      {s.caloriePct > 110 && <p className="muted">목표 칼로리를 {s.overKcal}kcal 넘었습니다.</p>}
      {s.mealCount === 0 && s.workoutCount === 0 && (
        <p className="empty">아직 {dayLabel} 기록이 없습니다. 운동이나 식단 탭에서 기록을 추가해 보세요.</p>
      )}
    </section>
  );
}
