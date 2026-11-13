import { Logger } from '@nestjs/common';
import {
  AddressSuggestion,
  GoogleAutocompleteResponse,
  GooglePlaceResponse,
  PlaceLocation,
  PlacesUnavailableError,
} from '@/fahari/booking/places/places.types';

const PLACES_BASE_URL = 'https://places.googleapis.com/v1';

// Suggestions stay in Nigeria and lean towards Lagos, where most pickups are.
const LAGOS_BIAS = {
  circle: {
    center: { latitude: 6.5244, longitude: 3.3792 },
    radius: 50_000,
  },
};

export class GooglePlacesClient {
  private readonly logger = new Logger(GooglePlacesClient.name);

  constructor(private readonly apiKey: string) {}

  // sessionToken groups a guest's searches and their final pick into one billed session.
  async suggest(
    input: string,
    sessionToken?: string,
  ): Promise<AddressSuggestion[]> {
    const response = await fetch(`${PLACES_BASE_URL}/places:autocomplete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask':
          'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text',
      },
      body: JSON.stringify({
        input,
        sessionToken,
        includedRegionCodes: ['ng'],
        locationBias: LAGOS_BIAS,
      }),
    });

    const body = await this.runIfOk<GoogleAutocompleteResponse>(
      response,
      'Failed to fetch address suggestions',
    );
    return (body.suggestions ?? []).flatMap(({ placePrediction }) =>
      placePrediction
        ? [
            {
              placeId: placePrediction.placeId,
              text: placePrediction.text.text,
            },
          ]
        : [],
    );
  }

  async locate(placeId: string, sessionToken?: string): Promise<PlaceLocation> {
    const query = sessionToken
      ? `?sessionToken=${encodeURIComponent(sessionToken)}`
      : '';
    const response = await fetch(
      `${PLACES_BASE_URL}/places/${encodeURIComponent(placeId)}${query}`,
      {
        method: 'GET',
        headers: {
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'id,location',
        },
      },
    );

    const place = await this.runIfOk<GooglePlaceResponse>(
      response,
      'Failed to fetch place location',
    );
    if (!place.location) {
      throw new PlacesUnavailableError('Place has no location');
    }
    return {
      placeId: place.id,
      latitude: place.location.latitude,
      longitude: place.location.longitude,
    };
  }

  private async runIfOk<T>(
    response: Response,
    failureMessage: string,
  ): Promise<T> {
    if (!response.ok) {
      this.logger.warn(`${failureMessage} status=${response.status}`);
      throw new PlacesUnavailableError(failureMessage, response.status);
    }
    return (await response.json()) as T;
  }
}
