import { logHttpOutbound } from "../../lib/http-debug";

/**
 * SoftOne Web Services client for mavrogenis.oncloud.gr (Series 6).
 *
 * Two kinds of calls:
 *   - standard services: POST /s1services        { service: "login" | "authenticate" | ... }
 *   - JS web scripts:    POST /s1services/JS/<script>/<function>  { clientID, ...params }
 *     (the owner writes these in SoftOne; contract in docs/SOFTONE-API.md)
 *
 * The server answers gzip + `charset=windows-1253`; we decode by the declared charset.
 */

export interface S1Config {
  url: string;
  appId: number;
  company: number;
  branch: number;
  refId: number;
  module?: number;
}

export function s1ConfigFromEnv(): S1Config {
  return {
    url: process.env.S1_URL ?? "https://mavrogenis.oncloud.gr/s1services",
    appId: Number(process.env.S1_APPID ?? 1306),
    company: Number(process.env.S1_COMPANY ?? 1001),
    branch: Number(process.env.S1_BRANCH ?? 1000),
    refId: Number(process.env.S1_REFID || 0), // fallback only; normally taken from login objs
    module: process.env.S1_MODULE ? Number(process.env.S1_MODULE) : undefined,
  };
}

export class S1Error extends Error {
  constructor(message: string, public readonly payload?: unknown) {
    super(message);
  }
}

export interface S1Envelope<T> {
  success: boolean;
  error?: string;
  errorcode?: number;
  data?: T;
  page?: number;
  pageSize?: number;
  totalCount?: number;
}

export interface S1LoginInfo {
  clientID: string;
  objs: Array<{ COMPANY: string; BRANCH: string; MODULE: string; REFID: string; REFIDNAME: string; USERID: string; COMPANYNAME: string }>;
  ver: string;
}

export class S1Client {
  constructor(private readonly cfg: S1Config) {}

  private async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    if (!this.cfg.url) throw new S1Error("S1_URL is not configured");
    const url = this.cfg.url + path;
    const label = path ? `SoftOne JS ${path}` : `SoftOne ${String(body.service ?? "service")}`;
    const t0 = performance.now();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const charset = /charset=([\w-]+)/i.exec(res.headers.get("content-type") ?? "")?.[1] ?? "utf-8";
    const text = new TextDecoder(charset).decode(await res.arrayBuffer());
    logHttpOutbound(label, url, body, { status: res.status, bodyText: text }, performance.now() - t0);
    if (!res.ok) throw new S1Error(`SoftOne HTTP ${res.status}`);
    let json: T & { success?: boolean; error?: string };
    try {
      json = JSON.parse(text);
    } catch {
      // hand-built JSON strings in the SoftOne scripts sometimes carry a trailing comma: {"a":1,}
      try {
        json = JSON.parse(text.replace(/,\s*([}\]])/g, "$1"));
      } catch {
        throw new S1Error(`SoftOne returned non-JSON: ${text.slice(0, 200)}`);
      }
    }
    if (json && json.success === false) throw new S1Error(json.error ?? "SoftOne error", json);
    return json;
  }

  /** Standard service call (login, authenticate, getData, setData, …). `appid` is required on every call. */
  service<T = Record<string, unknown>>(service: string, body: Record<string, unknown>) {
    return this.post<T>("", { service, appid: this.cfg.appId, ...body });
  }

  /** Standard getData: whole object (all tables) by key. */
  getData<T = Record<string, Array<Record<string, string>>>>(clientID: string, object: string, key: string | number, locateinfo?: string, form?: string) {
    return this.service<{ data: T }>("getData", { clientID, object, ...(form ? { form } : {}), key, ...(locateinfo ? { locateinfo } : {}) });
  }

  /** Standard calculate: runs SoftOne's pricing / totals on a draft without saving; answers like getData. */
  calculate<T = Record<string, Array<Record<string, string>>>>(clientID: string, object: string, data: Record<string, Array<Record<string, unknown>>>, form?: string, key?: string | number) {
    return this.service<{ data: T }>("calculate", { clientID, object, ...(form ? { form } : {}), ...(key !== undefined ? { key } : {}), data });
  }

  /** Standard setData: insert (no key) or update (key) an object; returns the record id. */
  setData(clientID: string, object: string, data: Record<string, Array<Record<string, unknown>>>, key?: string | number, form?: string) {
    return this.service<{ id: string }>("setData", { clientID, object, ...(form ? { form } : {}), ...(key !== undefined ? { key } : {}), data });
  }

  delData(clientID: string, object: string, key: string | number) {
    return this.service("delData", { clientID, object, key });
  }

  /** JS web-script call: /JS/<script>/<fn>. Returns the whole envelope (data + paging). */
  js<T = unknown>(clientID: string, script: string, fn: string, params: Record<string, unknown> = {}) {
    return this.post<S1Envelope<T>>(`/JS/${script}/${fn}`, { clientID, ...params });
  }

  /** login + authenticate → clientID bound to COMPANY/BRANCH/REFID. */
  async login(username: string, password: string): Promise<{ clientID: string; info: S1LoginInfo }> {
    const info = await this.service<S1LoginInfo>("login", { username, password, appid: this.cfg.appId });
    const obj = info.objs?.[0];
    // REFID identifies the person behind the web account and differs per user → always from the login response.
    const auth = await this.service<{ clientID: string }>("authenticate", {
      clientID: info.clientID,
      COMPANY: this.cfg.company || Number(obj?.COMPANY),
      BRANCH: this.cfg.branch || Number(obj?.BRANCH),
      REFID: Number(obj?.REFID) || this.cfg.refId,
      ...(this.cfg.module !== undefined ? { MODULE: this.cfg.module } : {}),
    });
    return { clientID: auth.clientID, info };
  }

  /** Ask SoftOne to reload JS scripts after editing them. */
  async refreshScripts() {
    await fetch(`${this.cfg.url}?refresh`, { cache: "no-store" });
  }
}
