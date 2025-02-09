import Coordinates from '../../../geometry/Coordinates';
import RoomRegion from './RoomRegion';
import SplitDirection from './SplitDirection';

type Connection = {
  start: RoomRegion,
  end: RoomRegion,
  startCoordinates: Coordinates,
  endCoordinates: Coordinates,
  middleCoordinates: Coordinates,
  direction: SplitDirection
};

namespace Connection {
  export const toString = ({ startCoordinates, endCoordinates }: Connection) =>
    `[(${startCoordinates.x}, ${startCoordinates.y})-(${endCoordinates.x}, ${endCoordinates.y})]`;

  export const matches = (connection: Connection, first: RoomRegion, second: RoomRegion) => {
    // ref. equality should be fine
    if (connection.start === first && connection.end === second) {
      return true;
    } else if (connection.start === second && connection.end === first) {
      return true;
    } else {
      return false;
    }
  };
}

export default Connection;
