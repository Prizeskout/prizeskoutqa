import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

const FAVICON_SVG =
  "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%23EA580C'/><text x='16' y='22' text-anchor='middle' font-family='Arial' font-weight='700' font-size='18' fill='white'>P</text></svg>";

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

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: SITE_TITLE },
      { name: "description", content: SITE_DESCRIPTION },
      { property: "og:title", content: SITE_TITLE },
      { property: "og:description", content: SITE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: SITE_TITLE },
      { name: "twitter:description", content: SITE_DESCRIPTION },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: FAVICON_SVG },
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
  return <Outlet />;
}
