import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { exportRomaneioPdf } from "@/components/RomaneioTool";
import { CheckCircle2, ClipboardSignature, FileDown, Loader2, PenLine, RotateCcw, ShieldCheck } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useRoute } from "wouter";

type SharedItem = { productCode?: string | null; productName: string; unit?: string | null; requestedQuantity: number; approvedQuantity: number; deliveredQuantity: number; notes?: string | null };
type SharedDocument = { id: number; documentNumber?: string | null; transferDate: string; originName: string; originBranch?: string | null; originAddress?: string | null; originNeighborhood?: string | null; originCity?: string | null; originState?: string | null; originManagerName: string; destinationName: string; destinationBranch?: string | null; destinationAddress?: string | null; destinationNeighborhood?: string | null; destinationCity?: string | null; destinationState?: string | null; destinationManagerName: string; notes?: string | null; items: SharedItem[]; status: "draft" | "shared" | "partially_signed" | "signed"; shareToken: string; originSignatureUrl?: string | null; destinationSignatureUrl?: string | null; originSignedAt?: Date | string | null; destinationSignedAt?: Date | string | null; createdAt: Date | string; updatedAt: Date | string };
type Signer = "origin" | "destination";

const statusLabel = { draft: "Rascunho", shared: "Aguardando assinaturas", partially_signed: "Assinatura parcial", signed: "Assinado pelos dois gerentes" };
const statusStyle = { draft: "bg-slate-500/10 text-slate-700", shared: "bg-amber-500/10 text-amber-700", partially_signed: "bg-sky-500/10 text-sky-700", signed: "bg-emerald-500/10 text-emerald-700" };
const formatDate = (value?: Date | string | null) => value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Pendente";
const sharedPdfDocument = (document: SharedDocument) => ({
  ...document,
  documentNumber: document.documentNumber ?? "",
  originBranch: document.originBranch ?? "",
  originAddress: document.originAddress ?? "",
  originNeighborhood: document.originNeighborhood ?? "",
  originCity: document.originCity ?? "",
  originState: document.originState ?? "",
  destinationBranch: document.destinationBranch ?? "",
  destinationAddress: document.destinationAddress ?? "",
  destinationNeighborhood: document.destinationNeighborhood ?? "",
  destinationCity: document.destinationCity ?? "",
  destinationState: document.destinationState ?? "",
  notes: document.notes ?? "",
  items: document.items.map(item => ({ ...item, productCode: item.productCode ?? "", unit: item.unit ?? "", notes: item.notes ?? "" })),
});

function SignaturePad({ onSave, loading }: { onSave: (signature: string) => Promise<void>; loading: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const bounds = canvas.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * (canvas.width / bounds.width), y: (event.clientY - bounds.top) * (canvas.height / bounds.height) };
  };
  const start = (event: React.PointerEvent<HTMLCanvasElement>) => { const canvas = canvasRef.current; if (!canvas) return; const context = canvas.getContext("2d"); if (!context) return; canvas.setPointerCapture(event.pointerId); const p = point(event); context.beginPath(); context.moveTo(p.x, p.y); drawingRef.current = true; };
  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => { if (!drawingRef.current) return; const context = canvasRef.current?.getContext("2d"); if (!context) return; const p = point(event); context.lineTo(p.x, p.y); context.stroke(); setHasDrawing(true); };
  const finish = () => { drawingRef.current = false; };
  const clear = () => { const canvas = canvasRef.current; const context = canvas?.getContext("2d"); if (!canvas || !context) return; context.clearRect(0, 0, canvas.width, canvas.height); setHasDrawing(false); };
  return <div className="space-y-3"><div className="overflow-hidden rounded-2xl border border-dashed border-primary/35 bg-background"><canvas ref={canvasRef} width={900} height={310} className="block h-40 w-full touch-none cursor-crosshair" onPointerDown={start} onPointerMove={draw} onPointerUp={finish} onPointerCancel={finish} onPointerLeave={finish} /></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={clear}><RotateCcw className="mr-2 h-4 w-4" />Limpar</Button><Button type="button" size="sm" disabled={!hasDrawing || loading} onClick={() => { const canvas = canvasRef.current; if (canvas) void onSave(canvas.toDataURL("image/png")); }}>{loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando…</> : <><PenLine className="mr-2 h-4 w-4" />Confirmar assinatura</>}</Button></div></div>;
}

function SignatureSection({ document, signer, sign }: { document: SharedDocument; signer: Signer; sign: (signer: Signer, data: string) => Promise<void> }) {
  const isOrigin = signer === "origin";
  const name = isOrigin ? document.originManagerName : document.destinationManagerName;
  const signedAt = isOrigin ? document.originSignedAt : document.destinationSignedAt;
  const imageUrl = isOrigin ? document.originSignatureUrl : document.destinationSignatureUrl;
  const signMutation = trpc.romaneio.sign.useMutation();
  const handleSign = async (signatureDataUrl: string) => {
    try { await signMutation.mutateAsync({ token: document.shareToken, signer, signatureDataUrl }); await sign(signer, signatureDataUrl); toast.success("Assinatura registrada com sucesso."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível registrar a assinatura."); }
  };
  return <Card className="overflow-hidden rounded-[1.5rem]"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-xs font-black text-primary">{isOrigin ? "01" : "02"}</span>{isOrigin ? "Gerente da origem" : "Gerente do destino"}</CardTitle><CardDescription>{name}</CardDescription></CardHeader><CardContent>{signedAt ? <div className="space-y-3"><div className="flex items-center gap-2 text-sm font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" />Assinado em {formatDate(signedAt)}</div>{imageUrl && <img src={imageUrl} alt={`Assinatura de ${name}`} className="h-24 w-full rounded-xl border bg-white object-contain" />}</div> : <div><p className="mb-3 text-sm leading-relaxed text-muted-foreground">Ao assinar, você confirma as informações e quantidades registradas neste Romaneio.</p><SignaturePad loading={signMutation.isPending} onSave={handleSign} /></div>}</CardContent></Card>;
}

export default function RomaneioShare() {
  const [, params] = useRoute("/romaneio/:token");
  const token = params?.token ?? "";
  const documentQuery = trpc.romaneio.shared.useQuery({ token }, { enabled: /^[a-f0-9]{32}$/.test(token), retry: false });
  const document = documentQuery.data as SharedDocument | null | undefined;
  if (documentQuery.isLoading) return <main className="grid min-h-screen place-items-center bg-muted/30 p-6"><Loader2 className="h-8 w-8 animate-spin text-primary" /></main>;
  if (!document) return <main className="grid min-h-screen place-items-center bg-muted/30 p-6"><Card className="max-w-md rounded-[2rem]"><CardContent className="p-8 text-center"><ClipboardSignature className="mx-auto h-10 w-10 text-muted-foreground" /><h1 className="mt-4 text-xl font-black">Romaneio não encontrado</h1><p className="mt-2 text-sm text-muted-foreground">Verifique se o link está completo ou solicite um novo compartilhamento ao responsável.</p></CardContent></Card></main>;
  return <main className="min-h-screen bg-muted/30 py-8 sm:py-12"><div className="mx-auto max-w-5xl space-y-5 px-4"><header className="rounded-[2rem] bg-gradient-to-br from-primary via-primary to-primary/80 p-6 text-primary-foreground shadow-xl shadow-primary/20 sm:p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2 text-primary-foreground/75"><ShieldCheck className="h-4 w-4" /><span className="text-xs font-bold uppercase tracking-[0.16em]">Documento compartilhado com segurança</span></div><h1 className="mt-3 text-2xl font-black sm:text-3xl">{document.documentNumber ? `Romaneio ${document.documentNumber}` : "Romaneio de transferência"}</h1><p className="mt-2 text-sm text-primary-foreground/80">{document.originName} → {document.destinationName} · {new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(`${document.transferDate}T12:00:00`))}</p></div><Badge className="w-fit border-0 bg-white/15 text-white">{statusLabel[document.status]}</Badge></div></header><Card className="rounded-[1.7rem]"><CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Itens da transferência</CardTitle><CardDescription>Confira os volumes antes de registrar sua assinatura.</CardDescription></div><Button variant="outline" onClick={() => void exportRomaneioPdf(sharedPdfDocument(document))}><FileDown className="mr-2 h-4 w-4" />Baixar PDF</Button></CardHeader><CardContent><div className="overflow-x-auto rounded-2xl border"><table className="w-full min-w-[620px] text-sm"><thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="p-3">Produto</th><th className="p-3">Un.</th><th className="p-3">Solic.</th><th className="p-3">Aprov.</th><th className="p-3">Entregue</th></tr></thead><tbody>{document.items.map((item, index) => <tr key={index} className="border-t"><td className="p-3"><p className="font-black">{item.productName}</p><p className="text-xs text-muted-foreground">{item.productCode || "Sem código"}</p></td><td className="p-3">{item.unit || "UN"}</td><td className="p-3">{item.requestedQuantity}</td><td className="p-3">{item.approvedQuantity}</td><td className="p-3">{item.deliveredQuantity}</td></tr>)}</tbody></table></div>{document.notes && <div className="mt-4 rounded-2xl bg-muted/50 p-4"><p className="font-bold">Observações</p><p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{document.notes}</p></div>}</CardContent></Card><section className="grid gap-5 lg:grid-cols-2"><SignatureSection document={document} signer="origin" sign={() => documentQuery.refetch().then(() => undefined)} /><SignatureSection document={document} signer="destination" sign={() => documentQuery.refetch().then(() => undefined)} /></section><p className="pb-4 text-center text-xs text-muted-foreground">Este link permite consultar e assinar apenas este Romaneio. As assinaturas são registradas com data e horário.</p></div></main>;
}
