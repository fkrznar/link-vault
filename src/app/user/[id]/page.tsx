'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function UserOverview() {
  const { id } = useParams()
  const [profile, setProfile] = useState<any>(null)
  const [userLinks, setUserLinks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUserData() {
      if (!id) return
      
      // 1. Fetch user profile details
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', id).single()
      if (profileData) setProfile(profileData)

      // 2. Fetch all links posted by this specific user
      const { data: linksData } = await supabase.from('links').select('*').eq('user_id', id).order('created_at', { ascending: false })
      if (linksData) setUserLinks(linksData)

      setLoading(false)
    }
    fetchUserData()
  }, [id])

  if (loading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Gathering user vault items...</div>

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link href="/" className="text-sm text-blue-400 hover:underline">← Return to Main Vault</Link>

        {profile && (
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex items-center gap-4 shadow-xl">
            <img src={profile.avatar_url} alt={profile.username} className="w-16 h-16 rounded-full border border-gray-600 object-cover" />
            <div>
              <h1 className="text-2xl font-bold text-white">@{profile.username}</h1>
              <p className="text-sm text-gray-400">Total Contributions: <span className="text-blue-400 font-bold">{userLinks.length} posts</span></p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {userLinks.map((link) => (
            <div key={link.id} className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex flex-col justify-between h-full space-y-4 shadow-md">
              <div>
                <h3 className="text-lg font-bold text-white truncate">{link.title}</h3>
                <p className="text-gray-400 text-xs line-clamp-3 mt-1">{link.description || 'No description.'}</p>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-gray-700/50">
                <span>🎯 {link.clicks || 0} clicks</span>
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg transition font-medium">Open Files ↗</a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}