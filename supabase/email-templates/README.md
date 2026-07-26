# Templates de e-mail — Abolivion

HTML pronto para colar no Supabase Auth. Visual alinhado ao jogo (floresta + ouro).

## Onde colar

Dashboard do projeto → **Authentication → Email Templates**:

https://supabase.com/dashboard/project/rjhwjhfrrmwwqmkpyupc/auth/templates

| Arquivo | Template no dashboard | Assunto sugerido |
|---------|----------------------|------------------|
| `email-change.html` | **Change Email Address** | `Abolivion — confirme seu e-mail` |
| `recovery.html` | **Reset Password** | `Abolivion — redefinir senha` |
| `confirmation.html` | **Confirm sign up** | `Abolivion — bem-vindo à tribo` |

Para cada um:

1. Abra o template no dashboard
2. Cole o **Subject** da tabela
3. Cole o HTML completo do arquivo no corpo (Body)
4. **Save**

Não altere as variáveis `{{ .ConfirmationURL }}`, `{{ .NewEmail }}`, etc.

## Preview

Abra o `.html` no navegador para ver o layout. O botão só funciona depois do envio real (a URL é gerada pelo Auth).
