# vScan Vulnerability Scanner 1.0.0
**Author**: Marco Escobar marco.escobar@veeam.com

This is an **open-source** project created as a Security scanning tool for Desktops that integrates with Veeam Backup & Replication to perform vulnerability assessments on backup data without needing a full restore. 
It leverages Veeam Data Integration API to mount backup content directly to Linux servers and scan them using open-source security tools [Trivy](https://github.com/aquasecurity/trivy) and [Grype](https://github.com/anchore/grype).
Why is this solution created? In the event of a disaster or security incident, when the Veeam Admin needs to recover a server image (whether it's the latest or a previous copy), they need to know what vulnerabilities exist in that Veeam Backup.
While Veeam can detect malware, ransomware, IoC, etc,  it doesn't detect vulnerabilities. 
For example, Consider these scenarios: What if a Veeam Admin restores a server image that contains a vulnerable version of OpenSSL? What if they restore an image with vulnerabilities in the CISA KEV catalog? 
If the attacker is in the network, they can exploit these vulnerabilities and execute any persistence tool.
With this solution, Veeam Admins (or Security Admins) can identify vulnerabilities in their Veeam Backups and implement necessary mitigation measures before deploying the data to production or exposing it to the internet.

### System Requirements

Operating System Support: Windows 10+
Veeam Backup & Replication Version: 12.x (11 can work but not tested)
Backups Support: Only Backups with Linux Operating System and backups from vSphere
CPU: 1 core
RAM: 512 MB
Disk: 500MB



## 📗 Documentation

_Place documentation or links to documentation here._

## ✍ Contributions

We welcome contributions from the community! We encourage you to create [issues](https://github.com/VeeamHub/{repo-name}/issues/new/choose) for Bugs & Feature Requests and submit Pull Requests. For more detailed information, refer to our [Contributing Guide](CONTRIBUTING.md).

## 🤝🏾 License

* [MIT License](LICENSE)

## 🤔 Questions

If you have any questions or something is unclear, please don't hesitate to [create an issue](https://github.com/VeeamHub/{repo-name}/issues/new/choose) and let us know!
