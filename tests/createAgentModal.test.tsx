import './setup';
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import CreateAgentModal from '../src/components/CreateAgentModal';
import {
  renderWithProviders,
  cleanup,
  fireClick,
  fireLongPress,
  changeInputText,
} from './frontendTestUtils';
import { defaultRepository } from '../src/repositories/OfflineDataRepository';
import {
  CompendiumEntity,
  CharacterSheet,
} from '../src/types/compendium';
import {
  calculateInitialSkillBudget,
  getClassSkillRules,
  getOriginSkillsInfo,
  OFFICIAL_SKILLS_LIST,
} from '../src/utils/progression';

describe('Auditoria Completa da Criação Assistida de Agente', () => {
  let originsList: CompendiumEntity[] = [];
  let classesList: CompendiumEntity[] = [];
  let ritualsList: CompendiumEntity[] = [];
  let skillsList: CompendiumEntity[] = [];

  beforeEach(async () => {
    await cleanup();
    await defaultRepository.initialize();
    const all = await defaultRepository.getAllEntities();
    originsList = all.filter((e) => e.category === 'origin');
    classesList = all.filter((e) => e.category === 'class');
    ritualsList = all.filter((e) => e.category === 'ritual');
    skillsList = all.filter((e) => e.category === 'skill');
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('1. Fidelidade dos Dados do Compêndio', () => {
    test('todas as 59 origens oficiais devem estar presentes e possuir perícias, nome e descrição de poder', () => {
      assert.strictEqual(originsList.length, 59, 'Devem existir exatamente 59 origens no compêndio');

      originsList.forEach((orig) => {
        assert.ok(orig.name, `Origem ${orig.id} deve ter nome`);
        assert.ok(orig.trainedSkills, `Origem ${orig.name} deve ter campo trainedSkills`);
        assert.ok(orig.powerName, `Origem ${orig.name} deve ter powerName`);
        assert.ok(orig.powerDescription, `Origem ${orig.name} deve ter powerDescription detalhada`);
        assert.ok(orig.summary, `Origem ${orig.name} deve ter resumo`);
        assert.ok(orig.bookTitle, `Origem ${orig.name} deve referenciar o livro`);

        // Toda origem deve conceder exatamente 2 perícias oficiais no total
        const info = getOriginSkillsInfo(orig.trainedSkills);
        const total = info.originGrantedSkills.length + info.extraOriginChoices;
        assert.strictEqual(
          total,
          2,
          `Origem ${orig.name} (${orig.trainedSkills}) deve totalizar exatamente 2 perícias`
        );
      });
    });

    test('todas as 4 classes oficiais devem estar presentes com regras e proficiências canônicas', () => {
      assert.strictEqual(classesList.length, 4, 'Devem existir 4 classes (Combatente, Especialista, Ocultista, Sobrevivente)');

      const classNames = classesList.map((c) => c.name);
      assert.ok(classNames.includes('Combatente'), 'Deve incluir Combatente');
      assert.ok(classNames.includes('Especialista'), 'Deve incluir Especialista');
      assert.ok(classNames.includes('Ocultista'), 'Deve incluir Ocultista');
      assert.ok(classNames.includes('Sobrevivente'), 'Deve incluir Sobrevivente');

      classesList.forEach((cls) => {
        assert.ok(cls.proficiencies, `Classe ${cls.name} deve ter proficiências definidas`);
        assert.ok(cls.trainedSkills, `Classe ${cls.name} deve ter descrição de perícias treinadas`);
        assert.ok(cls.summary, `Classe ${cls.name} deve ter resumo`);
      });
    });

    test('todas as 28 perícias do compêndio devem corresponder à OFFICIAL_SKILLS_LIST com atributos base corretos', () => {
      assert.strictEqual(skillsList.length, 28, 'Devem existir 28 perícias oficiais');
      assert.strictEqual(OFFICIAL_SKILLS_LIST.length, 28, 'OFFICIAL_SKILLS_LIST deve conter 28 perícias');

      OFFICIAL_SKILLS_LIST.forEach((sk) => {
        const found = skillsList.find((s) => s.name.toLowerCase() === sk.name.toLowerCase());
        assert.ok(found, `Perícia ${sk.name} deve existir no compêndio`);
        assert.strictEqual(found.baseAttribute, sk.attr, `Atributo base de ${sk.name} deve bater`);
      });
    });

    test('rituais de 1º círculo devem conter 31 rituais para seleção de Ocultista', () => {
      const circle1 = ritualsList.filter((r) => r.circle === 1);
      assert.strictEqual(circle1.length, 31, 'Devem existir 31 rituais de 1º círculo no compêndio');
      circle1.forEach((rit) => {
        assert.ok(rit.name, 'Ritual deve ter nome');
        assert.ok(rit.element, `Ritual ${rit.name} deve ter elemento paranormal definido`);
        assert.strictEqual(rit.circle, 1, `Ritual ${rit.name} deve ser de 1º círculo`);
      });
    });
  });

  describe('2. Regras Oficiais de Criação e Progressão de Perícias', () => {
    test('Sobrevivente deve receber 1 + Intelecto perícias conforme Sobrevivendo ao Horror p. 31', () => {
      const rules = getClassSkillRules('Sobrevivente', 2);
      assert.strictEqual(rules.freeChoicesCount, 3, '1 + INT 2 deve resultar em 3 escolhas livres');

      const budget = calculateInitialSkillBudget('Sobrevivente', 2, 'Fortitude e Sobrevivência');
      assert.strictEqual(budget.originGrantedSkills.length, 2);
      assert.strictEqual(budget.totalFreeChoices, 3);
      assert.strictEqual(budget.totalTrainedExpected, 5, '2 origem + (1 + 2) classe = 5 perícias no total');
    });

    test('Combatente deve receber Luta/Pontaria, Fortitude/Reflexos e 1 + INT perícias livres', () => {
      const rules = getClassSkillRules('Combatente', 1);
      assert.strictEqual(rules.freeChoicesCount, 2, '1 + INT 1 = 2 livres');
      assert.strictEqual(rules.choiceGroups.length, 2);

      const budget = calculateInitialSkillBudget('Combatente', 1, 'Acrobacia e Atletismo');
      assert.strictEqual(budget.totalTrainedExpected, 6, '2 origem + 2 grupos + 2 livres = 6 perícias');
    });

    test('Especialista deve receber 7 + INT perícias à escolha livre', () => {
      const rules = getClassSkillRules('Especialista', 2);
      assert.strictEqual(rules.freeChoicesCount, 9, '7 + INT 2 = 9 livres');

      const budget = calculateInitialSkillBudget('Especialista', 2, 'Crime e Furtividade');
      assert.strictEqual(budget.totalTrainedExpected, 11, '2 origem + 9 livres = 11 perícias');
    });

    test('Ocultista deve receber Ocultismo, Vontade e 3 + INT perícias à escolha', () => {
      const rules = getClassSkillRules('Ocultista', 3);
      assert.strictEqual(rules.freeChoicesCount, 6, '3 + INT 3 = 6 livres');
      assert.deepStrictEqual(rules.mandatorySkills, ['Ocultismo', 'Vontade']);

      const budget = calculateInitialSkillBudget('Ocultista', 3, 'Investigação e Percepção');
      assert.strictEqual(budget.totalTrainedExpected, 10, '2 origem + 2 obrigatórias + 6 livres = 10 perícias');
    });

    test('troca automática de perícia duplicada entre origem e classe obrigatória', () => {
      // Cultista Arrependido já concede Ocultismo e Religião
      const budget = calculateInitialSkillBudget('Ocultista', 1, 'Ocultismo e Religião');
      // Ocultismo já concedido -> só resta Vontade como mandatória efetiva
      assert.deepStrictEqual(budget.effectiveMandatorySkills, ['Vontade']);
      // A duplicata de Ocultismo é convertida em +1 escolha livre
      assert.strictEqual(budget.totalFreeChoices, 5, '3 + INT 1 + 1 duplicata = 5 escolhas livres');
      assert.strictEqual(budget.totalTrainedExpected, 8, '2 origem + 1 mandatória + 5 livres = 8 perícias');
    });
  });

  describe('3. Componente CreateAgentModal (Fluxo Assistido)', () => {
    test('deve renderizar a Etapa 1 (Identidade) e permitir preenchimento', async () => {
      let createdSheet: CharacterSheet | null = null;
      const { getByText, getByPlaceholder } = await renderWithProviders(
        <CreateAgentModal
          visible={true}
          onClose={() => {}}
          onFinish={(s) => {
            createdSheet = s;
          }}
          originsList={originsList}
          classesList={classesList}
          ritualsList={ritualsList}
        />
      );

      assert.ok(getByText('Criação Assistida de Agente'));
      assert.ok(getByText(/Etapa 1 de 6 • Identidade/i));
      assert.ok(getByText('Identidade do Agente'));

      const nameInput = getByPlaceholder(/Arthur Cervero/i);
      await changeInputText(nameInput, 'Alexandre Senna');
      assert.strictEqual(nameInput.value, 'Alexandre Senna');
    });

    test('deve avançar para a Etapa 2 (Origem) e exibir poderes e perícias completas das origens', async () => {
      const { getByText, queryByText, getByPlaceholder } = await renderWithProviders(
        <CreateAgentModal
          visible={true}
          onClose={() => {}}
          onFinish={() => {}}
          originsList={originsList}
          classesList={classesList}
          ritualsList={ritualsList}
        />
      );

      // Clicar em Próximo para ir à Etapa 2
      const nextBtn = getByText('Próximo');
      await fireClick(nextBtn);

      // Etapa 2
      assert.ok(getByText(/Etapa 2 de 6 • Origem/i));
      assert.ok(getByText('Escolha a Origem'));

      // Pesquisar uma origem específica
      const searchInput = getByPlaceholder(/Pesquisar entre as 59 origens/i);
      await changeInputText(searchInput, 'Acadêmico');

      // Card de Acadêmico deve exibir perícias e poder com descrição
      assert.ok(getByText('Acadêmico'));
      assert.ok(queryByText(/Ciências e Investigação/i));
      assert.ok(queryByText(/Saber é Poder/i));
      assert.ok(queryByText(/Quando faz um teste usando Intelecto/i));
    });

    test('na Etapa 2 (Origem), deve abrir popup da descrição da habilidade ao clicar e segurar uma origem ou usar o botão de info', async () => {
      const { getByText, queryByText, getByPlaceholder, getByTestId, queryByTestId } = await renderWithProviders(
        <CreateAgentModal
          visible={true}
          onClose={() => {}}
          onFinish={() => {}}
          originsList={originsList}
          classesList={classesList}
          ritualsList={ritualsList}
        />
      );

      // Avançar para a Etapa 2 (Origem)
      await fireClick(getByText('Próximo'));
      assert.ok(getByText(/Etapa 2 de 6 • Origem/i));

      // Pesquisar por uma origem: ex. Agente de Saúde
      const searchInput = getByPlaceholder(/Pesquisar entre as 59 origens/i);
      await changeInputText(searchInput, 'Agente de Saúde');

      // Popup não deve estar visível inicialmente
      assert.strictEqual(queryByTestId('origin-ability-popup'), null);

      // Abrir popup clicando e segurando no card da origem
      const originCard = getByTestId('origin-card-origin__livro_base__agente_de_saude');
      await fireLongPress(originCard);

      let popup = queryByTestId('origin-ability-popup');
      if (!popup) {
        const infoBtn = getByTestId('origin-info-origin__livro_base__agente_de_saude');
        await fireClick(infoBtn);
        popup = queryByTestId('origin-ability-popup');
      }

      assert.ok(popup, 'Popup com a descrição da habilidade deve ser aberto');
      // Deve exibir o poder "Técnica Medicinal"
      assert.ok(queryByText(/Técnica Medicinal/i));
      // Deve exibir botão Fechar
      const closeBtn = getByTestId('popup-dismiss-btn');
      assert.ok(closeBtn);
      // Deve exibir botão Escolher esta Origem
      const selectBtn = getByTestId('popup-select-btn');
      assert.ok(selectBtn);

      // Clicar em Escolher esta Origem
      await fireClick(selectBtn);

      // Popup deve fechar
      assert.strictEqual(queryByTestId('origin-ability-popup'), null);
    });

    test('deve avançar para a Etapa 3 (Classe) e exibir PV, PE, SAN, perícias e proficiências de cada classe', async () => {
      const { getByText, queryByText } = await renderWithProviders(
        <CreateAgentModal
          visible={true}
          onClose={() => {}}
          onFinish={() => {}}
          originsList={originsList}
          classesList={classesList}
          ritualsList={ritualsList}
        />
      );

      // Avançar até Etapa 3
      await fireClick(getByText('Próximo')); // para etapa 2
      await fireClick(getByText('Próximo')); // para etapa 3

      assert.ok(getByText(/Etapa 3 de 6 • Classe/i));
      assert.ok(getByText('Escolha a Classe'));

      // Verifica dados exibidos das classes
      assert.ok(getByText('Combatente'));
      assert.ok(queryByText('20 + Vig'));
      assert.ok(queryByText('2 + Pre'));
      assert.ok(queryByText('12')); // SAN Combatente
      assert.ok(queryByText(/Armas simples, armas táticas/i));

      assert.ok(getByText('Especialista'));
      assert.ok(queryByText('16 + Vig'));
      assert.ok(queryByText('3 + Pre'));

      assert.ok(getByText('Ocultista'));
      assert.ok(queryByText('12 + Vig'));
      assert.ok(queryByText('4 + Pre'));
      assert.ok(queryByText('20')); // SAN Ocultista

      assert.ok(getByText('Sobrevivente'));
      assert.ok(queryByText('8 + Vig'));
      assert.ok(queryByText('8')); // SAN Sobrevivente
    });

    test('na Etapa 4 (Atributos), deve calcular 4 pontos para classes normais e 3 para Sobrevivente', async () => {
      const { getByText, queryByText } = await renderWithProviders(
        <CreateAgentModal
          visible={true}
          onClose={() => {}}
          onFinish={() => {}}
          originsList={originsList}
          classesList={classesList}
          ritualsList={ritualsList}
        />
      );

      // Avançar até Etapa 4 com Combatente (padrão)
      await fireClick(getByText('Próximo')); // etapa 2
      await fireClick(getByText('Próximo')); // etapa 3
      await fireClick(getByText('Próximo')); // etapa 4

      assert.ok(getByText(/Etapa 4 de 6 • Atributos/i));
      assert.ok(getByText(/Distribuição de Atributos/i));
      // Deve mostrar 4 pontos restantes para distribuir
      assert.ok(queryByText(/Pontos Restantes.*4/i));
      assert.ok(queryByText(/tem 4 pontos para distribuir/i));
    });

    test('na Etapa 5 (Perícias), deve exibir todas as 28 perícias com suas restrições e respeitar cota estrita', async () => {
      const { getByText, queryByText } = await renderWithProviders(
        <CreateAgentModal
          visible={true}
          onClose={() => {}}
          onFinish={() => {}}
          originsList={originsList}
          classesList={classesList}
          ritualsList={ritualsList}
        />
      );

      // Ir até etapa 5 (com modo livre na etapa 4 para permitir avançar sem gastar pontos)
      await fireClick(getByText('Próximo')); // etapa 2
      await fireClick(getByText('Próximo')); // etapa 3
      await fireClick(getByText('Próximo')); // etapa 4
      await fireClick(getByText('Modo Livre')); // ativa modo livre na etapa 4
      await fireClick(getByText('Próximo')); // etapa 5

      assert.ok(getByText(/Etapa 5 de 6 • Perícias/i));
      assert.ok(getByText('Perícias Treinadas (+5)'));
      assert.ok(getByText('Todas as 28 Perícias:'));

      // Verifica exibição de perícias com flags
      assert.ok(queryByText(/Ocultismo/i));
      assert.ok(queryByText(/Somente Treinada/i));
      assert.ok(queryByText(/Carga/i));
    });

    test('na Etapa 6 (Habilidades & Rituais), Ocultista deve selecionar 3 rituais de 1º círculo e gerar ficha completa', async () => {
      let createdSheet: CharacterSheet | null = null;

      const { getByText, queryByText } = await renderWithProviders(
        <CreateAgentModal
          visible={true}
          onClose={() => {}}
          onFinish={(sheet) => {
            createdSheet = sheet;
          }}
          originsList={originsList}
          classesList={classesList}
          ritualsList={ritualsList}
        />
      );

      // 1. Identidade
      await fireClick(getByText('Próximo'));

      // 2. Origem (Acadêmico já é o primeiro)
      await fireClick(getByText('Próximo'));

      // 3. Escolher Ocultista
      const occultistBtn = getByText('Ocultista');
      await fireClick(occultistBtn);
      await fireClick(getByText('Próximo'));

      // 4. Atributos (usar Modo Livre para testar fluxo rápido)
      await fireClick(getByText('Modo Livre'));
      await fireClick(getByText('Próximo'));

      // 5. Perícias: cota livre do Ocultista com INT 1 = 3 + 1 = 4 escolhas livres
      // Selecionar 4 perícias livres para cumprir a cota
      const skillsToSelect = ['Diplomacia', 'Iniciativa', 'Medicina', 'Percepção'];
      for (const sk of skillsToSelect) {
        const item = getByText(sk);
        await fireClick(item);
      }
      await fireClick(getByText('Próximo'));

      // 6. Etapa 6: Escolher 3 rituais de 1º círculo
      assert.ok(getByText(/Etapa 6 de 6/i));
      assert.ok(queryByText(/Escolhido pelo Outro Lado/i));
      assert.ok(queryByText(/Selecione 3 rituais/i));

      // Selecionar 3 rituais
      const rit1 = getByText('Amaldiçoar Arma');
      const rit2 = getByText('Cicatrização');
      const rit3 = getByText('Armadura de Sangue');
      await fireClick(rit1);
      await fireClick(rit2);
      await fireClick(rit3);

      // Resumo Final deve estar preenchido
      assert.ok(getByText('Resumo do Agente Criado:'));
      assert.ok(queryByText(/Rituais de 1º Círculo Escolhidos/i));
      assert.ok(queryByText(/Amaldiçoar Arma/i));
      assert.ok(queryByText(/Cicatrização/i));
      assert.ok(queryByText(/Armadura de Sangue/i));

      // Finalizar criação
      const finishBtn = getByText('Criar Agente Agora');
      await fireClick(finishBtn);

      // Validação da Ficha Gerada
      assert.ok(createdSheet !== null, 'Ficha deve ter sido gerada com sucesso');
      const sheet = createdSheet as unknown as CharacterSheet;
      assert.strictEqual(sheet.nex, 5);
      assert.strictEqual(sheet.rank, 'Recruta');
      assert.strictEqual(sheet.displacement, '9m');
      assert.strictEqual(sheet.itemLimits?.cat1, 2);
      assert.strictEqual(sheet.entityIds.length, 3, 'Deve conter os IDs dos 3 rituais');

      // Deve ter poder de origem com referência de livro
      const originPower = sheet.abilities?.find((a) => a.type === 'poder');
      assert.ok(originPower, 'Deve conter habilidade do poder da origem');
      assert.ok(originPower?.originPage?.includes('Livro Base'), 'originPage deve apontar para Livro Base');

      // Deve conter perícias treinadas com degree 5 (+5)
      assert.strictEqual(sheet.skills['Ciências']?.degree, 5, 'Perícia da origem treinada');
      assert.strictEqual(sheet.skills['Investigação']?.degree, 5, 'Perícia da origem treinada');
      assert.strictEqual(sheet.skills['Ocultismo']?.degree, 5, 'Perícia mandatória treinada');
      assert.strictEqual(sheet.skills['Vontade']?.degree, 5, 'Perícia mandatória treinada');
      assert.strictEqual(sheet.skills['Diplomacia']?.degree, 5, 'Perícia livre treinada');
    });

    test('deve criar Sobrevivente com 3 pontos de atributos, NEX 0% e Empenho', async () => {
      let createdSheet: CharacterSheet | null = null;

      const { getByText, queryByText } = await renderWithProviders(
        <CreateAgentModal
          visible={true}
          onClose={() => {}}
          onFinish={(sheet) => {
            createdSheet = sheet;
          }}
          originsList={originsList}
          classesList={classesList}
          ritualsList={ritualsList}
        />
      );

      // 1. Identidade
      await fireClick(getByText('Próximo'));

      // 2. Origem (Acadêmico)
      await fireClick(getByText('Próximo'));

      // 3. Escolher Sobrevivente
      const survivorBtn = getByText('Sobrevivente');
      await fireClick(survivorBtn);
      await fireClick(getByText('Próximo'));

      // 4. Atributos: deve exibir 3 pontos para distribuir
      assert.ok(queryByText(/Pontos Restantes.*3/i));
      assert.ok(queryByText(/recebe 3 pontos para distribuir/i));

      // Usar modo livre para avançar
      await fireClick(getByText('Modo Livre'));
      await fireClick(getByText('Próximo'));

      // 5. Perícias: cota livre do Sobrevivente com INT 1 = 1 + 1 = 2 escolhas livres
      const skillsToSelect = ['Diplomacia', 'Iniciativa'];
      for (const sk of skillsToSelect) {
        await fireClick(getByText(sk));
      }
      await fireClick(getByText('Próximo'));

      // 6. Etapa 6: Habilidade de Estágio 1 - Empenho
      assert.ok(queryByText(/Empenho \(1º Estágio\)/i));
      assert.ok(queryByText(/NEX 0% \(Estágio 1\)/i));

      // Finalizar criação
      await fireClick(getByText('Criar Agente Agora'));

      assert.ok(createdSheet !== null);
      const sheet = createdSheet as unknown as CharacterSheet;
      assert.strictEqual(sheet.nex, 0, 'Sobrevivente deve iniciar com NEX 0%');
      assert.strictEqual(sheet.peRound, 1, 'Sobrevivente tem limite 1 de PE por rodada');
      assert.strictEqual(sheet.itemLimits?.cat1, 1, 'Sobrevivente tem limite de 1 item Cat I');

      const empenho = sheet.abilities?.find((a) => a.name.includes('Empenho'));
      assert.ok(empenho, 'Deve possuir habilidade Empenho');
      assert.strictEqual(empenho?.cost, '1 PE');
    });
  });
});
