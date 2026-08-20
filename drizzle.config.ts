import "dotenv/config"; // carrega o .env — sem isso os comandos do drizzle-kit não acham a DATABASE_URL
import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

/**
 * O drizzle-kit abre a própria conexão (não passa pelo getDb() de
 * server/db.ts), então o TLS precisa ser configurado aqui também. O TiDB
 * Cloud recusa conexão sem TLS com o erro "Connections using insecure
 * transport are prohibited". Como a opção `ssl` não pode ser combinada com
 * `url`, quebramos a URL em campos separados.
 */
const url = new URL(connectionString);
const needsTls =
  url.hostname.endsWith("tidbcloud.com") ||
  /sslaccept=strict|ssl-mode=REQUIRED/i.test(connectionString);

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: needsTls
    ? {
        host: url.hostname,
        port: url.port ? Number(url.port) : 4000,
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        database: url.pathname.replace(/^\//, ""),
        ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true },
      }
    : { url: connectionString },
});
