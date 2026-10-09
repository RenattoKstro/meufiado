import { createHmac, timingSafeEqual } from "node:crypto";
import { ENV } from "./_core/env";

const MERCADO_PAGO_API = "https://api.mercadopago.com";

export type MercadoPagoPixPaymentResponse = {
  id?: number | string;
  status?: string;
  status_detail?: string;
  external_reference?: string;
  date_approved?: string | null;
  date_of_expiration?: string | null;
  transaction_amount?: number;
  currency_id?: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
};

export type MercadoPagoWebhookNotification = {
  id?: number | string;
  type?: string;
  topic?: string;
  action?: string;
  data?: { id?: number | string };
};

function requireAccessToken() {
  if (!ENV.mercadoPagoAccessToken) throw new Error("Mercado Pago ainda não está configurado.");
  return ENV.mercadoPagoAccessToken;
}

async function mercadoPagoRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = requireAccessToken();
  const response = await fetch(`${MERCADO_PAGO_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const message = typeof payload === "object" && payload && "message" in payload && typeof payload.message === "string"
      ? payload.message
      : "A API do Mercado Pago recusou a solicitação.";
    throw new Error(`${message} (HTTP ${response.status})`);
  }
  return payload as T;
}

export function createMercadoPagoPixPayment(input: {
  amount: number;
  description: string;
  externalReference: string;
  payerEmail: string;
  notificationUrl: string;
  idempotencyKey: string;
}) {
  return mercadoPagoRequest<MercadoPagoPixPaymentResponse>("/v1/payments", {
    method: "POST",
    headers: { "X-Idempotency-Key": input.idempotencyKey },
    body: JSON.stringify({
      transaction_amount: Number(input.amount.toFixed(2)),
      description: input.description,
      payment_method_id: "pix",
      payer: { email: input.payerEmail },
      external_reference: input.externalReference,
      notification_url: input.notificationUrl,
    }),
  });
}

export function getMercadoPagoPayment(paymentId: string) {
  return mercadoPagoRequest<MercadoPagoPixPaymentResponse>(`/v1/payments/${encodeURIComponent(paymentId)}`);
}

function headerValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function getMercadoPagoWebhookDataId(
  query: Record<string, unknown>,
  notification: MercadoPagoWebhookNotification,
) {
  const queryDataId = query["data.id"] ?? query.data_id ?? query.id;
  const bodyDataId = notification.data?.id ?? ((notification.type === "payment" || notification.topic === "payment") ? notification.id : undefined);
  const value = queryDataId ?? bodyDataId;
  return value === undefined || value === null ? null : String(value);
}

export function getMercadoPagoWebhookRequestId(headers: Record<string, string | string[] | undefined>) {
  return headerValue(headers["x-request-id"] ?? headers["X-Request-Id"] ?? headers["X-REQUEST-ID"]) ?? null;
}

export function verifyMercadoPagoWebhookSignature(input: {
  signature: string | string[] | undefined;
  requestId: string | null;
  dataId: string | null;
  secret: string;
  now?: number;
  maxAgeSeconds?: number;
}) {
  if (!input.secret || !input.requestId || !input.dataId) return false;
  const signature = headerValue(input.signature);
  if (!signature) return false;
  const parts = Object.fromEntries(signature.split(",").map(part => {
    const separator = part.indexOf("=");
    return separator > 0 ? [part.slice(0, separator).trim(), part.slice(separator + 1).trim()] : ["", ""];
  }).filter(([key, value]) => key && value));
  const timestamp = Number(parts.ts);
  const receivedHash = parts.v1;
  if (!Number.isFinite(timestamp) || !receivedHash || !/^[a-fA-F0-9]+$/.test(receivedHash)) return false;
  const now = input.now ?? Math.floor(Date.now() / 1000);
  const maxAgeSeconds = input.maxAgeSeconds ?? 10 * 60;
  if (Math.abs(now - timestamp) > maxAgeSeconds) return false;
  const manifest = `id:${input.dataId};request-id:${input.requestId};ts:${timestamp};`;
  const expectedHash = createHmac("sha256", input.secret).update(manifest).digest("hex");
  const expectedBuffer = Buffer.from(expectedHash, "utf8");
  const receivedBuffer = Buffer.from(receivedHash, "utf8");
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}
