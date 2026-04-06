# Installation

This guide covers all prerequisites and installation steps for vScan v2.0.0.

---

## Table of Contents

1. [Prerequisites Overview](#prerequisites-overview)
2. [Veeam Backup & Replication Setup](#veeam-backup--replication-setup)
3. [Linux Scan Server Setup](#linux-scan-server-setup)
4. [Installing Vulnerability Scanners](#installing-vulnerability-scanners)
5. [Installing vScan Desktop Application](#installing-vscan-desktop-application)
6. [First Launch](#first-launch)

---

## Prerequisites Overview

vScan requires three components to function:

| Component | Purpose | Required? |
|-----------|---------|-----------|
| **Veeam Backup & Replication v13+** | Provides VM backup data and restore points | Yes |
| **Linux Scan Server** | Mounts VM disks and runs vulnerability scanners | Yes |
| **vScan Desktop App** | User interface to manage scans and view results | Yes |

---

## Veeam Backup & Replication Setup

### Requirements

- Veeam Backup & Replication **v13 or later**
- REST API enabled on port **9419** (enabled by default in v13+)
- A user account with at least **Restore Operator** role

### Verify REST API Access

Open a browser and navigate to:

```
https://<vbr-server>:9419/swagger/ui/index.html
```

If the Swagger UI loads, the REST API is accessible. If not, verify the Veeam REST API service is running:

1. Open **Services** on the VBR server
2. Find **Veeam Backup RESTful API Service**
3. Ensure it is **Running** and set to **Automatic** startup

### Firewall Rules

Ensure the following ports are open between your desktop and the VBR server:

| Port | Protocol | Purpose |
|------|----------|---------|
| 9419 | TCP | VBR REST API |

---

## Linux Scan Server Setup

The Linux scan server is where VM disks are mounted and scanned. This server must be accessible via SSH from your desktop.

### Supported Distribution

- Rocky Linux 9+

### Required Packages

Install the following packages on the Linux server:

```bash
sudo dnf install -y fuse ntfs-3g
```

### Package Purpose

| Package | Purpose | Required? |
|---------|---------|-----------|
| **fuse** | Required by the Veeam Data Integration API to mount VM disk images | Yes |
| **ntfs-3g** | Read/write access to Windows NTFS disks | Yes (for Windows VMs) |
| **zfs** | ZFS filesystem support | Optional |

### SSH Configuration

Ensure SSH is running and accessible:

```bash
# Check SSH service status
sudo systemctl status sshd

# Enable and start if not running
sudo systemctl enable --now sshd
```

### Recommended User

Create a dedicated user for vScan with the necessary permissions:

```bash
# Create user
sudo useradd -m -s /bin/bash vscan

# Add to required groups
sudo usermod -aG fuse,disk vscan

# Set password
sudo passwd vscan
```

> **Note:** The user needs permission to mount filesystems and access block devices. Alternatively, you can use an existing user with `sudo` privileges.

### Firewall Rules

| Port | Protocol | Purpose |
|------|----------|---------|
| 22 (or custom) | TCP | SSH access from desktop to scan server |

---

## Installing Vulnerability Scanners

vScan installs scanners automatically from the UI. Manual installation is not required.

### Automatic installation (recommended)

1. Open **Settings > SSH** in vScan
2. Connect to the Linux server
3. Click **Install** next to the desired scanner
4. vScan downloads, verifies integrity (SHA-256), and installs the scanner automatically

**Pinned versions:**

| Scanner | Version | Notes |
|---|---|---|
| Trivy | v0.58.0 | Linux and container scanner |
| Grype | v0.86.1 | Multi-language and SBOM scanner |
| Jadi | v0.1.0 | Windows/.NET scanner |

Prerequisites (`tar`, `curl`, `jq`) are also auto-installed if not already present on the server.

---

## Installing vScan Desktop Application

### Windows

1. Download `vScan-2.0.0-setup.exe` from the releases page
2. Run the installer
3. Follow the installation wizard
4. Launch vScan from the Start Menu or desktop shortcut

> **Note:** Windows Defender or your antivirus may flag the installer since it is not code-signed. Click **More info** > **Run anyway** if prompted.

### macOS

1. Download `vScan-2.0.0.dmg` from the releases page
2. Open the DMG file
3. Drag **vScan** to the **Applications** folder
4. **Important:** Before opening the app for the first time, run this command in Terminal:
   ```bash
   xattr -cr /Applications/vScan\ Vulnerability\ Scanner.app
   ```
5. Launch vScan from Applications

> **Note:** macOS marks apps downloaded from the internet as "damaged" if they are not signed with an Apple Developer certificate. The `xattr -cr` command removes this quarantine flag. This is safe and only needed once after installation or update.

---

## First Launch

When you launch vScan for the first time:

1. The application opens with the **Security Setup Wizard**
2. You will create a master password (minimum 12 characters)
3. You will receive a one-time recovery key -- **save it securely**
4. Optionally enable biometric unlock (Touch ID / Windows Hello)

See [Getting Started](GETTING-STARTED.md) for the complete first-time setup walkthrough.

---

## Updating vScan

To update vScan:

1. Download the latest installer from the releases page
2. Run the installer -- it will upgrade the existing installation
3. Your settings, scan history, and credentials are preserved in the SQLite database

---

## Uninstalling

### Windows

1. Open **Settings** > **Apps** > **Installed apps**
2. Find **vScan** and click **Uninstall**

### macOS

1. Drag **vScan** from **Applications** to the **Trash**
2. Remove data and logs:
   ```bash
   rm -rf ~/Library/Application\ Support/vScan-Vulnerability
   rm -rf ~/Library/Logs/com.vscan.vulnerabilityscanner
   ```
3. Remove Keychain entries (optional — clears stored encryption keys):
   ```bash
   security delete-generic-password -s "com.24xsiempre.vscan" -a "encryption-master-key" 2>/dev/null
   security delete-generic-password -s "com.24xsiempre.vscan" -a "hkdf-salt" 2>/dev/null
   ```
