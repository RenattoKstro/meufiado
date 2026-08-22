# Validação visual — primeira versão

Foram verificadas as telas de primeiro acesso em dois tamanhos de tela. Em desktop, o formulário apresenta composição em dois painéis, com boa separação entre contexto e cadastro. Em celular, o layout passa para uma coluna, preserva legibilidade, espaçamento e a sequência dos campos sem corte horizontal.

O estado sem filiais foi confirmado visualmente: para uma conta administrativa, o sistema exibe o campo para cadastrar a primeira filial e mantém o botão de conclusão de cadastro indisponível até que exista uma filial selecionável.

O fluxo de dashboard completo depende da inclusão de uma filial e de valores de metas no ambiente autenticado; a estrutura, os testes de regras e a compilação foram validados nesta versão inicial.

Após a implementação do acesso administrativo local, o painel administrativo foi verificado em desktop e em tela móvel com uma sessão administrativa já autenticada. A navegação lateral se reduz adequadamente no celular, os botões de credenciais, filial e cadastro permanecem acessíveis e os cartões de status passam para uma coluna sem perda de legibilidade.

## Validação visual — Romaneio

- **Utilidades:** a aba `Romaneio` aparece junto de Downloads, Relatórios e Calculadora 90%, preservando a hierarquia visual do painel.
- **Link público inválido:** a rota compartilhável apresenta um estado vazio seguro, sem expor informações do documento quando o token não existe.
