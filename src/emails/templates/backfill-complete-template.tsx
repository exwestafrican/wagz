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
import { BackfillRunStatus } from '@/backfill/dto/backfill-run-response.dto';

interface BackfillCompleteTemplateProps {
  jobId: string;
  status: BackfillRunStatus;
  workspacesProcessed: number;
  workspacesSucceeded: number;
  workspacesFailed: number;
}

export const BackfillCompleteTemplate = ({
  jobId,
  status,
  workspacesProcessed,
  workspacesSucceeded,
  workspacesFailed,
}: BackfillCompleteTemplateProps): React.ReactElement => {
  return (
    <Html>
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
        }}
      >
        <Body className="bg-white px-[24px]">
          <Preview>{`Backfill ${jobId} completed: ${status}`}</Preview>
          <Text className="text-[24px] text-black leading-[24px] font-semibold">
            Backfill job completed
          </Text>
          <Text className="text-[16px] text-black leading-[24px]">
            The backfill job you triggered has finished running. Here is a
            summary of the run.
          </Text>
          <Section className="mt-[24px] mb-[24px]">
            <Text className="m-0 text-[16px] text-black leading-[24px]">
              <strong>Job ID:</strong> {jobId}
            </Text>
            <Text className="m-0 text-[16px] text-black leading-[24px]">
              <strong>Status:</strong> {status}
            </Text>
            <Text className="m-0 text-[16px] text-black leading-[24px]">
              <strong>Workspaces processed:</strong> {workspacesProcessed}
            </Text>
            <Text className="m-0 text-[16px] text-black leading-[24px]">
              <strong>Workspaces succeeded:</strong> {workspacesSucceeded}
            </Text>
            <Text className="m-0 text-[16px] text-black leading-[24px]">
              <strong>Workspaces failed:</strong> {workspacesFailed}
            </Text>
          </Section>
        </Body>
      </Tailwind>
    </Html>
  );
};

BackfillCompleteTemplate.PreviewProps = {
  jobId: 'normalize_usernames',
  status: BackfillRunStatus.PARTIAL,
  workspacesProcessed: 12,
  workspacesSucceeded: 11,
  workspacesFailed: 1,
};

export default BackfillCompleteTemplate;
