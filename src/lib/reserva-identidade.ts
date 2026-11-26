export function normalizarNomeReserva(nome: string): string {
  return nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

export function normalizarTelefoneReserva(telefone: string): string {
  const digitos = telefone.replace(/\D/g, "");
  return /^55\d{10,11}$/.test(digitos) ? digitos.slice(2) : digitos;
}

export function mesmaIdentidadeReserva(
  reserva: { nome_completo: string; celular: string },
  cliente: { nome: string; celular: string },
): boolean {
  return normalizarNomeReserva(reserva.nome_completo) === normalizarNomeReserva(cliente.nome)
    && normalizarTelefoneReserva(reserva.celular) === normalizarTelefoneReserva(cliente.celular);
}
