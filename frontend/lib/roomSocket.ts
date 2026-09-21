export interface RoomEvent {
  type: string;
  instance_id?: string;
}

export function roomWebSocketUrl(code: string): string {
  const base = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000';
  return `${base}/ws/rooms/${code.toUpperCase()}/`;
}

export function subscribeToRoom(code: string, onEvent: (event: RoomEvent) => void): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const socket = new WebSocket(roomWebSocketUrl(code));
  socket.onmessage = (message) => {
    try {
      onEvent(JSON.parse(message.data) as RoomEvent);
    } catch {
      // Eventos malformados são ignorados — o cliente sempre pode rebuscar via REST.
    }
  };

  return () => {
    socket.close();
  };
}
