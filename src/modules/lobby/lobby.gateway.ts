import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { LobbyBattleFinishedPayload } from './events/lobby.events';

/**
 * Room-per-lobby WS notifications. Clients call `lobby:join` with their lobbyId
 * after connecting; LobbyEventsListener broadcasts into that room on
 * LOBBY_BATTLE_FINISHED — this class never talks back to LobbyService.
 * Production: add JWT on handshake (not done here — out of scope for this pass).
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

  @SubscribeMessage('lobby:join')
  handleJoinLobby(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lobbyId: string },
  ): { event: string; data: { ok: boolean; room: string } } {
    const room = LobbyGateway.roomName(data.lobbyId);
    client.join(room);
    this.logger.debug(`sid=${client.id} joined room=${room}`);
    return { event: 'lobby:joined', data: { ok: true, room } };
  }

  @SubscribeMessage('ping')
  handlePing(_client: Socket): { event: string; data: { ok: boolean; t: number } } {
    return { event: 'pong', data: { ok: true, t: Date.now() } };
  }

  /** Called by LobbyEventsListener, never directly by LobbyService. */
  emitBattleFinished(payload: LobbyBattleFinishedPayload): void {
    this.server.to(LobbyGateway.roomName(payload.lobbyId)).emit('lobby:battleFinished', payload);
  }

  private static roomName(lobbyId: string): string {
    return `lobby:${lobbyId}`;
  }
}
