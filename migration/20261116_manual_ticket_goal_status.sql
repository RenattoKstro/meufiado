ALTER TABLE public."branchMetrics"
  ADD COLUMN IF NOT EXISTS "ticketManualStatus" boolean NULL;

ALTER TABLE public."metricSettings"
  ADD COLUMN IF NOT EXISTS "ticketManualStatus" boolean NULL;

COMMENT ON COLUMN public."branchMetrics"."ticketManualStatus" IS
  'Override manual da Meta Alimentação: true batida, false não batida, null validação automática';

COMMENT ON COLUMN public."metricSettings"."ticketManualStatus" IS
  'Override manual da Meta Alimentação: true batida, false não batida, null validação automática';
