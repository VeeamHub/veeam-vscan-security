# Preguntas Frecuentes

---

## Tabla de Contenidos

1. [Conexión](#conexion)
2. [Escaneo](#escaneo)
3. [Seguridad](#seguridad)
4. [Reportes y Exportación](#reportes-y-exportacion)
5. [Rendimiento](#rendimiento)
6. [Catálogo KEV](#catalogo-kev)
7. [Mantenimiento](#mantenimiento)
8. [Notificaciones](#notificaciones)

---

## Conexión

### No puedo conectar a Veeam Backup & Replication

**Verifica estos puntos:**

1. **Puerto 9419** — Confirma que está abierto en el firewall del servidor VBR (se requiere al menos el rol Restore Operator en VBR)
   ```
   Test-NetConnection -ComputerName servidor -Port 9419
   ```
2. **REST API activa** — Accede a `https://servidor:9419/swagger/ui/index.html` desde un navegador
3. **Credenciales** — Prueba ambos formatos: `DOMINIO\usuario` y `usuario@dominio`
4. **Certificado** — Si el servidor usa certificado auto-firmado, activa "Aceptar certificados no confiables" en la configuración
5. **Servicio VBR** — Verifica que el servicio "Veeam Backup Service" esté corriendo en el servidor

### Qué permisos necesita la cuenta VBR

La cuenta VBR debe tener al menos el rol **Restore Operator** para acceder a los puntos de restauración y publicarlos vía la API de Integración de Datos. El rol Administrador también funciona.

### La conexión SSH falla

1. **Servicio SSH** — Verifica que está activo: `systemctl status sshd`
2. **Puerto** — Confirma que el puerto SSH (22 por defecto) está abierto
3. **Credenciales** — Verifica usuario y contraseña/clave SSH
4. **Firewall** — Revisa iptables/firewalld en el servidor Linux
5. **TOFU** — Si cambiaste el servidor, puede que necesites aceptar el nuevo fingerprint. Ve a Configuración > Seguridad > Hosts SSH Confiables y elimina el registro anterior

### Cómo funciona la verificación de certificado VBR

vScan usa Trust On First Use (TOFU) para certificados TLS de VBR. La primera vez que conectas, el fingerprint SHA-256 del certificado se almacena localmente. En conexiones posteriores, vScan verifica que el certificado coincida. Si cambia (por ejemplo, tras una renovación), se te pedirá aceptar el nuevo certificado.

### Puedo usar autenticación por clave SSH en lugar de contraseña

Sí. Al agregar una conexión SSH, selecciona **Clave SSH** como método de autenticación y proporciona la clave privada. Se soportan formatos PEM y OpenSSH para llaves privadas.

### vScan soporta autenticación multifactor (MFA) para VBR

vScan se conecta vía la API REST de VBR usando credenciales de usuario y contraseña. MFA no está soportado actualmente para la conexión VBR. Usa una cuenta de servicio con los permisos apropiados.

### Error "Certificado no válido" al conectar a VBR

VBR usa certificados auto-firmados por defecto. Para resolverlo:

1. Ve a **Configuración > VBR**
2. Activa la opción **"Aceptar certificados no confiables"**
3. Reconecta

> **Nota de seguridad:** En entornos de producción, considera instalar un certificado válido en el servidor VBR.

---

## Escaneo

### Cómo monta vScan los discos de los backups

vScan utiliza la **API de Integración de Datos de Veeam** para publicar los puntos de restauración en el servidor Linux de escaneo. La API usa FUSE para montar las imágenes de disco de las VMs en espacio de usuario. El paquete FUSE requerido es instalado automáticamente por vScan en el servidor Linux. Todo el ciclo de montaje/desmontaje se gestiona automáticamente — no se necesita intervención manual.

### Puedo escanear una VM que está en ejecución

Sí. vScan escanea puntos de restauración de backups, no VMs en vivo. La VM en ejecución nunca se toca ni se ve afectada.

### Cómo instalo o actualizo scanners desde vScan

No necesitas acceder manualmente al servidor Linux. Desde **Configuración > SSH**, puedes:

1. **Instalar** scanners (Trivy, Grype, Jadi) con verificación SHA-256
2. **Actualizar** la base de datos de vulnerabilidades de cada scanner
3. **Desinstalar** scanners que ya no necesites

vScan detecta automáticamente los scanners disponibles al conectar.

### El escaneo no encuentra vulnerabilidades

1. **Verifica el scanner** — Ve a Configuración > SSH y confirma que el scanner aparece como "instalado"
2. **Elige el scanner correcto para el SO del disco:**
   - **Trivy** — Linux (paquetes del SO, dependencias de aplicaciones). Es el más rápido y completo para sistemas Linux
   - **Grype** — Linux (similar a Trivy, bueno como segunda opinión o comparación)
   - **Jadi** — Windows y .NET (paquetes Windows, assemblies .NET, MSI). Único scanner para discos Windows
3. **Base de datos del scanner** — Puede estar desactualizada. Actualiza desde Configuración > SSH > "Actualizar DB", o ejecuta manualmente en el servidor Linux:
   - Trivy: `trivy image --download-db-only`
   - Grype: `grype db update`
   - Jadi: `jadi update-db`
4. **Disco vacío** — El punto de restauración podría no contener un sistema operativo (disco de datos)

### Por qué un escaneo muestra resultados diferentes a un escaneo directo con Trivy/Grype

vScan ejecuta los scanners en **modo rootfs** contra el disco de backup montado. Los resultados pueden diferir ligeramente de ejecutar el scanner directamente en un sistema en vivo porque:
- El backup puede ser de un momento diferente en el tiempo
- Algunos paquetes que solo existen en tiempo de ejecución pueden no ser visibles en el disco montado
- Las versiones de la base de datos del scanner pueden diferir

### Error de montaje (Veeam Data Integration API)

1. **FUSE instalado** — Verifica: `modprobe fuse && echo OK`
2. **NTFS-3G instalado** — Para discos Windows: `ntfs-3g --version`
3. **Permisos** — El usuario SSH necesita permisos para montar (o acceso sudo)
4. **Espacio en disco** — Verifica que hay espacio suficiente en `/tmp` o el directorio de montaje
5. **Punto de montaje ocupado** — Un escaneo anterior podría haber dejado un montaje activo. Verifica con `mount | grep veeam`

---

## Seguridad

### Dónde se almacenan mis datos

Todas las credenciales (VBR, SSH, SMTP) se almacenan en una base de datos SQLite local, cifradas con **AES-GCM** usando una clave maestra derivada de tu contraseña maestra vía **Argon2**. El archivo de base de datos se encuentra en:
- **Windows:** `%APPDATA%\vScan-Vulnerability\`
- **macOS:** `~/Library/Application Support/vScan-Vulnerability/`

### Mis datos se envían a servidores externos

No. vScan es una aplicación completamente local. Todos los datos permanecen en tu equipo. Las únicas conexiones de red son:
- A tu servidor VBR (API REST)
- A tu servidor Linux de escaneo (SSH)
- Al servidor SMTP (si las notificaciones por email están configuradas)
- Las actualizaciones de bases de datos de scanners se realizan en el servidor Linux, no por vScan

### Olvidé mi contraseña maestra

1. En la pantalla de desbloqueo, haz clic en **"Usar Clave de Recuperación"**
2. Ingresa tu clave de recuperación (formato: `VSCAN-XXXX-XXXX-...`)
3. Crea una nueva contraseña maestra
4. Se generará una nueva clave de recuperación — guárdala inmediatamente

> **Si también perdiste la clave de recuperación:** No hay forma de recuperar las credenciales. Deberás reinstalar vScan y reconfigurar todas las conexiones.

### La biometría no funciona

- **macOS:** Verifica que Touch ID está configurado en Configuración del Sistema > Touch ID
- **Windows:** Verifica que Windows Hello está configurado en Configuración > Cuentas > Opciones de inicio de sesión
- **Reactivar:** Ve a Configuración > Seguridad > Desbloqueo Biométrico, desactiva y vuelve a activar
- **Hardware:** Confirma que el sensor biométrico funciona con otras aplicaciones

### El auto-bloqueo es muy frecuente

1. Ve a **Configuración > Seguridad**
2. Ajusta el **"Timeout de auto-bloqueo"** (por defecto: 5 minutos)
3. Desactiva **"Bloquear al minimizar"** si no lo necesitas
4. Los valores disponibles van desde 1 minuto hasta "Nunca"

---

## Reportes y Exportación

### El PDF no se genera

- **Branding incompleto** — Verifica que la configuración de branding tenga al menos el nombre de la empresa
- **Datos insuficientes** — Debe haber al menos un escaneo con resultados
- **Espacio en disco** — Verifica que tienes espacio en la ubicación de guardado

### El CSV está truncado

- **Límite:** La exportación CSV tiene un límite de 50,000 filas por archivo
- **Solución:** Usa filtros más específicos para reducir la cantidad de datos (por servidor, severidad, fecha)

### El logo no aparece en el PDF

- **Formato:** Usa PNG o JPG
- **Tamaño máximo:** 2 MB
- **Resolución recomendada:** 300x100 px para mejores resultados
- **Verifica:** Ve a Configuración > Aplicación > Branding y confirma que el logo se muestra en la vista previa

---

## Rendimiento

### El escaneo es muy lento

- **Usa ejecución en paralelo** — En escaneos por lotes, configura 2-4 escaneos simultáneos
- **Aumenta el timeout** — Algunos discos grandes requieren más tiempo de montaje
- **Verifica la red** — El cuello de botella suele ser la transferencia de datos entre VBR y el servidor Linux
- **Primer escaneo** — El primer escaneo con un scanner es más lento porque descarga la base de datos

### El escaneo por lotes es lento

1. **Paralelismo** — Aumenta el número de escaneos simultáneos (Configuración del batch > Modo Paralelo)
2. **Timeout por item** — Reduce el timeout para que los items que fallan no bloqueen al resto
3. **Reintentos** — Limita los reintentos a 1-2 para evitar demoras en items problemáticos
4. **Servidor Linux** — Verifica CPU y memoria disponible; escaneos paralelos consumen más recursos

### La aplicación se siente lenta con muchos datos

- **Paginación** — Las tablas usan paginación automática; no se cargan todos los datos a la vez
- **Filtros** — Usa filtros para reducir el conjunto de datos visible
- **Mantenimiento** — Ejecuta "Mantenimiento de Base de Datos" en Configuración > Aplicación (VACUUM + ANALYZE)

---

## Catálogo KEV

### La sincronización KEV no funciona

- **Internet requerido** — La sincronización necesita acceso a `https://www.cisa.gov`
- **Auto-sync** — Se sincroniza automáticamente cada 24 horas
- **Manual** — Ve a Configuración > KEV y haz clic en "Sincronizar Ahora"
- **Proxy** — Si usas proxy, verifica la configuración de red del sistema operativo

### Qué es el catálogo KEV

El **KEV (Known Exploited Vulnerabilities)** es un catálogo mantenido por CISA (Cybersecurity and Infrastructure Security Agency del gobierno de EE.UU.) que lista vulnerabilidades que se sabe están siendo explotadas activamente por atacantes.

En vScan, las vulnerabilidades marcadas con el badge **KEV** requieren atención prioritaria porque representan un riesgo real e inmediato.

---

## Mantenimiento

### La base de datos está muy grande

1. Ve a **Configuración > Aplicación > Mantenimiento**
2. Configura el **período de retención** (ej: 90 días) para eliminar datos antiguos
3. Ejecuta **"Mantenimiento Ligero"** (ANALYZE) para optimizar consultas
4. Ejecuta **"Mantenimiento Completo"** (VACUUM + ANALYZE) para recuperar espacio en disco
5. La interfaz muestra el **espacio recuperable** estimado

### Cómo respaldo mis datos de vScan

Respalda el archivo de base de datos SQLite:
- **Windows:** `%APPDATA%\vScan-Vulnerability\vscan.db`
- **macOS:** `~/Library/Application Support/vScan-Vulnerability/vscan.db`

Este archivo contiene todo el historial de escaneos, datos de vulnerabilidades y credenciales cifradas.

### Cómo reseteo vScan a valores de fábrica

Elimina el directorio de datos de la aplicación:
- **Windows:** `%APPDATA%\vScan-Vulnerability\`
- **macOS:** `~/Library/Application Support/vScan-Vulnerability/`

Esto elimina todos los datos incluyendo credenciales, historial de escaneos y configuraciones. Necesitarás configurar vScan desde cero.

### Cuánto espacio usa vScan

El tamaño depende de la cantidad de escaneos y vulnerabilidades. Como referencia:
- 100 escaneos con 1,000 vulnerabilidades cada uno: ~50 MB
- El mantenimiento periódico mantiene la base de datos compacta

---

## Notificaciones

### Los emails no llegan

1. **Configuración SMTP** — Verifica servidor, puerto, usuario y contraseña en Configuración > Alertas
2. **Test** — Usa el botón **"Enviar Email de Prueba"** para verificar
3. **Puerto** — Puertos comunes: 587 (STARTTLS), 465 (SSL), 25 (sin cifrado)
4. **Spam** — Revisa la carpeta de spam/correo no deseado
5. **Autenticación** — Algunos proveedores requieren "App Passwords" (Gmail, Outlook)

### Las notificaciones de escritorio no aparecen

- **Permisos** — Verifica que vScan tiene permiso para enviar notificaciones:
  - macOS: Configuración del Sistema > Notificaciones > vScan
  - Windows: Configuración > Sistema > Notificaciones > vScan
- **No Molestar** — Verifica que no esté activo el modo "No Molestar" / "Focus"
- **Preferencias** — Ve a Configuración > Alertas y verifica que las notificaciones de escritorio están activadas para el tipo de evento
