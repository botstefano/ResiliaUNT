# Guía de instalación: Supabase + Render

Esta guía describe la configuración inicial. No contiene credenciales ni reemplaza la revisión institucional previa al uso con personas reales.

## 1. Preparar Supabase

1. Crea un proyecto Supabase dedicado a ResiliaUNT.
2. Abre **SQL Editor** y ejecuta los scripts, en este orden:
   - `database/supabase/001_oltp.sql`
   - `database/supabase/002_datamart.sql`
   - `database/supabase/003_security_rls.sql`
   - `database/supabase/007_permisos_escritura_api.sql`
   - `database/supabase/008_meta_transaccional.sql`
   - `database/supabase/004_etl.sql`
   - `database/supabase/005_seed_demo.sql` solo si se trata de un entorno de demostración.
3. Ejecuta `database/supabase/006_validaciones_kpi.sql` después del ETL para revisar conteos, fechas, relaciones y KPI.
4. En **Project Settings → API → Exposed schemas**, agrega `oltp_resiliencia` y `datamart_resiliencia` junto con `public`. No agregues otros esquemas sin revisar sus permisos.
5. En **Authentication → URL Configuration**, configura el dominio del proyecto y el dominio de la app. En producción usa exclusivamente HTTPS.
6. Mantén el registro público cerrado. Crea o invita usuarios mediante el procedimiento institucional aprobado; el trigger asigna inicialmente el rol `pendiente`.

## 2. Asignar perfiles

El identificador de Supabase Auth debe vincularse a un estudiante o terapeuta existente. Ejecuta estas operaciones desde SQL Editor con privilegios administrativos, reemplazando los valores en el proyecto real y nunca copiando los UUID reales al repositorio:

```sql
-- Ejemplo para habilitar a un estudiante:
update public.perfiles_app
set rol = 'estudiante', id_estudiante = 123, id_terapeuta = null
where id = 'UUID_AUTH_DEL_USUARIO';

-- Ejemplo para habilitar a un profesional:
update public.perfiles_app
set rol = 'terapeuta', id_terapeuta = 10, id_estudiante = null
where id = 'UUID_AUTH_DEL_USUARIO';

-- Ejemplo para asignar estudiantes a un profesional:
insert into oltp_resiliencia.terapeuta_estudiante
  (id_terapeuta, id_estudiante, fecha_inicio, activo)
values (10, 123, current_date, true)
on conflict (id_terapeuta, id_estudiante)
do update set activo = true, fecha_fin = null;
```

El usuario administrador del sistema se configura con `rol = 'administrador'` y ambos identificadores de entidad en `null`. No habilites administración desde un formulario público.

## 3. Ejecutar localmente

Requisitos: Node.js 20.11 o superior (menor que 23) y npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Configura `.env.local` con:

- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: clave anon/publishable, apta para navegador porque RLS limita el acceso.
- `SUPABASE_SERVICE_ROLE_KEY`: clave privilegiada, exclusivamente del servidor. Nunca anteponer `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_APP_URL`: URL local o pública de la aplicación.

## 4. Desplegar en Render

1. Conecta el repositorio `botstefano/ResiliaUNT` como un servicio **Web Service**.
2. Selecciona runtime Node.
3. Build command: `npm install && npm run build`.
4. Start command: `npm start`.
5. Configura las variables de entorno anteriores desde el panel de Render; no las escribas en el repositorio.
6. Añade el dominio Render en la configuración URL de Supabase Auth y valida el inicio/cierre de sesión.
7. Prueba los perfiles `estudiante`, `terapeuta` y `administrador` por separado.

## 5. Módulos disponibles en esta base

- Login con Supabase Auth y perfiles pendientes por defecto.
- Dashboard con los cuatro KPI y tendencia mensual.
- Portal estudiante: registro de hábitos, metas y consulta de sesiones propias.
- Portal terapeuta: cartera asignada, registro de evaluación clínica, valoración de red de apoyo trazable al profesional y programación de sesiones.
- ETL OLTP → DataMart, refresco tras registros y script de validación.

## 6. Antes de producción

- Cambia el repositorio a privado si va a contener documentación interna o configuración no pública. No subas datos reales ni claves en ningún caso.
- El alcance, la versión del instrumento CD-RISC, las definiciones operativas y la forma de calcular cada KPI deben aprobarse con el responsable profesional e institucional.
- Define consentimiento, base legal, minimización, acceso, retención, rectificación y eliminación de datos, además del protocolo de incidentes.
- Revisa la seguridad/RLS y realiza pruebas con cuentas distintas y datos sintéticos antes de cargar registros reales.
- Los indicadores son descriptivos; no diagnostican ni recomiendan tratamientos. Los módulos de IA quedan fuera de esta primera fase.

## Validación que sigue pendiente

El repositorio se ha revisado estáticamente y se ejecutó una prueba directa de la lógica de agregación de KPI. En este entorno no fue posible instalar dependencias de npm ni ejecutar PostgreSQL; por tanto aún no se declara aprobado `npm run build` ni se afirma que los scripts SQL se hayan ejecutado en un proyecto Supabase real.
