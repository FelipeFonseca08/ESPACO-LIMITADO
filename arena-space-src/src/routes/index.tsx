import { createFileRoute } from "@tanstack/react-router";
import { ArenaApp } from "@/arena/ui/ArenaApp";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ARENA SPACE — batalha espacial local para até 4 jogadores" },
      { name: "description", content: "Jogo de batalha espacial top-down para 2 a 4 jogadores no mesmo computador, com teclado ou controles, habilidades e zona segura." },
      { property: "og:title", content: "ARENA SPACE" },
      { property: "og:description", content: "Batalha espacial local: 5 naves, habilidades, zona segura e lasers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ArenaApp,
});
