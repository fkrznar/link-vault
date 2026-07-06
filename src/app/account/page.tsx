'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function AccountManagement() {
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const { data, error } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', user.id)
          .single()

        if (data) {
          setUsername(data.username || '')
          setAvatarUrl(data.avatar_url || '')
        }
      }
      setLoading(false)
    }
    getProfile()
  }, [])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    setMessage('')

    const { error } = await supabase
      .from('profiles')
      .update({ username, avatar_url: avatarUrl })
      .eq('id', userId)

    if (error) setMessage(`❌ Error: ${error.message}`)
    else setMessage('✨ Profile updated successfully!')
  }

  if (loading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading settings...</div>

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-md mx-auto bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">Account Settings</h1>
          <Link href="/" className="text-xs text-blue-400 hover:underline">← Back Home</Link>
        </div>

        {message && <div className="text-sm p-3 bg-gray-900 rounded-lg text-center font-medium">{message}</div>}

        <div className="flex flex-col items-center space-y-2 bg-gray-900 p-4 rounded-xl border border-gray-800">
          <img src={avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg'} alt="Preview" className="w-20 h-20 rounded-full border border-gray-700 object-cover" />
          <p className="text-xs text-gray-400">Current Avatar Preview</p>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Unique Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Profile Picture URL</label>
            <input type="url" placeholder="https://example.com/your-pic.jpg" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg text-sm transition">Save Profile Changes</button>
        </form>
      </div>
    </div>
  )
}