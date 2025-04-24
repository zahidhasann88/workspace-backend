// src/webrtc/webrtc.gateway.ts
import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MediasoupService } from './mediasoup/mediasoup.service';
import { types as mediasoupTypes } from 'mediasoup';
import { Room, RoomDocument } from 'src/rooms/schemas/room.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'webrtc',
})
export class WebRtcGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Store clients by room and user id
  private rooms: Map<string, Set<string>> = new Map();
  private peers: Map<
    string,
    { socket: Socket; roomId: string; userId: string }
  > = new Map();

  constructor(
    private readonly mediasoupService: MediasoupService,
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>,
  ) {}

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    // Authentication would happen here
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);

    const peer = this.peers.get(client.id);
    if (peer) {
      const { roomId, userId } = peer;
      this.handleUserLeave(client, roomId, userId);
    }
  }

  // private handleUserLeave(client: Socket, roomId: string, userId: string) {
  //   // Remove user from room
  //   const roomClients = this.rooms.get(roomId);
  //   if (roomClients) {
  //     roomClients.delete(client.id);

  //     // Notify others that user has left
  //     client.to(roomId).emit('user-left', { userId });

  //     // If room is empty, close the room in mediasoup
  //     if (roomClients.size === 0) {
  //       this.rooms.delete(roomId);
  //       this.mediasoupService.closeRoom(roomId);
  //     }
  //   }

  //   // Remove peer from peers map
  //   this.peers.delete(client.id);

  //   // Leave the socket.io room
  //   client.leave(roomId);
  // }

  // @SubscribeMessage('join-room')
  // async handleJoinRoom(
  //   @ConnectedSocket() client: Socket,
  //   @MessageBody() data: { roomId: string; userId: string },
  // ) {
  //   const { roomId, userId } = data;

  //   // Join the Socket.IO room
  //   client.join(roomId);

  //   // Initialize room if it doesn't exist
  //   if (!this.rooms.has(roomId)) {
  //     this.rooms.set(roomId, new Set());
  //     await this.mediasoupService.createRoom(roomId);
  //   }

  //   // Add client to room - Now we're sure the room exists
  //   const roomSet = this.rooms.get(roomId);
  //   if (roomSet) {
  //     roomSet.add(client.id);
  //   }

  //   // Store peer info
  //   this.peers.set(client.id, { socket: client, roomId, userId });

  //   // Get router RTP capabilities
  //   const rtpCapabilities =
  //     await this.mediasoupService.getRouterRtpCapabilities(roomId);

  //   // Notify other users in room
  //   const roomClients = this.rooms.get(roomId);
  //   const peersInRoom = roomClients
  //     ? Array.from(roomClients).filter((id) => id !== client.id)
  //     : [];

  //   // Return the list of peers already in the room
  //   return {
  //     rtpCapabilities,
  //     peers: peersInRoom.map((peerId) => {
  //       const peer = this.peers.get(peerId);
  //       return { id: peerId, userId: peer?.userId };
  //     }),
  //   };
  // }

  @SubscribeMessage('create-transport')
  async handleCreateTransport(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; direction: 'send' | 'receive' },
  ) {
    const { roomId, direction } = data;
    const transportId = `${direction}-${client.id}`;

    const transport = await this.mediasoupService.createWebRtcTransport(
      roomId,
      transportId,
    );

    return {
      transportId,
      ...transport,
    };
  }

  @SubscribeMessage('connect-transport')
  async handleConnectTransport(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { roomId: string; transportId: string; dtlsParameters: any },
  ) {
    const { roomId, transportId, dtlsParameters } = data;

    await this.mediasoupService.connectTransport(
      roomId,
      transportId,
      dtlsParameters,
    );

    return { connected: true };
  }

  @SubscribeMessage('produce')
  async handleProduce(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      roomId: string;
      transportId: string;
      kind: string;
      rtpParameters: any;
      appData: any;
    },
  ) {
    const { roomId, transportId, kind, rtpParameters, appData } = data;
    const producerId = `${kind}-${client.id}`;

    // Validate and convert kind to MediaKind type
    if (kind !== 'audio' && kind !== 'video') {
      throw new Error('Kind must be either "audio" or "video"');
    }

    // Now we can safely cast to MediaKind
    const mediaKind = kind as mediasoupTypes.MediaKind;

    const producer = await this.mediasoupService.createProducer(
      roomId,
      transportId,
      producerId,
      mediaKind,
      rtpParameters,
    );

    // Rest of your code remains the same
    const peer = this.peers.get(client.id);
    if (peer) {
      client.to(roomId).emit('new-producer', {
        producerId: producer.id,
        peerId: client.id,
        userId: peer.userId,
        kind,
        appData,
      });
    }

    return { id: producer.id };
  }

  @SubscribeMessage('consume')
  async handleConsume(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      roomId: string;
      transportId: string;
      producerId: string;
      rtpCapabilities: any;
    },
  ) {
    const { roomId, transportId, producerId, rtpCapabilities } = data;

    const consumer = await this.mediasoupService.createConsumer(
      roomId,
      transportId,
      producerId,
      rtpCapabilities,
    );

    return consumer;
  }

  @SubscribeMessage('resume-consumer')
  async handleResumeConsumer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; consumerId: string },
  ) {
    const { roomId, consumerId } = data;

    await this.mediasoupService.resumeConsumer(roomId, consumerId);

    return { resumed: true };
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string },
  ) {
    const { roomId, userId } = data;

    this.handleUserLeave(client, roomId, userId);

    return { left: true };
  }

  @SubscribeMessage('message')
  handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; message: any },
  ) {
    const { roomId, message } = data;

    // Get peer info
    const peer = this.peers.get(client.id);
    if (!peer) return;

    // Broadcast to all users in room except sender
    client.to(roomId).emit('message', {
      peerId: client.id,
      userId: peer.userId,
      message,
    });

    return { sent: true };
  }

  // In your WebRtcGateway class (src/webrtc/webrtc.gateway.ts)
@SubscribeMessage('join-room')
async handleJoinRoom(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { roomId: string; userId: string },
) {
  const { roomId, userId } = data;
  
  // Join the Socket.IO room
  client.join(roomId);

  // Initialize room if it doesn't exist
  if (!this.rooms.has(roomId)) {
    this.rooms.set(roomId, new Set());
    await this.mediasoupService.createRoom(roomId);
  }

  // Add client to room
  const roomSet = this.rooms.get(roomId);
  if (roomSet) {
    roomSet.add(client.id);
  }

  // Store peer info
  this.peers.set(client.id, { socket: client, roomId, userId });

  // ADD THIS: Update active participants in the room model
  try {
    await this.roomModel.findByIdAndUpdate(
      roomId,
      { $addToSet: { activeParticipants: userId } },
      { new: true }
    );
  } catch (error) {
    console.error('Error updating active participants:', error);
  }

  // Rest of your code...
}

// Also modify handleUserLeave method
private async handleUserLeave(client: Socket, roomId: string, userId: string) {
  // Remove user from room
  const roomClients = this.rooms.get(roomId);
  if (roomClients) {
    roomClients.delete(client.id);

    // Notify others that user has left
    client.to(roomId).emit('user-left', { userId });

    // If room is empty, close the room in mediasoup
    if (roomClients.size === 0) {
      this.rooms.delete(roomId);
      this.mediasoupService.closeRoom(roomId);
    }
  }

  // ADD THIS: Update active participants in the room model
  try {
    await this.roomModel.findByIdAndUpdate(
      roomId,
      { $pull: { activeParticipants: userId } },
      { new: true }
    );
  } catch (error) {
    console.error('Error updating active participants:', error);
  }

  // Remove peer from peers map
  this.peers.delete(client.id);

  // Leave the socket.io room
  client.leave(roomId);
}
}
