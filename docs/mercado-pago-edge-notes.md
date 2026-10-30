# Contratos verificados

- Mercado Pago Webhooks: https://www.mercadopago.com.br/developers/en/docs/checkout-pro-preferences/additional-content/notifications
  - A notificação chega por POST com `x-signature`, `x-request-id` e query `data.id`.
  - O manifesto de validação é `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` e usa HMAC-SHA256.
  - Após receber, o endpoint deve responder HTTP 200 ou 201 em até 22 segundos.
- Supabase Edge Function secrets: https://supabase.com/docs/guides/functions/secrets
  - Secrets de produção ficam no projeto Supabase e são lidos por `Deno.env.get`.
  - `SUPABASE_URL` e chaves administrativas são injetadas no runtime; tokens externos devem ser secrets privados.
- Supabase Function configuration: https://supabase.com/docs/guides/functions/function-configuration
  - Webhooks externos não possuem JWT Supabase; a função deve ser publicada com `verify_jwt=false` e autenticar a operação protegida dentro do código.

Implementação planejada: uma Edge Function pública apenas para webhook e com autenticação manual por Bearer para a ação de criação do PIX; o token Mercado Pago nunca vai para o navegador.
