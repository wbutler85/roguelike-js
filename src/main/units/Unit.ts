import GameState from '../core/GameState';
import EquipmentScript from '../equipment/EquipmentScript';
import { playAttackingAnimation } from '../graphics/animations/Animations';
import DynamicSprite from '../graphics/sprites/DynamicSprite';
import Equipment from '../equipment/Equipment';
import EquipmentMap from '../equipment/EquipmentMap';
import InventoryMap from '../items/InventoryMap';
import { isInStraightLine } from '../maps/MapUtils';
import { playSound } from '../sounds/SoundFX';
import Sounds from '../sounds/Sounds';
import Activity from '../types/Activity';
import Animatable from '../graphics/animations/Animatable';
import Coordinates from '../geometry/Coordinates';
import Direction from '../geometry/Direction';
import Entity from '../types/Entity';
import { Faction } from '../types/types';
import { checkArgument, checkState } from '../utils/preconditions';
import UnitController from './controllers/UnitController';
import UnitAbility from './UnitAbility';
import UnitClass from './UnitClass';

/**
 * Regenerate this fraction of the unit's health each turn
 */
const LIFE_PER_TURN_MULTIPLIER = 0.01 / 2;
/**
 * Only regenerate life if the unit's life is less than this (ratio of their total health)
 */
const LIFE_REGEN_THRESHOLD = 1;
const MAX_PLAYER_LEVEL = 20;

type Props = {
  name: string,
  faction: Faction,
  unitClass: UnitClass,
  sprite: DynamicSprite<Unit>,
  level: number,
  coordinates: Coordinates,
  controller: UnitController,
  equipment: Equipment[]
};

class Unit implements Entity, Animatable {
  private readonly unitClass: UnitClass;
  private readonly faction: Faction;
  private readonly sprite: DynamicSprite<Unit>;
  private readonly inventory: InventoryMap;
  private readonly equipment: EquipmentMap;
  private x: number;
  private y: number;
  private name: string;
  private level: number;
  private experience: number;
  private life: number;
  private maxLife: number;
  private mana: number;
  private maxMana: number;
  private lifeRemainder: number;
  private manaRemainder: number;
  private damage: number;
  private controller: UnitController;
  private activity: Activity;
  private direction: Direction;
  /**
   * For now, this is not auto-incremented and only used for certain animations (see Animations.ts)
   */
  private frameNumber: number;
  private readonly abilities: UnitAbility[];
  private stunDuration: number;
  /**
   * Used by AI to make certain decisions
   */
  private turnsSinceCombatAction: number | null;

  constructor({ name, unitClass, faction, sprite, level, coordinates: { x, y }, controller, equipment }: Props) {
    this.unitClass = unitClass;
    this.faction = faction;
    this.sprite = sprite;
    sprite.target = this;
    this.inventory = new InventoryMap();

    this.x = x;
    this.y = y;
    this.name = name;
    this.level = 1;
    this.experience = 0;
    this.life = unitClass.startingLife;
    this.maxLife = unitClass.startingLife;
    this.mana = unitClass.startingMana ?? 0;
    this.maxMana = unitClass.startingMana ?? 0;
    this.lifeRemainder = 0;
    this.manaRemainder = 0;
    this.damage = unitClass.startingDamage;
    this.controller = controller;
    this.activity = 'STANDING';
    this.direction = Direction.S;
    this.frameNumber = 1;
    this.abilities = (unitClass.abilities[1] ?? []).map(name => UnitAbility[name]);
    this.stunDuration = 0;
    this.turnsSinceCombatAction = null;

    this.equipment = new EquipmentMap();
    for (const eq of equipment) {
      this.equipment.add(eq);
      eq.attach(this);
    }

    while (this.level < level) {
      this.levelUp(false);
    }
  }

  private _upkeep = () => {
    // life regeneration
    if (this.life < this.maxLife * LIFE_REGEN_THRESHOLD) {
      const lifePerTurn = this.maxLife * LIFE_PER_TURN_MULTIPLIER;
      this.lifeRemainder += lifePerTurn;
      const deltaLife = Math.floor(this.lifeRemainder);
      this.lifeRemainder -= deltaLife;
      this.life = Math.min(this.life + deltaLife, this.maxLife);
    }

    // mana regeneration
    if (this.mana !== null && this.maxMana !== null) {
      const manaPerTurn = 1;
      this.manaRemainder += manaPerTurn;
      const deltaMana = Math.floor(this.manaRemainder);
      this.manaRemainder -= deltaMana;
      this.mana = Math.min(this.mana + deltaMana, this.maxMana);
    }

    if (this.turnsSinceCombatAction !== null) {
      this.turnsSinceCombatAction++;
    }
  };

  private _endOfTurn = () => {
    // decrement stun duration
    this.stunDuration = Math.max(this.stunDuration - 1, 0);
  };

  getUnitClass = (): UnitClass => this.unitClass;
  getName = (): string => this.name;
  getFaction = (): Faction => this.faction;
  getController = (): UnitController => this.controller;
  getCoordinates = (): Coordinates => ({ x: this.x, y: this.y });
  setCoordinates = ({ x, y }: Coordinates) => {
    this.x = x;
    this.y = y;
  };
  getLife = () => this.life;
  getMaxLife = () => this.maxLife;
  getMana = () => this.mana;
  getMaxMana = () => this.maxMana;
  getLevel = () => this.level;
  getExperience = () => this.experience;
  getInventory = (): InventoryMap => this.inventory;
  getEquipment = (): EquipmentMap => this.equipment;
  getActivity = () => this.activity;
  getDirection = () => this.direction;
  setDirection = (direction: Direction) => { this.direction = direction; };
  getFrameNumber = () => this.frameNumber;
  getAbilities = () => this.abilities;
  getSprite = () => this.sprite;

  update = async () => {
    await this._upkeep();
    if (this.stunDuration === 0) {
      await this.controller.issueOrder(this);
    }
    await this.sprite.getImage();
    await this._endOfTurn();
  };

  getDamage = (): number => {
    let damage = this.damage;

    for (const equipment of this.equipment.getAll()) {
      if (equipment.slot !== 'RANGED_WEAPON') {
        damage += (equipment.damage ?? 0);
      }
    }

    return damage;
  };

  getRangedDamage = (): number => {
    let damage = this.damage;

    for (const equipment of this.equipment.getAll()) {
      switch (equipment.slot) {
        case 'RANGED_WEAPON':
          damage += (equipment.damage ?? 0);
          break;
        case 'MELEE_WEAPON':
          // do nothing
          break;
        default:
          damage += (equipment.damage ?? 0) / 2;
      }
    }

    return Math.round(damage);
  };

  levelUp = (withSound: boolean) => {
    this.level++;
    const { lifePerLevel, manaPerLevel } = this.unitClass;
    this.maxLife += lifePerLevel;
    this.life += lifePerLevel;
    if (this.mana !== null && this.maxMana !== null && manaPerLevel !== null) {
      this.maxMana += manaPerLevel;
      this.mana += manaPerLevel;
    }
    this.damage += this.unitClass.damagePerLevel;
    const abilities = this.unitClass.abilities[this.level] ?? [];
    for (const abilityName of abilities) {
      this.abilities.push(UnitAbility[abilityName]);
    }

    if (withSound) {
      playSound(Sounds.LEVEL_UP);
    }
  };

  gainExperience = (experience: number) => {
    if (this.unitClass.experienceToNextLevel === null) return;

    this.experience += experience;
    const experienceToNextLevel = this.experienceToNextLevel();
    while (experienceToNextLevel && this.experience >= experienceToNextLevel) {
      this.experience -= experienceToNextLevel;
      this.levelUp(true);
    }
  };

  experienceToNextLevel = (): (number | null) => {
    const { unitClass } = this;
    if (unitClass.experienceToNextLevel && (this.level < MAX_PLAYER_LEVEL)) {
      return unitClass.experienceToNextLevel[this.level];
    }
    return null;
  };

  startAttack = async (target: Unit) => {
    const { x, y } = target;
    await playAttackingAnimation(this, target);
    for (const equipment of this.equipment.getAll()) {
      if (equipment.script) {
        await EquipmentScript.onAttack(equipment, equipment.script, { x, y });
      }
    }

    this.turnsSinceCombatAction = 0;
  };

  moveTo = async ({ x, y }: Coordinates) => {
    this.setCoordinates({ x, y });
    const playerUnit = GameState.getInstance().getPlayerUnit();
    if (this === playerUnit) {
      await playSound(Sounds.FOOTSTEP);
    }

    for (const equipment of this.equipment.getAll()) {
      if (equipment.script) {
        const { dx, dy } = this.direction;
        await EquipmentScript.onMove(equipment, equipment.script, { x: this.x + dx, y: this.y + dy });
      }
    }
  };

  takeDamage = async (baseDamage: number, sourceUnit: Unit | null) => {
    const adjustedDamage = this._calculateIncomingDamage(baseDamage, sourceUnit);
    this.life = Math.max(this.life - adjustedDamage, 0);
    this.turnsSinceCombatAction = 0;
  };

  private _calculateIncomingDamage = (baseDamage: number, sourceUnit: Unit | null) => {
    let adjustedDamage = baseDamage;
    if (sourceUnit !== null && isInStraightLine(this.getCoordinates(), sourceUnit.getCoordinates())) {
      const shield = this.equipment.getBySlot('SHIELD');
      if (shield !== null && shield.blockAmount !== null) {
        adjustedDamage = Math.round(baseDamage * (1 - (shield.blockAmount ?? 0)));
      }
    }
    return adjustedDamage;
  };

  /**
   * @return the amount of life gained
   */
  gainLife = (life: number): number => {
    const lifeGained = Math.min(life, this.maxLife - this.life);
    this.life += lifeGained;
    return lifeGained;
  };

  /**
   * @return the amount of mana gained
   */
  gainMana = (mana: number): number => {
    const manaGained = Math.min(mana, this.maxMana - this.maxLife);
    this.mana += manaGained;
    return manaGained;
  }

  /**
   * @override {@link Animatable#getAnimationKey}
   */
  getAnimationKey = () => `${this.activity.toLowerCase()}_${Direction.toString(this.direction)}_${this.frameNumber}`;

  canSpendMana = (amount: number) => (this.mana ?? 0) >= amount;
  spendMana = (amount: number) => {
    checkState(this.mana !== null);
    checkArgument(amount <= this.mana!!);
    checkArgument(amount >= 0);
    this.mana!! -= amount;
  };

  isInCombat = () => this.turnsSinceCombatAction !== null && this.turnsSinceCombatAction <= 10;

  setActivity = (activity: Activity, frameNumber: number, direction: Direction | null) => {
    this.activity = activity;
    this.frameNumber = frameNumber ?? 1;
    this.direction = direction ?? this.direction;
  };

  getStunned = (duration: number) => {
    this.stunDuration = Math.max(this.stunDuration, duration)
  };
}

export default Unit;
