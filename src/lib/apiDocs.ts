/**
 * Estrutura de documentação para endpoints da API externa.
 * Endpoints organizados por menu (Pacientes, Receitas, Despesas).
 */

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiEndpointDoc {
  resource: string;
  method: HttpMethod;
  summary: string;
  description?: string;
  path: string;
  queryParams?: { name: string; type: string; required: boolean; description: string }[];
  bodyParams?: { name: string; type: string; required: boolean; description: string }[];
  requestExample?: string;
  responseExample?: string;
  responseCodes?: { code: number; description: string }[];
}

export type ApiMenuId = "pacientes" | "receitas" | "despesas";

/** baseUrlKey: backend = URL do backend (VITE_BACKEND_URL), supabase = URL do Supabase (VITE_SUPABASE_URL) */
export type ApiBaseUrlKey = "backend" | "supabase";

export interface ApiMenuGroup {
  id: ApiMenuId;
  label: string;
  /** baseUrlKey para resolver a URL base: backend ou supabase */
  baseUrlKey: ApiBaseUrlKey;
  endpoints: ApiEndpointDoc[];
}

const pacientesEndpoints: ApiEndpointDoc[] = [
  {
    resource: "Pacientes",
    method: "GET",
    summary: "Listar pacientes",
    description: "Retorna lista paginada de pacientes, com filtro opcional por busca.",
    path: "/api/patients",
    queryParams: [
      { name: "page", type: "number", required: false, description: "Página (padrão: 1)" },
      { name: "limit", type: "number", required: false, description: "Itens por página (1-50)" },
      { name: "search", type: "string", required: false, description: "Busca em nome, CPF ou e-mail" },
    ],
    responseExample: JSON.stringify({ data: [], meta: { page: 1, limit: 20, total: 0, total_pages: 0 } }, null, 2),
    responseCodes: [{ code: 200, description: "Sucesso" }, { code: 401, description: "Token inválido" }],
  },
  {
    resource: "Pacientes",
    method: "GET",
    summary: "Obter paciente por ID",
    path: "/api/patients?id={uuid}",
    queryParams: [{ name: "id", type: "string (UUID)", required: true, description: "ID do paciente" }],
    responseCodes: [{ code: 200, description: "Sucesso" }, { code: 404, description: "Não encontrado" }],
  },
  {
    resource: "Pacientes",
    method: "POST",
    summary: "Cadastrar paciente",
    path: "/api/patients",
    bodyParams: [
      { name: "name", type: "string", required: true, description: "Nome completo" },
      { name: "cpf", type: "string", required: false, description: "CPF" },
      { name: "email", type: "string", required: false, description: "E-mail" },
      { name: "phone", type: "string", required: false, description: "Telefone" },
      { name: "birth_date", type: "string (YYYY-MM-DD)", required: false, description: "Data nascimento" },
      { name: "marital_status", type: "string", required: false, description: "Estado civil" },
    ],
    requestExample: JSON.stringify({ name: "Maria Santos", cpf: "123.456.789-00", email: "maria@email.com" }, null, 2),
    responseCodes: [{ code: 201, description: "Criado" }, { code: 400, description: "Dados inválidos" }],
  },
  {
    resource: "Pacientes",
    method: "PUT",
    summary: "Atualizar paciente",
    path: "/api/patients?id={uuid}",
    queryParams: [{ name: "id", type: "string (UUID)", required: true, description: "ID do paciente" }],
    requestExample: JSON.stringify({ name: "Maria Santos Silva", phone: "(11) 77777-7777" }, null, 2),
    responseCodes: [{ code: 200, description: "Atualizado" }, { code: 404, description: "Não encontrado" }],
  },
  {
    resource: "Pacientes",
    method: "DELETE",
    summary: "Excluir paciente",
    path: "/api/patients?id={uuid}",
    queryParams: [{ name: "id", type: "string (UUID)", required: true, description: "ID do paciente" }],
    responseCodes: [{ code: 200, description: "Excluído" }, { code: 404, description: "Não encontrado" }],
  },
];

const receitasEndpoints: ApiEndpointDoc[] = [
  {
    resource: "Receitas",
    method: "GET",
    summary: "Listar receitas",
    description: "Retorna lista paginada de receitas, ordenada por data (mais recente primeiro).",
    path: "/api/revenue",
    queryParams: [
      { name: "page", type: "number", required: false, description: "Página (padrão: 1)" },
      { name: "limit", type: "number", required: false, description: "Itens por página (1-50)" },
      { name: "search", type: "string", required: false, description: "Busca em descrição ou nome do paciente" },
    ],
    responseExample: JSON.stringify({ data: [], meta: { page: 1, limit: 20, total: 0, total_pages: 0 } }, null, 2),
    responseCodes: [{ code: 200, description: "Sucesso" }, { code: 401, description: "Token inválido" }],
  },
  {
    resource: "Receitas",
    method: "GET",
    summary: "Obter receita por ID",
    path: "/api/revenue?id={uuid}",
    queryParams: [{ name: "id", type: "string (UUID)", required: true, description: "ID da receita" }],
    responseCodes: [{ code: 200, description: "Sucesso" }, { code: 404, description: "Não encontrada" }],
  },
  {
    resource: "Receitas",
    method: "POST",
    summary: "Cadastrar receita",
    path: "/api/revenue",
    bodyParams: [
      { name: "amount", type: "number", required: true, description: "Valor (obrigatório)" },
      { name: "description", type: "string", required: false, description: "Descrição" },
      { name: "revenue_date", type: "string (YYYY-MM-DD)", required: false, description: "Data (padrão: hoje)" },
      { name: "status", type: "string", required: false, description: "pending | received" },
      { name: "patient_id", type: "string (UUID)", required: false, description: "ID do paciente" },
      { name: "patient_name", type: "string", required: false, description: "Nome do paciente" },
      { name: "category_id", type: "string (UUID)", required: false, description: "ID da categoria" },
    ],
    requestExample: JSON.stringify({ amount: 150.0, description: "Consulta", revenue_date: "2024-01-15", status: "received" }, null, 2),
    responseCodes: [{ code: 201, description: "Criada" }, { code: 400, description: "amount obrigatório" }],
  },
  {
    resource: "Receitas",
    method: "PUT",
    summary: "Atualizar receita",
    path: "/api/revenue?id={uuid}",
    queryParams: [{ name: "id", type: "string (UUID)", required: true, description: "ID da receita" }],
    requestExample: JSON.stringify({ amount: 200.0, status: "received" }, null, 2),
    responseCodes: [{ code: 200, description: "Atualizada" }, { code: 404, description: "Não encontrada" }],
  },
  {
    resource: "Receitas",
    method: "DELETE",
    summary: "Excluir receita",
    path: "/api/revenue?id={uuid}",
    queryParams: [{ name: "id", type: "string (UUID)", required: true, description: "ID da receita" }],
    responseCodes: [{ code: 200, description: "Excluída" }, { code: 404, description: "Não encontrada" }],
  },
];

const despesasEndpoints: ApiEndpointDoc[] = [
  {
    resource: "Despesas",
    method: "GET",
    summary: "Listar despesas",
    description: "Retorna lista paginada de despesas, ordenada por data (mais recente primeiro).",
    path: "/api/expenses",
    queryParams: [
      { name: "page", type: "number", required: false, description: "Página (padrão: 1)" },
      { name: "limit", type: "number", required: false, description: "Itens por página (1-50)" },
      { name: "search", type: "string", required: false, description: "Busca em descrição ou nome do paciente" },
    ],
    responseExample: JSON.stringify({ data: [], meta: { page: 1, limit: 20, total: 0, total_pages: 0 } }, null, 2),
    responseCodes: [{ code: 200, description: "Sucesso" }, { code: 401, description: "Token inválido" }],
  },
  {
    resource: "Despesas",
    method: "GET",
    summary: "Obter despesa por ID",
    path: "/api/expenses?id={uuid}",
    queryParams: [{ name: "id", type: "string (UUID)", required: true, description: "ID da despesa" }],
    responseCodes: [{ code: 200, description: "Sucesso" }, { code: 404, description: "Não encontrada" }],
  },
  {
    resource: "Despesas",
    method: "POST",
    summary: "Cadastrar despesa",
    path: "/api/expenses",
    bodyParams: [
      { name: "amount", type: "number", required: true, description: "Valor (obrigatório)" },
      { name: "description", type: "string", required: false, description: "Descrição" },
      { name: "expense_date", type: "string (YYYY-MM-DD)", required: false, description: "Data (padrão: hoje)" },
      { name: "status", type: "string", required: false, description: "Status da despesa" },
      { name: "patient_id", type: "string (UUID)", required: false, description: "ID do paciente" },
      { name: "patient_name", type: "string", required: false, description: "Nome do paciente" },
      { name: "category_id", type: "string (UUID)", required: false, description: "ID da categoria" },
    ],
    requestExample: JSON.stringify({ amount: 89.9, description: "Material de escritório", expense_date: "2024-01-15" }, null, 2),
    responseCodes: [{ code: 201, description: "Criada" }, { code: 400, description: "amount obrigatório" }],
  },
  {
    resource: "Despesas",
    method: "PUT",
    summary: "Atualizar despesa",
    path: "/api/expenses?id={uuid}",
    queryParams: [{ name: "id", type: "string (UUID)", required: true, description: "ID da despesa" }],
    requestExample: JSON.stringify({ amount: 99.9, description: "Material atualizado" }, null, 2),
    responseCodes: [{ code: 200, description: "Atualizada" }, { code: 404, description: "Não encontrada" }],
  },
  {
    resource: "Despesas",
    method: "DELETE",
    summary: "Excluir despesa",
    path: "/api/expenses?id={uuid}",
    queryParams: [{ name: "id", type: "string (UUID)", required: true, description: "ID da despesa" }],
    responseCodes: [{ code: 200, description: "Excluída" }, { code: 404, description: "Não encontrada" }],
  },
];

/** Documentação agrupada por menu */
export const API_MENUS: ApiMenuGroup[] = [
  { id: "pacientes", label: "Pacientes", baseUrlKey: "backend", endpoints: pacientesEndpoints },
  { id: "receitas", label: "Receitas", baseUrlKey: "backend", endpoints: receitasEndpoints },
  { id: "despesas", label: "Despesas", baseUrlKey: "backend", endpoints: despesasEndpoints },
];

/** Lista plana de todos os endpoints (legado) */
export const API_ENDPOINTS: ApiEndpointDoc[] = API_MENUS.flatMap((m) => m.endpoints);
