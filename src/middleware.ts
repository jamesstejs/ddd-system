import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type AppRole = "super_admin" | "admin" | "technik" | "klient";

const ROLE_ROUTES: Record<string, AppRole[]> = {
  "/klienti": ["admin", "super_admin"],
  "/zakazky": ["admin", "super_admin", "technik"],
  "/kalendar": ["admin", "super_admin", "technik"],
  "/uzivatele": ["admin", "super_admin"],
  "/nastaveni": ["super_admin"],
};

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Skip auth check if Supabase is not configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("your-project-ref")) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh session if expired
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    return supabaseResponse;
  }

  // Public routes that don't require auth
  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/reset-password") ||
    request.nextUrl.pathname.startsWith("/auth");

  // Redirect unauthenticated users to login
  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthRoute && !request.nextUrl.pathname.startsWith("/auth/callback")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Role-based route protection
  if (user) {
    const pathname = request.nextUrl.pathname;

    // Find matching protected route
    const protectedRoute = Object.keys(ROLE_ROUTES).find(
      (route) => pathname === route || pathname.startsWith(route + "/")
    );

    if (protectedRoute) {
      // Fetch user's active role from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("aktivni_role")
        .eq("id", user.id)
        .is("deleted_at", null)
        .single();

      const aktivniRole = profile?.aktivni_role as AppRole | undefined;
      const allowedRoles = ROLE_ROUTES[protectedRoute];

      if (!aktivniRole || !allowedRoles.includes(aktivniRole)) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
