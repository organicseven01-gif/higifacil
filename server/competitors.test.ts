import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do módulo db para isolar os testes
vi.mock("./db", () => ({
  getCompetitors: vi.fn(),
  getCompetitorById: vi.fn(),
  createCompetitor: vi.fn(),
  updateCompetitor: vi.fn(),
  deleteCompetitor: vi.fn(),
}));

import {
  getCompetitors,
  getCompetitorById,
  createCompetitor,
  updateCompetitor,
  deleteCompetitor,
} from "./db";

const mockCompetitor = {
  id: 1,
  name: "Higienização Silva",
  services: "Sofás, cadeiras, colchões",
  priceRange: "R$ 80 a R$ 200",
  instagramUrl: "https://instagram.com/higsilva",
  googleUrl: "https://maps.google.com/...",
  googleReviews: 45,
  googleRating: "4.8",
  notes: "Forte presença local",
  lastUpdatedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Competitors DB helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getCompetitors retorna lista de concorrentes", async () => {
    vi.mocked(getCompetitors).mockResolvedValue([mockCompetitor]);
    const result = await getCompetitors();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Higienização Silva");
  });

  it("getCompetitorById retorna concorrente pelo id", async () => {
    vi.mocked(getCompetitorById).mockResolvedValue(mockCompetitor);
    const result = await getCompetitorById(1);
    expect(result).not.toBeNull();
    expect(result?.id).toBe(1);
  });

  it("getCompetitorById retorna null quando não encontrado", async () => {
    vi.mocked(getCompetitorById).mockResolvedValue(null);
    const result = await getCompetitorById(999);
    expect(result).toBeNull();
  });

  it("createCompetitor cria novo concorrente", async () => {
    vi.mocked(createCompetitor).mockResolvedValue(undefined);
    await expect(createCompetitor({
      name: "Nova Empresa",
      services: "Limpeza geral",
      priceRange: "R$ 100",
      instagramUrl: null,
      googleUrl: null,
      googleReviews: 0,
      googleRating: null,
      notes: null,
      lastUpdatedAt: new Date(),
    })).resolves.not.toThrow();
    expect(createCompetitor).toHaveBeenCalledOnce();
  });

  it("updateCompetitor atualiza dados do concorrente", async () => {
    vi.mocked(updateCompetitor).mockResolvedValue(undefined);
    await expect(updateCompetitor(1, { googleReviews: 50, googleRating: "4.9" })).resolves.not.toThrow();
    expect(updateCompetitor).toHaveBeenCalledWith(1, { googleReviews: 50, googleRating: "4.9" });
  });

  it("deleteCompetitor remove concorrente", async () => {
    vi.mocked(deleteCompetitor).mockResolvedValue(undefined);
    await expect(deleteCompetitor(1)).resolves.not.toThrow();
    expect(deleteCompetitor).toHaveBeenCalledWith(1);
  });

  it("getCompetitors retorna lista vazia quando não há concorrentes", async () => {
    vi.mocked(getCompetitors).mockResolvedValue([]);
    const result = await getCompetitors();
    expect(result).toHaveLength(0);
  });
});
