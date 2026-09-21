import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CoupCard } from './CoupCard';

describe('CoupCard', () => {
  it('shows the character name when face up', () => {
    render(<CoupCard character="duke" faceUp />);
    expect(screen.getByLabelText(/duque/i)).toBeInTheDocument();
  });

  it('hides the character when face down', () => {
    render(<CoupCard character="assassin" faceUp={false} />);
    expect(screen.getByLabelText('Carta oculta')).toBeInTheDocument();
  });
});
