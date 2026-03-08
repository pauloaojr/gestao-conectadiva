/**
 * Estrutura de documentação para endpoints da API externa.
 * Cada endpoint inclui método HTTP, URL, descrição, parâmetros e exemplos.
 */

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiEndpointDoc {
  /** Nome do recurso (ex: Pacientes) */
  resource: string;
  /** Método HTTP */
  method: HttpMethod;
  /** Descrição curta */
  summary: string;
  /** Descrição detalhada */
  description?: string;
  /** Path base (ex: /functions/v1/api-patients) */
  path: string;
  /** Query params para GET (ex: ?page=1&limit=20&search=...) */
  queryParams?: { name: string; type: string; required: boolean; description: string }[];
  /** Body params para POST/PUT/PATCH */
  bodyParams?: { name: string; type: string; required: boolean; description: string }[];
  /** Exemplo de request (JSON) */
  requestExample?: string;
  /** Exemplo de response (JSON) */
  responseExample?: string;
  /** Códigos de resposta esperados */
  responseCodes?: { code: number; description: string }[];
}

/** Lista de endpoints documentados. A base URL vem de VITE_SUPABASE_URL. */
export const API_ENDPOINTS: ApiEndpointDoc[] = [
  {
    resource: "Pacientes",
    method: "GET",
    summary: "Listar pacientes",
    description: "Retorna lista paginada de pacientes, com filtro opcional por busca.",
    path: "/functions/v1/api-patients",
    queryParams: [
      { name: "page", type: "number", required: false, description: "Página (padrão: 1)" },
      { name: "limit", type: "number", required: false, description: "Itens por página (1-50, padrão: 20)" },
      { name: "search", type: "string", required: false, description: "Busca em nome, CPF ou e-mail" },
    ],
    responseExample: JSON.stringify(
      {
        data: [
          {
            id: "uuid",
            name: "João Silva",
            cpf: "123.456.789-00",
            email: "joao@email.com",
            phone: "(11) 99999-9999",
            birth_date: "1990-01-15",
            status: "active",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
        ],
        meta: {
          page: 1,
          limit: 20,
          total: 100,
          total_pages: 5,
        },
      },
      null,
      2
    ),
    responseCodes: [
      { code: 200, description: "Sucesso" },
      { code: 401, description: "Token inválido ou ausente" },
    ],
  },
  {
    resource: "Pacientes",
    method: "GET",
    summary: "Obter paciente por ID",
    description: "Retorna um paciente específico pelo ID.",
    path: "/functions/v1/api-patients?id={uuid}",
    queryParams: [{ name: "id", type: "string (UUID)", required: true, description: "ID do paciente" }],
    responseExample: JSON.stringify(
      {
        id: "uuid",
        name: "João Silva",
        cpf: "123.456.789-00",
        email: "joao@email.com",
        phone: "(11) 99999-9999",
        birth_date: "1990-01-15",
        gender: "masculino",
        marital_status: "casado",
        status: "active",
        notes: null,
        address_street: "Rua Example",
        address_number: "123",
        address_city: "São Paulo",
        address_state: "SP",
        address_cep: "01234-567",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
      null,
      2
    ),
    responseCodes: [
      { code: 200, description: "Sucesso" },
      { code: 404, description: "Paciente não encontrado" },
      { code: 401, description: "Token inválido ou ausente" },
    ],
  },
  {
    resource: "Pacientes",
    method: "POST",
    summary: "Cadastrar paciente",
    description: "Cria um novo paciente.",
    path: "/functions/v1/api-patients",
    bodyParams: [
      { name: "name", type: "string", required: true, description: "Nome completo" },
      { name: "cpf", type: "string", required: false, description: "CPF" },
      { name: "rg", type: "string", required: false, description: "RG" },
      { name: "email", type: "string", required: false, description: "E-mail" },
      { name: "phone", type: "string", required: false, description: "Telefone" },
      { name: "birth_date", type: "string (YYYY-MM-DD)", required: false, description: "Data de nascimento" },
      { name: "gender", type: "string", required: false, description: "Gênero" },
      { name: "marital_status", type: "string", required: false, description: "Estado civil" },
      { name: "profession", type: "string", required: false, description: "Profissão" },
      { name: "notes", type: "string", required: false, description: "Observações" },
      { name: "status", type: "string", required: false, description: "active | inactive | pending (padrão: active)" },
      { name: "address_cep", type: "string", required: false, description: "CEP" },
      { name: "address_city", type: "string", required: false, description: "Cidade" },
      { name: "address_neighborhood", type: "string", required: false, description: "Bairro" },
      { name: "address_street", type: "string", required: false, description: "Logradouro" },
      { name: "address_number", type: "string", required: false, description: "Número" },
      { name: "address_complement", type: "string", required: false, description: "Complemento" },
      { name: "address_state", type: "string", required: false, description: "UF" },
      { name: "plan_id", type: "string (UUID)", required: false, description: "ID do plano" },
    ],
    requestExample: JSON.stringify(
      {
        name: "Maria Santos",
        cpf: "987.654.321-00",
        email: "maria@email.com",
        phone: "(11) 88888-8888",
        birth_date: "1985-05-20",
        status: "active",
      },
      null,
      2
    ),
    responseCodes: [
      { code: 201, description: "Paciente criado" },
      { code: 400, description: "Dados inválidos (ex: name obrigatório)" },
      { code: 409, description: "CPF ou e-mail já cadastrado" },
      { code: 401, description: "Token inválido ou ausente" },
    ],
  },
  {
    resource: "Pacientes",
    method: "PUT",
    summary: "Atualizar paciente",
    description: "Atualiza um paciente existente. Use id na query string.",
    path: "/functions/v1/api-patients?id={uuid}",
    queryParams: [{ name: "id", type: "string (UUID)", required: true, description: "ID do paciente" }],
    bodyParams: [
      { name: "name", type: "string", required: false, description: "Nome completo" },
      { name: "cpf", type: "string", required: false, description: "CPF" },
      { name: "email", type: "string", required: false, description: "E-mail" },
      { name: "phone", type: "string", required: false, description: "Telefone" },
      { name: "birth_date", type: "string", required: false, description: "Data de nascimento" },
      { name: "gender", type: "string", required: false, description: "Gênero" },
      { name: "marital_status", type: "string", required: false, description: "Estado civil" },
      { name: "profession", type: "string", required: false, description: "Profissão" },
      { name: "notes", type: "string", required: false, description: "Observações" },
      { name: "status", type: "string", required: false, description: "active | inactive | pending" },
      { name: "address_*", type: "string", required: false, description: "Campos de endereço" },
    ],
    requestExample: JSON.stringify(
      { name: "Maria Santos Silva", phone: "(11) 77777-7777" },
      null,
      2
    ),
    responseCodes: [
      { code: 200, description: "Paciente atualizado" },
      { code: 400, description: "id ausente ou sem campos para atualizar" },
      { code: 404, description: "Paciente não encontrado" },
      { code: 409, description: "CPF ou e-mail já cadastrado" },
      { code: 401, description: "Token inválido ou ausente" },
    ],
  },
  {
    resource: "Pacientes",
    method: "DELETE",
    summary: "Excluir paciente",
    description: "Remove um paciente. Use id na query string.",
    path: "/functions/v1/api-patients?id={uuid}",
    queryParams: [{ name: "id", type: "string (UUID)", required: true, description: "ID do paciente" }],
    responseExample: JSON.stringify({ message: "Paciente excluído com sucesso" }, null, 2),
    responseCodes: [
      { code: 200, description: "Paciente excluído" },
      { code: 400, description: "id ausente" },
      { code: 401, description: "Token inválido ou ausente" },
    ],
  },
];
