import { ENV } from "./env";
import { sendOwnerNotificationEmail } from "../email";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

const trimValue = (value: string): string => value.trim();
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

/**
 * Normaliza o payload sem lançar erro — em vez de rejeitar título/conteúdo
 * inválidos, apenas os trunca/ignora silenciosamente. `notifyOwner` é
 * best-effort: nenhum caller deve ter seu fluxo principal (aprovar acesso,
 * criar empresa via Stripe, agendar demo...) interrompido só porque a
 * notificação interna falhou.
 */
const normalizePayload = (input: NotificationPayload): NotificationPayload | null => {
  if (!isNonEmptyString(input.title) || !isNonEmptyString(input.content)) {
    return null;
  }
  return {
    title: trimValue(input.title).slice(0, TITLE_MAX_LENGTH),
    content: trimValue(input.content).slice(0, CONTENT_MAX_LENGTH),
  };
};

/**
 * Notifica o dono do sistema por e-mail (via Resend) sobre eventos internos
 * — nova solicitação de acesso, novo agendamento de demo, nova empresa via
 * Stripe, feedback beta, etc.
 *
 * Substitui o antigo webhook de notificação da Manus (Forge). Nunca lança
 * erro: retorna `true`/`false` indicando se o e-mail foi enviado, para que
 * o fluxo principal do caller continue mesmo se a notificação falhar.
 */
export async function notifyOwner(payload: NotificationPayload): Promise<boolean> {
  const normalized = normalizePayload(payload);
  if (!normalized) {
    console.warn("[Notification] Payload inválido (título/conteúdo vazio) — notificação ignorada.");
    return false;
  }

  if (!ENV.notifyOwnerEmail) {
    console.warn("[Notification] NOTIFY_OWNER_EMAIL não configurada — notificação não enviada:", normalized.title);
    return false;
  }

  try {
    const sent = await sendOwnerNotificationEmail({
      to: ENV.notifyOwnerEmail,
      title: normalized.title,
      content: normalized.content,
    });
    if (!sent) {
      console.warn("[Notification] Falha ao enviar e-mail de notificação:", normalized.title);
    }
    return sent;
  } catch (error) {
    console.warn("[Notification] Erro inesperado ao notificar o dono:", error);
    return false;
  }
}
