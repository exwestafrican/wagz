import {
  Html,
  Head,
  Tailwind,
  pixelBasedPreset,
  Body,
  Container,
  Text,
  Section,
  Preview,
  Hr,
  Img,
  Font,
} from '@react-email/components';
import React from 'react';
import { FAHARI_FULL_LOGO_SRC } from '@/fahari/emails/fahari-full-logo';

export interface PaymentReceivedTemplateProps {
  driverFirstName: string;
  amountPaid: string;
  currency: string;
  senderAccountName: string;
  senderAccountNumber: string;
}

function formatAmount(amountPaid: string): string {
  return new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amountPaid));
}

export const PaymentReceivedTemplate = ({
  driverFirstName,
  amountPaid,
  currency,
  senderAccountName,
  senderAccountNumber,
}: PaymentReceivedTemplateProps): React.ReactElement => {
  const formattedAmount = formatAmount(amountPaid);

  return (
    <Html>
      <Head>
        <Font
          fontFamily="Inter"
          fallbackFontFamily={['Helvetica', 'Arial', 'sans-serif']}
          webFont={{
            url: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYMZs.ttf',
            format: 'truetype',
          }}
          fontWeight={600}
          fontStyle="normal"
        />
        <Font
          fontFamily="Inter"
          fallbackFontFamily={['Helvetica', 'Arial', 'sans-serif']}
          webFont={{
            url: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fMZg.ttf',
            format: 'truetype',
          }}
          fontWeight={500}
          fontStyle="normal"
        />
        <Font
          fontFamily="Inter"
          fallbackFontFamily={['Helvetica', 'Arial', 'sans-serif']}
          webFont={{
            url: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf',
            format: 'truetype',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
        }}
      >
        <Body className="mx-auto my-auto bg-[#FAFAFA] px-2 font-sans">
          <Preview>{`Payment received: ${currency} ${formattedAmount}`}</Preview>
          <Container className="mx-auto my-[40px] max-w-[465px] rounded border border-[#eaeaea] border-solid bg-white p-[32px]">
            <Text
              className="m-0 text-[28px] text-black leading-[34px] font-semibold tracking-[-0.6px]"
              style={{ fontFamily: 'Inter, Helvetica, Arial, sans-serif' }}
            >
              Payment received
            </Text>
            <Text
              className="mt-[16px] mb-0 text-[16px] text-[#37352F] leading-[24px] font-normal"
              style={{
                fontFamily: 'Inter, Helvetica, Arial, sans-serif',
                fontWeight: 400,
              }}
            >
              Hi {driverFirstName}, a customer payment has landed in your
              reserved account.
            </Text>

            <Section className="mt-[32px] mb-[24px]">
              <Text
                className="m-0 text-[40px] text-black leading-[48px] font-semibold tracking-[-1px]"
                style={{ fontFamily: 'Inter, Helvetica, Arial, sans-serif' }}
              >
                {currency} {formattedAmount}
              </Text>
              <Text
                className="mt-[16px] mb-0 text-[14px] text-[#787774] leading-[22px]"
                style={{ fontFamily: 'Inter, Helvetica, Arial, sans-serif' }}
              >
                From {senderAccountName}
              </Text>
              <Text
                className="m-0 text-[14px] text-[#787774] leading-[22px]"
                style={{ fontFamily: 'Inter, Helvetica, Arial, sans-serif' }}
              >
                Account {senderAccountNumber}
              </Text>
            </Section>

            <Hr className="my-[24px] border border-solid border-[#eaeaea]" />

            <Text
              className="m-0 text-[13px] text-[#787774] leading-[20px]"
              style={{ fontFamily: 'Inter, Helvetica, Arial, sans-serif' }}
            >
              If you were not expecting this payment, contact support.
            </Text>

            <Section className="mt-[28px]">
              <Img
                src={FAHARI_FULL_LOGO_SRC}
                width="110"
                height="66"
                alt="Fahari"
                className="block"
              />
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

PaymentReceivedTemplate.PreviewProps = {
  driverFirstName: 'Ada',
  amountPaid: '50000.00',
  currency: 'NGN',
  senderAccountName: 'Monnify Limited',
  senderAccountNumber: '0065432190',
} satisfies PaymentReceivedTemplateProps;

export default PaymentReceivedTemplate;
