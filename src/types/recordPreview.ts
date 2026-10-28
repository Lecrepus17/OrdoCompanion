import {
  CampaignMonster,
  CampaignStoryScene,
  CharacterAbility,
  CharacterAttack,
  CharacterInventoryItem,
  CharacterSheet,
  CompendiumEntity,
  CustomWeapon,
  WeaponModificationDef,
} from './compendium';
import { SkillDefinition } from '../utils/progression';

export const DEFAULT_LONG_PRESS_DELAY = 350;

export type RecordPreviewTarget =
  | { kind: 'entity'; entity: CompendiumEntity }
  | { kind: 'skill_def'; skill: SkillDefinition; entity?: CompendiumEntity }
  | { kind: 'custom_weapon'; weapon: CustomWeapon }
  | { kind: 'weapon_mod'; mod: WeaponModificationDef; entity?: CompendiumEntity }
  | { kind: 'character'; character: CharacterSheet }
  | { kind: 'character_ability'; ability: CharacterAbility; entity?: CompendiumEntity }
  | {
      kind: 'character_attack';
      attack: CharacterAttack;
      customWeapon?: CustomWeapon;
      entity?: CompendiumEntity;
    }
  | {
      kind: 'character_inventory';
      item: CharacterInventoryItem;
      entity?: CompendiumEntity;
    }
  | {
      kind: 'campaign_monster';
      monster: CampaignMonster;
      entity?: CompendiumEntity;
    }
  | { kind: 'campaign_scene'; scene: CampaignStoryScene }
  | {
      kind: 'generic';
      title: string;
      subtitle?: string;
      categoryLabel?: string;
      element?: string;
      badgeText?: string;
      stats?: Array<{ label: string; value: string; highlight?: boolean }>;
      description: string;
      extraSections?: Array<{ title: string; content: string; accentColor?: string }>;
    };

export interface RecordPreviewAction {
  label: string;
  icon?: string;
  isSelected?: boolean;
  onPress: () => void;
  testID?: string;
}

export interface RecordPreviewRequest {
  target: RecordPreviewTarget;
  primaryAction?: RecordPreviewAction;
  showOpenFullEntityButton?: boolean;
  popupTestID?: string;
}
