import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpectatorRail } from './SpectatorRail';

describe('SpectatorRail', () => {
  it('lists seated players, spectators and match notes on desktop', () => {
    render(
      <SpectatorRail
        players={[{ name: 'Alice', detail: 'brancas · 12 min' }, { name: 'Bob', detail: 'pretas' }]}
        spectators={[{ name: 'Clara' }]}
        notes={['Lance: e2–e4', 'Vez das brancas']}
        saved
      />
    );

    expect(screen.getByText('Na mesa')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('brancas · 12 min')).toBeInTheDocument();
    expect(screen.getByText('Quem assiste')).toBeInTheDocument();
    expect(screen.getByText('Clara')).toBeInTheDocument();
    expect(screen.getByText('Lance: e2–e4')).toBeInTheDocument();
    expect(screen.getByText('Progresso salvo')).toBeInTheDocument();
  });

  it('opens a bottom sheet from the mobile trigger', async () => {
    render(
      <SpectatorRail
        players={[{ name: 'Alice' }]}
        spectators={[]}
        notes={['Aguardando o segundo jogador']}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /estatísticas/i }));
    expect(await screen.findByRole('dialog', { name: /estatísticas da partida/i })).toBeInTheDocument();
  });
});
