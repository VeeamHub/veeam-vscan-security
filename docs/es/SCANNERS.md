# Scanners de Vulnerabilidades

Este documento explica como funciona el escaneo de vulnerabilidades en vScan y proporciona una comparacion detallada de los tres scanners soportados.

---

## Tabla de Contenidos

1. [Que es un Escaneo de Vulnerabilidades](#que-es-un-escaneo-de-vulnerabilidades)
2. [Como Funcionan los Escaneos en vScan](#como-funcionan-los-escaneos-en-vscan)
3. [Scanners Soportados](#scanners-soportados)
   - [Trivy](#trivy)
   - [Grype](#grype)
   - [Jadi](#jadi)
4. [Tabla Comparativa](#tabla-comparativa)
5. [Cual Elegir](#cual-elegir)
6. [Comparacion de Scanners en vScan](#comparacion-de-scanners-en-vscan)
7. [Actualizacion de Bases de Datos](#actualizacion-de-bases-de-datos)

---

## Que es un Escaneo de Vulnerabilidades

Un escaneo de vulnerabilidades es el proceso de analizar el software instalado en un sistema (paquetes del sistema operativo, bibliotecas, aplicaciones) y compararlo contra bases de datos publicas de vulnerabilidades conocidas (CVEs). El objetivo es identificar software con fallas de seguridad que podrian ser explotadas por atacantes.

En el contexto de vScan, el escaneo se realiza sobre los discos de puntos de restauracion de VMs — esto permite analizar los backups sin tocar los servidores en produccion.

**Flujo del escaneo:**

```
Backup VM → Montar disco en Linux → Scanner analiza contenido → Resultados (CVEs)
```

---

## Como Funcionan los Escaneos en vScan

vScan **no** escanea sistemas en produccion. En su lugar:

1. Se selecciona un punto de restauracion de una VM desde los backups de Veeam
2. Los discos virtuales de la VM se montan en un servidor Linux de escaneo via la API de Integracion de Datos de Veeam
3. El scanner seleccionado se ejecuta contra el sistema de archivos montado (modo rootfs)
4. Los resultados se recopilan, analizan y almacenan en la base de datos local
5. Los discos se desmontan y el punto de restauracion se libera

Este enfoque es **no intrusivo** — las VMs en produccion nunca se tocan, y puedes escanear puntos historicos en el tiempo.

---

## Scanners Soportados

vScan soporta tres scanners de vulnerabilidades. Cada uno tiene fortalezas diferentes segun el tipo de sistema que analices.

---

### Trivy

**Desarrollado por:** Aqua Security (open source)
**Sitio web:** [github.com/aquasecurity/trivy](https://github.com/aquasecurity/trivy)

**Que escanea:**

- Paquetes del sistema operativo (apt, yum, apk, etc.)
- Bibliotecas de aplicaciones (npm, pip, gem, go.sum, Cargo.lock, etc.)
- Archivos de configuracion (Dockerfile, Kubernetes, Terraform)
- Imagenes de contenedores

**Base de datos de vulnerabilidades:**

- NVD (National Vulnerability Database)
- Red Hat Security Advisories
- Rocky Linux / RHEL Security Advisories
- Alpine SecDB
- Y muchas mas fuentes

**Caracteristicas destacadas:**

- Muy rapido — escaneo completo en segundos
- Bajo consumo de memoria
- Base de datos compacta que se actualiza automaticamente
- Soporte nativo para rootfs (sistema de archivos montado)

**Mejor para:** Servidores Linux, contenedores Docker, imagenes de VM Linux.

**Instalacion:** vScan instala Trivy v0.58.0 automaticamente desde **Configuracion > SSH**. Opcionalmente, puedes instalarlo manualmente:

```bash
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin
```

---

### Grype

**Desarrollado por:** Anchore (open source)
**Sitio web:** [github.com/anchore/grype](https://github.com/anchore/grype)

**Que escanea:**

- Paquetes del sistema operativo (dpkg, rpm, apk)
- Bibliotecas de lenguajes: Python (pip), Node.js (npm), Java (Maven/Gradle), Go, Rust, Ruby
- SBOMs (Software Bill of Materials) en formato SPDX y CycloneDX

**Base de datos de vulnerabilidades:**

- NVD
- GitHub Security Advisories
- Red Hat, Rocky Linux, Alpine advisories
- Amazon Linux, Oracle Linux, SUSE advisories

**Caracteristicas destacadas:**

- Excelente para analisis de SBOM
- Cobertura amplia de bibliotecas de multiples lenguajes
- Salida detallada con version corregida cuando esta disponible
- Soporte para formatos SBOM estandar (SPDX, CycloneDX)

**Mejor para:** Aplicaciones multi-lenguaje, analisis de dependencias, equipos que trabajan con SBOMs.

**Instalacion:** vScan instala Grype v0.86.1 automaticamente desde **Configuracion > SSH**. Opcionalmente, puedes instalarlo manualmente:

```bash
curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin
```

---

### Jadi

**Desarrollado por:** Marco Escobar (open source)
**Sitio web:** [github.com/mescobarcl/jadi](https://github.com/mescobarcl/jadi/)

**Que escanea:**

- Aplicaciones Windows (registro, KBs, parches MSRC, roles de servidor)
- Ensamblados .NET Framework (2.0-4.8) y .NET Core/5+ via `*.deps.json`
- Paquetes NuGet y dependencias de proyectos .NET
- 12 ecosistemas: npm, PyPI, Maven, Gradle, Go, NuGet, Composer, RubyGems, Cargo, .NET, JAR, deteccion binaria
- Deteccion de software via registry hives (`SOFTWARE`, `NTUSER.DAT`) en backups offline

**Base de datos de vulnerabilidades:**

- NVD (130,000+ CVEs)
- OSV — Open Source Vulnerabilities (253,000+ advisories)
- GHSA — GitHub Security Advisories (27,000+ advisories)
- MSRC — Microsoft Security Response Center (7,600+ advisories)
- CISA KEV — Known Exploited Vulnerabilities (1,551 CVEs)
- Total: 418,000+ vulnerabilidades, actualizada diariamente

**Caracteristicas destacadas:**

- **Analisis offline de Windows** — Escanea backups de Windows sin iniciarlos: parsing de registry, deteccion de KBs faltantes, cadenas de supersedencia, roles de servidor (IIS, DNS, AD, Hyper-V)
- **12 ecosistemas de lenguajes** — Cobertura amplia mas alla de Windows
- **Generacion de SBOM** — SPDX 2.3 y CycloneDX 1.5
- **Inteligencia KEV** — Deteccion de vulnerabilidades explotadas activamente con asociacion de ransomware
- **7 formatos de salida** — Table, JSON, SARIF, CSV, Markdown, SPDX, CycloneDX

**Mejor para:** Servidores Windows, aplicaciones .NET, entornos mixtos Windows/Linux, analisis de backups offline.

**Instalacion:** vScan instala Jadi v0.1.0 automaticamente desde **Configuracion > SSH**.

---

## Tabla Comparativa

| Caracteristica | Trivy | Grype | Jadi |
|---|:---:|:---:|:---:|
| **Licencia** | Apache 2.0 | Apache 2.0 | MIT |
| **Paquetes Linux (apt/yum/apk)** | Excelente | Excelente | Limitado |
| **Aplicaciones Windows** | Limitado | Limitado | Excelente |
| **Bibliotecas Python** | Bueno | Excelente | Bueno |
| **Bibliotecas Node.js** | Bueno | Excelente | Bueno |
| **Bibliotecas Java** | Bueno | Excelente | Bueno |
| **.NET / NuGet** | Basico | Bueno | Excelente |
| **Modulos Go** | Bueno | Excelente | Bueno |
| **Crates Rust** | Bueno | Excelente | Bueno |
| **Imagenes de Contenedores** | Excelente | Bueno | N/A |
| **Soporte SBOM** | Bueno | Excelente | Bueno |
| **Velocidad de Escaneo** | Muy rapida | Rapida | Rapida |
| **Actualizacion de DB** | Frecuente | Frecuente | Diaria |
| **Tasa de Falsos Positivos** | Baja | Baja | Baja |

---

## Cual Elegir

Usa este arbol de decision para elegir el scanner adecuado:

**Que tipo de VM vas a escanear?**

- **Servidor Linux / host de contenedores** --> Usa **Trivy**
  - Scanner mas rapido con excelente cobertura de paquetes Linux
  - Mejor opcion para la mayoria de cargas de trabajo Linux

- **Servidor de aplicaciones multi-lenguaje** --> Usa **Grype**
  - Cobertura superior para bibliotecas Python, Node, Java, Go, Rust
  - Ideal cuando las dependencias de aplicaciones son la principal preocupacion

- **Servidor Windows / aplicacion .NET** --> Usa **Jadi**
  - Disenado especificamente para escaneo de Windows y .NET
  - Mejor opcion para imagenes de VMs Windows

- **Entorno mixto** --> Usa **multiples scanners**
  - Ejecuta Trivy o Grype para VMs Linux
  - Ejecuta Jadi para VMs Windows
  - vScan te permite elegir el scanner por cada escaneo

> **Consejo:** Puedes instalar los tres scanners en tu servidor Linux de escaneo y elegir el apropiado para cada VM al crear un escaneo.

---

## Comparacion de Scanners en vScan

vScan incluye una funcionalidad para comparar los resultados de dos scanners sobre los mismos datos:

1. Ejecuta un escaneo con Trivy y otro con Grype sobre la misma VM y punto de restauracion
2. Ve a **Vulnerabilidades > Comparar**
3. Selecciona los dos escaneos a comparar
4. vScan muestra:
   - Vulnerabilidades encontradas por **ambos** scanners
   - Vulnerabilidades encontradas **solo** por el primer scanner
   - Vulnerabilidades encontradas **solo** por el segundo scanner
   - Diferencias en severidad asignada

Esto te ayuda a entender las fortalezas y limitaciones de cada scanner y a tener una imagen mas completa de las vulnerabilidades.

---

## Actualizacion de Bases de Datos

Los scanners necesitan bases de datos actualizadas para detectar vulnerabilidades recientes:

| Scanner | Version pinneada | Actualizacion DB | Comando manual |
|---|---|---|---|
| Trivy | v0.58.0 | Automatica al escanear | `trivy image --download-db-only` |
| Grype | v0.86.1 | Automatica al escanear | `grype db update` |
| Jadi | v0.1.0 | Manual | `jadi update-db` |

> **Nota:** Todas las instalaciones desde vScan incluyen verificacion de integridad SHA-256. Tambien puedes instalar, actualizar y desinstalar scanners directamente desde la interfaz de vScan (Configuracion > SSH).

> **Nota:** Si el servidor Linux no tiene acceso a internet, necesitaras descargar las bases de datos manualmente y transferirlas.
