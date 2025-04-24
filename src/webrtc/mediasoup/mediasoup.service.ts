// src/webrtc/mediasoup/mediasoup.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mediasoup from 'mediasoup';
import { types as mediasoupTypes } from 'mediasoup';
import { Worker, Router, WebRtcTransport, Producer, Consumer } from 'mediasoup/node/lib/types';

@Injectable()
export class MediasoupService implements OnModuleInit, OnModuleDestroy {
  private workers: Worker[] = [];
  private router: Router;
  private readonly numWorkers: number;
  private readonly rooms: Map<string, {
    router: Router;
    transports: Map<string, WebRtcTransport>;
    producers: Map<string, Producer>;
    consumers: Map<string, Consumer>;
  }> = new Map();

  constructor(private configService: ConfigService) {
    this.numWorkers = Object.keys(require('os').cpus()).length;
  }

  async onModuleInit() {
    await this.initializeWorkers();
    this.router = await this.createRouter();
  }

  async onModuleDestroy() {
    for (const worker of this.workers) {
      worker.close();
    }
  }

  private async initializeWorkers() {
    const workerSettings = this.configService.get('mediasoup.worker');

    for (let i = 0; i < this.numWorkers; i++) {
      const worker = await mediasoup.createWorker({
        logLevel: workerSettings.logLevel,
        logTags: workerSettings.logTags,
        rtcMinPort: workerSettings.rtcMinPort,
        rtcMaxPort: workerSettings.rtcMaxPort,
      });

      worker.on('died', () => {
        console.error(`mediasoup worker died, exiting in 2 seconds... [pid:${worker.pid}]`);
        setTimeout(() => process.exit(1), 2000);
      });

      this.workers.push(worker);
    }
  }

  async createRouter() {
    const routerSettings = this.configService.get('mediasoup.router');
    const worker = this.workers[0];
    return await worker.createRouter({ mediaCodecs: routerSettings.mediaCodecs });
  }

  async createRoom(roomId: string) {
    // Create a new router for this room
    const router = await this.createRouter();
    
    this.rooms.set(roomId, {
      router,
      transports: new Map(),
      producers: new Map(),
      consumers: new Map(),
    });
    
    return router;
  }

  getRoom(roomId: string) {
    return this.rooms.get(roomId);
  }

  async createWebRtcTransport(roomId: string, transportId: string) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room with id "${roomId}" not found`);
    }
    const transportSettings = this.configService.get('mediasoup.webRtcTransport');
   
    const transport = await room.router.createWebRtcTransport({
      listenIps: transportSettings.listenIps,
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate: transportSettings.initialAvailableOutgoingBitrate,
      // Remove the minimumAvailableOutgoingBitrate option as it's not supported
    });
    // Store the transport
    room.transports.set(transportId, transport);
    // Return transport parameters
    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
  }


  async connectTransport(roomId: string, transportId: string, dtlsParameters: any) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room with id "${roomId}" not found`);
    }

    const transport = room.transports.get(transportId);
    if (!transport) {
      throw new Error(`Transport with id "${transportId}" not found`);
    }

    await transport.connect({ dtlsParameters });
    return true;
  }

  async createProducer(
    roomId: string, 
    transportId: string, 
    producerId: string, 
    kind: mediasoupTypes.MediaKind, // Change from string to MediaKind
    rtpParameters: any
  ) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room with id "${roomId}" not found`);
    }
    const transport = room.transports.get(transportId);
    if (!transport) {
      throw new Error(`Transport with id "${transportId}" not found`);
    }
    const producer = await transport.produce({
      kind,
      rtpParameters,
    });
    // Store the producer
    room.producers.set(producerId, producer);
    return {
      id: producer.id,
    };
  }

  async createConsumer(roomId: string, consumerTransportId: string, producerId: string, rtpCapabilities: any) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room with id "${roomId}" not found`);
    }

    // Get the transport
    const transport = room.transports.get(consumerTransportId);
    if (!transport) {
      throw new Error(`Transport with id "${consumerTransportId}" not found`);
    }

    // Get the producer
    const producer = room.producers.get(producerId);
    if (!producer) {
      throw new Error(`Producer with id "${producerId}" not found`);
    }

    // Check if the router can consume the producer
    if (!room.router.canConsume({
      producerId: producer.id,
      rtpCapabilities,
    })) {
      throw new Error('Router cannot consume producer');
    }

    // Create the consumer
    const consumer = await transport.consume({
      producerId: producer.id,
      rtpCapabilities,
      paused: true, // Consumer is created paused by default
    });

    // Store the consumer
    room.consumers.set(consumer.id, consumer);

    return {
      id: consumer.id,
      producerId: producer.id,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
      type: consumer.type,
    };
  }

  async resumeConsumer(roomId: string, consumerId: string) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room with id "${roomId}" not found`);
    }

    const consumer = room.consumers.get(consumerId);
    if (!consumer) {
      throw new Error(`Consumer with id "${consumerId}" not found`);
    }

    await consumer.resume();
    return true;
  }

  async getRouterRtpCapabilities(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room with id "${roomId}" not found`);
    }
    
    return room.router.rtpCapabilities;
  }

  async closeRoom(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }

    // Close all transports
    for (const [, transport] of room.transports) {
      transport.close();
    }

    this.rooms.delete(roomId);
  }
}