import http from 'http';

function waitForServer(name: string, port: number, retries = 30): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const checkServer = () => {
      console.log(`Checking if ${name} server is ready on port ${port} (attempt ${attempts + 1}/${retries})...`);
      
      const req = http.get(`http://localhost:${port}`, (res) => {
        
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
          console.log(`${name} server is ready!`);
          resolve();
        } else {
          console.log(`${name} server responded with status ${res.statusCode}, retrying...`);
          tryAgain();
        }
      }).on('error', () => {
        console.log(`${name} server not ready, retrying...`);
        tryAgain();
      });

      req.setTimeout(1000, () => {
        req.destroy();
        console.log(`${name} server request timed out, retrying...`);
        tryAgain();
      });
    };

    const tryAgain = () => {
      attempts++;
      if (attempts >= retries) {
        reject(new Error(`${name} server not ready after ${retries} attempts`));
        return;
      }
      setTimeout(checkServer, 1000);
    };

    checkServer();
  });
}

async function checkAllServers() {
  try {
    
    await waitForServer('Backend', 3001);
    console.log('Backend server is confirmed ready!');

    
    await waitForServer('Frontend', 5173);
    console.log('Frontend server is confirmed ready!');

    
    console.log('All servers are ready!');
    process.exit(0);
  } catch (error) {
    console.error('Server check failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}


checkAllServers();