# Guía de Usuario

Manual completo de todas las funcionalidades de vScan v2.0.0.

---

## 1. Panel Principal (Dashboard)

El dashboard es la pantalla inicial y muestra un resumen del estado de seguridad.

### Tarjetas de Estadísticas

| Tarjeta | Descripción |
|---|---|
| Total de Vulnerabilidades | Conteo total de CVEs abiertos |
| Críticas | Vulnerabilidades con severidad CRITICAL |
| Altas | Severidad HIGH |
| Medias | Severidad MEDIUM |
| Bajas | Severidad LOW |
| KEV | Vulnerabilidades en el catálogo CISA KEV (explotadas activamente) |
| Servidores | Cantidad de servidores escaneados |
| Último Escaneo | Fecha y hora del escaneo más reciente |

### Gráficos

- **Tendencia temporal** — Gráfico de línea que muestra la evolución de vulnerabilidades a lo largo del tiempo
- **Distribución de severidad** — Gráfico circular/barras con el desglose por nivel de severidad
- **Servidores más vulnerables** — Top servidores ordenados por cantidad de vulnerabilidades críticas + altas

---

## 2. Escaneo Individual

Flujo completo para escanear una VM específica.

### Wizard de Escaneo

El wizard guía el proceso en pasos secuenciales:

**Paso 1 — Seleccionar Servidor:** Elige el servidor VBR conectado.

**Paso 2 — Seleccionar VM:** Navega por jobs de backup y selecciona la VM. Soporta búsqueda por nombre.

**Paso 3 — Punto de Restauración:** Lista los restore points disponibles con fecha, tipo (Full/Incremental) y tamaño.

**Paso 4 — Discos:** Selecciona uno o más discos del punto de restauración. Muestra nombre, tamaño y filesystem.

**Paso 5 — Cola de Escaneo:** La VM se agrega a la cola. Puedes agregar más VMs antes de iniciar.

### Controles de Ejecución

| Botón | Acción |
|---|---|
| **Iniciar** | Comienza el proceso de montaje + escaneo |
| **Skip VM** | Salta la VM actual y pasa a la siguiente en cola |
| **Stop** | Detiene todo el proceso (desmonta discos activos) |

### Progreso en Tiempo Real

- Barra de progreso con porcentaje
- ETA estimado de finalización
- Log de eventos (montaje, escaneo, desmontaje)
- Conteo parcial de vulnerabilidades encontradas

### Historial Reciente

Debajo del wizard se muestra el historial de escaneos recientes con:
- Nombre de VM, fecha, scanner usado, conteo de vulnerabilidades
- Paginación para navegar por escaneos anteriores
- Clic para ver los resultados detallados

---

## 3. Escaneo por Lotes (Batch)

Permite escanear múltiples VMs en una sola ejecución.

### Crear un Batch

1. Ve a **Batch** en la barra lateral
2. Haz clic en **"Nuevo Batch"**
3. **Wizard de selección:**
   - Selecciona múltiples VMs de los jobs de backup
   - O selecciona un job completo para incluir todas sus VMs
4. Configura las opciones:

| Opción | Descripción | Valores |
|---|---|---|
| Scanner | Scanner a usar | Trivy, Grype, Jadi |
| Modo de ejecución | Secuencial o paralelo | Configurable |
| Timeout por item | Tiempo máximo por VM | 5-120 minutos |
| Reintentos | Intentos si falla | 0-3 |
| Notificaciones | Alertar al completar | Email, escritorio |

5. Haz clic en **"Ejecutar"**

### Monitoreo en Tiempo Real

- Lista de items con estado individual (pendiente, en progreso, completado, error)
- Progreso general del batch (X de Y completados)
- Log de eventos por item
- Botón **"Cancelar"** para detener el batch completo

### Historial de Batches

- Tabla con todos los batches ejecutados
- Estado: completado, parcial (algunos items fallaron), cancelado, error
- Clic para ver detalle de cada item y sus resultados

---

## 4. Escaneos Programados

Automatiza escaneos con programación recurrente.

### Crear un Schedule

1. Ve a **Programados** en la barra lateral
2. Haz clic en **"Nuevo Schedule"**
3. Configura:

| Campo | Opciones |
|---|---|
| Nombre | Nombre descriptivo del schedule |
| Frecuencia | Diario, Semanal, Mensual |
| Día/Hora | Según la frecuencia elegida |
| Targets | VMs o jobs de backup a escanear |
| Scanner | Trivy, Grype o Jadi |
| Notificaciones | Configurar alertas de ejecución |

4. Haz clic en **"Guardar"**

### Formato Cron

```
Minuto  Hora  DiaMes  Mes  DiaSemana
  *       *      *      *      *
```

| Expresión | Significado |
|---|---|
| `0 2 * * *` | Diario a las 2:00 AM |
| `0 3 * * 1` | Cada lunes a las 3:00 AM |
| `0 0 1 * *` | Primer día de cada mes a medianoche |
| `0 6 * * 1-5` | Días hábiles a las 6:00 AM |

### Gestión de Schedules

- **Activar/Desactivar** — Toggle para pausar sin eliminar
- **Editar** — Modificar configuración
- **Eliminar** — Remover permanentemente
- **Ejecutar Ahora** — Forzar ejecución inmediata sin esperar al próximo horario

### Ejecuciones Perdidas (Caught Up)

Si vScan no estaba abierto cuando correspondía una ejecución, al iniciar muestra un badge **"Caught Up"** y ofrece ejecutar las ejecuciones perdidas.

### Historial de Ejecuciones

Cada schedule muestra su historial con: fecha de ejecución, estado, duración y vulnerabilidades encontradas.

---

## 5. Navegador de Vulnerabilidades

Interfaz central para explorar y gestionar todas las vulnerabilidades detectadas.

### Filtros Disponibles

| Filtro | Descripción |
|---|---|
| Búsqueda | Buscar por CVE ID, nombre de paquete o descripción |
| Severidad | CRITICAL, HIGH, MEDIUM, LOW, NEGLIGIBLE, UNKNOWN |
| Servidor/VM | Filtrar por máquina virtual |
| Paquete | Filtrar por nombre de paquete o biblioteca |
| Rango de fechas | Primera detección o última vez visto |
| Scanner | Trivy, Grype o Jadi |
| Estado | Abierta, Corregida, No Corregir, Aceptada, Falso Positivo |
| KEV | Solo vulnerabilidades en catálogo CISA KEV |

### Tabla de Vulnerabilidades

La tabla principal muestra vulnerabilidades agrupadas por CVE:

- **CVE ID** — Identificador único (ej: CVE-2024-1234)
- **Severidad** — Badge de color (CRITICAL rojo, HIGH naranja, etc.)
- **Paquete** — Nombre del paquete afectado
- **Versión instalada** — Versión detectada
- **Versión corregida** — Versión donde se corrigió (si existe)
- **Servidores afectados** — Cantidad de VMs donde se detectó
- **Badge KEV** — Indicador si está en catálogo CISA
- **Badge "Auto"** — Indica si el estado fue asignado automáticamente
- **Estado** — Estado actual del ciclo de vida

### Detalle Expandido

Haz clic en una fila para expandir el detalle:

- Puntuación CVSS (si disponible)
- Descripción completa de la vulnerabilidad
- Referencias y links (NVD, advisory del fabricante)
- Versión corregida y recomendación
- Historial de detecciones (primera vez, última vez, escaneos donde apareció)
- Servidores afectados con versión específica de cada uno

### Gestión de Estado

Cada vulnerabilidad tiene un ciclo de vida:

| Estado | Significado | Acción |
|---|---|---|
| **Abierta** | Detectada y pendiente de remediación | Estado por defecto |
| **Corregida** | Ya no se detecta en escaneos recientes | Automático o manual |
| **No Corregir** | Riesgo aceptado, no se remediará | Manual |
| **Aceptada** | Reconocida y aceptada por el equipo | Manual |
| **Falso Positivo** | El scanner la reportó incorrectamente | Manual |

### Operaciones Masivas

1. Selecciona múltiples vulnerabilidades con los checkboxes
2. Usa la barra de acciones masivas para:
   - Cambiar estado a "No Corregir", "Aceptada" o "Falso Positivo"
   - Agregar notas en lote
   - Filtrar selección

---

## 6. Exportación y Reportes

### Exportar a CSV

- Haz clic en **"Exportar CSV"** en el navegador de vulnerabilidades
- Los filtros activos se aplican a la exportación
- **Límite:** 50,000 filas por archivo
- **Columnas incluidas:** CVE, severidad, paquete, versión, versión corregida, servidor, estado, primera detección, última vez visto, KEV, CVSS

### Reporte PDF Ejecutivo

Reporte de alto nivel para gerencia y auditoría:

- **Portada** con logo, título, fecha, preparado por/para
- **Resumen ejecutivo** con métricas clave
- **Risk Score** general
- **Distribución de severidad** (gráfico)
- **Top vulnerabilidades críticas**
- **Vulnerabilidades KEV** (explotadas activamente)
- **Recomendaciones** priorizadas
- **Branding personalizable**

### Reporte PDF Técnico

Reporte detallado para equipos técnicos:

- Tabla completa en formato landscape
- Todas las vulnerabilidades con detalle técnico
- Agrupado por servidor o por severidad
- Incluye versiones, paquetes y referencias

### Configurar Branding

Ve a **Configuración > Aplicación > Branding de Reportes**:

| Campo | Descripción |
|---|---|
| Nombre de empresa | Aparece en portada y encabezado |
| Logo | PNG o JPG, máximo 2 MB |
| Título del reporte | Personaliza el título (por defecto: "Vulnerability Report") |
| Preparado por | Nombre del analista o equipo |
| Preparado para | Destinatario del reporte |
| Clasificación | Confidencial, Interno, Público, etc. |
| Color principal | Color de acentos en el PDF |
| Notas adicionales | Texto libre en el pie del reporte |

---

## 7. Configuración

### 7.1 Conexiones

**Tarjeta VBR:**
- Estado de conexión (conectado/desconectado)
- Versión de VBR detectada
- Tipo de licencia
- Base de datos
- Instancias protegidas
- Botón para reconectar o cambiar credenciales

**Tarjeta Linux (SSH):**
- Estado de conexión (con reconexión automática si se pierde)
- Sistema operativo detectado
- Requisitos verificados (FUSE, NTFS-3G, ZFS)
- Scanners detectados con versiones
- Paquetes instalados por vScan
- Botón para gestionar conexiones

**Gestión de Scanners desde la UI:**

vScan permite instalar, actualizar y desinstalar scanners directamente desde la interfaz, sin necesidad de acceder manualmente al servidor Linux:

| Acción | Scanners | Descripción |
|---|---|---|
| Instalar | Trivy, Grype, Jadi | Descarga e instala con verificación SHA-256 |
| Actualizar DB | Trivy, Grype, Jadi | Actualiza la base de datos de vulnerabilidades |
| Desinstalar | Cualquiera | Remueve el scanner del servidor |

**Versiones pinneadas de scanners:**

vScan instala versiones verificadas de cada scanner con integridad SHA-256:

| Scanner | Versión | Verificación |
|---|---|---|
| Trivy | v0.58.0 | SHA-256 |
| Grype | v0.86.1 | SHA-256 |
| Jadi | v0.1.0 | SHA-256 |

### 7.2 Catálogo KEV

- **Estado de sincronización** — Última sincronización, cantidad de CVEs en catálogo
- **Sincronizar ahora** — Botón para forzar actualización manual
- **Auto-sync** — Sincronización automática cada 24 horas (activada por defecto)
- **Estadísticas** — Total de CVEs KEV, cuántos coinciden con tus vulnerabilidades

### 7.3 Alertas y Notificaciones

**Preferencias por evento:**

| Evento | Desktop | Email |
|---|---|---|
| Escaneo completado | Sí/No | Sí/No |
| Escaneo fallido | Sí/No | Sí/No |
| Batch completado | Sí/No | Sí/No |
| Schedule ejecutado | Sí/No | Sí/No |
| Vulnerabilidad crítica nueva | Sí/No | Sí/No |
| Vulnerabilidad KEV detectada | Sí/No | Sí/No |

**Configuración SMTP:**

| Campo | Ejemplo |
|---|---|
| Servidor SMTP | `smtp.gmail.com` |
| Puerto | `587` |
| Cifrado | STARTTLS / SSL / Ninguno |
| Usuario | `alertas@empresa.com` |
| Contraseña | Se cifra con la clave maestra |
| Remitente | `vScan <alertas@empresa.com>` |
| Destinatarios | Lista de emails separados por coma |

- Botón **"Enviar Email de Prueba"** para verificar configuración

### 7.4 Aplicación

**System Tray:**
- Minimizar al cerrar (en lugar de salir)
- Inicio minimizado (abre en bandeja del sistema)
- Ocultar del Dock (solo macOS)

**Mantenimiento de Base de Datos:**

| Acción | Descripción |
|---|---|
| Mantenimiento Ligero | Ejecuta ANALYZE para optimizar consultas |
| Mantenimiento Completo | Ejecuta VACUUM + ANALYZE para recuperar espacio |
| Retención de datos | Eliminar escaneos anteriores a X días |
| Espacio recuperable | Estimación del espacio que se puede liberar |

**Modo Oscuro / Claro:**
- Toggle de tema en la barra lateral (icono sol/luna)
- La preferencia se persiste entre sesiones

**Telemetría:** Solo local, no se envían datos externamente.

### 7.5 Seguridad

- **Desbloqueo biométrico** — Activar/desactivar Touch ID o Windows Hello
- **Auto-bloqueo** — Configurar timeout de inactividad (1 min a Nunca)
- **Bloquear al minimizar** — Activar/desactivar
- **Cambiar contraseña maestra** — Requiere contraseña actual
- **Hosts SSH confiables** — Lista de fingerprints SSH aceptados, con opción de eliminar

---

## 8. Seguridad

### Arquitectura de Seguridad

| Componente | Tecnología |
|---|---|
| Hash de contraseña | Argon2id (resistente a GPU y side-channel) |
| Cifrado de credenciales | AES-256-GCM (authenticated encryption) |
| Clave maestra | Almacenada en Keychain del SO |
| Clave de recuperación | Cifrada con salt independiente |

### Protección contra Fuerza Bruta

Intentos fallidos de desbloqueo aplican delays progresivos (exponenciales):

| Intentos fallidos | Tiempo de espera |
|---|---|
| 1-2 | Sin espera |
| 3-5 | 1s, 2s, 4s (exponencial) |
| 6-8 | 8s, 16s, 32s |
| 9-10 | 64s, 128s |
| 11+ | 300 segundos (5 minutos máximo) |

### Certificado VBR (TOFU)

vScan implementa Trust On First Use (TOFU) para certificados TLS de VBR. El fingerprint SHA-256 se almacena en la primera conexión y se verifica en conexiones posteriores. Si el certificado cambia, se muestra una alerta con ambos fingerprints para revisión.

### Email de Reporte de Sesión

Al completar un escaneo, vScan puede enviar un email HTML consolidado con resumen por VM (conteo de vulnerabilidades por severidad). Requiere SMTP y notificaciones email habilitadas.

### Detección de Manipulación

vScan verifica la integridad comparando la clave maestra en Keychain con la almacenada en la base de datos. Si detecta inconsistencias, solicita reautenticación.

### Qué se Cifra

Contraseñas VBR, contraseñas SSH, claves SSH privadas, credenciales SMTP y tokens de sesión. Todo se cifra con AES-256-GCM antes de almacenarse en SQLite.

---

## 9. Bandeja del Sistema (System Tray)

vScan puede ejecutarse en segundo plano desde la bandeja del sistema.

**Opciones:**
- **Minimizar al cerrar** — Al cerrar la ventana, la app se minimiza al tray en lugar de salir
- **Inicio minimizado** — Al abrir vScan, inicia directamente en el tray sin mostrar ventana
- **Ocultar del Dock** (macOS) — No muestra icono en el Dock cuando está en segundo plano

**Menú del Tray (clic derecho en el icono):**
- Mostrar vScan
- Bloquear vScan (solo cuando está desbloqueado)
- Estado: Idle / Scanning / ... (informativo)
- Schedules (submenú):
  - Próximo escaneo programado
  - Deshabilitar/Habilitar todos los schedules
- Escaneos Recientes (submenú):
  - Ver Todos...
- Configuración...
- Documentación
- Reportar Problema
- Abrir Carpeta de Logs
- Salir de vScan

---

## 10. Comparación de Escaneos

### Comparar Scanners

Ejecuta el mismo punto de restauración con dos scanners diferentes y compara:
1. Ve a **Vulnerabilidades > Comparar**
2. Selecciona dos escaneos de la misma VM con diferentes scanners
3. Vista de resultados:
   - **Comunes** — CVEs detectados por ambos scanners
   - **Solo Scanner A** — CVEs exclusivos del primer scanner
   - **Solo Scanner B** — CVEs exclusivos del segundo
   - **Diferencias de severidad** — Mismo CVE con diferente clasificación

### Comparar Puntos de Restauración

Compara la misma VM en diferentes fechas para ver la evolución:
1. Selecciona dos escaneos de la misma VM en diferentes restore points
2. Vista de resultados:
   - **Nuevas** — Vulnerabilidades que aparecieron en el punto más reciente
   - **Corregidas** — Vulnerabilidades que ya no están presentes
   - **Persistentes** — Vulnerabilidades que siguen presentes en ambos
   - **Cambios de severidad** — CVEs cuya clasificación cambió entre puntos

Esto es útil para evaluar si los parches aplicados entre backups realmente resolvieron las vulnerabilidades.

---

## Atajos de Teclado

| Atajo | Acción |
|---|---|
| `Ctrl/Cmd + L` | Bloquear aplicación |
| `Ctrl/Cmd + F` | Enfocar búsqueda/filtro |
| `Ctrl/Cmd + N` | Nuevo escaneo |
| `Ctrl/Cmd + B` | Nuevo batch |
| `Escape` | Cerrar diálogo / cancelar |

---

## Consejos y Buenas Prácticas

- Actualiza las bases de datos de scanners y el catálogo KEV **semanalmente**
- Usa **batch scans** y **schedules** para escaneos rutinarios multi-VM
- Revisa primero las vulnerabilidades **CRITICAL** y **KEV** (mayor riesgo)
- Usa **comparación de escaneos** después de parchear para verificar remediación
- Configura **notificaciones email** para alertas de escaneos completados/fallidos
- **Respalda tu base de datos** periódicamente; usa **múltiples scanners** para mayor cobertura
