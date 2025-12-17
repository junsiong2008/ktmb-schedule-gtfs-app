# Project Running Guide

This guide explains how to run the backend API and the frontend Next.js application.

## Prerequisites

- Node.js installed
- PostgreSQL installed and running (for the backend)

## 1. Backend API (Port 3000)

The backend API is located in the `ktmb_api` directory. It defaults to port 3000.

### Steps:

1. Open a terminal and navigate to the backend directory:
   ```bash
   cd ktmb_api
   ```

2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

   You should see: `Server is running on port 3000`

## 2. Frontend Application (Port 3001)

The frontend application is located in the `nextjs_frontend` directory. We will run it on port 3001 to avoid conflict with the backend.

### Steps:

1. Open a **new** terminal window/tab and navigate to the frontend directory:
   ```bash
   cd nextjs_frontend
   ```

2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```

3. Start the development server on port 3001:
   ```bash
   npm run dev -- -p 3001
   ```

   You should see the application starting up on `http://localhost:3001`.

## Summary

- **Backend**: `http://localhost:3000`
- **Frontend**: `http://localhost:3001`
