import { EventEmitter } from "node:events";

export type ChatMessage = {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string };
};

// Barramento em memória (uma instância do servidor). Para múltiplas instâncias,
// trocar por Postgres LISTEN/NOTIFY ou Redis pub/sub.
const globalForBus = globalThis as unknown as { guardianBus?: EventEmitter };
const bus = globalForBus.guardianBus ?? new EventEmitter().setMaxListeners(0);
globalForBus.guardianBus = bus;

export function publishMessage(roomId: string, message: ChatMessage) {
  bus.emit(`room:${roomId}`, message);
}

export function subscribeRoom(roomId: string, listener: (message: ChatMessage) => void) {
  bus.on(`room:${roomId}`, listener);
  return () => {
    bus.off(`room:${roomId}`, listener);
  };
}
