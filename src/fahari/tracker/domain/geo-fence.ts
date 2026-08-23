type GeoFence = {
  location: string;
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
