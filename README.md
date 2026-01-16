# ISKCON Sadhana & Communication Platform

A comprehensive web and mobile application for ISKCON's all-India student community to facilitate daily spiritual practice tracking, mentorship communication, and hierarchical group management.

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript
- **Backend**: Firebase (Firestore, Authentication, Storage)
- **Styling**: Tailwind CSS (Responsive Design)
- **Deployment**: Vercel/Render
- **Version Control**: Git

## Features

### Core Features
- Daily Sadhana Tracking
- Spiritual Progress Monitoring
- Hierarchical Communication System
- Role-Based Access Control
- Reporting & Analytics Dashboard
- Event Management
- Resource Library

### Roles
- Super Admin
- Zonal Admin
- State Admin
- City Admin
- Center Admin
- Senior Counselor
- Counselor
- Student

## Getting Started

For detailed setup instructions, see [SETUP.md](./SETUP.md)

### Quick Start

1. **Install dependencies**:
```bash
npm install
```

2. **Set up Firebase** (see [SETUP.md](./SETUP.md) for details):
   - Create Firebase project
   - Enable Authentication (Email/Password)
   - Create Firestore database
   - Copy config to `.env.local` (use `env.example` as template)

3. **Run development server**:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

### Documentation

- **[SETUP.md](./SETUP.md)** - Complete setup guide for local development
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment instructions for Vercel and Render
- **[firestore.rules](./firestore.rules)** - Firestore security rules

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Dashboard pages
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── auth/              # Auth components
│   ├── dashboard/         # Dashboard components
│   ├── sadhana/           # Sadhana tracking
│   └── communication/     # Messaging components
├── lib/                   # Utilities and configs
│   ├── firebase/          # Firebase configuration
│   └── utils/             # Helper functions
├── types/                 # TypeScript types
└── hooks/                 # Custom React hooks
```

## Deployment

### Vercel
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Render
1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set start command: `npm start`
4. Add environment variables
5. Deploy

## License

Private - ISKCON Internal Use
