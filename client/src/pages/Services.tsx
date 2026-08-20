import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, ToggleLeft, ToggleRight, ImageIcon, X, Upload, Info, Tag, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import ServiceCategoryToggle from "@/components/ServiceCategoryToggle";

type ServiceForm = {
  name: string;
  price: string;
  category: string;
  description: string;
};

type CategoryForm = {
  name: string;
  emoji: string;
};

// Emojis sugeridos para facilitar a escolha
const EMOJI_SUGGESTIONS = ["🛋️", "🪑", "💺", "🛏️", "🧶", "🚗", "🏠", "🧹", "✨", "💧", "🛁", "🪟", "🚿", "🧴", "📦", "🔧", "⭐", "🎯", "💼", "🏷️"];

export default function Services() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  // Category management state
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [emojiInput, setEmojiInput] = useState("");

  const { data: categories = [] } = trpc.serviceCategories.list.useQuery();
  const { data: services = [], isLoading } = trpc.services.list.useQuery({ search });

  const createMutation = trpc.services.create.useMutation({
    onSuccess: () => {
      utils.services.list.invalidate();
      toast.success("Serviço cadastrado!");
      setIsDialogOpen(false);
      reset();
      setImageUrl(null);
    },
    onError: () => toast.error("Erro ao cadastrar serviço"),
  });

  const updateMutation = trpc.services.update.useMutation({
    onSuccess: () => {
      utils.services.list.invalidate();
      toast.success("Serviço atualizado!");
      setIsDialogOpen(false);
      setEditingService(null);
      setImageUrl(null);
    },
    onError: () => toast.error("Erro ao atualizar serviço"),
  });

  const deleteMutation = trpc.services.delete.useMutation({
    onSuccess: () => { utils.services.list.invalidate(); toast.success("Serviço excluído!"); },
    onError: () => toast.error("Erro ao excluir serviço"),
  });

  const toggleMutation = trpc.services.update.useMutation({
    onSuccess: () => utils.services.list.invalidate(),
  });

  // Category mutations
  const createCategoryMutation = trpc.serviceCategories.create.useMutation({
    onSuccess: () => {
      utils.serviceCategories.list.invalidate();
      toast.success("Categoria criada!");
      setIsCategoryDialogOpen(false);
      resetCategory();
      setEmojiInput("");
    },
    onError: () => toast.error("Erro ao criar categoria"),
  });

  const updateCategoryMutation = trpc.serviceCategories.update.useMutation({
    onSuccess: () => {
      utils.serviceCategories.list.invalidate();
      toast.success("Categoria atualizada!");
      setIsCategoryDialogOpen(false);
      setEditingCategory(null);
      resetCategory();
      setEmojiInput("");
    },
    onError: () => toast.error("Erro ao atualizar categoria"),
  });

  const deleteCategoryMutation = trpc.serviceCategories.delete.useMutation({
    onSuccess: () => {
      utils.serviceCategories.list.invalidate();
      toast.success("Categoria excluída!");
    },
    onError: () => toast.error("Erro ao excluir categoria"),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ServiceForm>({
    defaultValues: { name: "", price: "", category: "Geral", description: "" },
  });

  const { register: registerCategory, handleSubmit: handleSubmitCategory, reset: resetCategory, setValue: setCategoryValue } = useForm<CategoryForm>({
    defaultValues: { name: "", emoji: "" },
  });

  const openCreate = () => {
    setEditingService(null);
    reset({ name: "", price: "", category: "Geral", description: "" });
    setImageUrl(null);
    setIsDialogOpen(true);
  };

  const openEdit = (service: any) => {
    setEditingService(service);
    reset({
      name: service.name,
      price: String(service.price),
      category: service.category,
      description: service.description || "",
    });
    setImageUrl(service.imageUrl || null);
    setIsDialogOpen(true);
  };

  const openCreateCategory = () => {
    setEditingCategory(null);
    resetCategory({ name: "", emoji: "" });
    setEmojiInput("");
    setIsCategoryDialogOpen(true);
  };

  const openEditCategory = (cat: any) => {
    setEditingCategory(cat);
    resetCategory({ name: cat.name, emoji: cat.emoji || "" });
    setEmojiInput(cat.emoji || "");
    setIsCategoryDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 5MB.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("visibility", "public");
      formData.append("category", "services");
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload falhou");
      const { url } = await res.json();
      setImageUrl(url);
      toast.success("Imagem enviada!");
    } catch {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImageUrl(ev.target?.result as string);
        toast.success("Imagem carregada!");
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = (data: ServiceForm) => {
    if (editingService) {
      updateMutation.mutate({ id: editingService.id, ...data, imageUrl: imageUrl ?? null });
    } else {
      createMutation.mutate({ ...data, active: true, imageUrl: imageUrl ?? undefined });
    }
  };

  const onSubmitCategory = (data: CategoryForm) => {
    const payload = { name: data.name.trim(), emoji: emojiInput.trim() || "🔧" };
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, ...payload });
    } else {
      createCategoryMutation.mutate(payload);
    }
  };

  const formatCurrency = (val: string | number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(String(val)) || 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Serviços</h1>
            <p className="text-muted-foreground text-sm mt-1">Gerencie os serviços disponíveis para orçamentos</p>
          </div>
          <Button onClick={openCreate} className="gap-2 text-white" style={{ background: "linear-gradient(135deg, oklch(0.32 0.14 240), oklch(0.50 0.18 155))" }}>
            <Plus className="h-4 w-4" /> Novo Serviço
          </Button>
        </div>

        {/* Tipos de Serviço */}
        <ServiceCategoryToggle />

        {/* Categorias de Móveis */}
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setShowCategoryManager(!showCategoryManager)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-blue-600" />
              <span className="font-semibold text-sm text-foreground">Categorias de Móveis</span>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{categories.length}</span>
            </div>
            {showCategoryManager
              ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {showCategoryManager && (
            <div className="px-4 pb-4 border-t border-border">
              <p className="text-xs text-muted-foreground mt-3 mb-3">
                Estas categorias aparecem como chips rápidos na tela de Novo Orçamento para facilitar a busca de serviços.
              </p>

              {/* Lista de categorias */}
              <div className="space-y-2 mb-3">
                {categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma categoria cadastrada</p>
                ) : (
                  categories.map((cat: any) => (
                    <div key={cat.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border bg-muted/10 hover:bg-muted/20 transition-colors">
                      <span className="text-xl leading-none w-7 text-center">{cat.emoji || "🔧"}</span>
                      <span className="flex-1 font-medium text-sm text-foreground">{cat.name}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditCategory(cat)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                          title="Editar categoria"
                        >
                          <Pencil className="h-3.5 w-3.5 text-blue-500" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Excluir a categoria "${cat.name}"?`)) {
                              deleteCategoryMutation.mutate({ id: cat.id });
                            }
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          title="Excluir categoria"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openCreateCategory}
                className="w-full gap-2 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                <Plus className="h-3.5 w-3.5" /> Nova Categoria
              </Button>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar serviço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
        {/* Category Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Todos", value: null },
            { label: "Higienização", value: "Higienização" },
            { label: "Impermeabilização", value: "Impermeabilização" },
            { label: "Higienização + Impermeabilização", value: "Higienização + Impermeabilização" },
            { label: "Extras", value: "Extras" },
          ].map((btn) => (
            <button
              key={btn.label}
              onClick={() => setCategoryFilter(btn.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                categoryFilter === btn.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-muted-foreground border-border hover:border-blue-400 hover:text-blue-600"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Services List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-white rounded-2xl animate-pulse border border-border" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-white rounded-2xl border border-border">
            <p className="text-lg font-medium">Nenhum serviço encontrado</p>
            <p className="text-sm mt-1">Clique em "Novo Serviço" para começar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...services]
              .filter((s: any) => !categoryFilter || s.category === categoryFilter)
              .sort((a: any, b: any) => {
                const order = ["Higienização", "Impermeabilização", "Higienização + Impermeabilização", "Extras"];
                const ai = order.indexOf(a.category);
                const bi = order.indexOf(b.category);
                return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
              })
              .map((service: any) => (
              <div key={service.id} className={`bg-white rounded-2xl border shadow-sm card-3d overflow-hidden ${!service.active ? "opacity-60" : ""}`}>
                {service.imageUrl && (
                  <div className="w-full h-36 overflow-hidden bg-muted/20">
                    <img src={service.imageUrl} alt={service.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {service.serviceCode != null && (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                            #{String(service.serviceCode).padStart(3, '0')}
                          </span>
                        )}
                        <h3 className="font-semibold text-foreground truncate">{service.name}</h3>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block" style={{ background: "oklch(0.93 0.06 240)", color: "oklch(0.35 0.14 240)" }}>
                        {service.category}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleMutation.mutate({ id: service.id, active: !service.active })}
                      className="ml-2 shrink-0"
                    >
                      {service.active
                        ? <ToggleRight className="h-6 w-6 text-green-500" />
                        : <ToggleLeft className="h-6 w-6 text-muted-foreground" />}
                    </button>
                  </div>
                  {service.description && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{service.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold" style={{ color: "oklch(0.32 0.14 240)" }}>
                      {formatCurrency(service.price)}
                    </span>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(service)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => { if (confirm("Excluir este serviço?")) deleteMutation.mutate({ id: service.id }); }}
                        className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog de Serviço */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setImageUrl(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingService ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Nome do Serviço *</label>
              <Input {...register("name", { required: true })} placeholder="Ex: Higienização Sofá 3 Lugares" className={errors.name ? "border-red-400" : ""} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Preço (R$) *</label>
              <Input {...register("price", { required: true })} type="number" step="0.01" min="0" placeholder="0,00" className={errors.price ? "border-red-400" : ""} />
              <div className="flex items-start gap-1.5 mt-1.5 px-2 py-1.5 rounded-md bg-amber-50 border border-amber-200">
                <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  <strong>Valor sugerido</strong> — este preço é apenas uma referência. Ao criar um orçamento, você pode editar o valor livremente para cada cliente.
                </p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Categoria</label>
              <select
                {...register("category")}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="Geral">Geral</option>
                <option value="Higienização">Higienização</option>
                <option value="Impermeabilização">Impermeabilização</option>
                <option value="Higienização + Impermeabilização">Higienização + Impermeabilização</option>
                <option value="Extras">Extras</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Descrição</label>
              <textarea
                {...register("description")}
                rows={3}
                placeholder="Descrição opcional do serviço..."
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            {/* Upload de imagem de referência */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4" /> Imagem de Referência
              </label>
              {imageUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-border">
                  <img src={imageUrl} alt="Referência" className="w-full h-40 object-cover" />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow"
                    title="Remover imagem"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
                >
                  {uploading ? (
                    <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  ) : (
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  )}
                  <p className="text-sm text-muted-foreground text-center">
                    {uploading ? "Enviando..." : "Clique para subir uma imagem de referência"}
                  </p>
                  <p className="text-xs text-muted-foreground">JPG, PNG ou WebP · máx. 5MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">Cancelar</Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending || uploading}
                className="flex-1 text-white"
                style={{ background: "linear-gradient(135deg, oklch(0.32 0.14 240), oklch(0.50 0.18 155))" }}
              >
                {editingService ? "Salvar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Categoria */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={(open) => { setIsCategoryDialogOpen(open); if (!open) { setEditingCategory(null); resetCategory(); setEmojiInput(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitCategory(onSubmitCategory)} className="space-y-4 mt-2">
            {/* Preview do chip */}
            <div className="flex justify-center">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-blue-300 bg-blue-50 text-blue-700 font-medium">
                <span className="text-xl">{emojiInput || "🔧"}</span>
                <span className="text-sm">{/* watch name */}</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Emoji</label>
              <Input
                value={emojiInput}
                onChange={(e) => setEmojiInput(e.target.value)}
                placeholder="Cole ou digite um emoji (ex: 🛋️)"
                className="text-center text-xl h-11"
                maxLength={4}
              />
              {/* Sugestões de emoji */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {EMOJI_SUGGESTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setEmojiInput(emoji)}
                    className={`text-xl w-9 h-9 rounded-lg border transition-all hover:scale-110 ${emojiInput === emoji ? "border-blue-400 bg-blue-50" : "border-border hover:border-blue-300"}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Nome da Categoria *</label>
              <Input
                {...registerCategory("name", { required: true })}
                placeholder="Ex: Sofá, Cadeira, Colchão..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCategoryDialogOpen(false)} className="flex-1">Cancelar</Button>
              <Button
                type="submit"
                disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                className="flex-1 text-white"
                style={{ background: "linear-gradient(135deg, oklch(0.32 0.14 240), oklch(0.50 0.18 155))" }}
              >
                {editingCategory ? "Salvar" : "Criar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
