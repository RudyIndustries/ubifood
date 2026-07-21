# UBIFOOD en movil

## Instalar como PWA

La forma mas rapida para una presentacion es desplegar Ubifood en Vercel y abrir
la URL HTTPS desde Chrome en Android. En el menu del navegador elige `Instalar
aplicacion` o `Agregar a pantalla principal`. La app se abre sin la barra del
navegador y conserva el mismo login por roles.

El `service worker` solo guarda iconos y recursos de marca. Las pantallas
privadas, datos de Supabase y respuestas de API siempre se solicitan de nuevo,
para evitar mostrar informacion de otra sesion.

## Crear el APK con Capacitor

Ubifood usa autenticacion SSR, Server Actions y rutas API de Next.js. Por eso el
APK debe apuntar al despliegue HTTPS de Vercel; no se debe exportar como HTML
estatico ni incluir la clave secreta de Supabase.

En PowerShell, desde la carpeta del proyecto:

```powershell
$env:CAPACITOR_SERVER_URL="https://TU-PROYECTO.vercel.app"
npm run cap:sync
npm run cap:open
```

En Android Studio:

1. Espera que termine la sincronizacion de Gradle.
2. Selecciona `Build > Build Bundle(s) / APK(s) > Build APK(s)`.
3. El APK de prueba se genera en `android/app/build/outputs/apk/debug/app-debug.apk`.

Al abrir el mapa por primera vez, Android pedira permiso de ubicacion. Es
necesario para calcular rutas y mostrar el indice UV del area.

Para una version distribuible usa `Build > Generate Signed App Bundle or APK`,
crea o selecciona un `keystore` y guarda sus contrasenas fuera de Git.

Cada vez que cambie configuracion nativa o plugins, vuelve a ejecutar:

```powershell
$env:CAPACITOR_SERVER_URL="https://TU-PROYECTO.vercel.app"
npm run cap:sync
```

## Texto breve para exponer

Ubifood se desarrollo como una aplicacion web progresiva con Next.js y un diseno
adaptable. Esa arquitectura permite usar una sola base de codigo en navegador,
instalarla como PWA y empaquetarla para Android con Capacitor. Tambien permite
integrarla en una super app como un modulo web autenticado o miniaplicacion,
porque las funciones y datos se consumen mediante rutas HTTPS y Supabase, sin
exponer credenciales administrativas en el dispositivo. Esto reduce tiempo y
costo del MVP, mientras mantiene abierta la posibilidad de agregar funciones
nativas mediante plugins de Capacitor.
