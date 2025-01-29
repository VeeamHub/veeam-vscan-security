import type { Vulnerability } from '@/types/vscan';

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateStr);
      return 'N/A';
    }
    
    const formatter = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York'
    });

    return formatter.format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
};

async function getAllVulnerabilities(filters?: Record<string, any>): Promise<Vulnerability[]> {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append('exportAll', 'true');

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '' && value !== 'all' && value !== 'undefined') {
          queryParams.append(key, value.toString());
        }
      });
    }

        
    const response = await fetch(`http://localhost:3001/api/scanner/vulnerabilities/export?${queryParams}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || 'Failed to fetch vulnerabilities for export');
    }

    const data = await response.json();    

    return data.vulnerabilities || [];
    
  } catch (error) {
    console.error('Error fetching vulnerabilities for export:', error);
    throw error;
  }
}

export function groupVulnerabilities(vulnerabilities: Vulnerability[]) {
  const grouped = vulnerabilities.reduce((acc, vuln) => {
    if (!acc[vuln.cve]) {
      acc[vuln.cve] = {
        cve: vuln.cve,
        severity: vuln.severity,
        packageName: vuln.packageName,
        installedVersion: vuln.installedVersion,
        fixedVersion: vuln.fixedVersion || 'N/A',
        description: vuln.description || 'N/A',
        firstDiscovered: vuln.discovered,
        lastSeen: vuln.lastSeen,
        affectedServers: new Set([vuln.vmName]),
        scanners: new Set([vuln.scannerType || 'N/A']),
        status: vuln.status || 'pending'
      };
    } else {
      acc[vuln.cve].affectedServers.add(vuln.vmName);
      if (vuln.scannerType) acc[vuln.cve].scanners.add(vuln.scannerType);
      
      if (vuln.discovered) {
        const currentFirst = new Date(acc[vuln.cve].firstDiscovered);
        const newFirst = new Date(vuln.discovered);
        if (isNaN(currentFirst.getTime()) || newFirst < currentFirst) {
          acc[vuln.cve].firstDiscovered = vuln.discovered;
        }
      }
      
      if (vuln.lastSeen) {
        const currentLast = new Date(acc[vuln.cve].lastSeen);
        const newLast = new Date(vuln.lastSeen);
        if (isNaN(currentLast.getTime()) || newLast > currentLast) {
          acc[vuln.cve].lastSeen = vuln.lastSeen;
        }
      }
    }
    return acc;
  }, {} as Record<string, any>);

  return Object.values(grouped);
}

export async function generateDetailedCSV(filters?: Record<string, any>): Promise<string> {
  const vulnerabilities = await getAllVulnerabilities(filters);
  
  const headers = [
    'CVE',
    'Severity',
    'Server Name',
    'Package Name',
    'Installed Version',
    'Fixed Version',
    'Description',
    'Discovered',
    'Last Seen',
    'Scanner',
    'Status',
    'CISA KEV'
  ].join(',');

  const rows = vulnerabilities.map(vuln => {
    const row = [
      `"${vuln.cve}"`,
      `"${vuln.severity}"`,
      `"${vuln.vmName}"`,
      `"${vuln.packageName}"`,
      `"${vuln.installedVersion}"`,
      `"${vuln.fixedVersion || ''}"`,
      `"${(vuln.description || '').replace(/"/g, '""')}"`,
      `"${formatDate(vuln.discovered)}"`,
      `"${formatDate(vuln.lastSeen)}"`,
      `"${vuln.scannerType || ''}"`,
      `"${vuln.status || 'pending'}"`,
      `"${vuln.inCisaKev ? 'Yes' : 'No'}"`
    ];
    return row.join(',');
  });

  return [headers, ...rows].join('\n');
}

export async function generateGroupedCSV(filters?: Record<string, any>): Promise<string> {
  const vulnerabilities = await getAllVulnerabilities(filters);
  const groupedData = groupVulnerabilities(vulnerabilities);
  
  const headers = [
    'CVE',
    'Severity', 
    'Package Name',
    'Version',
    'Fixed Version',
    'Description',
    'First Discovered',
    'Last Seen',
    'Affected Servers',
    'Server Count',
    'Scanners',
    'Status',
    'CISA KEV'
  ].join(',');
 
  const rows = groupedData.map(vuln => {
    const row = [
      `"${vuln.cve}"`,
      `"${vuln.severity}"`,
      `"${vuln.packageName}"`,
      `"${vuln.installedVersion}"`,
      `"${vuln.fixedVersion}"`,
      `"${(vuln.description || '').replace(/"/g, '""')}"`,
      `"${formatDate(vuln.firstDiscovered)}"`,
      `"${formatDate(vuln.lastSeen)}"`, 
      `"${Array.from(vuln.affectedServers).join('; ')}"`,
      vuln.affectedServers.size,
      `"${Array.from(vuln.scanners).join('; ')}"`,
      `"${vuln.status}"`,
      `"${vuln.inCisaKev ? 'Yes' : 'No'}"`
    ];
    return row.join(',');
  });
 
  return [headers, ...rows].join('\n');
 } 
 
 function generateSeverityChart(vulnerabilities: any[]): string {
  const severityCounts = vulnerabilities.reduce((acc, vuln) => {
    acc[vuln.severity] = (acc[vuln.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
 
  const chartData = {
    labels: Object.keys(severityCounts),
    datasets: [{
      data: Object.values(severityCounts),
      backgroundColor: [
        '#DC2626', 
        '#EA580C', 
        '#EAB308', 
        '#22C55E'  
      ]
    }]
  };
 
  return `
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <div style="width: 600px; margin: 2rem auto;">
      <canvas id="severityChart"></canvas>
    </div>
    <script>
      new Chart(document.getElementById('severityChart'), {
        type: 'doughnut',
        data: ${JSON.stringify(chartData)},
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'bottom'
            },
            title: {
              display: true,
              text: 'Vulnerabilities by Severity'
            }
          }
        }
      });
    </script>
  `;
 }
 
function generateStats(data: any[]): string {
  const totalVulns = data.length;
  const bySeverity = data.reduce((acc, vuln) => {
    acc[vuln.severity] = (acc[vuln.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
 
  const uniquePackages = new Set(data.map(v => v.packageName)).size;
  const uniqueServers = new Set(data.map(v => 'affectedServers' in v ? Array.from(v.affectedServers) : [v.vmName]).flat()).size;
 
  return `
    <div class="stat-card">
      <h3>Total</h3>
      <p>${totalVulns}</p>
    </div>
    <div class="stat-card">
      <h3>Critical</h3>
      <p>${bySeverity['CRITICAL'] || 0}</p>
    </div>
    <div class="stat-card">
      <h3>High</h3>
      <p>${bySeverity['HIGH'] || 0}</p>
    </div>
    <div class="stat-card">
      <h3>Medium</h3>
      <p>${bySeverity['MEDIUM'] || 0}</p>
    </div>
    <div class="stat-card">
      <h3>Low</h3>
      <p>${bySeverity['LOW'] || 0}</p>
    </div>
    <div class="stat-card">
      <h3>Unique Packages</h3>
      <p>${uniquePackages}</p>
    </div>
    <div class="stat-card">
      <h3>Affected Servers</h3>
      <p>${uniqueServers}</p>
    </div>
  `;
 } 
 
 export async function generateDetailedHTML(filters?: Record<string, any>): Promise<string> {
  const vulnerabilities = await getAllVulnerabilities(filters);
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Detailed Vulnerability Report</title>
      <style>
        body {
          font-family: -apple-system, system-ui, sans-serif;
          line-height: 1.5;
          margin: 2rem;
          color: #374151;
        }
        .header {
          margin-bottom: 2rem;
        }
        .header h1 {
          color: #111827;
          margin-bottom: 0.5rem;
        }
        .header p {
          color: #6B7280;
          margin: 0;
        }
        .cisa-badge {
          background-color: #dc2626;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-weight: bold;
          margin-left: 8px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin: 2rem 0;
        }
        .stat-card {
          background: #FFF;
          border: 1px solid #E5E7EB;
          border-radius: 0.5rem;
          padding: 1rem;
          text-align: center;
        }
        .stat-card h3 {
          margin: 0;
          color: #6B7280;
          font-size: 0.875rem;
          text-transform: uppercase;
        }
        .stat-card p {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0.5rem 0;
        }
        .vulnerabilities {
          border: 1px solid #E5E7EB;
          border-radius: 0.5rem;
          overflow: hidden;
          margin-bottom: 1rem;
        }
        .vulnerability-header {
          background: #F9FAFB;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #E5E7EB;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .vulnerability-details {
          padding: 1rem;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          font-size: 0.875rem;
        }
        .detail-group {
          display: grid;
          grid-template-columns: 120px 1fr;
          gap: 0.5rem;
        }
        .detail-label {
          color: #6B7280;
          font-weight: 500;
        }
        .severity {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-weight: 500;
          font-size: 0.75rem;
        }
        .severity-CRITICAL { background: #FEE2E2; color: #991B1B; }
        .severity-HIGH { background: #FFEDD5; color: #9A3412; }
        .severity-MEDIUM { background: #FEF3C7; color: #92400E; }
        .severity-LOW { background: #DCFCE7; color: #166534; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Detailed Vulnerability Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <p>Total Vulnerabilities: ${vulnerabilities.length}</p>
      </div>
 
      ${generateSeverityChart(vulnerabilities)}
 
      <div class="stats-grid">
        ${generateStats(vulnerabilities)}
      </div>
      ${vulnerabilities.map(vuln => `
        <div class="vulnerabilities">
          <div class="vulnerability-header">
            <strong>${vuln.cve}</strong>
            <div class="badges">
        <span class="severity-badge ${vuln.severity.toLowerCase()}">${vuln.severity}</span>
        ${vuln.inCisaKev ? '<span class="cisa-badge">CISA KEV</span>' : ''}
      </div>
            <span class="severity severity-${vuln.severity}">${vuln.severity}</span>
          </div>
          <div class="vulnerability-details">
            <div class="detail-group">
              <span class="detail-label">Server Name</span>
              <span>${vuln.vmName}</span>
            </div>
            <div class="detail-group">
              <span class="detail-label">Package</span>
              <span>${vuln.packageName}</span>
            </div>
            <div class="detail-group">
              <span class="detail-label">Current Version</span>
              <span>${vuln.installedVersion}</span>
            </div>
            <div class="detail-group">
              <span class="detail-label">Fixed Version</span>
              <span>${vuln.fixedVersion || 'N/A'}</span>
            </div>
            <div class="detail-group">
              <span class="detail-label">First Seen</span>
              <span>${formatDate(vuln.discovered)}</span>
            </div>
            <div class="detail-group">
              <span class="detail-label">Last Seen</span>
              <span>${formatDate(vuln.lastSeen)}</span>
            </div>
            <div class="detail-group">
              <span class="detail-label">Scanner</span>
              <span>${vuln.scannerType || 'N/A'}</span>
            </div>
            <div class="detail-group">
              <span class="detail-label">Status</span>
              <span>${vuln.status || 'pending'}</span>
            </div>
          </div>
          ${vuln.description ? `
            <div style="padding: 0 1rem 1rem;">
              <div class="detail-label">Description</div>
              <div style="margin-top: 0.5rem;">${vuln.description}</div>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </body>
    </html>
  `;
 } 
 
 export async function generateGroupedHTML(filters?: Record<string, any>): Promise<string> {
  const vulnerabilities = await getAllVulnerabilities(filters);
  const groupedData = groupVulnerabilities(vulnerabilities);
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Grouped Vulnerability Report</title>
      <style>
        body {
          font-family: -apple-system, system-ui, sans-serif;
          line-height: 1.5;
          margin: 2rem;
          color: #374151;
        }
        .header {
          margin-bottom: 2rem;
        }
        .header h1 {
          color: #111827;
          margin-bottom: 0.5rem;
        }
        .header p {
          color: #6B7280;
          margin: 0;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin: 2rem 0;
        }
        .stat-card {
          background: #FFF;
          border: 1px solid #E5E7EB;
          border-radius: 0.5rem;
          padding: 1rem;
          text-align: center;
        }
        .stat-card h3 {
          margin: 0;
          color: #6B7280;
          font-size: 0.875rem;
          text-transform: uppercase;
        }
        .stat-card p {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0.5rem 0;
        }
        .vulnerabilities {
          border: 1px solid #E5E7EB;
          border-radius: 0.5rem;
          overflow: hidden;
          margin-bottom: 1rem;
        }
        .vulnerability-header {
          background: #F9FAFB;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #E5E7EB;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .vulnerability-details {
          padding: 1rem;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          font-size: 0.875rem;
        }
        .detail-group {
          display: grid;
          grid-template-columns: 120px 1fr;
          gap: 0.5rem;
        }
        .detail-label {
          color: #6B7280;
          font-weight: 500;
        }
        .severity {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-weight: 500;
          font-size: 0.75rem;
        }
        .severity-CRITICAL { background: #FEE2E2; color: #991B1B; }
        .severity-HIGH { background: #FFEDD5; color: #9A3412; }
        .severity-MEDIUM { background: #FEF3C7; color: #92400E; }
        .severity-LOW { background: #DCFCE7; color: #166534; }
        .servers-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .server-tag {
          background: #EFF6FF;
          color: #1D4ED8;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
        }
      </style>
    </head>
    <body>
     <div class="header">
       <h1>Grouped Vulnerability Report</h1>
       <p>Generated: ${new Date().toLocaleString()}</p>
       <p>Total Unique Vulnerabilities: ${groupedData.length}</p>
     </div>

     ${generateSeverityChart(groupedData)}

     <div class="stats-grid">
       ${generateStats(groupedData)}
     </div>

     ${groupedData.map(vuln => `
       <div class="vulnerabilities">
         <div class="vulnerability-header">
           <strong>${vuln.cve}</strong>
           <div class="badges">
        <span class="severity-badge ${vuln.severity.toLowerCase()}">${vuln.severity}</span>
        ${vuln.inCisaKev ? '<span class="cisa-badge">CISA KEV</span>' : ''}
      </div>
           <span class="severity severity-${vuln.severity}">${vuln.severity}</span>
         </div>
         <div class="vulnerability-details">
           <div class="detail-group">
             <span class="detail-label">Package</span>
             <span>${vuln.packageName}</span>
           </div>
           <div class="detail-group">
             <span class="detail-label">Current Version</span>
             <span>${vuln.installedVersion}</span>
           </div>
           <div class="detail-group">
             <span class="detail-label">Fixed Version</span>
             <span>${vuln.fixedVersion || 'N/A'}</span>
           </div>
           <div class="detail-group">
             <span class="detail-label">First Seen</span>
             <span>${formatDate(vuln.firstDiscovered)}</span>
           </div>
           <div class="detail-group">
             <span class="detail-label">Last Seen</span>
             <span>${formatDate(vuln.lastSeen)}</span>
           </div>
           <div class="detail-group">
             <span class="detail-label">Status</span>
             <span>${vuln.status || 'pending'}</span>
           </div>
           <div class="detail-group">
             <span class="detail-label">Scanners</span>
             <span>${Array.from(vuln.scanners).join(', ')}</span>
           </div>
           <div class="detail-group">
             <span class="detail-label">Affected VMs</span>
             <span>${vuln.affectedServers.size}</span>
           </div>
         </div>
         <div style="padding: 0 1rem 1rem;">
           <div class="detail-label">Affected Servers</div>
           <div class="servers-list" style="margin-top: 0.5rem;">
             ${Array.from(vuln.affectedServers).map(server => `
               <span class="server-tag">${server}</span>
             `).join('')}
           </div>
         </div>
         ${vuln.description ? `
           <div style="padding: 0 1rem 1rem;">
             <div class="detail-label">Description</div>
             <div style="margin-top: 0.5rem;">${vuln.description}</div>
           </div>
         ` : ''}
       </div>
     `).join('')}
   </body>
   </html>
 `;
}

export function downloadFile(content: string, filename: string) {
 const blob = new Blob([content], { 
   type: filename.endsWith('.csv') ? 'text/csv;charset=utf-8' : 'text/html;charset=utf-8' 
 });
 const url = window.URL.createObjectURL(blob);
 const link = document.createElement('a');
 link.href = url;
 link.download = filename;
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 window.URL.revokeObjectURL(url);
}