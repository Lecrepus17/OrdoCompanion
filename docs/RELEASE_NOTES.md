# 🩸 Ordo Companion v1.5.1-beta.1

## 🚀 Principais Novidades da v1.5.1-beta.1

* **Dano Dinâmico por Agente, Preparação de Golpe Tático e Conjuração de Rituais**:
  * Rolagens e cards de ataque agora calculam automaticamente os modificadores do **agente** sem alterar armas compartilhadas da Armaria: atributo correto (`FOR`, `AGI` em armas ágeis/Artista Marcial, `FOR+AGI` em Arco Composto com `Tiro Certeiro`, `INT` em fuzis com `Mira de Elite`), passos extras (`Golpe Pesado`, `Calibre Grosso`, `Máquina de Matar`) e bônus de origens/poderes (`Para Bellum`, `Mão Pesada`, `Ferramenta de Trabalho`, `Balística Avançada`, `Ninja Urbano`).
  * Novo botão **Preparar Golpe Tático** para ativar gastos de PE e buffs em tempo real (`Ataque Especial`, `Potência Máxima`, `Ataque Furtivo`, `Assassinar`, `Destruidor`, `Rajada`, `Amaldiçoar Arma`, `Ódio Incontrolável`, `Chamas do Caos`), com alertas de limite de PE/turno e dedução automática de PE ao rolar, respeitando estritamente o que multiplica no crítico (apenas dados base + `Lancinante`).
  * A aba **Habilidades & Rituais** passa a exibir a **DT** dinâmica, badges de poderes (`Ritual Potente` +INT, `Ritual Intenso` +PRE, catalisadores e `Cajado da Cruz de Sangue`), seletor de círculo (**Padrão**, **Discente**, **Verdadeiro**) e o botão direto **Conjurar & Rolar** com gasto automático de PE.
* **Armas Unificadas entre Agentes e Armaria**:
  * Toda arma de Agente agora é uma arma completa da Armaria (e vice-versa). Tocar em **Editar** ou **Nova Arma** na ficha do Agente abre o mesmo editor completo com arma base, modificações oficiais, maldições e munição.
  * Ao importar ou equipar uma arma da Armaria no Agente, agora é possível escolher entre **Usar a Mesma (Vinculada)** — onde qualquer alteração replica automaticamente para todos os vínculos — ou **Duplicar**, criando uma cópia independente na Armaria com o nome do agente naquele momento (`Nome (Agente)`).
  * Remoções seguras: excluir uma arma no Agente pergunta se deseja remover apenas da ficha ou também da Armaria; excluir na Armaria alerta sobre agentes vinculados antes de confirmar.
* **Botão `Crítico Máx` Sempre Disponível e Cálculo de Crítico Corrigido**:
  * O botão **Crítico Máx** agora aparece sempre junto aos ataques e armas (na Ficha de Agentes, na Armaria, no modal de inspeção e no `DiceToast`), sem depender de configuração oculta.
  * Removida a opção incorreta "Crítico Cheio" das configurações de usuário; o Perfil agora mantém os 3 modos válidos: **Multiplica Dados (Padrão)**, **Multiplica Resultado** e **Perguntar Sempre**.
  * No modo **Multiplica Resultado**, o multiplicador passa a incidir apenas sobre os dados rolados da arma, preservando bônus fixos sem multiplicá-los (ex.: `1d4+2` em `x2` → `(1d4 × 2) + 2`).
* **Importação em Lote de PDFs Mais Segura e Sem Travamentos por Memória**:
  * Aprimorado o envio de múltiplos arquivos PDF de uma só vez no celular, movendo os arquivos temporários diretamente no armazenamento do aparelho sem duplicação em disco e exibindo o progresso por arquivo.
  * Bloqueada qualquer tentativa acidental de download/leitura integral de PDFs em memória RAM no Android (`arrayBuffer`), prevenindo crashes por falta de memória (`OutOfMemoryError`) em livros grandes como *Sobrevivendo ao Horror* (~84 MB).
* **Imagens dos Cards Mais Compactas e Sem Estouro da Moldura**:
  * Corrigidas as caixas de estatísticas que ultrapassavam a borda do card e textos que ocupavam só metade da largura; valores longos agora são abreviados com reticências.
  * A altura da imagem passa a se ajustar ao conteúdo (sem grandes áreas vazias), e a resolução padrão foi otimizada para 800px de largura, gerando arquivos bem menores para Discord/WhatsApp.
* **Exportação e Compartilhamento de Cards em PNG Corrigidos no Android**:
  * Corrigido o erro `Property 'Buffer' doesn't exist` ao baixar ou compartilhar cards no celular, utilizando captura nativa real em PNG (`react-native-view-shot`) com salvamento direto via seletor de pastas do Android ou compartilhamento via `expo-sharing`.
  * Removido o botão de formato `SVG` da barra inferior do gerador de imagens, mantendo os botões diretos **Copiar**, **Compartilhar** e **Baixar**.

* **Reconhecimento de Voz Nativo (Microfone) no G.L.I.T.C.H.**:
  * Ativado o ditado direto pelo botão de microfone no Android e iOS via `expo-speech-recognition`, com solicitação automática de permissão de microfone, transcrição em tempo real e preservação de texto já digitado.
* **Maior Estabilidade Offline no APK Android (Chaves e PDFs)**:
  * Eliminadas falhas silenciosas e potenciais travamentos no Android ao decodificar segredos internos (`.env`), validar senha mestre de livros e extrair metadados/páginas de PDFs offline sem depender de APIs Web/Node ausentes no motor Hermes.
* **Compêndio Completo dos Mascarados, Agentes e Hexatombe (*Arquivos Secretos #02*) e Itens no Inventário**:
  * Corrigida a extração de *Arquivos Secretos #02* (além de aliados e armas de `#06` e `#09` e correção de VD do *Felino-infernal*), restaurando todos os **itens amaldiçoados dos Mascarados** (`Manoplas do Colosso`, `Elmo do Colosso`, `Machado do Mutilador`, `Punhal X`, `Sniper Fantasma`, `A Antena`, `Faca Predadora`), `Catalisador Sofisticado e Horrorizado`, a habilidade de arma `Acoplável`, os 10 recursos de sobrevivência do Hexatombe, os 11 aliados inline, os poderes gerais/de classe e os 5 **Poderes de Intenção**.
  * Armas amaldiçoadas com estatísticas de combate (incluindo `Manoplas do Colosso`, `Punhos Enraivecidos`, `Arcabuz dos Moretti`, `A Primeira Adaga`, `Sniper Fantasma`, etc.) agora aparecem também no filtro **Armas** do Compêndio, na **Armaria** e no seletor de ataques da Ficha, além de a aba **Inventário** da Ficha ganhar o botão **`Do Compêndio`** para adicionar itens diretamente.

---

## 📲 Instalação e Atualização (Android APK)
1. Baixe o arquivo **`OrdoCompanion.apk`** anexado abaixo na seção **Assets**.
2. Abra o arquivo no seu smartphone ou tablet Android para instalar ou atualizar mantendo todas as suas fichas, anotações e campanhas salvas.
