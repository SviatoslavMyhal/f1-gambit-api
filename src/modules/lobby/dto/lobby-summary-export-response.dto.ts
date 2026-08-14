import { ApiProperty } from '@nestjs/swagger';

export class LobbySummaryExportResponseDto {
  @ApiProperty({
    description: 'Human-readable summary (tabs / newlines) for clipboard',
  })
  plainText!: string;

  @ApiProperty({
    description:
      'Same object as `Lobby.simulationResult` (schemaVersion 2: heatmap + events)',
    type: 'object',
    additionalProperties: true,
  })
  json!: Record<string, unknown>;
}
