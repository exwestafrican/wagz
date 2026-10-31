import {
  Html,
  Head,
  Tailwind,
  Body,
  Container,
  Heading,
  Text,
  Section,
  Row,
  Column,
  Hr,
  Preview,
  Img,
} from '@react-email/components';
import React from 'react';
import { FAHARI_FULL_LOGO_SRC } from '@/emails/fahari-full-logo';
import { fahariTailwindConfig } from '@/emails/templates/fahari/theme';

export interface RideRequestReceivedTemplateProps {
  requestId: number;
  experienceName: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  pickupLocation: string;
  nearestLandmark: string | null;
  pickupDateTime: string;
  departureDateTime: string;
  numberOfPassengers: number;
  amount: string;
  currency: string;
}

function formatAmount(amount: string): string {
  return new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

function DetailRow({
  label,
  value,
  first = false,
}: {
  label: string;
  value: string;
  first?: boolean;
}) {
  const spacing = first ? 'm-0' : 'mt-3 mb-0';
  return (
    <Row>
      <Column>
        <Text className={`${spacing} text-[12px] text-[#898989]`}>{label}</Text>
      </Column>
      <Column align="right">
        <Text className={`${spacing} text-[14px] text-[#333]`}>{value}</Text>
      </Column>
    </Row>
  );
}

export const RideRequestReceivedTemplate = ({
  requestId,
  experienceName,
  guestName,
  guestEmail,
  guestPhone,
  pickupLocation,
  nearestLandmark,
  pickupDateTime,
  departureDateTime,
  numberOfPassengers,
  amount,
  currency,
}: RideRequestReceivedTemplateProps): React.ReactElement => {
  const formattedAmount = formatAmount(amount);

  return (
    <Html>
      <Head />
      <Tailwind config={fahariTailwindConfig}>
        <Body className="bg-[#f4f4f4] font-notion">
          <Preview>{`New ride request: ${experienceName}`}</Preview>
          <Container className="mx-auto my-10 max-w-[420px] bg-white px-6 py-8">
            <Img
              src={FAHARI_FULL_LOGO_SRC}
              width="110"
              height="66"
              alt="Fahari"
              className="block"
            />
            <Container className="px-5">
              <Heading className="mt-1 mb-2 mx-0 p-0 text-[24px] uppercase tracking-[1px] text-[#333]">
                New ride request
              </Heading>
              <Text className="mt-0 mb-6 text-[14px] text-[#333]">
                A guest requested a ride for {experienceName}.
              </Text>

              <Hr className="my-0 border border-[#ddd] border-dashed" />

              <Section className="py-4">
                <DetailRow label="Request" value={`#${requestId}`} first />
                <DetailRow label="Guest" value={guestName} />
                <DetailRow label="Email" value={guestEmail} />
                <DetailRow label="Phone" value={guestPhone} />
              </Section>

              <Hr className="my-0 border border-[#ddd] border-dashed" />

              <Section className="py-4">
                <DetailRow label="Pickup" value={pickupLocation} first />
                {nearestLandmark && (
                  <DetailRow label="Nearest landmark" value={nearestLandmark} />
                )}
                <DetailRow label="Pickup time" value={pickupDateTime} />
                <DetailRow label="Departure" value={departureDateTime} />
                <DetailRow
                  label="Passengers"
                  value={String(numberOfPassengers)}
                />
              </Section>

              <Hr className="my-0 border border-[#ddd] border-dashed" />

              <Section className="py-4">
                <Row>
                  <Column>
                    <Text className="m-0 text-[12px] uppercase tracking-[1px] text-[#898989]">
                      Total
                    </Text>
                  </Column>
                  <Column align="right">
                    <Text className="m-0 font-mono text-[20px] text-[#333]">
                      {currency} {formattedAmount}
                    </Text>
                  </Column>
                </Row>
              </Section>

              <Hr className="my-0 border border-[#ddd] border-dashed" />

              <Text className="mt-6 mb-0 text-[12px] text-[#ababab]">
                Ride request #{requestId}
              </Text>
            </Container>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

RideRequestReceivedTemplate.PreviewProps = {
  requestId: 42,
  experienceName: 'ara iye',
  guestName: 'Amara Okafor',
  guestEmail: 'guest@example.com',
  guestPhone: '+234 8031234567',
  pickupLocation: '12 Admiralty Way, Lekki',
  nearestLandmark: 'Opposite Shoprite',
  pickupDateTime: '21 Oct 2026, 15:00 WAT',
  departureDateTime: '22 Oct 2026, 11:00 WAT',
  numberOfPassengers: 1,
  amount: '88245.00',
  currency: 'NGN',
} satisfies RideRequestReceivedTemplateProps;

export default RideRequestReceivedTemplate;
