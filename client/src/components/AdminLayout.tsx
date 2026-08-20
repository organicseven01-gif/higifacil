import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  Building2,
  LayoutDashboard,
  LogOut,
  Shield,
  Users,
  MessageSquarePlus,
  ChevronRight,
  Menu,
  X,
  Layers,
  CalendarCheck,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";

type AdminMenuItem = {
  icon: React.ElementType;
  label: string;
  path: string;
};

const menuItems: AdminMenuItem[] = [
  { icon: LayoutDashboard, label: "Visão Geral", path: "/admin" },
  { icon: Building2, label: "Empresas", path: "/admin/empresas" },
  { icon: Users, label: "Solicitações", path: "/admin/solicitacoes" },
  { icon: MessageSquarePlus, label: "Feedbacks", path: "/admin/feedbacks" },
  { icon: Layers, label: "Planos", path: "/admin/planos" },
  { icon: CalendarCheck, label: "Demonstrações", path: "/admin/demos" },
];

function AdminSidebar({ onClose }: { onClose?: () => void }) {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();
  const utils = trpc.useUtils();

  const handleLogout = async () => {
    await logout();
    utils.auth.me.invalidate();
    window.location.href = "/entrar";
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white w-64">
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">Higifácil</p>
            <p className="text-xs text-slate-400 leading-tight">Painel Admin</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white lg:hidden">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path || (item.path !== "/admin" && location.startsWith(item.path));
          return (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); onClose?.(); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {isActive && <ChevronRight className="h-3 w-3 opacity-60" />}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-slate-700">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800 mb-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-blue-600 text-white text-xs">
              {user?.name?.charAt(0)?.toUpperCase() ?? "A"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.name ?? "Admin"}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email ?? ""}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const companyLogoutMutation = trpc.companyAuth.logout.useMutation();

  // Verificar se é o dono do sistema via loginMethod
  // Usuários OAuth (Google/Manus) têm loginMethod diferente de "company_email" ou "company_user_*"
  const isCompanyLogin = user?.loginMethod?.startsWith("company");
  const isOwner = user && !isCompanyLogin;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      window.location.href = getLoginUrl("/admin");
      return;
    }
    // Se está logado como empresa, fazer logout da empresa e redirecionar para login Google
    if (isCompanyLogin && !loggingOut) {
      setLoggingOut(true);
      companyLogoutMutation.mutateAsync().finally(() => {
        window.location.href = getLoginUrl("/admin");
      });
    }
  }, [user, loading, isCompanyLogin, loggingOut]);

  if (loading || loggingOut) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center animate-pulse">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <p className="text-slate-400 text-sm">
            {loggingOut ? "Redirecionando para login do administrador..." : "Carregando painel admin..."}
          </p>
        </div>
      </div>
    );
  }

  if (!user || !isOwner) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">Acesso restrito ao administrador do sistema.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate("/")}
          >
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Sidebar desktop */}
      <div className="hidden lg:flex flex-shrink-0">
        <AdminSidebar />
      </div>

      {/* Sidebar mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full">
            <AdminSidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-slate-900 border-b border-slate-700">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400 hover:text-white"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-semibold text-white">Painel Admin</span>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}
