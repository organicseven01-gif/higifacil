import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import Services from "./pages/Services";
import Clients from "./pages/Clients";
import Budgets from "./pages/Budgets";
import NewBudget from "./pages/NewBudget";
import EditBudget from "./pages/EditBudget";
import BudgetPreview from "./pages/BudgetPreview";
import Settings from "./pages/Settings";
import Competitors from "./pages/Competitors";
import Carpets from "./pages/Carpets";
import Sales from "./pages/Sales";
import Financeiro from "./pages/Financeiro";
import Execution from "./pages/Execution";
import ExecutionCarpets from "./pages/ExecutionCarpets";
import Users from "./pages/Users";
import TechPanel from "./pages/TechPanel";
import CRM from "./pages/CRM";
import Review from "./pages/Review";
import MasterPanel from "./pages/MasterPanel";
import CompanyLogin from "./pages/CompanyLogin";
import Login from "./pages/Login";
import RecuperarSenha from "./pages/RecuperarSenha";
import RedefinirSenha from "./pages/RedefinirSenha";
import RequestAccess from "./pages/RequestAccess";
import DashboardLayout from "./components/DashboardLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import ClientConfirmation from "./pages/ClientConfirmation";
import Profile from "./pages/Profile";
import Feedback from "./pages/Feedback";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminEmpresas from "./pages/admin/AdminEmpresas";
import AdminSolicitacoes from "./pages/admin/AdminSolicitacoes";
import AdminFeedbacks from "./pages/admin/AdminFeedbacks";
import AdminPlanos from "./pages/admin/AdminPlanos";
import AdminDemos from "./pages/admin/AdminDemos";
import MinhaAssinatura from "./pages/MinhaAssinatura";
import BemVindo from "./pages/BemVindo";
import Deslocamento from "./pages/Deslocamento";
import { DemoPainel } from "./components/DemoPainel";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/planos">{() => { window.location.replace("/#planos"); return null; }}</Route>
      <Route path="/confirmar/:token" component={ClientConfirmation} />
      <Route path="/dashboard" component={Dashboard} />
      {/* Rotas com controle de acesso por perfil */}
      {/* MANAGEMENT_ROLES: master, admin */}
      <Route path="/servicos">{() => <ProtectedRoute component={Services} allowedRoles={["master", "admin"]} />}</Route>
      <Route path="/vendas">{() => <ProtectedRoute component={Sales} allowedRoles={["master", "admin"]} />}</Route>
      <Route path="/financeiro">{() => <ProtectedRoute component={Financeiro} allowedRoles={["master", "admin"]} />}</Route>
      <Route path="/orcamentos">{() => <ProtectedRoute component={Budgets} allowedRoles={["master", "admin"]} />}</Route>
      <Route path="/orcamentos/novo">{() => <ProtectedRoute component={NewBudget} allowedRoles={["master", "admin"]} />}</Route>
      <Route path="/orcamentos/deslocamento">{() => <ProtectedRoute component={Deslocamento} allowedRoles={["master", "admin"]} />}</Route>
      <Route path="/orcamentos/:id/editar">{() => <ProtectedRoute component={EditBudget} allowedRoles={["master", "admin"]} />}</Route>
      <Route path="/orcamentos/:id/visualizar">{() => <ProtectedRoute component={BudgetPreview} allowedRoles={["master", "admin"]} />}</Route>
      <Route path="/concorrentes">{() => <ProtectedRoute component={Competitors} allowedRoles={["master", "admin"]} />}</Route>
      <Route path="/crm">{() => <ProtectedRoute component={CRM} allowedRoles={["master", "admin"]} />}</Route>
      <Route path="/usuarios">{() => <ProtectedRoute component={Users} allowedRoles={["master", "admin"]} />}</Route>
      {/* OFFICE_ROLES: master, admin, secretaria */}
      <Route path="/clientes">{() => <ProtectedRoute component={Clients} allowedRoles={["master", "admin", "secretaria"]} />}</Route>
      <Route path="/tapetes">{() => <ProtectedRoute component={Carpets} allowedRoles={["master", "admin", "secretaria"]} />}</Route>
      <Route path="/configuracoes">{() => <ProtectedRoute component={Settings} allowedRoles={["master", "admin", "secretaria"]} />}</Route>
      {/* EXECUTION_ROLES: todos */}
      <Route path="/execucao">{() => <ProtectedRoute component={Execution} allowedRoles={["master", "admin", "secretaria", "funcionario", "tecnico"]} />}</Route>
      <Route path="/execucao/tapetes">{() => <ProtectedRoute component={ExecutionCarpets} allowedRoles={["master", "admin", "secretaria", "funcionario", "tecnico"]} />}</Route>
      <Route path="/painel-tecnico">{() => <ProtectedRoute component={TechPanel} allowedRoles={["master", "admin", "tecnico", "funcionario"]} />}</Route>
      {/* Master: apenas dono do sistema via OAuth */}
      <Route path="/master" component={MasterPanel} />
      <Route path="/empresa/login" component={CompanyLogin} />
      <Route path="/entrar" component={Login} />
      <Route path="/recuperar-senha" component={RecuperarSenha} />
      <Route path="/redefinir-senha" component={RedefinirSenha} />
      <Route path="/perfil" component={Profile} />
      <Route path="/minha-assinatura" component={MinhaAssinatura} />
      <Route path="/bem-vindo" component={BemVindo} />
      <Route path="/feedback" component={Feedback} />
      {/* Painel Admin - exclusivo para o dono do sistema */}
      <Route path="/admin/entrar" component={AdminLogin} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/empresas" component={AdminEmpresas} />
      <Route path="/admin/solicitacoes" component={AdminSolicitacoes} />
      <Route path="/admin/feedbacks" component={AdminFeedbacks} />
      <Route path="/admin/planos" component={AdminPlanos} />
      <Route path="/admin/demos" component={AdminDemos} />

      <Route path="/solicitar-acesso" component={RequestAccess} />
      <Route path="/avaliar/:token" component={Review} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
          <DemoPainel />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
