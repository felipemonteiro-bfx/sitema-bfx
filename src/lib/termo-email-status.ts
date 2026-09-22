export const TERMO_EMAIL_STATUS_VALUES = ["pendente", "enviado", "falhou", "sem_email", "erro_dados"] as const;
export type TermoEmailStatus = (typeof TERMO_EMAIL_STATUS_VALUES)[number];
