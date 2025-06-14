import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const buildPath = path.join(__dirname, 'dist');

// In-memory storage
const storage = {
  campaigns: [],
  userProfiles: [],
  logs: [],
  analytics: [],
  traffic: [],
  sessions: []
};

// Helper function to parse request body
const parseBody = (req) => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
};

// Helper function to send JSON response
const sendJsonResponse = (res, statusCode, data) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
};

const server = http.createServer(async (req, res) => {
  // Handle API endpoints
  if (req.url.startsWith('/api/')) {
    const endpoint = req.url.split('/api/')[1];
    const [resource, id] = endpoint.split('/');

    try {
      // Special endpoints
      if (endpoint === 'health') {
        return sendJsonResponse(res, 200, { status: 'ok', version: '1.0.0' });
      }

      if (endpoint === 'traffic/generate') {
        const config = await parseBody(req);
        const trafficData = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          ...config
        };
        storage.traffic.push(trafficData);
        return sendJsonResponse(res, 201, trafficData);
      }

      if (endpoint === 'traffic/generated') {
        return sendJsonResponse(res, 200, storage.traffic);
      }

      if (endpoint.startsWith('traffic/generated/')) {
        const campaignId = endpoint.split('traffic/generated/')[1];
        const campaignTraffic = storage.traffic.filter(t => t.campaign_id === campaignId);
        return sendJsonResponse(res, 200, campaignTraffic);
      }

      // Handle different HTTP methods for other resources
      switch (req.method) {
        case 'GET':
          if (id) {
            const item = storage[resource]?.find(item => item.id === id);
            if (item) {
              sendJsonResponse(res, 200, item);
            } else {
              sendJsonResponse(res, 404, { error: 'Not found' });
            }
          } else {
            sendJsonResponse(res, 200, storage[resource] || []);
          }
          break;

        case 'POST':
          const newItem = await parseBody(req);
          newItem.id = Date.now().toString();
          storage[resource] = storage[resource] || [];
          storage[resource].push(newItem);
          sendJsonResponse(res, 201, newItem);
          break;

        case 'PUT':
          if (!id) {
            sendJsonResponse(res, 400, { error: 'ID required' });
            return;
          }
          const updatedItem = await parseBody(req);
          const index = storage[resource]?.findIndex(item => item.id === id);
          if (index !== -1) {
            storage[resource][index] = { ...storage[resource][index], ...updatedItem };
            sendJsonResponse(res, 200, storage[resource][index]);
          } else {
            sendJsonResponse(res, 404, { error: 'Not found' });
          }
          break;

        case 'DELETE':
          if (!id) {
            sendJsonResponse(res, 400, { error: 'ID required' });
            return;
          }
          const deleteIndex = storage[resource]?.findIndex(item => item.id === id);
          if (deleteIndex !== -1) {
            storage[resource].splice(deleteIndex, 1);
            sendJsonResponse(res, 204, null);
          } else {
            sendJsonResponse(res, 404, { error: 'Not found' });
          }
          break;

        default:
          sendJsonResponse(res, 405, { error: 'Method not allowed' });
      }
    } catch (error) {
      sendJsonResponse(res, 500, { error: error.message });
    }
    return;
  }

  // Serve static files
  let filePath = path.join(buildPath, req.url);

  if (filePath === buildPath || (fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory())) {
    filePath = path.join(buildPath, 'index.html');
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/font-eot',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
  };

  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        fs.readFile(path.join(buildPath, 'index.html'), (error2, content2) => {
          if (error2) {
            res.writeHead(500);
            res.end(`Sorry, check with the site admin for error: ${error2.code} ..\n`);
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content2, 'utf-8');
          }
        });
      } else {
        res.writeHead(500);
        res.end(`Sorry, check with the site admin for error: ${error.code} ..\n`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}/`);
}); 