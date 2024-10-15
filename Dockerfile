# Stage 1: Build the application
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Create the production image
FROM node:18-alpine

# Install redis-cli for testing
RUN apk add --no-cache redis

# Set working directory
WORKDIR /app

# Copy only the necessary files from the build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/src/i18n ./src/i18n  

# Expose application port and debugging port
EXPOSE 3011
EXPOSE 3002
EXPOSE 9229  

# Define the command to run the application in debug mode
CMD ["node", "--inspect=0.0.0.0:9229", "dist/main"]