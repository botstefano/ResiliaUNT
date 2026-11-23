/*
  RESILIAUNT — permisos mínimos para las rutas API del terapeuta.
  Aplicar después de 003_security_rls.sql.
  Las políticas RLS existentes siguen limitando las filas por terapeuta/estudiante.
*/

grant insert, update on oltp_resiliencia.evaluacion_clinica to authenticated;
grant insert, update on oltp_resiliencia.sesion_terapia to authenticated;

-- No se concede DELETE ni escritura general sobre estudiantes, terapeutas o catálogos.
-- RLS evalúa la asignación del terapeuta y la pertenencia del estudiante en cada fila.
