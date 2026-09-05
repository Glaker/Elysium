import { Badge, Tooltip, type BadgeProps } from '@mantine/core';

/**
 * Los únicos tonos que existen. Fuera de estos tres, un badge va en gris:
 * el color en esta app significa algo y no se gasta en decorar.
 *
 *  - `advertencia` — costo incompleto, precio vencido a 30 días, fórmula que no
 *    suma 100.
 *  - `error` — stock negativo, ciclo en la composición.
 *  - `exito` — confirmación puntual de una acción. Nunca un estado permanente.
 *  - `neutro` — clasificación sin carga semántica: tipo de insumo, origen, etc.
 */
export type Tono = 'advertencia' | 'error' | 'exito' | 'neutro';

const COLOR: Record<Tono, string> = {
  advertencia: 'advertencia',
  error: 'error',
  exito: 'exito',
  neutro: 'gray',
};

type Props = Omit<BadgeProps, 'color' | 'variant'> & {
  tono?: Tono;
  /** Explicación al pasar el mouse. Un badge sin contexto no dice nada. */
  ayuda?: string;
  children: React.ReactNode;
};

export function BadgeEstado({ tono = 'neutro', ayuda, children, ...props }: Props) {
  const badge = (
    <Badge
      variant="light"
      color={COLOR[tono]}
      size="sm"
      radius="sm"
      tt="none"
      fw={500}
      {...props}
    >
      {children}
    </Badge>
  );

  return ayuda ? (
    <Tooltip label={ayuda} multiline maw={300}>
      <span style={{ display: 'inline-flex' }}>{badge}</span>
    </Tooltip>
  ) : (
    badge
  );
}
