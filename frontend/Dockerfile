# Use lightweight Node image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first
# Improves Docker cache usage
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy frontend source code
COPY . .

# Expose Vite port
EXPOSE 5173

# Start Vite development server
# --host exposes it outside container
CMD ["npm", "run", "dev", "--", "--host"]

