export const FeatureFlag = {
  NEW_BOOKING_EXPERIENCE: {
    name: 'new_booking_experience',
    description: 'switch to new booking page with easier payload',
  },
} as const;

export function activeFeatureNames(): string[] {
  return [];
}
