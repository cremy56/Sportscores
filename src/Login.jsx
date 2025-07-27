// src/Login.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom'; // Link is nodig voor de "Registreren" knop
import { auth } from './firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import toast, { Toaster } from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Functie voor de wachtwoord login
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Vul zowel e-mailadres als wachtwoord in.');
      return;
    }
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // De onAuthStateChanged listener in App.jsx handelt de succesvolle login af.
      toast.success('Succesvol ingelogd!');
    } catch (error) {
      console.error(error);
      toast.error('Ongeldige inloggegevens.');
    } finally {
      setLoading(false);
    }
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
            Inloggen op uw account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handlePasswordLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input id="email-address" name="email" type="email" autoComplete="email" required className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm" placeholder="E-mailadres" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <input id="password" name="password" type="password" autoComplete="current-password" required className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm" placeholder="Wachtwoord" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          <div>
            <button type="submit" disabled={loading} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-gray-400">
              {loading ? 'Bezig...' : 'Inloggen'}
            </button>
          </div>
        </form>
        
        <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300" /></div><div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Of</span></div></div>

        <div>
          {/* De knop is nu een Link component die naar de nieuwe registratiepagina leidt */}
          <Link
            to="/register"
            className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            Registreren
          </Link>
        </div>
      </div>
    </div>
  );
}
