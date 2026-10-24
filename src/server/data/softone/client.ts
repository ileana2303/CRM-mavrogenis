/**
 * Thin SoftOne Web Services (s1services) client.
 * Docs: docs/SOFTONE-SPEC.md. All calls are JSON POSTs with a `service` field.
 */

export interface S1Config {
  url: string;
  appId: string;
  company: string;
  branch: string;
  module: string;
  refId: string;
}

export function s1ConfigFromEnv(): S1Config {
  return {
    url: process.env.S1_URL ?? "",
    appId: process.env.S1_APPID ?? "1001",
    company: process.env.S1_COMPANY ?? "1000",
    branch: process.env.S1_BRANCH ?? "1000",
    module: process.env.S1_MODULE ?? "0",
    refId: process.env.S1_REFID ?? "1",
  };
}

export class S1Error extends Error {
  constructor(message: string, public readonly payload?: unknown) {
    super(message);
  }
}

export class S1Client {
  constructor(private readonly cfg: S1Config) {}

  async call<T = Record<string, unknown>>(body: Record<string, unknown>): Promise<T> {
    if (!this.cfg.url) throw new S1Error("S1_URL is not configured");
    const res = await fetch(this.cfg.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) throw new S1Error(`SoftOne HTTP ${res.status}`);
    const json = (await res.json()) as T & { success?: boolean; error?: string };
    if (json && json.success === false) throw new S1Error(json.error ?? "SoftOne error", json);
    return json;
  }

  /** login + authenticate → clientID */
  async login(username: string, password: string): Promise<string> {
    const l = await this.call<{ clientID: string }>({
      service: "login",
      username,
      password,
      appId: this.cfg.appId,
    });
    const a = await this.call<{ clientID: string }>({
      service: "authenticate",
      clientID: l.clientID,
      COMPANY: this.cfg.company,
      BRANCH: this.cfg.branch,
      MODULE: this.cfg.module,
      REFID: this.cfg.refId,
    });
    return a.clientID;
  }

  getData(clientID: string, OBJECT: string, KEY: string | number, LOCATEINFO?: string) {
    return this.call({ service: "getData", clientID, OBJECT, KEY, LOCATEINFO });
  }

  setData(clientID: string, OBJECT: string, DATA: Record<string, unknown[]>, KEY?: string | number) {
    return this.call<{ id: string }>({ service: "setData", clientID, OBJECT, KEY, DATA });
  }

  async browser(clientID: string, OBJECT: string, LIST: string, FILTERS: string, START = 0, LIMIT = 200) {
    const info = await this.call<{ reqID: string; totalcount: number }>({ service: "getBrowserInfo", clientID, OBJECT, LIST, FILTERS, VERSION: 2 });
    return this.call<{ rows: unknown[][]; fields: { name: string }[] }>({ service: "getBrowserData", clientID, reqID: info.reqID, START, LIMIT });
  }

  sqlData<T = Record<string, unknown>>(clientID: string, SqlName: string, params: Record<string, unknown> = {}) {
    return this.call<{ rows: T[] }>({ service: "SqlData", clientID, SqlName, ...params });
  }
}
