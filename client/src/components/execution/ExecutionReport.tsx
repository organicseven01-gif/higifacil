import { useRef, useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { X, Download, MessageCircle, Loader2, Camera, Copy, Check } from "lucide-react";
import jsPDF from "jspdf";
import { toast } from "sonner";
import html2canvas from "html2canvas";

const LOGO_URL = "/logo-higifacil.png";

interface Props {
  orderId: number;
  onClose: () => void;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function formatCurrency(value: string | number | null | undefined) {
  const n = parseFloat(String(value ?? "0"));
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Converte URL de imagem para base64 via proxy do servidor (contorna CORS do S3)
async function toBase64(url: string): Promise<string> {
  if (!url) return "";
  try {
    // Caminho local (ex: /logo-higifacil.png, servido pelo próprio app) não tem
    // problema de CORS — busca direto. O proxy é só para URL externa (fotos no
    // S3/R2): /api/image-proxy faz fetch() no SERVIDOR, que não sabe resolver
    // um caminho relativo (precisa de URL absoluta), então nunca passar um
    // caminho local por ele.
    const isLocal = url.startsWith("/") && !url.startsWith("//");
    const proxyUrl = isLocal ? url : `/api/image-proxy?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    // Se falhar, retorna string vazia (imagem não aparece mas não quebra o PDF)
    return "";
  }
}

export default function ExecutionReport({ orderId, onClose }: Props) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string>("");
  const [photosBase64, setPhotosBase64] = useState<Record<number, string>>({});
  const [photosReady, setPhotosReady] = useState(false);

  const { data: order, isLoading: loadingOrder } = trpc.execution.getById.useQuery({ id: orderId });
  const { data: photos = [], isLoading: loadingPhotos } = trpc.execution.getPhotos.useQuery({ executionOrderId: orderId });
  const { data: upsellItems = [] } = trpc.execution.getUpsell.useQuery({ executionOrderId: orderId });
  const { data: settingsData } = trpc.settings.get.useQuery();
  const { data: companyData } = trpc.auth.me.useQuery();

  const beforePhotos = photos.filter((p: any) => p.photoType === "before");
  const afterAll = photos.filter((p: any) => p.photoType === "after" || p.photoType === "other" || !p.photoType);

  const pixKey = settingsData?.pix_key ?? "";
  const pixKeyType = settingsData?.pix_key_type ?? "cpf";
  const companyName = settingsData?.company_name ?? (companyData as any)?.companyName ?? "Higifácil";

  const upsellTotal = upsellItems.reduce((acc: number, item: any) => acc + parseFloat(String(item.total ?? "0")), 0);
  const orderValue = parseFloat(String(order?.totalValue ?? "0"));
  const grandTotal = orderValue + upsellTotal;

  // Pré-carrega logo e fotos como base64 quando os dados chegam
  useEffect(() => {
    if (loadingPhotos) return;
    const loadAll = async () => {
      setPhotosReady(false);
      // Carrega logo
      const logo = await toBase64(LOGO_URL);
      setLogoBase64(logo);
      // Carrega fotos
      const map: Record<number, string> = {};
      await Promise.all(
        photos.map(async (p: any) => {
          if (p.photoUrl) {
            map[p.id] = await toBase64(p.photoUrl);
          }
        })
      );
      setPhotosBase64(map);
      setPhotosReady(true);
    };
    loadAll();
  }, [photos, loadingPhotos]);

  const handleCopyPix = async () => {
    if (!pixKey) return;
    try {
      await navigator.clipboard.writeText(pixKey);
      setPixCopied(true);
      toast.success("Chave Pix copiada!");
      setTimeout(() => setPixCopied(false), 3000);
    } catch {
      toast.error("Erro ao copiar chave Pix");
    }
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current || !order) return;
    if (!photosReady) {
      toast.error("Aguarde as fotos carregarem...");
      return;
    }
    setGenerating(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        imageTimeout: 0,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      if (pdfHeight <= pageHeight) {
        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      } else {
        let yOffset = 0;
        let remaining = pdfHeight;
        while (remaining > 0) {
          pdf.addImage(imgData, "JPEG", 0, -yOffset, pdfWidth, pdfHeight);
          remaining -= pageHeight;
          yOffset += pageHeight;
          if (remaining > 0) pdf.addPage();
        }
      }
      const filename = `relatorio-${order.clientName?.replace(/\s+/g, "-") ?? "servico"}-${order.scheduledDate ?? "data"}.pdf`;
      pdf.save(filename);
      toast.success("PDF gerado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF. Tente novamente.");
    } finally {
      setGenerating(false);
    }
  };

  const handleWhatsApp = async () => {
    if (!order?.clientPhone) {
      toast.error("Número de telefone do cliente não cadastrado");
      return;
    }
    // Baixa o PDF primeiro, depois abre WhatsApp
    await handleDownloadPDF();
    const phone = order.clientPhone.replace(/\D/g, "");
    const firstName = order.clientName?.split(" ")[0] ?? "cliente";
    const pixInfo = pixKey ? `\n\n💳 *Pagamento via Pix:*\n${pixKeyType.toUpperCase()}: ${pixKey}` : "";
    const msg = `Olá, ${firstName}! 😊\n\nSegue o relatório do serviço realizado:\n\n✅ *Serviço:* ${order.serviceDescription ?? "Higienização"}\n📅 *Data:* ${formatDate(order.scheduledDate)}\n💰 *Valor total:* ${formatCurrency(grandTotal)}${pixInfo}\n\n📎 Anexe o PDF baixado nesta conversa.\n\nObrigado pela confiança! 🙏`;
    setTimeout(() => {
      window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, "_blank");
    }, 800);
    toast.success("PDF baixado! Agora anexe no WhatsApp que acabou de abrir.");
  };

  const isLoading = loadingOrder || loadingPhotos;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Header do modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-slate-50">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Relatório de Serviço</h2>
            <p className="text-sm text-gray-500">Prévia do relatório para enviar ao cliente</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : !order ? (
            <p className="text-center text-gray-400 py-8">Serviço não encontrado</p>
          ) : (
            /* ===== RELATÓRIO (capturado pelo html2canvas) ===== */
            <div
              ref={reportRef}
              style={{
                fontFamily: "'Segoe UI', Arial, sans-serif",
                background: "#ffffff",
                width: "100%",
              }}
            >
              {/* Cabeçalho com gradiente */}
              <div style={{
                background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)",
                padding: "24px 28px 20px",
                borderRadius: "12px 12px 0 0",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  {logoBase64 ? (
                    <img
                      src={logoBase64}
                      alt="Higifácil"
                      style={{ height: "36px", filter: "brightness(0) invert(1)" }}
                    />
                  ) : (
                    <span style={{ color: "#ffffff", fontWeight: 800, fontSize: "20px" }}>Higifácil</span>
                  )}
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: "#93c5fd", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Relatório de Serviço</div>
                    <div style={{ color: "#ffffff", fontSize: "13px", fontWeight: 500, marginTop: "2px" }}>{companyName}</div>
                  </div>
                </div>
              </div>

              {/* Dados do cliente e serviço */}
              <div style={{ background: "#f8fafc", padding: "20px 28px", borderBottom: "1px solid #e2e8f0" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Cliente</div>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>{order.clientName}</div>
                    {order.clientPhone && (
                      <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>{order.clientPhone}</div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Data do Serviço</div>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>{formatDate(order.scheduledDate)}</div>
                    {order.scheduledTime && (
                      <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>Início: {order.scheduledTime}</div>
                    )}
                    {order.completedAt && (
                      <div style={{ fontSize: "13px", color: "#64748b" }}>
                        Conclusão: {new Date(order.completedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                  </div>
                </div>

                {order.serviceDescription && (
                  <div style={{ marginTop: "14px" }}>
                    <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Serviço Realizado</div>
                    <div style={{ fontSize: "14px", color: "#334155", lineHeight: "1.5" }}>{order.serviceDescription}</div>
                  </div>
                )}

                {(order.street || order.neighborhood) && (
                  <div style={{ marginTop: "14px" }}>
                    <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Endereço</div>
                    <div style={{ fontSize: "13px", color: "#64748b" }}>
                      {[order.street, order.addressNumber, order.complement, order.neighborhood, order.city].filter(Boolean).join(", ")}
                    </div>
                  </div>
                )}
              </div>

              {/* Fotos Antes/Depois */}
              {(beforePhotos.length > 0 || afterAll.length > 0) && (
                <div style={{ padding: "20px 28px", borderBottom: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "14px" }}>
                    📸 Fotos do Serviço
                  </div>

                  {!photosReady && (
                    <div style={{ textAlign: "center", color: "#94a3b8", fontSize: "13px", padding: "12px 0" }}>
                      Carregando fotos...
                    </div>
                  )}

                  {photosReady && (
                    <div style={{ display: "grid", gridTemplateColumns: beforePhotos.length > 0 && afterAll.length > 0 ? "1fr 1fr" : "1fr", gap: "16px" }}>
                      {/* Antes */}
                      {beforePhotos.length > 0 && (
                        <div>
                          <div style={{
                            background: "#fef3c7", color: "#92400e", fontSize: "11px", fontWeight: 700,
                            textTransform: "uppercase", letterSpacing: "0.05em", padding: "5px 10px",
                            borderRadius: "6px", marginBottom: "8px", textAlign: "center",
                          }}>
                            ⬅ Antes
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: beforePhotos.length > 1 ? "1fr 1fr" : "1fr", gap: "6px" }}>
                            {beforePhotos.slice(0, 4).map((photo: any) => {
                              const b64 = photosBase64[photo.id];
                              return b64 ? (
                                <img
                                  key={photo.id}
                                  src={b64}
                                  alt="Antes"
                                  style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: "8px", border: "2px solid #fde68a" }}
                                />
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}

                      {/* Depois */}
                      {afterAll.length > 0 && (
                        <div>
                          <div style={{
                            background: "#dcfce7", color: "#166534", fontSize: "11px", fontWeight: 700,
                            textTransform: "uppercase", letterSpacing: "0.05em", padding: "5px 10px",
                            borderRadius: "6px", marginBottom: "8px", textAlign: "center",
                          }}>
                            Depois ➡
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: afterAll.length > 1 ? "1fr 1fr" : "1fr", gap: "6px" }}>
                            {afterAll.slice(0, 4).map((photo: any) => {
                              const b64 = photosBase64[photo.id];
                              return b64 ? (
                                <img
                                  key={photo.id}
                                  src={b64}
                                  alt="Depois"
                                  style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: "8px", border: "2px solid #86efac" }}
                                />
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Upsell */}
              {upsellItems.length > 0 && (
                <div style={{ padding: "16px 28px", borderBottom: "1px solid #e2e8f0", background: "#fafafa" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
                    Serviços Adicionais
                  </div>
                  {upsellItems.map((item: any) => (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ fontSize: "13px", color: "#475569" }}>{item.description} {item.quantity > 1 ? `(${item.quantity}x)` : ""}</span>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Valor total + Pix */}
              <div style={{ padding: "20px 28px", background: "#f0f9ff", borderBottom: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Valor Total</div>
                    <div style={{ fontSize: "28px", fontWeight: 800, color: "#1e3a5f", marginTop: "2px" }}>{formatCurrency(grandTotal)}</div>
                    {upsellTotal > 0 && (
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                        Serviço: {formatCurrency(orderValue)} + Adicionais: {formatCurrency(upsellTotal)}
                      </div>
                    )}
                  </div>
                  {pixKey && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Pagamento via Pix</div>
                      <div style={{
                        background: "#ffffff", border: "2px solid #3b82f6", borderRadius: "10px",
                        padding: "10px 14px", display: "inline-block",
                      }}>
                        <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>{pixKeyType.toUpperCase()}</div>
                        <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e3a5f", marginTop: "2px" }}>{pixKey}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Observações */}
              {order.observations && (
                <div style={{ padding: "16px 28px", borderBottom: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>Observações</div>
                  <div style={{ fontSize: "13px", color: "#475569", lineHeight: "1.6" }}>{order.observations}</div>
                </div>
              )}

              {/* Rodapé */}
              <div style={{
                background: "#1e3a5f", padding: "14px 28px", borderRadius: "0 0 12px 12px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div style={{ color: "#93c5fd", fontSize: "12px" }}>
                  Gerado por <strong style={{ color: "#ffffff" }}>Higifácil</strong> · higifacil.com.br
                </div>
                <div style={{ color: "#64748b", fontSize: "11px" }}>
                  {new Date().toLocaleDateString("pt-BR")}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botões de ação */}
        {!isLoading && order && (
          <div className="px-5 py-4 border-t bg-slate-50 space-y-3">
            {photos.length === 0 && (
              <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <Camera className="h-4 w-4 shrink-0" />
                <span>Adicione fotos antes/depois na OS para um relatório mais completo</span>
              </div>
            )}
            {!photosReady && photos.length > 0 && (
              <div className="flex items-center gap-2 text-blue-600 text-sm bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                <span>Preparando fotos para o PDF...</span>
              </div>
            )}
            {/* Botão Copiar Pix */}
            {pixKey && (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-blue-500 font-semibold uppercase tracking-wide mb-0.5">Chave Pix ({pixKeyType.toUpperCase()})</div>
                  <div className="text-sm font-bold text-blue-900 truncate">{pixKey}</div>
                </div>
                <button
                  onClick={handleCopyPix}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    pixCopied ? "bg-green-500 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {pixCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {pixCopied ? "Copiado!" : "Copiar Pix"}
                </button>
              </div>
            )}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-slate-300"
                onClick={handleDownloadPDF}
                disabled={generating || !photosReady}
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                Baixar PDF
              </Button>
              <Button
                className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                onClick={handleWhatsApp}
                disabled={generating || !photosReady}
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MessageCircle className="h-4 w-4 mr-2" />}
                Enviar pelo WhatsApp
              </Button>
            </div>
            <p className="text-xs text-center text-gray-400">
              O PDF será baixado automaticamente. Para enviar pelo WhatsApp, anexe o arquivo na conversa que será aberta.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
