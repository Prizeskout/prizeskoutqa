import { Outlet, Link, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/auth-context";
import { GeoSuggestionContext } from "@/lib/lang-suggestion";
import { LangSuggestionPill } from "@/components/LangSuggestionPill";
import { Toaster } from "@/components/ui/sonner";
import { getGeoSuggestion } from "@/server/geo-suggest.functions";

import appCss from "../styles.css?url";


const SITE_TITLE = "PrizeSkout | Commerce Intelligence";
const SITE_DESCRIPTION =
  "AI-powered pricing intelligence for e-commerce platforms, physical retailers, and omnichannel brands.";

function NotFoundPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#FAFAF9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 28,
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: "#EA580C",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              fontWeight: 700,
              fontSize: 16,
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              lineHeight: 1,
            }}
          >
            P
          </span>
          <span
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "#1A1A18",
              fontFamily: '"Plus Jakarta Sans", sans-serif',
            }}
          >
            PrizeSkout
          </span>
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: "#EA580C",
            lineHeight: 1,
            fontFamily: '"Plus Jakarta Sans", sans-serif',
          }}
        >
          404
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "#1A1A18",
            marginTop: 16,
            fontFamily: '"Plus Jakarta Sans", sans-serif',
          }}
        >
          Page not found
        </div>
        <p
          style={{
            fontSize: 14,
            color: "#6B6B6B",
            marginTop: 8,
            lineHeight: 1.6,
            fontFamily: '"Plus Jakarta Sans", sans-serif',
          }}
        >
          The page you are looking for does not exist or has been moved.
        </p>
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <Link
            to="/dashboard"
            style={{
              display: "inline-block",
              background: "#EA580C",
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: 600,
              padding: "10px 20px",
              borderRadius: 8,
              textDecoration: "none",
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              transition: "background-color 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#C2410C")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#EA580C")}
          >
            Back to dashboard
          </Link>
          <Link
            to="/"
            style={{
              fontSize: 13,
              color: "#6B6B6B",
              textDecoration: "none",
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              transition: "color 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#EA580C")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#6B6B6B")}
          >
            Go to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}

const SITE_URL = "https://prizeskoutqa.lovable.app";

const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "PrizeSkout",
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.svg`,
  description: SITE_DESCRIPTION,
  foundingLocation: {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressCountry: "QA",
      addressLocality: "Doha",
    },
  },
  areaServed: ["Qatar", "Middle East"],
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "support@prizeskout.qa",
      availableLanguage: ["English", "Arabic"],
    },
  ],
};

const WEBSITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "PrizeSkout",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  publisher: {
    "@type": "Organization",
    name: "PrizeSkout",
  },
  inLanguage: "en",
};

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // Runs once on SSR; data is dehydrated into HTML and hydrated client-side.
  // staleTime: Infinity prevents re-fetching on client-side navigations
  // (CF-IPCountry is only meaningful on the initial request anyway).
  loader: async () => {
    try {
      const geo = await getGeoSuggestion();
      return { geo };
    } catch {
      return { geo: { suggestedLocale: null, country: null } as const };
    }
  },
  staleTime: Infinity,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: SITE_TITLE },
      { name: "description", content: SITE_DESCRIPTION },
      { property: "og:title", content: SITE_TITLE },
      { property: "og:description", content: SITE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
      { property: "og:site_name", content: "PrizeSkout" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: SITE_TITLE },
      { name: "twitter:description", content: SITE_DESCRIPTION },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(ORGANIZATION_JSON_LD),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(WEBSITE_JSON_LD),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundPage,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const loaderData = Route.useLoaderData();
  const geo = loaderData?.geo ?? { suggestedLocale: null, country: null };

  return (
    <QueryClientProvider client={queryClient}>
      <GeoSuggestionContext.Provider value={geo}>
        <AuthProvider>
          <a href="#main-content" className="skip-to-content">
            Skip to main content
          </a>
          <style>{`
            .skip-to-content {
              position: fixed;
              top: 8px;
              left: 8px;
              z-index: 1000;
              background: #EA580C;
              color: #FFFFFF;
              font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
              font-size: 13px;
              font-weight: 600;
              padding: 10px 16px;
              border-radius: 8px;
              text-decoration: none;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
              transform: translateY(-150%);
              transition: transform 0.15s ease;
            }
            .skip-to-content:focus,
            .skip-to-content:focus-visible {
              transform: translateY(0);
              outline: 2px solid #FFFFFF;
              outline-offset: 2px;
            }
            [id="main-content"]:focus { outline: none; }
          `}</style>
          <Outlet />
          <LangSuggestionPill />
          <Toaster position="bottom-right" richColors />
        </AuthProvider>
      </GeoSuggestionContext.Provider>
    </QueryClientProvider>
  );
}
