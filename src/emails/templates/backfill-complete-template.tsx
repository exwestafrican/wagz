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
import { BackfillRunStatus } from '../../backfill/backfill-run-status';

export interface BackfillCompleteTemplateProps {
  jobId: string;
  status: BackfillRunStatus;
  processed: number;
  success: number;
  failed: number;
}

export const BackfillCompleteTemplate = ({
  jobId,
  status,
  processed,
  success,
  failed,
}: BackfillCompleteTemplateProps): React.ReactElement => {
  return (
    <Html>
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
        }}
      >
        <Body className="bg-white px-[24px] font-sans">
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
              <strong>Workspaces processed:</strong> {processed}
            </Text>
            <Text className="m-0 text-[16px] text-black leading-[24px]">
              <strong>Workspaces succeeded:</strong> {success}
            </Text>
            <Text className="m-0 text-[16px] text-black leading-[24px]">
              <strong>Workspaces failed:</strong> {failed}
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
  processed: 12,
  success: 11,
  failed: 1,
} satisfies BackfillCompleteTemplateProps;

export default BackfillCompleteTemplate;
