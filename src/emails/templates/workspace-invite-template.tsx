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

interface WorkspaceInviteTemplateProps {
  senderName: string;
  inviteLink: string;
}

export const WorkspaceInviteTemplate = ({
  senderName,
  inviteLink,
}: WorkspaceInviteTemplateProps): React.ReactElement => {
  return (
    <Html>
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
        }}
        children={[]}
      >
        <Body className="mx-auto my-auto bg-white px-2 font-sans">
          <Preview children={[]}>{`join ${senderName} on Envoye 🚀`}</Preview>
          <Container className="mx-auto my-[40px] max-w-[465px] rounded border border-[#eaeaea] border-solid p-[20px]">
            <Text className="text-[14px] text-black leading-[24px]">
              Hey champ 🏆
            </Text>
            <Text className="text-[14px] text-black leading-[24px]">
              {senderName} has invited you to join your teams
              <strong>Envoye</strong>.
            </Text>
            <Section className="mt-[32px] mb-[32px] text-center">
              <Button
                className="rounded bg-[#000000] px-5 py-3 text-center font-semibold text-[12px] text-white no-underline"
                href={inviteLink}
              >
                Join the team
              </Button>
            </Section>
            <Text className="text-[14px] text-black leading-[24px]">
              or copy and paste this URL into your browser:{' '}
              <Link href={inviteLink} className="text-blue-600 no-underline">
                {inviteLink}
              </Link>
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

WorkspaceInviteTemplate.PreviewProps = {
  senderName: 'Tumisé',
  inviteLink: 'https://envoye.co',
};

export default WorkspaceInviteTemplate;
