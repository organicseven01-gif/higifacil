# Migração SOS Orçamentos (Higifácil) — para fora da Manus

Este pacote foi preparado a partir do export original da Manus. Leia isto
antes de continuar no Claude Code.

## ✅ O que já foi feito

1. **Removidos os arquivos com segredos vazados**: `.project-config.json` e
   a pasta `.manus/` (que continha logs de query com fragmentos de dados
   reais) não vieram neste pacote.
2. **`node_modules/` e `.git/` removidos** — reinstale com `pnpm install` e
   inicie um repositório novo (`git init`) no Claude Code.
3. **`server/storage.ts` reescrito** — não depende mais do proxy da Manus.
   Usa `@aws-sdk/client-s3`, compatível com Amazon S3 **e** Cloudflare R2
   (mesma API). A assinatura das funções (`storagePut`, `storageGet`) não
   mudou, então nenhum outro arquivo do projeto precisou ser alterado.
4. **`server/_core/env.ts` reorganizado** — variáveis da Manus (OAuth e
   Forge) agora são opcionais, com comentários explicando o que cada uma
   faz. Nada deveria quebrar se elas ficarem vazias, mas isso **precisa
   ser confirmado rodando o build** (não tenho como testar isso aqui).
5. **`.env.example`** criado com todas as variáveis do sistema.

## ⚠️ IMPORTANTE: segurança antes de tudo

O ZIP original tinha, em texto puro: senha do banco de produção, chave
Stripe **live**, `JWT_SECRET`, chave da Resend e token interno da Manus.
Antes de colocar este projeto em produção:

- [ ] Trocar a senha do banco (TiDB Cloud ou onde for hospedar o banco novo)
- [ ] Trocar `JWT_SECRET` (gerar um novo, ex: `openssl rand -hex 32`)
- [ ] Trocar a `RESEND_API_KEY`
- [ ] Avaliar se a `STRIPE_SECRET_KEY_LIVE` precisa ser trocada (combinado
      que, como só há um usuário hoje, isso pode esperar — mas não deixar
      pra sempre)

## 🔜 O que fica para o Claude Code

Estas são coisas que exigem instalar dependências, rodar o build e testar
de verdade — por isso não fiz aqui:

1. **Rodar `pnpm install` e `pnpm run check` (tsc)** para confirmar que
   nada quebrou com a mudança em `env.ts` e `storage.ts`.
2. **Decidir o destino de cada feature que hoje depende da API interna da
   Manus (Forge)**, em `server/_core/`:
   - `llm.ts` — geração de texto por IA
   - `imageGeneration.ts` — geração de imagem por IA
   - `voiceTranscription.ts` — transcrição de voz
   - `notification.ts` — notificações
   - `map.ts` — Google Maps (autocompletar endereço)
   - `dataApi.ts` — chamadas a APIs externas via proxy da Manus
   Para cada uma: manter (com chave própria), trocar por outro provedor,
   ou remover se não for usada de fato — vale grep no `routers.ts` pra ver
   quais realmente têm uso nas telas do sistema.
3. **Avaliar o login OAuth da Manus** (`server/_core/sdk.ts`, `oauth.ts`,
   `Login.tsx`, `App.tsx` etc.) — como só existe um usuário hoje, a
   recomendação é manter só o login por e-mail/senha (`company_credentials`,
   já implementado) e não gastar tempo mantendo o OAuth da Manus vivo.
4. **Provisionar o bucket S3 ou R2**, preencher as variáveis no `.env` e
   testar upload/download de uma foto de verdade.
5. **Banco de dados**: aplicar as migrações (`drizzle/`) num banco novo —
   ver seção abaixo.
6. **Testar `pnpm build && pnpm start`** de ponta a ponta.
7. **Verificar `@sparticuz/chromium` / `puppeteer`** (usado em
   `budgetRenderer.ts` para gerar PDF de orçamento) — precisa de memória
   suficiente no ambiente de hospedagem escolhido.

## Banco de dados: estrutura vs. dados

- A **estrutura** (40 tabelas, `drizzle/schema.ts` + migrações em
  `drizzle/*.sql`) está completa neste pacote e é reproduzível com:
  ```bash
  pnpm db:push
  ```
- Os **dados reais** (clientes, orçamentos, vendas) **não estão neste
  pacote** — só existiam fragmentos de teste nos logs removidos. Você
  precisa solicitar à Manus um export/dump completo do banco de produção
  antes de trocar a senha (ou pedir que façam o export e troquem a senha
  na sequência).

## Comandos básicos

```bash
pnpm install
cp .env.example .env   # preencher com valores reais
pnpm db:push            # aplica o schema no banco novo
pnpm dev                # desenvolvimento
pnpm build && pnpm start   # produção
```
