import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileScreen } from './ProfileScreen';

describe('ProfileScreen', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('warns that the profile lives only in this browser cache', () => {
    render(<ProfileScreen />);

    expect(screen.getByRole('heading', { name: /perfil/i })).toBeInTheDocument();
    expect(
      screen.getByText(/fica só neste navegador/i)
    ).toBeInTheDocument();
  });

  it('saves the display name into local cache', async () => {
    render(<ProfileScreen />);

    await userEvent.clear(screen.getByLabelText(/nome de usuário/i));
    await userEvent.type(screen.getByLabelText(/nome de usuário/i), 'Clara');
    await userEvent.click(screen.getByRole('button', { name: /guardar perfil/i }));

    expect(screen.getByDisplayValue('Clara')).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem('fortuna:profile') ?? '{}').displayName).toBe(
      'Clara'
    );
  });
});
