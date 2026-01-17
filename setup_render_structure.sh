#!/bin/bash

# Move backend files
mkdir -p backend
if [ -f requirements.txt ]; then
  mv requirements.txt backend/
fi
if [ -f runtime.txt ]; then
  mv runtime.txt backend/
fi

# Move backend app code if not already in backend/
if [ -d app ]; then
  mv app backend/
fi
if [ -d backend/app ]; then
  echo "Backend app directory already exists in backend/"
fi

# Move frontend files
mkdir -p frontend
if [ -f package.json ]; then
  mv package.json frontend/
fi
if [ -f package-lock.json ]; then
  mv package-lock.json frontend/
fi
if [ -f server.js ]; then
  mv server.js frontend/
fi
if [ -d src ]; then
  mv src frontend/
fi
if [ -f index.html ]; then
  mv index.html frontend/
fi
if [ -f vite.config.js ]; then
  mv vite.config.js frontend/
fi
if [ -f jsconfig.json ]; then
  mv jsconfig.json frontend/
fi
if [ -f postcss.config.js ]; then
  mv postcss.config.js frontend/
fi
if [ -f tailwind.config.js ]; then
  mv tailwind.config.js frontend/
fi
if [ -f App.css ]; then
  mv App.css frontend/
fi
if [ -f index.css ]; then
  mv index.css frontend/
fi

echo "Project structure has been updated for Render multi-service deployment."
echo "Backend: backend/ (requirements.txt, runtime.txt, app/)"
echo "Frontend: frontend/ (package.json, src/, etc.)" 