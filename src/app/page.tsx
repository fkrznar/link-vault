'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'

export default function Home() {
  // --- AUTH STATE ---
  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authError, setAuthError] = useState('')

  // --- POSTS STATE ---
  const [links, setLinks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [feedView, setFeedView] = useState<'all' | 'saved'>('all')
  
  // --- FORM STATE ---
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    fetchLinks()
    return () => subscription.unsubscribe()
  }, [])

  async function fetchLinks() {
    setLoading(true)
    const { data, error } = await supabase
      .from('links')
      .select('*, profiles(username, avatar_url), likes(user_id), saves(user_id)')
      .order('created_at', { ascending: false })

    if (!error && data) setLinks(data)
    setLoading(false)
  }

  const trackClick = async (id: number, currentClicks: number) => {
    setLinks(prev => prev.map(l => l.id === id ? { ...l, clicks: (l.clicks || 0) + 1 } : l))
    await supabase.from('links').update({ clicks: (currentClicks || 0) + 1 }).eq('id', id)
  }

  // --- TOGGLE LIKE HANDLER ---
  const handleToggleLike = async (linkId: number, alreadyLiked: boolean) => {
    if (!user) return alert('Please log in to like posts!')

    if (alreadyLiked) {
      // Unlike: Delete row
      await supabase.from('likes').delete().eq('link_id', linkId).eq('user_id', user.id)
      setLinks(prev => prev.map(l => l.id === linkId ? { ...l, likes: l.likes.filter((lk: any) => lk.user_id !== user.id) } : l))
    } else {
      // Like: Insert row
      await supabase.from('likes').insert([{ link_id: linkId, user_id: user.id }])
      setLinks(prev => prev.map(l => l.id === linkId ? { ...l, likes: [...l.likes, { user_id: user.id }] } : l))
    }
  }

  // --- TOGGLE SAVE HANDLER ---
  const handleToggleSave = async (linkId: number, alreadySaved: boolean) => {
    if (!user) return alert('Please log in to save posts!')

    if (alreadySaved) {
      // Unsave
      await supabase.from('saves').delete().eq('link_id', linkId).eq('user_id', user.id)
      setLinks(prev => prev.map(l => l.id === linkId ? { ...l, saves: l.saves.filter((sv: any) => sv.user_id !== user.id) } : l))
    } else {
      // Save
      await supabase.from('saves').insert([{ link_id: linkId, user_id: user.id }])
      setLinks(prev => prev.map(l => l.id === linkId ? { ...l, saves: [...l.saves, { user_id: user.id }] } : l))
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    if (authMode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setAuthError(error.message)
      else alert('Account created! You can now log in.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setAuthError(error.message)
    }
  }

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)

    const processedTags = tagsInput ? tagsInput.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : []
    const { error } = await supabase.from('links').insert([{ title, url, description, tags: processedTags, user_id: user.id }])

    if (error) {
      setFormError(error.message)
      setSubmitting(false)
    } else {
      setTitle(''); setUrl(''); setDescription(''); setTagsInput(''); setSubmitting(false)
      fetchLinks()
    }
  }

  // Filter links array locally based on chosen feed view
  const displayedLinks = feedView === 'all' 
    ? links 
    : links.filter(link => link.saves?.some((s: any) => s.user_id === user?.id))

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <header className="max-w-4xl mx-auto mb-12 flex justify-between items-center bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-md">
        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">Cloud Link Vault</h1>
        {user && (
          <div className="flex items-center gap-4">
            <Link href="/account" className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition font-medium">⚙️ My Profile</Link>
            <button onClick={() => supabase.auth.signOut()} className="text-xs text-gray-400 hover:text-white">Log Out</button>
          </div>
        )}
      </header>

      <main className="max-w-4xl mx-auto space-y-12">
        {!user ? (
          <section className="max-w-md mx-auto bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl">
            <h2 className="text-lg font-bold mb-4 text-white uppercase text-center tracking-wider">{authMode === 'login' ? 'Sign In' : 'Create Account'}</h2>
            <form onSubmit={handleAuth} className="space-y-4">
              {authError && <div className="text-red-400 text-xs bg-red-900/20 p-2 rounded border border-red-500/20">{authError}</div>}
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none" required />
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none" required />
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm transition font-medium">{authMode === 'login' ? 'Log In' : 'Sign Up'}</button>
            </form>
            <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="w-full text-center text-xs text-blue-400 mt-4 hover:underline">{authMode === 'login' ? "Need an account? Sign up" : "Have an account? Log in"}</button>
          </section>
        ) : (
          <section className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-4">➕ Share a Resource</h2>
            <form onSubmit={handleCreatePost} className="space-y-4">
              {formError && <div className="text-red-400 text-sm">{formError}</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Title *" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none" required />
                <input type="url" placeholder="URL *" value={url} onChange={e => setUrl(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none" required />
              </div>
              <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none resize-none" />
              <input type="text" placeholder="Tags (separated by commas)" value={tagsInput} onChange={e => setTagsInput(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none" />
              <button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm transition font-medium">{submitting ? 'Uploading...' : 'Post to Vault 🚀'}</button>
            </form>
          </section>
        )}

        <hr className="border-gray-800" />

        {/* --- VIEW FEED CONTROLS --- */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>📂</span> {feedView === 'all' ? 'Explorable Vault Items' : 'My Bookmarked Vault Items'}
            </h2>
            
            {/* Toggle Feed Tabs */}
            {user && (
              <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700 text-xs font-medium">
                <button 
                  onClick={() => setFeedView('all')} 
                  className={`px-3 py-1.5 rounded-md transition ${feedView === 'all' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  🌐 All Posts
                </button>
                <button 
                  onClick={() => setFeedView('saved')} 
                  className={`px-3 py-1.5 rounded-md transition ${feedView === 'saved' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  🔖 Saved ({links.filter(l => l.saves?.some((s: any) => s.user_id === user.id)).length})
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <p className="text-center text-gray-400 animate-pulse py-12">Loading feed...</p>
          ) : displayedLinks.length === 0 ? (
            <p className="text-center text-gray-500 py-12 bg-gray-800/30 rounded-xl border border-gray-800">
              {feedView === 'all' ? 'The vault is currently empty.' : 'You have not saved any items yet.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedLinks.map((link) => {
                const isLiked = link.likes?.some((l: any) => l.user_id === user?.id) || false
                const isSaved = link.saves?.some((s: any) => s.user_id === user?.id) || false
                const likesCount = link.likes?.length || 0

                return (
                  <div key={link.id} className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex flex-col justify-between h-full space-y-4 shadow-md relative group">
                    
                    {/* Save Badge Button in Upper Corner */}
                    {user && (
                      <button 
                        onClick={() => handleToggleSave(link.id, isSaved)}
                        className={`absolute top-3 right-3 text-sm p-1.5 rounded-lg border transition duration-200 z-10 ${
                          isSaved 
                            ? 'bg-blue-900/40 border-blue-500 text-blue-400' 
                            : 'bg-gray-900/50 border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
                        }`}
                        title={isSaved ? "Unsave Post" : "Save Post"}
                      >
                        {isSaved ? '🔖' : '📥'}
                      </button>
                    )}

                    <div className="space-y-3">
                      {link.profiles && (
                        <Link href={`/user/${link.user_id}`} className="flex items-center gap-2 group border-b border-gray-700/50 pb-2 max-w-[80%]">
                          <img src={link.profiles.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg'} alt="Avatar" className="w-6 h-6 rounded-full bg-gray-900 object-cover" />
                          <span className="text-xs font-semibold text-gray-300 group-hover:text-blue-400 transition truncate">@{link.profiles.username || 'user'}</span>
                        </Link>
                      )}
                      <div>
                        <h3 className="text-lg font-bold text-white truncate">{link.title}</h3>
                        <p className="text-gray-400 text-xs line-clamp-2 mt-1">{link.description || 'No description.'}</p>
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-gray-700/40 pt-2">
                      {/* Social Metric Counters Row */}
                      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                        <span>🔥 {link.clicks || 0} clicks</span>
                        
                        {/* Interactive Like Component */}
                        <button 
                          onClick={() => handleToggleLike(link.id, isLiked)}
                          className={`flex items-center gap-1 font-medium transition ${isLiked ? 'text-red-400' : 'text-gray-500 hover:text-red-300'}`}
                        >
                          <span>{isLiked ? '❤️' : '🤍'}</span>
                          <span>{likesCount}</span>
                        </button>
                      </div>

                      <a href={link.url} target="_blank" rel="noopener noreferrer" onClick={() => trackClick(link.id, link.clicks)} className="block w-full text-center bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 rounded-lg transition font-medium">
                        Open Files ↗
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}