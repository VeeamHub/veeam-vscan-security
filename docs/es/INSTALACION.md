# Instalación

Esta guía cubre los requisitos previos, la instalación de los Scanners en el servidor Linux y la descarga de vScan.

---

## Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Instalar Scanners en el Servidor Linux](#instalar-scanners-en-el-servidor-linux)
3. [Descargar e Instalar vScan](#descargar-e-instalar-vscan)
4. [Primer Inicio](#primer-inicio)
5. [Actualizar vScan](#actualizar-vscan)
6. [Desinstalar](#desinstalar)
7. [Estructura de Datos](#estructura-de-datos)

---

## Requisitos Previos

### 1. Veeam Backup & Replication

- **Versión:** 13 o superior
- **REST API:** Debe estar habilitada (se activa por defecto en instalaciones nuevas)
- **Puerto:** 9419 (HTTPS) — verifica que el firewall lo permita
- **Credenciales:** Usuario con permisos de lectura sobre Jobs y restore points
- **Formato de usuario:** Soporta `DOMINIO\usuario` o `usuario@dominio`

Para verificar que la REST API está activa:

```
https://tu-servidor-vbr:9419/swagger/ui/index.html
```

Si puedes acceder al Swagger UI, la API está funcionando.

### 2. Servidor Linux (SSH)

El servidor Linux es donde vScan monta los discos y ejecuta los Scanners. Puedes usar un servidor administrado por Veeam o uno independiente.

**Distribución soportada:**

| Distribución | Versiones |
|---|---|
| Rocky Linux | 9+ |

**Requisitos del servidor:**

| Componente | Propósito | Comando de verificación |
|---|---|---|
| SSH Server | Conexión remota | `systemctl status sshd` |
| FUSE | Requerido por la API de Veeam para montar discos de VMs | `modprobe fuse && echo OK` |
| NTFS-3G | Lectura de discos Windows | `ntfs-3g --version` |
| ZFS Utils | Soporte ZFS (opcional) | `zfs version` |

**Instalar dependencias:**

```bash
sudo dnf install -y fuse ntfs-3g
```

### 3. Sistema Operativo del Cliente

| SO | Versión Mínima | Arquitectura |
|---|---|---|
| Windows | 10 (build 1809+) | x86_64 |
| macOS | 13 (Ventura) | ARM64 (Apple Silicon) |

---

## Instalar Scanners en el Servidor Linux

vScan instala los Scanners automáticamente desde la interfaz gráfica. No necesitas instalarlos manualmente.

### Instalación automática (recomendado)

1. Abre **Configuración > SSH** en vScan
2. Conecta al servidor Linux
3. Haz clic en **Instalar** junto al scanner deseado
4. vScan descarga, verifica la integridad (SHA-256) e instala el scanner automáticamente

**Versiones:**

| Scanner | Versión | Notas |
|---|---|---|
| Trivy | v0.58.0 | Scanner de Linux y contenedores |
| Grype | v0.86.1 | Scanner multi-lenguaje y SBOM |
| Jadi | v0.1.0 | Scanner de Windows/.NET |

Los prerequisitos (`tar`, `curl`, `jq`) también se instalan automáticamente si no están presentes en el servidor.

---

## Descargar e Instalar vScan

### Windows

1. Descarga el instalador `.exe` desde la página de releases del proyecto
2. Ejecuta el instalador y sigue las instrucciones
3. vScan se instalará y creará un acceso directo en el escritorio
4. Al iniciar, Windows SmartScreen puede mostrar una advertencia — haz clic en "Más información" y luego "Ejecutar de todos modos"

> **Nota:** Windows Defender u otro antivirus pueden marcar el instalador porque no está firmado digitalmente. Haz clic en **Más información** > **Ejecutar de todos modos** si aparece el aviso.

### macOS

1. Descarga el archivo `.dmg` desde la página de releases del proyecto
2. Abre el `.dmg` y arrastra vScan a la carpeta Aplicaciones
3. **Importante:** Antes de abrir la app por primera vez, ejecuta este comando en Terminal:
   ```bash
   xattr -cr /Applications/vScan\ Vulnerability\ Scanner.app
   ```
4. Abre vScan desde Aplicaciones

> **Nota:** macOS marca como "dañada" cualquier app descargada de internet que no esté firmada con un certificado de Apple Developer. El comando `xattr -cr` remueve esta marca de cuarentena. Es seguro y solo se necesita una vez después de instalar o actualizar.

---

## Primer Inicio

Al abrir vScan por primera vez:

1. Se creará la base de datos local SQLite automáticamente
2. Se ejecutarán las migraciones de esquema (26 migraciones)
3. Se mostrará el asistente de configuración de seguridad:
   - Crear contraseña maestra
   - Guardar clave de recuperación
   - Configurar biometría (opcional)

Consulta la [Guía de Inicio Rápido](INICIO-RAPIDO.md) para el proceso completo paso a paso.

---

## Actualizar vScan

Para actualizar vScan:

1. Descarga el instalador más reciente desde la página de releases
2. Ejecuta el instalador — se actualizará la instalación existente
3. Tu configuración, historial de escaneos y credenciales se conservan en la base de datos SQLite

---

## Desinstalar

### Windows

1. Abre **Configuración** > **Aplicaciones** > **Aplicaciones instaladas**
2. Busca **vScan** y haz clic en **Desinstalar**

### macOS

1. Arrastra **vScan** desde **Aplicaciones** a la **Papelera**
2. Eliminar datos y logs:
   ```bash
   rm -rf ~/Library/Application\ Support/vScan-Vulnerability
   rm -rf ~/Library/Logs/com.vscan.vulnerabilityscanner
   ```
3. Eliminar claves del Keychain (opcional — borra las claves de cifrado):
   ```bash
   security delete-generic-password -s "com.24xsiempre.vscan" -a "encryption-master-key" 2>/dev/null
   security delete-generic-password -s "com.24xsiempre.vscan" -a "hkdf-salt" 2>/dev/null
   ```

---

## Estructura de Datos

vScan almacena todos los datos localmente:

| Dato | Ubicación | Formato |
|---|---|---|
| Base de datos | Directorio de la app | SQLite |
| Credenciales | Base de datos (cifradas) | AES-256-GCM |
| Clave maestra | Keychain del SO | macOS Keychain / Windows Credential Manager |
| Configuración | Base de datos | Texto plano (no sensible) |
| Reportes exportados | Directorio elegido por el usuario | CSV, PDF |

> **Importante:** Nunca se envían datos a servidores externos. Todo el procesamiento y almacenamiento es local.
<img width="442" height="645" alt="image" src="https://github.com/user-attachments/assets/64ee954d-f212-417b-a3e2-c2cea7c52811" />
