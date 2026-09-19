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
      <Head />
      <Tailwind config={fahariTailwindConfig}>
        <Body className="bg-[#f4f4f4] font-notion">
          <Preview>{`Payment received: ${currency} ${formattedAmount}`}</Preview>
          <Container className="mx-auto my-10 max-w-[420px] bg-white px-6 py-8">
            <Img
              src={FAHARI_FULL_LOGO_SRC}
              width="110"
              height="66"
              alt="Fahari"
              className="block"
            />
            <Container className="px-5">
              <Heading className="mt-1 mb-2 mx-0 p-0 text-[24px]  uppercase tracking-[1px] text-[#333]">
                Payment received
              </Heading>
              <Text className="mt-0 mb-6 text-[14px] text-[#333]">
                Hi {driverFirstName}, a customer payment has landed in your
                reserved account.
              </Text>

              <Hr className="my-0 border border-[#ddd] border-dashed" />

              <Section className="py-4">
                <Row>
                  <Column>
                    <Text className="m-0 text-[12px] text-[#898989]">From</Text>
                  </Column>
                  <Column align="right">
                    <Text className="m-0 text-[14px] text-[#333]">
                      {senderAccountName}
                    </Text>
                  </Column>
                </Row>
                <Row>
                  <Column>
                    <Text className="mt-3 mb-0 text-[12px] text-[#898989]">
                      Account
                    </Text>
                  </Column>
                  <Column align="right">
                    <Text className="mt-3 mb-0 font-mono text-[14px] text-[#333]">
                      {senderAccountNumber}
                    </Text>
                  </Column>
                </Row>
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
                If you were not expecting this payment, contact support.
              </Text>
            </Container>
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
