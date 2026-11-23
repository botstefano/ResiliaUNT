# ResiliaUNT Estudiante — Android

Aplicación Android inicial para acceder exclusivamente al portal personal del estudiante de ResiliaUNT.

## Enfoque de esta primera versión

- Proyecto Android nativo ligero con WebView.
- Reutiliza el portal web y el backend existentes; no duplica la lógica de negocio.
- El inicio de sesión sigue siendo el de ResiliaUNT.
- La sesión se conserva mediante las cookies del WebView.
- El destino de la app es /movil/estudiante, una ruta que verifica en el servidor que la cuenta tenga el rol estudiante.
- No incluye claves de Supabase, claves de Groq ni conexión directa a PostgreSQL/SQL Server.
- Requiere conexión a internet; no es una aplicación offline.

Esta elección reduce mantenimiento mientras el portal sigue en Next.js y conserva su autenticación basada en sesión web. Más adelante se puede reemplazar la capa WebView por una interfaz móvil nativa sin cambiar el backend ni el modelo de datos.

## Requisitos

- Android Studio 2024.2.1 o posterior.
- Android SDK Platform 35.
- JDK 17. Android Studio puede administrar el JDK del proyecto.
- Gradle 8.9 se descarga automáticamente mediante el wrapper incluido.

No necesitas instalar Node.js para compilar este proyecto Android.

## Abrir y compilar en Windows

1. Descarga la rama feat/student-android-app del repositorio ResiliaUNT.
2. Descomprime el proyecto.
3. En Android Studio selecciona Open y abre la carpeta apps/android-student (no la raíz del repositorio).
4. Acepta la sincronización de Gradle y, si se solicita, instala Android SDK Platform 35.
5. Para crear el APK, selecciona Build > Build Bundle(s) / APK(s) > Build APK(s).

El APK de depuración se generará en:

app/build/outputs/apk/debug/app-debug.apk

También puedes compilar desde PowerShell, dentro de esta carpeta:

.\gradlew.bat assembleDebug

## Cambiar la dirección del portal

De forma predeterminada la app apunta al servicio Render actual:

https://resiliaunt.onrender.com

Para apuntar a otro dominio HTTPS, compila con una propiedad Gradle:

.\gradlew.bat assembleDebug -PresiliauntPortalUrl=https://tu-dominio.example

No uses HTTP ni coloques secretos en esta propiedad. Solo se configura la dirección pública del portal.

## Importante antes de probar el inicio de sesión

La rama añade la ruta web protegida /movil/estudiante y modifica el login para regresar a esa ruta al autenticarse desde la app. Por tanto, el APK se puede compilar desde esta rama, pero el portal remoto debe tener desplegada esta misma versión de ResiliaUNT para que el acceso móvil funcione.

El servicio Render conectado actualmente a main no incorpora esta ruta hasta que la rama se integre en main o se despliegue temporalmente desde esta rama. La app no altera Supabase ni el DataMart.

## Prueba recomendada

- Probar primero en un emulador Android.
- Iniciar sesión con una cuenta que tenga perfil de estudiante.
- Confirmar que una cuenta de terapeuta no accede al portal móvil.
- Verificar el cierre de sesión y que la app vuelva al login.
- Comprobar que los enlaces externos se abren fuera de la app y que las páginas internas permanecen en el WebView.

La autorización se aplica en el servidor de ResiliaUNT. El WebView es solo la interfaz Android y no constituye una barrera de seguridad por sí mismo.
