/**
 * Tipos TypeScript obtenidos por introspección de PostgreSQL para ResiliaUNT.
 * Proyecto Supabase conectado: PostgreSQL 17 / PostgREST 14.18.
 * Mantener sincronizado con las migraciones en database/supabase/.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
type Relationship = { foreignKeyName: string; columns: string[]; isOneToOne: boolean; referencedRelation: string; referencedColumns: string[] };
type TableDefinition<Row, Insert, Update = Partial<Row>, Relationships extends Relationship[] = []> = { Row: Row; Insert: Insert; Update: Update; Relationships: Relationships };
export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" };
  public: {
    Tables: {
      perfiles_app: TableDefinition<
        {
          id: string;
          rol: string;
          id_estudiante: number | null;
          id_terapeuta: number | null;
          nombre_visible: string | null;
          created_at: string;
          updated_at: string
        },
        {
          id: string;
          rol?: string;
          id_estudiante?: number | null;
          id_terapeuta?: number | null;
          nombre_visible?: string | null;
          created_at?: string;
          updated_at?: string
        },
        Partial<{
          id: string;
          rol: string;
          id_estudiante: number | null;
          id_terapeuta: number | null;
          nombre_visible: string | null;
          created_at: string;
          updated_at: string
        }>,
        [{ foreignKeyName: "perfiles_app_id_estudiante_fkey"; columns: ["id_estudiante"]; isOneToOne: false; referencedRelation: "estudiante"; referencedColumns: ["id_estudiante"] }, { foreignKeyName: "perfiles_app_id_terapeuta_fkey"; columns: ["id_terapeuta"]; isOneToOne: false; referencedRelation: "terapeuta"; referencedColumns: ["id_terapeuta"] }]
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      crear_meta_personal_resilia: { Args: { p_categoria: string; p_descripcion: string; p_fecha_objetivo: string | null; p_fecha_estado: string }; Returns: number };
      refrescar_datamart_resilia: { Args: never; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
  oltp_resiliencia: {
    Tables: {
      estudiante: TableDefinition<
        {
          id_estudiante: number;
          codigo_universitario: string;
          nombre_visible: string;
          carrera: string;
          ciclo_academico: number | null;
          turno: string | null;
          activo: boolean;
          created_at: string
        },
        {
          id_estudiante?: number;
          codigo_universitario: string;
          nombre_visible: string;
          carrera?: string;
          ciclo_academico?: number | null;
          turno?: string | null;
          activo?: boolean;
          created_at?: string
        },
        Partial<{
          id_estudiante: number;
          codigo_universitario: string;
          nombre_visible: string;
          carrera: string;
          ciclo_academico: number | null;
          turno: string | null;
          activo: boolean;
          created_at: string
        }>,
        []
      >;
      evaluacion_clinica: TableDefinition<
        {
          id_evaluacion: number;
          id_estudiante: number;
          id_terapeuta: number;
          id_sala: number | null;
          fecha: string;
          indice_resiliencia: number;
          pensamientos_intrusivos: number;
          periodo_referencia_dias: number;
          cantidad_sesiones: number;
          created_at: string
        },
        {
          id_evaluacion?: number;
          id_estudiante: number;
          id_terapeuta: number;
          id_sala?: number | null;
          fecha: string;
          indice_resiliencia: number;
          pensamientos_intrusivos?: number;
          periodo_referencia_dias?: number;
          cantidad_sesiones?: number;
          created_at?: string
        },
        Partial<{
          id_evaluacion: number;
          id_estudiante: number;
          id_terapeuta: number;
          id_sala: number | null;
          fecha: string;
          indice_resiliencia: number;
          pensamientos_intrusivos: number;
          periodo_referencia_dias: number;
          cantidad_sesiones: number;
          created_at: string
        }>,
        [{ foreignKeyName: "evaluacion_clinica_id_estudiante_fkey"; columns: ["id_estudiante"]; isOneToOne: false; referencedRelation: "estudiante"; referencedColumns: ["id_estudiante"] }, { foreignKeyName: "evaluacion_clinica_id_sala_fkey"; columns: ["id_sala"]; isOneToOne: false; referencedRelation: "sala_terapia"; referencedColumns: ["id_sala"] }, { foreignKeyName: "evaluacion_clinica_id_terapeuta_fkey"; columns: ["id_terapeuta"]; isOneToOne: false; referencedRelation: "terapeuta"; referencedColumns: ["id_terapeuta"] }]
      >;
      evaluacion_red_apoyo: TableDefinition<
        {
          id_evaluacion_red: number;
          id_estudiante: number;
          id_terapeuta: number;
          fecha: string;
          periodo_referencia_dias: number;
          red_apoyo_activa: boolean;
          contactos_activos: number;
          interacciones_sociales: number;
          created_at: string
        },
        {
          id_evaluacion_red?: number;
          id_estudiante: number;
          id_terapeuta: number;
          fecha: string;
          periodo_referencia_dias?: number;
          red_apoyo_activa: boolean;
          contactos_activos?: number;
          interacciones_sociales?: number;
          created_at?: string
        },
        Partial<{
          id_evaluacion_red: number;
          id_estudiante: number;
          id_terapeuta: number;
          fecha: string;
          periodo_referencia_dias: number;
          red_apoyo_activa: boolean;
          contactos_activos: number;
          interacciones_sociales: number;
          created_at: string
        }>,
        [{ foreignKeyName: "evaluacion_red_apoyo_id_estudiante_fkey"; columns: ["id_estudiante"]; isOneToOne: false; referencedRelation: "estudiante"; referencedColumns: ["id_estudiante"] }, { foreignKeyName: "evaluacion_red_apoyo_id_terapeuta_fkey"; columns: ["id_terapeuta"]; isOneToOne: false; referencedRelation: "terapeuta"; referencedColumns: ["id_terapeuta"] }]
      >;
      habito: TableDefinition<
        {
          id_habito: number;
          codigo_habito: string;
          nombre: string;
          categoria: string;
          activo: boolean
        },
        {
          id_habito?: number;
          codigo_habito: string;
          nombre: string;
          categoria: string;
          activo?: boolean
        },
        Partial<{
          id_habito: number;
          codigo_habito: string;
          nombre: string;
          categoria: string;
          activo: boolean
        }>,
        []
      >;
      meta_personal: TableDefinition<
        {
          id_meta: number;
          codigo_meta: string | null;
          id_estudiante: number;
          categoria: string;
          descripcion: string;
          fecha_creacion: string;
          fecha_objetivo: string | null;
          activa: boolean;
          created_at: string
        },
        {
          id_meta?: number;
          codigo_meta?: string | null;
          id_estudiante: number;
          categoria: string;
          descripcion: string;
          fecha_creacion?: string;
          fecha_objetivo?: string | null;
          activa?: boolean;
          created_at?: string
        },
        Partial<{
          id_meta: number;
          codigo_meta: string | null;
          id_estudiante: number;
          categoria: string;
          descripcion: string;
          fecha_creacion: string;
          fecha_objetivo: string | null;
          activa: boolean;
          created_at: string
        }>,
        [{ foreignKeyName: "meta_personal_id_estudiante_fkey"; columns: ["id_estudiante"]; isOneToOne: false; referencedRelation: "estudiante"; referencedColumns: ["id_estudiante"] }]
      >;
      registro_habito: TableDefinition<
        {
          id_registro_habito: number;
          id_estudiante: number;
          id_habito: number;
          fecha: string;
          intensidad: string;
          completado: boolean;
          created_at: string
        },
        {
          id_registro_habito?: number;
          id_estudiante: number;
          id_habito: number;
          fecha?: string;
          intensidad?: string;
          completado?: boolean;
          created_at?: string
        },
        Partial<{
          id_registro_habito: number;
          id_estudiante: number;
          id_habito: number;
          fecha: string;
          intensidad: string;
          completado: boolean;
          created_at: string
        }>,
        [{ foreignKeyName: "registro_habito_id_estudiante_fkey"; columns: ["id_estudiante"]; isOneToOne: false; referencedRelation: "estudiante"; referencedColumns: ["id_estudiante"] }, { foreignKeyName: "registro_habito_id_habito_fkey"; columns: ["id_habito"]; isOneToOne: false; referencedRelation: "habito"; referencedColumns: ["id_habito"] }]
      >;
      registro_meta: TableDefinition<
        {
          id_registro_meta: number;
          id_meta: number;
          fecha: string;
          estado: string;
          created_at: string
        },
        {
          id_registro_meta?: number;
          id_meta: number;
          fecha?: string;
          estado: string;
          created_at?: string
        },
        Partial<{
          id_registro_meta: number;
          id_meta: number;
          fecha: string;
          estado: string;
          created_at: string
        }>,
        [{ foreignKeyName: "registro_meta_id_meta_fkey"; columns: ["id_meta"]; isOneToOne: false; referencedRelation: "meta_personal"; referencedColumns: ["id_meta"] }]
      >;
      sala_terapia: TableDefinition<
        {
          id_sala: number;
          codigo_sala: string;
          nombre_sala: string;
          pabellon: string | null;
          modalidad: string;
          capacidad: number;
          activo: boolean;
          created_at: string
        },
        {
          id_sala?: number;
          codigo_sala: string;
          nombre_sala: string;
          pabellon?: string | null;
          modalidad?: string;
          capacidad?: number;
          activo?: boolean;
          created_at?: string
        },
        Partial<{
          id_sala: number;
          codigo_sala: string;
          nombre_sala: string;
          pabellon: string | null;
          modalidad: string;
          capacidad: number;
          activo: boolean;
          created_at: string
        }>,
        []
      >;
      sesion_terapia: TableDefinition<
        {
          id_sesion: number;
          id_estudiante: number;
          id_terapeuta: number;
          id_sala: number | null;
          inicio: string;
          fin: string | null;
          estado: string;
          modalidad: string;
          created_at: string
        },
        {
          id_sesion?: number;
          id_estudiante: number;
          id_terapeuta: number;
          id_sala?: number | null;
          inicio: string;
          fin?: string | null;
          estado?: string;
          modalidad?: string;
          created_at?: string
        },
        Partial<{
          id_sesion: number;
          id_estudiante: number;
          id_terapeuta: number;
          id_sala: number | null;
          inicio: string;
          fin: string | null;
          estado: string;
          modalidad: string;
          created_at: string
        }>,
        [{ foreignKeyName: "sesion_terapia_id_estudiante_fkey"; columns: ["id_estudiante"]; isOneToOne: false; referencedRelation: "estudiante"; referencedColumns: ["id_estudiante"] }, { foreignKeyName: "sesion_terapia_id_sala_fkey"; columns: ["id_sala"]; isOneToOne: false; referencedRelation: "sala_terapia"; referencedColumns: ["id_sala"] }, { foreignKeyName: "sesion_terapia_id_terapeuta_fkey"; columns: ["id_terapeuta"]; isOneToOne: false; referencedRelation: "terapeuta"; referencedColumns: ["id_terapeuta"] }]
      >;
      terapeuta: TableDefinition<
        {
          id_terapeuta: number;
          codigo_terapeuta: string;
          nombre: string;
          especialidad: string | null;
          activo: boolean;
          created_at: string
        },
        {
          id_terapeuta?: number;
          codigo_terapeuta: string;
          nombre: string;
          especialidad?: string | null;
          activo?: boolean;
          created_at?: string
        },
        Partial<{
          id_terapeuta: number;
          codigo_terapeuta: string;
          nombre: string;
          especialidad: string | null;
          activo: boolean;
          created_at: string
        }>,
        []
      >;
      terapeuta_estudiante: TableDefinition<
        {
          id_asignacion: number;
          id_terapeuta: number;
          id_estudiante: number;
          fecha_inicio: string;
          fecha_fin: string | null;
          activo: boolean;
          created_at: string
        },
        {
          id_asignacion?: number;
          id_terapeuta: number;
          id_estudiante: number;
          fecha_inicio?: string;
          fecha_fin?: string | null;
          activo?: boolean;
          created_at?: string
        },
        Partial<{
          id_asignacion: number;
          id_terapeuta: number;
          id_estudiante: number;
          fecha_inicio: string;
          fecha_fin: string | null;
          activo: boolean;
          created_at: string
        }>,
        [{ foreignKeyName: "terapeuta_estudiante_id_estudiante_fkey"; columns: ["id_estudiante"]; isOneToOne: false; referencedRelation: "estudiante"; referencedColumns: ["id_estudiante"] }, { foreignKeyName: "terapeuta_estudiante_id_terapeuta_fkey"; columns: ["id_terapeuta"]; isOneToOne: false; referencedRelation: "terapeuta"; referencedColumns: ["id_terapeuta"] }]
      >;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
  datamart_resiliencia: {
    Tables: {
      dim_estudiante: TableDefinition<
        {
          estudiante_key: number;
          id_estudiante_oltp: number | null;
          codigo_universitario: string;
          carrera: string | null;
          ciclo_academico: number | null;
          turno: string | null
        },
        {
          estudiante_key?: number;
          id_estudiante_oltp?: number | null;
          codigo_universitario: string;
          carrera?: string | null;
          ciclo_academico?: number | null;
          turno?: string | null
        },
        Partial<{
          estudiante_key: number;
          id_estudiante_oltp: number | null;
          codigo_universitario: string;
          carrera: string | null;
          ciclo_academico: number | null;
          turno: string | null
        }>,
        []
      >;
      dim_habito: TableDefinition<
        {
          habito_key: number;
          codigo_habito: string;
          nombre: string | null;
          categoria: string | null
        },
        {
          habito_key?: number;
          codigo_habito: string;
          nombre?: string | null;
          categoria?: string | null
        },
        Partial<{
          habito_key: number;
          codigo_habito: string;
          nombre: string | null;
          categoria: string | null
        }>,
        []
      >;
      dim_intensidad: TableDefinition<
        {
          intensidad_key: number;
          nivel: string
        },
        {
          intensidad_key?: number;
          nivel: string
        },
        Partial<{
          intensidad_key: number;
          nivel: string
        }>,
        []
      >;
      dim_meta_categoria: TableDefinition<
        {
          meta_key: number;
          categoria: string
        },
        {
          meta_key?: number;
          categoria: string
        },
        Partial<{
          meta_key: number;
          categoria: string
        }>,
        []
      >;
      dim_red_apoyo: TableDefinition<
        {
          red_key: number;
          red_apoyo_activa: boolean | null;
          estado: string
        },
        {
          red_key?: number;
          red_apoyo_activa?: boolean | null;
          estado: string
        },
        Partial<{
          red_key: number;
          red_apoyo_activa: boolean | null;
          estado: string
        }>,
        []
      >;
      dim_sala_terapia: TableDefinition<
        {
          sala_key: number;
          codigo_sala: string;
          nombre_sala: string | null;
          pabellon: string | null;
          modalidad: string | null
        },
        {
          sala_key?: number;
          codigo_sala: string;
          nombre_sala?: string | null;
          pabellon?: string | null;
          modalidad?: string | null
        },
        Partial<{
          sala_key: number;
          codigo_sala: string;
          nombre_sala: string | null;
          pabellon: string | null;
          modalidad: string | null
        }>,
        []
      >;
      dim_terapeuta: TableDefinition<
        {
          terapeuta_key: number;
          codigo_terapeuta: string;
          nombre: string | null;
          especialidad: string | null
        },
        {
          terapeuta_key?: number;
          codigo_terapeuta: string;
          nombre?: string | null;
          especialidad?: string | null
        },
        Partial<{
          terapeuta_key: number;
          codigo_terapeuta: string;
          nombre: string | null;
          especialidad: string | null
        }>,
        []
      >;
      dim_tiempo: TableDefinition<
        {
          tiempo_key: number;
          fecha: string;
          dia: number;
          mes: number;
          nombre_mes: string;
          trimestre: number;
          anio: number
        },
        {
          tiempo_key: number;
          fecha: string;
          dia: number;
          mes: number;
          nombre_mes: string;
          trimestre: number;
          anio: number
        },
        Partial<{
          tiempo_key: number;
          fecha: string;
          dia: number;
          mes: number;
          nombre_mes: string;
          trimestre: number;
          anio: number
        }>,
        []
      >;
      fact_evaluacion_clinica: TableDefinition<
        {
          eval_key: number;
          fuente_evaluacion_id: number;
          tiempo_key: number;
          estudiante_key: number;
          terapeuta_key: number;
          sala_key: number;
          indice_resiliencia: number;
          pensamientos_intrusivos: number;
          periodo_referencia_dias: number;
          cantidad_sesiones: number
        },
        {
          eval_key?: number;
          fuente_evaluacion_id: number;
          tiempo_key: number;
          estudiante_key: number;
          terapeuta_key: number;
          sala_key: number;
          indice_resiliencia: number;
          pensamientos_intrusivos: number;
          periodo_referencia_dias: number;
          cantidad_sesiones: number
        },
        Partial<{
          eval_key: number;
          fuente_evaluacion_id: number;
          tiempo_key: number;
          estudiante_key: number;
          terapeuta_key: number;
          sala_key: number;
          indice_resiliencia: number;
          pensamientos_intrusivos: number;
          periodo_referencia_dias: number;
          cantidad_sesiones: number
        }>,
        [{ foreignKeyName: "fact_evaluacion_clinica_estudiante_key_fkey"; columns: ["estudiante_key"]; isOneToOne: false; referencedRelation: "dim_estudiante"; referencedColumns: ["estudiante_key"] }, { foreignKeyName: "fact_evaluacion_clinica_sala_key_fkey"; columns: ["sala_key"]; isOneToOne: false; referencedRelation: "dim_sala_terapia"; referencedColumns: ["sala_key"] }, { foreignKeyName: "fact_evaluacion_clinica_terapeuta_key_fkey"; columns: ["terapeuta_key"]; isOneToOne: false; referencedRelation: "dim_terapeuta"; referencedColumns: ["terapeuta_key"] }, { foreignKeyName: "fact_evaluacion_clinica_tiempo_key_fkey"; columns: ["tiempo_key"]; isOneToOne: false; referencedRelation: "dim_tiempo"; referencedColumns: ["tiempo_key"] }]
      >;
      fact_red_apoyo: TableDefinition<
        {
          red_apoyo_fact_key: number;
          fuente_evaluacion_red_id: number;
          tiempo_key: number;
          estudiante_key: number;
          terapeuta_key: number;
          red_key: number;
          contactos_activos: number;
          interacciones_sociales: number;
          periodo_referencia_dias: number
        },
        {
          red_apoyo_fact_key?: number;
          fuente_evaluacion_red_id: number;
          tiempo_key: number;
          estudiante_key: number;
          terapeuta_key: number;
          red_key: number;
          contactos_activos: number;
          interacciones_sociales: number;
          periodo_referencia_dias: number
        },
        Partial<{
          red_apoyo_fact_key: number;
          fuente_evaluacion_red_id: number;
          tiempo_key: number;
          estudiante_key: number;
          terapeuta_key: number;
          red_key: number;
          contactos_activos: number;
          interacciones_sociales: number;
          periodo_referencia_dias: number
        }>,
        [{ foreignKeyName: "fact_red_apoyo_estudiante_key_fkey"; columns: ["estudiante_key"]; isOneToOne: false; referencedRelation: "dim_estudiante"; referencedColumns: ["estudiante_key"] }, { foreignKeyName: "fact_red_apoyo_red_key_fkey"; columns: ["red_key"]; isOneToOne: false; referencedRelation: "dim_red_apoyo"; referencedColumns: ["red_key"] }, { foreignKeyName: "fact_red_apoyo_terapeuta_key_fkey"; columns: ["terapeuta_key"]; isOneToOne: false; referencedRelation: "dim_terapeuta"; referencedColumns: ["terapeuta_key"] }, { foreignKeyName: "fact_red_apoyo_tiempo_key_fkey"; columns: ["tiempo_key"]; isOneToOne: false; referencedRelation: "dim_tiempo"; referencedColumns: ["tiempo_key"] }]
      >;
      fact_registro_habitos: TableDefinition<
        {
          registro_key: number;
          fuente_registro_id: number;
          tiempo_key: number;
          estudiante_key: number;
          habito_key: number;
          intensidad_key: number;
          completado_count: number
        },
        {
          registro_key?: number;
          fuente_registro_id: number;
          tiempo_key: number;
          estudiante_key: number;
          habito_key: number;
          intensidad_key: number;
          completado_count: number
        },
        Partial<{
          registro_key: number;
          fuente_registro_id: number;
          tiempo_key: number;
          estudiante_key: number;
          habito_key: number;
          intensidad_key: number;
          completado_count: number
        }>,
        [{ foreignKeyName: "fact_registro_habitos_estudiante_key_fkey"; columns: ["estudiante_key"]; isOneToOne: false; referencedRelation: "dim_estudiante"; referencedColumns: ["estudiante_key"] }, { foreignKeyName: "fact_registro_habitos_habito_key_fkey"; columns: ["habito_key"]; isOneToOne: false; referencedRelation: "dim_habito"; referencedColumns: ["habito_key"] }, { foreignKeyName: "fact_registro_habitos_intensidad_key_fkey"; columns: ["intensidad_key"]; isOneToOne: false; referencedRelation: "dim_intensidad"; referencedColumns: ["intensidad_key"] }, { foreignKeyName: "fact_registro_habitos_tiempo_key_fkey"; columns: ["tiempo_key"]; isOneToOne: false; referencedRelation: "dim_tiempo"; referencedColumns: ["tiempo_key"] }]
      >;
      fact_seguimiento_meta: TableDefinition<
        {
          seguimiento_key: number;
          fuente_registro_meta_id: number;
          id_meta_oltp: number;
          tiempo_key: number;
          estudiante_key: number;
          meta_key: number;
          metas_cumplidas: number;
          metas_pendientes: number
        },
        {
          seguimiento_key?: number;
          fuente_registro_meta_id: number;
          id_meta_oltp: number;
          tiempo_key: number;
          estudiante_key: number;
          meta_key: number;
          metas_cumplidas: number;
          metas_pendientes: number
        },
        Partial<{
          seguimiento_key: number;
          fuente_registro_meta_id: number;
          id_meta_oltp: number;
          tiempo_key: number;
          estudiante_key: number;
          meta_key: number;
          metas_cumplidas: number;
          metas_pendientes: number
        }>,
        [{ foreignKeyName: "fact_seguimiento_meta_estudiante_key_fkey"; columns: ["estudiante_key"]; isOneToOne: false; referencedRelation: "dim_estudiante"; referencedColumns: ["estudiante_key"] }, { foreignKeyName: "fact_seguimiento_meta_meta_key_fkey"; columns: ["meta_key"]; isOneToOne: false; referencedRelation: "dim_meta_categoria"; referencedColumns: ["meta_key"] }, { foreignKeyName: "fact_seguimiento_meta_tiempo_key_fkey"; columns: ["tiempo_key"]; isOneToOne: false; referencedRelation: "dim_tiempo"; referencedColumns: ["tiempo_key"] }]
      >;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
export type SchemaName = keyof Omit<Database, "__InternalSupabase">;
