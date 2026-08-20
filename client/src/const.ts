export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/** Rota de login própria do sistema (e-mail/senha + Google). */
export const LOCAL_LOGIN_PATH = "/entrar";

// Generate login URL at runtime so redirect URI reflects the current origin.
// Pass returnPath to redirect back to a specific page after login (e.g., "/admin").
//
// O portal OAuth da Manus (VITE_OAUTH_PORTAL_URL) é OPCIONAL: fora da Manus
// essa variável fica vazia e o login usado é o próprio do sistema, por
// e-mail/senha (rota /entrar). Antes esta função montava `new URL()` com a
// variável vazia e lançava "Invalid URL" durante o render, derrubando o app
// inteiro — por isso o fallback abaixo.
export const getLoginUrl = (returnPath?: string) => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  // Sem portal OAuth configurado → usa a tela de login local.
  if (!oauthPortalUrl) {
    if (returnPath && returnPath !== "/") {
      return `${LOCAL_LOGIN_PATH}?returnTo=${encodeURIComponent(returnPath)}`;
    }
    return LOCAL_LOGIN_PATH;
  }

  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  // Encode returnPath into state so the callback can redirect back after login
  const statePayload = JSON.stringify({ redirectUri, returnPath: returnPath ?? "/" });
  const state = btoa(statePayload);

  try {
    const url = new URL(`${oauthPortalUrl}/app-auth`);
    url.searchParams.set("appId", appId ?? "");
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");
    return url.toString();
  } catch {
    // URL do portal inválida — não derruba a aplicação, cai no login local.
    console.warn("[auth] VITE_OAUTH_PORTAL_URL inválida, usando login local:", oauthPortalUrl);
    return LOCAL_LOGIN_PATH;
  }
};
