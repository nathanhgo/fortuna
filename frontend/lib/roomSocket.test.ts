import { afterEach, describe, expect, it, vi } from 'vitest';
import { roomWebSocketUrl, subscribeToRoom } from './roomSocket';

describe('roomWebSocketUrl', () => {
  it('builds the room channel URL from NEXT_PUBLIC_WS_URL', () => {
    expect(roomWebSocketUrl('AbC123')).toBe('ws://localhost:8000/ws/rooms/ABC123/');
  });
});

describe('subscribeToRoom', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('forwards parsed events and closes the socket on unsubscribe', () => {
    const sockets: FakeSocket[] = [];
    vi.stubGlobal(
      'WebSocket',
      class {
        url: string;
        onmessage: ((event: { data: string }) => void) | null = null;
        closed = false;
        constructor(url: string) {
          this.url = url;
          sockets.push(this as unknown as FakeSocket);
        }
        close() {
          this.closed = true;
        }
      }
    );

    const onEvent = vi.fn();
    const unsubscribe = subscribeToRoom('ABC123', onEvent);

    expect(sockets).toHaveLength(1);
    expect(sockets[0].url).toContain('/ws/rooms/ABC123/');
    sockets[0].onmessage?.({ data: JSON.stringify({ type: 'room_updated' }) });
    expect(onEvent).toHaveBeenCalledWith({ type: 'room_updated' });

    unsubscribe();
    expect(sockets[0].closed).toBe(true);
  });
});

interface FakeSocket {
  url: string;
  onmessage: ((event: { data: string }) => void) | null;
  closed: boolean;
}
