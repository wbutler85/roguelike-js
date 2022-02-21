import EmptyRegionConnection from './  EmptyRegionConnection';
import { replace, subtract } from '../../../utils/arrays';
import { checkState } from '../../../utils/preconditions';
import { randInt, shuffle } from '../../../utils/random';
import Connection from './Connection';
import RoomRegion from './RoomRegion';

type Props = {
  minRoomFraction: number,
  maxRoomFraction: number
};

/**
 * This class handles removal of several unwanted features that were generated by the initial steps.
 */
class MapPruner {
  private readonly minRoomFraction: number;
  private readonly maxRoomFraction: number;

  constructor({
    minRoomFraction,
    maxRoomFraction
  }: Props) {
    this.minRoomFraction = minRoomFraction;
    this.maxRoomFraction = maxRoomFraction;
  }

  /**
   * A connection is orphaned if, for either of its endpoints, there is neither a room nor a connected
   * internal connection that connects to that endpoint.
   *
   * @return a copy of `externalConnections` with the desired elements removed
   */
  stripOrphanedConnections = (externalConnections: Connection[], emptyRegionConnections: EmptyRegionConnection[]) => {
    while (true) {
      const orphanedConnections = externalConnections.filter(connection => {
        return this._isOrphanedConnection(connection, emptyRegionConnections);
      });

      subtract(externalConnections, orphanedConnections);

      for (const emptyRegionConnection of emptyRegionConnections) {
        this._pruneEmptyRegionConnection(emptyRegionConnection, orphanedConnections);
      }

      const orphanedEmptyRegionConnections = emptyRegionConnections.filter(connection =>
        this._isOrphanedEmptyRegionConnection(connection, emptyRegionConnections));
      subtract(emptyRegionConnections, orphanedEmptyRegionConnections);

      const removedAnyConnections = (orphanedConnections.length > 0 || orphanedEmptyRegionConnections.length > 0);
      console.debug(`stripping: ${orphanedConnections.length}, ${orphanedEmptyRegionConnections.length}`);
      if (!removedAnyConnections) {
        return;
      }
    }
  };

  removeRooms = (regions: RoomRegion[]) => {
    const minRooms = Math.max(3, Math.round(regions.length * this.minRoomFraction));
    const maxRooms = Math.max(minRooms, regions.length * this.maxRoomFraction);
    checkState(regions.length >= minRooms, 'Not enough regions');

    const numRooms = randInt(minRooms, maxRooms);

    const shuffledRegions = [...regions];
    shuffle(shuffledRegions);
    for (let i = numRooms; i < shuffledRegions.length; i++) {
      shuffledRegions[i].roomRect = null;
    }
  };

  private _isOrphanedConnection = (connection: Connection, emptyRegionConnections: EmptyRegionConnection[]) => {
    const { start, end } = connection;
    let startHasEmptyRegionConnection = false;
    let endHasEmptyRegionConnection = false;

    for (const emptyRegionConnection of emptyRegionConnections) {
      const { roomRegion, neighbors } = emptyRegionConnection;
      if (roomRegion === start && neighbors.includes(end)) {
        startHasEmptyRegionConnection = true;
      }
      if (roomRegion === end && neighbors.includes(start)) {
        endHasEmptyRegionConnection = true;
      }
    }

    return !(
      (!!start.roomRect || startHasEmptyRegionConnection)
      && (!!end.roomRect || endHasEmptyRegionConnection)
    );
  };

  private _pruneEmptyRegionConnection = (emptyRegionConnection: EmptyRegionConnection, orphanedConnections: Connection[]) => {
    for (const connection of orphanedConnections) {
      const { roomRegion, neighbors } = emptyRegionConnection;
      const { start, end } = connection;
      const updatedNeighbors: RoomRegion[] = neighbors.filter(neighbor => {
        if (roomRegion === start && neighbor === end) {
          return false;
        }
        if (roomRegion === end && neighbor === start) {
          return false;
        }
        return true;
      });
      replace(neighbors, updatedNeighbors);
    }
  };

  /**
   * An internal connection is orphaned if at most one of its neighbors has either a room or another
   * internal connection
   */
  private _isOrphanedEmptyRegionConnection = (emptyRegionConnection: EmptyRegionConnection, emptyRegionConnections: EmptyRegionConnection[]) => {
    let connectedNeighbors = 0;
    const { roomRegion, neighbors } = emptyRegionConnection;
    for (const neighbor of neighbors) {
      const neighborHasEmptyRegionConnection = emptyRegionConnections.find(other =>
        other.roomRegion === neighbor && other.neighbors.includes(roomRegion));

      if (!!neighbor.roomRect || neighborHasEmptyRegionConnection) {
        connectedNeighbors++;
      }
    }
    return connectedNeighbors <= 1;
  };
}

export default MapPruner;
