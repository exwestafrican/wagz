import { GooglePlacesClient } from '@/fahari/booking/places/google-places.client';
import {
  AddressSuggestion,
  PlaceLocation,
  PlacesUnavailableError,
} from '@/fahari/booking/places/places.types';

// Used when GOOGLE_MAPS_API_KEY is not set: guests get the plain pickup field instead.
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
