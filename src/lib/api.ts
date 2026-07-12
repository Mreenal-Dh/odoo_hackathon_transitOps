export const getAuthToken = () => localStorage.getItem("transitops_token");
export const setAuthToken = (token: string) => localStorage.setItem("transitops_token", token);
export const removeAuthToken = () => localStorage.removeItem("transitops_token");

export const getUserData = () => {
  const data = localStorage.getItem("transitops_user");
  try {
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const setUserData = (user: any) => {
  localStorage.setItem("transitops_user", JSON.stringify(user));
};

export const removeUserData = () => {
  localStorage.removeItem("transitops_user");
};

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}
