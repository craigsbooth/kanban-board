# Ten10 Project Management

A modern, real-time project management application with enhanced kanban boards, custom swim lanes, and integrated team collaboration features.

## Features

- 🎯 **Enhanced Kanban Boards** - Custom columns and swim lanes for flexible workflow organization
- 🔄 **Real-time Collaboration** - Live updates and synchronization across team members
- 🎨 **Modern UI/UX** - Clean, responsive design with Tailwind CSS and shadcn/ui
- 🔐 **Secure Authentication** - JWT-based auth with encrypted password storage
- 📱 **Mobile-First Design** - Responsive interface that works on all devices
- 🔗 **Easy Sharing** - Shareable invitation links with role-based permissions
- 🔔 **Smart Notifications** - Google Chat integration for team updates
- ⚡ **Fast Development** - Hot reload and modern tooling for rapid iteration

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **shadcn/ui** for component library
- **React Router** for navigation
- **Zustand** for state management
- **Socket.io Client** for real-time features

### Backend
- **Node.js** with Express and TypeScript
- **PostgreSQL** database
- **Prisma ORM** for type-safe database access
- **Socket.io** for real-time communication
- **JWT** for authentication
- **bcrypt** for password hashing

## Getting Started

### Prerequisites
- Node.js 18+ and npm 9+
- PostgreSQL database (we provide a free cloud database)

### Quick Setup

**Option 1: Use the setup script (Recommended)**

For macOS/Linux:
```bash
chmod +x setup.sh
./setup.sh
```

For Windows:
```cmd
setup.bat
```

**Option 2: Manual setup**

1. Install dependencies:
```bash
npm install
```

2. Set up environment files:
```bash
cp packages/backend/.env.example packages/backend/.env
echo "VITE_API_URL=http://localhost:3001/api" > packages/frontend/.env
```

3. Set up the database:
```bash
cd packages/backend
npx prisma generate
npx prisma db push
cd ../..
```

4. Start the development servers:
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

### 📦 Creating a Distribution Package

To package the application for sharing:

**For macOS/Linux:**
```bash
chmod +x package-for-distribution.sh
./package-for-distribution.sh
```

**For Windows:**
```cmd
package-for-distribution.bat
```

This creates a clean package with setup scripts that others can easily run.

## Development

### Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both applications for production
- `npm run test` - Run all tests
- `npm run lint` - Lint all code
- `npm run format` - Format code with Prettier
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio

### Project Structure

```
ten10-project-management/
├── packages/
│   ├── frontend/          # React frontend application
│   │   ├── src/
│   │   │   ├── components/    # Reusable UI components
│   │   │   ├── pages/         # Page components
│   │   │   ├── hooks/         # Custom React hooks
│   │   │   ├── store/         # State management
│   │   │   ├── lib/           # Utilities and configurations
│   │   │   └── types/         # TypeScript type definitions
│   │   └── public/            # Static assets
│   └── backend/           # Node.js backend API
│       ├── src/
│       │   ├── routes/        # API route handlers
│       │   ├── middleware/    # Express middleware
│       │   ├── services/      # Business logic
│       │   ├── models/        # Data models and types
│       │   └── utils/         # Utility functions
│       └── prisma/            # Database schema and migrations
└── .kiro/                 # Project specifications
```

## Contributing

1. Follow the existing code style and conventions
2. Write tests for new features
3. Update documentation as needed
4. Ensure all tests pass before submitting

## License

This project is licensed under the MIT License.