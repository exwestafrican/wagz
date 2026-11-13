import { GooglePlacesClient } from '@/fahari/booking/places/google-places.client';
import { PlacesUnavailableError } from '@/fahari/booking/places/places.types';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('GooglePlacesClient', () => {
  const client = new GooglePlacesClient('server-key');
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  describe('suggest', () => {
    it('asks Google for Nigerian addresses near Lagos and keeps only the address text', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          suggestions: [
            {
              placePrediction: {
                placeId: 'admiralty-way',
                text: { text: 'Admiralty Way, Lekki, Nigeria' },
              },
            },
            { queryPrediction: { text: { text: 'admiralty' } } },
          ],
        }),
      );

      const suggestions = await client.suggest('Admiralty', 'session-1');

      expect(suggestions).toEqual([
        { placeId: 'admiralty-way', text: 'Admiralty Way, Lekki, Nigeria' },
      ]);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://places.googleapis.com/v1/places:autocomplete');
      expect(init.headers).toMatchObject({ 'X-Goog-Api-Key': 'server-key' });
      expect(JSON.parse(init.body as string)).toMatchObject({
        input: 'Admiralty',
        sessionToken: 'session-1',
        includedRegionCodes: ['ng'],
      });
    });

    it('returns no suggestions when Google finds none', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}));

      expect(await client.suggest('zzzz')).toEqual([]);
    });

    it('throws PlacesUnavailableError when Google refuses the key', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ error: { status: 'PERMISSION_DENIED' } }, 403),
      );

      await expect(client.suggest('Admiralty')).rejects.toThrow(
        PlacesUnavailableError,
      );
    });
  });

  describe('locate', () => {
    it('returns the coordinates of the picked place in the same session', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          id: 'admiralty-way',
          location: { latitude: 6.4281, longitude: 3.4219 },
        }),
      );

      expect(await client.locate('admiralty-way', 'session-1')).toEqual({
        placeId: 'admiralty-way',
        latitude: 6.4281,
        longitude: 3.4219,
      });
      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toBe(
        'https://places.googleapis.com/v1/places/admiralty-way?sessionToken=session-1',
      );
    });

    it('throws PlacesUnavailableError when the place has no location', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 'admiralty-way' }));

      await expect(client.locate('admiralty-way')).rejects.toThrow(
        PlacesUnavailableError,
      );
    });
  });
});
