/**
 * Validação de endereço de e-mail, sem dependência de Node: usada no servidor
 * (montagem MIME, `email-copia`) e no formulário do cadastro (client).
 */
const EMAIL_ADDRESS_PATTERN = /^[^\s@<>(),:;[\]\\"]+@[^\s@<>(),:;[\]\\"]+$/;

export function assertSafeEmailAddresses(addresses: string[], label = "endereço de e-mail"): void {
  for (const address of addresses) {
    if (!address || /[\u0000-\u001f\u007f]/.test(address) || !EMAIL_ADDRESS_PATTERN.test(address)) {
      throw new Error(`${label} inválido`);
    }
  }
}
