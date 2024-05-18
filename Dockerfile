# Use the official Node.js image from the Docker Hub
FROM node:21

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Run prisma generate to generate the Prisma Client
RUN npx prisma generate

# Expose the port that the app runs on
EXPOSE 3000

# Define the command to run the app
CMD ["npm", "run", "dev"]