import { NotFoundException } from '@nestjs/common';
import { getClientDetailsOrThrow } from '@/fahari/booking/ride-booking/query';

describe('getClientDetailsOrThrow', () => {
  it('returns the ara iye client', () => {
    expect(getClientDetailsOrThrow('araiye')).toMatchObject({
      code: 'araiye',
      name: 'ara iye',
    });
  });

  it('throws NotFoundException when the client code is unknown', () => {
    expect(() => getClientDetailsOrThrow('missing-client')).toThrow(
      NotFoundException,
    );
  });
});
