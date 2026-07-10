# Hotel Beach Pet

Sistema inicial para hotel de cachorro com login de administrador e tutor, dashboard, agendamentos, cadastro de caes, observacoes veterinarias e carteira de vacina.

## Como testar

Abra o projeto em um servidor local e acesse:

```text
http://localhost:4177
```

## Logins de teste

```text
Admin: admin@hotelbeachpet.com / admin123
Tutor: cliente@hotelbeachpet.com / cliente123
```

## O que ja existe

- Login e criacao de conta para tutor
- Dashboard no estilo da referencia enviada
- Area admin com usuarios, agenda, caes, veterinario e vacinas
- Area de tutor para cadastrar caes, agendar servicos e registrar vacinas
- Dados salvos no navegador via localStorage para validar o fluxo

## Proxima etapa

- Conectar Supabase Auth para login real
- Criar tabelas do banco usando `supabase-schema.sql`
- Trocar localStorage por consultas no Supabase
- Subir no GitHub e hospedar na Vercel
