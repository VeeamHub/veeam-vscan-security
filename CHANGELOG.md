# Changelog

All notable changes to vScan will be documented in this file.

---

## [2.0.0] — 2026-04-03

### Initial Public Release

vScan v2.0.0 is the first public release of the vulnerability scanner for Veeam Backup & Replication.

### Features

**Scanning**
- Single VM scan with guided 5-step wizard
- Batch scanning with configurable parallelism and retry
- Scheduled scans with cron expressions and timezone support
- Three scanner support: Trivy, Grype, and Jadi
- Scanner installation, update, and uninstall from the UI (SHA-256 verified)
- Scan comparison between restore points or scanners
- Real-time progress tracking with ETA
- Cancel support for individual and batch scans

**Vulnerability Management**
- Vulnerability browser with advanced filtering (severity, status, VM, package, date, KEV)
- Lifecycle tracking: open, fixed, won't fix, accepted, false positive
- Automatic status transitions (auto-fix when no longer detected)
- Per-scan detection history (audit trail)
- Bulk status operations
- CISA KEV catalog integration with auto-sync every 24 hours

**Reporting**
- CSV export (up to 50,000 rows)
- PDF executive report (cover page, risk score, severity charts, top findings, KEV highlights)
- PDF technical report (detailed vulnerability listing by VM/severity)
- Customizable branding: company name, logo, title, classification, colors

**Dashboard**
- Severity distribution chart
- Vulnerability trend over time
- Top vulnerable VMs ranking
- Recent scans with real-time updates
- KEV alerts counter
- Scan statistics

**Security**
- Master password with Argon2id hashing + AES-256-GCM encryption
- Biometric unlock: Touch ID / Face ID (macOS), Windows Hello (Windows)
- Auto-lock with configurable timeout and lock-on-minimize
- One-time recovery key (VSCAN-XXXX format)
- Exponential brute-force protection (up to 5-minute delay)
- VBR certificate TOFU pinning (SHA-256)
- SSH host key TOFU verification
- OS Keychain integration (macOS Keychain, Windows Credential Manager)
- Password blacklist (~600 common breached passwords)
- Sensitive data zeroization in memory
- CSP policy with frozen prototype

**Notifications**
- Desktop notifications (native OS)
- Email notifications via SMTP (STARTTLS/SSL)
- 6 configurable event types: scan completed, scan failed, batch completed, schedule started, KEV found, critical vulnerabilities
- Session report email with per-VM summary

**Integration**
- Veeam Backup & Replication v13+ REST API
- SSH connections with password or key authentication
- Auto-reconnect on connection drop
- Import Linux servers from VBR managed servers
- Veeam Data Integration API for backup mounting on Linux scan server

**User Interface**
- System tray with full menu (schedules, recent scans, settings, lock, logs)
- Dark/light mode toggle
- Database maintenance (VACUUM + ANALYZE, data retention)

### Supported Platforms

| Platform | Minimum Version | Architectures |
|----------|----------------|---------------|
| macOS | 13.0 (Ventura) | Apple Silicon arm64 |
| Windows | 10 (1803+) | x86_64 |

