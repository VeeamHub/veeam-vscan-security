# Inicio Rápido

Esta guía te lleva paso a paso desde la primera apertura de vScan hasta tu primer escaneo de vulnerabilidades.

---

## Tabla de Contenidos

1. [Paso 1: Crear Contraseña Maestra](#paso-1-crear-contrasena-maestra)
2. [Paso 2: Guardar Clave de Recuperación](#paso-2-guardar-clave-de-recuperacion)
3. [Paso 3: Configurar Desbloqueo Biométrico](#paso-3-configurar-desbloqueo-biometrico-opcional)
4. [Paso 4: Conectar a Veeam Backup & Replication](#paso-4-conectar-a-veeam-backup--replication)
5. [Paso 5: Conectar Servidor Linux (SSH)](#paso-5-conectar-servidor-linux-ssh)
6. [Paso 6: Ejecutar tu Primer Escaneo](#paso-6-ejecutar-tu-primer-escaneo)
7. [Entender los Resultados](#entender-los-resultados)
8. [Siguientes Pasos](#siguientes-pasos)

---

## Paso 1: Crear Contraseña Maestra

La contraseña maestra protege todas las credenciales almacenadas en vScan (VBR, SSH, SMTP). Es lo primero que configurarás al abrir la aplicación.

**Requisitos de la contraseña:**

| Criterio | Detalle |
|---|---|
| Longitud mínima | 12 caracteres |
| Complejidad | Mezcla de mayúsculas, minúsculas, números y caracteres especiales |
| Validación | Se verifica contra una lista de ~600 contraseñas comunes |
| Indicador | Barra de fortaleza en tiempo real (ver niveles abajo) |

**Cómo funciona internamente:**

- La contraseña se hashea con **Argon2id** (resistente a ataques de fuerza bruta y GPU)
- Se genera una clave maestra aleatoria cifrada con **AES-256-GCM**
- La clave maestra se almacena en el Keychain del sistema operativo:
  - macOS: Keychain
  - Windows: Credential Manager
- Todas las credenciales (VBR, SSH, SMTP) se cifran con esta clave maestra

**Pasos:**

1. Ingresa tu contraseña en el campo "Contraseña maestra"
2. Observa el indicador de fortaleza en tiempo real debajo del campo:
   - **Débil** (rojo) — No cumple los requisitos mínimos
   - **Aceptable** (naranja) — Cumple el mínimo pero podría ser más fuerte
   - **Fuerte** (verde) — Buena fortaleza
   - **Muy Fuerte** (verde oscuro) — Excelente fortaleza
3. Confirma la contraseña en el segundo campo
4. Haz clic en **"Crear Contraseña"**

> **Advertencia:** Si pierdes la contraseña maestra y la clave de recuperación, no hay forma de recuperar las credenciales almacenadas. Tendrás que reconfigurar todas las conexiones.

---

## Paso 2: Guardar Clave de Recuperación

Inmediatamente después de crear la contraseña maestra, vScan genera una clave de recuperación única.

**Formato:** `VSCAN-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX`

**Importante:**

- Esta es tu **única oportunidad** de ver y guardar esta clave
- No se puede regenerar ni consultar después
- Es necesaria si olvidas la contraseña maestra
- Guárdala en un lugar seguro (administrador de contraseñas, caja fuerte, impresa)

**Pasos:**

1. La clave se muestra en pantalla después de crear la contraseña
2. Usa el botón **"Copiar"** para copiarla al portapapeles
3. Pégala en un lugar seguro
4. Confirma que la guardaste marcando la casilla de verificación
5. Haz clic en **"Continuar"**

> **Consejo:** Considera guardar la clave de recuperación en dos lugares diferentes para redundancia.

---

## Paso 3: Configurar Desbloqueo Biométrico (Opcional)

Si tu dispositivo tiene hardware biométrico, puedes usarlo como alternativa rápida a escribir la contraseña maestra.

**Métodos soportados:**

| Plataforma | Método |
|---|---|
| macOS | Touch ID, Face ID |
| Windows | Windows Hello (huella, rostro, PIN) |

**Pasos:**

1. Después de guardar la clave de recuperación, se te ofrece activar biometría
2. Confirma tu contraseña maestra para autorizar
3. Registra tu huella digital o rostro según tu dispositivo
4. A partir de ahora, puedes desbloquear vScan con biometría

**Si decides no activarla ahora**, puedes hacerlo después en **Configuración > Seguridad > Desbloqueo Biométrico**.

---

## Paso 4: Conectar a Veeam Backup & Replication

vScan necesita acceso a tu servidor VBR para listar VMs, Jobs de backup y puntos de restauración.

**Datos necesarios:**

| Campo | Ejemplo | Notas |
|---|---|---|
| Servidor | `192.168.1.100` o `vbr.empresa.com` | IP o hostname |
| Puerto | `9419` | Puerto por defecto de la REST API |
| Usuario | `DOMINIO\admin` o `admin@dominio` | Con permisos de lectura |
| Contraseña | `••••••••` | Se cifra antes de almacenar |

**Pasos:**

1. Ve a **Configuración** (icono de engranaje en la barra lateral)
2. En la sección **VBR**, haz clic en **"Configurar Conexión"**
3. Ingresa la dirección del servidor y el puerto
4. Ingresa las credenciales
5. **Certificados auto-firmados:** Si tu servidor VBR usa un certificado auto-firmado, activa la opción "Aceptar certificados no confiables"
6. Haz clic en **"Conectar"**
7. vScan validará la conexión y mostrará:
   - Versión de VBR
   - Tipo de licencia
   - Base de datos
   - Cantidad de instancias protegidas

**Solucionar problemas de conexión:**

- Verifica que el puerto 9419 esté abierto en el firewall
- Confirma que la REST API de VBR está activa
- Si usas dominio, prueba ambos formatos: `DOMINIO\user` y `user@dominio`
- Prueba acceder a `https://servidor:9419/swagger/ui/index.html` desde un navegador

---

## Paso 5: Conectar Servidor Linux (SSH)

El servidor Linux es donde se montan los discos y se ejecutan los Scanners.

### Opción A: Servidor Administrado por VBR

Si VBR ya tiene servidores Linux administrados, puedes seleccionar uno directamente:

1. En la sección **SSH** de Configuración, haz clic en **"Agregar Conexión"**
2. Selecciona **"Desde VBR"**
3. Elige un servidor de la lista de servidores administrados
4. Las credenciales se importan automáticamente de VBR
5. Haz clic en **"Conectar"**

### Opción B: Servidor Manual

1. En la sección **SSH**, haz clic en **"Agregar Conexión"**
2. Selecciona **"Manual"**
3. Ingresa los datos:

| Campo | Ejemplo |
|---|---|
| Host | `192.168.1.50` |
| Puerto | `22` |
| Usuario | `root` o usuario con sudo |
| Autenticación | Contraseña o clave SSH privada |

4. **Trust On First Use (TOFU):** La primera vez que conectes, vScan te mostrará el fingerprint SSH del servidor. Verifícalo y acepta para confiar en el servidor.
5. Haz clic en **"Conectar"**

### Verificación Automática

Al conectar, vScan automáticamente:

- Detecta el sistema operativo del servidor
- Verifica requisitos (FUSE, NTFS-3G)
- Detecta Scanners instalados (Trivy, Grype, Jadi) y sus versiones
- Muestra el estado de cada componente con indicadores de color

---

## Paso 6: Ejecutar tu Primer Escaneo

Con VBR y SSH conectados, puedes ejecutar tu primer escaneo individual.

### 6.1 Seleccionar VM

1. Ve a **Escaneos** en la barra lateral
2. Haz clic en **"Nuevo Escaneo"**
3. En el wizard, selecciona el servidor VBR
4. Explora los Jobs de backup y selecciona la VM que quieres escanear
5. Haz clic en **"Siguiente"**

### 6.2 Seleccionar Punto de Restauración

1. Se muestran los puntos de restauración disponibles para la VM
2. Cada punto muestra: fecha, tipo (Full/Incremental) y tamaño
3. Selecciona el punto que quieres analizar
4. Haz clic en **"Siguiente"**

### 6.3 Seleccionar Discos

1. Se muestran los discos disponibles del punto de restauración
2. Selecciona uno o más discos para montar y escanear
3. Los discos muestran: nombre, tamaño y tipo de sistema de archivos
4. Haz clic en **"Siguiente"**

### 6.4 Agregar a la Cola

1. La VM se agrega a la cola de escaneo
2. Puedes agregar más VMs si lo deseas antes de iniciar
3. Haz clic en **"Iniciar Escaneo"**

### 6.5 Proceso de Montaje y Escaneo

El proceso se ejecuta automáticamente:

1. **Montaje** — Se monta el disco en el servidor Linux vía la API de Integración de Datos de Veeam
2. **Escaneo** — El scanner analiza el contenido del disco montado
3. **Desmontaje** — Se desmonta el disco al terminar
4. **Procesamiento** — Se procesan y almacenan los resultados

Puedes observar el progreso en tiempo real con:
- Barra de progreso con porcentaje y ETA estimado
- Log de eventos en la parte inferior
- Botones de control: **Skip VM** (saltar VM actual), **Stop** (detener todo)

### 6.6 Ver Resultados

Al completarse el escaneo:

- Se muestra un resumen con el conteo de vulnerabilidades por severidad:
  - **CRITICAL** (rojo) — Vulnerabilidades críticas que requieren atención inmediata
  - **HIGH** (naranja) — Vulnerabilidades de alto riesgo
  - **MEDIUM** (amarillo) — Riesgo medio
  - **LOW** (azul) — Riesgo bajo
  - **NEGLIGIBLE** (gris) — Riesgo mínimo
- Accede al detalle completo en **Vulnerabilidades** en la barra lateral

---

## Entender los Resultados

Después de completar un escaneo, verás los siguientes datos:

### Resumen por Severidad

| Severidad | Descripción |
|---|---|
| **CRITICAL** | Vulnerabilidades explotables con impacto severo; parchear de inmediato |
| **HIGH** | Vulnerabilidades serias que deben atenderse con urgencia |
| **MEDIUM** | Riesgo moderado; planificar remediación en próximas ventanas de mantenimiento |
| **LOW** | Riesgo menor; abordar como parte del parcheo rutinario |
| **NEGLIGIBLE** | Riesgo mínimo; informativo |
| **UNKNOWN** | Severidad aún no clasificada por el proveedor |

### Detalle de Vulnerabilidades

Cada entrada de vulnerabilidad muestra:

- **CVE ID** — Identificador de Common Vulnerabilities and Exposures
- **Paquete** — El paquete de software afectado y su versión
- **Versión Instalada** — Versión actualmente instalada
- **Versión Corregida** — Versión que resuelve la vulnerabilidad (si está disponible)
- **Severidad** — CRITICAL, HIGH, MEDIUM, LOW, NEGLIGIBLE o UNKNOWN
- **KEV** — Indicador si el CVE está en el catálogo CISA Known Exploited Vulnerabilities
- **Estado** — open, fixed, wont_fix, accepted o false_positive

---

## Siguientes Pasos

Ahora que completaste tu primer escaneo, explora estas funcionalidades:

| Qué hacer | Descripción | Referencia |
|---|---|---|
| **Escaneo por Lotes** | Escanear múltiples VMs a la vez | [Guía de Usuario - Batch](GUIA-USUARIO.md#3-escaneo-por-lotes-batch) |
| **Escaneos Programados** | Automatizar escaneos recurrentes | [Guía de Usuario - Programados](GUIA-USUARIO.md#4-escaneos-programados) |
| **Navegador de Vulnerabilidades** | Buscar y filtrar hallazgos | [Guía de Usuario - Navegador](GUIA-USUARIO.md#5-navegador-de-vulnerabilidades) |
| **Reportes** | Exportar reportes CSV/PDF con branding | [Guía de Usuario - Reportes](GUIA-USUARIO.md#6-exportacion-y-reportes) |
| **Dashboard** | Ver gráficos y tendencias | [Guía de Usuario - Dashboard](GUIA-USUARIO.md#1-panel-principal-dashboard) |
| **Comparación de Escaneos** | Comparar resultados entre fechas | [Guía de Usuario - Comparación](GUIA-USUARIO.md#10-comparacion-de-escaneos) |
