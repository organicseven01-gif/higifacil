import DashboardLayout from "@/components/DashboardLayout";
import CalculadoraDeslocamento from "@/components/CalculadoraDeslocamento";

export default function Deslocamento() {
  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Cálculo de Deslocamento</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Calcule o custo de deslocamento até o cliente para incluir no orçamento.
          </p>
        </div>
        <CalculadoraDeslocamento onResult={() => {}} />
      </div>
    </DashboardLayout>
  );
}
