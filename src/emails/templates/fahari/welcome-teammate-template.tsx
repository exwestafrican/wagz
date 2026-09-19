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

export interface WelcomeTeammateTemplateProps {
  accountName: string;
  bankName: string;
  accountNumber: string;
}

export const WelcomeTeammateTemplate = ({
  accountName,
  bankName,
  accountNumber,
}: WelcomeTeammateTemplateProps): React.ReactElement => {
  return (
    <Html>
      <Head />
      <Tailwind config={fahariTailwindConfig}>
        <Body className="bg-[#f4f4f4] font-notion">
          <Preview>Welcome to Fleets by Fahari</Preview>
          <Container className="mx-auto my-10 max-w-[420px] bg-white px-6 py-8">
            <Img
              src={FAHARI_FULL_LOGO_SRC}
              width="110"
              height="66"
              alt="Fahari"
              className="block"
            />
            <Container className="px-5">
              <Heading className="mt-1 mb-2 mx-0 p-0 text-[24px] text-[#333]">
                Hey Comrade 👋
              </Heading>
              <Text className="mt-0 mb-6 text-[14px] text-[#333]">
                Welcome to Fleets by Fahari, Here&apos;s your account detail to
                help you get setup.
              </Text>

              <Hr className="my-0 border border-[#ddd] border-dashed" />

              <Section className="py-4">
                <Row>
                  <Column>
                    <Text className="m-0 text-[12px] text-[#898989]">Name</Text>
                  </Column>
                  <Column align="right">
                    <Text className="m-0 text-[14px] text-[#333]">
                      {accountName}
                    </Text>
                  </Column>
                </Row>
                <Row>
                  <Column>
                    <Text className="mt-3 mb-0 text-[12px] text-[#898989]">
                      Bank
                    </Text>
                  </Column>
                  <Column align="right">
                    <Text className="mt-3 mb-0 text-[14px] text-[#333]">
                      {bankName}
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
                      {accountNumber}
                    </Text>
                  </Column>
                </Row>
              </Section>

              <Hr className="my-0 border border-[#ddd] border-dashed" />

              <Text className="mt-6 mb-0 text-[14px] text-[#333]">
                Now you&apos;re all setup to book your first car from the fleet.
              </Text>
            </Container>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

WelcomeTeammateTemplate.PreviewProps = {
  accountName: 'Ada Okonkwo',
  bankName: 'Moniepoint Microfinance Bank',
  accountNumber: '0065432190',
} satisfies WelcomeTeammateTemplateProps;

export default WelcomeTeammateTemplate;
