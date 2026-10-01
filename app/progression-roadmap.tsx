export type ProgressionRoadmapStage = {
  id: string;
  label: string;
  condition: string;
  reward: string;
  state: "done" | "current" | "locked";
};

export function ProgressionRoadmap({ stages }: { stages: ProgressionRoadmapStage[] }) {
  const current = stages.find(stage => stage.state === "current") || stages[stages.length - 1];
  return <details className="progression-roadmap">
    <summary><span>成長階梯</span><b>{current?.label || "尚未開始"}</b><small>查看條件與獎勵</small></summary>
    <ol>{stages.map(stage => <li key={stage.id} className={`progression-roadmap-stage is-${stage.state}`}><span className="progression-roadmap-dot" aria-hidden="true">{stage.state === "done" ? "✓" : stage.state === "current" ? "◆" : "·"}</span><span><strong>{stage.label}</strong><small>{stage.condition}</small><em>獎勵・{stage.reward}</em></span></li>)}</ol>
  </details>;
}
