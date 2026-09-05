import { NumberInput, type NumberInputProps } from '@mantine/core';

type Props = Omit<NumberInputProps, 'prefix' | 'suffix'> & {
  /** Unidad como sufijo dentro del campo: `75 g`, `12 %`. */
  unidad?: string;
  /** Importe: pone el signo adelante. `$ 25.299`. */
  moneda?: 'ARS' | 'USD' | null;
};

/**
 * Campo numérico del admin: tipografía tabular y la unidad **dentro** del campo,
 * no como texto suelto al lado. Separadores en formato es-AR.
 *
 * `decimalScale` no se fija a propósito: un porcentaje de fórmula y un precio
 * por kg tienen precisiones distintas y las decide cada pantalla.
 */
export function CampoNumerico({ unidad, moneda, ...props }: Props) {
  return (
    <NumberInput
      thousandSeparator="."
      decimalSeparator=","
      hideControls
      prefix={moneda ? (moneda === 'USD' ? 'US$ ' : '$ ') : undefined}
      suffix={unidad ? ` ${unidad}` : undefined}
      classNames={{ input: 'tabular' }}
      {...props}
    />
  );
}
