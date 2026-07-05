'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase' // This assumes you created the supabase.ts file

export default function Home() {
  const [status, setStatus] = useState('Checking connection...')

  useEffect(() => {
    async function checkDb() {
      const { data, error } = await supabase.from('links').select('*').limit(1)
      if (error) {
        setStatus('❌ Error: ' + error.message)
      } else {
        setStatus('✅ Connected to Supabase successfully!')
      }
    }
    checkDb()
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">Link Vault Hello World</h1>
        <p className="text-lg text-gray-600">{status}</p>
        <div className="mt-6 text-sm text-gray-400">
          If you see the green checkmark, your backend is live!
        </div>
      </div>
    </main>
  )
}