import { createFileRoute } from "@tanstack/react-router";
import standaloneLandingPage from "@/assets/landing/another-landing-page.html?raw";

export const Route = createFileRoute("/")({
  server: {
    handlers: {
      GET: async () =>
        new Response(standaloneLandingPage, {
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
