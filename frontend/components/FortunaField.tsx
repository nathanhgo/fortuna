import TextField, { type TextFieldProps } from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Stack from '@mui/material/Stack';
import { fortunaColors } from '@/theme/palette';

export type FortunaFieldTone = 'onDark' | 'onLight';

export type FortunaFieldProps = Omit<TextFieldProps, 'variant' | 'label' | 'hiddenLabel'> & {
  id: string;
  label: string;
  tone?: FortunaFieldTone;
};

/**
 * Campo de texto com o rótulo fora do input. O outlined flutuante do MUI corta o dourado
 * na borda e o texto preto some sobre o fundo grafite — por isso o label fica estático
 * acima e o valor entra em grafite sobre marfim.
 */
export function FortunaField({
  id,
  label,
  tone = 'onDark',
  size = 'small',
  fullWidth = true,
  ...textFieldProps
}: FortunaFieldProps) {
  const labelColor = tone === 'onDark' ? fortunaColors.ivory : fortunaColors.graphite;

  return (
    <Stack spacing={0.75} sx={{ width: fullWidth ? '100%' : undefined }}>
      <InputLabel
        htmlFor={id}
        sx={{
          position: 'static',
          transform: 'none',
          color: labelColor,
          fontSize: '0.875rem',
          lineHeight: 1.3,
        }}
      >
        {label}
      </InputLabel>
      <TextField
        id={id}
        variant="filled"
        hiddenLabel
        size={size}
        fullWidth={fullWidth}
        {...textFieldProps}
        slotProps={{
          ...textFieldProps.slotProps,
          input: {
            disableUnderline: true,
            ...(typeof textFieldProps.slotProps?.input === 'object'
              ? textFieldProps.slotProps.input
              : {}),
          },
        }}
        sx={{
          bgcolor: fortunaColors.ivory,
          '& .MuiFilledInput-root': {
            bgcolor: fortunaColors.ivory,
            color: fortunaColors.graphite,
            borderRadius: 1,
            border: `1px solid ${
              tone === 'onLight' ? `${fortunaColors.graphite}66` : `${fortunaColors.gold}99`
            }`,
            '&:hover, &.Mui-focused': {
              bgcolor: fortunaColors.ivory,
              borderColor: fortunaColors.gold,
            },
          },
          '& .MuiFilledInput-input': {
            color: fortunaColors.graphite,
          },
          ...((textFieldProps.sx as object) ?? {}),
        }}
      />
    </Stack>
  );
}
