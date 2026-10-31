---
name: glitch-prompt-audit
description: >-
  Audita e calibra a IA paranormal G.L.I.T.C.H. do Ordo Companion, incluindo engenharia de prompts de sistema com temática tática sombria, suporte aos provedores (Gemini, Groq, OpenRouter, Ollama e Offline local), RAG compacto de compêndio e resiliência a falhas de conexão.
---

# Auditoria da IA Paranormal G.L.I.T.C.H. - Ordo Companion

Utilize este guia para calibrar e auditar os prompts de sistema, provedores de inferência de LLM e o motor de conhecimento paranormal da IA embutida no aplicativo.

---

## 📂 Arquivos Chave da IA (G.L.I.T.C.H.)

* `src/services/ai/AiClient.ts`: Cliente unificado com suporte a múltiplos provedores (`Gemini`, `Groq`, `OpenRouter`, `Ollama`).
* `src/services/ai/AiKnowledgeRetrieval.ts`: Mecanismo de busca e injeção de contexto (RAG) do compêndio nas mensagens enviadas ao modelo.
* `src/services/ai/AiOfflineEngine.ts`: Motor local baseado em regras e padrões heurísticos para operação 100% desconectada.
* `tests/ai.test.ts`: Testes unitários de formato de mensagens, fallbacks e extração de intenções.

---

## 🔮 Persona & Diretrizes de Prompting da G.L.I.T.C.H.

A **G.L.I.T.C.H.** (*Gerador Lógico de Informações Táticas e Conhecimento Hiperparanormal*) é uma inteligência artificial militar desenvolvida pela divisão científica da Ordo Realitas, contaminada por interferências sutis de Energia e Conhecimento do Outro Lado.

### Diretrizes de Comportamento:
1. **Tom de Voz Tático e Obscuro**: Respostas diretas, analíticas e com jargão investigativo/militar ("Agente", "Operação", "Protocolo de Contenção", "NEX elevado").
2. **Interferências Sutis**: Pequenas falhas de transmissão textuais estilizadas quando discutir rituais ou o Outro Lado (ex: `[ESTÁTICA]`, `[REGISTRO CORROMPIDO]`), sem prejudicar a clareza mecânica da resposta.
3. **Fidelidade Canônica Estrita**: Nunca inventar regras ou danos fora do livro de Ordem Paranormal. Se uma regra não for encontrada no RAG, indicar como não catalogada nos arquivos da Ordem.
4. **Vínculo com a Ficha do Agente**: Quando a ficha do personagem estiver vinculada, priorizar respostas adaptadas aos seus atributos, perícias treinadas e patentes atuais.

---

## 🛡️ Resiliência & Fallbacks de Provedores

- [ ] **Timeout Controlado**: Requisições de rede para APIs de IA devem possuir timeout estrito (máximo 12 segundos) para não travar a UI móvel.
- [ ] **Fallback para Modo Offline**: Se a chamada ao provedor remoto falhar (sem internet, erro 429 de quota ou API indisponível), ativar automaticamente o `AiOfflineEngine` ou emitir mensagem explicativa mantendo a imersão.
- [ ] **Economia de Tokens no RAG**: O `AiKnowledgeRetrieval` deve filtrar apenas os 3 a 5 registros mais relevantes com campos essenciais para evitar estouro da janela de contexto.

---

## 🧪 Validação Automatizada

```bash
# Executa a suíte de testes do cliente de IA e offline engine
npx tsx --test tests/ai.test.ts
```
