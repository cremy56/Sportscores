// src/Login.jsx
import { useState } from 'react';
import { supabase } from './supabaseClient';
import toast, { Toaster } from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Functie voor de magic link (OTP) login - voor de eerste keer inloggen
  const handleMagicLinkLogin = async () => {
    if (!email) {
      toast.error('Vul je e-mailadres in.');
      return;
    }
    setLoading(true);

    // STAP 1: Controleer of het e-mailadres bestaat in de 'users' tabel.
    const { data, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (checkError || !data) {
      toast.error('Dit e-mailadres is niet bekend in ons systeem.');
      setLoading(false);
      return;
    }

    // E-mailadres is bekend, verstuur de inloglink.
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email,
    });

    if (otpError) {
      toast.error(`Fout: ${otpError.message}`);
    } else {
      toast.success('Inloglink is naar je e-mailadres verzonden!');
    }
    setLoading(false);
  };

  // Functie voor de wachtwoord login - voor regulier gebruik
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Vul zowel e-mailadres als wachtwoord in.');
      return;
    }
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      toast.error(`Fout: ${error.message}`);
    }
    // Geen success toast hier, de app navigeert automatisch weg bij een succesvolle login.
    
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Toaster position="top-center" />
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-lg">
        <div>
           <img
                src="/logo.png"
                alt="Sportscores Logo"
                className="mx-auto h-16 w-auto object-contain"
            />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Inloggen op je account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handlePasswordLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                placeholder="E-mailadres"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                placeholder="Wachtwoord"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-gray-400"
            >
              {loading ? 'Bezig...' : 'Inloggen'}
            </button>
          </div>
        </form>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Of</span>
          </div>
        </div>

        <div>
          <button
            onClick={handleMagicLinkLogin}
            disabled={loading}
            className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
          >
            {loading ? 'Bezig...' : 'Stuur mij een inloglink'}
          </button>
        </div>
      </div>
    </div>
  );
}
