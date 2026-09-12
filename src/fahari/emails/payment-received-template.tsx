import {
  Html,
  Tailwind,
  pixelBasedPreset,
  Body,
  Text,
  Section,
  Preview,
} from '@react-email/components';
import React from 'react';

export interface PaymentReceivedTemplateProps {
  driverFirstName: string;
  amountPaid: string;
  currency: string;
  senderAccountName: string;
  senderAccountNumber: string;
}

export const PaymentReceivedTemplate = ({
  driverFirstName,
  amountPaid,
  currency,
  senderAccountName,
  senderAccountNumber,
}: PaymentReceivedTemplateProps): React.ReactElement => {
  return (
    <Html>
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
        }}
      >
        <Body className="bg-white px-[24px] font-sans">
          <Preview>{`Payment received: ${currency} ${amountPaid}`}</Preview>
          <Text className="text-[24px] text-black leading-[24px] font-semibold">
            Payment received
          </Text>
          <Text className="text-[16px] text-black leading-[24px]">
            Hi {driverFirstName}, a customer payment has landed in your reserved
            account.
          </Text>
          <Section className="mt-[24px] mb-[24px]">
            <Text className="m-0 text-[16px] text-black leading-[24px]">
              <strong>Amount:</strong> {currency} {amountPaid}
            </Text>
            <Text className="m-0 text-[16px] text-black leading-[24px]">
              <strong>Sender name:</strong> {senderAccountName}
            </Text>
            <Text className="m-0 text-[16px] text-black leading-[24px]">
              <strong>Sender account:</strong> {senderAccountNumber}
            </Text>
          </Section>
          <Text className="text-[14px] text-black leading-[24px]">
            If you were not expecting this payment, contact support.
          </Text>
        </Body>
      </Tailwind>
    </Html>
  );
};

PaymentReceivedTemplate.PreviewProps = {
  driverFirstName: 'Ada',
  amountPaid: '5000.00',
  currency: 'NGN',
  senderAccountName: 'Monnify Limited',
  senderAccountNumber: '0065432190',
} satisfies PaymentReceivedTemplateProps;

export default PaymentReceivedTemplate;
