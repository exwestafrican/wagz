import {
  Html,
  Tailwind,
  pixelBasedPreset,
  Body,
  Container,
  Text,
  Section,
  Button,
  Preview,
  Link,
} from '@react-email/components';
import React from 'react';

interface InviteAcceptedNotificationTemplateProps {
  accepterName: string;
  workspaceName: string;
  workspaceLink: string;
}

export const InviteAcceptedNotificationTemplate = ({
  accepterName,
  workspaceName,
  workspaceLink,
}: InviteAcceptedNotificationTemplateProps): React.ReactElement => {
  return (
    <Html>
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
        }}
      >
        <Body className="mx-auto my-auto bg-white px-2 font-sans">
          <Preview>{`${accepterName} joined ${workspaceName} 🎉`}</Preview>
          <Container className="mx-auto my-[40px] max-w-[465px] rounded border border-[#eaeaea] border-solid p-[20px]">
            <Text className="text-[14px] text-black leading-[24px]">
              Good news 🎉
            </Text>
            <Text className="text-[14px] text-black leading-[24px]">
              <strong>{accepterName}</strong> accepted your invite and joined{' '}
              <strong>{workspaceName}</strong>.
            </Text>
            <Section className="mt-[32px] mb-[32px] text-center">
              <Button
                className="rounded bg-[#000000] px-5 py-3 text-center font-semibold text-[12px] text-white no-underline"
                href={workspaceLink}
              >
                View your team
              </Button>
            </Section>
            <Text className="text-[14px] text-black leading-[24px]">
              or copy and paste this URL into your browser:{' '}
              <Link href={workspaceLink} className="text-blue-600 no-underline">
                {workspaceLink}
              </Link>
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

InviteAcceptedNotificationTemplate.PreviewProps = {
  accepterName: 'Temilade',
  workspaceName: 'Fahari HQ',
  workspaceLink: 'https://envoye.co',
};

export default InviteAcceptedNotificationTemplate;
