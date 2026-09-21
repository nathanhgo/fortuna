import { describe, expect, it } from 'vitest';
import { instanceIdFromPath, roomCodeFromPath } from './roomPath';

describe('roomPath', () => {
  it('reads the room code and instance from sala urls', () => {
    expect(roomCodeFromPath('/')).toBeNull();
    expect(roomCodeFromPath('/perfil')).toBeNull();
    expect(roomCodeFromPath('/sala/abc123')).toBe('ABC123');
    expect(roomCodeFromPath('/sala/AbC123/xadrez/inst-9')).toBe('ABC123');
    expect(instanceIdFromPath('/sala/ABC123')).toBeNull();
    expect(instanceIdFromPath('/sala/ABC123/coup/inst-9')).toBe('inst-9');
  });
});
