/*
  RESILIAUNT — OLTP PostgreSQL / Supabase
  Ejecutar primero en Supabase SQL Editor.
  Este esquema evita almacenar narrativas clínicas libres y datos demográficos innecesarios.
*/

create schema if not exists oltp_resiliencia;
create schema if not exists datamart_resiliencia;

create table if not exists oltp_resiliencia.sala_terapia (
  id_sala bigint generated always as identity primary key,
  codigo_sala varchar(30) not null unique,
  nombre_sala varchar(100) not null,
  pabellon varchar(100),
  modalidad varchar(30) not null default 'Presencial'
    check (modalidad in ('Presencial', 'Virtual', 'Mixta')),
  capacidad integer not null default 1 check (capacidad > 0),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists oltp_resiliencia.terapeuta (
  id_terapeuta bigint generated always as identity primary key,
  codigo_terapeuta varchar(30) not null unique,
  nombre varchar(150) not null,
  especialidad varchar(100),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists oltp_resiliencia.estudiante (
  id_estudiante bigint generated always as identity primary key,
  codigo_universitario varchar(20) not null unique,
  nombre_visible varchar(150) not null,
  carrera varchar(100) not null default 'Ingeniería de Sistemas'
    check (carrera = 'Ingeniería de Sistemas'),
  ciclo_academico smallint check (ciclo_academico between 1 and 14),
  turno varchar(20) check (turno in ('Mañana', 'Tarde', 'Noche')),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists oltp_resiliencia.terapeuta_estudiante (
  id_asignacion bigint generated always as identity primary key,
  id_terapeuta bigint not null references oltp_resiliencia.terapeuta(id_terapeuta),
  id_estudiante bigint not null references oltp_resiliencia.estudiante(id_estudiante),
  fecha_inicio date not null default current_date,
  fecha_fin date,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id_terapeuta, id_estudiante),
  check (fecha_fin is null or fecha_fin >= fecha_inicio)
);

create table if not exists oltp_resiliencia.sesion_terapia (
  id_sesion bigint generated always as identity primary key,
  id_estudiante bigint not null references oltp_resiliencia.estudiante(id_estudiante),
  id_terapeuta bigint not null references oltp_resiliencia.terapeuta(id_terapeuta),
  id_sala bigint references oltp_resiliencia.sala_terapia(id_sala),
  inicio timestamptz not null,
  fin timestamptz,
  estado varchar(20) not null default 'Programada'
    check (estado in ('Programada', 'Realizada', 'Cancelada', 'No asistió')),
  modalidad varchar(30) not null default 'Presencial'
    check (modalidad in ('Presencial', 'Virtual', 'Mixta')),
  created_at timestamptz not null default now(),
  check (fin is null or fin > inicio)
);

create table if not exists oltp_resiliencia.evaluacion_clinica (
  id_evaluacion bigint generated always as identity primary key,
  id_estudiante bigint not null references oltp_resiliencia.estudiante(id_estudiante),
  id_terapeuta bigint not null references oltp_resiliencia.terapeuta(id_terapeuta),
  id_sala bigint references oltp_resiliencia.sala_terapia(id_sala),
  fecha date not null,
  indice_resiliencia numeric(5,2) not null check (indice_resiliencia between 0 and 100),
  pensamientos_intrusivos integer not null default 0 check (pensamientos_intrusivos >= 0),
  periodo_referencia_dias smallint not null default 30 check (periodo_referencia_dias between 1 and 365),
  cantidad_sesiones smallint not null default 0 check (cantidad_sesiones >= 0),
  created_at timestamptz not null default now(),
  unique (id_estudiante, fecha)
);

create table if not exists oltp_resiliencia.habito (
  id_habito bigint generated always as identity primary key,
  codigo_habito varchar(30) not null unique,
  nombre varchar(100) not null unique,
  categoria varchar(50) not null,
  activo boolean not null default true
);

-- Grano: un hábito de un estudiante en una fecha concreta.
create table if not exists oltp_resiliencia.registro_habito (
  id_registro_habito bigint generated always as identity primary key,
  id_estudiante bigint not null references oltp_resiliencia.estudiante(id_estudiante),
  id_habito bigint not null references oltp_resiliencia.habito(id_habito),
  fecha date not null default current_date,
  intensidad varchar(20) not null default 'Media'
    check (intensidad in ('Alta', 'Media', 'Baja')),
  completado boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id_estudiante, id_habito, fecha)
);

create table if not exists oltp_resiliencia.meta_personal (
  id_meta bigint generated always as identity primary key,
  codigo_meta varchar(40) unique,
  id_estudiante bigint not null references oltp_resiliencia.estudiante(id_estudiante),
  categoria varchar(50) not null,
  descripcion varchar(180) not null,
  fecha_creacion date not null default current_date,
  fecha_objetivo date,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  check (fecha_objetivo is null or fecha_objetivo >= fecha_creacion)
);

-- Grano: una observación del estado de una meta en una fecha.
create table if not exists oltp_resiliencia.registro_meta (
  id_registro_meta bigint generated always as identity primary key,
  id_meta bigint not null references oltp_resiliencia.meta_personal(id_meta),
  fecha date not null default current_date,
  estado varchar(20) not null check (estado in ('Cumplida', 'Pendiente')),
  created_at timestamptz not null default now(),
  unique (id_meta, fecha)
);

-- Grano: una evaluación de la red de apoyo de un estudiante en una fecha.
create table if not exists oltp_resiliencia.evaluacion_red_apoyo (
  id_evaluacion_red bigint generated always as identity primary key,
  id_estudiante bigint not null references oltp_resiliencia.estudiante(id_estudiante),
  id_terapeuta bigint not null references oltp_resiliencia.terapeuta(id_terapeuta),
  fecha date not null,
  periodo_referencia_dias smallint not null default 30
    check (periodo_referencia_dias between 1 and 365),
  red_apoyo_activa boolean not null,
  contactos_activos smallint not null default 0 check (contactos_activos >= 0),
  interacciones_sociales integer not null default 0 check (interacciones_sociales >= 0),
  created_at timestamptz not null default now(),
  unique (id_estudiante, fecha)
);

create index if not exists ix_eval_estudiante_fecha
  on oltp_resiliencia.evaluacion_clinica (id_estudiante, fecha desc);
create index if not exists ix_habito_estudiante_fecha
  on oltp_resiliencia.registro_habito (id_estudiante, fecha desc);
create index if not exists ix_meta_estudiante
  on oltp_resiliencia.meta_personal (id_estudiante, activa);
create index if not exists ix_red_estudiante_fecha
  on oltp_resiliencia.evaluacion_red_apoyo (id_estudiante, fecha desc);
create index if not exists ix_red_terapeuta_fecha
  on oltp_resiliencia.evaluacion_red_apoyo (id_terapeuta, fecha desc);
create index if not exists ix_sesion_estudiante_inicio
  on oltp_resiliencia.sesion_terapia (id_estudiante, inicio desc);

comment on table oltp_resiliencia.evaluacion_clinica is
  'Mediciones estructuradas; no almacenar narrativas clínicas ni notas libres aquí.';
comment on table oltp_resiliencia.registro_habito is
  'Registro diario por hábito; cada fila representa como máximo un día completado.';
comment on table oltp_resiliencia.evaluacion_red_apoyo is
  'La red activa se mide explícitamente; las interacciones son una variable complementaria.';
