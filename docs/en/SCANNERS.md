# Vulnerability Scanners

This document explains how vulnerability scanning works in vScan and provides a detailed comparison of the three supported scanners.

---

## Table of Contents

1. [What is Vulnerability Scanning?](#what-is-vulnerability-scanning)
2. [How vScan Scans Work](#how-vscan-scans-work)
3. [Trivy](#trivy)
4. [Grype](#grype)
5. [Jadi](#jadi)
6. [Scanner Comparison](#scanner-comparison)
7. [Which Scanner Should I Use?](#which-scanner-should-i-use)
8. [Scan Comparison Feature](#scan-comparison-feature)

---

## What is Vulnerability Scanning?

Vulnerability scanning is the process of automatically inspecting software packages, libraries, and configurations on a system to identify known security vulnerabilities. Each vulnerability is typically identified by a **CVE** (Common Vulnerabilities and Exposures) identifier and assigned a severity level (CRITICAL, HIGH, MEDIUM, LOW, NEGLIGIBLE, or UNKNOWN).

Scanners work by:

1. **Inventorying** installed packages, libraries, and binaries on the target system
2. **Comparing** each package version against vulnerability databases (NVD, vendor advisories)
3. **Reporting** matches with severity, affected version, and fixed version information

---

## How vScan Scans Work

vScan does **not** scan live production systems. Instead:

1. A VM restore point is selected from Veeam backups
2. The VM's virtual disk(s) are mounted on a Linux scan server via the Veeam Data Integration API
3. The selected scanner runs against the mounted filesystem (rootfs mode)
4. Results are collected, parsed, and stored in the local database
5. Disks are unmounted and the restore point is released

This approach is **non-intrusive** -- production VMs are never touched, and you can scan historical points in time.

---

## Trivy

**By:** [Aqua Security](https://aquasecurity.github.io/trivy/) (open source, Apache 2.0)

### Overview

Trivy is a comprehensive, fast vulnerability scanner widely adopted in the cloud-native ecosystem. It is the most popular open-source scanner and provides excellent coverage for Linux distributions and container images.

### What It Scans

- OS packages (dpkg, rpm, apk)
- Application libraries (Python pip, Node npm, Java Maven, Go modules, Rust Cargo)
- Configuration files (Dockerfile, Kubernetes manifests, Terraform)
- License compliance

### Vulnerability Databases

- National Vulnerability Database (NVD)
- Red Hat Security Advisories
- Rocky Linux / RHEL Security Advisories
- Alpine SecDB
- Amazon Linux Security Center

### Strengths

- **Very fast** scanning speed
- **Broad OS coverage** across major Linux distributions
- **Container-aware** with native image scanning support
- **Actively maintained** with frequent database updates
- **Low false-positive rate**

### Best For

- Linux servers and VM images
- Docker container images
- Kubernetes environments
- Multi-distribution environments

### Installation

vScan installs Trivy v0.58.0 automatically from **Settings > SSH**. Optionally, you can install it manually:

```bash
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin
```

---

## Grype

**By:** [Anchore](https://github.com/anchore/grype) (open source, Apache 2.0)

### Overview

Grype is a vulnerability scanner by Anchore that excels at analyzing software bills of materials (SBOMs) and supports a wide range of programming language ecosystems. It supports standard SBOM formats (SPDX, CycloneDX).

### What It Scans

- OS packages (dpkg, rpm, apk)
- Python packages (pip, poetry, conda)
- Node.js packages (npm, yarn)
- Java packages (Maven, Gradle)
- Go modules
- Rust crates
- Ruby gems
- .NET NuGet packages

### Vulnerability Databases

- National Vulnerability Database (NVD)
- GitHub Security Advisories
- Red Hat, Rocky Linux, Alpine advisories
- Amazon Linux, Oracle Linux, SUSE advisories

### Strengths

- **Excellent language ecosystem coverage** across Python, Node, Java, Go, Rust, Ruby, .NET
- **SBOM integration** with standard SBOM formats (SPDX, CycloneDX)
- **Fast** scanning with local database caching
- **Detailed package matching** with precise version comparison

### Best For

- Multi-language application environments
- SBOM-based vulnerability management
- Developer-focused scanning workflows
- Environments with diverse technology stacks

### Installation

vScan installs Grype v0.86.1 automatically from **Settings > SSH**. Optionally, you can install it manually:

```bash
curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin
```

---

## Jadi

**By:** [Marco Escobar](https://github.com/mescobarcl/jadi/) (open source, MIT)

### Overview

Jadi is an offline vulnerability scanner with deep Microsoft Windows support. It analyzes mounted backup filesystems to detect installed software, correlate it against multiple vulnerability databases, and generate compliance-ready reports. While Trivy and Grype excel at Linux workloads, Jadi fills the gap for Windows-specific scanning and also covers 12 language ecosystems.

### What It Scans

- Windows applications (registry hive parsing, KBs, MSRC patches, server roles)
- .NET Framework (2.0-4.8) and .NET Core/5+ via `*.deps.json`
- NuGet packages and .NET project dependencies
- 12 ecosystems: npm, PyPI, Maven, Gradle, Go, NuGet, Composer, RubyGems, Cargo, .NET, JAR, binary detection
- Software detection via registry hives (`SOFTWARE`, `NTUSER.DAT`) on offline backups

### Vulnerability Databases

- NVD (130,000+ CVEs)
- OSV -- Open Source Vulnerabilities (253,000+ advisories)
- GHSA -- GitHub Security Advisories (27,000+ advisories)
- MSRC -- Microsoft Security Response Center (7,600+ advisories)
- CISA KEV -- Known Exploited Vulnerabilities (1,551 CVEs)
- Total: 418,000+ vulnerabilities, updated daily

### Strengths

- **Offline Windows analysis** -- Scan Windows backups without booting: registry parsing, missing KB detection, supersedence chains, server role filtering (IIS, DNS, AD, Hyper-V)
- **12 language ecosystems** -- Broad coverage beyond Windows
- **SBOM generation** -- SPDX 2.3 and CycloneDX 1.5
- **KEV intelligence** -- Actively exploited vulnerability detection with ransomware association
- **7 output formats** -- Table, JSON, SARIF, CSV, Markdown, SPDX, CycloneDX

### Best For

- Windows Server VM images
- .NET applications (Framework and Core)
- Mixed Windows/Linux environments
- Offline backup analysis

### Installation

vScan installs Jadi v0.1.0 automatically from **Settings > SSH**.

---

## Scanner Comparison

| Feature | Trivy | Grype | Jadi |
|---------|-------|-------|------|
| **License** | Apache 2.0 | Apache 2.0 | MIT |
| **Linux OS Packages** | Excellent | Excellent | Limited |
| **Windows Applications** | Limited | Limited | Excellent |
| **Python Libraries** | Good | Excellent | Good |
| **Node.js Libraries** | Good | Excellent | Good |
| **Java Libraries** | Good | Excellent | Good |
| **.NET / NuGet** | Basic | Good | Excellent |
| **Go Modules** | Good | Excellent | Good |
| **Rust Crates** | Good | Excellent | Good |
| **Container Images** | Excellent | Good | N/A |
| **SBOM Support** | Good | Excellent | Good |
| **Scan Speed** | Very Fast | Fast | Fast |
| **Database Updates** | Frequent | Frequent | Daily |
| **False Positive Rate** | Low | Low | Low |

---

## Which Scanner Should I Use?

Use this decision tree to choose the right scanner:

**What type of VM are you scanning?**

- **Linux server / container host** --> Use **Trivy**
  - Fastest scanner with excellent Linux OS package coverage
  - Best choice for most Linux workloads

- **Multi-language application server** --> Use **Grype**
  - Superior coverage for Python, Node, Java, Go, Rust libraries
  - Ideal when application dependencies are the primary concern

- **Windows server / .NET application** --> Use **Jadi**
  - Purpose-built for Windows and .NET scanning
  - Best choice for Windows VM images

- **Mixed environment** --> Use **multiple scanners**
  - Run Trivy or Grype for Linux VMs
  - Run Jadi for Windows VMs
  - vScan lets you choose the scanner per scan

> **Tip:** You can install all three scanners on your Linux scan server and choose the appropriate one for each VM when creating a scan.

---

## Scan Comparison Feature

vScan includes a built-in scan comparison feature that lets you compare results from two different scan dates for the same VM. This is useful for:

- **Tracking remediation progress** -- See which vulnerabilities were fixed between scans
- **Detecting new vulnerabilities** -- Identify newly discovered CVEs
- **Validating patches** -- Confirm that updates resolved specific vulnerabilities
- **Comparing scanners** -- Run different scanners on the same restore point and compare findings

To use scan comparison:

1. Navigate to **Scans** in the sidebar
2. Select a VM with multiple scan results
3. Click **Compare** and select two scan dates
4. View the side-by-side comparison showing new, fixed, and unchanged vulnerabilities

See [User Guide - Scan Comparison](USER-GUIDE.md#10-scan-comparison) for detailed instructions.

---

## Scanner Versions & Integrity

When installed through vScan's UI, all scanners are pinned to verified versions with SHA-256 integrity checks:

| Scanner | Pinned Version | Integrity |
|---------|---------------|-----------|
| Trivy | v0.58.0 | SHA-256 verified |
| Grype | v0.86.1 | SHA-256 verified |
| Jadi | v0.1.0 | SHA-256 verified |

vScan can also check for newer scanner versions via the GitHub Releases API and notify you when updates are available.
