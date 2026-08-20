/**
 * Gera um link para criar um evento no Google Agenda com os dados do agendamento.
 * O link abre em nova aba e o usuário só precisa clicar em "Salvar" no Google.
 */
export interface GoogleCalendarEventParams {
  clientName: string;
  clientPhone?: string;
  scheduledDate: string;       // "YYYY-MM-DD"
  scheduledTime?: string;      // "HH:MM"
  serviceDescription?: string; // ex: "Higienização Sofá 3 Lugares"
  address?: string;            // endereço completo
  assignedTo?: string;         // nome do técnico
  notes?: string;
  totalValue?: string;         // ex: "R$ 250,00"
}

export function buildGoogleCalendarUrl(params: GoogleCalendarEventParams): string {
  const {
    clientName,
    clientPhone,
    scheduledDate,
    scheduledTime,
    serviceDescription,
    address,
    assignedTo,
    notes,
    totalValue,
  } = params;

  // Título do evento
  const serviceLabel = serviceDescription?.trim() || "Serviço";
  const title = `${serviceLabel} — ${clientName}`;

  // Montar data/hora no formato YYYYMMDD ou YYYYMMDDTHHmmss
  const datePart = scheduledDate.replace(/-/g, ""); // "20250604"
  let startDt: string;
  let endDt: string;

  if (scheduledTime && /^\d{2}:\d{2}$/.test(scheduledTime)) {
    const [h, m] = scheduledTime.split(":").map(Number);
    // Duração padrão: 2 horas
    const endH = String(h + 2).padStart(2, "0");
    const timePart = `${String(h).padStart(2, "0")}${String(m).padStart(2, "0")}00`;
    const endTimePart = `${endH}${String(m).padStart(2, "0")}00`;
    startDt = `${datePart}T${timePart}`;
    endDt = `${datePart}T${endTimePart}`;
  } else {
    // Evento de dia inteiro
    startDt = datePart;
    endDt = datePart;
  }

  // Descrição do evento
  const descLines: string[] = [];
  if (clientPhone) descLines.push(`📞 ${clientPhone}`);
  if (serviceDescription) descLines.push(`🛠️ ${serviceDescription}`);
  if (totalValue) descLines.push(`💰 ${totalValue}`);
  if (assignedTo) descLines.push(`👤 Técnico: ${assignedTo}`);
  if (notes) descLines.push(`📝 ${notes}`);
  descLines.push("— Higifácil");
  const description = descLines.join("\n");

  const params2 = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${startDt}/${endDt}`,
    details: description,
    ...(address ? { location: address } : {}),
  });

  return `https://calendar.google.com/calendar/r/eventedit?${params2.toString()}`;
}

/**
 * Monta o endereço completo a partir dos campos separados
 */
export function buildAddress(fields: {
  street?: string | null;
  addressNumber?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
}): string {
  const parts: string[] = [];
  if (fields.street) parts.push(fields.street);
  if (fields.addressNumber) parts.push(fields.addressNumber);
  if (fields.complement) parts.push(fields.complement);
  if (fields.neighborhood) parts.push(fields.neighborhood);
  if (fields.city) {
    parts.push(fields.state ? `${fields.city} - ${fields.state}` : fields.city);
  }
  return parts.join(", ");
}
