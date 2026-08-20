// Armazenamento de arquivos via Cloudflare R2 (API compatível com S3, mesmo
// SDK @aws-sdk/client-s3 — só muda endpoint/credenciais).
//
// DOIS BUCKETS, mesma conta/credencial:
//   - "public"  → fotos de cliente/tapete/execução, avatar, catálogo de
//     serviços. Servidas direto por URL pública fixa.
//   - "private" → comprovantes de venda/execução e extratos bancários.
//     REGRA: o banco de dados guarda só a KEY do objeto, NUNCA uma URL
//     (nem assinada). A URL é gerada sob demanda, com validade curta, só
//     depois de confirmar que quem pediu pertence à empresa dona do arquivo
//     (ver `storageRouter.getSignedUrl` em server/routers.ts).
//
// Isolamento multiempresa: toda key começa com o companyId
// (`{companyId}/{categoria}/{arquivo}`) — o bucket já separa público de
// privado, não precisa repetir isso na key.

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

export type StorageVisibility = "public" | "private";

let cachedClient: S3Client | null = null;

function getClient(): S3Client {
  if (cachedClient) return cachedClient;

  const { endpoint, accessKeyId, secretAccessKey } = ENV.r2;
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Storage (R2) não configurado: defina R2_ENDPOINT, R2_ACCESS_KEY_ID e R2_SECRET_ACCESS_KEY."
    );
  }

  cachedClient = new S3Client({
    region: "auto", // R2 não usa região no sentido do S3 — "auto" é o valor esperado pela Cloudflare
    endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cachedClient;
}

function bucketFor(visibility: StorageVisibility): string {
  const bucket = visibility === "public" ? ENV.r2.publicBucket : ENV.r2.privateBucket;
  if (!bucket) {
    const varName = visibility === "public" ? "R2_PUBLIC_BUCKET_NAME" : "R2_PRIVATE_BUCKET_NAME";
    throw new Error(`Storage (R2) não configurado: defina ${varName}.`);
  }
  return bucket;
}

/**
 * Monta a key de um novo objeto, sempre prefixada pela empresa dona:
 *   {companyId}/{categoria}/{timestamp}-{aleatorio}.{extensão}
 * Isso separa fisicamente os arquivos de cada empresa dentro do bucket e
 * permite validar dono do arquivo só olhando a key (ver companyIdFromKey).
 */
export function buildStorageKey(companyId: number, category: string, originalFilename: string): string {
  const extBruta = (originalFilename.split(".").pop() || "bin").toLowerCase();
  const ext = /^[a-z0-9]{1,8}$/.test(extBruta) ? extBruta : "bin";
  const nomeUnico = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  return `${companyId}/${category}/${nomeUnico}`;
}

/** Extrai o companyId embutido no início da key (ver buildStorageKey). */
export function companyIdFromKey(key: string): number | null {
  const m = key.match(/^(\d+)\//);
  return m ? Number(m[1]) : null;
}

function publicUrlFor(key: string): string {
  const base = ENV.r2.publicDomain || `${ENV.r2.endpoint.replace(/\/+$/, "")}/${ENV.r2.publicBucket}`;
  return `${base.replace(/\/+$/, "")}/${key}`;
}

/**
 * Envia um arquivo para o bucket correspondente à visibilidade.
 *
 * - visibility "public"  → retorna a URL pública definitiva. Pode ir direto
 *   pro banco (ex: client_photos.photoUrl).
 * - visibility "private" → retorna `url: null` DE PROPÓSITO. Quem chamar
 *   NÃO deve inventar uma URL — deve salvar só `key` no banco, e resolver o
 *   acesso depois via getPrivateSignedUrl (nunca guardar link assinado).
 */
export async function storagePut(
  key: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
  visibility: StorageVisibility = "private"
): Promise<{ key: string; url: string | null }> {
  const client = getClient();
  const bucket = bucketFor(visibility);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: data,
      ContentType: contentType,
    })
  );

  return { key, url: visibility === "public" ? publicUrlFor(key) : null };
}

/**
 * Gera um link assinado temporário (1h por padrão) para um objeto do bucket
 * PRIVADO. Quem chama esta função é responsável por já ter validado que o
 * usuário autenticado pertence à empresa dona da key — esta função em si
 * NÃO valida nada, só assina (ver storageRouter.getSignedUrl em routers.ts,
 * que faz a validação antes de chamar isto).
 */
export async function getPrivateSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  const client = getClient();
  const bucket = bucketFor("private");
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: expiresInSeconds }
  );
}
