# 🚀 Ten10 Project Management - Quick Start Guide

Get up and running with Ten10 Project Management in just a few minutes!

## 📋 Prerequisites

Before you begin, make sure you have:

- **Node.js 18+** installed ([Download here](https://nodejs.org/))
- **npm** (comes with Node.js)
- A **PostgreSQL database** (we provide a free cloud database URL)

## ⚡ Quick Setup (Recommended)

### Option 1: Automatic Setup Script

**For macOS/Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

**For Windows:**
```cmd
setup.bat
```

The setup script will:
1. Install all dependencies
2. Configure environment files
3. Set up the database
4. **Ask if you want to start the application automatically**

If you choose "Yes", it will:
- Start both frontend and backend servers
- Automatically open your browser to http://localhost:5173

### Option 2: Manual Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment files:**
   ```bash
   # Copy environment templates
   cp packages/backend/.env.example packages/backend/.env
   echo "VITE_API_URL=http://localhost:3001/api" > packages/frontend/.env
   ```

3. **Set up the database:**
   ```bash
   cd packages/backend
   npx prisma generate
   npx prisma db push
   cd ../..
   ```

## 🏃‍♂️ Running the Application

Start both frontend and backend:
```bash
npm run dev
```

The application will be available at:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001

## 🎯 First Steps

1. **Open your browser** to http://localhost:5173
2. **Register a new account** or use the demo credentials
3. **Create your first board** using one of the templates:
   - **Basic:** Simple kanban board
   - **Kanban:** Continuous flow with WIP limits
   - **Scrum:** Sprint-based with full Agile features
4. **Start adding cards** and organizing your work!

## 🔧 Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development servers |
| `npm run build` | Build for production |
| `npm run test` | Run all tests |
| `npm run lint` | Lint code |
| `npm run format` | Format code |

## 🗄️ Database Configuration

The application comes pre-configured with a **free PostgreSQL database** hosted on Neon. 

**No additional setup required!** The database URL is already configured in the `.env.example` file.

### Using Your Own Database (Optional)

If you want to use your own PostgreSQL database:

1. Update `packages/backend/.env`:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/your_database_name?schema=public"
   ```

2. Run the database setup:
   ```bash
   cd packages/backend
   npx prisma db push
   ```

## 🌟 Features Overview

### ✨ Core Features
- **Real-time collaboration** with live updates
- **Drag & drop** cards and columns
- **Custom swim lanes** for advanced organization
- **Team management** with role-based permissions
- **Board templates** for different workflows

### 🎯 Agile Features (Optional)
- **Sprint management** for Scrum teams
- **Story points** and estimation
- **Epic and story hierarchy**
- **Burndown charts** and velocity tracking
- **Time tracking** and reporting

## 🆘 Troubleshooting

### Common Issues

**Port already in use:**
```bash
# For macOS/Linux:
lsof -ti:3001 | xargs kill -9
lsof -ti:5173 | xargs kill -9

# For Windows:
netstat -ano | findstr :3001
netstat -ano | findstr :5173
# Then kill the process IDs shown
taskkill /F /PID [process_id]
```

**Prisma client generation errors (EPERM):**
- Close any running development servers
- Delete `node_modules/.prisma` folder
- Run setup script again
- On Windows, try running as Administrator

**Database connection issues:**
- Check that the DATABASE_URL in `packages/backend/.env` is correct
- Ensure your database is running and accessible
- Try running `npx prisma db push` manually

**Node.js version issues:**
- Make sure you have Node.js 18 or higher
- Check with: `node --version`

**Permission issues on macOS/Linux:**
```bash
chmod +x setup.sh
```

**npm audit vulnerabilities:**
- Run `npm audit fix --force` to automatically fix issues
- Some vulnerabilities may require manual updates

### Getting Help

If you encounter any issues:

1. Check the console for error messages
2. Verify all prerequisites are installed
3. Make sure ports 3001 and 5173 are available
4. Try restarting the development servers
5. Run the setup script again

## 🎉 You're Ready!

That's it! You now have a fully functional project management application running locally. 

**Happy project managing! 🚀**

---

*Powered by Ten10*