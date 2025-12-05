'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Image from 'next/image';
import { Lock, User } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const success = login(username, password);

    if (success) {
      router.push('/admin/dashboard');
    } else {
      setError('Identifiants incorrects');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-farine-beige-light flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative w-full max-w-sm mx-auto mb-6">
            <Image
              src="/logo.png"
              alt="FARINE"
              width={400}
              height={160}
              className="w-full h-auto"
            />
          </div>
          <h1 className="text-3xl font-bold text-farine-green">
            Back-Office
          </h1>
          <p className="text-gray-600 mt-2">
            Connexion à l'espace d'administration
          </p>
        </div>

        {/* Formulaire de connexion */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4" />
                Nom d'utilisateur
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farine-green focus:border-transparent"
                placeholder="Entrez votre nom d'utilisateur"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Lock className="w-4 h-4" />
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farine-green focus:border-transparent"
                placeholder="Entrez votre mot de passe"
                required
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Connexion...
                </span>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <a
              href="/"
              className="text-sm text-farine-green hover:text-farine-green-dark"
            >
              ← Retour au site public
            </a>
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          Identifiants par défaut : Farine / FARINE
        </div>
      </div>
    </div>
  );
}
