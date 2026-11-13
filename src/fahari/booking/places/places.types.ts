export type AddressSuggestion = {
  placeId: string;
  text: string;
};

export type PlaceLocation = {
  placeId: string;
  latitude: number;
  longitude: number;
};

export class PlacesUnavailableError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'PlacesUnavailableError';
  }
}

export type GoogleAutocompleteResponse = {
  suggestions?: {
    placePrediction?: {
      placeId: string;
      text: { text: string };
    };
  }[];
};

export type GooglePlaceResponse = {
  id: string;
  location?: { latitude: number; longitude: number };
};
