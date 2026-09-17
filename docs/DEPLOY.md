# Despliegue del Dashboard V4

> **Pregunta que responde este documento:** ¿se puede «desplegar desde GitHub» para probarlo como si
> estuviera publicado? Sí, pero no con GitHub Pages. GitHub no ejecuta Next.js: Pages sólo sirve
> archivos estáticos y este panel vive de sus **rutas BFF** (`/api/...`), que firman contra el API
> legado con RSA, guardan la sesión en una cookie `HttpOnly` y resuelven la moneda por servidor. Nada
> de eso puede correr en el navegador. Lo que GitHub sí hace, y ya está configurado en este
> repositorio, es **construir la imagen de producción y publicarla en GHCR** (el registro de paquetes
> de GitHub): el servidor la descarga con `docker pull` y la levanta como un despliegue real.

| Pieza | Archivo | Qué hace |
| --- | --- | --- |
| Verificación | `.github/workflows/ci.yml` | `npm ci` + `npm run check` (tipos, ESLint y las 44 comprobaciones de la suite) + `npm run build` en cada push y cada PR. Sin secretos. |
| Publicación | `.github/workflows/publish-image.yml` | Construye la imagen y la publica en `ghcr.io/willianruiz-dev/dashboardv4` para `main`, ramas `arena/**` y etiquetas `v*`. `latest` sólo desde la rama por defecto. |
| Imagen | `Dockerfile` | Multietapa con salida `standalone` de Next 16, usuario sin privilegios, healthcheck en `/login`. |
| Ejecución | `docker-compose.yml` | Levanta la imagen publicada con las variables del panel. |

## Opción A (recomendada): imagen publicada en GHCR

En el servidor, con Docker y Docker Compose instalados:

```bash
# 1) Traer la imagen publicada por GitHub Actions (rama principal o una etiqueta concreta)
docker pull ghcr.io/willianruiz-dev/dashboardv4:latest
#    Para probar exactamente lo de una rama: …:arena-01a0b0ab-dashboardv4
#    Para volver atrás sin reconstruir nada: …:sha-<commit>

# 2) Configurar el panel
cat > .env <<'ENV'
DASHBOARD_API_KEY_ID=…
DASHBOARD_RSA_PUBLIC_KEY=…            # PEM multilínea, con \n escapados o el formato _ del legado
SESSION_COOKIE_SECURE=false            # true sólo si sirve el panel por HTTPS
API_BASE_ADDRESS=https://apidashboardv2.e-city.co/
STATIC_FILES_BASE_ADDRESS=https://dashboardv2.e-city.co/
ENV
chmod 600 .env

# 3) Levantar
docker compose pull && docker compose up -d
docker compose logs -f dashboard        # debe decir "Ready"
```

El panel queda en `http://IP-DEL-SERVIDOR:3000` (cambie el puerto con `DASHBOARD_PORT`). Compruebe
`curl -s -o /dev/null -w '%{http_code}\n' http://IP-DEL-SERVIDOR:3000/login` → `200`, e inicie
sesión con un usuario real del API: a partir de ahí el panel se comporta como el desplegado, contra
el API legado de verdad.

- **Actualizar**: `docker compose pull && docker compose up -d` (la imagen nueva ya está publicada por
  Actions; no hace falta construir en el servidor).
- **Requisito de red**: el contenedor debe alcanzar `apidashboardv2.e-city.co` (salida a internet o la
  VPN de la oficina). Si el API está en una red interna, póngalo en `API_BASE_ADDRESS`.
- **Arquitectura**: la imagen se publica para `linux/amd64`. Si el servidor es ARM (por ejemplo un
  Mac con Apple Silicon o un servidor ARM), añada `platform: linux/arm64` al `build` o publique
  multi-arquitectura desde el workflow.

## Opción B: sin Docker (cualquier servidor con Node 20.9+)

```bash
git clone https://github.com/willianruiz-dev/DashboardV4.git
cd DashboardV4
git checkout arena/01a0b0ab-dashboardv4   # o main cuando se integre
npm ci
npm run build

export DASHBOARD_API_KEY_ID=… DASHBOARD_RSA_PUBLIC_KEY=… SESSION_COOKIE_SECURE=false
npm start                                  # levanta en 0.0.0.0:3000
```

Para dejarlo como servicio, use `pm2` (`pm2 start npm --name dashboard-v4 -- start`) o una unidad
`systemd` con esas variables en `Environment=` / `EnvironmentFile=`. No hace falta `git pull` para
volver a una versión anterior: cada commit publicado tiene su etiqueta `sha-…` en GHCR.

## Variables de entorno

| Variable | Obligatoria | Para qué |
| --- | --- | --- |
| `DASHBOARD_API_KEY_ID` | Sí | Identificador de la API key del panel (heredado `REACT_APP_DKEYID`). |
| `DASHBOARD_RSA_PUBLIC_KEY` | Sí | Clave pública RSA (RSA-OAEP/SHA-1) para cifrar la credencial de sesión. |
| `API_BASE_ADDRESS` | No | API del dashboard; por defecto `https://apidashboardv2.e-city.co/`. |
| `STATIC_FILES_BASE_ADDRESS` | No | Origen que sirve las imágenes (`Security.Users.IMG`, logos, `IMG_DENOM`). |
| `SESSION_COOKIE_SECURE` | No | `true` (por defecto en producción) exige HTTPS; use `false` para probar por HTTP. |
| `DASHBOARD_HISTORY_DIAGNOSTICS` | No | Diagnóstico sin valores de cargues/arqueos; apagado en producción. |

**La imagen no contiene credenciales.** Se leen de `process.env` en tiempo de ejecución, así que el
mismo artefacto publicado sirve para servidor de pruebas y producción cambiando sólo el `.env`.
`.dockerignore` excluye `.env*`, `*.pem` y `dashboardv2-frontend/` (su `.env.production` con claves
nunca debe viajar en una capa de imagen).

## Seguridad de la entrega

- **La imagen no lleva credenciales.** `.dockerignore` excluye `.env*`, `*.pem` y
  `dashboardv2-frontend/`, y el `Dockerfile` no recibe variables: es un artefacto publicable sin
  secretos, y por eso puede vivir en un registro público.
- **Pendiente heredado, no introducido aquí:** `dashboardv2-frontend/.env.production` está versionado
  en este repositorio —que es público— con los valores heredados `REACT_APP_DKEYID` y
  `REACT_APP_PUBKEY`. Son los mismos que ya viajan en el bundle del dashboard legado servido
  públicamente, así que no es una exposición nueva; aun así conviene moverlos a variables del entorno
  de compilación y sacarlos del repositorio (o rotarlos) si el API se apoya sólo en ese par para
  identificar al cliente.

## Preguntas frecuentes

**¿Puedo probarlo desde el navegador sin servidor?** No para el panel completo: sin las rutas BFF no
hay sesión ni datos. Para revisiones visuales existe la vista previa en vivo del entorno de trabajo
(`https://3000-<sandbox>.e2b.app`), que sí ejecuta el servidor de verdad.

**¿Y GitHub Pages?** Descartado: sólo sirve estático. Además de las rutas BFF, expondría builds sin
sesión.

**El login responde 500 o «La sesión no está disponible».** Falta o no coincide
`DASHBOARD_API_KEY_ID` / `DASHBOARD_RSA_PUBLIC_KEY`; el panel nunca las registra en texto plano.
Compruebe `docker compose config` (no imprime valores si usa `--quiet`) y que el contenedor alcanza
`API_BASE_ADDRESS`.

**¿Hace falta autenticarse para bajar la imagen?** Hoy no: el paquete es **público**, igual que el
repositorio, así que `docker pull` funciona sin credenciales. Si prefiere restringirlo, cambie la
visibilidad en GitHub → Packages → `dashboardv4` → *Package settings* → *Change visibility*; desde
ese momento el servidor necesita un token de lectura de paquetes
(`echo $TOKEN | docker login ghcr.io -u <usuario> --password-stdin`). Bajar la imagen no exige
ninguna clave de la aplicación: la imagen no las contiene.

**¿Cómo sé que la imagen publicada es la del commit que probé?** Las etiquetas `sha-<commit>` y el
resumen del workflow muestran los tags publicados; en el servidor `docker inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' ghcr.io/willianruiz-dev/dashboardv4:latest`.
