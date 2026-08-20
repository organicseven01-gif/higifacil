import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, User, Phone, Briefcase, Lock, Eye, EyeOff, ArrowLeft, Loader2, Check, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";

export default function Profile() {
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [form, setForm] = useState({
    ownerName: "",
    ownerPhone: "",
    ownerCargo: "",
    ownerAvatarUrl: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const { data: profile, isLoading, refetch } = trpc.companyAuth.getCompanyProfile.useQuery();

  useEffect(() => {
    if (profile) {
      setForm({
        ownerName: profile.ownerName || "",
        ownerPhone: profile.ownerPhone || "",
        ownerCargo: profile.ownerCargo || "",
        ownerAvatarUrl: profile.ownerAvatarUrl || "",
      });
    }
  }, [profile]);

  const updateProfile = trpc.companyAuth.updateCompanyProfile.useMutation({
    onSuccess: () => {
      toast.success("✅ Perfil atualizado com sucesso!");
      refetch();
    },
    onError: (err) => {
      toast.error("Erro ao atualizar perfil: " + err.message);
    },
  });

  const changePassword = trpc.companyAuth.changePasswordWithConfirmation.useMutation({
    onSuccess: () => {
      toast.success("🔒 Senha alterada com sucesso!");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (err) => {
      toast.error("Erro ao alterar senha: " + err.message);
    },
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 5MB.");
      return;
    }
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("visibility", "public");
      formData.append("category", "avatars");
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        setForm(prev => ({ ...prev, ownerAvatarUrl: data.url }));
        await updateProfile.mutateAsync({ ownerAvatarUrl: data.url });
      }
    } catch {
      toast.error("Erro ao fazer upload da foto.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateProfile.mutateAsync({
        ownerName: form.ownerName,
        ownerPhone: form.ownerPhone,
        ownerCargo: form.ownerCargo,
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword.mutateAsync({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  };

  const passwordsMatch = passwordForm.confirmPassword && passwordForm.newPassword === passwordForm.confirmPassword;
  const passwordsMismatch = passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#1A9FE3" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <button
          onClick={() => navigate("/dashboard")}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h1 className="text-lg font-bold" style={{ color: "#0A1628" }}>Meu Perfil</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Avatar + Empresa */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div
                  className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center cursor-pointer border-4 border-white shadow-lg"
                  style={{ background: "#E8F4FD" }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {form.ownerAvatarUrl ? (
                    <img
                      src={form.ownerAvatarUrl}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold" style={{ color: "#1A9FE3" }}>
                      {getInitials(form.ownerName || profile?.name || "?")}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-colors"
                  style={{ background: "#1A9FE3" }}
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4 text-white" />
                  )}
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <div className="text-center">
                <p className="font-bold text-gray-900">{profile?.name}</p>
                <p className="text-sm text-gray-500">{profile?.email}</p>
                {form.ownerCargo && (
                  <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{ background: "#1A9FE3" }}>
                    {form.ownerCargo}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dados Pessoais */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <User className="h-4 w-4" style={{ color: "#1A9FE3" }} />
              Dados Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Nome do Responsável
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={form.ownerName}
                  onChange={e => setForm(prev => ({ ...prev, ownerName: e.target.value }))}
                  placeholder="Seu nome completo"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Cargo / Função
              </Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={form.ownerCargo}
                  onChange={e => setForm(prev => ({ ...prev, ownerCargo: e.target.value }))}
                  placeholder="Ex: Proprietário, Gerente..."
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Telefone Pessoal
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={form.ownerPhone}
                  onChange={e => setForm(prev => ({ ...prev, ownerPhone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                E-mail (não editável)
              </Label>
              <Input
                value={profile?.email || ""}
                disabled
                className="bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400">O e-mail é o identificador da conta e não pode ser alterado.</p>
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="w-full text-white font-semibold"
              style={{ background: "#1A9FE3" }}
            >
              {savingProfile ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
              ) : (
                "Salvar Dados"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Trocar Senha */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Lock className="h-4 w-4" style={{ color: "#1A9FE3" }} />
              Alterar Senha
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Senha Atual
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordForm.currentPassword}
                  onChange={e => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="Digite sua senha atual"
                  className="pl-9 pr-10"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Nova Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Mínimo 8 caracteres"
                  className="pl-9 pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordForm.newPassword && (
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${passwordForm.newPassword.length >= 8 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {passwordForm.newPassword.length >= 8 ? '✓' : '✗'} 8+ caracteres
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${/[A-Z]/.test(passwordForm.newPassword) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {/[A-Z]/.test(passwordForm.newPassword) ? '✓' : '✗'} Maiúscula
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${/[0-9]/.test(passwordForm.newPassword) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {/[0-9]/.test(passwordForm.newPassword) ? '✓' : '✗'} Número
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Confirmar Nova Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Repita a nova senha"
                  className={`pl-9 pr-10 ${passwordsMismatch ? "border-red-400" : passwordsMatch ? "border-green-400" : ""}`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {passwordForm.confirmPassword ? (
                    passwordsMatch
                      ? <Check className="h-4 w-4 text-green-500" />
                      : <AlertCircle className="h-4 w-4 text-red-400" />
                  ) : (
                    showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {passwordsMismatch && (
                <p className="text-xs text-red-500">As senhas não coincidem</p>
              )}
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={savingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
              className="w-full text-white font-semibold"
              style={{ background: "#1A9FE3" }}
            >
              {savingPassword ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Alterando...</>
              ) : (
                "Alterar Senha"
              )}
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400 pb-6">
          Higifácil · Sistema de Gestão para Higienizadores
        </p>
      </div>
    </div>
  );
}
