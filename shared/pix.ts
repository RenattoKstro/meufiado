export type PixPayloadInput = {
  key: string;
  amount: number;
  receiverName: string;
  receiverCity: string;
  transactionId?: string;
};

function normalizePixText(value: string, maximumLength: number) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 .\-]/g, "")
    .trim()
    .toUpperCase()
    .slice(0, maximumLength);
}

function emv(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

export function pixCrc16(value: string) {
  let crc = 0xffff;
  for (let index = 0; index < value.length; index += 1) {
    crc ^= value.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    crc &= 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function createPixPayload(input: PixPayloadInput) {
  const key = input.key.trim();
  const amount = Number(input.amount);
  const receiverName = normalizePixText(input.receiverName, 25);
  const receiverCity = normalizePixText(input.receiverCity, 15);
  const transactionId = normalizePixText(input.transactionId || "***", 25) || "***";

  if (!key) throw new Error("Informe a chave PIX.");
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100_000) throw new Error("Informe um valor PIX válido.");
  if (receiverName.length < 2) throw new Error("Informe o nome do recebedor no PIX.");
  if (receiverCity.length < 2) throw new Error("Informe a cidade do recebedor no PIX.");

  const merchantAccount = `${emv("00", "BR.GOV.BCB.PIX")}${emv("01", key)}`;
  const payloadWithoutCrc = [
    emv("00", "01"),
    emv("26", merchantAccount),
    emv("52", "0000"),
    emv("53", "986"),
    emv("54", amount.toFixed(2)),
    emv("58", "BR"),
    emv("59", receiverName),
    emv("60", receiverCity),
    emv("62", emv("05", transactionId)),
    "6304",
  ].join("");
  return `${payloadWithoutCrc}${pixCrc16(payloadWithoutCrc)}`;
}
