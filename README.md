# Hotel Beach Pet

Sistema para hotel de cachorro com login de administrador, dashboard, hospedagem, saude veterinaria, internacao, medicamentos, financeiro e backup em nuvem.

## Como testar

Abra o projeto em um servidor local e acesse:

```text
http://localhost:4177
```

## Logins de teste

```text
Admin: admin@hotelbeachpet.com / admin123
```

## O que ja existe

- Dashboard administrativo para decisao diaria
- Cadastro de caes, tutores e hospedagens
- Saude veterinaria com internacao, medicamentos e mapa de execucao
- Financeiro por cachorro, total pago e valores em aberto
- Backup local no navegador para evitar perda imediata
- Sincronizacao Supabase pela aba `Nuvem e backup`

## Sincronizar dados entre aparelhos

1. Rode no Supabase o SQL da tabela `app_state` disponível em `supabase-schema.sql`.
2. Abra o site no aparelho onde os dados aparecem.
3. Clique no selo `Local` ou `Nuvem` no topo.
4. Cole a URL do Supabase e a anon public key.
5. Clique em `Enviar este aparelho para a nuvem`.
6. Nos outros aparelhos, cole a mesma URL/chave e clique em `Puxar da nuvem neste aparelho`.

O envio mescla dados por `id` e mantém uma cópia local no aparelho.
