import { GooglePlacesClient } from '@/fahari/booking/places/google-places.client';
import {
  AddressSuggestion,
  PlaceLocation,
  PlacesUnavailableError,
} from '@/fahari/booking/places/places.types';

// Used in tests so they never call Google. Every lookup fails like a switched-off Google would.
export class UnavailablePlacesClient extends GooglePlacesClient {
  constructor() {
    super('');
  }

  override suggest(): Promise<AddressSuggestion[]> {
    return Promise.reject(
      new PlacesUnavailableError('Google Places is not configured'),
    );
  }

  override locate(): Promise<PlaceLocation> {
    return Promise.reject(
      new PlacesUnavailableError('Google Places is not configured'),
    );
  }
}
