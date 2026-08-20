import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Zap, X, Plus, FileText, PlayCircle, Waves, ShoppingCart,
  LayoutDashboard, Settings2, GripVertical, Check,
  Users, BarChart3, Car,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ─── Definição de todos os atalhos disponíveis ────────────────────────────────
export const ALL_SHORTCUTS = [
  { id: "novo-orcamento",  label: "Novo Orçamento",    icon: "Plus",          path: "/orcamentos/novo",   color: "#1A9FE3", roles: ["master","admin"] },
  { id: "orcamentos",      label: "Orçamentos",         icon: "FileText",      path: "/orcamentos",        color: "#6366F1", roles: ["master","admin"] },
  { id: "execucao",        label: "Execução",           icon: "PlayCircle",    path: "/execucao",          color: "#10B981", roles: ["master","admin","secretaria","funcionario","tecnico"] },
  { id: "tapetes",         label: "Tapetes",            icon: "Waves",         path: "/execucao/tapetes?new=true",  color: "#F59E0B", roles: ["master","admin","secretaria","funcionario","tecnico"] },
  { id: "vendas",          label: "Vendas",             icon: "ShoppingCart",  path: "/vendas",            color: "#EF4444", roles: ["master","admin"] },
  { id: "dashboard",       label: "Dashboard",          icon: "LayoutDashboard", path: "/dashboard",       color: "#8B5CF6", roles: ["master","admin"] },
  { id: "clientes",        label: "Clientes",           icon: "Users",         path: "/clientes",          color: "#06B6D4", roles: ["master","admin","secretaria"] },
  { id: "financeiro",      label: "Financeiro",         icon: "BarChart3",     path: "/financeiro",        color: "#84CC16", roles: ["master","admin"] },
  { id: "deslocamento",    label: "Deslocamento",       icon: "Car",           path: "/orcamentos/deslocamento", color: "#F97316", roles: ["master","admin"] },
];

const DEFAULT_ACTIVE = ["novo-orcamento", "execucao", "tapetes", "orcamentos", "vendas"];

const ICON_MAP: Record<string, any> = {
  Plus, FileText, PlayCircle, Waves, ShoppingCart,
  LayoutDashboard, Users, BarChart3, Car,
};

function ShortcutIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const Icon = ICON_MAP[name] ?? Zap;
  return <Icon className={className} style={style} />;
}

// ─── Hook: preferências salvas no localStorage ────────────────────────────────
function useShortcutPrefs(userId?: number) {
  const key = `fab_shortcuts_${userId ?? "guest"}`;
  const [activeIds, setActiveIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : DEFAULT_ACTIVE;
    } catch { return DEFAULT_ACTIVE; }
  });

  const save = (ids: string[]) => {
    setActiveIds(ids);
    localStorage.setItem(key, JSON.stringify(ids));
  };

  return { activeIds, save };
}

// ─── Modal de personalização ─────────────────────────────────────────────────
function CustomizeModal({
  activeIds, onSave, onClose, userRole,
}: {
  activeIds: string[];
  onSave: (ids: string[]) => void;
  onClose: () => void;
  userRole: string;
}) {
  const [order, setOrder] = useState<string[]>(activeIds);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const available = ALL_SHORTCUTS.filter(s => s.roles.includes(userRole));
  const inactive = available.filter(s => !order.includes(s.id));

  const toggle = (id: string) => {
    setOrder(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleDragStart = (id: string) => setDragging(id);
  const handleDragOver = (e: React.DragEvent, id: string) => { e.preventDefault(); setDragOver(id); };
  const handleDrop = (targetId: string) => {
    if (!dragging || dragging === targetId) { setDragging(null); setDragOver(null); return; }
    const newOrder = [...order];
    const fromIdx = newOrder.indexOf(dragging);
    const toIdx = newOrder.indexOf(targetId);
    if (fromIdx !== -1 && toIdx !== -1) {
      newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, dragging);
      setOrder(newOrder);
    }
    setDragging(null); setDragOver(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm border border-border max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Settings2 className="h-4 w-4" style={{ color: "#1A9FE3" }} />
              Personalizar Atalhos
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Arraste para reordenar • Toque para ativar/desativar</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Ativos ({order.length})</p>
            <div className="space-y-2">
              {order.map(id => {
                const s = ALL_SHORTCUTS.find(x => x.id === id);
                if (!s) return null;
                return (
                  <div key={id} draggable onDragStart={() => handleDragStart(id)} onDragOver={e => handleDragOver(e, id)} onDrop={() => handleDrop(id)} onDragEnd={() => { setDragging(null); setDragOver(null); }}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing select-none ${dragOver === id ? "border-blue-400 bg-blue-50/50" : "border-border bg-muted/20"} ${dragging === id ? "opacity-50" : ""}`}>
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: s.color + "20" }}>
                      <ShortcutIcon name={s.icon} className="h-4 w-4" style={{ color: s.color } as any} />
                    </div>
                    <span className="flex-1 text-sm font-medium text-foreground">{s.label}</span>
                    <button onClick={() => toggle(id)} className="h-6 w-6 rounded-full flex items-center justify-center shrink-0" style={{ background: "#1A9FE3" }}>
                      <Check className="h-3.5 w-3.5 text-white" />
                    </button>
                  </div>
                );
              })}
              {order.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum atalho ativo</p>}
            </div>
          </div>

          {inactive.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Disponíveis</p>
              <div className="space-y-2">
                {inactive.map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-border bg-muted/10 opacity-60">
                    <div className="h-4 w-4 shrink-0" />
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: s.color + "15" }}>
                      <ShortcutIcon name={s.icon} className="h-4 w-4" style={{ color: s.color } as any} />
                    </div>
                    <span className="flex-1 text-sm font-medium text-foreground">{s.label}</span>
                    <button onClick={() => toggle(s.id)} className="h-6 w-6 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center shrink-0 hover:border-blue-400 transition-colors">
                      <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-border sticky bottom-0 bg-card">
          <button onClick={() => { onSave(order); onClose(); toast.success("Atalhos salvos!"); }} className="w-full py-3 rounded-xl font-semibold text-white text-sm" style={{ background: "#1A9FE3" }}>
            Salvar Atalhos
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal FAB ─────────────────────────────────────────────────
export default function QuickAccessFAB() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  // Posição do FAB
  const FAB_SIZE = 56;
  const MARGIN = 16;
  const posKey = `fab_pos`;

  const getInitialPos = () => {
    try {
      const saved = localStorage.getItem(posKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { x: window.innerWidth - FAB_SIZE - MARGIN, y: window.innerHeight - FAB_SIZE - 80 };
  };

  const [pos, setPos] = useState<{ x: number; y: number }>(getInitialPos);

  // Refs para controle de drag
  const dragState = useRef<{
    dragging: boolean;
    moved: boolean;
    startTouchX: number;
    startTouchY: number;
    startFabX: number;
    startFabY: number;
  }>({ dragging: false, moved: false, startTouchX: 0, startTouchY: 0, startFabX: 0, startFabY: 0 });

  const clamp = (x: number, y: number) => ({
    x: Math.max(MARGIN, Math.min(x, window.innerWidth - FAB_SIZE - MARGIN)),
    y: Math.max(MARGIN, Math.min(y, window.innerHeight - FAB_SIZE - MARGIN)),
  });

  // ── Touch handlers ──────────────────────────────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    dragState.current = {
      dragging: true,
      moved: false,
      startTouchX: t.clientX,
      startTouchY: t.clientY,
      startFabX: pos.x,
      startFabY: pos.y,
    };
  }, [pos]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragState.current.dragging) return;
    const t = e.touches[0];
    const dx = t.clientX - dragState.current.startTouchX;
    const dy = t.clientY - dragState.current.startTouchY;
    // Só considera drag se moveu mais de 8px
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      dragState.current.moved = true;
      e.preventDefault();
      const newPos = clamp(dragState.current.startFabX + dx, dragState.current.startFabY + dy);
      setPos(newPos);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    dragState.current.dragging = false;
    if (dragState.current.moved) {
      // Foi drag: salva posição, NÃO abre menu
      setPos(prev => {
        localStorage.setItem(posKey, JSON.stringify(prev));
        return prev;
      });
    } else {
      // Foi tap: abre/fecha menu
      setOpen(prev => !prev);
    }
  }, [posKey]);

  // ── Fechar ao tocar fora ────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: TouchEvent | MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("touchstart", handler, { passive: true });
    document.addEventListener("mousedown", handler);
    return () => {
      document.removeEventListener("touchstart", handler);
      document.removeEventListener("mousedown", handler);
    };
  }, [open]);

  const { data: me } = trpc.auth.me.useQuery();
  const userRole = (me as any)?.role ?? "funcionario";
  const userId = (me as any)?.id;
  const { activeIds, save } = useShortcutPrefs(userId);

  const navigate = (path: string) => {
    setOpen(false);
    if (path.includes('?')) window.location.href = path;
    else setLocation(path);
  };

  const activeShortcuts = activeIds
    .map(id => ALL_SHORTCUTS.find(s => s.id === id))
    .filter(s => s && s.roles.includes(userRole)) as typeof ALL_SHORTCUTS;

  if (!me) return null;

  // Menu abre para cima se o FAB estiver na metade inferior da tela
  const openUpward = pos.y > window.innerHeight * 0.5;

  return (
    <>
      <div
        ref={fabRef}
        className="fixed z-[90]"
        style={{ left: pos.x, top: pos.y, touchAction: "none", userSelect: "none" }}
      >
        {/* Menu de atalhos */}
        {open && (
          <div
            className={`absolute flex flex-col items-end gap-2 right-0 ${openUpward ? "bottom-16" : "top-16"}`}
            style={{ minWidth: 200 }}
          >
            {/* Botão personalizar */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-full whitespace-nowrap shadow">
                Personalizar
              </span>
              <button
                onTouchEnd={(e) => { e.stopPropagation(); setOpen(false); setShowCustomize(true); }}
                onClick={() => { setOpen(false); setShowCustomize(true); }}
                className="h-11 w-11 rounded-full shadow-lg flex items-center justify-center border-2 border-white/20"
                style={{ background: "#374151" }}
              >
                <Settings2 className="h-5 w-5 text-white" />
              </button>
            </div>

            {/* Atalhos */}
            {activeShortcuts.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-full whitespace-nowrap shadow">
                  {s.label}
                </span>
                <button
                  onTouchEnd={(e) => { e.stopPropagation(); navigate(s.path); }}
                  onClick={() => navigate(s.path)}
                  className="h-12 w-12 rounded-full shadow-lg flex items-center justify-center border-2 border-white/20 active:scale-95"
                  style={{ background: s.color }}
                >
                  <ShortcutIcon name={s.icon} className="h-5 w-5 text-white" />
                </button>
              </div>
            ))}

            {activeShortcuts.length === 0 && (
              <span className="text-xs font-semibold text-white bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-full shadow">
                Nenhum atalho ativo
              </span>
            )}
          </div>
        )}

        {/* Botão principal */}
        <button
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={() => {
            // Desktop: toggle normal
            if (!dragState.current.moved) setOpen(prev => !prev);
            dragState.current.moved = false;
          }}
          className="h-14 w-14 rounded-full shadow-xl flex items-center justify-center border-2 border-white/20 active:scale-95"
          style={{
            background: open ? "#374151" : "#1A9FE3",
            boxShadow: open ? "0 4px 20px rgba(0,0,0,0.4)" : "0 4px 20px rgba(26,159,227,0.5)",
            cursor: "grab",
          }}
        >
          {open ? <X className="h-6 w-6 text-white" /> : <Zap className="h-6 w-6 text-white" />}
        </button>
      </div>

      {showCustomize && (
        <CustomizeModal
          activeIds={activeIds}
          onSave={save}
          onClose={() => setShowCustomize(false)}
          userRole={userRole}
        />
      )}
    </>
  );
}
