import { createFileRoute } from "@tanstack/react-router";
import standaloneLandingPage from "@/assets/landing/another-landing-page.html?raw";
import plusJakartaSansUrl from "@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2?url";

const landingPage = standaloneLandingPage.replaceAll(
  "__PS_PLUS_JAKARTA_SANS_URL__",
  plusJakartaSansUrl,
);

export const Route = createFileRoute("/")({
  server: {
    handlers: {
      GET: async () =>
        new Response(landingPage, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=0, must-revalidate",
            "X-Content-Type-Options": "nosniff",
          },
        }),
    },
  },
});
