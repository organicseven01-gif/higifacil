import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

type Role = "master" | "admin" | "secretaria" | "funcionario" | "tecnico" | "user";

interface ProtectedRouteProps {
  component: React.ComponentType;
  allowedRoles: Role[];
}

/**
 * Extrai o role efetivo do usuário a partir do loginMethod e role.
 * Replica a lógica do DashboardLayout para consistência.
 */
function getEffectiveRole(user: { role?: string | null; loginMethod?: string | null } | null): Role {
  if (!user) return "user";
  const loginMethod = user.loginMethod ?? "";
  const rawRole = user.role ?? "user";

  if (loginMethod.startsWith("company_user_")) {
    const subRole = loginMethod.replace("company_user_", "") as Role;
    return subRole === "master" ? "admin" : subRole;
  }
  if (rawRole === "admin") return "admin";
  return rawRole as Role;
}

/**
 * Protege uma rota verificando o perfil do usuário logado.
 * Se o usuário não tiver o perfil necessário, redireciona para /dashboard.
 * Se não estiver autenticado, redireciona para /entrar (página de login da empresa).
 */
export function ProtectedRoute({ component: Component, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  const effectiveRole = getEffectiveRole(user);
  const hasAccess = allowedRoles.includes(effectiveRole);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Redireciona para a página de login da empresa
      setLocation("/entrar");
      return;
    }

    // Usuários de empresa não devem acessar rotas sem permissão
    if (user.loginMethod?.startsWith("company") && !hasAccess) {
      setLocation("/dashboard");
    }
  }, [loading, user, hasAccess, setLocation]);

  if (loading) return null;
  if (!user) return null;
  if (user.loginMethod?.startsWith("company") && !hasAccess) return null;

  return <Component />;
}
