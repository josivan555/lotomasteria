export const JOGOS_POR_CREDITO = 10;

export type CreditPackage = {
  id: string;
  credits: number;
  price: number;
  destaque?: boolean;
};

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: "p10", credits: 10, price: 9.9 },
  { id: "p30", credits: 30, price: 24.9, destaque: true },
  { id: "p100", credits: 100, price: 69.9 },
];

export function getPackage(id: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((p) => p.id === id);
}

export function creditosNecessarios(qtdJogos: number): number {
  return Math.ceil(qtdJogos / JOGOS_POR_CREDITO);
}

export function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
