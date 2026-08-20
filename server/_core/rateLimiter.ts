/**
 * Rate limiter simples em memória para proteger endpoints de login.
 * Limita a 5 tentativas por IP por janela de 60 segundos.
 * Em produção multi-instância, substituir por Redis.
 */

interface AttemptRecord {
  count: number;
  windowStart: number; // timestamp ms
}

const WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_ATTEMPTS = 5;

const attempts = new Map<string, AttemptRecord>();

// Limpar entradas expiradas a cada 5 minutos para evitar vazamento de memória
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of attempts.entries()) {
    if (now - record.windowStart > WINDOW_MS) {
      attempts.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Verifica se o IP está dentro do limite de tentativas.
 * @returns true se a tentativa é permitida, false se bloqueada
 */
export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record || now - record.windowStart > WINDOW_MS) {
    // Nova janela
    attempts.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (record.count >= MAX_ATTEMPTS) {
    return false;
  }

  record.count += 1;
  return true;
}

/**
 * Retorna quantos segundos faltam para a janela de bloqueio expirar.
 */
export function getRateLimitRetryAfter(ip: string): number {
  const record = attempts.get(ip);
  if (!record) return 0;
  const elapsed = Date.now() - record.windowStart;
  const remaining = WINDOW_MS - elapsed;
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

/**
 * Reseta o contador de tentativas para um IP (usado após login bem-sucedido).
 */
export function resetRateLimit(ip: string): void {
  attempts.delete(ip);
}
