-- Impede cadastrar o mesmo cliente duas vezes trocando so o acento.
--
-- O UNIQUE que ja existia (clientes_nome_key) e sensivel a acento, entao
-- "TAIS SILVA DE SOUSA" entrava tranquilo mesmo com "TAÍS SILVA DE SOUSA" no
-- banco — e foi exatamente o que aconteceu (ids 583 e 627, mesmo CPF, mesma
-- empresa; consolidados em 627 antes desta migration).
--
-- O clientes_nome_key CONTINUA existindo de proposito: e ele que sustenta o
-- @unique de `nome` no schema.prisma e o findUnique({ where: { nome } }). Este
-- indice aqui e uma trava adicional, mais estrita.
--
-- f_unaccent e IMMUTABLE (criada em 20260320100000_fuzzy_search_indexes), que e
-- o requisito pra entrar em indice funcional.
--
-- Violacao levanta P2002 no Prisma, que o addCliente/updateCliente ja traduz
-- pra "Ja existe um cliente com esse nome. Use um nome diferente." — nao
-- precisa de tratamento novo.
CREATE UNIQUE INDEX IF NOT EXISTS clientes_nome_unaccent_key
  ON clientes (f_unaccent(upper(nome)));
