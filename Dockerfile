# Use the official Node.js image as the base
FROM node:20-alpine

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Build the npm 
RUN npm run build

# Expose port for the backend
EXPOSE 8000  

# Specify the command to start the application
CMD [ "npm", "start" ]