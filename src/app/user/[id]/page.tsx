'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Trash2, ExternalLink, Settings } from 'lucide-react' // Added Settings Icon

export default function UserOverview() {
  const { id } = useParams()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [userLinks, setUserLinks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUserData() {
      if (!id) return
      
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
      
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', id).single()
      if (profileData) setProfile(profileData)

      const { data: linksData } = await supabase.from('links').select('*').eq('user_id', id).order('created_at', { ascending: false })
      if (linksData) setUserLinks(linksData)

      setLoading(false)
    }
    fetchUserData()
  }, [id])

  const handleDeletePost = async (linkId: number) => {
    const confirmDelete = window.confirm("Are you 100% sure you want to delete this file from the vault permanently?")
    if (!confirmDelete) return

    const { error } = await supabase.from('links').delete().eq('id', linkId)
    if (error) {
      alert(`Error deleting post: ${error.message}`)
    } else {
      setUserLinks(prev => prev.filter(l => l.id !== linkId))
    }
  }

  if (loading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Gathering user vault items...</div>

  const isOwnProfile = currentUser && currentUser.id === id

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link href="/" className="text-sm text-blue-400 hover:underline">← Return to Main Vault</Link>

        {profile && (
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-4">
              <img src={profile.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg'} alt={profile.username} className="w-16 h-16 rounded-full border border-gray-600 object-cover" />
              <div>
                <h1 className="text-2xl font-bold text-white">@{profile.username}</h1>
                <p className="text-sm text-gray-400">Total Contributions: <span className="text-blue-400 font-bold">{userLinks.length} posts</span></p>
              </div>
            </div>

            {/* Account Settings button shifted here, only visible if the user owns this profile page */}
            {isOwnProfile && (
              <Link href="/account" className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg transition font-medium flex items-center gap-1.5 shadow-md">
                <Settings className="w-4 h-4" /> My Profile
              </Link>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {userLinks.map((link) => (
            <div key={link.id} className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex flex-col justify-between h-full space-y-4 shadow-md relative group hover:border-gray-600 transition">
              
              {isOwnProfile && (
                <div className="absolute top-3 right-3 z-10">
                  <button 
                    onClick={() => handleDeletePost(link.id)}
                    className="bg-gray-900/50 border border-gray-700 text-gray-400 hover:text-red-400 hover:border-red-500/50 p-1.5 rounded-lg transition duration-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div>
                <h3 className={`text-lg font-bold text-white truncate ${isOwnProfile ? 'pr-10' : ''}`}>
                  {link.title}
                </h3>
                <p className="text-gray-400 text-xs line-clamp-3 mt-1">{link.description || 'No description.'}</p>
                
                {link.tags && link.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {link.tags.map((tag: string, i: number) => (
                      <span key={i} className="bg-gray-900 text-blue-400 border border-gray-700/60 rounded text-[10px] px-1.5 py-0.5 font-mono">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-gray-700/40">
                <span className="font-medium">{link.views || 0} views</span>
                <a 
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg transition font-medium flex items-center gap-1.5 text-xs"
                >
                  Open Files <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {userLinks.length === 0 && (
          <p className="text-center text-gray-500 py-12 bg-gray-800/30 rounded-xl border border-gray-800">
            This repository vault is empty.
          </p>
        )}
      </div>
    </div>
  )
}