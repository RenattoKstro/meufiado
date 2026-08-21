export function calculateNinetyPercent(totalReceivable: number, totalReceived: number) {
  const receivable = Number.isFinite(totalReceivable) ? Math.max(0, totalReceivable) : 0;
  const received = Number.isFinite(totalReceived) ? Math.max(0, totalReceived) : 0;
  const target = receivable * 0.9;
  return { totalReceivable: receivable, totalReceived: received, target, result: target - received };
}
