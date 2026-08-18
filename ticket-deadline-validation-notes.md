# Validação da Meta de 80%

As telas autenticadas de **Visão geral** e **Ajustes das metas** foram verificadas após a migração de `ticketWorkingDaysRemaining`.

- O dashboard apresenta o **valor da Meta de 80%** como 80% do campo **À receber**.
- O painel mostra o **saldo para atingir** e classifica a meta como **Não atingida** quando o prazo do dia 15 já encerrou sem registro de atingimento.
- A tela de Ajustes contém o campo manual **Dias úteis restantes até o dia 15**, usado para calcular a média diária necessária enquanto o prazo estiver em andamento.
- As barras de rolagem continuam ocultas visualmente, sem impedir a navegação pela página.
