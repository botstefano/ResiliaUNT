/*
  RESILIAUNT — índices de soporte para claves foráneas.
  Reduce el coste de joins y de operaciones referenciales sobre OLTP y DataMart.
*/
create index if not exists ix_fact_eval_terapeuta
  on datamart_resiliencia.fact_evaluacion_clinica(terapeuta_key);
create index if not exists ix_fact_eval_sala
  on datamart_resiliencia.fact_evaluacion_clinica(sala_key);

create index if not exists ix_fact_red_estudiante
  on datamart_resiliencia.fact_red_apoyo(estudiante_key);
create index if not exists ix_fact_red_terapeuta
  on datamart_resiliencia.fact_red_apoyo(terapeuta_key);
create index if not exists ix_fact_red_dimension
  on datamart_resiliencia.fact_red_apoyo(red_key);

create index if not exists ix_fact_habito_estudiante
  on datamart_resiliencia.fact_registro_habitos(estudiante_key);
create index if not exists ix_fact_habito_dimension
  on datamart_resiliencia.fact_registro_habitos(habito_key);
create index if not exists ix_fact_habito_intensidad
  on datamart_resiliencia.fact_registro_habitos(intensidad_key);

create index if not exists ix_fact_meta_estudiante
  on datamart_resiliencia.fact_seguimiento_meta(estudiante_key);
create index if not exists ix_fact_meta_dimension
  on datamart_resiliencia.fact_seguimiento_meta(meta_key);

create index if not exists ix_eval_clinica_terapeuta
  on oltp_resiliencia.evaluacion_clinica(id_terapeuta);
create index if not exists ix_eval_clinica_sala
  on oltp_resiliencia.evaluacion_clinica(id_sala);
create index if not exists ix_registro_habito_dimension
  on oltp_resiliencia.registro_habito(id_habito);
create index if not exists ix_sesion_terapeuta
  on oltp_resiliencia.sesion_terapia(id_terapeuta);
create index if not exists ix_sesion_sala
  on oltp_resiliencia.sesion_terapia(id_sala);
create index if not exists ix_asignacion_estudiante
  on oltp_resiliencia.terapeuta_estudiante(id_estudiante);
