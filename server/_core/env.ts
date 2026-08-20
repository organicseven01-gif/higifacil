export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",

  // Segredo do endpoint de cron (/api/scheduled/expire-trials). Antes essa
  // rota confiava no header x-manus-cron-task-uid, injetado só pela Manus —
  // fora dela, não existe. CRON_SECRET substitui isso por um segredo próprio,
  // que o agendador da infraestrutura escolhida (Railway Cron Jobs, etc.)
  // envia como "Authorization: Bearer <CRON_SECRET>".
  cronSecret: process.env.CRON_SECRET ?? "",

  // OAuth da Manus — OPCIONAL. Só é usado se as duas variáveis abaixo
  // estiverem preenchidas. Sem elas, o sistema roda só com login por
  // e-mail/senha (tabela company_credentials), que já é o fluxo principal.
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",

  // IA (sugestão de orçamento, mensagem de reativação, categorização de
  // extrato bancário) — server/_core/llm.ts usa a API da OpenAI direto.
  // Opcional: sem essa chave, essas 3 features retornam erro ao serem
  // usadas, mas o resto do sistema funciona normalmente.
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",

  // Notificações internas para o dono do sistema (nova solicitação de
  // acesso, novo agendamento de demo, nova empresa via Stripe, feedback
  // beta...) — enviadas por e-mail via Resend. Opcional: sem essa variável,
  // as notificações só ficam no log do servidor (nunca quebram o fluxo
  // principal que as dispara).
  notifyOwnerEmail: process.env.NOTIFY_OWNER_EMAIL ?? "",

  // Google Maps — autocompletar de endereço, mapa e cálculo de deslocamento
  // (com estimativa de pedágio via Directions API). `googleMapsApiKey` é a
  // mesma chave usada no navegador (VITE_, com restrição de referrer).
  // `googleMapsServerApiKey` é opcional: uma chave separada sem restrição
  // de referrer para as poucas chamadas feitas pelo servidor (ver
  // server/_core/map.ts). Sem ela, cai de volta para a chave do navegador.
  googleMapsApiKey: process.env.VITE_GOOGLE_MAPS_API_KEY ?? "",
  googleMapsServerApiKey: process.env.GOOGLE_MAPS_SERVER_API_KEY ?? "",

  // Storage de arquivos via Cloudflare R2 (API compatível com S3).
  // Dois buckets na MESMA conta/credencial R2 — a diferença de visibilidade
  // é o bucket, não a credencial:
  //   - publicBucket  → fotos de cliente/tapete/execução, avatar, catálogo de
  //     serviços — servidas direto por URL pública.
  //   - privateBucket → comprovantes de venda/execução e extratos bancários —
  //     nunca por URL fixa, só link assinado gerado sob demanda
  //     (ver server/storage.ts e o router `storage.getSignedUrl`).
  r2: {
    endpoint: process.env.R2_ENDPOINT ?? "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    publicBucket: process.env.R2_PUBLIC_BUCKET_NAME ?? "",
    privateBucket: process.env.R2_PRIVATE_BUCKET_NAME ?? "",
    // Custom domain na frente do bucket público (ex: fotos.higifacil.com.br).
    // Sem isso, cai de volta pra URL padrão do endpoint R2 (funciona, só não
    // é bonita) — ver publicUrlFor() em server/storage.ts.
    publicDomain: process.env.R2_PUBLIC_DOMAIN ?? "",
  },
};

/**
 * Falha rápido no boot se o ambiente de PRODUÇÃO estiver com configuração
 * insegura. Hoje verifica só o JWT_SECRET (usado para assinar os cookies de
 * sessão de empresa/sub-usuário — ver server/_core/context.ts): sem essa
 * checagem, `ENV.cookieSecret` vazio faz o código cair num valor de
 * fallback fixo ("fallback-secret-change-me", visível no repositório
 * público), o que permitiria forjar cookie de sessão válido para qualquer
 * empresa. Preferimos o processo morrer no boot a subir aceitando tráfego
 * com esse risco.
 *
 * Não roda nada em desenvolvimento/teste — lá o fallback é aceitável (é só
 * a máquina local de quem está desenvolvendo).
 *
 * @param env Objeto ENV (parâmetro só para permitir testar com um ENV
 *            simulado, sem depender de process.env de verdade).
 */
export function validarEnvProducao(env: Pick<typeof ENV, "isProduction" | "cookieSecret"> = ENV): void {
  if (!env.isProduction) return;

  if (!env.cookieSecret || env.cookieSecret.length < 32) {
    throw new Error(
      "\n⛔ BOOT ABORTADO: JWT_SECRET ausente ou fraco em produção.\n" +
        "   Defina um segredo forte (ex: `openssl rand -hex 32`) na variável\n" +
        "   de ambiente JWT_SECRET antes de iniciar o servidor.\n" +
        "   Sem isso, o sistema cairia no fallback inseguro embutido no\n" +
        "   código e qualquer pessoa poderia forjar sessão de qualquer empresa.\n"
    );
  }
}

/**
 * Verifica o header Authorization da rota POST /api/scheduled/expire-trials
 * contra o CRON_SECRET configurado. Extraída como função pura (sem tocar em
 * req/res) para dar para testar sem subir o servidor inteiro.
 *
 * Nunca autoriza se cronSecret estiver vazio — mesmo que authHeader também
 * esteja vazio/undefined, o resultado é sempre "não autorizado" (fail closed).
 */
export function isCronAuthorized(authHeader: string | undefined, cronSecret: string): boolean {
  if (!cronSecret) return false;
  return authHeader === `Bearer ${cronSecret}`;
}
