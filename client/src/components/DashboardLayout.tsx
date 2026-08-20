import { useAuth } from "@/_core/hooks/useAuth";
import OnboardingModal from "@/components/OnboardingModal";
import WelcomeVideoModal from "@/components/WelcomeVideoModal";
import TrialExpiredGate from "@/components/TrialExpiredGate";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Users,
  Armchair,
  FileText,
  PlusCircle,
  Settings,
  TrendingUp,
  Waves,
  ShoppingCart,
  BarChart3,
  PlayCircle,
  UserCog,
  Heart,
  Smartphone,
  Shield,
  Bell,
  Check,
  CheckCheck,
  Trash2,
  UserCircle,
  MessageSquarePlus,
  CreditCard,
  ChevronDown,
  Car,
  Headphones,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import QuickAccessFAB from "./QuickAccessFAB";
import { Button } from "./ui/button";
import { Lock } from "lucide-react";

type Role = "user" | "admin" | "master" | "secretaria" | "funcionario" | "tecnico";

type MenuItem = {
  icon: React.ElementType;
  label: string;
  path: string;
  roles: Role[]; // quais roles podem ver este item
  featureKey?: string; // chave da funcionalidade na tabela plan_features (undefined = sempre visível)
};

const ALL_ROLES: Role[] = ["master", "admin", "secretaria", "funcionario", "user"];
const MANAGEMENT_ROLES: Role[] = ["master", "admin"];
const SALES_ROLES: Role[] = ["master", "admin"];
const OFFICE_ROLES: Role[] = ["master", "admin", "secretaria"];
const EXECUTION_ROLES: Role[] = ["master", "admin", "secretaria", "funcionario", "tecnico"];
const TECNICO_ROLES: Role[] = ["master", "admin", "tecnico", "funcionario"];

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", roles: OFFICE_ROLES },
  { icon: ShoppingCart, label: "Vendas", path: "/vendas", roles: MANAGEMENT_ROLES, featureKey: "vendas" },
  { icon: BarChart3, label: "Financeiro", path: "/financeiro", roles: MANAGEMENT_ROLES, featureKey: "financeiro" },
  { icon: FileText, label: "Orçamentos", path: "/orcamentos", roles: SALES_ROLES },
  { icon: Users, label: "Clientes", path: "/clientes", roles: OFFICE_ROLES },
  { icon: Waves, label: "Tapetes", path: "/tapetes", roles: OFFICE_ROLES, featureKey: "tapetes" },
  { icon: PlayCircle, label: "Execução", path: "/execucao", roles: EXECUTION_ROLES, featureKey: "execucao" },
  { icon: Armchair, label: "Serviços", path: "/servicos", roles: MANAGEMENT_ROLES },
  { icon: TrendingUp, label: "Concorrência", path: "/concorrentes", roles: MANAGEMENT_ROLES, featureKey: "concorrentes" },
  { icon: Heart, label: "Reativação", path: "/crm", roles: MANAGEMENT_ROLES, featureKey: "crm" },
  { icon: UserCog, label: "Usuários", path: "/usuarios", roles: MANAGEMENT_ROLES, featureKey: "usuarios" },
  { icon: Settings, label: "Configurações", path: "/configuracoes", roles: MANAGEMENT_ROLES },
  { icon: MessageSquarePlus, label: "Enviar Feedback", path: "/feedback", roles: ALL_ROLES },
  { icon: Headphones, label: "Suporte", path: "/suporte", roles: ALL_ROLES },
  // Painel Master: REMOVIDO do menu de empresas clientes.
  // O painel admin (/admin) é acessado pelo dono do sistema via Manus OAuth,
  // que é redirecionado automaticamente para /admin ao tentar acessar o DashboardLayout.
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();
  // Modal de boas-vindas com vídeo — exibido uma única vez antes do OnboardingModal
  const [showWelcomeVideo, setShowWelcomeVideo] = useState(() => {
    return localStorage.getItem('welcome_video_seen') !== 'true';
  });
  const handleWelcomeVideoContinue = () => {
    localStorage.setItem('welcome_video_seen', 'true');
    setShowWelcomeVideo(false);
  };

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  // SEGURANÇA: Nunca redirecionar automaticamente para /admin aqui.
  // O dono do sistema acessa /admin diretamente.
  // Se um usuário OAuth (não-empresa) tentar acessar o dashboard,
  // mostramos a tela de login de empresa em vez de redirecionar para admin.
  if (user && !user.loginMethod?.startsWith("company")) {
    // Usuário OAuth tentando acessar o dashboard da empresa — mostrar tela de login
    return (
      <div className="flex items-center justify-center min-h-screen sos-gradient">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 shadow-2xl">
          <div className="flex flex-col items-center gap-4">
            <img src="/logo-higifacil.png" alt="Higifácil" className="w-40 h-20 object-contain" style={{ filter: "brightness(0) invert(1)" }} />
            <p className="text-sm text-white/70 text-center">
              Sistema de Gestão para Higienizadores
            </p>
          </div>
          <Button
            onClick={() => { window.location.href = "/entrar"; }}
            size="lg"
            className="w-full text-white font-semibold shadow-lg"
            style={{ background: "#1A9FE3" }}
          >
            Entrar na Plataforma
          </Button>
          <a href="/admin" className="text-xs text-white/40 hover:text-white/70 transition-colors">
            Acesso administrativo
          </a>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen sos-gradient">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 shadow-2xl">
          <div className="flex flex-col items-center gap-4">
            <img src="/logo-higifacil.png" alt="Higifácil" className="w-40 h-20 object-contain" style={{ filter: "brightness(0) invert(1)" }} />
            <p className="text-sm text-white/70 text-center">
              Sistema de Gestão para Higienizadores
            </p>
          </div>
          <Button
            onClick={() => { window.location.href = "/entrar"; }}
            size="lg"
            className="w-full text-white font-semibold shadow-lg"
            style={{ background: "#1A9FE3" }}
          >
            Entrar na Plataforma
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      {showWelcomeVideo ? (
        <WelcomeVideoModal onContinue={handleWelcomeVideoContinue} />
      ) : (
        <OnboardingModal />
      )}
      <TrialExpiredGate>
        <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
          {children}
        </DashboardLayoutContent>
      </TrialExpiredGate>
      {/* Botão flutuante WhatsApp - Suporte (oculto) */}
    </SidebarProvider>
  );
}

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
}) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [orcamentosOpen, setOrcamentosOpen] = useState(() => {
    return location.startsWith('/orcamentos');
  });

  const { data: notifications = [], refetch: refetchNotifications } = trpc.notifications.list.useQuery(undefined, { refetchInterval: 30000 });
  const markReadMutation = trpc.notifications.markRead.useMutation({ onSuccess: () => refetchNotifications() });
  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({ onSuccess: () => refetchNotifications() });
  const clearAllMutation = trpc.notifications.clearAll.useMutation({ onSuccess: () => refetchNotifications() });
  const unreadCount = notifications.filter((n: any) => !n.readAt).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Para sub-usuários, o loginMethod tem formato company_user_ROLE (ex: company_user_tecnico)
  // Para masters de empresa, o loginMethod é 'company_email' e o role é 'admin'
  // Para usuários OAuth normais, o role é 'user' ou 'admin'
  const rawRole = user?.role ?? "user";
  const loginMethod = user?.loginMethod ?? "";
  const isSubUser = loginMethod.startsWith("company_user_");
  let userRole: Role;
  if (loginMethod.startsWith("company_user_")) {
    // Sub-usuário: extrair o role real do loginMethod
    const subRole = loginMethod.replace("company_user_", "") as Role;
    userRole = subRole === "master" ? "admin" : subRole;
  } else if (rawRole === "admin") {
    userRole = "admin";
  } else {
    userRole = rawRole as Role;
  }

  // Buscar nome da empresa para sub-usuários
  const { data: subUserData } = trpc.companyUsers.me.useQuery(undefined, {
    enabled: isSubUser,
    staleTime: 5 * 60 * 1000,
  });
  const companyDisplayName = isSubUser ? (subUserData?.companyName ?? "") : "";

  // Buscar plano e funcionalidades para filtrar menu
  const isCompanyUser = (user?.loginMethod ?? "").startsWith("company");
  const { data: subData } = trpc.stripe.getSubscriptionDetails.useQuery(undefined, {
    enabled: isCompanyUser,
    staleTime: 2 * 60 * 1000,
  });
  const { data: planFeatures = [] } = trpc.planFeatures.list.useQuery(undefined, {
    enabled: isCompanyUser,
    staleTime: 5 * 60 * 1000,
  });
  const planType = (subData?.planType ?? "free") as string;

  // Verificar se uma featureKey está acessível pelo plano atual
  const isFeatureEnabled = useMemo(() => (featureKey: string): boolean => {
    if (!isCompanyUser) return true; // admin OAuth vê tudo
    if (planType === "equipe") return true;
    const feature = planFeatures.find((f: any) => f.featureKey === featureKey);
    if (!feature) return true;
    if (planType === "dupla") return feature.duplaEnabled;
    return feature.soloEnabled; // solo e free
  }, [planType, planFeatures, isCompanyUser]);

  // Módulos customizados do sub-usuário (vindos do banco via companyUsers.me)
  const userAllowedModules: string[] | null = isSubUser ? (subUserData?.allowedModules ?? null) : null;

  // Mapeamento de path para chave de módulo
  const PATH_TO_MODULE: Record<string, string> = {
    "/dashboard": "dashboard",
    "/orcamentos": "orcamentos",
    "/orcamentos/novo": "orcamentos",
    "/clientes": "clientes",
    "/tapetes": "tapetes",
    "/execucao": "execucao",
    "/servicos": "servicos",
    "/concorrentes": "concorrentes",
    "/crm": "crm",
    "/vendas": "vendas",
    "/financeiro": "financeiro",
    "/usuarios": "configuracoes",
    "/configuracoes": "configuracoes",
    "/feedback": "dashboard",
  };

  // Filtrar itens do menu pelo role do usuário E pelo plano E pelos módulos customizados
  const visibleMenuItems = menuItems.filter(item => {
    if (!item.roles.includes(userRole)) return false;
    if (item.featureKey && !isFeatureEnabled(item.featureKey)) return false;
    // Se o sub-usuário tem módulos customizados, verificar se o item está permitido
    if (isSubUser && userAllowedModules !== null) {
      const moduleKey = PATH_TO_MODULE[item.path];
      if (moduleKey && !userAllowedModules.includes(moduleKey)) return false;
    }
    return true;
  });

  // Sub-usuários não devem ver o Dashboard — redirecionar para a primeira aba permitida
  useEffect(() => {
    if (!isSubUser) return;
    // Se estiver no dashboard (rota padrão), redirecionar para primeira aba visível
    if (location === "/dashboard" || location === "/") {
      const firstAllowed = visibleMenuItems.find(item => item.path !== "/dashboard");
      if (firstAllowed) setLocation(firstAllowed.path);
    }
    // Funcionário só pode acessar execução
    if (userRole === "funcionario" && location !== "/execucao") {
      setLocation("/execucao");
    }
  }, [isSubUser, userRole, location, setLocation, visibleMenuItems]);

  const activeMenuItem = visibleMenuItems.find(
    (item) => item.path === location || (location.startsWith(item.path + "/") && !visibleMenuItems.some(other => other.path !== item.path && other.path === location))
  );

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  // Badge de role
  const roleLabels: Record<Role, string> = {
    master: "Master",
    admin: "Admin",
    tecnico: "Técnico",
    secretaria: "Secretária",
    funcionario: "Funcionário",
    user: "Usuário",
  };

  // Layout adaptativo: sub-usuários com 1-3 itens no menu usam layout de botões grandes
  const useSimpleLayout = isSubUser && visibleMenuItems.filter(i => i.path !== "/dashboard").length <= 3;
  const simpleItems = visibleMenuItems.filter(i => i.path !== "/dashboard");

  if (useSimpleLayout) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#0A1628" }}>
        {/* Header simples */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <img
            src="/logo-higifacil.png"
            alt="Higifácil"
            className="h-7 object-contain"
            style={{ filter: "brightness(0) invert(1)", maxWidth: "100px" }}
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50">{user?.name}</span>
            <button
              onClick={async () => { await logout(); window.location.href = '/entrar'; }}
              className="text-xs text-white/40 hover:text-white/70 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
        {/* Botões grandes de navegação */}
        {simpleItems.length > 1 && (
          <div className="flex gap-2 px-4 pt-4">
            {simpleItems.map(item => {
              const isActive = location === item.path || location.startsWith(item.path + "/");
              return (
                <button
                  key={item.path}
                  onClick={() => setLocation(item.path)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all"
                  style={isActive
                    ? { background: "#1A9FE3", color: "#fff" }
                    : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
        {/* Conteúdo */}
        <main className="flex-1 p-3 sm:p-4">{children}</main>
      </div>
    );
  }

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}>
          {/* Header */}
          <SidebarHeader className="h-16 justify-center" style={{ background: "#0A1628" }}>
            <div className="flex items-center gap-2 px-2 w-full">
              <button
                onClick={toggleSidebar}
                className="h-7 w-7 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors focus:outline-none shrink-0"
              >
                <PanelLeft className="h-4 w-4 text-white/50" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <button
                    onClick={() => window.location.reload()}
                    title="Atualizar página"
                    className="flex items-center focus:outline-none"
                  >
                    <img
                      src="/logo-higifacil.png"
                      alt="Higifácil"
                      className="h-8 object-contain hover:opacity-80 transition-opacity cursor-pointer"
                      style={{ filter: "brightness(0) invert(1)", maxWidth: "120px" }}
                    />
                  </button>
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative h-8 w-8 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors focus:outline-none shrink-0"
                  >
                    <Bell className="h-4 w-4 text-white/70" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center" style={{ background: "#1A9FE3" }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                </div>
              )}
              {isCollapsed && (
                <div className="flex flex-col items-center gap-1">
                  <button onClick={() => window.location.reload()} title="Atualizar página">
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity cursor-pointer" style={{ background: "#1A9FE3" }}>
                      <span className="text-white font-black text-xs">H</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative h-7 w-7 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors focus:outline-none"
                  >
                    <Bell className="h-3.5 w-3.5 text-white/60" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full text-white text-[8px] font-bold flex items-center justify-center" style={{ background: "#1A9FE3" }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>
          </SidebarHeader>

          {/* Navigation */}
          <SidebarContent className="gap-0 sidebar-scroll" style={{ background: "#0A1628" }}>
            <SidebarMenu className="px-2 py-3 gap-1">
              {visibleMenuItems.map((item) => {
                // Item especial: Orçamentos com submenu
                if (item.path === '/orcamentos') {
                  const isOrcamentosActive = location.startsWith('/orcamentos');
                  return (
                    <SidebarMenuItem key={item.path}>
                      {/* Botão pai: Orçamentos */}
                      <SidebarMenuButton
                        isActive={isOrcamentosActive && !orcamentosOpen}
                        onClick={() => setOrcamentosOpen(!orcamentosOpen)}
                        tooltip="Orçamentos"
                        className={`h-10 transition-all font-medium rounded-lg ${
                          isOrcamentosActive
                            ? "text-white hover:opacity-90"
                            : "text-white/70 hover:bg-white/10 hover:text-white"
                        }`}
                        style={isOrcamentosActive ? { background: "#1A9FE3", color: "#ffffff" } : {}}
                      >
                        <FileText className="h-4 w-4 shrink-0" />
                        <span className="flex-1">Orçamentos</span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform duration-200 ${
                            orcamentosOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </SidebarMenuButton>
                      {/* Sub-itens */}
                      {orcamentosOpen && (
                        <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-white/20 pl-3">
                          <button
                            onClick={() => setLocation('/orcamentos')}
                            className={`flex items-center gap-2 h-8 px-2 rounded-md text-sm font-medium transition-all w-full text-left ${
                              location === '/orcamentos'
                                ? 'text-white bg-white/15'
                                : 'text-white/60 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                            <span>Lista de Orçamentos</span>
                          </button>
                          <button
                            onClick={() => setLocation('/orcamentos/novo')}
                            className={`flex items-center gap-2 h-8 px-2 rounded-md text-sm font-medium transition-all w-full text-left ${
                              location === '/orcamentos/novo'
                                ? 'text-white bg-white/15'
                                : 'text-white/60 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            <PlusCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>Novo Orçamento</span>
                          </button>
                          <button
                            onClick={() => setLocation('/orcamentos/deslocamento')}
                            className={`flex items-center gap-2 h-8 px-2 rounded-md text-sm font-medium transition-all w-full text-left ${
                              location === '/orcamentos/deslocamento'
                                ? 'text-white bg-white/15'
                                : 'text-white/60 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            <Car className="h-3.5 w-3.5 shrink-0" />
                            <span>Cálculo de Deslocamento</span>
                          </button>
                        </div>
                      )}
                    </SidebarMenuItem>
                  );
                }

                // Item especial: Suporte abre WhatsApp
                if (item.path === '/suporte') {
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={false}
                        onClick={() => window.open('https://wa.me/5582998383003?text=Ol%C3%A1%2C+preciso+de+suporte+com+o+Higif%C3%A1cil!', '_blank')}
                        tooltip="Suporte via WhatsApp"
                        className="h-10 transition-all font-medium rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                // Itens normais
                const isActive =
                  location === item.path ||
                  (location.startsWith(item.path + "/") &&
                    !visibleMenuItems.some(other => other.path === location));
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-medium rounded-lg ${
                        isActive
                          ? "text-white hover:opacity-90"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                      style={isActive ? { background: "#1A9FE3", color: "#ffffff" } : {}}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          {/* Footer */}
          <SidebarFooter className="p-3" style={{ background: "#0A1628", borderTop: "1px solid rgba(26,159,227,0.2)" }}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/10 transition-colors w-full text-left focus:outline-none">
                  <Avatar className="h-8 w-8 border border-white/20 shrink-0">
                    <AvatarFallback className="text-xs font-bold text-white" style={{ background: "#1A9FE3" }}>
                      {user?.name?.charAt(0).toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-white">{user?.name || "-"}</p>
                      {isSubUser && companyDisplayName ? (
                        <p className="text-[10px] text-white/60 truncate">
                          <span className="text-white/40">🏢</span> {companyDisplayName}
                        </p>
                      ) : (
                        <p className="text-xs text-white/50 truncate">{roleLabels[userRole]}</p>
                      )}
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setLocation("/perfil")} className="cursor-pointer">
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>Meu Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/minha-assinatura")} className="cursor-pointer">
                  <CreditCard className="mr-2 h-4 w-4" />
                  <span>Minha Assinatura</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => { await logout(); window.location.href = '/entrar'; }} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Resize handle */}
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-green-500/30 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-3 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg" />
              <span className="font-semibold text-foreground">{activeMenuItem?.label ?? "Menu"}</span>
            </div>
            <div ref={notifRef} className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative h-9 w-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
              >
                <Bell className="h-5 w-5 text-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-background border border-border rounded-xl shadow-xl w-80 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <span className="font-semibold text-sm">Notificações</span>
                    {unreadCount > 0 && (
                      <button onClick={() => markAllReadMutation.mutate()} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                        <CheckCheck className="h-3.5 w-3.5" /> Marcar todas como lidas
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Nenhuma notificação</p>
                    ) : (
                      notifications.map((n: any) => (
                        <div
                          key={n.id}
                          className={`flex items-start gap-3 px-4 py-3 border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors ${!n.readAt ? 'bg-blue-50/50' : ''}`}
                          onClick={() => !n.readAt && markReadMutation.mutate({ id: n.id })}
                        >
                          <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${n.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{n.title}</p>
                            {n.message && <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.message}</p>}
                            <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(n.createdAt).toLocaleString('pt-BR')}</p>
                          </div>
                          {!n.readAt && <Check className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-1" />}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Painel de notificações para desktop - abre a partir do sino no header */}
        {!isMobile && (
          <div ref={notifRef} className="fixed top-4 right-4 z-50">
            {
            showNotifications && (
              <div className="absolute right-0 top-0 z-50 bg-background border border-border rounded-xl shadow-xl w-80 overflow-hidden" style={{ top: "3.5rem" }}>
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <span className="font-semibold text-sm">Notificações</span>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button onClick={() => markAllReadMutation.mutate()} className="text-xs hover:underline flex items-center gap-1" style={{ color: "#1A9FE3" }}>
                        <CheckCheck className="h-3.5 w-3.5" /> Marcar lidas
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button onClick={() => clearAllMutation.mutate()} className="text-xs text-red-400 hover:underline flex items-center gap-1">
                        <Trash2 className="h-3.5 w-3.5" /> Limpar
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhuma notificação</p>
                  ) : (
                    notifications.map((n: any) => (
                      <div
                        key={n.id}
                        className={`flex items-start gap-3 px-4 py-3 border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors ${!n.readAt ? 'bg-blue-50/50' : ''}`}
                        onClick={() => !n.readAt && markReadMutation.mutate({ id: n.id })}
                      >
                        <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${n.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{n.title}</p>
                          {n.message && <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.message}</p>}
                          <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(n.createdAt).toLocaleString('pt-BR')}</p>
                        </div>
                        {!n.readAt && <Check className="h-3.5 w-3.5 shrink-0 mt-1" style={{ color: "#1A9FE3" }} />}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          }
          </div>
        )}
        <main className="flex-1 p-3 sm:p-4 md:p-6">{children}</main>
        <QuickAccessFAB />
      </SidebarInset>
    </>
  );
}
