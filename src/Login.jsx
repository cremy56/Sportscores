import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) {
      setMessage('❌ Fout: ' + error.message)
    } else {
      setMessage('✅ Inloglink verzonden naar je e-mail.')
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-4 border rounded shadow">
      <h2 className="text-xl font-bold mb-4">Inloggen via e-mail</h2>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Jouw e-mailadres"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded mb-4"
          required
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Verstuur inloglink
        </button>
      </form>
      {message && <p className="mt-4">{message}</p>}
    </div>
  )
}
