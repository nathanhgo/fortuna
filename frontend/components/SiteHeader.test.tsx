import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SiteHeader } from './SiteHeader';

const pushMock = vi.fn();
let pathname = '/';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => pathname,
}));

vi.mock('@/lib/api', () => ({
  listChatMessages: vi.fn(),
  sendChatMessage: vi.fn(),
  listGameInstances: vi.fn(),
}));

vi.mock('@/lib/playerStorage', () => ({
  getStoredPlayer: vi.fn(() => null),
}));

vi.mock('@/lib/roomSocket', () => ({
  subscribeToRoom: vi.fn(() => () => undefined),
}));

describe('SiteHeader', () => {
  beforeEach(() => {
    pathname = '/';
    pushMock.mockReset();
  });

  it('puts the home logo on the left and the navigation on the right', () => {
    render(<SiteHeader />);

    const perfil = screen.getByRole('link', { name: /^perfil$/i });
    const chat = screen.getByRole('button', { name: /^chat$/i });
    const home = screen.getByRole('link', { name: /fortuna, ir para a página inicial/i });

    expect(home.compareDocumentPosition(perfil) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(perfil.compareDocumentPosition(chat) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(perfil.getAttribute('href')).toBe('/perfil');
    expect(home.getAttribute('href')).toBe('/');
  });

  it('opens navigation from a hamburger menu', async () => {
    render(<SiteHeader />);

    await userEvent.click(screen.getByRole('button', { name: /abrir menu/i }));
    expect(await screen.findByRole('menuitem', { name: /perfil/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /chat/i })).toBeInTheDocument();
  });

  it('opens a chat notice when the visitor is not inside a room', async () => {
    render(<SiteHeader />);

    await userEvent.click(screen.getByRole('button', { name: /^chat$/i }));
    expect(await screen.findByText(/entre em uma sala para conversar/i)).toBeInTheDocument();
  });
});
