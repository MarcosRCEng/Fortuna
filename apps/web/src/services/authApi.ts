import { ApiClientError, apiRootUrl } from "./apiClient.js";

export type AuthSession = {
  user: {
    id: string;
    email: string;
    name?: string;
    avatarUrl?: string;
  };
  player: {
    id: string;
    nickname?: string;
    level?: number;
  };
};

export function loginWithGoogle(): void {
  window.location.assign(`${apiRootUrl}/auth/google`);
}

export function getCurrentSession(): Promise<AuthSession> {
  return authRequest<AuthSession>("/auth/me");
}

export function logout(): Promise<{ ok: true }> {
  return authRequest<{ ok: true }>("/auth/logout", { method: "POST" });
}

async function authRequest<TResponse>(
  path: string,
  init: RequestInit = {},
): Promise<TResponse> {
  const response = await fetch(`${apiRootUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new ApiClientError("Sessao nao autenticada.", response.status);
  }

  return (await response.json()) as TResponse;
}
