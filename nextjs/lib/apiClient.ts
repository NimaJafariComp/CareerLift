"use client";

import axios from "axios";
import { getSession, signOut } from "next-auth/react";

async function getJwt(): Promise<string | undefined> {
  try {
    const session = await getSession();
    return (session as any)?.fastapiJwt;
  } catch {
    return undefined;
  }
}

async function handleUnauthorized(): Promise<void> {
  if (typeof window !== "undefined" && window.location.pathname === "/login") {
    // Don't redirect-loop the login page itself.
    return;
  }
  try {
    await signOut({ callbackUrl: "/login" });
  } catch {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }
}

/** Drop-in fetch wrapper that attaches the user's FastAPI JWT and signs the
 *  user out on 401. Use everywhere you'd otherwise call `fetch()` against the
 *  FastAPI backend from a client component. */
export async function apiFetch(
  input: string | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const jwt = await getJwt();
  if (jwt && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${jwt}`);
  }
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) {
    await handleUnauthorized();
  }
  return res;
}

/** Shared axios instance with a JWT request interceptor and a 401 handler. */
export const apiAxios = axios.create();

apiAxios.interceptors.request.use(async (config) => {
  const jwt = await getJwt();
  if (jwt) {
    config.headers = config.headers || ({} as any);
    (config.headers as any).Authorization = `Bearer ${jwt}`;
  }
  return config;
});

apiAxios.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error?.response?.status === 401) {
      await handleUnauthorized();
    }
    return Promise.reject(error);
  },
);
