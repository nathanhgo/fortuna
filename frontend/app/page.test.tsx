import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/api', () => ({
  createRoom: vi.fn(),
}));

describe('HomePage', () => {
  it('renders the brand name and the catalog of games', () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Fortuna' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Xadrez' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Coup' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Batalha Naval' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Truco' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lobisomem' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Damas' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Dominó' })).toBeInTheDocument();
  });

  it('renders the create-room form', () => {
    render(<HomePage />);

    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /criar sala/i })).toBeInTheDocument();
  });
});
