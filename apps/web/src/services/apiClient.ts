type ApiErrorBody = {
  message?: string | string[];
  code?: string;
  error?: string;
};

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

const rawBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

function normalizeBaseUrl(value: string): string {
  const withoutTrailingSlash = value.replace(/\/+$/, "");
  return withoutTrailingSlash.endsWith("/api/v1")
    ? withoutTrailingSlash
    : `${withoutTrailingSlash}/api/v1`;
}

const apiBaseUrl = normalizeBaseUrl(rawBaseUrl);

function businessMessage(code?: string, fallback?: string): string {
  const messages: Record<string, string> = {
    INSUFFICIENT_FUNDS: "Saldo insuficiente para concluir esta compra.",
    INSUFFICIENT_BALANCE: "Saldo insuficiente para realizar a compra.",
    INSUFFICIENT_POSITION:
      "Voce nao possui quantidade suficiente para vender este ativo.",
    SELL_QUANTITY_EXCEEDS_POSITION:
      "Quantidade maior que a posicao disponivel.",
    POSITION_NOT_FOUND: "Voce ainda nao possui posicao neste ativo.",
    INVALID_QUANTITY: "Informe uma quantidade inteira maior que zero.",
    INVALID_ORDER_QUANTITY: "Informe uma quantidade inteira maior que zero.",
    ASSET_NOT_FOUND: "Ativo nao encontrado.",
    NO_INCOME_AVAILABLE: "Nao ha rendimentos disponiveis para coleta agora.",
    INCOME_NOT_AVAILABLE: "Nao ha rendimentos disponiveis para coleta agora.",
    INCOME_ALREADY_COLLECTED: "Este rendimento ja foi coletado.",
    MISSION_ALREADY_COMPLETED: "Esta missao ja foi concluida.",
    PLAYER_NOT_FOUND: "Jogador nao encontrado. Crie um novo jogador para continuar.",
  };
  return (code ? messages[code] : undefined) ?? fallback ?? "Nao foi possivel concluir a solicitacao.";
}

export async function apiClient<TResponse>(
  path: string,
  init: RequestInit = {},
): Promise<TResponse> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    let errorBody: ApiErrorBody | undefined;
    try {
      errorBody = (await response.json()) as ApiErrorBody;
    } catch {
      errorBody = undefined;
    }

    const rawMessage = Array.isArray(errorBody?.message)
      ? errorBody?.message.join(" ")
      : errorBody?.message;
    throw new ApiClientError(
      businessMessage(errorBody?.code ?? errorBody?.error, rawMessage),
      response.status,
      errorBody?.code ?? errorBody?.error,
    );
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}
