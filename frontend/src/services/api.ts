import axios from "axios";

const apiOrigin = (
  import.meta.env.VITE_API_URL ?? "http://localhost:4000"
).replace(/\/$/, "");

export const apiBaseUrl = `${apiOrigin}/api/v1`;

const client = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export async function api<T>(
  path: string,
  init?: { method?: string; body?: string },
): Promise<T> {
  const response = await client.request<T>({
    url: path,
    method: init?.method ?? "GET",
    data: init?.body,
  });
  return response.data;
}

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const body = error.response?.data as
      { message?: string | string[] } | undefined;
    const message = Array.isArray(body?.message)
      ? body.message.join(" ")
      : body?.message;
    return Promise.reject(
      new Error(message || error.message || "Não foi possível acessar a API."),
    );
  },
);

export function queryString(
  values: Record<string, string | number | undefined | null>,
) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "")
      query.set(key, String(value));
  });
  const result = query.toString();
  return result ? `?${result}` : "";
}
