// SNFalyze: Starter Full Codebase (index.js / firebase.js / pages / components / styles etc.)

// 1. firebase.js (Firebase init config)
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// 2. pages/index.js (Homepage)
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Welcome to SNFalyze</h1>
      <p className="mt-4 text-lg">Post-Acute Deal Intelligence</p>
    </main>
  );
}

// 3. pages/login.js
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const login = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert('Logged in!');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="p-10 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Login</h2>
      <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} className="border p-2 w-full mb-2" />
      <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} className="border p-2 w-full mb-2" />
      <button onClick={login} className="bg-blue-600 text-white px-4 py-2 rounded">Log In</button>
    </div>
  );
}

// 4. pages/dashboard.js (Initial dashboard scaffold)
export default function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p className="text-sm">Deals, financials, risk flags, and tools coming here...</p>
    </div>
  );
}

// 5. tailwind.config.js (optional if Tailwind CSS is used)
module.exports = {
  content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};

// 6. styles/globals.css (if using Tailwind)
@tailwind base;
@tailwind components;
@tailwind utilities;

// 7. next.config.js
module.exports = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: '',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: '',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: '',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: '',
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '',
    NEXT_PUBLIC_FIREBASE_APP_ID: '',
  },
};
