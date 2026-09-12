export type Json =
  string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      cuentas: {
        Row: {
          activo: boolean;
          alias_transferencia: string | null;
          creado_en: string;
          id: string;
          nombre: string;
        };
        Insert: {
          activo?: boolean;
          alias_transferencia?: string | null;
          creado_en?: string;
          id?: string;
          nombre: string;
        };
        Update: {
          activo?: boolean;
          alias_transferencia?: string | null;
          creado_en?: string;
          id?: string;
          nombre?: string;
        };
        Relationships: [];
      };
      formula_lineas: {
        Row: {
          aplica_a: Database['public']['Enums']['aplica_variante'];
          cantidad_fija: number | null;
          id: string;
          insumo_id: string;
          modo: Database['public']['Enums']['modo_composicion'];
          notas: string | null;
          orden: number | null;
          porcentaje: number | null;
          tamano_id: string;
        };
        Insert: {
          aplica_a?: Database['public']['Enums']['aplica_variante'];
          cantidad_fija?: number | null;
          id?: string;
          insumo_id: string;
          modo?: Database['public']['Enums']['modo_composicion'];
          notas?: string | null;
          orden?: number | null;
          porcentaje?: number | null;
          tamano_id: string;
        };
        Update: {
          aplica_a?: Database['public']['Enums']['aplica_variante'];
          cantidad_fija?: number | null;
          id?: string;
          insumo_id?: string;
          modo?: Database['public']['Enums']['modo_composicion'];
          notas?: string | null;
          orden?: number | null;
          porcentaje?: number | null;
          tamano_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'formula_lineas_insumo_id_fkey';
            columns: ['insumo_id'];
            isOneToOne: false;
            referencedRelation: 'insumos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'formula_lineas_insumo_id_fkey';
            columns: ['insumo_id'];
            isOneToOne: false;
            referencedRelation: 'v_insumo_precio_actual';
            referencedColumns: ['insumo_id'];
          },
          {
            foreignKeyName: 'formula_lineas_tamano_id_fkey';
            columns: ['tamano_id'];
            isOneToOne: false;
            referencedRelation: 'tamanos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'formula_lineas_tamano_id_fkey';
            columns: ['tamano_id'];
            isOneToOne: false;
            referencedRelation: 'v_formula_control';
            referencedColumns: ['tamano_id'];
          },
        ];
      };
      gastos: {
        Row: {
          cantidad: number | null;
          comentario: string | null;
          costo_unitario: number | null;
          creado_en: string;
          creado_por: string | null;
          cuenta_id: string | null;
          descripcion: string | null;
          fecha: string;
          forma_pago: string | null;
          id: string;
          insumo_id: string | null;
          proveedor_id: string | null;
          tipo: Database['public']['Enums']['tipo_gasto'];
          total: number;
        };
        Insert: {
          cantidad?: number | null;
          comentario?: string | null;
          costo_unitario?: number | null;
          creado_en?: string;
          creado_por?: string | null;
          cuenta_id?: string | null;
          descripcion?: string | null;
          fecha?: string;
          forma_pago?: string | null;
          id?: string;
          insumo_id?: string | null;
          proveedor_id?: string | null;
          tipo: Database['public']['Enums']['tipo_gasto'];
          total: number;
        };
        Update: {
          cantidad?: number | null;
          comentario?: string | null;
          costo_unitario?: number | null;
          creado_en?: string;
          creado_por?: string | null;
          cuenta_id?: string | null;
          descripcion?: string | null;
          fecha?: string;
          forma_pago?: string | null;
          id?: string;
          insumo_id?: string | null;
          proveedor_id?: string | null;
          tipo?: Database['public']['Enums']['tipo_gasto'];
          total?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'gastos_creado_por_fkey';
            columns: ['creado_por'];
            isOneToOne: false;
            referencedRelation: 'perfiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'gastos_cuenta_id_fkey';
            columns: ['cuenta_id'];
            isOneToOne: false;
            referencedRelation: 'cuentas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'gastos_insumo_id_fkey';
            columns: ['insumo_id'];
            isOneToOne: false;
            referencedRelation: 'insumos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'gastos_insumo_id_fkey';
            columns: ['insumo_id'];
            isOneToOne: false;
            referencedRelation: 'v_insumo_precio_actual';
            referencedColumns: ['insumo_id'];
          },
          {
            foreignKeyName: 'gastos_proveedor_id_fkey';
            columns: ['proveedor_id'];
            isOneToOne: false;
            referencedRelation: 'proveedores';
            referencedColumns: ['id'];
          },
        ];
      };
      insumo_composicion: {
        Row: {
          cantidad: number;
          id: string;
          insumo_componente_id: string;
          insumo_producido_id: string;
          notas: string | null;
        };
        Insert: {
          cantidad: number;
          id?: string;
          insumo_componente_id: string;
          insumo_producido_id: string;
          notas?: string | null;
        };
        Update: {
          cantidad?: number;
          id?: string;
          insumo_componente_id?: string;
          insumo_producido_id?: string;
          notas?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'insumo_composicion_insumo_componente_id_fkey';
            columns: ['insumo_componente_id'];
            isOneToOne: false;
            referencedRelation: 'insumos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'insumo_composicion_insumo_componente_id_fkey';
            columns: ['insumo_componente_id'];
            isOneToOne: false;
            referencedRelation: 'v_insumo_precio_actual';
            referencedColumns: ['insumo_id'];
          },
          {
            foreignKeyName: 'insumo_composicion_insumo_producido_id_fkey';
            columns: ['insumo_producido_id'];
            isOneToOne: false;
            referencedRelation: 'insumos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'insumo_composicion_insumo_producido_id_fkey';
            columns: ['insumo_producido_id'];
            isOneToOne: false;
            referencedRelation: 'v_insumo_precio_actual';
            referencedColumns: ['insumo_id'];
          },
        ];
      };
      insumo_precios: {
        Row: {
          creado_en: string;
          creado_por: string | null;
          fuente: string | null;
          id: string;
          insumo_id: string;
          moneda: Database['public']['Enums']['moneda'];
          precio: number;
          verificado_en: string;
          vigente_desde: string;
        };
        Insert: {
          creado_en?: string;
          creado_por?: string | null;
          fuente?: string | null;
          id?: string;
          insumo_id: string;
          moneda?: Database['public']['Enums']['moneda'];
          precio: number;
          verificado_en?: string;
          vigente_desde?: string;
        };
        Update: {
          creado_en?: string;
          creado_por?: string | null;
          fuente?: string | null;
          id?: string;
          insumo_id?: string;
          moneda?: Database['public']['Enums']['moneda'];
          precio?: number;
          verificado_en?: string;
          vigente_desde?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'insumo_precios_creado_por_fkey';
            columns: ['creado_por'];
            isOneToOne: false;
            referencedRelation: 'perfiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'insumo_precios_insumo_id_fkey';
            columns: ['insumo_id'];
            isOneToOne: false;
            referencedRelation: 'insumos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'insumo_precios_insumo_id_fkey';
            columns: ['insumo_id'];
            isOneToOne: false;
            referencedRelation: 'v_insumo_precio_actual';
            referencedColumns: ['insumo_id'];
          },
        ];
      };
      insumos: {
        Row: {
          activo: boolean;
          creado_en: string;
          id: string;
          link: string | null;
          nombre: string;
          notas: string | null;
          origen: Database['public']['Enums']['origen_insumo'];
          proveedor_id: string | null;
          rinde_cantidad: number | null;
          tipo: Database['public']['Enums']['tipo_insumo'];
          unidad: Database['public']['Enums']['unidad_insumo'];
        };
        Insert: {
          activo?: boolean;
          creado_en?: string;
          id?: string;
          link?: string | null;
          nombre: string;
          notas?: string | null;
          origen?: Database['public']['Enums']['origen_insumo'];
          proveedor_id?: string | null;
          rinde_cantidad?: number | null;
          tipo?: Database['public']['Enums']['tipo_insumo'];
          unidad: Database['public']['Enums']['unidad_insumo'];
        };
        Update: {
          activo?: boolean;
          creado_en?: string;
          id?: string;
          link?: string | null;
          nombre?: string;
          notas?: string | null;
          origen?: Database['public']['Enums']['origen_insumo'];
          proveedor_id?: string | null;
          rinde_cantidad?: number | null;
          tipo?: Database['public']['Enums']['tipo_insumo'];
          unidad?: Database['public']['Enums']['unidad_insumo'];
        };
        Relationships: [
          {
            foreignKeyName: 'insumos_proveedor_id_fkey';
            columns: ['proveedor_id'];
            isOneToOne: false;
            referencedRelation: 'proveedores';
            referencedColumns: ['id'];
          },
        ];
      };
      invitaciones: {
        Row: {
          creada_en: string;
          creada_por: string | null;
          email: string | null;
          expira_en: string | null;
          id: string;
          persona_id: string | null;
          rol: Database['public']['Enums']['rol_usuario'];
          token: string;
          usada_en: string | null;
        };
        Insert: {
          creada_en?: string;
          creada_por?: string | null;
          email?: string | null;
          expira_en?: string | null;
          id?: string;
          persona_id?: string | null;
          rol?: Database['public']['Enums']['rol_usuario'];
          token: string;
          usada_en?: string | null;
        };
        Update: {
          creada_en?: string;
          creada_por?: string | null;
          email?: string | null;
          expira_en?: string | null;
          id?: string;
          persona_id?: string | null;
          rol?: Database['public']['Enums']['rol_usuario'];
          token?: string;
          usada_en?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'invitaciones_creada_por_fkey';
            columns: ['creada_por'];
            isOneToOne: false;
            referencedRelation: 'perfiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invitaciones_persona_id_fkey';
            columns: ['persona_id'];
            isOneToOne: false;
            referencedRelation: 'personas';
            referencedColumns: ['id'];
          },
        ];
      };
      lineas_negocio: {
        Row: {
          activo: boolean;
          id: string;
          nombre: string;
        };
        Insert: {
          activo?: boolean;
          id?: string;
          nombre: string;
        };
        Update: {
          activo?: boolean;
          id?: string;
          nombre?: string;
        };
        Relationships: [];
      };
      lote_insumos: {
        Row: {
          cantidad_consumida: number | null;
          cantidad_planificada: number;
          costo_total_congelado: number | null;
          costo_unitario_congelado: number | null;
          id: string;
          insumo_id: string;
          lote_id: string;
          lote_origen_id: string | null;
        };
        Insert: {
          cantidad_consumida?: number | null;
          cantidad_planificada: number;
          costo_total_congelado?: number | null;
          costo_unitario_congelado?: number | null;
          id?: string;
          insumo_id: string;
          lote_id: string;
          lote_origen_id?: string | null;
        };
        Update: {
          cantidad_consumida?: number | null;
          cantidad_planificada?: number;
          costo_total_congelado?: number | null;
          costo_unitario_congelado?: number | null;
          id?: string;
          insumo_id?: string;
          lote_id?: string;
          lote_origen_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'lote_insumos_insumo_id_fkey';
            columns: ['insumo_id'];
            isOneToOne: false;
            referencedRelation: 'insumos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lote_insumos_insumo_id_fkey';
            columns: ['insumo_id'];
            isOneToOne: false;
            referencedRelation: 'v_insumo_precio_actual';
            referencedColumns: ['insumo_id'];
          },
          {
            foreignKeyName: 'lote_insumos_lote_id_fkey';
            columns: ['lote_id'];
            isOneToOne: false;
            referencedRelation: 'lotes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lote_insumos_lote_id_fkey';
            columns: ['lote_id'];
            isOneToOne: false;
            referencedRelation: 'v_lote_costo';
            referencedColumns: ['lote_id'];
          },
          {
            foreignKeyName: 'lote_insumos_lote_origen_id_fkey';
            columns: ['lote_origen_id'];
            isOneToOne: false;
            referencedRelation: 'lotes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lote_insumos_lote_origen_id_fkey';
            columns: ['lote_origen_id'];
            isOneToOne: false;
            referencedRelation: 'v_lote_costo';
            referencedColumns: ['lote_id'];
          },
        ];
      };
      lote_personas: {
        Row: {
          horas: number | null;
          id: string;
          importe_pagado: number | null;
          lote_id: string;
          notas: string | null;
          persona_id: string;
        };
        Insert: {
          horas?: number | null;
          id?: string;
          importe_pagado?: number | null;
          lote_id: string;
          notas?: string | null;
          persona_id: string;
        };
        Update: {
          horas?: number | null;
          id?: string;
          importe_pagado?: number | null;
          lote_id?: string;
          notas?: string | null;
          persona_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lote_personas_lote_id_fkey';
            columns: ['lote_id'];
            isOneToOne: false;
            referencedRelation: 'lotes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lote_personas_lote_id_fkey';
            columns: ['lote_id'];
            isOneToOne: false;
            referencedRelation: 'v_lote_costo';
            referencedColumns: ['lote_id'];
          },
          {
            foreignKeyName: 'lote_personas_persona_id_fkey';
            columns: ['persona_id'];
            isOneToOne: false;
            referencedRelation: 'personas';
            referencedColumns: ['id'];
          },
        ];
      };
      lotes: {
        Row: {
          cerrado_en: string | null;
          cerrado_por: string | null;
          codigo: string | null;
          costo_completo: boolean | null;
          costo_faltantes: string[] | null;
          creado_en: string;
          creado_por: string | null;
          estado: Database['public']['Enums']['estado_lote'];
          fecha: string;
          id: string;
          insumo_producido_id: string | null;
          merma_pct_aplicado: number | null;
          notas: string | null;
          perdida_cantidad: number | null;
          regalias_aplicado: number | null;
          responsable_persona_id: string | null;
          resultado: Database['public']['Enums']['resultado_lote'] | null;
          tamano_id: string | null;
          unidades_obtenidas: number | null;
          unidades_planificadas: number;
          valor_hora_aplicado: number | null;
          variante: Database['public']['Enums']['variante_producto'];
        };
        Insert: {
          cerrado_en?: string | null;
          cerrado_por?: string | null;
          codigo?: string | null;
          costo_completo?: boolean | null;
          costo_faltantes?: string[] | null;
          creado_en?: string;
          creado_por?: string | null;
          estado?: Database['public']['Enums']['estado_lote'];
          fecha?: string;
          id?: string;
          insumo_producido_id?: string | null;
          merma_pct_aplicado?: number | null;
          notas?: string | null;
          perdida_cantidad?: number | null;
          regalias_aplicado?: number | null;
          responsable_persona_id?: string | null;
          resultado?: Database['public']['Enums']['resultado_lote'] | null;
          tamano_id?: string | null;
          unidades_obtenidas?: number | null;
          unidades_planificadas: number;
          valor_hora_aplicado?: number | null;
          variante?: Database['public']['Enums']['variante_producto'];
        };
        Update: {
          cerrado_en?: string | null;
          cerrado_por?: string | null;
          codigo?: string | null;
          costo_completo?: boolean | null;
          costo_faltantes?: string[] | null;
          creado_en?: string;
          creado_por?: string | null;
          estado?: Database['public']['Enums']['estado_lote'];
          fecha?: string;
          id?: string;
          insumo_producido_id?: string | null;
          merma_pct_aplicado?: number | null;
          notas?: string | null;
          perdida_cantidad?: number | null;
          regalias_aplicado?: number | null;
          responsable_persona_id?: string | null;
          resultado?: Database['public']['Enums']['resultado_lote'] | null;
          tamano_id?: string | null;
          unidades_obtenidas?: number | null;
          unidades_planificadas?: number;
          valor_hora_aplicado?: number | null;
          variante?: Database['public']['Enums']['variante_producto'];
        };
        Relationships: [
          {
            foreignKeyName: 'lotes_cerrado_por_fkey';
            columns: ['cerrado_por'];
            isOneToOne: false;
            referencedRelation: 'perfiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lotes_creado_por_fkey';
            columns: ['creado_por'];
            isOneToOne: false;
            referencedRelation: 'perfiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lotes_insumo_producido_id_fkey';
            columns: ['insumo_producido_id'];
            isOneToOne: false;
            referencedRelation: 'insumos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lotes_insumo_producido_id_fkey';
            columns: ['insumo_producido_id'];
            isOneToOne: false;
            referencedRelation: 'v_insumo_precio_actual';
            referencedColumns: ['insumo_id'];
          },
          {
            foreignKeyName: 'lotes_responsable_persona_id_fkey';
            columns: ['responsable_persona_id'];
            isOneToOne: false;
            referencedRelation: 'personas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lotes_tamano_id_fkey';
            columns: ['tamano_id'];
            isOneToOne: false;
            referencedRelation: 'tamanos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lotes_tamano_id_fkey';
            columns: ['tamano_id'];
            isOneToOne: false;
            referencedRelation: 'v_formula_control';
            referencedColumns: ['tamano_id'];
          },
        ];
      };
      movimientos_insumo: {
        Row: {
          cantidad: number;
          creado_en: string;
          creado_por: string | null;
          fecha: string;
          id: string;
          insumo_id: string;
          lote_id: string | null;
          motivo: string | null;
          recuento_id: string | null;
          tipo: Database['public']['Enums']['tipo_mov_insumo'];
        };
        Insert: {
          cantidad: number;
          creado_en?: string;
          creado_por?: string | null;
          fecha?: string;
          id?: string;
          insumo_id: string;
          lote_id?: string | null;
          motivo?: string | null;
          recuento_id?: string | null;
          tipo: Database['public']['Enums']['tipo_mov_insumo'];
        };
        Update: {
          cantidad?: number;
          creado_en?: string;
          creado_por?: string | null;
          fecha?: string;
          id?: string;
          insumo_id?: string;
          lote_id?: string | null;
          motivo?: string | null;
          recuento_id?: string | null;
          tipo?: Database['public']['Enums']['tipo_mov_insumo'];
        };
        Relationships: [
          {
            foreignKeyName: 'movimientos_insumo_creado_por_fkey';
            columns: ['creado_por'];
            isOneToOne: false;
            referencedRelation: 'perfiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'movimientos_insumo_insumo_id_fkey';
            columns: ['insumo_id'];
            isOneToOne: false;
            referencedRelation: 'insumos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'movimientos_insumo_insumo_id_fkey';
            columns: ['insumo_id'];
            isOneToOne: false;
            referencedRelation: 'v_insumo_precio_actual';
            referencedColumns: ['insumo_id'];
          },
          {
            foreignKeyName: 'movimientos_insumo_lote_id_fkey';
            columns: ['lote_id'];
            isOneToOne: false;
            referencedRelation: 'lotes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'movimientos_insumo_lote_id_fkey';
            columns: ['lote_id'];
            isOneToOne: false;
            referencedRelation: 'v_lote_costo';
            referencedColumns: ['lote_id'];
          },
        ];
      };
      movimientos_producto: {
        Row: {
          cantidad: number;
          creado_en: string;
          creado_por: string | null;
          fecha: string;
          id: string;
          lote_id: string | null;
          motivo: string | null;
          recuento_id: string | null;
          tamano_id: string;
          tipo: Database['public']['Enums']['tipo_mov_producto'];
          ubicacion_id: string;
          venta_id: string | null;
        };
        Insert: {
          cantidad: number;
          creado_en?: string;
          creado_por?: string | null;
          fecha?: string;
          id?: string;
          lote_id?: string | null;
          motivo?: string | null;
          recuento_id?: string | null;
          tamano_id: string;
          tipo: Database['public']['Enums']['tipo_mov_producto'];
          ubicacion_id: string;
          venta_id?: string | null;
        };
        Update: {
          cantidad?: number;
          creado_en?: string;
          creado_por?: string | null;
          fecha?: string;
          id?: string;
          lote_id?: string | null;
          motivo?: string | null;
          recuento_id?: string | null;
          tamano_id?: string;
          tipo?: Database['public']['Enums']['tipo_mov_producto'];
          ubicacion_id?: string;
          venta_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'movimientos_producto_creado_por_fkey';
            columns: ['creado_por'];
            isOneToOne: false;
            referencedRelation: 'perfiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'movimientos_producto_lote_id_fkey';
            columns: ['lote_id'];
            isOneToOne: false;
            referencedRelation: 'lotes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'movimientos_producto_lote_id_fkey';
            columns: ['lote_id'];
            isOneToOne: false;
            referencedRelation: 'v_lote_costo';
            referencedColumns: ['lote_id'];
          },
          {
            foreignKeyName: 'movimientos_producto_tamano_id_fkey';
            columns: ['tamano_id'];
            isOneToOne: false;
            referencedRelation: 'tamanos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'movimientos_producto_tamano_id_fkey';
            columns: ['tamano_id'];
            isOneToOne: false;
            referencedRelation: 'v_formula_control';
            referencedColumns: ['tamano_id'];
          },
          {
            foreignKeyName: 'movimientos_producto_ubicacion_id_fkey';
            columns: ['ubicacion_id'];
            isOneToOne: false;
            referencedRelation: 'ubicaciones';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'movimientos_producto_venta_id_fkey';
            columns: ['venta_id'];
            isOneToOne: false;
            referencedRelation: 'v_deuda_venta';
            referencedColumns: ['venta_id'];
          },
          {
            foreignKeyName: 'movimientos_producto_venta_id_fkey';
            columns: ['venta_id'];
            isOneToOne: false;
            referencedRelation: 'ventas';
            referencedColumns: ['id'];
          },
        ];
      };
      pago_imputaciones: {
        Row: {
          creado_en: string;
          id: string;
          monto: number;
          pago_id: string;
          venta_id: string;
        };
        Insert: {
          creado_en?: string;
          id?: string;
          monto: number;
          pago_id: string;
          venta_id: string;
        };
        Update: {
          creado_en?: string;
          id?: string;
          monto?: number;
          pago_id?: string;
          venta_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'pago_imputaciones_pago_id_fkey';
            columns: ['pago_id'];
            isOneToOne: false;
            referencedRelation: 'pagos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pago_imputaciones_pago_id_fkey';
            columns: ['pago_id'];
            isOneToOne: false;
            referencedRelation: 'v_pago_sobrante';
            referencedColumns: ['pago_id'];
          },
          {
            foreignKeyName: 'pago_imputaciones_venta_id_fkey';
            columns: ['venta_id'];
            isOneToOne: false;
            referencedRelation: 'v_deuda_venta';
            referencedColumns: ['venta_id'];
          },
          {
            foreignKeyName: 'pago_imputaciones_venta_id_fkey';
            columns: ['venta_id'];
            isOneToOne: false;
            referencedRelation: 'ventas';
            referencedColumns: ['id'];
          },
        ];
      };
      pagos: {
        Row: {
          comprobante_url: string | null;
          creado_en: string;
          cuenta_id: string | null;
          fecha: string;
          forma_pago: string | null;
          id: string;
          monto: number;
          notas: string | null;
          persona_id: string;
          registrado_por: string | null;
        };
        Insert: {
          comprobante_url?: string | null;
          creado_en?: string;
          cuenta_id?: string | null;
          fecha?: string;
          forma_pago?: string | null;
          id?: string;
          monto: number;
          notas?: string | null;
          persona_id: string;
          registrado_por?: string | null;
        };
        Update: {
          comprobante_url?: string | null;
          creado_en?: string;
          cuenta_id?: string | null;
          fecha?: string;
          forma_pago?: string | null;
          id?: string;
          monto?: number;
          notas?: string | null;
          persona_id?: string;
          registrado_por?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pagos_cuenta_id_fkey';
            columns: ['cuenta_id'];
            isOneToOne: false;
            referencedRelation: 'cuentas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pagos_persona_id_fkey';
            columns: ['persona_id'];
            isOneToOne: false;
            referencedRelation: 'personas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pagos_registrado_por_fkey';
            columns: ['registrado_por'];
            isOneToOne: false;
            referencedRelation: 'perfiles';
            referencedColumns: ['id'];
          },
        ];
      };
      parametro_valores: {
        Row: {
          creado_en: string;
          creado_por: string | null;
          id: string;
          parametro: string;
          valor: number;
          vigente_desde: string;
        };
        Insert: {
          creado_en?: string;
          creado_por?: string | null;
          id?: string;
          parametro: string;
          valor: number;
          vigente_desde?: string;
        };
        Update: {
          creado_en?: string;
          creado_por?: string | null;
          id?: string;
          parametro?: string;
          valor?: number;
          vigente_desde?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'parametro_valores_creado_por_fkey';
            columns: ['creado_por'];
            isOneToOne: false;
            referencedRelation: 'perfiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'parametro_valores_parametro_fkey';
            columns: ['parametro'];
            isOneToOne: false;
            referencedRelation: 'parametros';
            referencedColumns: ['clave'];
          },
        ];
      };
      parametros: {
        Row: {
          clave: string;
          descripcion: string;
          unidad: string | null;
        };
        Insert: {
          clave: string;
          descripcion: string;
          unidad?: string | null;
        };
        Update: {
          clave?: string;
          descripcion?: string;
          unidad?: string | null;
        };
        Relationships: [];
      };
      perfiles: {
        Row: {
          activo: boolean;
          creado_en: string;
          id: string;
          nombre: string | null;
          rol: Database['public']['Enums']['rol_usuario'];
        };
        Insert: {
          activo?: boolean;
          creado_en?: string;
          id: string;
          nombre?: string | null;
          rol?: Database['public']['Enums']['rol_usuario'];
        };
        Update: {
          activo?: boolean;
          creado_en?: string;
          id?: string;
          nombre?: string | null;
          rol?: Database['public']['Enums']['rol_usuario'];
        };
        Relationships: [];
      };
      personas: {
        Row: {
          activo: boolean;
          contacto: string | null;
          creado_en: string;
          es_productor: boolean;
          es_revendedor: boolean;
          id: string;
          nombre: string;
          notas: string | null;
          perfil_id: string | null;
        };
        Insert: {
          activo?: boolean;
          contacto?: string | null;
          creado_en?: string;
          es_productor?: boolean;
          es_revendedor?: boolean;
          id?: string;
          nombre: string;
          notas?: string | null;
          perfil_id?: string | null;
        };
        Update: {
          activo?: boolean;
          contacto?: string | null;
          creado_en?: string;
          es_productor?: boolean;
          es_revendedor?: boolean;
          id?: string;
          nombre?: string;
          notas?: string | null;
          perfil_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'personas_perfil_id_fkey';
            columns: ['perfil_id'];
            isOneToOne: true;
            referencedRelation: 'perfiles';
            referencedColumns: ['id'];
          },
        ];
      };
      productos: {
        Row: {
          activo: boolean;
          creado_en: string;
          descripcion: string | null;
          id: string;
          linea_negocio_id: string | null;
          margen_pct: number | null;
          nombre: string;
        };
        Insert: {
          activo?: boolean;
          creado_en?: string;
          descripcion?: string | null;
          id?: string;
          linea_negocio_id?: string | null;
          margen_pct?: number | null;
          nombre: string;
        };
        Update: {
          activo?: boolean;
          creado_en?: string;
          descripcion?: string | null;
          id?: string;
          linea_negocio_id?: string | null;
          margen_pct?: number | null;
          nombre?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'productos_linea_negocio_id_fkey';
            columns: ['linea_negocio_id'];
            isOneToOne: false;
            referencedRelation: 'lineas_negocio';
            referencedColumns: ['id'];
          },
        ];
      };
      proveedores: {
        Row: {
          activo: boolean;
          contacto: string | null;
          creado_en: string;
          id: string;
          link: string | null;
          nombre: string;
          notas: string | null;
        };
        Insert: {
          activo?: boolean;
          contacto?: string | null;
          creado_en?: string;
          id?: string;
          link?: string | null;
          nombre: string;
          notas?: string | null;
        };
        Update: {
          activo?: boolean;
          contacto?: string | null;
          creado_en?: string;
          id?: string;
          link?: string | null;
          nombre?: string;
          notas?: string | null;
        };
        Relationships: [];
      };
      recuento_lineas: {
        Row: {
          cantidad_contada: number;
          cantidad_teorica: number | null;
          id: string;
          recuento_id: string;
          tamano_id: string;
        };
        Insert: {
          cantidad_contada: number;
          cantidad_teorica?: number | null;
          id?: string;
          recuento_id: string;
          tamano_id: string;
        };
        Update: {
          cantidad_contada?: number;
          cantidad_teorica?: number | null;
          id?: string;
          recuento_id?: string;
          tamano_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'recuento_lineas_recuento_id_fkey';
            columns: ['recuento_id'];
            isOneToOne: false;
            referencedRelation: 'recuentos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recuento_lineas_tamano_id_fkey';
            columns: ['tamano_id'];
            isOneToOne: false;
            referencedRelation: 'tamanos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recuento_lineas_tamano_id_fkey';
            columns: ['tamano_id'];
            isOneToOne: false;
            referencedRelation: 'v_formula_control';
            referencedColumns: ['tamano_id'];
          },
        ];
      };
      recuentos: {
        Row: {
          confirmado_en: string | null;
          creado_en: string;
          creado_por: string | null;
          es_stock_inicial: boolean;
          estado: Database['public']['Enums']['estado_recuento'];
          fecha: string;
          id: string;
          notas: string | null;
          ubicacion_id: string;
        };
        Insert: {
          confirmado_en?: string | null;
          creado_en?: string;
          creado_por?: string | null;
          es_stock_inicial?: boolean;
          estado?: Database['public']['Enums']['estado_recuento'];
          fecha?: string;
          id?: string;
          notas?: string | null;
          ubicacion_id: string;
        };
        Update: {
          confirmado_en?: string | null;
          creado_en?: string;
          creado_por?: string | null;
          es_stock_inicial?: boolean;
          estado?: Database['public']['Enums']['estado_recuento'];
          fecha?: string;
          id?: string;
          notas?: string | null;
          ubicacion_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'recuentos_creado_por_fkey';
            columns: ['creado_por'];
            isOneToOne: false;
            referencedRelation: 'perfiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recuentos_ubicacion_id_fkey';
            columns: ['ubicacion_id'];
            isOneToOne: false;
            referencedRelation: 'ubicaciones';
            referencedColumns: ['id'];
          },
        ];
      };
      solicitud_lineas: {
        Row: {
          cantidad: number;
          id: string;
          insumo_id: string | null;
          solicitud_id: string;
          tamano_id: string | null;
          variante: Database['public']['Enums']['variante_producto'];
        };
        Insert: {
          cantidad: number;
          id?: string;
          insumo_id?: string | null;
          solicitud_id: string;
          tamano_id?: string | null;
          variante?: Database['public']['Enums']['variante_producto'];
        };
        Update: {
          cantidad?: number;
          id?: string;
          insumo_id?: string | null;
          solicitud_id?: string;
          tamano_id?: string | null;
          variante?: Database['public']['Enums']['variante_producto'];
        };
        Relationships: [
          {
            foreignKeyName: 'solicitud_lineas_insumo_id_fkey';
            columns: ['insumo_id'];
            isOneToOne: false;
            referencedRelation: 'insumos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'solicitud_lineas_insumo_id_fkey';
            columns: ['insumo_id'];
            isOneToOne: false;
            referencedRelation: 'v_insumo_precio_actual';
            referencedColumns: ['insumo_id'];
          },
          {
            foreignKeyName: 'solicitud_lineas_solicitud_id_fkey';
            columns: ['solicitud_id'];
            isOneToOne: false;
            referencedRelation: 'solicitudes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'solicitud_lineas_tamano_id_fkey';
            columns: ['tamano_id'];
            isOneToOne: false;
            referencedRelation: 'tamanos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'solicitud_lineas_tamano_id_fkey';
            columns: ['tamano_id'];
            isOneToOne: false;
            referencedRelation: 'v_formula_control';
            referencedColumns: ['tamano_id'];
          },
        ];
      };
      solicitudes: {
        Row: {
          creado_en: string;
          estado: Database['public']['Enums']['estado_solicitud'];
          fecha: string;
          id: string;
          notas: string | null;
          persona_id: string;
          resuelta_en: string | null;
          resuelta_por: string | null;
          tamano_objetivo_id: string | null;
          tipo: Database['public']['Enums']['tipo_solicitud'];
          unidades_objetivo: number | null;
        };
        Insert: {
          creado_en?: string;
          estado?: Database['public']['Enums']['estado_solicitud'];
          fecha?: string;
          id?: string;
          notas?: string | null;
          persona_id: string;
          resuelta_en?: string | null;
          resuelta_por?: string | null;
          tamano_objetivo_id?: string | null;
          tipo: Database['public']['Enums']['tipo_solicitud'];
          unidades_objetivo?: number | null;
        };
        Update: {
          creado_en?: string;
          estado?: Database['public']['Enums']['estado_solicitud'];
          fecha?: string;
          id?: string;
          notas?: string | null;
          persona_id?: string;
          resuelta_en?: string | null;
          resuelta_por?: string | null;
          tamano_objetivo_id?: string | null;
          tipo?: Database['public']['Enums']['tipo_solicitud'];
          unidades_objetivo?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'solicitudes_persona_id_fkey';
            columns: ['persona_id'];
            isOneToOne: false;
            referencedRelation: 'personas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'solicitudes_resuelta_por_fkey';
            columns: ['resuelta_por'];
            isOneToOne: false;
            referencedRelation: 'perfiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'solicitudes_tamano_objetivo_id_fkey';
            columns: ['tamano_objetivo_id'];
            isOneToOne: false;
            referencedRelation: 'tamanos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'solicitudes_tamano_objetivo_id_fkey';
            columns: ['tamano_objetivo_id'];
            isOneToOne: false;
            referencedRelation: 'v_formula_control';
            referencedColumns: ['tamano_id'];
          },
        ];
      };
      tamano_precios: {
        Row: {
          creado_en: string;
          creado_por: string | null;
          id: string;
          precio: number;
          tamano_id: string;
          variante: Database['public']['Enums']['variante_producto'];
          vigente_desde: string;
        };
        Insert: {
          creado_en?: string;
          creado_por?: string | null;
          id?: string;
          precio: number;
          tamano_id: string;
          variante?: Database['public']['Enums']['variante_producto'];
          vigente_desde?: string;
        };
        Update: {
          creado_en?: string;
          creado_por?: string | null;
          id?: string;
          precio?: number;
          tamano_id?: string;
          variante?: Database['public']['Enums']['variante_producto'];
          vigente_desde?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tamano_precios_creado_por_fkey';
            columns: ['creado_por'];
            isOneToOne: false;
            referencedRelation: 'perfiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tamano_precios_tamano_id_fkey';
            columns: ['tamano_id'];
            isOneToOne: false;
            referencedRelation: 'tamanos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tamano_precios_tamano_id_fkey';
            columns: ['tamano_id'];
            isOneToOne: false;
            referencedRelation: 'v_formula_control';
            referencedColumns: ['tamano_id'];
          },
        ];
      };
      tamanos: {
        Row: {
          activo: boolean;
          creado_en: string;
          id: string;
          magnitud: number;
          nombre: string | null;
          productividad_unid_hora: number | null;
          producto_id: string;
          unidad: Database['public']['Enums']['unidad_tamano'];
        };
        Insert: {
          activo?: boolean;
          creado_en?: string;
          id?: string;
          magnitud: number;
          nombre?: string | null;
          productividad_unid_hora?: number | null;
          producto_id: string;
          unidad: Database['public']['Enums']['unidad_tamano'];
        };
        Update: {
          activo?: boolean;
          creado_en?: string;
          id?: string;
          magnitud?: number;
          nombre?: string | null;
          productividad_unid_hora?: number | null;
          producto_id?: string;
          unidad?: Database['public']['Enums']['unidad_tamano'];
        };
        Relationships: [
          {
            foreignKeyName: 'tamanos_producto_id_fkey';
            columns: ['producto_id'];
            isOneToOne: false;
            referencedRelation: 'productos';
            referencedColumns: ['id'];
          },
        ];
      };
      ubicaciones: {
        Row: {
          activo: boolean;
          es_default: boolean;
          id: string;
          nombre: string;
        };
        Insert: {
          activo?: boolean;
          es_default?: boolean;
          id?: string;
          nombre: string;
        };
        Update: {
          activo?: boolean;
          es_default?: boolean;
          id?: string;
          nombre?: string;
        };
        Relationships: [];
      };
      venta_lineas: {
        Row: {
          cantidad: number;
          id: string;
          importe_total: number | null;
          importe_unitario: number | null;
          origen_importe: Database['public']['Enums']['origen_importe'] | null;
          tamano_id: string;
          variante: Database['public']['Enums']['variante_producto'];
          venta_id: string;
        };
        Insert: {
          cantidad: number;
          id?: string;
          importe_total?: number | null;
          importe_unitario?: number | null;
          origen_importe?: Database['public']['Enums']['origen_importe'] | null;
          tamano_id: string;
          variante?: Database['public']['Enums']['variante_producto'];
          venta_id: string;
        };
        Update: {
          cantidad?: number;
          id?: string;
          importe_total?: number | null;
          importe_unitario?: number | null;
          origen_importe?: Database['public']['Enums']['origen_importe'] | null;
          tamano_id?: string;
          variante?: Database['public']['Enums']['variante_producto'];
          venta_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'venta_lineas_tamano_id_fkey';
            columns: ['tamano_id'];
            isOneToOne: false;
            referencedRelation: 'tamanos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'venta_lineas_tamano_id_fkey';
            columns: ['tamano_id'];
            isOneToOne: false;
            referencedRelation: 'v_formula_control';
            referencedColumns: ['tamano_id'];
          },
          {
            foreignKeyName: 'venta_lineas_venta_id_fkey';
            columns: ['venta_id'];
            isOneToOne: false;
            referencedRelation: 'v_deuda_venta';
            referencedColumns: ['venta_id'];
          },
          {
            foreignKeyName: 'venta_lineas_venta_id_fkey';
            columns: ['venta_id'];
            isOneToOne: false;
            referencedRelation: 'ventas';
            referencedColumns: ['id'];
          },
        ];
      };
      ventas: {
        Row: {
          a_nombre_de_persona_id: string | null;
          comprobante_url: string | null;
          confirmada_en: string | null;
          creado_en: string;
          cuenta_id: string | null;
          estado: Database['public']['Enums']['estado_venta'];
          fecha: string;
          forma_pago: string | null;
          id: string;
          notas: string | null;
          persona_id: string | null;
          registrada_por: string | null;
          tipo: Database['public']['Enums']['tipo_venta'];
          ubicacion_id: string | null;
        };
        Insert: {
          a_nombre_de_persona_id?: string | null;
          comprobante_url?: string | null;
          confirmada_en?: string | null;
          creado_en?: string;
          cuenta_id?: string | null;
          estado?: Database['public']['Enums']['estado_venta'];
          fecha?: string;
          forma_pago?: string | null;
          id?: string;
          notas?: string | null;
          persona_id?: string | null;
          registrada_por?: string | null;
          tipo: Database['public']['Enums']['tipo_venta'];
          ubicacion_id?: string | null;
        };
        Update: {
          a_nombre_de_persona_id?: string | null;
          comprobante_url?: string | null;
          confirmada_en?: string | null;
          creado_en?: string;
          cuenta_id?: string | null;
          estado?: Database['public']['Enums']['estado_venta'];
          fecha?: string;
          forma_pago?: string | null;
          id?: string;
          notas?: string | null;
          persona_id?: string | null;
          registrada_por?: string | null;
          tipo?: Database['public']['Enums']['tipo_venta'];
          ubicacion_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ventas_a_nombre_de_persona_id_fkey';
            columns: ['a_nombre_de_persona_id'];
            isOneToOne: false;
            referencedRelation: 'personas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ventas_cuenta_id_fkey';
            columns: ['cuenta_id'];
            isOneToOne: false;
            referencedRelation: 'cuentas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ventas_persona_id_fkey';
            columns: ['persona_id'];
            isOneToOne: false;
            referencedRelation: 'personas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ventas_registrada_por_fkey';
            columns: ['registrada_por'];
            isOneToOne: false;
            referencedRelation: 'perfiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ventas_ubicacion_id_fkey';
            columns: ['ubicacion_id'];
            isOneToOne: false;
            referencedRelation: 'ubicaciones';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      v_deuda_persona: {
        Row: {
          deuda_mas_vieja: string | null;
          deuda_total: number | null;
          nombre: string | null;
          persona_id: string | null;
          ventas_impagas: number | null;
        };
        Relationships: [];
      };
      v_deuda_venta: {
        Row: {
          fecha: string | null;
          pagado: number | null;
          persona_id: string | null;
          saldo: number | null;
          tipo: Database['public']['Enums']['tipo_venta'] | null;
          total: number | null;
          venta_id: string | null;
        };
        Relationships: [];
      };
      v_formula_control: {
        Row: {
          cierra_100: boolean | null;
          magnitud: number | null;
          producto: string | null;
          suma_porcentaje: number | null;
          tamano_id: string | null;
          unidad: Database['public']['Enums']['unidad_tamano'] | null;
        };
        Relationships: [];
      };
      v_insumo_precio_actual: {
        Row: {
          alerta_desactualizado: boolean | null;
          dias_desde_verificacion: number | null;
          insumo_id: string | null;
          moneda: Database['public']['Enums']['moneda'] | null;
          nombre: string | null;
          origen: Database['public']['Enums']['origen_insumo'] | null;
          precio: number | null;
          tipo: Database['public']['Enums']['tipo_insumo'] | null;
          unidad: Database['public']['Enums']['unidad_insumo'] | null;
          verificado_en: string | null;
          vigente_desde: string | null;
        };
        Relationships: [];
      };
      v_lote_costo: {
        Row: {
          codigo: string | null;
          costo_completo: boolean | null;
          costo_faltantes: string[] | null;
          costo_insumos: number | null;
          costo_mano_obra: number | null;
          costo_regalias: number | null;
          costo_total: number | null;
          costo_unitario_real: number | null;
          estado: Database['public']['Enums']['estado_lote'] | null;
          fecha: string | null;
          lote_id: string | null;
          mano_obra_real: boolean | null;
          produce: string | null;
          resultado: Database['public']['Enums']['resultado_lote'] | null;
          unidades_obtenidas: number | null;
          unidades_planificadas: number | null;
        };
        Relationships: [];
      };
      v_pago_sobrante: {
        Row: {
          fecha: string | null;
          imputado: number | null;
          monto: number | null;
          pago_id: string | null;
          persona_id: string | null;
          sobrante: number | null;
        };
        Insert: {
          fecha?: string | null;
          imputado?: never;
          monto?: number | null;
          pago_id?: string | null;
          persona_id?: string | null;
          sobrante?: never;
        };
        Update: {
          fecha?: string | null;
          imputado?: never;
          monto?: number | null;
          pago_id?: string | null;
          persona_id?: string | null;
          sobrante?: never;
        };
        Relationships: [
          {
            foreignKeyName: 'pagos_persona_id_fkey';
            columns: ['persona_id'];
            isOneToOne: false;
            referencedRelation: 'personas';
            referencedColumns: ['id'];
          },
        ];
      };
      v_stock_insumo: {
        Row: {
          insumo_id: string | null;
          nombre: string | null;
          stock: number | null;
          unidad: Database['public']['Enums']['unidad_insumo'] | null;
        };
        Relationships: [
          {
            foreignKeyName: 'movimientos_insumo_insumo_id_fkey';
            columns: ['insumo_id'];
            isOneToOne: false;
            referencedRelation: 'insumos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'movimientos_insumo_insumo_id_fkey';
            columns: ['insumo_id'];
            isOneToOne: false;
            referencedRelation: 'v_insumo_precio_actual';
            referencedColumns: ['insumo_id'];
          },
        ];
      };
      v_stock_producto: {
        Row: {
          producto: string | null;
          stock: number | null;
          tamano: string | null;
          tamano_id: string | null;
          ubicacion: string | null;
          ubicacion_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'movimientos_producto_tamano_id_fkey';
            columns: ['tamano_id'];
            isOneToOne: false;
            referencedRelation: 'tamanos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'movimientos_producto_tamano_id_fkey';
            columns: ['tamano_id'];
            isOneToOne: false;
            referencedRelation: 'v_formula_control';
            referencedColumns: ['tamano_id'];
          },
          {
            foreignKeyName: 'movimientos_producto_ubicacion_id_fkey';
            columns: ['ubicacion_id'];
            isOneToOne: false;
            referencedRelation: 'ubicaciones';
            referencedColumns: ['id'];
          },
        ];
      };
      v_stock_producto_total: {
        Row: {
          producto: string | null;
          stock: number | null;
          tamano: string | null;
          tamano_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'movimientos_producto_tamano_id_fkey';
            columns: ['tamano_id'];
            isOneToOne: false;
            referencedRelation: 'tamanos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'movimientos_producto_tamano_id_fkey';
            columns: ['tamano_id'];
            isOneToOne: false;
            referencedRelation: 'v_formula_control';
            referencedColumns: ['tamano_id'];
          },
        ];
      };
    };
    Functions: {
      aceptar_invitacion: { Args: { p_token: string }; Returns: string };
      anular_venta: { Args: { p_venta_id: string }; Returns: number };
      calcular_insumos: {
        Args: {
          p_merma_pct?: number;
          p_tamano_id: string;
          p_unidades: number;
          p_variante?: Database['public']['Enums']['variante_producto'];
        };
        Returns: {
          cantidad_formula: number;
          cantidad_necesaria: number;
          insumo: string;
          lleva_merma: boolean;
          merma: number;
          unidad: Database['public']['Enums']['unidad_insumo'];
        }[];
      };
      catalogo_para_usuario: {
        Args: never;
        Returns: {
          base: string;
          completo: boolean;
          importe: number;
          magnitud: number;
          producto: string;
          tamano: string;
          tamano_id: string;
          unidad: Database['public']['Enums']['unidad_tamano'];
        }[];
      };
      cerrar_lote: {
        Args: {
          p_lote_id: string;
          p_merma_pct?: number;
          p_perdida_cantidad?: number;
          p_resultado: Database['public']['Enums']['resultado_lote'];
          p_ubicacion_id?: string;
          p_unidades_obtenidas: number;
        };
        Returns: undefined;
      };
      confirmar_venta: {
        Args: { p_ubicacion_id?: string; p_venta_id: string };
        Returns: undefined;
      };
      costo_insumo: {
        Args: { p_fecha?: string; p_insumo_id: string; p_path?: string[] };
        Returns: Database['public']['CompositeTypes']['resultado_costo'];
        SetofOptions: {
          from: '*';
          to: 'resultado_costo';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      costo_insumo_simulado: {
        Args: {
          p_fecha?: string;
          p_insumo_id: string;
          p_path?: string[];
          p_precios?: Json;
        };
        Returns: Database['public']['CompositeTypes']['resultado_costo'];
        SetofOptions: {
          from: '*';
          to: 'resultado_costo';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      costo_tamano: {
        Args: {
          p_fecha?: string;
          p_merma_pct?: number;
          p_tamano_id: string;
          p_variante?: Database['public']['Enums']['variante_producto'];
        };
        Returns: {
          completo: boolean;
          costo_con_etiqueta: number;
          costo_energia: number;
          costo_envases: number;
          costo_etiquetas: number;
          costo_mano_obra: number;
          costo_materias_primas: number;
          costo_merma: number;
          costo_otros: number;
          costo_regalias: number;
          costo_sin_etiqueta: number;
          faltantes: string[];
        }[];
      };
      es_admin: { Args: never; Returns: boolean };
      factor_unidad: {
        Args: { p_unidad: Database['public']['Enums']['unidad_insumo'] };
        Returns: number;
      };
      imputar_pago_fifo: { Args: { p_pago_id: string }; Returns: number };
      insumos_sin_precio_tamano: {
        Args: {
          p_fecha?: string;
          p_tamano_id: string;
          p_variante?: Database['public']['Enums']['variante_producto'];
        };
        Returns: {
          insumo_id: string;
          nombre: string;
          unidad: Database['public']['Enums']['unidad_insumo'];
        }[];
      };
      lote_planificar: { Args: { p_lote_id: string }; Returns: undefined };
      mi_rol: { Args: never; Returns: string };
      parametro_valor: {
        Args: { p_clave: string; p_fecha?: string };
        Returns: number;
      };
      precio_recomendado: {
        Args: {
          p_fecha?: string;
          p_tamano_id: string;
          p_variante?: Database['public']['Enums']['variante_producto'];
        };
        Returns: Database['public']['CompositeTypes']['resultado_costo'];
        SetofOptions: {
          from: '*';
          to: 'resultado_costo';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      recuento_confirmar: {
        Args: { p_recuento_id: string };
        Returns: undefined;
      };
      registrar_resultado_lote: {
        Args: {
          p_lote_id: string;
          p_resultado: Database['public']['Enums']['resultado_lote'];
          p_unidades_obtenidas: number;
        };
        Returns: undefined;
      };
      simular_costo_tamano: {
        Args: {
          p_fecha?: string;
          p_merma_pct?: number;
          p_precios?: Json;
          p_tamano_id: string;
          p_variante?: Database['public']['Enums']['variante_producto'];
        };
        Returns: {
          completo: boolean;
          costo_con_etiqueta: number;
          costo_energia: number;
          costo_envases: number;
          costo_etiquetas: number;
          costo_mano_obra: number;
          costo_materias_primas: number;
          costo_merma: number;
          costo_otros: number;
          costo_regalias: number;
          costo_sin_etiqueta: number;
          faltantes: string[];
        }[];
      };
      ubicacion_default: { Args: never; Returns: string };
    };
    Enums: {
      aplica_variante: 'ambas' | 'solo_elysium' | 'solo_marca_blanca';
      estado_lote: 'abierto' | 'cerrado';
      estado_recuento: 'abierto' | 'confirmado';
      estado_solicitud: 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada';
      estado_venta: 'borrador' | 'confirmada' | 'anulada';
      modo_composicion: 'porcentaje' | 'cantidad_fija';
      moneda: 'ARS' | 'USD';
      origen_importe: 'precio_venta' | 'costo' | 'manual';
      origen_insumo: 'comprado' | 'producido';
      resultado_lote: 'ok' | 'descarte' | 'reproceso';
      rol_usuario: 'admin' | 'usuario';
      tipo_gasto:
        | 'materia_prima'
        | 'envases'
        | 'etiquetas'
        | 'regalias'
        | 'mano_de_obra'
        | 'libreria'
        | 'publicidad'
        | 'otros';
      tipo_insumo: 'materia_prima' | 'envase' | 'etiqueta' | 'packaging' | 'otro';
      tipo_mov_insumo:
        | 'stock_inicial'
        | 'compra'
        | 'produccion'
        | 'consumo_lote'
        | 'merma'
        | 'ajuste'
        | 'devolucion';
      tipo_mov_producto:
        | 'stock_inicial'
        | 'produccion'
        | 'venta'
        | 'entrega'
        | 'ajuste'
        | 'merma'
        | 'muestra'
        | 'traslado';
      tipo_solicitud: 'producto' | 'materia_prima';
      tipo_venta: 'directa' | 'entrega_reventa';
      unidad_insumo: 'kg' | 'l' | 'unidad';
      unidad_tamano: 'g' | 'ml';
      variante_producto: 'elysium' | 'marca_blanca';
    };
    CompositeTypes: {
      resultado_costo: {
        costo: number | null;
        completo: boolean | null;
        faltantes: string[] | null;
      };
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      aplica_variante: ['ambas', 'solo_elysium', 'solo_marca_blanca'],
      estado_lote: ['abierto', 'cerrado'],
      estado_recuento: ['abierto', 'confirmado'],
      estado_solicitud: ['pendiente', 'aprobada', 'rechazada', 'cancelada'],
      estado_venta: ['borrador', 'confirmada', 'anulada'],
      modo_composicion: ['porcentaje', 'cantidad_fija'],
      moneda: ['ARS', 'USD'],
      origen_importe: ['precio_venta', 'costo', 'manual'],
      origen_insumo: ['comprado', 'producido'],
      resultado_lote: ['ok', 'descarte', 'reproceso'],
      rol_usuario: ['admin', 'usuario'],
      tipo_gasto: [
        'materia_prima',
        'envases',
        'etiquetas',
        'regalias',
        'mano_de_obra',
        'libreria',
        'publicidad',
        'otros',
      ],
      tipo_insumo: ['materia_prima', 'envase', 'etiqueta', 'packaging', 'otro'],
      tipo_mov_insumo: [
        'stock_inicial',
        'compra',
        'produccion',
        'consumo_lote',
        'merma',
        'ajuste',
        'devolucion',
      ],
      tipo_mov_producto: [
        'stock_inicial',
        'produccion',
        'venta',
        'entrega',
        'ajuste',
        'merma',
        'muestra',
        'traslado',
      ],
      tipo_solicitud: ['producto', 'materia_prima'],
      tipo_venta: ['directa', 'entrega_reventa'],
      unidad_insumo: ['kg', 'l', 'unidad'],
      unidad_tamano: ['g', 'ml'],
      variante_producto: ['elysium', 'marca_blanca'],
    },
  },
} as const;
