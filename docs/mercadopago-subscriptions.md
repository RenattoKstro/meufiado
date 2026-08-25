# Integração de assinaturas Mercado Pago

O plano PRO será cobrado como assinatura mensal pelo endpoint `POST https://api.mercadopago.com/preapproval`, usando `external_reference` para associar a assinatura ao usuário interno e `auto_recurring` com frequência mensal. O usuário será redirecionado ao `init_point` retornado pelo Mercado Pago.

O acesso PRO só será renovado após um evento de webhook de pagamento recorrente ser confirmado por consulta autenticada ao endpoint `GET https://api.mercadopago.com/authorized_payments/{id}` e apresentar `payment.status` igual a `approved`. A chave secreta de Webhooks será usada para validar a assinatura da notificação antes de consultar o evento.

O webhook é informado no momento da criação da assinatura e deve receber os tópicos `subscription_authorized_payment` e `subscription_preapproval`. A validação usa os cabeçalhos `x-signature`, `x-request-id`, o identificador `data.id` enviado pelo Mercado Pago e a assinatura secreta configurada para a aplicação.

## Referências oficiais

- [Criar assinatura](https://www.mercadopago.com.ar/developers/en/reference/online-payments/subscriptions/create-preapproval/post)
- [Assinaturas com cobrança autorizada](https://www.mercadopago.com.br/developers/en/docs/subscriptions/integration-configuration/subscription-no-associated-plan/authorized-payments)
- [Consultar pagamento recorrente](https://www.mercadopago.com.co/developers/en/reference/online-payments/subscriptions/get-authorized-payment/get)
- [Notificações por Webhook](https://www.mercadopago.com.br/developers/en/docs/your-integrations/notifications)
