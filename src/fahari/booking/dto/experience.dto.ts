import { billingCodes, type Experience } from '@/fahari/booking/config';

export type ExperienceResponseDto = Experience & {
  billingCodes: string[];
};

export function toExperienceResponse(
  experience: Experience,
): ExperienceResponseDto {
  return {
    ...experience,
    billingCodes: billingCodes(experience.code),
  };
}
