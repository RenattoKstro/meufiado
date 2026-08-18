# Validação visual — marca, acesso e navegação

Em 18/08/2026, as rotas `/`, `/entrar` e `/admin/login` foram abertas em uma sessão OAuth já autenticada sem perfil concluído. O aplicativo apresentou corretamente a tela de primeiro acesso, impedindo o dashboard até que Nome, telefone e filial sejam informados. Esse comportamento confirma que o bloqueio visual atual decorre do cadastro incompleto da conta, e não de uma falha no carregamento do servidor.

A navegação lateral passa a ter rotas distintas para **Meta Fiado**, **Meta Desafio**, **Ajustes das metas**, **Preferências** e **Senha de acesso** após a conclusão desse cadastro. A marca visível e o título do documento foram atualizados para **Meu Fiado**.
