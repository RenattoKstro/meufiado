import { WebhookSignatureValidator } from "mercadopago";

const MERCADO_PAGO_API_URL = "https://api.mercadopago.com";

type MercadoPagoErrorBody = {
  message?: string;
  cause?: Array<{ description?: string }>;
};

export type MercadoPagoPreapproval = {
  id: string;
  status: string;
  init_point?: string;
  sandbox_init_point?: string;
  next_payment_date?: string | null;
};

export type MercadoPagoAuthorizedPayment = {
  id: string;
  preapproval_id?: string | null;
  status?: string | null;
  payment?: {
    id?: string | number | null;
    status?: string | null;
    transaction_amount?: number | null;
    date_approved?: string | null;
  } | null;
};

function accessToken() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("A integração Mercado Pago ainda não está configurada.");
  return token;
}

async function mercadoPagoRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${MERCADO_PAGO_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as MercadoPagoErrorBody;
    const detail = body.message || body.cause?.[0]?.description || `HTTP ${response.status}`;
    throw new Error(`Mercado Pago não pôde processar a assinatura: ${detail}`);
  }
  return response.json() as Promise<T>;
}

export async function createRecurringPreapproval(input: {
  payerEmail: string;
  externalReference: string;
  monthlyPrice: number;
  notificationUrl: string;
  backUrl: string;
}) {
  return mercadoPagoRequest<MercadoPagoPreapproval>("/preapproval", {
    method: "POST",
    body: JSON.stringify({
      reason: "Assinatura mensal Meu Fiado PRO",
      external_reference: input.externalReference,
      payer_email: input.payerEmail,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: input.monthlyPrice,
        currency_id: "BRL",
      },
      back_url: input.backUrl,
      notification_url: input.notificationUrl,
      status: "pending",
    }),
  });
}

export async function getAuthorizedPayment(authorizedPaymentId: string) {
  return mercadoPagoRequest<MercadoPagoAuthorizedPayment>(`/authorized_payments/${encodeURIComponent(authorizedPaymentId)}`);
}

export async function getPreapproval(preapprovalId: string) {
  return mercadoPagoRequest<MercadoPagoPreapproval>(`/preapproval/${encodeURIComponent(preapprovalId)}`);
}

export async function validateMercadoPagoWebhook(input: {
  xSignature?: string;
  xRequestId?: string;
  dataId?: string;
}) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
  if (!secret || !input.xSignature || !input.xRequestId || !input.dataId) return false;
  try {
    await WebhookSignatureValidator.validate({
      xSignature: input.xSignature,
      xRequestId: input.xRequestId,
      dataId: input.dataId,
      secret,
    });
    return true;
  } catch {
    return false;
  }
}
