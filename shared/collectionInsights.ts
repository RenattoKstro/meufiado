export type ProjectionRisk = {
  status: "healthy" | "attention" | "critical" | "unavailable";
  projectedOverdue: number;
  amountToRecover: number;
  message: string;
};

export function collectionProjectionRisk(input: {
  monthOpening: number;
  projectedReceived: number;
  creditGoal: number;
}): ProjectionRisk {
  const monthOpening = Math.max(0, input.monthOpening);
  const projectedReceived = Math.max(0, input.projectedReceived);
  const creditGoal = Math.max(0, input.creditGoal);
  if (!monthOpening || !creditGoal) {
    return { status: "unavailable", projectedOverdue: 0, amountToRecover: 0, message: "Informe a abertura do mês e a Meta Fiado para calcular o risco." };
  }

  const projectedOverdue = Math.max(monthOpening - projectedReceived, 0);
  const amountToRecover = Math.max(projectedOverdue - creditGoal, 0);
  if (!amountToRecover) {
    return { status: "healthy", projectedOverdue, amountToRecover: 0, message: "Mantendo o ritmo atual, a Meta Fiado tende a ser alcançada." };
  }
  const gapPercent = creditGoal > 0 ? amountToRecover / creditGoal : 1;
  return {
    status: gapPercent >= 0.15 ? "critical" : "attention",
    projectedOverdue,
    amountToRecover,
    message: gapPercent >= 0.15
      ? "No ritmo atual, a filial pode encerrar o mês acima da Meta Fiado."
      : "A Meta Fiado está próxima, mas exige reforço no ritmo de recebimento.",
  };
}

export function monthOverMonth(currentReceived: number, previousReceived: number) {
  const current = Math.max(0, currentReceived);
  const previous = Math.max(0, previousReceived);
  const difference = current - previous;
  return {
    difference,
    percent: previous > 0 ? (difference / previous) * 100 : null,
    direction: difference > 0 ? "up" as const : difference < 0 ? "down" as const : "stable" as const,
  };
}
