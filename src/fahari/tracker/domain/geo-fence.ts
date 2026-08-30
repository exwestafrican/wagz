type GeoFence = {
  tag: GeoTag;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  transitionZoneMeters: number;
};

export default GeoFence;

export type Coordinate = {
  longitude: number;
  latitude: number;
};

export enum GeoFenceStatus {
  IN_FENCE = 'IN_FENCE',
  TRANSITIONING = 'TRANSITIONING',
  OUTSIDE_FENCE = 'OUTSIDE_FENCE',
}
export interface GeoFenceResult {
  status: GeoFenceStatus;
  distanceInMeters: number;
}

export enum GeofenceDirection {
  TOWARDS_GEOFENCE = 'TOWARDS_GEOFENCE',
  AWAY_FROM_GEOFENCE = 'AWAY_FROM_GEOFENCE',
  STATIONARY = 'STATIONARY',
}
// GeoTag if not in home or office then in transit
// defaultTag config or custom

export enum GeoTag {
  HOME = 'HOME',
}

// if stationary
// if isIdle

export function geofenceOrThrow(tag: GeoTag): GeoFence {
  //TODO:
  if (tag === GeoTag.HOME) {
    return {
      tag: GeoTag.HOME,
      latitude: 6.497747,
      longitude: 3.381939,
      radiusMeters: 75,
      transitionZoneMeters: 12,
    };
  }
  throw new Error(`GeoFence could not be found.`);
}

export function geoFenceStatus(tag: string): GeoFenceStatus {
  if (
    [GeoTag.HOME]
      .map((t) => t.toString().toLowerCase())
      .includes(tag.toLowerCase())
  ) {
    return GeoFenceStatus.IN_FENCE;
  }
  return GeoFenceStatus.TRANSITIONING;
}
