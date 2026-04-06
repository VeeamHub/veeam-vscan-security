# Frequently Asked Questions

---

## Table of Contents

1. [Connection](#connection)
2. [Scanning](#scanning)
3. [Security](#security)
4. [Reports & Exports](#reports--exports)
5. [Performance](#performance)
6. [CISA KEV Catalog](#cisa-kev-catalog)
7. [Maintenance](#maintenance)
8. [Notifications](#notifications)

---

## Connection

### Q: vScan cannot connect to my VBR server. What should I check?

1. Verify the VBR server address and port (default 9419)
2. Ensure the **Veeam Backup RESTful API Service** is running on the VBR server
3. Check firewall rules between your desktop and the VBR server on port 9419
4. If using HTTPS with a self-signed certificate, enable **Accept Self-Signed Certificates** in the connection settings
5. Verify your credentials and ensure the account has at least **Restore Operator** permissions

### Q: What user permissions does the VBR account need?

The VBR account must have at least the **Restore Operator** role to access restore points and publish them via the Data Integration API. An Administrator role also works.

### Q: SSH connection fails with "Host key verification failed." What do I do?

This means the server's SSH fingerprint has changed since you first connected. This can happen if:
- The server was reinstalled
- The SSH host keys were regenerated
- A different server is responding on that address (potential security issue)

To resolve: delete the SSH connection in **Settings > SSH** and re-add it. You will be prompted to accept the new fingerprint.

### Q: Can I use SSH key authentication instead of a password?

Yes. When adding an SSH connection, select **SSH Key** as the authentication method and provide the private key. Both PEM and OpenSSH key formats are supported.

### Q: Does vScan support multi-factor authentication for VBR?

vScan connects via the VBR REST API using username and password credentials. MFA is not currently supported for the VBR connection. Use a service account with appropriate permissions.

---

## Scanning

### Q: How does vScan mount backup disks?

vScan uses the **Veeam Data Integration API** to publish restore points on the Linux scan server. The API uses FUSE to mount VM disk images in userspace. The required FUSE package is auto-installed by vScan on the Linux server. The entire mount/unmount lifecycle is managed automatically — no manual intervention is needed.

### Q: Can I scan a VM that is currently running?

Yes. vScan scans backup restore points, not live VMs. The live VM is never touched or affected.

### Q: Why does a scan show different results from a direct Trivy/Grype scan?

vScan runs scanners in **rootfs mode** against the mounted backup disk. Results may differ slightly from running the scanner directly on a live system because:
- The backup may be from a different point in time
- Some runtime-only packages may not be visible on the mounted disk
- Scanner database versions may differ

### Q: What happens if a scan fails midway?

vScan handles failures gracefully:
1. The scan is marked as **failed** with an error message
2. Mounted disks are automatically unmounted (cleanup)
3. The VBR restore point session is released
4. You can retry the scan from the Scans page

### Q: How do I install or update scanners from vScan?

You don't need manual SSH access. From **Settings > SSH**, you can:

1. **Install** scanners (Trivy, Grype, Jadi) with SHA-256 integrity verification
2. **Update** each scanner's vulnerability database
3. **Uninstall** scanners you no longer need

vScan automatically detects available scanners when connecting to an SSH server.

### Q: A scan finds no vulnerabilities

1. **Verify the scanner** — Go to Settings > SSH and confirm the scanner shows as "installed"
2. **Choose the right scanner for the disk OS:**
   - **Trivy** — Linux (OS packages, application dependencies). Fastest and most comprehensive for Linux systems
   - **Grype** — Linux (similar to Trivy, useful as a second opinion or for comparison)
   - **Jadi** — Windows and .NET (Windows packages, .NET assemblies, MSI). The only scanner for Windows disks
3. **Scanner database** — It may be outdated. Update from Settings > SSH > "Update DB", or run manually on the Linux server:
   - Trivy: `trivy image --download-db-only`
   - Grype: `grype db update`
   - Jadi: `jadi update-db`
4. **Empty disk** — The restore point may not contain an operating system (data disk)

### Q: Can I scan the same VM with multiple scanners?

Yes. Run separate scans with different scanners on the same VM and restore point. You can then compare results using the Scan Comparison feature.

---

## Security

### Q: Where are my credentials stored?

All credentials (VBR, SSH, SMTP) are stored in a local SQLite database, encrypted with **AES-GCM** using a master key derived from your master password via **Argon2**. The database file is located in:
- **Windows:** `%APPDATA%\vScan-Vulnerability\`
- **macOS:** `~/Library/Application Support/vScan-Vulnerability/`

### Q: What happens if I forget my master password?

Use your **recovery key** (VSCAN-XXXX-XXXX-...) to reset your master password. If you have lost both the master password and recovery key, you will need to reset vScan, which deletes all stored credentials (scan history is preserved).

### Q: How does biometric unlock work?

Biometric unlock (Touch ID / Windows Hello) stores a secure token in the OS Keychain. When you use biometric authentication, the OS releases the token, which vScan uses to decrypt the master key. Your master password is never stored in plaintext.

### Q: What is auto-lock?

Auto-lock automatically locks the application after a configurable period of inactivity (default: 5 minutes). You can also configure it to lock when the application is minimized. Adjust these settings in **Settings > Security**.

### Q: How does VBR certificate verification work?

vScan uses Trust On First Use (TOFU) for VBR TLS certificates. The first time you connect to a VBR server, the certificate's SHA-256 fingerprint is stored. On subsequent connections, vScan verifies the certificate matches. If the certificate changes (e.g., after renewal), you will be prompted to accept the new certificate.

### Q: Is my data sent to any external servers?

No. vScan is a fully local application. All data stays on your machine. The only network connections are:
- To your VBR server (REST API)
- To your Linux scan server (SSH)
- To SMTP server (if email notifications are configured)
- Scanner database updates are performed on the Linux server, not by vScan

---

## Reports & Exports

### Q: What export formats are available?

- **CSV** -- Comma-separated values with all vulnerability details; suitable for spreadsheets and data analysis
- **PDF Executive Report** -- High-level summary with charts, severity distribution, and top findings
- **PDF Technical Report** -- Detailed listing of all vulnerabilities with package information and remediation guidance

### Q: Can I add my company branding to reports?

Yes. Go to **Settings > Branding** to configure:
- **Company name** -- Appears in report headers and footers
- **Company logo** -- Displayed on report cover pages (PNG/JPG, max 2 MB, recommended 300x100 px)

### Q: How do I export vulnerabilities for a specific VM?

1. Go to **Vulnerabilities** in the sidebar
2. Use the filters to select the desired VM, date range, and severity levels
3. Click **Export CSV** or **Export PDF** (executive or technical)

---

## Performance

### Q: How long does a scan take?

Scan duration depends on:
- **Disk size** -- Larger disks take longer to mount and scan
- **Number of packages** -- More installed packages means more vulnerability checks
- **Scanner** -- Trivy is typically fastest; Grype and Jadi are comparable
- **Network speed** -- Between VBR, scan server, and desktop

Typical scan times: 2-10 minutes for a standard server VM.

### Q: How many VMs can I scan in a batch?

There is no hard limit. Batch scans support configurable parallelism. The practical limit depends on your Linux scan server's resources (CPU, RAM, disk I/O) and network bandwidth.

### Q: Does vScan use a lot of disk space?

The vScan application itself is approximately 100 MB. The SQLite database grows with scan history but typically remains under 500 MB even with thousands of scans. Scanner databases (Trivy/Grype) on the Linux server can be 200-500 MB each.

### Q: Can I use multiple Linux scan servers?

Yes. You can configure multiple SSH connections in **Settings > SSH** and choose which server to use for each scan. This is useful for distributing load or scanning across different network segments.

---

## CISA KEV Catalog

### Q: What is the CISA KEV catalog?

The **CISA Known Exploited Vulnerabilities (KEV)** catalog is maintained by the U.S. Cybersecurity and Infrastructure Security Agency. It lists CVEs that are confirmed to be actively exploited in the wild. These vulnerabilities are considered highest priority for remediation.

### Q: How does vScan use the KEV catalog?

vScan downloads and caches the KEV catalog locally. When displaying scan results, vulnerabilities that match a KEV entry are flagged with a **KEV badge**. This helps you prioritize remediation of actively exploited vulnerabilities.

### Q: How often is the KEV catalog updated?

You can update the KEV catalog from **Settings > Scanner**. CISA updates the catalog frequently (often multiple times per week). We recommend updating at least weekly.

---

## Maintenance

### Q: How do I update scanner databases?

Scanner databases can be updated directly from vScan's UI (**Settings > SSH > Update DB**), or manually on the Linux scan server:

```bash
# Update Trivy database
trivy image --download-db-only

# Update Grype database
grype db update

# Update Jadi database
jadi update-db
```

We recommend updating databases at least weekly for accurate results.

### Q: How do I back up my vScan data?

Back up the SQLite database file:
- **Windows:** `%APPDATA%\vScan-Vulnerability\vscan.db`
- **macOS:** `~/Library/Application Support/vScan-Vulnerability/vscan.db`

This file contains all scan history, vulnerability data, and encrypted credentials.

### Q: How do I reset vScan to factory defaults?

Delete the application data directory:
- **Windows:** `%APPDATA%\vScan-Vulnerability\`
- **macOS:** `~/Library/Application Support/vScan-Vulnerability/`

This removes all data including credentials, scan history, and settings. You will need to set up vScan from scratch.

---

## Notifications

### Q: What notification types does vScan support?

- **Desktop notifications** -- Native OS notifications for scan completion, errors, and schedule events
- **Email notifications** -- SMTP-based emails for the same events

### Q: How do I set up email notifications?

1. Go to **Settings > Notifications**
2. Configure SMTP settings:
   - SMTP server address and port
   - Authentication (username/password)
   - TLS/SSL settings
   - Sender and recipient email addresses
3. Click **Send Test Email** to verify
4. Enable desired notification events (scan complete, scan failed, schedule executed)

### Q: Can I send notifications to multiple email addresses?

Yes. Enter multiple recipient addresses separated by commas in the notification settings.

### Q: Why am I not receiving email notifications?

1. Verify SMTP settings are correct (server, port, credentials)
2. Click **Send Test Email** in Settings > Notifications to diagnose
3. Check your spam/junk folder
4. Ensure the notification events you want are enabled in **Notification Preferences**
5. Verify your SMTP server allows the configured sender address
