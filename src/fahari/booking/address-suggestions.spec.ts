import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';

import { createTestApp } from '@/test-helpers/test-app';
import getHttpServer from '@/test-helpers/get-http-server';
import { BookingController } from '@/fahari/booking/booking.controller';
import { ResortLineItemPricer } from '@/fahari/booking/calculator/resort-line-item-pricer';
import ChauffeurFare from '@/fahari/booking/calculator/chauffeur-pricer';
import { RideRequestService } from '@/fahari/booking/ride-request.service';
import { GooglePlacesClient } from '@/fahari/booking/places/google-places.client';
import { PlacesUnavailableError } from '@/fahari/booking/places/places.types';

describe('Pickup address suggestions', () => {
  let app: INestApplication;
  const placesClient = {
    suggest: jest.fn(),
    locate: jest.fn(),
  };

  beforeEach(async () => {
    placesClient.suggest.mockResolvedValue([
      { placeId: 'admiralty-way', text: 'Admiralty Way, Lekki, Nigeria' },
    ]);
    placesClient.locate.mockResolvedValue({
      placeId: 'admiralty-way',
      latitude: 6.4281,
      longitude: 3.4219,
    });

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(),
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 30 }]),
      ],
      controllers: [BookingController],
      providers: [
        ResortLineItemPricer,
        ChauffeurFare,
        { provide: RideRequestService, useValue: {} },
        { provide: GooglePlacesClient, useValue: placesClient },
      ],
    }).compile();

    // A fresh app per test so each starts with an empty rate limit.
    app = await createTestApp(module);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  function suggest(input: string, sessionToken?: string) {
    return request(getHttpServer(app))
      .get('/booking/address-suggestions')
      .query({ input, ...(sessionToken && { sessionToken }) });
  }

  it('returns suggestions for what the guest typed', async () => {
    const response = await suggest('Admiralty', 'session-1').expect(200);

    expect(response.body).toEqual([
      { placeId: 'admiralty-way', text: 'Admiralty Way, Lekki, Nigeria' },
    ]);
    expect(placesClient.suggest).toHaveBeenCalledWith('Admiralty', 'session-1');
  });

  it('does not ask Google until the guest has typed 3 letters', async () => {
    await suggest('Ad').expect(400);

    expect(placesClient.suggest).not.toHaveBeenCalled();
  });

  it('rejects a session token Google would not accept', async () => {
    await suggest('Admiralty', 'not a token!').expect(400);

    expect(placesClient.suggest).not.toHaveBeenCalled();
  });

  it('returns 503 when Google is switched off, so the page falls back to a plain field', async () => {
    placesClient.suggest.mockRejectedValue(
      new PlacesUnavailableError('Failed to fetch address suggestions', 403),
    );

    await suggest('Admiralty').expect(503);
  });

  it('stops a visitor after 30 searches a minute', async () => {
    for (let search = 0; search < 30; search++) {
      await suggest('Admiralty').expect(200);
    }

    await suggest('Admiralty').expect(429);
    expect(placesClient.suggest).toHaveBeenCalledTimes(30);
  });

  it('returns the location of a picked suggestion', async () => {
    const response = await request(getHttpServer(app))
      .get('/booking/places/admiralty-way')
      .query({ sessionToken: 'session-1' })
      .expect(200);

    expect(response.body).toEqual({
      placeId: 'admiralty-way',
      latitude: 6.4281,
      longitude: 3.4219,
    });
    expect(placesClient.locate).toHaveBeenCalledWith(
      'admiralty-way',
      'session-1',
    );
  });

  it('rejects a place id that is not a Google place id', async () => {
    await request(getHttpServer(app))
      .get('/booking/places/..%2Fsecrets')
      .expect(400);

    expect(placesClient.locate).not.toHaveBeenCalled();
  });

  it('returns 503 when Google cannot locate the place', async () => {
    placesClient.locate.mockRejectedValue(
      new PlacesUnavailableError('Place has no location'),
    );

    await request(getHttpServer(app))
      .get('/booking/places/admiralty-way')
      .expect(503);
  });
});
