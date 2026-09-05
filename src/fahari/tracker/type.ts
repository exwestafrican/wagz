export type Coordinate = {
  longitude: number;
  latitude: number;
};

export enum GeofenceDirection {
  TOWARDS_GEOFENCE = 'TOWARDS_GEOFENCE',
  AWAY_FROM_GEOFENCE = 'AWAY_FROM_GEOFENCE',
  STATIONARY = 'STATIONARY',
}
