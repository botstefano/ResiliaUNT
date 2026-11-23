# ResiliaUNT Estudiante — Android

Aplicación Android complementaria para el portal personal de estudiantes de ResiliaUNT.

## Qué hace esta versión

- Abre la entrada móvil exclusiva para estudiantes: \`/movil\`.
- Muestra la interfaz de demostración con una lista de perfiles sintéticos de estudiantes.
- No ofrece selector ni acceso de terapeuta.
- Permite buscar por nombre o código sintético.
- Al seleccionar un estudiante, el servidor valida que el registro exista, esté activo y tenga código \`DEMO-*\`; luego crea una sesión sintética firmada.
- Usa el OLTP actual de Supabase a través de las rutas API del backend de ResiliaUNT.
- Incluye accesos al portal personal, hábitos, metas, sesiones y Brújula.
- No guarda credenciales ni claves de Supabase dentro del APK.

La aplicación utiliza una WebView Android ligera para reutilizar la autenticación, las rutas API y los controles de autorización ya implementados en ResiliaUNT. Requiere conexión a internet.

## Importante sobre Supabase

El APK no se conecta directamente a PostgreSQL ni contiene la clave \`service_role\`. La comunicación sigue este recorrido:

\`APK → WebView HTTPS → Backend ResiliaUNT en Render → Supabase\`

El backend consulta Supabase usando sus variables privadas y comprueba el perfil antes de entregar información. La cookie de demostración es HTTP-only, firmada en el servidor y temporal (4 horas).

Los perfiles que aparecen en el selector son los estudiantes sintéticos ya existentes en \`oltp_resiliencia.estudiante\`. No crea usuarios de Supabase Auth y no modifica el OLTP ni el DataMart.

## Requisitos

- Android Studio 2024.2.1 o posterior.
- Android SDK Platform 35.
- JDK 17. Android Studio puede usar su JDK integrado.
- Gradle 8.9 se descarga automáticamente mediante el wrapper incluido.

No necesitas instalar Node.js para compilar el proyecto Android.

## Descargar la rama y abrir el proyecto

1. Descarga el ZIP de la rama \`feat/student-android-app\` del repositorio ResiliaUNT.
2. Descomprime el ZIP.
3. En Android Studio selecciona **Open**.
4. Abre directamente la carpeta \`apps/android-student\`.
5. Espera a que termine la sincronización de Gradle. Si se solicita, instala Android SDK Platform 35.

No abras la raíz del repositorio: el proyecto Android está dentro de esa carpeta.

## Generar el APK

Desde Android Studio:

**Build → Build Bundle(s) / APK(s) → Build APK(s)**

O desde PowerShell, dentro de \`apps/android-student\`:

\`\`\`powershell
.\gradlew.bat assembleDebug
\`\`\`

El APK de depuración se genera en:

\`app/build/outputs/apk/debug/app-debug.apk\`

## Dirección del backend

La app apunta por defecto a:

\`https://resiliaunt.onrender.com\`

Puedes cambiar el dominio HTTPS al compilar:

\`\`\`powershell
.\gradlew.bat assembleDebug -PresiliauntPortalUrl=https://tu-dominio.example
\`\`\`

No uses HTTP ni agregues claves o secretos a esta propiedad.

## Despliegue web necesario para que Supabase responda

La rama contiene tanto el proyecto Android como las rutas web nuevas para el selector móvil. El servicio de Render actual sigue desplegando \`main\`; por tanto, el APK compilará localmente, pero el flujo móvil con perfiles sintéticos y Supabase no estará disponible hasta que el backend desplegado incluya estos cambios.

No se ha fusionado esta rama ni se ha cambiado el despliegue de Render. Antes de probar el APK conectado, integra/despliega esta rama en un entorno web de pruebas o en el servicio correspondiente.

## Pruebas sugeridas

- Abrir la app y comprobar que aparece la lista solo de estudiantes.
- Buscar por nombre y código.
- Ingresar con un perfil y verificar su portal personal.
- Comprobar que cambiar de perfil vuelve al selector móvil, no al selector web de terapeutas.
- Cerrar sesión y confirmar que se eliminan la cookie demo y el marcador móvil.
- Verificar que no se puede abrir el portal de terapeuta con una sesión de estudiante.
- Confirmar que la información proviene del backend y que el APK no contiene secretos.
