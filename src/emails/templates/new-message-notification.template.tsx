import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';

import { collageTailwindConfig } from '@/emails/templates/theme';
import { EnvoyeFonts } from '@/emails/fonts/basic';

interface NewMessageTemplateProps {
  workspaceName: string;
  senderName: string;
  message: string;
  url: string;
  quote: string;
}

export const NewMessageNotificationTemplate = ({
  workspaceName,
  senderName,
  message,
  url,
  quote,
}: NewMessageTemplateProps) => (
  <Tailwind config={collageTailwindConfig}>
    <Html>
      <Head>
        <EnvoyeFonts />
      </Head>

      <Body className="bg-canvas font-14 font-inter text-fg m-0 p-0">
        <Preview className="truncate w-6/10">
          {' '}
          New message in {workspaceName} workspace
        </Preview>
        <Container className="mx-auto max-w-[640px] px-4 pt-16 pb-6">
          <Section className="rounded-[8px] ">
            <Section>
              <Section className="mobile:px-6! px-10 pt-16"></Section>

              <Section className="mobile:px-6! px-10 pt-4">
                <Section className="mb-9">
                  <Text className="font-32 text-fg m-0 font-sans">
                    An envoy has arrived 📬
                  </Text>
                  <Text className="font-14 font-inter text-fg-2 m-0 mt-[18px]">
                    {senderName} sent you a message in{' '}
                    <b>{workspaceName} workspace</b>. Don't keep them waiting
                  </Text>
                </Section>

                <Section className="mb-9 rounded-md border border-solid border-[#eee] bg-[#f4f4f4] px-5 py-2 min-w-[500px] max-w-[640px]">
                  <Text className="font-13 text-fg-3 m-0">
                    {senderName} · {workspaceName} workspace · 2m ago
                  </Text>

                  <Text className="font-mono text-[#333] m-0 mt-3 inline-block truncate w-6/10">
                    {message}
                  </Text>
                </Section>

                <Button
                  href={url}
                  className="bg-brand font-15 font-inter text-fg-inverted inline-block border-none px-5 py-3.5 text-center"
                >
                  Jump in
                </Button>
              </Section>

              <Section className="mobile:px-6! px-10 pt-16 pb-8">
                <Text className="font-11 font-inter text-fg-3 m-0 max-w-[350px]">
                  You're receiving this email because message notifications are
                  enabled for your workspace.
                </Text>
              </Section>

              <Section className="border-stroke border-t px-10 py-8">
                <Text className="font-13 font-inter text-fg-3 m-0">
                  <i className="text-black leading-[24px]">{quote}</i> -{' '}
                  <b className="">Someone from Envoye 🕊️</b>
                </Text>
              </Section>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  </Tailwind>
);

NewMessageNotificationTemplate.PreviewProps = {
  workspaceName: 'Wesp',
  senderName: 'Temilade',
  url: 'http://localhost:3000/workspace/conversation?code=e8r4z7&conversationId=1',
  quote: 'A Simple tool for thoughtful teams.',
  message:
    'Hey, I got your message about the brand theme, do you want me to get that across to you now?',
} satisfies NewMessageTemplateProps;

export default NewMessageNotificationTemplate;
