import { LocationPing } from '@/fahari/tracker/tracker.service';
import { average, firstOrThrow, lastOrThrow, sum } from '@/common/utils';
import { distanceInMeters } from '@/fahari/tracker/utils/geo.utils';
import { toCoordinate } from '@/fahari/tracker/utils/location-ping';
import { differenceInSeconds } from 'date-fns';

export function averageSpeedMs(pings: LocationPing[]) {
  const timeDiff = differenceInSeconds(
    lastOrThrow(pings).capturedAt,
    firstOrThrow(pings).capturedAt,
  );

  if (timeDiff <= 0) return 0;

  return totalDistanceMoved(pings) / timeDiff;
}

export function totalDistanceMoved(pings: LocationPing[]) {
  const lastIndex = pings.length - 1;

  const distances: number[] = pings.map((p, currentIndex) => {
    const nextIndex = currentIndex + 1;
    if (nextIndex <= lastIndex) {
      return distanceInMeters(p, pings[nextIndex]);
    }
    return 0;
  });
  return sum(distances);
}
