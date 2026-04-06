# vScan — Escáner de Vulnerabilidades v2.0.0

## Qué es vScan

vScan es una aplicación de escritorio para Windows y macOS que permite escanear puntos de restauración de máquinas virtuales en busca de vulnerabilidades de seguridad. Se integra directamente con Veeam Backup & Replication para acceder a los backups de tus VMs sin necesidad de restaurarlas completamente.

La aplicación utiliza la **API de Integración de Datos de Veeam** para montar los discos de los puntos de restauración en un servidor Linux remoto vía SSH, y ejecuta Scanners de vulnerabilidades como Trivy, Grype o Jadi para analizar el contenido de esos discos. Los resultados se almacenan localmente y se pueden explorar, filtrar, exportar a CSV/PDF y comparar entre escaneos.

vScan fue diseñado para equipos de seguridad y administradores de infraestructura que necesitan visibilidad continua sobre las vulnerabilidades presentes en sus backups, sin afectar los entornos de producción.

## Características Principales

- **Escaneo individual** — Selecciona una VM, elige un punto de restauración y discos, monta y escanea paso a paso con un wizard guiado
- **Escaneo por lotes (Batch)** — Escanea múltiples VMs en paralelo con configuración de concurrencia, reintentos y timeout
- **Escaneos programados** — Programa escaneos diarios, semanales o mensuales con ejecución automática en segundo plano
- **3 Scanners soportados** — Trivy (Linux/contenedores), Grype (multi-lenguaje/SBOM) y Jadi (Windows/.NET)
- **Navegador de vulnerabilidades** — Explora todas las vulnerabilidades con filtros avanzados por severidad, servidor, paquete, estado y fechas
- **Exportación CSV y PDF** — Genera reportes ejecutivos y técnicos en PDF con branding personalizable, o exporta a CSV
- **Dashboard con gráficos** — Panel principal con estadísticas, tendencias temporales, distribución de severidad y servidores más vulnerables
- **Catálogo KEV (CISA)** — Integración con el catálogo de Vulnerabilidades Explotadas Conocidas de CISA para priorizar remediación
- **Contraseña maestra + biometría** — Protección con contraseña maestra (Argon2id + AES-256-GCM), Touch ID y Windows Hello
- **Auto-bloqueo** — Bloqueo automático por inactividad o al minimizar la aplicación
- **Notificaciones** — Alertas por email (SMTP) y notificaciones de escritorio para eventos de escaneo y errores
- **Comparación de escaneos** — Compara resultados entre Scanners o entre puntos de restauración para ver cambios
- **Bandeja del sistema** — Minimiza al system tray, inicio en segundo plano y control desde el icono
- **Ciclo de vida de vulnerabilidades** — Seguimiento automático de estado: abierta, corregida, no corregir, aceptada, falso positivo
- **Gestión masiva** — Operaciones en lote sobre vulnerabilidades (cambiar estado, ignorar múltiples CVEs)

## Plataformas Soportadas

### macOS

| Aspecto | Detalle |
|---|---|
| **Versión mínima** | macOS 13.0 (Ventura) |
| **Versiones verificadas** | Ventura 13, Sonoma 14, Sequoia 15, Tahoe 26 |
| **Arquitecturas** | Apple Silicon (arm64) |
| **Formato de instalación** | `.dmg` |
| **Biometría** | Touch ID, Face ID |
| **Almacén de credenciales** | macOS Keychain |

### Windows

| Aspecto | Detalle |
|---|---|
| **Versión mínima** | Windows 10 (1803+, build 17134) |
| **Versiones verificadas** | Windows 10, 11, Server 2019/2022/2025 |
| **Arquitectura** | x86_64 |
| **Formato de instalación** | NSIS installer (`.exe`) |
| **Biometría** | Windows Hello (huella, rostro, PIN) |
| **Almacén de credenciales** | Windows Credential Manager |

> **Nota:** vScan es una aplicación de escritorio para macOS y Windows. El servidor Linux remoto (donde se montan discos y ejecutan Scanners vía SSH) sigue siendo un requisito — consulta la sección de requisitos del sistema.

---

## Requisitos del Sistema

| Componente | Requisito |
|---|---|
| **Sistema operativo** | Windows 10+ o macOS 13+ |
| **Veeam B&R** | Versión 13 o superior con REST API habilitada (puerto 9419) |
| **Servidor Linux** | Rocky Linux 9+ con SSH habilitado |
| **Scanners** | Al menos uno instalado: Trivy, Grype o Jadi |
| **Red** | Conectividad al servidor VBR y al servidor Linux vía SSH |
| **Montaje** | FUSE y NTFS-3G en el servidor Linux (requeridos por la API de Veeam) |

## Documentación

| Documento | Descripción |
|---|---|
| [Instalación](INSTALACION.md) | Requisitos previos, instalar Scanners y descargar vScan |
| [Inicio Rápido](INICIO-RAPIDO.md) | Configuración inicial paso a paso |
| [Scanners](SCANNERS.md) | Detalle de Trivy, Grype y Jadi con comparativa |
| [Guía de Usuario](GUIA-USUARIO.md) | Manual completo de todas las funcionalidades |
| [Preguntas Frecuentes](FAQ.md) | Solución a problemas comunes |

## Inicio Rápido

1. Instala vScan en Windows o macOS ([Guía de Instalación](INSTALACION.md))
2. Configura una contraseña maestra y guarda tu clave de recuperación
3. Conecta con tu servidor Veeam Backup & Replication
4. Agrega un servidor Linux de escaneo vía SSH
5. Ejecuta tu primer escaneo de vulnerabilidades

Consulta [Inicio Rápido](INICIO-RAPIDO.md) para instrucciones detalladas paso a paso.

---

## Soporte

Si encuentras un problema o tienes sugerencias, puedes crear un issue en el repositorio del proyecto.

## Licencia

MIT License

**Autor:** Marco Escobar
**Homepage:** [https://24xsiempre.com](https://24xsiempre.com)
<img width="442" height="630" alt="image" src="https://github.com/user-attachments/assets/0a2f0380-05d7-4de8-b9d7-2e1e09cd3e45" />
