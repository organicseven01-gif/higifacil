/**
 * Email helper usando Resend
 * Domínio verificado: higifacil.com.br
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = "noreply@higifacil.com.br";
const FROM_NAME = "Higifácil";
const SYSTEM_URL = "https://higifacil.com.br";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY não configurada — e-mail não enviado");
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to,
        subject,
        html,
      }),
    });
    const data = await res.json() as { id?: string; statusCode?: number; message?: string };
    if (!res.ok) {
      console.error("[Email] Erro ao enviar:", data.message);
      return false;
    }
    console.log("[Email] Enviado com sucesso:", data.id);
    return true;
  } catch (err) {
    console.error("[Email] Falha na requisição:", err);
    return false;
  }
}

// ─── Template base ───────────────────────────────────────────────────────────
function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Higifácil</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0A1628 0%,#0d2040 100%);padding:32px 40px;text-align:center;">
            <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663288781602/9tTW5oqRiGfeLkQJrVbUfh/logo_higifacil_final_e3e4210f.svg" alt="Higifácil" height="44" style="filter:brightness(0) invert(1) drop-shadow(0 0 8px rgba(255,255,255,0.4));" />
            <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:13px;">Sistema de Gestão para Higienizadores</p>
          </td>
        </tr>
        <!-- Content -->
        <tr>
          <td style="padding:40px;">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8f9fb;padding:24px 40px;text-align:center;border-top:1px solid #eee;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">© ${new Date().getFullYear()} Higifácil · <a href="${SYSTEM_URL}" style="color:#1A9FE3;text-decoration:none;">higifacil.com.br</a></p>
            <p style="color:#c4c9d4;font-size:11px;margin:6px 0 0;">Este é um e-mail automático, por favor não responda.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── E-mail de Boas-vindas ────────────────────────────────────────────────────
export async function sendWelcomeEmail({
  to,
  companyName,
  email,
  tempPassword,
  planName,
}: {
  to: string;
  companyName: string;
  email: string;
  tempPassword: string;
  planName: string;
}): Promise<boolean> {
  const html = baseTemplate(`
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:#e8f7ff;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;margin-bottom:16px;">🎉</div>
      <h1 style="color:#0A1628;font-size:26px;margin:0 0 8px;">Bem-vindo ao Higifácil!</h1>
      <p style="color:#6b7280;font-size:15px;margin:0;">Sua conta foi criada com sucesso. Plano <strong style="color:#1A9FE3;">${planName}</strong> ativo.</p>
    </div>

    <p style="color:#374151;font-size:15px;line-height:1.6;">Olá, <strong>${companyName}</strong>! Seu acesso ao Higifácil está pronto. Use as credenciais abaixo para entrar no sistema:</p>

    <div style="background:#f8f9fb;border:1px solid #e5e7eb;border-radius:8px;padding:20px 24px;margin:24px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;">
            <span style="color:#6b7280;font-size:13px;">E-mail de acesso</span><br/>
            <strong style="color:#0A1628;font-size:15px;">${email}</strong>
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;border-top:1px solid #e5e7eb;margin-top:8px;">
            <span style="color:#6b7280;font-size:13px;">Senha temporária</span><br/>
            <strong style="color:#0A1628;font-size:15px;letter-spacing:2px;">${tempPassword}</strong>
          </td>
        </tr>
      </table>
    </div>

    <p style="color:#ef4444;font-size:13px;margin:0 0 24px;">⚠️ Por segurança, recomendamos alterar sua senha no primeiro acesso.</p>

    <div style="text-align:center;margin:32px 0;">
      <a href="${SYSTEM_URL}/entrar" style="display:inline-block;background:#1A9FE3;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:8px;">Acessar o Sistema →</a>
    </div>

    <p style="color:#6b7280;font-size:14px;line-height:1.6;">Precisa de ajuda para começar? Entre em contato pelo WhatsApp ou responda este e-mail. Nossa equipe está pronta para te apoiar na implantação.</p>
  `);

  return sendEmail({
    to,
    subject: `🎉 Bem-vindo ao Higifácil, ${companyName}! Seu acesso está pronto`,
    html,
  });
}

// ─── E-mail de Reset de Senha ─────────────────────────────────────────────────
export async function sendPasswordResetEmail({
  to,
  companyName,
  resetLink,
}: {
  to: string;
  companyName: string;
  resetLink: string;
}): Promise<boolean> {
  const html = baseTemplate(`
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:#fff7ed;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;margin-bottom:16px;">🔐</div>
      <h1 style="color:#0A1628;font-size:26px;margin:0 0 8px;">Redefinição de Senha</h1>
      <p style="color:#6b7280;font-size:15px;margin:0;">Recebemos uma solicitação para redefinir sua senha.</p>
    </div>

    <p style="color:#374151;font-size:15px;line-height:1.6;">Olá, <strong>${companyName}</strong>! Clique no botão abaixo para criar uma nova senha. Este link é válido por <strong>1 hora</strong>.</p>

    <div style="text-align:center;margin:32px 0;">
      <a href="${resetLink}" style="display:inline-block;background:#1A9FE3;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:8px;">Redefinir Minha Senha →</a>
    </div>

    <div style="background:#fef9f0;border:1px solid #fde68a;border-radius:8px;padding:16px 20px;margin:24px 0;">
      <p style="color:#92400e;font-size:13px;margin:0;">⚠️ Se você não solicitou a redefinição de senha, ignore este e-mail. Sua senha permanece a mesma.</p>
    </div>

    <p style="color:#9ca3af;font-size:13px;line-height:1.6;">Se o botão não funcionar, copie e cole este link no navegador:<br/>
    <a href="${resetLink}" style="color:#1A9FE3;word-break:break-all;">${resetLink}</a></p>
  `);

  return sendEmail({
    to,
    subject: "🔐 Redefinição de senha — Higifácil",
    html,
  });
}

// ─── E-mail de Confirmação de Pagamento ──────────────────────────────────────
export async function sendPaymentConfirmationEmail({
  to,
  companyName,
  planName,
  amount,
  nextBillingDate,
}: {
  to: string;
  companyName: string;
  planName: string;
  amount: string;
  nextBillingDate: string;
}): Promise<boolean> {
  const html = baseTemplate(`
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:#ecfdf5;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;margin-bottom:16px;">✅</div>
      <h1 style="color:#0A1628;font-size:26px;margin:0 0 8px;">Pagamento Confirmado!</h1>
      <p style="color:#6b7280;font-size:15px;margin:0;">Sua assinatura está ativa e em dia.</p>
    </div>

    <p style="color:#374151;font-size:15px;line-height:1.6;">Olá, <strong>${companyName}</strong>! Confirmamos o recebimento do seu pagamento. Veja o resumo:</p>

    <div style="background:#f8f9fb;border:1px solid #e5e7eb;border-radius:8px;padding:20px 24px;margin:24px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
            <span style="color:#6b7280;font-size:13px;">Plano</span><br/>
            <strong style="color:#0A1628;font-size:15px;">${planName}</strong>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
            <span style="color:#6b7280;font-size:13px;">Valor cobrado</span><br/>
            <strong style="color:#0A1628;font-size:15px;">${amount}</strong>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;">
            <span style="color:#6b7280;font-size:13px;">Próxima cobrança</span><br/>
            <strong style="color:#0A1628;font-size:15px;">${nextBillingDate}</strong>
          </td>
        </tr>
      </table>
    </div>

    <div style="text-align:center;margin:32px 0;">
      <a href="${SYSTEM_URL}/dashboard" style="display:inline-block;background:#1A9FE3;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:8px;">Acessar o Sistema →</a>
    </div>

    <p style="color:#6b7280;font-size:14px;line-height:1.6;">Obrigado por confiar no Higifácil! Qualquer dúvida, estamos à disposição.</p>
  `);

  return sendEmail({
    to,
    subject: `✅ Pagamento confirmado — Plano ${planName} ativo`,
    html,
  });
}

// ─── E-mail de Novo Agendamento ───────────────────────────────────────────────
export async function sendAppointmentEmail({
  to,
  companyName,
  clientName,
  scheduledDate,
  scheduledTime,
  serviceDescription,
  totalValue,
  assignedTo,
  createdBy,
}: {
  to: string;
  companyName: string;
  clientName: string;
  scheduledDate: string;
  scheduledTime?: string;
  serviceDescription?: string;
  totalValue?: string;
  assignedTo?: string;
  createdBy?: string;
}): Promise<boolean> {
  const dateTimeStr = scheduledTime ? `${scheduledDate} às ${scheduledTime}` : scheduledDate;

  // Bloco de serviço visual
  const serviceBlock = serviceDescription ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 4px;">
      <tr>
        <td style="width:36px;vertical-align:middle;">
          <div style="width:32px;height:32px;background:#e8f7ff;border-radius:8px;text-align:center;line-height:32px;font-size:18px;">🧹</div>
        </td>
        <td style="padding-left:12px;vertical-align:middle;">
          <span style="color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Serviço</span><br/>
          <strong style="color:#0A1628;font-size:15px;">${serviceDescription}</strong>
        </td>
      </tr>
    </table>
  ` : '';

  // Bloco de valor visual
  const valueBlock = totalValue ? `
    <div style="background:linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%);border:1px solid #6ee7b7;border-radius:10px;padding:16px 20px;margin:16px 0;text-align:center;">
      <span style="color:#065f46;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Valor do Serviço</span><br/>
      <strong style="color:#059669;font-size:28px;letter-spacing:-0.5px;">R$ ${parseFloat(totalValue).toFixed(2).replace('.', ',')}</strong>
    </div>
  ` : '';

  // Linha de responsável
  const assignedBlock = assignedTo ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0 0;">
      <tr>
        <td style="width:36px;vertical-align:middle;">
          <div style="width:32px;height:32px;background:#f0f4ff;border-radius:8px;text-align:center;line-height:32px;font-size:18px;">👤</div>
        </td>
        <td style="padding-left:12px;vertical-align:middle;">
          <span style="color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Responsável</span><br/>
          <strong style="color:#0A1628;font-size:14px;">${assignedTo}</strong>
        </td>
      </tr>
    </table>
  ` : '';

  // Linha de criado por
  const createdByBlock = createdBy ? `
    <p style="color:#9ca3af;font-size:12px;margin:16px 0 0;text-align:right;">Criado por: <strong style="color:#6b7280;">${createdBy}</strong></p>
  ` : '';

  const html = baseTemplate(`
    <!-- Cabeçalho do conteúdo -->
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background:#e8f7ff;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;margin-bottom:16px;">📅</div>
      <h1 style="color:#0A1628;font-size:24px;font-weight:800;margin:0 0 6px;">Novo Agendamento!</h1>
      <p style="color:#6b7280;font-size:14px;margin:0;">Registrado em <strong style="color:#0A1628;">${companyName}</strong></p>
    </div>

    <!-- Card principal: Cliente + Data -->
    <div style="background:#f8f9fb;border:1px solid #e5e7eb;border-radius:12px;padding:20px 24px;margin:0 0 16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:36px;vertical-align:middle;">
            <div style="width:32px;height:32px;background:#fff3e0;border-radius:8px;text-align:center;line-height:32px;font-size:18px;">👤</div>
          </td>
          <td style="padding-left:12px;vertical-align:middle;">
            <span style="color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Cliente</span><br/>
            <strong style="color:#0A1628;font-size:17px;">${clientName}</strong>
          </td>
        </tr>
      </table>
      <div style="border-top:1px solid #e5e7eb;margin:14px 0;"></div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:36px;vertical-align:middle;">
            <div style="width:32px;height:32px;background:#e8f7ff;border-radius:8px;text-align:center;line-height:32px;font-size:18px;">📆</div>
          </td>
          <td style="padding-left:12px;vertical-align:middle;">
            <span style="color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Data e Hora</span><br/>
            <strong style="color:#1A9FE3;font-size:17px;">${dateTimeStr}</strong>
          </td>
        </tr>
      </table>
    </div>

    <!-- Card de serviço -->
    ${serviceDescription ? `
    <div style="background:#f8f9fb;border:1px solid #e5e7eb;border-radius:12px;padding:20px 24px;margin:0 0 16px;">
      ${serviceBlock}
      ${valueBlock}
      ${assignedBlock}
    </div>
    ` : valueBlock}

    ${createdByBlock}

    <!-- Botão de acesso -->
    <div style="text-align:center;margin:28px 0 8px;">
      <a href="${SYSTEM_URL}/entrar" style="display:inline-block;background:#1A9FE3;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 40px;border-radius:10px;">Entrar no Sistema →</a>
    </div>

    <p style="color:#c4c9d4;font-size:12px;line-height:1.6;text-align:center;margin-top:20px;">Este e-mail é enviado automaticamente pelo Higifácil sempre que um novo agendamento é criado.</p>
  `);

  return sendEmail({
    to,
    subject: `📅 Novo Agendamento: ${clientName} — ${dateTimeStr}`,
    html,
  });
}

// ─── E-mail de Mudança de Plano ───────────────────────────────────────────────
const planLabels: Record<string, string> = {
  free: "Free",
  solo: "Solo",
  dupla: "Dupla",
  equipe: "Equipe",
};
const planColors: Record<string, string> = {
  free: "#64748b",
  solo: "#64748b",
  dupla: "#1A9FE3",
  equipe: "#10B981",
};
const planFeaturesList: Record<string, string[]> = {
  free: ["Orçamentos ilimitados", "Gestão de clientes", "Catálogo de serviços"],
  solo: ["Orçamentos ilimitados", "Gestão de clientes", "Catálogo de serviços", "Dashboard de resumo"],
  dupla: ["Tudo do Solo", "Vendas e pagamentos", "Agendamentos com mapa", "Execução de OS", "Até 2 usuários"],
  equipe: ["Tudo do Dupla", "Financeiro completo", "Tapetes (lavanderia)", "CRM de clientes", "Análise de concorrência", "Usuários ilimitados"],
};

export async function sendPlanChangedEmail({
  to,
  companyName,
  oldPlan,
  newPlan,
}: {
  to: string;
  companyName: string;
  oldPlan: string;
  newPlan: string;
}): Promise<boolean> {
  const newLabel = planLabels[newPlan] ?? newPlan;
  const oldLabel = planLabels[oldPlan] ?? oldPlan;
  const newColor = planColors[newPlan] ?? "#1A9FE3";
  const isUpgrade = ["free", "solo", "dupla", "equipe"].indexOf(newPlan) > ["free", "solo", "dupla", "equipe"].indexOf(oldPlan);
  const features = planFeaturesList[newPlan] ?? [];

  const featureItems = features.map(f =>
    `<li style="padding:5px 0;color:#374151;font-size:14px;">✅ ${f}</li>`
  ).join("");

  const html = baseTemplate(`
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:${newColor}18;border-radius:50%;width:72px;height:72px;line-height:72px;font-size:36px;margin-bottom:16px;">
        ${isUpgrade ? "🚀" : "📋"}
      </div>
      <h1 style="color:#0A1628;font-size:26px;margin:0 0 8px;">
        ${isUpgrade ? "Seu plano foi atualizado!" : "Plano alterado"}
      </h1>
      <p style="color:#6b7280;font-size:15px;margin:0;">
        ${companyName}, seu plano foi alterado de <strong>${oldLabel}</strong> para <strong style="color:${newColor};">${newLabel}</strong>.
      </p>
    </div>

    <div style="background:${newColor}10;border:2px solid ${newColor}30;border-radius:12px;padding:24px;margin:0 0 24px;text-align:center;">
      <p style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">Plano atual</p>
      <p style="color:${newColor};font-size:32px;font-weight:900;margin:0;">${newLabel}</p>
    </div>

    <p style="color:#374151;font-size:15px;font-weight:600;margin:0 0 12px;">O que está incluído no seu plano:</p>
    <ul style="list-style:none;padding:0;margin:0 0 28px;background:#f8f9fb;border-radius:10px;padding:16px 20px;">
      ${featureItems}
    </ul>

    <div style="text-align:center;margin:28px 0 8px;">
      <a href="${SYSTEM_URL}/entrar" style="display:inline-block;background:${newColor};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 40px;border-radius:10px;">
        Acessar o sistema →
      </a>
    </div>

    <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:20px;">
      Se você tiver dúvidas sobre seu plano, entre em contato pelo suporte.
    </p>
  `);

  return sendEmail({
    to,
    subject: `${isUpgrade ? "🚀" : "📋"} Seu plano Higifácil foi alterado para ${newLabel}`,
    html,
  });
}

// ─── Notificação interna para o dono do sistema ───────────────────────────────
// Substitui o antigo webhook de notificação da Manus (server/_core/notification.ts).
export async function sendOwnerNotificationEmail({
  to,
  title,
  content,
}: {
  to: string;
  title: string;
  content: string;
}): Promise<boolean> {
  const contentHtml = content
    .split("\n")
    .map(line => `<p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 8px;">${line || "&nbsp;"}</p>`)
    .join("");

  const html = baseTemplate(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background:#fff3e0;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:28px;margin-bottom:12px;">🔔</div>
      <h1 style="color:#0A1628;font-size:20px;font-weight:800;margin:0;">${title}</h1>
    </div>
    <div style="background:#f8f9fb;border:1px solid #e5e7eb;border-radius:12px;padding:20px 24px;">
      ${contentHtml}
    </div>
    <p style="color:#c4c9d4;font-size:11px;line-height:1.6;text-align:center;margin-top:20px;">Notificação interna automática do Higifácil.</p>
  `);

  return sendEmail({ to, subject: `[Higifácil] ${title}`, html });
}
