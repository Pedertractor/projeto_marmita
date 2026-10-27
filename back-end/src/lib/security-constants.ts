/** Custo do bcrypt (work factor). 12 equilibra segurança e latência em login. */
export const BCRYPT_COST = 12;

/**
 * Hash bcrypt válido (custo 12) usado apenas para equalizar o tempo de resposta
 * quando o usuário não existe ou está inativo — evita enumeração por timing.
 * Não corresponde a nenhuma senha real do sistema.
 */
export const DUMMY_PASSWORD_HASH =
  '$2b$12$r2CjcgiZELvt8qr9Eb38S.fz1UuGZuQN3QrGx3Z2KtibOYjUk5BUe';
