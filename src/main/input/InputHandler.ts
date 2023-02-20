import { pickupItem, useItem } from '../items/ItemUtils';
import { playSound } from '../sounds/SoundFX';
import Sounds from '../sounds/Sounds';
import Coordinates from '../geometry/Coordinates';
import PlayerUnitController from '../units/controllers/PlayerUnitController';
import UnitAbility from '../units/abilities/UnitAbility';
import { toggleFullScreen } from '../utils/dom';
import { checkNotNull } from '../utils/preconditions';
import { GameEngine } from '../core/GameEngine';
import GameState from '../core/GameState';
import { GameDriver } from '../core/GameDriver';
import { ArrowKey, KeyCommand, ModifierKey, NumberKey } from './inputTypes';
import { getDirection, mapToCommand } from './inputMappers';
import { UnitAbilities } from '../units/abilities/UnitAbilities';

type PromiseSupplier = () => Promise<void>;

type Props = Readonly<{
  engine: GameEngine,
  state: GameState,
  driver: GameDriver
}>;

export class InputHandler {
  private readonly engine: GameEngine;
  private readonly state: GameState;
  private readonly driver: GameDriver;

  private busy: boolean;
  private eventTarget: HTMLElement | null;

  constructor({ engine, state, driver }: Props) {
    this.engine = engine;
    this.state = state;
    this.driver = driver;

    this.busy = false;
    this.eventTarget = null;
  }

  keyHandlerWrapper = async (event: KeyboardEvent) => {
    if (!this.busy) {
      this.busy = true;
      await this.keyHandler(event);
      this.busy = false;
    }
  };

  keyHandler = async (e: KeyboardEvent): Promise<void> => {
    const command : (KeyCommand | null) = mapToCommand(e);

    if (!command) {
      return;
    }

    e.preventDefault();

    switch (command.key) {
      case 'UP':
      case 'DOWN':
      case 'LEFT':
      case 'RIGHT':
        return this._handleArrowKey(command.key, command.modifiers);
      case 'SPACEBAR':
        playSound(Sounds.FOOTSTEP);
        return this.engine.playTurn();
      case 'ENTER':
        return this._handleEnter(command.modifiers);
      case 'TAB':
        return this._handleTab();
      case 'M':
        return this._handleMap();
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        return this._handleAbility(command.key);
      case 'F1':
        return this._handleF1();
      case 'NONE':
      default: // not reachable
        return;
    }
  };

  private _handleArrowKey = async (key: ArrowKey, modifiers: ModifierKey[]) => {
    const { state } = this;

    switch (state.getScreen()) {
      case 'GAME':
        const { dx, dy } = getDirection(key);
        const playerUnit = state.getPlayerUnit();
        const { x, y } = Coordinates.plus(playerUnit.getCoordinates(), { dx, dy });

        let queuedOrder: PromiseSupplier | null = null;
        if (modifiers.includes('SHIFT')) {
          if (playerUnit.getEquipment().getBySlot('RANGED_WEAPON') && playerUnit.canSpendMana(UnitAbilities.SHOOT_ARROW.manaCost)) {
            queuedOrder = () => UnitAbilities.SHOOT_ARROW.use(playerUnit, { x, y });
          }
        } else if (modifiers.includes('ALT')) {
          if (playerUnit.canSpendMana(UnitAbilities.STRAFE.manaCost)) {
            queuedOrder = () => UnitAbilities.STRAFE.use(playerUnit, { x, y });
          }
        } else {
          const ability = state.getQueuedAbility();
          if (ability !== null) {
            queuedOrder = async () => {
              state.setQueuedAbility(null);
              await ability.use(playerUnit, { x, y });
            };
          } else {
            queuedOrder = () => UnitAbilities.ATTACK.use(playerUnit, { x, y });
          }
        }
        const playerController = playerUnit.getController() as PlayerUnitController;
        if (queuedOrder) {
          playerController.queuedOrder = queuedOrder;
          await this.engine.playTurn();
        }
        break;
      case 'INVENTORY':
        const inventory = state.getPlayerUnit().getInventory();

        switch (key) {
          case 'UP':
            inventory.previousItem();
            break;
          case 'DOWN':
            inventory.nextItem();
            break;
          case 'LEFT':
            inventory.previousCategory();
            break;
          case 'RIGHT':
            inventory.nextCategory();
            break;
        }
        await this.engine.render();
        break;
      default:
        break;
    }
  };

  private _handleEnter = async (modifiers: ModifierKey[]) => {
    const { state, driver } = this;
    const playerUnit = state.getPlayerUnit();

    if (modifiers.includes('ALT')) {
      try {
        await toggleFullScreen();
      } catch (e) {
        console.error(e);
      }
      return;
    }

    switch (state.getScreen()) {
      case 'GAME': {
        const map = checkNotNull(state.getMap(), 'Map is not loaded!');
        const { x, y } = playerUnit.getCoordinates();
        const item = map.getItem({ x, y });
        if (item) {
          pickupItem(playerUnit, item);
          map.removeItem({ x, y });
        } else if (map.getTile({ x, y }).type === 'STAIRS_DOWN') {
          playSound(Sounds.DESCEND_STAIRS);
          await this.engine.loadNextMap();
        }
        await this.engine.playTurn();
        break;
      }
      case 'INVENTORY': {
        const playerUnit = state.getPlayerUnit();
        const { selectedItem } = playerUnit.getInventory();

        if (selectedItem) {
          state.setScreen('GAME');
          await useItem(playerUnit, selectedItem);
          await this.engine.render();
        }
        break;
      }
      case 'TITLE':
        state.setScreen('GAME');
        if (modifiers.includes('SHIFT')) {
          await this.engine.startGameDebug();
        } else {
          await this.engine.startGame();
        }
        break;
      case 'VICTORY':
      case 'GAME_OVER': {
        await driver.showSplashScreen();
      }
    }
  };

  private _handleTab = async () => {
    const { state, engine } = this;

    switch (state.getScreen()) {
      case 'INVENTORY':
        state.setScreen('GAME');
        break;
      default:
        state.setScreen('INVENTORY');
        break;
    }
    await engine.render();
  };

  private _handleMap = async () => {
    const { state, engine } = this;

    switch (state.getScreen()) {
      case 'MINIMAP':
        state.setScreen('GAME');
        break;
      case 'GAME':
      case 'INVENTORY':
        state.setScreen('MINIMAP');
        break;
      default:
        break;
    }
    await engine.render();
  };

  private _handleAbility = async (command: NumberKey) => {
    const { state, engine } = this;
    const playerUnit = state.getPlayerUnit();

    // sketchy - player abilities are indexed as (0 => attack, others => specials)
    const index = parseInt(command.toString());
    const ability = playerUnit.getAbilities()
      .filter(ability => ability.icon !== null)
      [index - 1];
    if (ability && playerUnit.canSpendMana(ability.manaCost)) {
      state.setQueuedAbility(ability);
      await engine.render();
    }
  };

  private _handleF1 = async () => {
    const { state, engine } = this;
    if (['GAME', 'INVENTORY', 'MINIMAP'].includes(state.getScreen())) {
      state.setScreen('HELP');
    } else {
      state.showPrevScreen();
    }
    await engine.render();
  };

  addEventListener = (target: HTMLElement) => {
    target.addEventListener('keydown', this.keyHandlerWrapper);
    this.eventTarget = target;
  };

  removeEventListener = () => {
    this.eventTarget?.removeEventListener('keydown', this.keyHandlerWrapper);
  };
}
