import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

/**
 * Minimal WebSocket gateway (learning scaffold).
 * Production: add JWT on handshake, room per lobbyId, and emit state from LobbyService.
 */
@WebSocketGateway({
  namespace: '/lobby',
  cors:
    process.env.NODE_ENV === 'production'
      ? false
      : { origin: /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i },
})
export class LobbyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(LobbyGateway.name);

  handleConnection(client: Socket) {
    this.logger.debug(`WS connected sid=${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`WS disconnected sid=${client.id}`);
  }

  @SubscribeMessage('ping')
  handlePing(_client: Socket): { event: string; data: { ok: boolean; t: number } } {
    return { event: 'pong', data: { ok: true, t: Date.now() } };
  }
}
