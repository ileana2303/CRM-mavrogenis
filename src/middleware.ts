import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/server/auth/jwt";
import { LAST_DOCTOR_COOKIE } from "@/lib/constants";

const PUBLIC = ["/login", "/manifest.webmanifest", "/sw.js", "/icons", "/offline"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) return NextResponse.next();

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/manager") && session.role !== "MANAGER") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  if (pathname.startsWith("/support") && session.role !== "SUPPORT" && session.role !== "MANAGER") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  if (pathname === "/") {
    return NextResponse.redirect(new URL(session.role === "SUPPORT" ? "/support/requests" : "/dashboard", req.url));
  }

  const res = NextResponse.next();
  // Remember the last opened customer so «Κεντρική Καρτέλα» in the nav goes straight there.
  const m = pathname.match(/^\/customers\/([^/]+)/);
  if (m && m[1] !== "new" && m[1] !== "results") {
    res.cookies.set(LAST_DOCTOR_COOKIE, m[1], { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|webmanifest|js)$).*)"],
};
