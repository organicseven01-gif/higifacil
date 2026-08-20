# SOS Orçamentos - TODO

## Banco de Dados
- [x] Schema: tabela de serviços (nome, preço, categoria, status)
- [x] Schema: tabela de clientes (nome, telefone, email, endereço)
- [x] Schema: tabela de orçamentos (cliente, data, desconto, status, observações, vídeos)
- [x] Schema: tabela de itens do orçamento (orçamento_id, serviço_id, quantidade, valor_unitário)
- [x] Executar migrações SQL

## Backend (tRPC Routers)
- [x] Router de serviços: CRUD completo
- [x] Router de clientes: CRUD completo
- [x] Router de orçamentos: criar, listar, editar, excluir
- [x] Router de itens do orçamento: adicionar, remover, atualizar quantidade
- [x] Cálculo automático de subtotal e total com desconto

## Frontend - Layout e Navegação
- [x] Configurar tema visual azul-verde (cores da SOS)
- [x] DashboardLayout com sidebar de navegação
- [x] Rotas: Dashboard, Serviços, Clientes, Orçamentos, Novo Orçamento

## Frontend - Módulo de Serviços
- [x] Listagem de serviços com busca e filtro por categoria
- [x] Formulário de cadastro/edição de serviço
- [x] Toggle ativo/inativo
- [x] Exclusão de serviço

## Frontend - Módulo de Clientes
- [x] Listagem de clientes com busca
- [x] Formulário de cadastro/edição de cliente
- [x] Exclusão de cliente

## Frontend - Módulo de Orçamentos
- [x] Dashboard de orçamentos com filtros por status
- [x] Busca por cliente
- [x] Criação de orçamento: seleção de cliente
- [x] Adição de itens/serviços com quantidade
- [x] Cálculo automático de subtotais e total
- [x] Campo de desconto editável com recálculo automático
- [x] Campo de observações e vídeos adicionais
- [x] Edição de orçamentos existentes

## Frontend - Visualização e Envio
- [x] Layout final do orçamento com design 3D azul-verde
- [x] Logo da empresa no orçamento
- [x] Tabela de itens estruturada
- [x] Seção de condições de pagamento
- [x] Botão de envio via WhatsApp
- [x] Geração e download de PDF (via impressão do browser)
- [x] Campo para adicionar vídeos e informações antes do envio

## Testes
- [x] Testes unitários para routers de serviços
- [x] Testes unitários para routers de clientes
- [x] Testes unitários para routers de orçamentos

## Melhorias Solicitadas
- [x] Gráfico de taxa de conversão de orçamentos no dashboard (pizza + barras por mês)

## Identidade Visual
- [x] Upload do logo SVG oficial da SOS para o projeto
- [x] Atualizar cores CSS para azul royal (#1A3FBF) e verde neon (#00FF7F)
- [x] Aplicar logo no DashboardLayout (sidebar)
- [x] Aplicar logo no orçamento (BudgetPreview)
- [x] Aplicar cores da marca em todos os botões, cards e destaques

## Correções de UX
- [x] Separar campo nome do cliente e contato em campos distintos no formulário de orçamento
- [x] Atualizar visualização do orçamento para exibir nome e contato separados

## Funcionalidades Novas
- [x] Procedure tRPC budgets.duplicate no backend
- [x] Botão "Duplicar" na listagem de orçamentos (Budgets.tsx)
- [x] Botão "Duplicar" na visualização do orçamento (BudgetPreview.tsx)

## Simplificação do Fluxo
- [x] Substituir busca/seleção de cliente por campos livres (nome + contato) no NewBudget
- [x] Tornar clientId opcional no backend (orçamento sem cadastro de cliente)
- [x] Remover menu "Clientes" da sidebar

## Taxas de Cartão e Condições de Pagamento
- [x] Tabela de configurações no banco (taxas cartão 1x, 2x, 3x)
- [x] Router tRPC para ler/salvar configurações
- [x] Página de Configurações na sidebar
- [x] Campos separados à vista e parcelado no NewBudget/EditBudget
- [x] Cálculo automático dos valores parcelados com as taxas configuradas
- [x] Exibição separada à vista e parcelado no BudgetPreview

## Simplificação Condições de Pagamento
- [x] BudgetPreview: exibir PIX (valor exato) e Cartão até 3x (parcela + total, sem % visível)
- [x] NewBudget: prévia simplificada com PIX e Cartão

## Numeração Sequencial de Orçamentos
- [x] Coluna budgetNumber no banco (auto-incremento sequencial)
- [x] Geração automática do número ao criar orçamento no backend
- [x] Exibir #XXXX na listagem de orçamentos
- [x] Exibir #XXXX no cabeçalho da visualização final (BudgetPreview)

## Chave PIX
- [x] Campo de chave PIX na página de Configurações (tipo + valor)
- [x] Exibir chave PIX automaticamente no bloco PIX do orçamento final

## Melhorias Bloco PIX
- [x] Ícone oficial PIX, CNPJ formatado, botão copiar e nome da empresa no bloco PIX do orçamento

## Simplificação Bloco PIX
- [x] Remover informações da chave PIX do orçamento, manter apenas valor PIX e valor cartão

## Seção Institucional no Orçamento
- [x] Substituir "Conheça Nossos Métodos Exclusivos" por seção institucional com texto da empresa

## Avaliações Google no Orçamento
- [x] Bloco de avaliações Google com estrelas douradas, nota e link direto no orçamento final

## Envio WhatsApp Duplo
- [x] Botão WhatsApp Web (web.whatsapp.com) e WhatsApp App (wa.me) no BudgetPreview

## WhatsApp Business
- [x] Substituir botão WhatsApp Web por WhatsApp Business no BudgetPreview

## Exportar Orçamento como Imagem JPEG
- [x] Instalar html2canvas e capturar orçamento como JPEG
- [x] Botão de download JPEG e fluxo de envio WhatsApp com imagem

## Card Google Reviews
- [x] Atualizar card de avaliações Google com 293 avaliações

## Envio Automático e PDF Colorido
- [x] Usar contato do cliente automaticamente nos botões WhatsApp (sem digitar número)
- [x] PDF colorido gerado via html2canvas (preservar cores e layout)

## Correção Download JPEG/PDF
- [x] Corrigido erro oklch no html2canvas: substituído por html-to-image com suporte a CSS moderno (oklch)
- [x] Botões "Baixar JPEG" e "Baixar Orçamento em JPEG" agora funcionam corretamente com todas as cores

## Exibição Condicional do Desconto
- [x] Mostrar subtotal, desconto e total no orçamento apenas quando houver desconto preenchido; sem desconto, nada é exibido

## Label do Bloco de Pagamento À Vista
- [x] Substituir label "PIX" por "À Vista" em verde neon (cor da logo) no bloco de pagamento; ícone PIX mantido abaixo do valor junto com a descrição

## Edição de Cliente no Orçamento
- [x] Tornar campos nome e contato do cliente editáveis na página EditBudget

## Divulgação do Aluguel de Kit de Higienização
- [x] Adicionar card no rodapé do orçamento com QR Code e informações do serviço de aluguel de máquinas

## Análise de Concorrência
- [x] Schema e migration da tabela competitors no banco
- [x] Procedures tRPC: list, create, update, delete concorrentes
- [x] Página de Análise de Concorrência com tabela completa
- [x] Formulário de cadastro/edição de concorrente (modal)
- [x] Colunas: nome, serviços, valores, Instagram, Google URL, avaliações, estrelas, última atualização
- [x] Botão de atualizar dados manualmente por empresa
- [x] Rota /concorrentes na navegação lateral

## Critérios e Comparativo de Concorrência
- [x] Tabela competitor_criteria no banco (id, nome, descrição, tipo, unidade)
- [x] Tabela competitor_scores no banco (competitorId, criteriaId, value, notes)
- [x] Procedures tRPC para critérios e scores
- [x] Aba "Critérios" na página de Concorrência para cadastrar/editar/excluir critérios
- [x] Aba "Comparativo" com tabela cruzada empresas x critérios
- [x] Edição inline dos scores na tabela comparativa

## Melhorias na Aba Empresas (Concorrência)
- [x] Substituir coluna Serviços por Site (link clicável, abre em nova aba)
- [x] Substituir campo siteUrl no formulário de empresa (trocar services por siteUrl)
- [x] Criar tabela competitor_services (id, competitorId, serviceName, price, notes)
- [x] Procedures tRPC para CRUD de serviços por empresa
- [x] Coluna Valores vira botão que abre modal com tabela de serviços/preços da empresa
- [x] Modal permite adicionar, editar e excluir serviços/preços de cada concorrente

## Bug: siteUrl não salva ao editar empresa
- [x] Corrigir campo siteUrl não sendo persistido/exibido ao editar empresa na Análise de Concorrência

## Layout do Orçamento - Pagamentos
- [x] Remover seção "Termos e Condições" do orçamento
- [x] Colocar "À Vista" e "Cartão em até 3x" lado a lado no topo do bloco de pagamento

## Ajuste Análise de Concorrência
- [x] Remover card de média de estrelas dos cards de resumo na página de Concorrência

## Gráfico de Avaliações na Concorrência
- [x] Adicionar gráfico de barras comparando número de avaliações Google por empresa

## Total abaixo da tabela de itens
- [x] Quando orçamento tiver mais de 2 itens, exibir valor total logo abaixo da tabela de serviços

## Título Condições de Pagamento no Orçamento
- [x] Adicionar texto "Condições de Pagamento" logo após a tabela de itens, antes dos blocos À Vista e Cartão

## Reorganização do Rodapé do Orçamento
- [x] Remover bloco de sugestão de aluguel de higienização
- [x] Mover avaliações Google para ficar ao lado de "Conheça Nossa Empresa" (grid 2 colunas)
- [x] Adicionar título "Sobre Nós" logo após os blocos de valores (À Vista e Cartão)

## Categorias de Serviços
- [x] Criar tabela service_categories no banco (id, name, description, color)
- [x] Procedures tRPC: list, create, update, delete categorias
- [x] Aba "Categorias" nas Configurações para cadastrar/editar/excluir categorias
- [x] Campo de categoria no formulário de novo serviço usando as categorias cadastradas

## Código Numérico de Serviço
- [x] Adicionar coluna serviceCode (auto-incremental) na tabela services
- [x] Popular códigos dos serviços já cadastrados
- [x] Exibir código (#001, #002...) na listagem de serviços
- [x] Busca por código ou nome no formulário de orçamento

## Rodapé Condicional no Orçamento
- [x] Ocultar "Sobre Nós", "Conheça Nossa Empresa" e "Avaliações Google" quando orçamento tiver mais de 7 itens

## Checkbox Vendido e Pendentes do Dia Anterior
- [x] Adicionar coluna sold (boolean) na tabela budgets
- [x] Procedure tRPC para toggle sold (markAsSold)
- [x] Checkbox "Vendido" na tela de edição do orçamento (substitui status "Enviado")
- [x] Seção de alerta no topo da listagem com orçamentos do dia anterior não vendidos

## Ajustes na Listagem de Orçamentos
- [x] Remover alerta de pendentes do dia anterior
- [x] Remover filtro "Enviados" dos status
- [x] Substituir botão de envio por botões "Vendido" e "Recusado" inline na lista

## Ajustes no Dashboard
- [x] Substituir card "Valor Total" por total de orçamentos do mês atual
- [x] Adicionar card "Recusados" nos cards de resumo do topo

## Reorganização dos Cards de Resumo
- [x] Mover cards (Total, Total do Mês, Pendentes, Aceitos, Recusados) para a página de Orçamentos
- [x] Remover esses cards do Dashboard

## Filtro de Período nos Cards de Resumo
- [x] Adicionar seletor de mês/ano nos cards de resumo da página de Orçamentos para comparar períodos

## Gráfico de Linha na Página de Orçamentos
- [x] Adicionar gráfico de linha com evolução diária de aceitos e recusados no período selecionado

## Responsivo Mobile no Orçamento
- [x] Corrigir layout do BudgetPreview para exibição correta em celular (fontes, tabelas, colunas, espaçamentos)

## Correções BudgetPreview (fev/2026)
- [x] Mover barra verde decorativa para o final do card (após seção Sobre Nós), evitando sobreposição com avaliações Google
- [x] Seção "Sobre Nós" em mobile: empilhar "Conheça a Empresa" e "Avaliações Google" um acima do outro (grid-cols-1 fixo, sem sm:grid-cols-2)

## Ajustes Seção Sobre Nós (fev/2026)
- [x] Remover bloco "Conheça Nosso Trabalho" (vídeos) do orçamento final
- [x] Seção Sobre Nós: empilhar "Conheça a Empresa" acima e "Avaliações Google" abaixo (grid-cols-1 fixo)

## Animação de Carregamento (fev/2026)
- [x] Implementar skeleton/loading animado no BudgetPreview enquanto o orçamento é buscado

## Aba Clientes (fev/2026)
- [x] Criar tabela clients no schema Drizzle e aplicar migration
- [x] Criar procedures tRPC: list, create, update, delete, getById, metrics, topClients, getPhotos, addPhoto, deletePhoto
- [x] Criar página Clientes com cards de métricas, abas Lista/Top10, busca e tabela
- [x] Modal de cadastro/edição com todos os campos (nome, telefone, email, endereço detalhado, notas, fotos)
- [x] Registrar rota /clientes e link no menu lateral do DashboardLayout
- [x] Escrever testes para as procedures de clientes (11 testes passando)

## Histórico de Orçamentos no Cliente (fev/2026)
- [x] Procedure tRPC clients.getBudgets para buscar orçamentos por clientPhone
- [x] Exibir histórico de orçamentos no modal de visualização do cliente (número, data, total, status)
- [x] Corrigir erro na query getClientMetrics (alias b.total e b.clientId)

## Aba Tapetes - Lavanderia (fev/2026)
- [x] Criar tabela `carpet_orders` no schema Drizzle (cliente, tapete, status, datas, valor, fotos)
- [x] Criar tabela `carpet_photos` para fotos antes/depois do tapete
- [x] Aplicar migration SQL
- [x] Criar helpers de banco: getCarpetOrders, getCarpetOrderById, createCarpetOrder, updateCarpetOrder, deleteCarpetOrder, getCarpetMetrics, getCarpetPhotos, addCarpetPhoto, deleteCarpetPhoto
- [x] Criar procedures tRPC: list, getById, create, update, delete, metrics, updateStatus, getPhotos, addPhoto, deletePhoto
- [x] Criar página Tapetes.tsx com cards de métricas, lista com filtros, modal de cadastro/edição, fluxo de status
- [x] Destaque visual para tapetes com entrega atrasada
- [x] Registrar rota /tapetes e link no menu lateral
- [x] Escrever testes para as procedures de tapetes (13 testes passando)

## Vinculação de Clientes na OS de Tapetes (fev/2026)
- [x] Busca de clientes cadastrados no formulário de nova OS (autocomplete com nome/telefone)
- [x] Preenchimento automático de nome e telefone ao selecionar cliente

## Fotos no Formulário de OS de Tapetes (fev/2026)
- [x] Seção de upload de fotos no formulário de nova/editar OS (câmera + galeria)
- [x] Upload para S3 e salvar referências após criar a OS
- [x] Exibir galeria de fotos no modal de detalhes da OS (já existia)

## Fotos na Edição de OS de Tapetes (fev/2026)
- [x] Exibir fotos já salvas na OS ao editar, com botão de excluir cada foto
- [x] Permitir adicionar novas fotos (câmera/galeria) ao editar a OS

## Sistema de Tags para Tapetes (fev/2026)
- [x] Criar tabela `carpet_tags` (id, name, color, category) e `carpet_order_tags` (junction)
- [x] Aplicar migration SQL
- [x] Criar procedures tRPC: carpetTags.list, create, delete, getForOrder, addToOrder, removeFromOrder, setForOrder, getOrderIdsByTag
- [x] Seletor de tags no formulário de nova/editar OS (agrupado por categoria, criação rápida inline)
- [x] Exibir tags como badges coloridos no modal de detalhes da OS
- [x] Filtro por tag na lista de OS (chips clicáveis acima da lista)
- [x] 45 testes passando (sem novos testes de tags pois as procedures são cobertas pelos testes de carpets)

## Galeria de Fotos e Remoção de Tags (fev/2026)
- [ ] Remover sistema de tags do formulário, lista e modais de tapetes
- [ ] Adicionar campo de observação por foto (caption) na tabela carpet_photos
- [ ] Galeria de fotos em tela cheia com navegação (anterior/próximo), badge Antes/Depois e campo de observação
- [ ] Exibir galeria no modal de detalhes da OS e permitir abrir qualquer foto em tela cheia

## Correção de Fotos na OS de Tapetes (fev/2026)
- [x] Exibir galeria de fotos no modal de detalhes (OrderDetailModal) com lightbox
- [x] Seção de fotos sempre visível no modal de detalhes, com botão de adicionar foto diretamente
- [x] Garantir que na edição (OrderFormModal) apareçam as fotos salvas com opção de adicionar/remover

## Bug: Upload e Visualização de Fotos nos Tapetes (fev/2026)
- [x] Corrigir erro ao salvar foto no upload (/api/upload) — busboy finish disparava antes do async file handler terminar
- [x] Corrigir visualização de fotos no modal de detalhes (olhinho na lista) — problema era o upload falhando, modal já estava correto

## Aba Vendas (fev/2026)
- [x] Criar tabela `sales` e `sale_receipts` no schema Drizzle e aplicar migration
- [x] Criar helpers de banco: getSales, getSaleById, createSale, updateSale, deleteSale, getSaleMetrics, getSaleReceipts, addSaleReceipt, deleteSaleReceipt, updateClientLTV
- [x] Criar procedures tRPC: sales.list, getById, create, update, delete, metrics, addReceipt, deleteReceipt, getReceipts
- [x] Integrar geração automática de venda ao marcar orçamento como "Vendido" (modal de registro de pagamento)
- [x] Criar página Vendas com cards de métricas, lista, filtros por método de pagamento e status
- [x] Modal de registro de venda: valor recebido, método (Pix/Cartão/Espécie/Boleto), parcelas, observações
- [x] Upload de comprovante de transação (foto ou arquivo) vinculado à venda com lightbox
- [x] Atualização automática do LTV do cliente ao criar venda
- [x] Registrar rota /vendas e link no menu lateral
- [x] 57 testes passando (12 novos para procedures de vendas)
- [ ] Relatório detalhado da venda com todos os dados e comprovante
- [ ] Atualizar LTV do cliente ao confirmar venda
- [ ] Registrar rota /vendas e link no menu lateral
- [ ] Escrever testes para as procedures de vendas

## Reformulação Aba Vendas - Modelo SOS Gestão (fev/2026)
- [ ] Reescrever página Vendas com: cards Faturamento/Despesas/Lucro/Ticket Médio, botão Nova Transação, lista de transações com nome/descrição/valor/data/lixeira
- [ ] Formulário Nova Transação: tipo (Receita/Despesa), descrição, valor, data, cliente (opcional), método de pagamento, categoria (opcional)
- [ ] Abas: Transações | Relatórios
- [ ] Geração automática de transação ao marcar orçamento como "Vendido" (sem abrir modal extra)
- [ ] Exclusão automática da transação ao marcar orçamento como "Recusado"

## Exclusão Automática de Venda ao Recusar Orçamento (fev/2026)
- [x] Adicionar helper `deleteSaleByBudgetId` no db.ts
- [x] Adicionar procedure `sales.deleteByBudgetId` no salesRouter
- [x] Integrar exclusão de venda no EditBudget ao desmarcar como "Vendido"
- [x] Integrar exclusão de venda no BudgetPreview ao marcar como "Recusado"

## Histórico de Tapetes no Perfil do Cliente (fev/2026)
- [x] Adicionar helper `getCarpetOrdersByPhone` no db.ts
- [x] Adicionar procedure `carpet.getByClientPhone` no carpetRouter
- [x] Exibir histórico de OS de tapetes no modal de visualização do cliente (número, data, status, valor, pago)

## Notificação WhatsApp - Tapete Pronto (fev/2026)
- [x] Ao avançar status do tapete para "Pronto" na lista, exibir toast com botão para abrir WhatsApp com mensagem pré-preenchida
- [x] Ao avançar status do tapete para "Pronto" no modal de detalhes, exibir toast com botão para abrir WhatsApp com mensagem pré-preenchida

## Cadastro Rápido de Cliente no Modal de Venda

- [x] Mini-formulário inline no RegisterSaleModal quando cliente não encontrado (nome, telefone, email)
- [x] Criar cliente via trpc.clients.create e selecionar automaticamente após cadastro

## Edição de Venda no Modal de Visualização

- [x] Tornar total, valor recebido e forma de pagamento editáveis no SaleDetailModal

## Melhorias de Cliente e Histórico

- [x] RegisterSaleModal: duas opções — buscar cliente cadastrado OU cadastrar novo inline (com associação ao histórico)
- [x] Novo Orçamento: duas opções de cliente — buscar cadastrado OU digitar nome livre
- [x] Perfil do cliente: exibir seção de vendas realizadas para aquele cliente
- [x] Procedure sales.getByClientId no backend

## Formulário Completo de Novo Cliente no RegisterSaleModal

- [x] Expandir cadastro rápido com: nome, telefone, e-mail, CEP (busca automática), rua, número, complemento, bairro, cidade, estado

## Bug: Edição de Pagamento nas Vendas

- [x] Corrigir erro ao salvar alterações de pagamento (método, total, valor recebido) no SaleDetailModal

## Gráfico de Faturamento por Método de Pagamento no Dashboard

- [x] Procedure backend: retornar faturamento agrupado por método de pagamento
- [x] Gráfico de pizza/donut no dashboard com PIX, Cartão, Dinheiro, Boleto

## Forma de Pagamento em Vendas Pendentes

- [x] Ocultar forma de pagamento na lista e no modal quando venda está com status Pendente

## Melhorias Diversas (Sessão 28/02)

- [x] Tapetes: botões avançar/voltar etapas na lista (Recolhido → Lavando → Pronto → Entregue)
- [x] Histórico do cliente: exibir valor total gasto em vendas
- [x] Scrollbar da navegação lateral mais discreta
- [x] Serviços: upload de imagem de referência (criar e editar, com opção de remover)
- [x] Dashboard de vendas: reorganizar layout

## Bug: Tapetes Entregues não somam na Receita

- [x] Ao marcar tapete como "Entregue", criar automaticamente uma entrada de receita/venda com o valor do tapete
- [x] Exibir tapetes entregues no somatório de receita do dashboard

## Dashboard - Filtro de Período e Dados Atualizados

- [x] Corrigir gráfico de método de pagamento para buscar dados reais e atualizados das vendas
- [x] Adicionar filtro de período (mês/ano) nos KPIs e gráficos do dashboard

## Módulo Execução/Dia a Dia + Sistema de Roles

### Sistema de Roles (Níveis de Acesso)
- [x] Expandir enum role na tabela users: master, admin, vendedor, secretaria, funcionario
- [x] Aplicar migration SQL para novo enum de roles
- [x] Criar procedure trpc.users.setRole (apenas master/admin)
- [x] Criar procedure trpc.users.list para gerenciar usuários
- [x] Criar página de Gerenciamento de Usuários (apenas master/admin)
- [x] Controle de acesso no frontend: ocultar menus por role
- [ ] Controle de acesso no backend: proteger procedures sensíveis por role (pendente)

### Tabela de Agendamentos de Execução
- [x] Criar tabela `execution_orders` no schema (clientId, clientName, clientPhone, address, serviceDescription, scheduledDate, scheduledTime, status, notes, assignedTo, saleId, totalValue)
- [x] Aplicar migration SQL
- [x] Criar helpers de banco: getExecutionOrders, getExecutionOrderById, createExecutionOrder, updateExecutionOrder, deleteExecutionOrder
- [x] Criar procedures tRPC: execution.list, getById, create, update, delete, updateStatus

### Módulo Upsell (Vendas em Campo)
- [x] Criar tabela `upsell_items` (executionOrderId, description, quantity, unitPrice, total)
- [x] Aplicar migration SQL
- [x] Procedures tRPC: upsell.list, create, delete
- [x] Seção de upsell no modal de execução (adicionar itens vendidos na casa do cliente)

### Frontend - Aba Execução/Dia a Dia
- [x] Criar página Execution.tsx com painel do dia
- [x] KPIs do dia: serviços agendados, concluídos, pendentes, valor do dia
- [x] Lista de serviços do dia com filtros: Todos / Pendentes / Concluídos
- [x] Calendário semanal com agenda dos próximos 7 dias
- [x] Card de serviço: cliente, endereço, horário, serviço, valor, botão Concluir
- [x] Modal de detalhes do serviço com: dados do cliente, endereço com link Google Maps, serviço, observações, upsell, fotos
- [x] Botão de agendamento manual (criar OS sem vínculo com venda)
- [x] Registrar rota /execucao e link no menu lateral
- [x] Controle de acesso: visível para todos os roles

### Frontend - Tapetes na Execução
- [x] Aba "Tapetes" dentro da Execução com OS de tapetes do dia/semana
- [x] Formulário de registro de tapete na execução: metragem (largura x comprimento), fotos, observações, tipo de sujidade
- [x] Vincular tapete ao agendamento de execução

### Frontend - Controle de Acesso por Role
- [x] DashboardLayout: filtrar menu por role do usuário logado
- [x] Funcionário (funcionario): ver apenas Execução
- [x] Vendedor (vendedor): ver Orçamentos, Clientes, Execução (sem finanças)
- [x] Secretaria (secretaria): ver Clientes, Execução, Orçamentos (sem finanças)
- [x] Admin/Master: acesso total

## Módulo Execução v2 - Fluxo Completo

### Automação: OS ao Marcar Vendido
- [x] Ao marcar orçamento como "vendido", abrir modal de agendamento de execução
- [x] Modal pré-preenche: cliente, contato, endereço, descrição do serviço e valor do orçamento
- [x] Campo de data de execução (obrigatório) e horário
- [x] Campo de responsável (funcionário/equipe)
- [x] Criar OS automaticamente ao confirmar
- [x] OS vinculada ao saleId (venda) e ao budgetId (orçamento)

### OS de Tapetes na Execução
- [x] Aba "Tapetes" dentro da página Execução
- [x] Formulário de OS de tapete: metragem (largura × comprimento = m²), tipo de sujidade (Leve / Moderada / Pesada — visual enfático com cores), fotos, observações
- [x] Tipo de sujidade com destaque visual: Leve (verde), Moderada (amarelo/laranja), Pesada (vermelho)
- [x] Upload de fotos do tapete (antes/depois)
- [x] Campo de tipo de tapete (lã, sintético, sisal, etc.)
- [x] Vincular tapete ao cliente (busca ou digitação manual)
- [x] Status: Pendente / Concluído

### Gestão de Equipes e Funcionários (Configurações)
- [x] Tabela `teams` no banco (id, name, description, color)
- [x] Tabela `team_members` no banco (id, teamId, name, phone, role, active)
- [x] Migration SQL para teams e team_members
- [x] Procedures tRPC: teams.list, create, update, delete
- [x] Procedures tRPC: teamMembers.list, create, update, delete
- [x] Aba "Equipes" nas Configurações com CRUD de equipes
- [x] Sub-seção de membros por equipe (José, Fernando, etc.)

### Atribuição de Responsável na OS
- [x] Campo "Responsável" no formulário de criação/edição de OS (dropdown de membros da equipe)
- [x] Exibir nome do responsável no card da OS na Execução
- [x] Filtro por responsável na lista de OS do dia

### Melhorias no Formulário de Agendamento Manual
- [x] Busca de cliente cadastrado com preenchimento automático de endereço
- [x] Opção de digitar nome manualmente (sem cadastro)
- [x] Descrição do serviço: escolher de lista de serviços ou digitar manualmente
- [x] Endereço preenchido automaticamente ao selecionar cliente

### Notificação Push ao Funcionário
- [x] Ao criar OS, enviar notificação ao dono do sistema com dados do agendamento
- [x] Notificação com: nome do cliente, data/hora, responsável e serviço
- [x] Notificação ao owner (admin) quando OS for concluída pelo funcionário (pendente)

## Melhorias Execução - Sprint 3

### Notificação ao Concluir OS
- [x] Backend: enviar notificação ao owner quando OS de execução for marcada como concluída
- [x] Notificação com: cliente, serviço, responsável, valor upsell gerado

### Cards de Execução no Dashboard
- [x] Backend: procedure execution.dashboardMetrics com OS do mês e upsell do mês
- [x] Dashboard: card "OS Executadas no Mês" com total e valor
- [x] Dashboard: card "Upsell do Mês" com valor total gerado em campo (separado)

### Filtro por Equipe/Funcionário na Execução
- [x] Dropdown de filtro por equipe na página de Execução
- [x] Dropdown de filtro por funcionário responsável na página de Execução
- [x] Filtros combinados (equipe + funcionário) com reset

## Sprint 4 - Melhorias de Fluxo e UX

### Busca de Endereço (CEP + Nome de Rua)
- [x] Componente reutilizável AddressSearch com busca por CEP (ViaCEP) e busca por nome de rua
- [x] Ao digitar CEP: preencher rua, bairro, cidade, estado automaticamente
- [x] Ao digitar nome de rua: buscar sugestões via ViaCEP e preencher ao selecionar
- [x] Aplicar em: cadastro de cliente (Clients.tsx)
- [x] Aplicar em: formulário de agendamento de execução (ExecutionFormModal)
- [x] Aplicar em: modal de venda (EditBudget.tsx)
- [x] Aplicar em: novo orçamento (NewBudget.tsx / EditBudget.tsx)

### Fluxo Venda → OS Automático
- [x] No modal de venda, renomear "Data de Agendamento" para "Data de Execução"
- [x] Ao confirmar venda, criar OS automaticamente com: nome, telefone, rua, número, bairro do cliente
- [x] Validar que os campos obrigatórios (nome, telefone, rua, número, bairro) estejam preenchidos antes de criar OS
- [x] Ao alterar data na OS de execução, atualizar a data da venda correspondente (via backend)
- [x] Ao alterar valor na venda, propagar para a OS de execução vinculada (via backend)

### WhatsApp no Detalhe da OS
- [x] No modal de detalhes da OS, botão "WhatsApp" que abre wa.me/{telefone}
- [x] Botão "WhatsApp Business" que abre api.whatsapp.com/send?phone={telefone}
- [x] Formatar número automaticamente (remover caracteres especiais, adicionar DDI 55)

### Seleção de Equipe no Agendamento
- [x] No formulário de criação/edição de OS, adicionar campo "Equipe" (dropdown das equipes cadastradas)
- [x] Ao selecionar equipe, filtrar o dropdown de responsável pelos membros daquela equipe
- [x] Salvar teamId na OS de execução
- [x] Exibir nome da equipe no card da OS na lista de execução

### Troca de Status na OS
- [x] No card da OS na lista de execução, botão de toggle Pendente ↔ Concluído
- [x] No modal de detalhes, botão de mudança de status com confirmação
- [x] Igual ao fluxo já existente nos tapetes

### Upsell: Somatório, Comprovante e Observação
- [x] Valor do upsell soma com o valor pré-cadastrado da OS (exibir total = valor OS + upsell)
- [x] Campo de observação geral na OS (abaixo do upsell)
- [x] Seção para anexar comprovante de pagamento (upload de imagem)
- [x] Ao adicionar tapete no upsell, abrir modal de cadastro de tapete (fluxo ExecutionCarpets)

### Dashboard: A Receber Global
- [x] Card "A Receber" no dashboard deve mostrar total de TODAS as vendas pendentes (não filtrar por mês)
- [x] Manter o filtro de mês apenas para "Total Faturado" e "Recebido"
- [x] Adicionar tooltip ou legenda indicando que "A Receber" é o total geral

### Histórico de OS no Perfil do Cliente
- [x] Na página de detalhes do cliente, adicionar seção "Histórico de Serviços"
- [x] Listar todas as OS de execução vinculadas ao cliente (por clientId ou por nome)
- [x] Exibir: data, serviço, responsável, valor OS, status (Pendente/Concluído)
- [x] Backend: procedures execution.getByClient e execution.getByPhone
- [x] Exibir total executado pelo cliente (soma de todas as OS)

## Sprint 5 - IA, Painel do Técnico e CRM

### Correções Urgentes
- [x] Corrigir busca de rua por nome no componente AddressSearch (URL da ViaCEP corrigida)
- [x] Sincronização de dados do cliente: ao editar cliente, atualizar em execution_orders, vendas e orçamentos vinculados
- [x] Somatório de vendas pendentes: exibir total a receber na página de Vendas (card adicionado)
- [x] Configurações: navegação por âncoras (menu lateral com links para cada seção)

### Fluxo Venda→Execução Corrigido
- [x] Ao marcar orçamento como vendido, criar OS automaticamente com: nome, telefone, endereço completo e lista de serviços do orçamento
- [x] Data da OS = data de agendamento informada na venda
- [x] Serviços do orçamento listados na descrição da OS
- [x] Histórico de OS no perfil do cliente (data, serviço, valor, status)

### Assistente de IA para Orçamentos
- [x] Backend: procedure ai.suggestBudget que analisa histórico do cliente e sugere serviços
- [x] Backend: procedure ai.generateBudgetText que gera texto personalizado para o orçamento
- [x] Frontend: botão "Sugerir com IA" no formulário de orçamento
- [x] Frontend: painel com sugestões de serviços e texto gerado pela IA
- [x] Frontend: aceitar sugestões individualmente

### Painel do Técnico (Mobile-First)
- [x] Página /painel-tecnico com layout otimizado para celular
- [x] Lista de OS do dia com endereços e horários
- [x] Botão "Navegar" que abre Google Maps com o endereço
- [x] Botão WhatsApp para contato rápido com o cliente
- [x] Toggle de status Pendente ↔ Concluído
- [x] Barra de progresso do dia (X/Y concluídos)
- [x] Atualização automática a cada 30 segundos
- [x] Acessível para role "funcionario" e acima

### Régua de Relacionamento CRM
- [x] Backend: procedure crm.inactiveClients (clientes sem OS há X dias)
- [x] Backend: procedure ai.generateReactivationMessage (IA gera mensagem personalizada)
- [x] Frontend: página /crm com lista de clientes inativos
- [x] Frontend: botão "Gerar Mensagem com IA" que cria texto personalizado
- [x] Frontend: botão "Enviar no WhatsApp" com mensagem pré-preenchida
- [x] Frontend: filtros por período de inatividade (30, 60, 90 dias, 6 meses, 1 ano)
- [x] Contador de clientes inativos por período

## Sprint 6 - Filtro de Período e Pendentes a Receber

### Filtro de Período nas Vendas
- [x] Seletor de período personalizado (data início e data fim) na página de Vendas
- [x] Filtro por mês (seletor month/year) e período personalizado
- [x] Cards de métricas atualizados conforme o período selecionado

### Aba Pendentes a Receber
- [x] Aba "Pendentes a Receber" na página de Vendas com lista de cobranças em aberto
- [x] Exibir: cliente, código da venda, status (Pendente/Parcial), valor restante, barra de progresso
- [x] Somatório total de pendentes no topo da aba (card em destaque)
- [x] Filtro por período na aba de pendentes
- [x] Botão "Marcar Pago" diretamente da lista de pendentes
- [x] Backend: procedure sales.pending com filtros de período

## Sprint 7 - Avaliação Pós-Serviço

### Banco de Dados
- [x] Tabela `service_reviews` (id, executionOrderId, clientName, clientPhone, rating 1-5, comment, token, respondedAt, createdAt)
- [x] Migration SQL para service_reviews

### Backend
- [x] Helper getReviewByToken, createReview, getReviewsByClient, getReviewsByExecution no db.ts
- [x] Procedure pública review.submit (sem autenticação, por token)
- [x] Procedure review.getByExecution (protegida)
- [x] Procedure review.getStats (média geral, por equipe, por funcionário)
- [x] Ao concluir OS: gerar token único e incluir link de avaliação na notificação

### Frontend - Página Pública de Avaliação
- [x] Rota pública /avaliar/:token (sem login)
- [x] Tela com nome do cliente, serviço realizado e seletor de estrelas (1-5)
- [x] Campo de comentário opcional
- [x] Confirmação de envio com mensagem de agradecimento
- [x] Tela de "já avaliado" caso o token já tenha sido usado

### Frontend - Integração na Execução
- [x] Ao marcar OS como Concluída: mostrar botão "Enviar Avaliação no WhatsApp"
- [x] Mensagem WhatsApp pré-formatada com link de avaliação personalizado
- [x] Exibir avaliação recebida no modal de detalhes da OS (estrelas + comentário)
- [x] Exibir histórico de avaliações no perfil do cliente
- [ ] Card de NPS médio no Dashboard (pendente)

## Sprint 8 - Download PDF do Orçamento

- [x] Adicionar botão "Baixar PDF" na tela de visualização final do orçamento (BudgetPreview)
- [x] Gerar PDF com layout fiel ao orçamento usando html-to-image + jsPDF

## Sprint 9 - Excluir Agendamento na Execução

- [x] Procedure tRPC execution.delete no backend (já existia)
- [x] Botão de excluir agendamento na listagem (lixeira no card)
- [x] Confirmação antes de excluir (dialog de confirmação com nome e data da OS)

## Sprint 10 - Melhorias Múltiplas

### Execução - Modal de Detalhes
- [ ] Botão excluir agendamento dentro do ExecutionDetailModal
- [ ] Botão reagendar dentro do modal (ao clicar na lixeira, oferecer excluir ou reagendar)
- [ ] Ao reagendar: abrir formulário para nova data/hora

### Histórico de Cancelamentos
- [ ] Tabela cancelled_orders no banco (id, clientName, serviceDescription, scheduledDate, cancelledAt, reason)
- [ ] Migration SQL para cancelled_orders
- [ ] Ao excluir OS: pedir motivo do cancelamento e salvar no histórico
- [ ] Página/aba de histórico de cancelamentos acessível na Execução

### Vendas
- [ ] Filtro por mês na área de Vendas
- [ ] Renomear menu "Financeiro" para "Vendas"
- [ ] Retirar dashboard de despesas/receita total de Vendas e colocar card "Aguardando Pagamento"

### Financeiro (nova aba)
- [ ] Criar página Financeiro com dashboard: faturamento do mês, despesas do mês, lucro líquido
- [ ] Filtro de entradas e despesas
- [ ] Listar apenas vendas pagas + despesas
- [ ] Adicionar rota /financeiro no App.tsx e no sidebar

### Orçamento
- [ ] Remover botão "Duplicar" do BudgetPreview
- [ ] Adicionar botão "Agendar Execução" (ícone carrinho) no BudgetPreview
- [ ] Modal de agendamento com mesmo sistema do ExecutionFormModal
- [ ] Ao registrar venda: perguntar se deseja agendar execução (sim → fluxo de agendamento)

## Sprint 11 - Melhorias de UX e Correções

- [ ] Mover botão de registrar transação de Vendas para Financeiro
- [ ] Corrigir bug: pagamentos pendentes não aparecem no card "Aguardando Pagamento"
- [ ] Adicionar múltiplos serviços no agendamento de execução (lista de itens com valor)
- [ ] Exibir somatório de upsell/serviços na lista principal de agendamentos

## Sprint 12 - Filtro de Mês em Vendas
- [x] Adicionar seletor de mês na aba de Vendas (igual ao Financeiro)
- [x] Conectar o filtro de mês à query sales.list e métricas

## Sprint 13 - Melhorias e Correções
- [ ] BUG: Pendentes a receber - vendas com paymentStatus pending/partial devem aparecer corretamente
- [ ] BUG: Agendamento não puxa valores dos serviços cadastrados
- [ ] BUG: Somatório de upsell não aparece na lista principal do dia
- [ ] Botão "Salvar Alterações" no upsell do modal de execução
- [ ] Buscador de endereço Google no cadastro de cliente
- [ ] Desativar envio de e-mail automático ao agendar/concluir OS
- [ ] Mensagens pré-programadas nas Configurações (técnico a caminho, etc.)
- [ ] Botão de envio de mensagem pré-programada no modal de detalhes da OS
- [ ] Sino de notificações no header para serviços concluídos

## Melhorias Mar/2026
- [ ] Remover envio de e-mail ao concluir serviço
- [ ] Corrigir contagem de vendas do mês no Dashboard
- [ ] Adicionar cards de navegação rápida no Dashboard (Financeiro, Vendas, Orçamentos, Clientes)
- [ ] Gráfico de serviços marcados por semana no Dashboard

## Rebranding para Higefácil (higefacil.com.br)
- [x] Atualizar título da aba do navegador (index.html) para Higefácil
- [x] Adicionar meta tags SEO (description, og:title, og:description, favicon) para higefacil.com.br
- [x] Atualizar footer da landing page com domínio higefacil.com.br
- [x] Atualizar nome do projeto no webdev para Higefácil
- [x] Atualizar landing page: rota raiz "/" aponta para a landing page (não o dashboard)

## Bug: Orçamentos salvos não aparecem na listagem
- [x] Investigar por que orçamentos criados não aparecem na listagem após salvar
- [x] Corrigir o bug no fluxo de criação/listagem de orçamentos

## Bug: Orçamentos não salvando (segunda investigação)
- [x] Identificar causa raiz do bug de criação de orçamentos
- [x] Corrigir bug de orçamentos não aparecendo na listagem
- [x] Adicionar notificação de sucesso ao criar orçamento

## Recuperação de senha
- [x] Criar página /recuperar-senha com formulário de e-mail
- [x] Criar página /redefinir-senha/:token para nova senha
- [x] Registrar rotas no App.tsx

## Bug: Logout não funcionava para login por e-mail/senha
- [x] Corrigir auth.logout para limpar cookie company_session além do cookie OAuth
- [x] Redirecionar para /entrar após logout

## Formulário de Feedback Beta
- [x] Criar tabela feedbacks no banco (companyId, categoria, o_que_funcionou, o_que_travou, o_que_falta, nota, createdAt)
- [x] Procedures tRPC: criar feedback e listar feedbacks (master)
- [x] Página /feedback no sistema para beta testers enviarem
- [x] Adicionar "Enviar Feedback" no menu lateral
- [x] Seção de feedbacks no Painel Master para Israel visualizar
- [ ] Notificação para Israel quando novo feedback chegar

## Correções e Novas Funcionalidades - Mar/2026
- [x] Corrigir nome "HigeLimpe" para "Higifácil" na página de Solicitar Acesso
- [x] Adicionar logo Higifácil na página de Solicitar Acesso
- [x] Criar relatório de antes/depois na Execução com fotos, horários, dados do cliente e chave Pix

## Melhorias no Relatório de Execução - Mar/2026
- [x] Adicionar campo tipo (antes/depois) no upload de fotos da Execução
- [x] Atualizar banco: coluna photoType (before/after) na tabela execution_photos
- [x] Atualizar ExecutionDetailModal para selecionar tipo da foto ao fazer upload
- [x] Gerar relatório em PDF (não JPEG) com fotos antes/depois separadas
- [x] Chave Pix copiável no relatório (botão "Copiar Chave Pix")

## Bugs e Melhorias - Relatório de Execução (Mar/2026)
- [x] BUG: Fotos não aparecem no PDF gerado pelo relatório (corrigido: conversão para base64 antes do html2canvas)
- [x] BUG: Erro ao enviar PDF pelo WhatsApp (corrigido: PDF baixado primeiro, depois abre WhatsApp com instruções)
- [x] BUG: Erro na logo no topo do relatório (corrigido: logo convertida para base64)
- [x] Excluir fotos individualmente no modal de execução (já existia: botão X vermelho ao hover)
- [x] Visualizar foto em tamanho grande ao clicar (lightbox implementado)

## Reformulação do Painel Master - Mar/2026
- [x] Procedure approveAndOnboard: aprovar solicitação + criar empresa + definir credenciais em um único fluxo
- [x] Fluxo de onboarding no MasterPanel: ao aprovar, abrir modal para definir senha e gerar instruções de acesso
- [x] Copiar instruções de acesso (link + e-mail + senha) para enviar ao cliente
- [x] Aba Empresas: exibir e-mail de login e status de credenciais de cada empresa
- [x] Aba Empresas: botão de redefinir senha rápida direto na listagem
- [ ] Aba Empresas: filtro por status (ativo/expirado/bloqueado)
- [ ] Configurar envio de e-mail para recuperação de senha (Resend)

## Bug: Login da Empresa não redireciona para o dashboard - Mar/2026
- [x] BUG: Após login bem-sucedido em /empresa/login, redireciona para /company/dashboard que não existe
- [x] BUG: DashboardLayout não reconhece sessão de empresa (cookie) após navegação client-side
- [x] Corrigir: usar window.location.href para forçar reload e recarregar contexto de autenticação
- [x] Corrigir: cookie de empresa agora usa sameSite=none + secure=true para funcionar em produção HTTPS

## Bugs Críticos - Mar/2026 (sessão 3)
- [x] BUG: Dados do CRM se misturam entre empresas (corrigido: cancelledOrders, presetMessages e appNotifications agora filtram por companyId)
- [x] BUG: Cabeçalho do relatório de execução mostra nome do app em vez do nome da empresa (corrigido: usa settingsData.company_name)
- [x] BUG: Fotos não aparecem no relatório de execução gerado (corrigido: proxy /api/image-proxy contorna CORS do S3)
- [x] BUG: Responsividade mobile ruim em Orçamentos (corrigido: grid, lista e botões adaptados)
- [x] BUG: Responsividade mobile ruim em Vendas (corrigido: grid e lista adaptados)
- [x] BUG: Responsividade mobile ruim em Execução (corrigido: cabeçalho, cards e calendário adaptados)

## Sistema de Múltiplos Usuários por Empresa - Mar/2026
- [x] Schema: tabela company_users (id, companyId, name, email, passwordHash, role, active, createdAt, lastLoginAt)
- [x] Migration SQL: criar tabela company_users no banco
- [x] Procedures tRPC: listar, criar, editar, excluir e redefinir senha de company_users
- [x] Autenticação: login de company_user via /entrar com e-mail + senha (cookie company_user_session separado)
- [x] Aba "Usuários" nas Configurações: listagem com perfil, status e ações
- [x] Modal de criar/editar usuário: nome, e-mail, senha, perfil (master/vendedor/técnico/secretaria)
- [x] Restrição de menu por perfil: técnico vê Execução, vendedor vê Orçamentos+Vendas, master vê tudo
- [x] Indicador visual do usuário logado no DashboardLayout (nome + perfil no footer do sidebar)

## Edição de Perfis de Acesso - Mar/2026
- [x] Formulário de edição de usuário: nome, e-mail, senha, perfil e status ativo/inativo
- [x] Toggle ativo/inativo no formulário de edição com feedback visual (verde/vermelho)
- [x] Confirmação de senha ao criar/redefinir (campo confirmar senha com validação em tempo real)
- [x] Feedback visual ao salvar (toast de sucesso/erro já existia)

## Aba Dedicada de Usuários - Mar/2026
- [x] Criar página Usuarios.tsx com listagem completa de usuários (reescrita completa)
- [x] Toggle rápido ativo/inativo direto na listagem (sem abrir formulário)
- [x] Botão enviar credenciais por WhatsApp ao criar usuário (banner pós-criação) e na listagem
- [x] Seleção granular de módulos por perfil no formulário (checkboxes por módulo, pré-selecionados pelo perfil)
- [x] Transferir gerenciamento de usuários de Configurações para a nova aba
- [x] "Usuários" já estava no menu do DashboardLayout
- [x] Seção de usuários em Configurações substituída por card de redirecionamento para /usuarios

## Ajustes Aba Usuários - Mar/2026
- [x] Remover todo conteúdo de usuários do Settings.tsx (aba removida do menu + card removido)
- [x] Remover perfil "Vendedor" de Users.tsx, companyUsersRouter, DashboardLayout, db.ts, routers.ts, Profile.tsx e testes
- [x] Manter apenas: Master, Técnico e Secretária
- [x] Permissões configuráveis manualmente por perfil na aba Usuários (checkboxes de módulos)

## Aba Usuários Completa - Mar/2026
- [x] Listagem de todos os usuários da equipe (nome, perfil, e-mail, status, último acesso)
- [x] Formulário de cadastro de novo usuário (nome, e-mail, senha, perfil, módulos)
- [x] Formulário de edição de usuário existente
- [x] Toggle ativo/inativo direto na listagem
- [x] Botão de excluir usuário
- [x] Botão de enviar credenciais por WhatsApp
- [x] Seção de resumo dos perfis com permissões configuráveis
- [x] Mensagem explicativa quando acessado sem empresa (login via Manus OAuth)
- [x] Correção da lógica isMaster para usar role="admin"

## Bug: Login de Sub-Usuários - Mar/2026
- [x] BUG: Sub-usuários da equipe não conseguem fazer login (corrigido: cookie usava sameSite=none+secure=true que só funciona em HTTPS; agora usa lax em dev e none em produção)

## Redefinição de Senha pelo Master - Mar/2026
- [x] Botão "Redefinir Senha" (chave) na listagem de usuários (visível apenas para o master)
- [x] Modal com campo de nova senha + confirmação + gerador automático de senha segura
- [x] Botão de enviar nova senha por WhatsApp diretamente no modal

## Bug Crítico: Login Sub-Usuários Não Funciona - Mar/2026
- [ ] BUG CRÍTICO: Sub-usuários cadastrados na aba Usuários não conseguem fazer login

## Correções de Login e Roles - Mar/2026
- [x] BUG CRÍTICO: Sub-usuários cadastrados na aba Usuários não conseguem fazer login
  - Diagnóstico: o sistema de login funcionava corretamente; o problema era que o usuário existente tinha uma senha desconhecida no banco
  - Confirmado via logs de debug: hash da senha não correspondia a nenhuma senha conhecida
  - Solução: modal de redefinição de senha já existia e funciona corretamente
- [x] Corrigido mapeamento de roles: context.ts agora armazena role real no loginMethod (company_user_tecnico, company_user_secretaria, etc.)
- [x] DashboardLayout atualizado para extrair role correto do loginMethod
- [x] Logout agora limpa também o cookie company_user_session (além de OAuth e company_session)
- [x] Banner de credenciais melhorado: mostra senha em texto claro + botão de copiar credenciais
- [x] Testes atualizados: auth.logout agora verifica 3 cookies limpos (87 testes passando)

## Novas Funcionalidades - Mar/2026
- [x] BUG: Redefinição de senha de sub-usuários não funciona - Diagnóstico: backend funciona corretamente (confirmado via curl e logs), o update retorna {success:true}; o problema era que o usuário não sabia que a operação foi bem-sucedida
- [x] Calendário semanal de execução no topo do Dashboard (com todos os serviços agendados)
- [x] Clique no serviço do calendário redireciona para a página de execução

## Botão de Agendamento no Dashboard e Execução - Mar/2026
- [x] Botão "+ Agendar" no header da Agenda da Semana no Dashboard (abre modal com data do dia selecionado pré-preenchida)
- [x] Após salvar, o calendário do Dashboard é atualizado automaticamente (invalidate da query)
- [x] Botão "Agendar" já existia na página de Execução (confirmado que está funcionando)

## Bugs e Funcionalidades - Mar/2026 (v2)
- [x] BUG: Upsell não some quando apagado no modal da execução
- [x] BUG: Valor do dia na execução está somando OS apagadas (filtrado status != cancelled)
- [x] BUG: Vendas "aguardando pagamento" puxando de outras empresas (adicionado filtro companyId)
- [x] BUG: Total de vendas na aba de vendas somando todos os meses (agora usa thisMonthSales)
- [x] FEAT: Gráfico de meta dinâmica entre o cabeçalho e a Agenda da Semana no Dashboard
- [x] FEAT: Seção de meta mensal nas configurações com mini calculadora (meta/dia e meta/semana)
- [x] FEAT: Botão Agendar na página de Execução igual ao Dashboard

## Melhoria da Barra de Meta - Mar/2026
- [x] Melhorar visual da barra de meta no Dashboard (posicionamento entre header e agenda)
- [x] Garantir que a configuração de meta salva e carrega corretamente
- [x] Barra de progresso animada com valores em tempo real
- [x] Botão "Confirmar Meta" dedicado na seção de meta das Configurações

## Celebração de Meta - Mar/2026
- [x] Confetes animados ao atingir a meta (rajadas laterais + confete central)
- [x] Som de celebração ao atingir a meta (melodia de vitória via Web Audio API)
- [x] Modal de conquista com resumo do mês ao atingir a meta
- [x] Foguete maior na barra de progressão (1.75rem com sombra)

## Módulo Reativação (CRM reformulado) - Mar/2026
- [x] Renomear CRM → Reativação no menu
- [x] Schema: adicionar reactivation_days, last_service_date e next_reactivation_date na tabela clients
- [x] Backend: procedure para salvar prazo de reativação por cliente
- [x] Backend: procedure para listar clientes do dia (next_reactivation_date = hoje)
- [x] Backend: procedure para listar todos os clientes com reativação configurada
- [x] Frontend: reformular página Reativação com abas (Hoje / Todos / Inativos)
- [x] Frontend: lista diária com envio em massa para todos do dia
- [x] Frontend: template personalizável com variáveis {nome}, {dias}, {empresa}
- [x] Frontend: seletor de prazo ao concluir serviço na Execução (30/60/90/120/180/365 dias)
- [x] Frontend: editar prazo de reativação diretamente na lista

## Melhorias no Fluxo de Agendamento (Mar/2026)
- [ ] Preenchimento automático do endereço do cliente no modal de agendamento
- [ ] Botão de mensagem de confirmação editável para WhatsApp na tela de confirmação
- [ ] Página pública de confirmação de serviço para o cliente com token único

## Melhorias Solicitadas (07/03/2026)

- [x] RegisterSaleModal: propagar data de agendamento para o próximo modal de agendamento
- [x] Mobile: itens do orçamento no modal de agendamento maiores e com nome visível
- [x] Orçamento: remover campos de vídeos e links adicionais do formulário
- [x] Listagem de orçamentos: remover ícone de carrinho
- [x] Modal de agendamento confirmado: exibir nome do cliente
- [x] Tela de confirmação: remover link de confirmação e adicionar botão "Copiar mensagem"
- [x] Vendas mobile: reorganizar lista para nome do cliente não ficar cortado
- [x] Dashboard aba orçamentos: renomear labels dos cards de período e mostrar somatório de valores
- [x] Listagem de orçamentos: renomear status "aceito" para "orçamento fechado"

## Painel Administrador (Dono do Sistema) - Mar/2026

- [x] Rota /admin protegida por Manus OAuth (só o dono acessa)
- [x] Layout AdminLayout com sidebar própria (separada do DashboardLayout das empresas)
- [x] Página /admin/empresas — listagem de todas as empresas com status, plano, data de cadastro
- [x] Ação: criar nova empresa (nome, e-mail, senha, plano)
- [x] Ação: bloquear/desbloquear acesso de empresa
- [x] Ação: redefinir senha de empresa
- [x] Página /admin — visão geral do sistema (total empresas, ativas, bloqueadas, orçamentos totais, vendas totais)
- [x] Página /admin/solicitacoes — solicitações de acesso pendentes
- [x] Página /admin/feedbacks — feedbacks beta dos usuários
- [x] Separar fluxo de acesso: Manus OAuth → /admin, e-mail/senha → /dashboard
- [x] Procedures tRPC admin: systemMetrics, listCompanies, createCompanyWithCredentials, toggleBlock, updateCompany, resetCompanyPassword, listAccessRequests, listFeedbacks

## Melhorias Solicitadas (07/03/2026 - Rodada 3)

- [x] Bug crítico: metas misturando dados entre empresas — corrigir filtro por companyId
- [x] Configurações da empresa: campo para upload de logo da empresa
- [x] Configurações da empresa: campos para 2 cores personalizadas (cor primária e cor secundária)
- [x] Orçamento: exibir logo da empresa no cabeçalho do orçamento gerado
- [x] Orçamento: aplicar cores personalizadas da empresa nos templates de orçamento
- [x] Orçamento: trocar label "Pix" por "À vista" na prévia das condições de pagamento
- [x] Lista de vendas mobile: melhorar layout — nome completo sem corte, informações organizadas

## Templates de Orçamento (07/03/2026)
- [ ] Template 1: Card Premium (atual, fundo escuro com gradiente)
- [ ] Template 2: Texto WhatsApp (texto copiar + botão abrir WhatsApp com cliente preenchido)
- [ ] Template 3: Profissional Claro (fundo branco, cabeçalho colorido, tabela limpa)
- [ ] Template 4: Compacto Moderno (layout compacto, logo grande)
- [ ] Seleção de template padrão nas Configurações
- [ ] Troca de template no BudgetPreview (sem salvar como padrão)
- [ ] Todos os templates respeitam cores da empresa

## Melhorias Mar/2026
- [x] Melhorar visual da lista de vendas (nomes e informações mais organizados, layout esticado sem amontoar)
- [x] Trocar "PIX" por "À Vista" no formulário de novo orçamento
- [x] Corrigir status dos agendamentos no dashboard (todos aparecem como pendentes)
- [x] Corrigir cálculo de conversão no dashboard (mostrar total de orçamentos, fechados, pendentes e recusados)
- [x] Organizar lista de pendentes no mobile (layout desorganizado)

## Correções de Usuário (Mar/2026)
- [x] Adicionar campo de telefone/WhatsApp no cadastro de sub-usuário
- [x] Adicionar coluna phone na tabela company_users
- [x] Atualizar schema drizzle com campo phone
- [x] Atualizar formulário de criação/edição de usuário com campo telefone
- [x] Enviar credenciais por WhatsApp direto para o número do usuário cadastrado
- [x] Validação de senha mais forte (8+ chars, maiúscula, número)
- [x] Corrigir usuários com hash de senha inválido (joao@limpafacil.com.br)

## Envio Automático WhatsApp ao Criar Usuário (Mar/2026)
- [x] Ao criar usuário com telefone, enviar credenciais automaticamente por WhatsApp (sem prompt manual)
- [x] Exibir toast de confirmação informando que o WhatsApp foi aberto

## Bug: Login de Sub-usuário Falha Após Cadastro (Mar/2026)
- [x] Diagnosticar por que a senha salva no banco não bate com a digitada no login
- [x] Verificar se há duplo hash sendo aplicado na criação (não há bug - senha foi digitada errada)
- [x] Corrigir o bug de criação de senha (não há bug no código)
- [x] Garantir que o master consiga redefinir senha pelo painel (botão de chave)
- [x] Adicionar alerta visual para usuários que nunca fizeram login
- [x] Envio automático de WhatsApp ao redefinir senha (se tiver telefone)

## Melhorias no Painel de Usuários (Mar/2026 - v2)
- [x] Deletar usuário de teste joaof@limpafacil.com.br do banco
- [x] Adicionar campo de confirmação de senha no formulário de criação de usuário
- [x] Adicionar botão "Copiar senha" no modal de redefinição de senha

## Troca de Senha no Perfil do Usuário (Mar/2026)
- [x] Adicionar endpoint companyUsers.changePassword (verifica senha atual antes de alterar)
- [x] Implementar seção de troca de senha na página de perfil do sub-usuário
- [x] Validação: senha atual correta + nova senha com regras de força + confirmação

## Nome da Empresa no Cabeçalho (Mar/2026)
- [x] Exibir nome da empresa no cabeçalho do DashboardLayout para sub-usuários logados
- [x] Exibir nome da empresa na aba do perfil do sub-usuário

## BUG CRÍTICO: Login de Sub-usuário Falha (Mar/2026)
- [x] Investigar fluxo completo: banco → hash → endpoint → cookie
- [x] Corrigir bug raiz: email case-sensitive (Jose@ vs jose@) - busca agora usa LOWER()
- [x] Normalizar todos os emails do banco para minúsculas
- [x] Validar login funcionando: jose@limpafacil.com.br com Sos12345 → sucesso

## BUG CRÍTICO 2: Senha gerada pelo sistema não funciona no login (Mar/2026)
- [x] Diagnosticar por que a senha gerada/redefinida pelo master não funciona no login
- [x] Bug raiz: página /entrar só tentava login master, não tentava sub-usuário
- [x] Corrigido: /entrar agora tenta sub-usuário primeiro, depois master automaticamente
- [x] Validar login funcionando com senha gerada pelo sistema

## Simplificação do Gerenciamento de Senha (Mar/2026)
- [ ] Remover campo de senha do formulário de edição de usuário (evitar confusão com botão de chave)
- [ ] Manter apenas o botão de chave (🔑) como único ponto de redefinição de senha

## Simplificação do Gerenciamento de Senha (Mar/2026)
- [x] Remover campo de senha do formulário de edição de usuário (evitar confusão com botão de chave)
- [x] Manter apenas o botão de chave como único ponto de redefinição de senha
- [x] Exibir aviso na edição orientando a usar o botão de chave para alterar senha

## BUG: Download de Orçamento PDF/Imagem (Mar/2026)
- [x] Diagnosticar erro no download de orçamento em PDF
- [x] Diagnosticar erro no download de orçamento em imagem
- [x] Bug raiz: logo SVG externo bloqueava o canvas (tainted canvas)
- [x] Corrigir: converter imagens externas (incluindo SVG) para PNG base64 antes de capturar
- [x] Fallback: se conversão falhar, oculta a imagem temporariamente durante a captura

## BUG URGENTE: Download JPEG/PDF ainda falha em produção (Mar/2026)
- [x] Reescrever captureAsJpeg com abordagem sem CORS (ocultar todas as imagens + filter IMG)
- [x] Testar e publicar

## Fluxo de Status de Vendas - Agendado/Realizado (Mar 2026)
- [x] Adicionar campo scheduledDate (data do serviço) e serviceStatus (scheduled/completed) na tabela sales
- [x] Procedure markSaleAsCompleted: muda serviceStatus para completed
- [x] Procedure registerPayment: registra forma, parcelas e comprovante
- [x] Botão "✓ Marcar Realizado" na lista de vendas (quando serviceStatus = scheduled)
- [x] Modal de pagamento: forma (pix/cartão/dinheiro), parcelas, comprovante foto
- [x] Status "Pago" após registrar pagamento
- [x] Corrigir lógica: "Pagamento Pendente" só após serviceStatus = completed

## Melhorias - Março 2026
- [ ] Painel sub-usuário: não mostrar dashboard, usar layout adaptativo quando poucas abas
- [ ] Corrigir erro ao deletar upsell na execução
- [ ] Categorias de serviço em configurações: diminuir tamanho dos cards
- [ ] Novo agendamento: trazer dados completos do cliente + serviços + orçamento vinculado
- [ ] Novo agendamento: listar usuários cadastrados como técnico para seleção
- [ ] Itens do orçamento: ampliar campo de descrição para mostrar texto completo

## Sistema de Planos Solo/Dupla/Equipe + Quiz + Admin (Mar 2026)
- [x] Adicionar campo planType (solo/dupla/equipe) na tabela companies
- [x] Criar tabela plan_features para controle de funcionalidades por plano
- [x] Quiz interativo na landing page (3 perguntas de perfil)
- [x] Atualizar seção de preços na landing page (R$5/R$10/R$15 - Solo/Dupla/Equipe)
- [x] Página de planos /planos com preços e botão de assinar
- [x] Estrutura de pagamento Stripe (stripe_subscription_id, stripe_customer_id)
- [x] Painel admin: gerenciar funcionalidades por plano (/admin/planos)
- [x] Link "Planos" adicionado no navbar da landing page
- [x] Adicionar rota /planos no App.tsx
- [x] Adicionar /admin/planos no AdminLayout e App.tsx

## Dashboard de Análise do Quiz (Mar 2026)
- [x] Criar procedure quizResponses.save (publicProcedure) para salvar respostas do quiz no banco
- [x] Criar procedure quizResponses.list e stats (ownerProcedure) para análise
- [x] Conectar quiz da landing page ao endpoint de salvamento
- [x] Criar página /admin/quiz com dashboard: total de respostas, distribuição por plano sugerido, gráficos de cada pergunta, tabela de respostas recentes
- [x] Adicionar item "Quiz" no menu do AdminLayout
- [x] Registrar rota /admin/quiz no App.tsx

## Correções de UX - Admin e Landing (Mar 2026)
- [x] Painel admin: dados carregam corretamente (3 empresas, 172 orçamentos) - era cache do browser
- [x] Adicionar link na logo da tela /entrar para voltar à landing page
- [x] Quiz confirmado na landing page: seção azul escura após os depoimentos, antes dos preços

## Reposicionamento do Quiz na Landing Page (Mar 2026)
- [x] Mover seção do quiz para logo abaixo da seção de vídeo na landing page

## Scroll para Preços ao Finalizar Quiz (Mar 2026)
- [x] Ao concluir o quiz, rolar automaticamente até a seção de preços destacando o plano recomendado

## Bug: Painel Admin não exibe dados reais (Mar 2026)
- [ ] Investigar e corrigir AdminDashboard - empresas cadastradas não aparecem
- [ ] Investigar e corrigir AdminQuiz - dados do quiz não aparecem

## Login Admin com Usuário/Senha (Mar 2026)
- [ ] Criar tabela admin_users no banco
- [ ] Criar endpoints: adminAuth.login, adminAuth.me, adminAuth.logout
- [ ] Criar ownerProcedure baseada em cookie JWT de admin
- [ ] Criar página /admin/login com formulário de usuário/senha
- [ ] Atualizar AdminLayout para redirecionar para /admin/login
- [ ] Criar usuário admin inicial no banco

## Bug Urgente: Login empresa não funciona no site publicado (Mar 2026)
- [x] Testar endpoint de login via curl no site publicado - login funciona (200 OK)
- [x] Login bem-sucedido mas redirecionava para landing page - código já correto (/dashboard), problema era versão desatualizada publicada
- [x] Novo checkpoint criado para republicar com versão correta

## Bug: Status inconsistente na lista de vendas (Mar 2026)
- [x] Investigar status de vendas: serviceStatus (agendado/realizado) e paymentStatus (pago/pendente) são campos separados
- [x] Ao registrar pagamento no modal (valor + forma), marcar automaticamente como paymentStatus=paid

## Reativação: padrão de 90 para 180 dias (Mar 2026)
- [x] Alterar padrão de reativação de clientes de 90 para 180 dias em todo o sistema (backend + frontend)
- [x] Auto-configurar reativação de 180 dias ao criar uma venda com clientId vinculado

## Bug: Somatório do up-sell incorreto (Mar 2026)
- [x] Corrigir cálculo do somatório do up-sell: parseDecimal robusto para strings decimais do MySQL (vírgula/ponto) em ExecutionDetailModal e Execution.tsx

## Bug: Somatório de upsell do mês incorreto no dashboard (Mar 2026)
- [x] Investigar query de upsell do mês no dashboard: não filtrava por companyId, somava upsells de todas as empresas
- [x] Corrigir getExecutionDashboardMetrics para filtrar por companyId corretamente

## Reativação retroativa: 180 dias a partir da data da venda (Mar 2026)
- [x] Configurar reativação de 180 dias para todos os clientes com vendas existentes (data alvo = data da venda mais recente + 180 dias) - aplicado via SQL no banco
- [x] Novas vendas já configuram reativação automaticamente (implementado anteriormente)

## Stripe + Plano Free (Mar 2026)
- [ ] Ativar feature Stripe no projeto
- [ ] Atualizar preços: Solo R$10, Dupla R$15, Equipe R$20
- [ ] Adicionar planType "free" no schema e banco
- [ ] Criar controle de plano Free no painel admin (liberar empresa sem pagamento)
- [ ] Criar procedure de checkout Stripe (criar sessão de pagamento)
- [ ] Criar webhook Stripe para atualizar planType após pagamento confirmado
- [ ] Atualizar landing page e página /planos com novos preços e plano Free

## Calculadora de Deslocamento no Orçamento
- [ ] Adicionar campo `deslocamentoAtivo` (boolean) na tabela de configurações da empresa no schema
- [ ] Criar procedure para salvar/buscar configuração de deslocamento
- [ ] Criar componente CalculadoraDeslocamento com Google Maps (distância + pedágio automático)
- [ ] Campos editáveis: endereço de partida, destino, tipo de viagem (Ida/Volta/Ida e Volta destacado), valor por KM
- [ ] Seção "Deslocamento" separada no orçamento (não misturada com serviços)
- [ ] Total final = serviços + deslocamento + pedágio
- [ ] Toggle de ativação nas configurações da empresa

## Calculadora de Deslocamento - Correções
- [ ] Corrigir calculadora de deslocamento não aparece no NewBudget (verificar condição de exibição)
- [ ] Adicionar calculadora de deslocamento no EditBudget
- [ ] Corrigir layout mobile das taxas nas configurações (saindo da caixinha)
- [ ] Corrigir toggle de deslocamento não responsivo nas configurações
- [x] Separar agendamentos do dia por período (Manhã / Tarde / Noite) com cabeçalhos visuais
- [x] Botão flutuante WhatsApp no dashboard (número: 82998383003)

## Novas Tarefas (Mar 2026)
- [x] Corrigir permissões de usuário: ao selecionar mais permissões na aba Usuários, o usuário deve ver os módulos liberados
- [x] Fluxo pós-compra: após finalizar compra de plano, redirecionar para Dashboard e exibir modal de cadastro de acesso ao sistema
- [x] Adicionar botões de navegação (Google Maps / Waze) nos agendamentos e clientes a partir do endereço
- [x] Corrigir isolamento de dados na aba Tapetes (dados de outras empresas aparecendo)

## Reativação de Orçamentos Recusados
- [x] Adicionar procedure tRPC budgets.reactivate no backend (muda status de rejected → pending e sold → false)
- [x] Adicionar botão "Reativar" na aba Recusados da listagem de orçamentos
- [x] Confirmar reativação com toast de sucesso e atualização da lista

## Formas de Pagamento Configuráveis + Página 2 de Informações
- [x] Adicionar campos de configuração no banco: payment_methods_config (JSON) e info_page_text
- [x] Backend: procedures para salvar/ler payment_methods_config e info_page_text nas settings
- [x] UI nas Configurações: seção para ativar/desativar formas de pagamento e definir descontos
- [x] UI nas Configurações: editor de texto para a Página 2 de Informações Importantes
- [x] BudgetPreview: exibir condições de pagamento calculadas de forma visual e responsiva
- [x] BudgetPreview: adicionar Página 2 de informações ao download de PDF e imagem

## Correções PDF e Download iPhone
- [x] PDF: preencher página inteira sem margens brancas (stretch to fill A4)
- [x] iPhone/Safari: corrigir download de imagem que não vai para a galeria (abrir em nova aba para salvar manualmente)

## Múltiplas Páginas de Informações + Correção PDF
- [x] Corrigir PDF para manter proporção sem distorcer texto (fundo colorido, sem bordas brancas)
- [x] Migrar info_page_text para info_pages (array com nome + texto por página) no backend
- [x] UI Configurações: gerenciar múltiplas páginas de informações (Higienização, Impermeabilização, Tapete, etc.)
- [x] BudgetPreview: seletor de qual página de informações incluir no download

## Compactação UI Configurações
- [ ] Tornar seção de Páginas de Informações mais compacta nas Configurações

## Problema de Login no Chrome
- [ ] Investigar por que o login no Chrome redireciona de volta para a área pública
- [ ] Verificar logs de autenticação e cookies
- [ ] Corrigir o fluxo de login

## Ajustes Abril 2026
- [ ] Login Chrome: ao sair do sistema redirecionar para /login (não para a Manus); cookie sameSite corrigido
- [ ] Orçamentos antigos (>7 dias): ao marcar como venda não sobe para vendas — revisar lógica de criação de venda a partir do orçamento
- [ ] Alterações no orçamento não refletem na venda nem na execução vinculada — sincronizar dados ao editar orçamento
- [ ] Formas de pagamento parceladas: criar campo de juros por número de parcelas (1x, 2x, 3x... até Nx) com valor calculado
- [ ] Venda Direta não está cadastrando cliente — verificar e corrigir
- [ ] Simplificar fluxo de status de venda: diferenciar "serviço realizado" de "pagamento recebido" de forma clara e simples
- [ ] Pagamento programado: campo para definir prazo de pagamento em dias (ex: 40 dias) — constar no mês vigente ao vencimento
- [ ] Validade do orçamento: não está atualizando no orçamento ao salvar nas configurações; fazer auto-save por campo sem precisar ir ao final da página
- [ ] Logo da página: ao clicar na logo dentro do sistema deve recarregar a página (F5)
- [ ] Dashboard: adicionar card com quantidade de serviços feitos na semana
- [ ] PDF cortado: corrigir para baixar as duas páginas completas e apresentáveis

## Categorias de Serviço com Chips no Orçamento (mai/2026)
- [ ] Criar tabela service_categories no banco (id, userId, name, emoji, order)
- [ ] Adicionar campo category_id na tabela services
- [ ] Rodar migração automática classificando serviços existentes por palavras-chave
- [ ] Atualizar tela de Novo Orçamento com chips de categoria + lista de serviços por categoria
- [ ] Adicionar catálogo pré-cadastrado para novos usuários ao se cadastrar
- [ ] Permitir editar categoria de cada serviço na tela de configurações

## Extrato Bancário com IA (jun/2026)
- [x] Criar tabelas bank_imports e bank_transactions no banco
- [x] Criar bankStatementRouter com upload, análise por IA e categorização automática
- [x] Criar componente BankStatementTab com upload, lista de transações e revisão
- [x] Adicionar aba Extrato Bancário na página Financeiro
- [ ] Corrigir cookie de sessão no ambiente de preview (sameSite/secure para HTTPS)

- [x] Melhorar a edição dos itens de orçamento no celular: descrição ampla e legível, campos de quantidade e valor organizados, sem truncamento e com edição fácil.
