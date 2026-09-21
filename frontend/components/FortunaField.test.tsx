import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FortunaField } from './FortunaField';

describe('FortunaField', () => {
  it('keeps the label outside the field and the typed text in graphite', async () => {
    const onChange = vi.fn();
    render(
      <FortunaField
        id="board-size"
        label="Tamanho do tabuleiro"
        value=""
        onChange={onChange}
      />
    );

    const input = screen.getByLabelText('Tamanho do tabuleiro');
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe('INPUT');

    await userEvent.type(input, '10');
    expect(onChange).toHaveBeenCalled();
  });

  it('keeps a visible border so the ivory field does not vanish on ivory dialogs', () => {
    render(
      <FortunaField
        id="chat-message"
        label="Mensagem"
        tone="onLight"
        value=""
        onChange={() => undefined}
      />
    );

    const input = screen.getByLabelText('Mensagem');
    const field = input.closest('.MuiFilledInput-root');
    expect(field).not.toBeNull();
    expect(field).toHaveStyle({ borderStyle: 'solid' });
  });
});
