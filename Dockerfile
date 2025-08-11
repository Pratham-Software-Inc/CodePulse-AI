# Use lightweight Node.js 18 Alpine
FROM node:18-alpine

# Set working directory inside container
WORKDIR /app

# Copy package.json and package-lock.json first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all project files into the container
COPY . .

# Expose Vite's default port
EXPOSE 5173

# Ensure Vite server runs properly inside Docker
ENV HOST=0.0.0.0

# Start the Vite development server
CMD ["npm", "run", "dev"]

