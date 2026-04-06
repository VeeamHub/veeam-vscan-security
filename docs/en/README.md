# vScan -- Vulnerability Scanner

**Version:** 2.0.0 | **License:** MIT | **Author:** Marco Escobar | **Homepage:** [24xsiempre.com](https://24xsiempre.com)

---

## What is vScan?

vScan is a desktop application for Windows and macOS that integrates directly with **Veeam Backup & Replication** to scan virtual machine backup restore points for security vulnerabilities. Instead of scanning live production systems -- which can impact performance and availability -- vScan uses the **Veeam Data Integration API** to mount VM disks from backup restore points on a remote Linux server, then runs industry-standard vulnerability scanners (Trivy, Grype, or Jadi) against the mounted filesystems.

This approach enables vulnerability assessments without touching production infrastructure. Security teams can scan historical restore points, compare vulnerability evolution over time, and generate executive or technical reports -- all from a single, unified desktop interface. vScan manages the entire workflow: connecting to VBR, browsing VMs and restore points, mounting disks on a Linux scan server via SSH, executing scanners, collecting results, and tracking vulnerability lifecycle.

All stored credentials are protected with AES-256-GCM encryption behind a master password, with optional biometric unlock via Touch ID or Windows Hello.

---

## Key Features

- **Single VM Scan** -- Select a VM, choose a restore point, pick disks, mount, and scan in a guided wizard workflow
- **Batch Scanning** -- Scan multiple VMs in parallel or sequentially with configurable concurrency
- **Scheduled Scans** -- Create cron-based schedules to automatically scan VMs on a recurring basis
- **Three Scanners** -- Support for Trivy (Linux/containers), Grype (SBOMs/multi-language), and Jadi (Windows/.NET)
- **Vulnerability Browser** -- Browse, filter, and search all detected vulnerabilities with advanced filtering by severity, status, VM, CVE, and package
- **CSV Export** -- Export vulnerability data to CSV files with custom branding (company name, logo)
- **PDF Reports** -- Generate executive summary and detailed technical PDF reports with branding
- **Interactive Dashboard** -- Real-time charts showing vulnerability distribution by severity, trends over time, and scan statistics
- **CISA KEV Catalog** -- Integration with CISA Known Exploited Vulnerabilities catalog to flag actively exploited CVEs
- **Master Password + Biometric** -- All credentials encrypted with AES-GCM; unlock with master password, Touch ID, or Windows Hello
- **Auto-Lock** -- Configurable automatic lock timeout with lock-on-minimize option
- **Email & Desktop Notifications** -- SMTP-based email alerts and native OS notifications for scan completion, errors, and schedule events
- **Scan Comparison** -- Compare vulnerability results between two different scan dates to track remediation progress
- **System Tray** -- Minimize to system tray with quick access menu, scan status, and notification badges
- **Vulnerability Lifecycle** -- Track each vulnerability from first detection through remediation: open, fixed, won't fix, accepted, false positive

---

## Supported Platforms

### macOS

| Aspect | Detail |
|--------|--------|
| **Minimum version** | macOS 13.0 (Ventura) |
| **Verified versions** | Ventura 13, Sonoma 14, Sequoia 15, Tahoe 26 |
| **Architectures** | Apple Silicon (arm64) |
| **Installer format** | `.dmg` |
| **Biometrics** | Touch ID, Face ID |
| **Credential store** | macOS Keychain |

### Windows

| Aspect | Detail |
|--------|--------|
| **Minimum version** | Windows 10 (1803+, build 17134) |
| **Verified versions** | Windows 10, 11, Server 2019/2022/2025 |
| **Architecture** | x86_64 |
| **Installer format** | NSIS installer (`.exe`) |
| **Biometrics** | Windows Hello (fingerprint, face, PIN) |
| **Credential store** | Windows Credential Manager |

> **Note:** vScan is a desktop application for macOS and Windows. A remote Linux server (where disks are mounted and scanners run via SSH) is still required — see the system requirements section below.

---

## System Requirements

| Component | Requirement |
|-----------|-------------|
| **Operating System** | Windows 10+ (x64) or macOS 13+ (Apple Silicon) |
| **Veeam Backup & Replication** | Version 13 or later with REST API enabled (port 9419) |
| **Linux Scan Server** | Rocky Linux 9+ with SSH enabled |
| **Linux Packages** | FUSE and NTFS-3G (required by the Veeam Data Integration API for disk mounting) |
| **Scanners** | At least one: Trivy, Grype, or Jadi installed on the Linux server |
| **Network** | Access from desktop to VBR server (9419) and Linux server (SSH port) |
| **Disk Space** | ~100 MB for the application; additional space for scan databases |

---

## Documentation

| Document | Description |
|----------|-------------|
| [Installation](INSTALLATION.md) | Prerequisites, scanner setup, and application installation |
| [Getting Started](GETTING-STARTED.md) | First-time setup: master password, VBR connection, first scan |
| [User Guide](USER-GUIDE.md) | Complete guide to all features and workflows |
| [Scanners](SCANNERS.md) | Detailed comparison of Trivy, Grype, and Jadi |
| [FAQ](FAQ.md) | Frequently asked questions and troubleshooting |

---

## Quick Start

1. Install vScan on Windows or macOS ([Installation Guide](INSTALLATION.md))
2. Set up a master password and save your recovery key
3. Connect to your Veeam Backup & Replication server
4. Add a Linux scan server via SSH
5. Run your first vulnerability scan

See [Getting Started](GETTING-STARTED.md) for detailed step-by-step instructions.

---

## License

MIT License. Copyright (c) Marco Escobar.

**Author:** Marco Escobar
**Homepage:** [https://24xsiempre.com](https://24xsiempre.com)
