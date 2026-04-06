# Getting Started

This guide walks you through the complete first-time setup of vScan, from creating your master password to running your first vulnerability scan.

---

## Table of Contents

1. [Step 1: Create Master Password](#step-1-create-master-password)
2. [Step 2: Save Recovery Key](#step-2-save-recovery-key)
3. [Step 3: Set Up Biometric Unlock](#step-3-set-up-biometric-unlock)
4. [Step 4: Connect to VBR Server](#step-4-connect-to-vbr-server)
5. [Step 5: Connect Linux Scan Server](#step-5-connect-linux-scan-server)
6. [Step 6: Run Your First Scan](#step-6-run-your-first-scan)
7. [Understanding Results](#understanding-results)
8. [Next Steps](#next-steps)

---

## Step 1: Create Master Password

When you launch vScan for the first time, the **Security Setup Wizard** appears automatically. The master password protects all stored credentials (VBR, SSH, SMTP).

### Requirements

| Criteria | Requirement |
|----------|-------------|
| **Minimum length** | 12 characters |
| **Character types** | Uppercase, lowercase, numbers, and special characters |
| **Blacklist** | Checked against ~600 common breached passwords |

### Procedure

1. Enter your desired password in the **Master Password** field
2. Observe the real-time **strength indicator** below the field:
   - **Weak** (red) -- Does not meet minimum requirements
   - **Fair** (orange) -- Meets minimum but could be stronger
   - **Strong** (green) -- Good password strength
   - **Very Strong** (dark green) -- Excellent password strength
3. Confirm the password in the **Confirm Password** field
4. Click **Create Master Password**

### How It Works

- Your password is hashed using **Argon2** (memory-hard algorithm resistant to brute force)
- A unique **AES-GCM master encryption key** is generated and encrypted with your password
- The master key is optionally stored in the OS Keychain (macOS Keychain / Windows Credential Manager)
- All future credentials are encrypted using this master key

> **Important:** Choose a strong, unique password. If you forget it, you will need the recovery key to regain access.

---

## Step 2: Save Recovery Key

Immediately after creating your master password, vScan displays a **one-time recovery key**.

### Recovery Key Format

```
VSCAN-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
```

### What to Do

1. **Click the Copy button** to copy the key to your clipboard
2. **Save it in a secure location:**
   - Password manager (recommended)
   - Printed and stored in a safe
   - Encrypted file on a separate device
3. **Confirm** that you have saved the key
4. Click **Continue**

### Critical Information

- This key is displayed **only once** -- it cannot be retrieved later
- The recovery key uses a separate salt and encryption path
- If you forget your master password, this key is the **only way** to recover access
- Without both the master password and recovery key, encrypted credentials **cannot be recovered**

> **Warning:** If you lose both your master password and recovery key, you will need to reset vScan completely, losing all stored credentials.

---

## Step 3: Set Up Biometric Unlock

After saving the recovery key, vScan offers the option to enable biometric authentication.

### Supported Methods

| Platform | Method |
|----------|--------|
| **macOS** | Touch ID, Face ID |
| **Windows** | Windows Hello (fingerprint, face, PIN) |

### Procedure

1. The setup wizard asks if you want to enable biometric unlock
2. Click **Enable Biometric** (or **Skip** to set it up later)
3. Enter your **master password** to confirm
4. Complete the biometric verification on your device
5. A success confirmation appears

### How It Works

- Biometric unlock stores a secure token in the OS Keychain
- When unlocking, the biometric authenticates against the OS, which releases the token
- The token is used to decrypt the master key -- your password is never stored in plaintext
- You can always use the master password as a fallback

### Enable Later

If you skip this step, you can enable biometric unlock at any time:

1. Go to **Settings** > **Security** tab
2. Click **Enable Biometric Unlock**
3. Enter your master password to confirm

---

## Step 4: Connect to VBR Server

After security setup, you need to connect vScan to your Veeam Backup & Replication server.

### Procedure

1. Navigate to **Settings** > **VBR** tab (or follow the setup wizard)
2. Fill in the connection form:

| Field | Description | Example |
|-------|-------------|---------|
| **Server Address** | Hostname or IP of VBR server | `vbr.company.com` or `192.168.1.100` |
| **Port** | REST API port | `9419` (default) |
| **Username** | VBR account with Restore Operator role | `DOMAIN\admin` or `admin` |
| **Password** | Account password | (encrypted at rest) |
| **Accept Self-Signed Certificates** | Skip TLS verification | Enable for lab environments |

3. Click **Test Connection**
4. Wait for validation -- vScan verifies:
   - Network connectivity to the server
   - REST API availability on the specified port
   - Credential authentication
   - API version compatibility
5. On success, click **Save Connection**

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Connection timeout | Verify server address and port; check firewall rules |
| Authentication failed | Verify username format (DOMAIN\user); check account permissions |
| Certificate error | Enable "Accept Self-Signed Certificates" or install a valid cert |
| API not available | Ensure Veeam REST API service is running on the VBR server |

---

## Step 5: Connect Linux Scan Server

The Linux scan server is where VM disks are mounted and scanned. vScan connects via SSH.

### Option A: Select a VBR-Managed Server

If your Linux server is already registered in Veeam as a managed server:

1. Navigate to **Settings** > **SSH** tab
2. Click **Add Connection**
3. In the dialog, select **From VBR Servers**
4. vScan fetches the list of managed Linux servers from VBR
5. Select the desired server
6. Enter SSH credentials (username and password)
7. Click **Test & Save**

### Option B: Enter Server Manually

1. Navigate to **Settings** > **SSH** tab
2. Click **Add Connection**
3. Select **Manual Entry**
4. Fill in the connection form:

| Field | Description | Example |
|-------|-------------|---------|
| **Name** | Friendly name for this server | `Scan Server 01` |
| **Host** | Hostname or IP address | `192.168.1.50` |
| **Port** | SSH port | `22` (default) |
| **Username** | SSH user | `vscan` |
| **Authentication** | Password or SSH Key | Choose one |
| **Password** | SSH password | (encrypted at rest) |

5. Click **Test Connection**

### Trust On First Use (TOFU)

On the first connection to a new server, vScan displays the server's SSH fingerprint:

1. A dialog shows the **server fingerprint** (SHA-256 hash)
2. Verify the fingerprint matches the server's actual key
3. Click **Trust** to accept and store the fingerprint
4. Future connections verify against the stored fingerprint

> **Security Note:** Always verify the fingerprint with your server administrator before accepting it.

### Automatic Scanner Detection

After a successful SSH connection, vScan automatically:

1. Checks which scanners are installed (Trivy, Grype, Jadi)
2. Detects their versions
3. Shows the available scanners in the connection details
4. Stores the configuration for future scans

If no scanners are found, vScan displays a warning. See [Installation](INSTALLATION.md) for scanner installation instructions.

---

## Step 6: Run Your First Scan

With VBR and SSH configured, you can now run your first vulnerability scan.

### Procedure

1. Navigate to **Scans** from the sidebar
2. The **Scan Wizard** opens with these steps:

#### Step 1: Select VM

- vScan loads all VMs from VBR backup jobs
- Use the search bar to find a specific VM
- Click the VM you want to scan

#### Step 2: Select Restore Point

- vScan displays available restore points (dates) for the selected VM
- Each entry shows the date, time, and backup job name
- Select the restore point you want to scan (typically the most recent)

#### Step 3: Select Disks

- vScan lists all virtual disks in the restore point
- Select one or more disks to scan
- System disks (C: for Windows, / for Linux) contain the OS and are the most relevant

#### Step 4: Scanner Options

- Choose the scanner: **Trivy**, **Grype**, or **Jadi**
- Select the SSH server to use for scanning
- Configure options:
  - **Minimum severity** -- Filter results by severity threshold
  - **Scan timeout** -- Maximum time for the scan operation

#### Step 5: Mount & Scan

1. Click **Start Scan**
2. vScan performs the following automatically:
   - Publishes the restore point via VBR Data Integration API
   - Mounts the VM disk(s) on the Linux server via the Veeam Data Integration API
   - Executes the selected scanner against the mounted filesystem
   - Collects and parses results
   - Unmounts the disk(s) and releases the restore point
   - Stores results in the local SQLite database
3. A progress indicator shows each phase
4. On completion, results appear automatically

---

## Understanding Results

After a scan completes, you will see:

### Severity Summary

| Severity | Description |
|----------|-------------|
| **CRITICAL** | Exploitable vulnerabilities with severe impact; patch immediately |
| **HIGH** | Serious vulnerabilities that should be addressed urgently |
| **MEDIUM** | Moderate risk; plan remediation in upcoming maintenance windows |
| **LOW** | Minor risk; address as part of routine patching |
| **NEGLIGIBLE** | Minimal risk; informational |
| **UNKNOWN** | Severity not yet classified by the vendor |

### Vulnerability Details

Each vulnerability entry shows:

- **CVE ID** -- Common Vulnerabilities and Exposures identifier
- **Package** -- The affected software package and version
- **Installed Version** -- Currently installed version
- **Fixed Version** -- Version that resolves the vulnerability (if available)
- **Severity** -- CRITICAL, HIGH, MEDIUM, LOW, NEGLIGIBLE, or UNKNOWN
- **KEV** -- Flag indicating if the CVE is in the CISA Known Exploited Vulnerabilities catalog
- **Status** -- open, fixed, wont_fix, accepted, or false_positive

---

## Next Steps

Now that you have completed your first scan, explore these features:

| Feature | Description | Guide Section |
|---------|-------------|---------------|
| **Batch Scanning** | Scan multiple VMs at once | [User Guide - Batch Scan](USER-GUIDE.md#3-batch-scan) |
| **Scheduled Scans** | Automate recurring scans | [User Guide - Scheduled Scans](USER-GUIDE.md#4-scheduled-scans) |
| **Vulnerability Browser** | Search and filter all findings | [User Guide - Vulnerability Browser](USER-GUIDE.md#5-vulnerability-browser) |
| **Reports** | Export CSV/PDF reports with branding | [User Guide - Exports & Reports](USER-GUIDE.md#6-exports--reports) |
| **Dashboard** | View charts and trends | [User Guide - Dashboard](USER-GUIDE.md#1-dashboard) |
| **Scan Comparison** | Compare results across dates | [User Guide - Scan Comparison](USER-GUIDE.md#10-scan-comparison) |
