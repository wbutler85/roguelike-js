import GameState from '../../core/GameState';
import { manhattanDistance } from '../../maps/MapUtils';
import { checkNotNull } from '../../utils/preconditions';
import { randBoolean, weightedRandom } from '../../utils/random';
import Unit from '../Unit';
import UnitBehavior from '../UnitBehaviors';
import UnitController from './UnitController';

const HUMAN_CAUTIOUS: UnitController = {
  issueOrder(unit: Unit) {
    const playerUnit = GameState.getInstance().getPlayerUnit();

    let behavior: UnitBehavior;
    const distanceToPlayer = manhattanDistance(unit, playerUnit);

    if (distanceToPlayer === 1) {
      if ((unit.life / unit.maxLife) >= 0.4) {
        behavior = UnitBehavior.ATTACK_PLAYER;
      } else {
        behavior = weightedRandom({
          'ATTACK_PLAYER': 0.2,
          'WANDER': 0.5,
          'FLEE_FROM_PLAYER': 0.3
        }, UnitBehavior);
      }
    } else if (distanceToPlayer >= 5) {
      behavior = weightedRandom({
        'WANDER': 0.3,
        'ATTACK_PLAYER': 0.1,
        'STAY': 0.6
      }, UnitBehavior);
    } else {
      behavior = weightedRandom({
        'ATTACK_PLAYER': 0.6,
        'WANDER': 0.2,
        'STAY': 0.2
      }, UnitBehavior);
    }
    return behavior(unit);
  }
};

const HUMAN_AGGRESSIVE = {
  issueOrder(unit: Unit) {
    const playerUnit = GameState.getInstance().getPlayerUnit();

    let behavior: UnitBehavior;
    const distanceToPlayer = manhattanDistance(unit, playerUnit);

    if (distanceToPlayer === 1) {
      behavior = UnitBehavior.ATTACK_PLAYER;
    } else if (distanceToPlayer >= 6) {
      behavior = weightedRandom({
        'WANDER': 0.4,
        'STAY': 0.4,
        'ATTACK_PLAYER': 0.2
      }, UnitBehavior);
    } else {
      behavior = weightedRandom({
        'ATTACK_PLAYER': 0.9,
        'STAY': 0.1
      }, UnitBehavior);
    }
    return behavior(unit);
  }
};

const HUMAN_DETERMINISTIC = {
  issueOrder(unit: Unit) {
    const playerUnit = GameState.getInstance().getPlayerUnit();

    const aiParameters = checkNotNull(unit.getUnitClass().aiParameters, 'HUMAN_DETERMINISTIC behavior requires aiParams!');
    const { speed, visionRange, fleeThreshold } = aiParameters;

    let behavior: UnitBehavior;
    const distanceToPlayer = manhattanDistance(unit, playerUnit);

    if (!_canMove(speed)) {
      behavior = UnitBehavior.STAY;
    } else if ((unit.life / unit.maxLife) < fleeThreshold) {
      behavior = UnitBehavior.FLEE_FROM_PLAYER;
    } else if (distanceToPlayer <= visionRange) {
      behavior = UnitBehavior.ATTACK_PLAYER;
    } else {
      if (randBoolean()) {
        behavior = UnitBehavior.STAY;
      } else {
        behavior = UnitBehavior.WANDER;
      }
    }
    return behavior(unit);
  }
};

const _canMove = (speed: number): boolean => {
  // deterministic version
  // const { turn } = GameState.getInstance();
  // return Math.floor(speed * turn) > Math.floor(speed * (turn - 1));

  // random version
  return Math.random() < speed;
};

export {
  HUMAN_CAUTIOUS,
  HUMAN_AGGRESSIVE,
  HUMAN_DETERMINISTIC
};
