import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { rawExecute } from "./db";
import { notifyOwner } from "./_core/notification";

// ─── helpers ────────────────────────────────────────────────────────────────

async function getBookedSlots(date: string): Promise<string[]> {
  const [rows] = await rawExecute(
    `SELECT scheduled_time FROM demo_bookings
     WHERE scheduled_date = ? AND status NOT IN ('cancelled')`,
    [date]
  );
  return (rows as any[]).map((r: any) => r.scheduled_time);
}

async function listBookings(filters: { status?: string; dateFrom?: string; dateTo?: string }) {
  let sql = `SELECT * FROM demo_bookings WHERE 1=1`;
  const params: any[] = [];
  if (filters.status && filters.status !== "all") {
    sql += ` AND status = ?`;
    params.push(filters.status);
  }
  if (filters.dateFrom) {
    sql += ` AND scheduled_date >= ?`;
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    sql += ` AND scheduled_date <= ?`;
    params.push(filters.dateTo);
  }
  sql += ` ORDER BY scheduled_date ASC, scheduled_time ASC`;
  const [rows] = await rawExecute(sql, params);
  return rows as any[];
}

// ─── router ─────────────────────────────────────────────────────────────────

export const demoBookingsRouter = router({
  // Slots disponíveis para uma data (público)
  availableSlots: publicProcedure
    .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .query(async ({ input }) => {
      // Gera slots das 9h às 21h de hora em hora
      const allSlots = Array.from({ length: 13 }, (_, i) => {
        const h = 9 + i;
        return `${String(h).padStart(2, "0")}:00`;
      });
      const booked = await getBookedSlots(input.date);
      return allSlots.map((slot) => ({
        time: slot,
        available: !booked.includes(slot),
      }));
    }),

  // Criar agendamento (público)
  book: publicProcedure
    .input(
      z.object({
        name: z.string().min(2).max(255),
        whatsapp: z.string().min(8).max(30),
        city: z.string().min(2).max(100),
        scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        scheduledTime: z.string().regex(/^\d{2}:\d{2}$/),
      })
    )
    .mutation(async ({ input }) => {
      // Verificar se o slot ainda está disponível
      const booked = await getBookedSlots(input.scheduledDate);
      if (booked.includes(input.scheduledTime)) {
        throw new Error("Este horário já foi reservado. Por favor, escolha outro.");
      }

      const now = Date.now();
      await rawExecute(
        `INSERT INTO demo_bookings (name, whatsapp, city, scheduled_date, scheduled_time, status, created_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
        [input.name, input.whatsapp, input.city, input.scheduledDate, input.scheduledTime, now]
      );

      // Formatar data para notificação
      const [y, m, d] = input.scheduledDate.split("-");
      const dateFormatted = `${d}/${m}/${y}`;

      // Notificar dono
      await notifyOwner({
        title: "Nova demonstração agendada!",
        content: `${input.name} de ${input.city} agendou uma demo para ${dateFormatted} às ${input.scheduledTime}. WhatsApp: ${input.whatsapp}`,
      });

      return { success: true };
    }),

  // Listar agendamentos (admin)
  list: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return listBookings(input ?? {});
    }),

  // Métricas (admin)
  metrics: protectedProcedure.query(async () => {
    const today = new Date().toISOString().split("T")[0];
    const weekStart = (() => {
      const d = new Date();
      const day = d.getDay();
      d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
      return d.toISOString().split("T")[0];
    })();
    const weekEnd = (() => {
      const d = new Date();
      const day = d.getDay();
      d.setDate(d.getDate() + (day === 0 ? 0 : 7 - day));
      return d.toISOString().split("T")[0];
    })();

    const [[totalRows], [todayRows], [weekRows], [pendingRows]] = await Promise.all([
      rawExecute(`SELECT COUNT(*) as c FROM demo_bookings WHERE status != 'cancelled'`, []),
      rawExecute(`SELECT COUNT(*) as c FROM demo_bookings WHERE scheduled_date = ? AND status != 'cancelled'`, [today]),
      rawExecute(`SELECT COUNT(*) as c FROM demo_bookings WHERE scheduled_date BETWEEN ? AND ? AND status != 'cancelled'`, [weekStart, weekEnd]),
      rawExecute(`SELECT COUNT(*) as c FROM demo_bookings WHERE status = 'pending'`, []),
    ]);

    return {
      total: (totalRows as any[])[0]?.c ?? 0,
      today: (todayRows as any[])[0]?.c ?? 0,
      thisWeek: (weekRows as any[])[0]?.c ?? 0,
      pending: (pendingRows as any[])[0]?.c ?? 0,
    };
  }),

  // Atualizar status (admin)
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "done", "no_show", "cancelled"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await rawExecute(
        `UPDATE demo_bookings SET status = ?, notes = COALESCE(?, notes) WHERE id = ?`,
        [input.status, input.notes ?? null, input.id]
      );
      return { success: true };
    }),

  // Excluir (admin)
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await rawExecute(`DELETE FROM demo_bookings WHERE id = ?`, [input.id]);
      return { success: true };
    }),
});
