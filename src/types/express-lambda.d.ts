import type { APIGatewayProxyEventV2 } from 'aws-lambda';

declare global {
  namespace Express {
    interface Request {
      /** Raw API Gateway HTTP API v2 event when running behind serverless-http in Lambda */
      lambdaEvent?: APIGatewayProxyEventV2;
      /** Set by {@link ensureRequestId}; echoed in API envelopes and error payloads */
      requestId?: string;
      /** Wall-clock ms when the HTTP access middleware entered (for duration / debugging) */
      requestStartedAt?: number;
    }
  }
}

export {};
