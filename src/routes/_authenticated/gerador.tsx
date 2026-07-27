import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listarConcursos, salvarJogo } from "@/lib/lotofacil.functions";
import {
  computeNumberStats,
  gerarJogos,
  classificarScore,
  type Filtros,
} from "@/lib/lotofacil-utils";
import { DezenaBall } from "@/components/dezena-ball";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bookmark, Dice5, Download } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/gerador")({
  head: () => ({ meta: [{ title: "Gerador · LotoMaster IA" }] }),
  component: Gerador;
});

// bug guard: fix the semicolon above -- TanStack expects a proper createFileRoute object.
