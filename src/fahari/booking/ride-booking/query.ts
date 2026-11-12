import chauffeurClients from '@/fahari/booking/ride-booking/ride-booking.config';
import { NotFoundException } from '@nestjs/common';

export function getChauffeurClients() {
  return chauffeurClients;
}

export function getClientDetails(clientCode: string) {
  return chauffeurClients.find((c) => c.code === clientCode);
}

export function getClientDetailsOrThrow(clientCode: string) {
  const clientDetails = getClientDetails(clientCode);
  if (!clientDetails)
    throw new NotFoundException(`Cannot find client details with code$={code}`);
  return clientDetails;
}
