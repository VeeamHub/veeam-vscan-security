# User Guide

Complete reference for all vScan v2.0.0 features and workflows.

## Table of Contents

1. [Dashboard](#1-dashboard)
2. [Single Scan](#2-single-scan)
3. [Batch Scan](#3-batch-scan)
4. [Scheduled Scans](#4-scheduled-scans)
5. [Vulnerability Browser](#5-vulnerability-browser)
6. [Exports & Reports](#6-exports--reports)
7. [Settings](#7-settings)
8. [Security](#8-security)
9. [System Tray](#9-system-tray)
10. [Scan Comparison](#10-scan-comparison)

---

## 1. Dashboard

The dashboard is the home screen, providing an overview of your vulnerability posture.

### Widgets

| Widget | Description |
|--------|-------------|
| **Severity Distribution** | Donut chart showing CRITICAL, HIGH, MEDIUM, LOW, NEGLIGIBLE counts |
| **Vulnerability Trend** | Line chart showing vulnerability counts over time |
| **Recent Scans** | Table of the most recent scan executions with status |
| **Top Vulnerable VMs** | Ranked list of VMs by total vulnerability count |
| **KEV Alerts** | Count of vulnerabilities matching CISA KEV catalog |
| **Scan Statistics** | Total scans, VMs scanned, average vulnerabilities per scan |

### Interactivity

- Click any chart segment to filter the vulnerability browser by that criteria
- Click a recent scan to view its full results
- Click a VM name to see all vulnerabilities for that VM
- Dashboard data refreshes automatically when new scans complete

---

## 2. Single Scan

Navigate to **Scans** in the sidebar. The scan wizard guides you through five steps.

### Step 1: Select VM

- VMs are loaded from VBR backup jobs
- Search by name using the search bar
- VMs display their backup job name and last backup date
- Click a VM to select it and proceed

### Step 2: Select Restore Point

- Available restore points are listed with date, time, and job name
- Most recent restore point is highlighted
- Select the desired restore point

### Step 3: Select Disks

- All virtual disks in the restore point are listed
- Each disk shows its size and label
- Select one or more disks (system disk recommended for vulnerability scanning)
- Multi-disk selection is supported

### Step 4: Scanner Options

| Option | Description |
|--------|-------------|
| **Scanner** | Trivy, Grype, or Jadi |
| **SSH Server** | Which Linux scan server to use |
| **Min Severity** | Filter results to only show this severity and above |
| **Timeout** | Maximum scan duration before timeout |

### Step 5: Execute

- Click **Start Scan** to begin
- Progress indicator shows: Publishing > Mounting > Scanning > Collecting > Unmounting
- Results appear automatically on completion
- If any step fails, an error message is shown with the option to retry

### Scan Results View

Summary bar with severity counts, sortable vulnerability table (CVE, Package, Version, Fixed Version, Severity, KEV), and clickable CVEs for full details.

---

## 3. Batch Scan

Navigate to **Batch** in the sidebar to scan multiple VMs in a single operation.

### Creating a Batch Scan

1. Click **New Batch Scan**
2. **Select source:**
   - **Backup Job** -- Select a VBR backup job; all VMs in the job are included
   - **Manual Selection** -- Pick individual VMs from the full list
3. **Configure execution:**

| Setting | Description |
|---------|-------------|
| **Batch Name** | Descriptive name for this batch |
| **Execution Mode** | Sequential (one at a time) or Parallel |
| **Parallel Limit** | Configurable number of simultaneous scans (parallel mode only) |
| **Timeout per item** | Maximum time per VM: 5-120 minutes |
| **Retries** | Retry attempts if a VM fails: 0-3 |
| **Scanner** | Trivy, Grype, or Jadi |
| **SSH Server** | Linux scan server to use |

4. Click **Start Batch**

### Monitoring Progress

- **Batch overview** shows overall progress (X of Y completed)
- **Per-VM status:** pending, mounting, scanning, completed, failed
- **Real-time events** update the UI as each VM progresses
- **Error handling:** failed VMs show error details; other VMs continue

### Batch History

All batch executions are stored with timestamps, VM counts, and per-item results accessible from the detail view.

---

## 4. Scheduled Scans

Navigate to **Schedules** in the sidebar to create automated recurring scans.

### Creating a Schedule

1. Click **New Schedule**
2. Configure:

| Field | Description |
|-------|-------------|
| **Name** | Schedule name |
| **Cron Expression** | Standard cron format (e.g., `0 2 * * 1` for Monday at 2 AM) |
| **Target** | Backup job or manual VM list |
| **Scanner** | Trivy, Grype, or Jadi |
| **SSH Server** | Linux scan server |
| **Enabled** | Toggle to activate/deactivate |

3. Click **Save Schedule**

### Cron Format Reference

```
* * * * *
| | | | |
| | | | +-- Day of week (0-7, Sunday=0 or 7)
| | | +---- Month (1-12)
| | +------ Day of month (1-31)
| +-------- Hour (0-23)
+---------- Minute (0-59)
```

**Examples:**

| Expression | Meaning |
|------------|---------|
| `0 2 * * *` | Daily at 2:00 AM |
| `0 3 * * 1` | Every Monday at 3:00 AM |
| `0 0 1 * *` | First day of each month at midnight |
| `0 6 * * 1-5` | Weekdays at 6:00 AM |

### Schedule Management

- **View** all schedules in a list with next run time
- **Edit** any schedule's configuration
- **Enable/Disable** toggle without deleting
- **Delete** a schedule permanently
- **Execution History** -- See all past runs with status and results

### How Schedules Run

The backend checks `next_run_at` periodically. When triggered, a batch scan is automatically created and executed using the schedule's configuration. Results are stored, notifications sent (if configured), and `next_run_at` is updated.

---

## 5. Vulnerability Browser

Navigate to **Vulnerabilities** in the sidebar for a comprehensive view of all detected vulnerabilities.

### Filters

| Filter | Options |
|--------|---------|
| **VM Name** | Dropdown with all scanned VMs |
| **Severity** | CRITICAL, HIGH, MEDIUM, LOW, NEGLIGIBLE, UNKNOWN |
| **Status** | Open, Fixed, Won't Fix, Accepted, False Positive |
| **CVE ID** | Text search |
| **Package** | Text search |
| **KEV Only** | Toggle to show only CISA KEV matches |
| **Date Range** | Filter by first detected or last seen date |
| **Scanner** | Filter by scanner used |

### Vulnerability Table

| Column | Description |
|--------|-------------|
| **CVE** | CVE identifier (clickable for NVD details) |
| **Severity** | Color-coded severity badge |
| **Package** | Affected package name |
| **Installed** | Currently installed version |
| **Fixed** | Version that fixes the vulnerability |
| **VM** | VM where detected |
| **First Detected** | Date the vulnerability was first found |
| **Last Seen** | Date of the most recent detection |
| **Status** | Current status with change option |
| **KEV** | Badge if in CISA KEV catalog |

### Expanded Detail

Click a row to expand and see: CVSS score (if available), full vulnerability description, references and links (NVD, vendor advisory), fixed version and recommendation, detection history (first seen, last seen, scans where it appeared), and affected VMs with specific version of each.

### Status Management

Right-click or use the action menu on any vulnerability to change its status:

- **Open** -- Active vulnerability requiring attention
- **Fixed** -- Vulnerability has been remediated (auto-set when no longer detected)
- **Won't Fix** -- Accepted risk; will not be remediated
- **Accepted** -- Acknowledged and accepted by the team
- **False Positive** -- Incorrectly identified; excluded from counts

### Lifecycle Tracking

vScan tracks each vulnerability uniquely by (VM name + CVE ID + package + version):

- **First Detected** -- When the vulnerability first appeared in any scan
- **Last Seen** -- The most recent scan where the vulnerability was found
- **Fixed Date** -- When the vulnerability was no longer detected (auto-set)
- **Detection History** -- Full audit trail of every scan where the vulnerability was seen

## 6. Exports & Reports

### CSV Export

1. Apply desired filters in the Vulnerability Browser
2. Click **Export CSV**
3. The CSV includes all visible columns plus additional metadata
4. Fields are properly escaped for spreadsheet compatibility

### PDF Executive Report

1. Click **Export PDF** > **Executive Report**
2. The report includes:
   - Cover page with company branding (if configured)
   - Scan summary with date and scope
   - Severity distribution chart
   - Top 10 most critical findings
   - Remediation priority summary
   - KEV-flagged vulnerabilities highlighted

### PDF Technical Report

1. Click **Export PDF** > **Technical Report**
2. The report includes:
   - Complete vulnerability listing
   - Full package details and versions
   - CVE descriptions and references
   - Remediation guidance per vulnerability
   - Grouped by VM and severity

### Branding

Configure branding in **Settings > Branding**:

| Setting | Description |
|---------|-------------|
| **Company Name** | Appears in report headers and footers |
| **Company Logo** | PNG or JPG image for report cover pages |

## 7. Settings

Access settings from the **Settings** icon in the sidebar. Configuration is organized into five tabs.

### Tab 1: VBR (Veeam Backup & Replication)

| Setting | Description |
|---------|-------------|
| **Server Address** | VBR server hostname or IP |
| **Port** | REST API port (default 9419) |
| **Username** | Account with Restore Operator role |
| **Password** | Encrypted at rest |
| **Accept Self-Signed Certs** | Skip TLS verification |
| **Test Connection** | Verify connectivity and credentials |

### Tab 2: SSH

Manage Linux scan server connections:

- **Add Connection** -- New SSH server (from VBR or manual)
- **Edit** -- Modify existing connection
- **Delete** -- Remove connection
- **Test** -- Verify SSH connectivity
- **Scanner Detection** -- Auto-detect installed scanners

Each connection shows: name, host, port, user, authentication type, detected scanners.

> **Note:** SSH connections feature automatic reconnection if the connection drops.

### Scanner Management from the UI

Install, update, and uninstall scanners (Trivy, Grype, Jadi) directly from the Settings > SSH panel -- no manual SSH access needed. All installations use SHA-256 integrity verification. Pinned versions: Trivy v0.58.0, Grype v0.86.1, Jadi v0.1.0.

### Tab 3: Scanner

| Setting | Description |
|---------|-------------|
| **Default Scanner** | Preferred scanner for new scans |
| **Default Severity** | Minimum severity threshold |
| **Scan Timeout** | Default timeout for scan operations |
| **KEV Catalog** | Update CISA KEV database; shows last update date |

### Tab 4: Notifications

**Email (SMTP):**

| Setting | Description |
|---------|-------------|
| **SMTP Server** | Mail server hostname |
| **Port** | SMTP port (25, 465, 587) |
| **Username** | SMTP authentication |
| **Password** | SMTP password (encrypted) |
| **TLS/SSL** | Encryption mode |
| **From Address** | Sender email |
| **To Address(es)** | Recipient(s), comma-separated |
| **Test Email** | Send a test message |

**Notification Preferences:**

| Event | Email | Desktop |
|-------|-------|---------|
| Scan completed | Toggle | Toggle |
| Scan failed | Toggle | Toggle |
| Batch completed | Toggle | Toggle |
| Schedule started | Toggle | Toggle |
| New critical vulnerabilities | Toggle | Toggle |
| KEV vulnerability detected | Toggle | Toggle |

### Tab 5: Branding

| Setting | Description |
|---------|-------------|
| **Company Name** | Used in PDF reports and CSV headers |
| **Company Logo** | Image file for PDF report covers |
| **Preview** | See how branding appears in reports |

---

## 8. Security

### Master Password

- Required on every application launch (unless biometric is enabled)
- Protects all stored credentials (VBR, SSH, SMTP)
- Can be changed in **Settings > Security** (requires current password)
- Minimum 12 characters with strength requirements

### Biometric Unlock

- **macOS:** Touch ID, Face ID
- **Windows:** Windows Hello (fingerprint, face, PIN)
- Enable/disable in **Settings > Security**
- Requires master password confirmation to enable
- Falls back to master password if biometric fails

### Auto-Lock

| Setting | Description |
|---------|-------------|
| **Timeout** | Lock after N minutes of inactivity (default: 5) |
| **Lock on Minimize** | Lock when the application is minimized |
| **Disable Auto-Lock** | Keep unlocked (not recommended) |

Configure in **Settings > Security**.

### Recovery Key

- One-time display during initial setup
- Format: `VSCAN-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX`
- Used to reset master password if forgotten
- Cannot be retrieved after initial display

### Brute Force Protection

vScan implements exponential delays on failed password attempts:

| Failed Attempts | Wait Time |
|----------------|-----------|
| 1-2 | None |
| 3-5 | 1s, 2s, 4s (exponential) |
| 6-8 | 8s, 16s, 32s |
| 9-10 | 64s, 128s |
| 11+ | 300 seconds (5 minutes max) |

### VBR Certificate Pinning (TOFU)

vScan uses Trust On First Use for VBR TLS certificates. The SHA-256 fingerprint is stored on first connection and verified on subsequent connections. Certificate changes trigger an alert with both fingerprints for review.

### Session Report Email

After a scan completes, vScan can send a consolidated HTML email with per-VM summary (vulnerability counts by severity). Requires SMTP and email notifications enabled.

### Encryption Details

- **Algorithm:** AES-256-GCM (authenticated encryption)
- **Key Derivation:** Argon2id with per-credential salts
- **Keychain:** OS-native keychain for master key persistence
- **Memory:** Sensitive data zeroized after use

---

## 9. System Tray

vScan can minimize to the system tray for background operation.

### Tray Menu Options

| Option | Description |
|--------|-------------|
| **Show vScan** | Restore the main window |
| **Lock vScan** | Lock the application (only when unlocked) |
| **Status** | Shows current state: Idle, Scanning, etc. (informational) |
| **Schedules** | Submenu: next scheduled scan time, enable/disable all schedules |
| **Recent Scans** | Submenu: recent scan results, "View All..." link |
| **Settings...** | Open the settings page |
| **Documentation** | Open documentation in browser |
| **Report Issue** | Open issue tracker in browser |
| **Open Logs Folder** | Open the application logs directory |
| **Quit vScan** | Close vScan completely |

### Tray Behavior

- **Minimize to tray:** Close button minimizes to tray instead of quitting
- **Scan status:** Tray status text updates during active scans
- **Background schedules:** Scheduled scans run even when minimized to tray

### Dark Mode

Toggle between light and dark themes using the sun/moon icon in the sidebar. The preference persists across sessions.

### Tray Configuration

| Setting | Description |
|---------|-------------|
| **Start minimized** | Launch vScan minimized to tray |
| **Close to tray** | Minimize to tray on close instead of quitting |
| **Show tray notifications** | Display desktop notifications from tray |

---

## 10. Scan Comparison

Compare vulnerability results between two scan dates to track changes over time.

### How to Compare

1. Navigate to **Scans** in the sidebar
2. Select a VM that has been scanned at least twice
3. Click **Compare Scans**
4. Select the **baseline scan** (earlier date)
5. Select the **comparison scan** (later date)
6. Click **Compare**

### Comparison Results

The comparison view shows three categories:

| Category | Description |
|----------|-------------|
| **New Vulnerabilities** | Found in comparison scan but not in baseline |
| **Fixed Vulnerabilities** | Found in baseline but not in comparison scan |
| **Unchanged** | Present in both scans |

Each category shows total count with severity breakdown and color-coded indicators (red=new, green=fixed, gray=unchanged). Useful for remediation verification, drift detection, compliance tracking, and scanner evaluation.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + L` | Lock application |
| `Ctrl/Cmd + F` | Focus search/filter |
| `Ctrl/Cmd + N` | New scan |
| `Ctrl/Cmd + B` | New batch scan |
| `Escape` | Close dialog / cancel |

## Tips & Best Practices

- Update scanner databases and KEV catalog **weekly** for accurate results
- Use **batch scans** and **schedules** for routine multi-VM scanning
- Review **CRITICAL** and **KEV** vulnerabilities first -- highest risk
- Use **scan comparison** after patching to verify remediation
- Configure **email notifications** for scan completion/failure alerts
- **Back up your database** periodically; use **multiple scanners** for full coverage
