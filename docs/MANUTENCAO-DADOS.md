# Manutenção de dados em produção

Registro das alterações feitas **direto no banco**, fora de migração. Existe porque esse tipo de
mudança não deixa rastro no git: sem isto, daqui a alguns meses ninguém sabe que os dados foram
tocados, por quê, nem como voltar atrás.

Regra ao acrescentar uma entrada aqui: **nunca versione o dado pessoal em si**. Os valores
originais ficam nos arquivos de backup, que moram fora do repositório justamente por isso.

---

## 2026-08-05 — Normalização dos telefones de clientes

**Motivo.** A coluna `clientes.telefone` acumulava formatos incompatíveis — variando parênteses,
espaços e agrupamento, além de dígitos crus e números sem DDD. Isso não era só estética: o
pré-atendimento do WhatsApp busca o cliente pelo telefone e só encontrava quem estivesse gravado
sem formatação — **32 de 813**.

**Escopo.** Apenas `clientes.telefone`. As outras colunas de telefone do schema
(`fornecedores.telefone`, `empresas_parceiras.telefone_rh`, `usuarios.telefone`) estavam todas
vazias. `whatsapp_mensagens.telefone` **não foi tocada** de propósito — guarda E.164 da API do
WhatsApp (`55` + DDD + número, sem `+`), formato técnico que a integração exige.

**Formato canônico adotado**, igual ao que a máscara `formatPhone` produz na UI:

| Dígitos | Formato |
|---|---|
| 11 (celular) | `(XX) XXXXX-XXXX` |
| 10 (fixo) | `(XX) XXXX-XXXX` |

**O que foi feito, em quatro etapas**, cada uma com backup próprio e transação separada:

| Etapa | Linhas | Backup |
|---|---|---|
| Normalização de formato (só apresentação) | 165 | `backup-telefones-clientes-20260805.sql` |
| DDD 92 nos que não tinham DDD | 10 | `backup-telefones-sem-ddd-20260805.sql` |
| Dois números no mesmo campo → fica o primeiro | 2 | `backup-telefones-duplos-20260805.sql` |
| Dígito `9` sobrando removido (12 → 11) | 1 | `backup-telefone-827-20260805.sql` |

Os backups estão em `~/Documents/BFX/`, **fora do repositório** — contêm telefones de clientes.
Cada um reverte só a sua etapa:

```bash
kubectl exec -n bfx bfx-db-0 -i -- psql -U postgres -d bfx < <arquivo>.sql
```

**Garantias aplicadas.** A etapa de formatação é puramente cosmética, e isso foi *provado*, não
suposto: o md5 do conjunto de dígitos de todos os telefones é idêntico antes e depois
(`e7ed65430d954d7fc8504facbf7e72fa`). As etapas que alteram dígitos rodaram com trava no próprio
`UPDATE`, recusando gravar qualquer linha cujo resultado não fosse exatamente o esperado — e antes
de aplicar, cada número novo foi checado contra a base para não colidir com outro cliente.

**Resultado:** 723 celulares + 90 fixos no padrão, **0 fora**, 21 sem telefone. Encontráveis pelo
pré-atendimento: de 32 para **813**.

**Perda de dado assumida.** Dois clientes tinham dois telefones no mesmo campo e, por decisão do
André, ficaram com o primeiro. Os números descartados estão anotados no cabeçalho de
`backup-telefones-duplos-20260805.sql`. Se um dia o schema ganhar telefone secundário, é de lá que
eles voltam.

**Correção de código que veio junto** (commit `23fa592`): normalizar o formato teria levado a busca
do pré-atendimento de 32 para **zero** acertos, porque ela fazia `telefone contains <dígitos>`
contra a coluna formatada. Passou a comparar dígito contra dígito na própria query
(`regexp_replace` na coluna), então o formato da coluna deixou de importar.

**Pendência conhecida, não é da normalização.** Nove clientes compartilham quatro telefones — um
deles aparece em três cadastros distintos. A duplicidade é anterior a esta manutenção (conferida
contra o backup). Pode ser família, mesmo aparelho ou cadastro duplicado; ninguém investigou ainda.
