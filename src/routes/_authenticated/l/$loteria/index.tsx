import { createFileRoute, redirect } from "@tanstack/react-router";
import { isLoteriaId } from "@/lib/loterias-config";

export const Route = createFileRoute("/_authenticated/l/$loteria/")({
  beforeLoad: ({ params }) => {
    if (!isLoteriaId(params.loteria)) throw redirect({ to: "/loterias" });
    throw redirect({
      to: "/l/$loteria/dashboard",
      params: { loteria: params.loteria },
    });
  },
});
