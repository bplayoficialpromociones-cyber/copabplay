# Use Node.js 20 with Chrome/Puppeteer pre-installed
FROM ghcr.io/puppeteer/puppeteer:21.6.1

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY bot-email-service.js ./
COPY .env ./

# Create user for running the app
USER pptruser

# Expose port (Railway assigns PORT automatically)
EXPOSE 3000

# Run the bot service
CMD ["node", "bot-email-service.js"]
