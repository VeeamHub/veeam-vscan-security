# vScan Vulnerability Scanner 1.5.0

**Author**: Marco Escobar marco.escobar@veeam.com

<p align="center"><img src="https://github.com/VeeamHub/veeam-vscan-security/blob/7873a407b5b9ff71196b4853e59b9ab3c90aa4dc/images/Dashboard15.png" alt="vScan Dashboard" style="width:50%; height:auto;"></p

This is an **Open-Source** project created as a Security scanning tool that integrates with Veeam Backup & Replication to perform vulnerability assessments on backup data without needing a full restore. 
It leverages Veeam Data Integration API to mount backup content directly to Linux servers and scan them using open-source security tools [Trivy](https://github.com/aquasecurity/trivy) and [Grype](https://github.com/anchore/grype).
Why is this solution created? In the event of a disaster or security incident, when the Veeam Admin needs to recover a server image (whether it's the latest or a previous copy), they need to know what vulnerabilities exist in that Veeam Backup.
While Veeam can detect malware, ransomware, IoC, etc,  it doesn't detect vulnerabilities. 
For example, Consider these scenarios: What if a Veeam Admin restores a server image that contains a vulnerable version of OpenSSL? What if they restore an image with vulnerabilities in the CISA KEV catalog? 
If the attacker is in the network, they can exploit these vulnerabilities and execute any persistence tool.
With this solution, Veeam Admins (or Security Admins ;) ) can identify vulnerabilities in their Veeam Backups and implement necessary mitigation measures before restore the server to production or exposing it to the internet.

**This is a Desktop Application to be used in the workstation of Veeam Admins or Security Admins.**

### System Requirements

- **Operating System Support**: Windows 10+ (No windows Server support to avoid use of this Application in VBR Server)
- **Software Installed**: Veeam Backup & Replication Console and Veeam Powershell Module
- **Veeam Backup & Replication Version**: 12.x (11 can work but not tested)
- **CPU**: 1 core
- **RAM**: 512 MB
- **Disk**: 500MB
- **Linux Server for Scan**: Rocky Linux 9.x | without Firewall
- **Credentials Linux Server for Scan**: root or user with sudo
- **Ports**: 9392, 22, 587, 3260, 3261, 326x
- **Internet Access**

### Features

**Core Features v1.0**

- Integration with Veeam Data Integration API
- Integration with Security Scanners Trivy / Grype
- Automatic Installation and update of Scanners
- Granular Selection of Backups and Disks to be Analyzed from Veeam Repositories
- Use Linux Server for Scan from VBR Server or use a external Linux Server
- Dashboard with Vulnerability Trends and Severity Distribution
- Vulnerability list integrated with NIST National Vulnerability Database (NVD) and GitHub Advisory Database
- Verification of CVEs with CISA Known Exploited Vulnerabilities Catalog
- Vulnerabilities Status Tracking
- Vulnerabilities Filter By Severity, Status, Package, Server Name, etc.
- Export Vulnerabilities Details in CSV / HTML
- Email Notifications
- Connection Status

**New Features v1.5.0**

- **Support for Windows OS Backups** - Virtual and Agents (No ReFS Support)
- **Support for Linux/Unix OS Backups** - Virtual and Agents
- Performance improvements for scanning 100+ machines
- Enhanced User Interface with modern design
- Improved Linux Scanner configuration workflow - includes iSCSI and NTFS-3g
- Automatic post-scan cleanup - unmounting of folders and iSCSI sessions
- Operating System detection in Restore Points
- Cancel operations - per machine or all scans
- Enhanced data export to CSV and HTML with better formatting
- Database management - ability to delete vulnerabilities associated with a machine
- Improved scan workflow with queue management
- Enhanced error management with detailed logging
- Improved security - password encryption in memory and database using AES-256-GCM
- Enhanced CISA KEV Catalog mapping to discovered vulnerabilities
- **Dark Mode** for comfortable viewing

### Release Notes

- If the application is recognized as malware, review this link: https://github.com/electron-userland/electron-builder/issues/6474; this version has already been submitted for analysis by Microsoft.

### How To Use

- Open the Application wit Administrator Rights
- Go to Settings and validate if VBR Console and Powershell Module are installed
- If VBR Console and Powershell mOdule are installed, Enter the VBR Credentials.
- After a successful connection, go to Linux Scanner.
- In Linux Scanners, Select a Linux Scanner (Preferred Proxy) from VBR ane enter the credentials. If you dont want use a Linux from VBR you can enter manually a 
  Linux server to connect.
- Then click in "Save & Connect" after a successful test and installation the Connection manager will update the status to Connected.
- If you want configure Email Notification, go to "Notifications" and enter the data, First Test Email, then Save the Config.
- Go to "Scans" Select VBR, in "Select Server" select the server to Scan, then Select Restore point, Disk and "Add to Queue" if you want add multiples 
  servers always add to Queue and then clic in "Mount".
- After the mount Operation, you can select the Scanner, Trivy or Grype, then click "START SCAN".
- When the Scan Finalize, the application will show a Summary, you will se 3 options:
    - Continue Scanning: This option allows to Scan the machines with the other Scanner, if was selected Trivy, you can rescan with Grype.
    - Keep Mounted & View: This option will keep mount the Servers in VBR, then you need manually dismount the servers.
    - Unmount & View Results: This option will unmount all the servers from the Linux Scanner and will show the vulnerabilities found.
- In Vulnerabilities you can Filter by multiple options to analyze the vulnerabilities found or export all Vulnerabilities or Grouped.
    - If you need Remove Vulnerabilities mapped to VM, use "Delete"


## 📗 Documentation

writing....

## TODO



## ✍ Contributions

We welcome contributions from the community! We encourage you to create [issues](https://github.com/VeeamHub/veeam-vscan-security/issues/new/choose) for Bugs & Feature Requests and submit Pull Requests. For more detailed information, refer to our [Contributing Guide](CONTRIBUTING.md).

## 🤝🏾 License

* [MIT License](LICENSE)

## 🤔 Questions

If you have any questions or something is unclear, please don't hesitate to [create an issue](https://github.com/VeeamHub/veeam-vscan-security/issues/new/choose) and let us know!
# vScan
