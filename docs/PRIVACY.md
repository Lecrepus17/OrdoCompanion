# Política de Privacidade — Ordo Companion

**Última atualização:** 20 de novembro de 2026  
**Aplicativo:** Ordo Companion (Android, Web e Desktop PWA)  
**Contato do Desenvolvedor:** `pedro.eduardo1777@gmail.com`

Esta Política de Privacidade descreve como o **Ordo Companion** coleta, armazena, utiliza e protege as informações dos usuários ao utilizar o aplicativo e seus recursos opcionais de sincronização em nuvem.

---

## 1. Arquitetura Offline-First (Armazenamento Local)

O **Ordo Companion** funciona prioritariamente de forma offline (**Offline-First**). Por padrão, todas as suas fichas de agentes, campanhas, ameaças, armas customizadas, itens, anotações, favoritos e preferências ficam armazenados exclusivamente no armazenamento local do seu próprio dispositivo (`AsyncStorage` no celular / `localStorage` e `IndexedDB` no navegador).

Você **não é obrigado** a criar conta ou conectar serviços externos para utilizar os recursos principais do aplicativo.

---

## 2. Integração Opcional com o Google Drive (Google OAuth 2.0)

Caso você opte voluntariamente por conectar sua conta Google na aba **Perfil ➔ Nuvem** para sincronizar e fazer backup dos seus dados entre dispositivos, o aplicativo solicita os seguintes escopos mínimos da API do Google:

1. `https://www.googleapis.com/auth/drive.appdata`  
   * **Finalidade:** Acesso restrito **exclusivamente à pasta oculta dedicada ao aplicativo (`appDataFolder`)** no seu próprio Google Drive, utilizada para salvar e sincronizar seu backup JSON (`ordem_paranormal_backup_v1.json`) e eventuais PDFs adicionados por você.
   * **O que NÃO acessamos:** O Ordo Companion **não** solicita acesso de leitura, listagem, modificação ou exclusão a nenhum outro arquivo, foto, documento ou pasta do seu Google Drive pessoal.
2. `https://www.googleapis.com/auth/userinfo.profile`  
   * **Finalidade:** Exibir seu nome e foto de perfil dentro da tela de conta vinculada do aplicativo para que você saiba qual conta Google está conectada.
3. `https://www.googleapis.com/auth/userinfo.email`  
   * **Finalidade:** Exibir o endereço de e-mail da conta conectada na interface de sincronização do aplicativo.

### 2.1. Conformidade com a Política de Dados de Usuário dos Serviços de API do Google (*Limited Use*)
O uso e a transferência de informações recebidas das APIs do Google pelo **Ordo Companion** estão em estrita conformidade com a [Política de Dados do Usuário dos Serviços de API do Google (Google API Services User Data Policy)](https://developers.google.com/terms/api-services-user-data-policy), incluindo os requisitos de **Uso Limitado (*Limited Use*)**:
* Os tokens de acesso (`access_token`, `refresh_token`) permanecem salvos **localmente no seu dispositivo**; o desenvolvedor não mantém servidor próprio armazenando suas credenciais ou backups do Google Drive.
* Seus dados do Google nunca são vendidos, alugados, usados para publicidade ou compartilhados com corretores de dados ou terceiros.
* Os dados acessados via Google OAuth são usados unicamente para fornecer a funcionalidade de backup e sincronização pessoal iniciada por você.

---

## 3. Outros Recursos Opcionais Online

* **Mesa Virtual (VTT) via Supabase Realtime:** Quando você cria ou entra voluntariamente em uma sala de mesa virtual (`ORD-XXXX`), os dados da sessão daquela sala (nome do personagem, PV/PE/SAN da mesa, rolagens e iniciativas) são transmitidos entre os participantes conectados à sala utilizando a infraestrutura do Supabase.
* **Assistente G.L.I.T.C.H. (IA):** O aplicativo oferece modo **100% Offline** local ou conexão opcional a provedores de IA externos (como Google Gemini, Groq, OpenRouter ou Ollama local) com envio apenas da sua pergunta e trechos contextuais necessários para respondê-la.
* **Central de Suporte / Reporte de Erros:** Caso você envie voluntariamente um relato de erro ou sugestão pela aba *Suporte*, apenas o texto e os metadados técnicos informados no formulário são encaminhados ao canal de suporte do desenvolvedor (Discord via proxy seguro) para análise do problema.

---

## 4. Retenção, Revogação de Acesso e Exclusão de Dados

Você tem controle total sobre seus dados e pode removê-los a qualquer momento:
1. **Desconectar no App:** Em **Perfil ➔ Nuvem ➔ Desconectar**, as credenciais salvas localmente no dispositivo são removidas e revogadas.
2. **Revogar pelo Google:** Você pode revogar o acesso do Ordo Companion a qualquer instante em [Minha Conta Google ➔ Permissões de terceiros](https://myaccount.google.com/permissions).
3. **Excluir dados do Drive:** Ao revogar ou remover os dados ocultos do aplicativo nas configurações do seu Google Drive (*Gerenciar apps ➔ Ordo Companion ➔ Excluir dados ocultos do app*), todo backup armazenado em `appDataFolder` é apagado permanentemente.
4. **Excluir dados locais:** Desinstalar o aplicativo (no Android) ou limpar os dados do site/navegador (no Web/PWA) apaga integralmente os registros locais.

---

## 5. Alterações e Contato

Esta Política de Privacidade pode ser atualizada conforme novos recursos forem adicionados ao aplicativo, mantendo sempre a transparência e a data da última revisão no topo deste documento.

Em caso de dúvidas, solicitações sobre privacidade ou suporte técnico, entre em contato pelo e-mail:  
📧 **`pedro.eduardo1777@gmail.com`**
