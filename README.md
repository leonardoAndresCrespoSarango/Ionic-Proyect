# Mobile (Ionic + Angular)

Documentacion base para el proyecto Ionic/Angular ubicado en `mobile`. Este README resume la configuracion, comandos claves y flujos habituales para construir, sincronizar y documentar la aplicacion hibrida con Capacitor.

## Requisitos previos

- Node.js 18.19+ (recomendado LTS 20) y npm 10+ o pnpm 9+.
- Ionic CLI `npm install -g @ionic/cli` (version 7 o mas reciente).
- Capacitor CLI incluida via Ionic (se usa como `ionic capacitor ...` o `npx cap ...`).
- Android Studio con SDK 34+, Java 17 y variables de entorno configuradas (`ANDROID_HOME`, `JAVA_HOME`, `GRADLE_HOME` si aplica).
- Xcode 15+ (solo si se compila para iOS).
- Git y un emulador o dispositivo fisico para pruebas.

## Instalacion de dependencias

```bash
# Opcion recomendada con pnpm
pnpm install

# Alternativa con npm
npm install
```

El proyecto adopta `pnpm` como gestor por defecto para reforzar la seguridad en la resolucion de librerias: `pnpm-lock.yaml` fija versiones exactas y `pnpm-workspace.yaml` establece `minimumReleaseAge: 1440`, lo que obliga a que los paquetes tengan al menos 24 horas de publicacion antes de ser instalados. Esta medida reduce la superficie frente a publicaciones maliciosas o regresiones de ultimo minuto.

Se generan artefactos en `node_modules/` y se respetan las versiones fijadas por `pnpm-lock.yaml`.

## Desarrollo local

- `ionic serve` inicia el servidor de desarrollo (equivalente a `ng serve`) con live reload.
- `npm start` usa el mismo comando subyacente porque en `package.json` el script `start` llama a `ng serve`.

Si necesitas apuntar a un backend especifico, configura los valores en los servicios correspondientes dentro de `src/app/`.

## Construir la aplicacion web

```bash
ionic build
```

- El resultado se deposita en `www/`, directorio que Capacitor utiliza al sincronizar plataformas nativas.
- Usa `--configuration development` para builds rapidos locales. Las variantes disponibles estan definidas en `angular.json` bajo `architect.build.configurations`.

## Sincronizar con plataformas nativas

Siempre ejecuta un build previo para asegurar que `www/` este actualizado.

```bash
ionic build
ionic capacitor sync android
# Para iOS (solo en macOS)
ionic capacitor sync ios
```

- `ionic capacitor sync` copia los assets web, actualiza dependencias y aplica los cambios en los proyectos nativos ubicados en `android/` e `ios/`.
- Si es la primera vez, agrega la plataforma con `ionic capacitor add android` (o `ios`).
- Para abrir el proyecto Android en Android Studio: `ionic capacitor open android`.
- Alternativa sin el CLI global: `npx cap sync android`.

## Autenticacion avanzada

### TOTP (Time-Based One-Time Password)

- Implementado con componentes dedicados `src/app/components/totp-setup` y `src/app/components/totp-verification`, que guian al usuario en la activacion, verificacion y eventual deshabilitacion del segundo factor.
- `AuthService` orquesta los flujos contra el backend exponiendo metodos como `setupTotp`, `verifyTotp`, `disableTotp` y `loginWithTotp`, manejando la bandera `totpRequired` y el `tempSessionId` devuelto tras un login de primer factor.
- Durante el login, `LoginComponent` detecta cuando el backend exige el segundo factor y abre el componente de verificacion TOTP, garantizando que el token JWT solo se almacene cuando el codigo temporal es aceptado.
- La informacion operativa y escenarios de prueba se documentan en `FRONTEND_QUICK_START.md` y `TOTP_FRONTEND_IMPLEMENTATION.md`, que detallan flujos, endpoints y contratos utilizados.

### Biometria con Capacitor

- Se integra el plugin `capacitor-native-biometric` tanto en Android (`android/capacitor.settings.gradle`) como en iOS (`ios/App/Podfile`) para ofrecer autenticacion y almacenamiento seguro de credenciales.
- `BiometricService` encapsula las llamadas a la API nativa, verificando disponibilidad del dispositivo, almacenamiento de credenciales y recuperacion segura al iniciar sesion.
- `LoginComponent` invoca al servicio para ofrecer inicio rapido: si el backend marca `biometricEnabled` y existen credenciales guardadas, se consulta el backend mediante `AuthService.loginWithBiometric` e inmediatamente, de ser necesario, se solicita el codigo TOTP como segundo factor.
- Los usuarios pueden habilitar o deshabilitar la biometria desde la propia pantalla de login, que persiste la preferencia en el backend y en el almacen seguro del dispositivo.

## Documentacion tecnica con Compodoc

El proyecto define `tsconfig.doc.json` para controlar las fuentes incluidas en la documentacion. Desde la raiz:

```bash
# Generar documentacion estandar
npx compodoc -p tsconfig.doc.json

# Servir con live reload en http://localhost:8080
npx compodoc -p tsconfig.doc.json -s -w
```

- El directorio de salida por defecto es `documentation/` (personalizable con `--output`).
- Para reconstruir en limpio, elimina el contenido previo o ejecuta `npx compodoc -p tsconfig.doc.json --clean`.
- Tambien puedes usar el builder de Angular CLI: `ng run app:compodoc` y `ng run app:compodoc:serve`.

## Pruebas y calidad

- `npm run test` ejecuta el runner Karma con Jasmine (`angular.json` lo describe bajo `architect.test`).
- `npm run lint` valida las reglas definidas en `.eslintrc.json` usando `@angular-eslint`.
- Configura pipelines de CI usando estas mismas tareas para mantener calidad continua.

## Estructura relevante

```
src/                Codigo fuente Angular e Ionic (standalone components).
android/            Proyecto nativo Android generado por Capacitor.
ios/                Proyecto nativo iOS generado por Capacitor.
www/                Salida de builds web; se genera con `ionic build`.
documentation/      Artefactos generados por Compodoc.
capacitor.config.ts Configuracion central de Capacitor (appId, appName, plugins, etc.).
ionic.config.json   Metadatos del proyecto Ionic y activacion de integraciones.
```

## Buenas practicas

- Actualiza con frecuencia los plugins de Capacitor y revisa el `CHANGELOG` de Ionic antes de subir mayor version.
- Versiona los cambios en `android/` e `ios/` solo cuando tengas ajustes nativos relevantes; de lo contrario confia en `ionic capacitor sync`.
- Mantener sincronizados `environment.ts` y `environment.prod.ts` al preparar builds para QA o produccion.
- Documentar nuevos modulos y servicios integrandolos a Compodoc para preservar la navegabilidad de la documentacion generada.

## Recursos
- Biometria con Capacitor: https://medium.com/@vishaldarekar/implementing-biometric-authentication-in-an-ionic-capacitor-app-6dcd465b2d80
- Documentacion oficial Ionic: https://ionicframework.com/docs
- Documentacion Capacitor: https://capacitorjs.com/docs/v7
- Guia Compodoc: https://compodoc.app
- Angular CLI: https://angular.dev/tools/cli
