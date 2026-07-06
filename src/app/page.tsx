'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { 
  Settings, 
  LogOut, 
  PlusCircle, 
  Search, 
  Folder, 
  Bookmark, 
  Heart, 
  ExternalLink,
  X,
  Globe,
  Lightbulb,
  Trash2,
  Flag
} from 'lucide-react'

export default function Home() {
  // --- AUTH STATE ---
  const [user, setUser] = useState<User | null>(null)
  const [currentProfile, setCurrentProfile] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authError, setAuthError] = useState('')
  const [authMessage, setAuthMessage] = useState('') // Verification email success state

  // --- POSTS STATE ---
  const [links, setLinks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [feedView, setFeedView] = useState<'all' | 'saved'>('all')
  
  // --- ADVANCED SEARCH STATE ---
  const [textInput, setTextInput] = useState('')       
  const [searchTags, setSearchTags] = useState<string[]>([]) 
  const inputRef = useRef<HTMLInputElement>(null)

  // --- FORM STATE ---
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // --- REPORT MODAL STATE ---
  const [selectedReportLinkId, setSelectedReportLinkId] = useState<number | null>(null)
  const [reportReason, setReportReason] = useState('stolen content')
  const [reportDetails, setReportDetails] = useState('')
  const [reporting, setReporting] = useState(false)

  useEffect(() => {
    // Check initial user and load profile directly from database
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
          if (data) setCurrentProfile(data)
        })
      }
    })

    // Listen to changes in auth state dynamically
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const activeUser = session?.user ?? null
      setUser(activeUser)
      if (activeUser) {
        supabase.from('profiles').select('*').eq('id', activeUser.id).single().then(({ data }) => {
          if (data) setCurrentProfile(data)
        })
      } else {
        setCurrentProfile(null)
      }
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

  const trackView = async (id: number, currentViews: number) => {
    const nextViews = (currentViews || 0) + 1
    setLinks(prev => prev.map(l => l.id === id ? { ...l, views: nextViews } : l))
    await supabase.from('links').update({ views: nextViews }).eq('id', id)
  }

  const handleToggleLike = async (linkId: number, alreadyLiked: boolean) => {
    if (!user) return alert('Please log in to like posts!')
    if (alreadyLiked) {
      await supabase.from('likes').delete().eq('link_id', linkId).eq('user_id', user.id)
      setLinks(prev => prev.map(l => l.id === linkId ? { ...l, likes: l.likes.filter((lk: any) => lk.user_id !== user.id) } : l))
    } else {
      await supabase.from('likes').insert([{ link_id: linkId, user_id: user.id }])
      setLinks(prev => prev.map(l => l.id === linkId ? { ...l, likes: [...l.likes, { user_id: user.id }] } : l))
    }
  }

  const handleToggleSave = async (linkId: number, alreadySaved: boolean) => {
    if (!user) return alert('Please log in to save posts!')
    if (alreadySaved) {
      await supabase.from('saves').delete().eq('link_id', linkId).eq('user_id', user.id)
      setLinks(prev => prev.map(l => l.id === linkId ? { ...l, saves: l.saves.filter((sv: any) => sv.user_id !== user.id) } : l))
    } else {
      await supabase.from('saves').insert([{ link_id: linkId, user_id: user.id }])
      setLinks(prev => prev.map(l => l.id === linkId ? { ...l, saves: [...l.saves, { user_id: user.id }] } : l))
    }
  }

  const handleDeletePost = async (linkId: number) => {
    const confirmDelete = window.confirm("Are you 100% sure you want to delete this file from the vault permanently?")
    if (!confirmDelete) return

    const { error } = await supabase.from('links').delete().eq('id', linkId)
    if (error) alert(`Error deleting post: ${error.message}`)
    else setLinks(prev => prev.filter(l => l.id !== linkId))
  }

  // --- SUBMIT COMPLAINT/REPORT MECHANISM ---
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedReportLinkId) return alert('Please log in to report content!')
    setReporting(true)

    const { error } = await supabase
      .from('reports')
      .insert([
        {
          link_id: selectedReportLinkId,
          user_id: user.id,
          reason: reportReason,
          details: reportDetails
        }
      ])

    setReporting(false)
    if (error) {
      alert(`Failed to submit report: ${error.message}`)
    } else {
      alert('Thank you. This item has been flagged for administrator review.')
      setSelectedReportLinkId(null)
      setReportDetails('')
      setReportReason('stolen content')
    }
  }

  // --- EMAIL AND AUTH SIGNUP WITH CONFIRMATION WAITING ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setAuthMessage('')

    if (authMode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: window.location.origin
        }
      })

      if (error) {
        setAuthError(error.message)
      } else if (data.user && data.user.identities?.length === 0) {
        setAuthError('This email is already registered. Please check your inbox for the confirmation link.')
      } else {
        setAuthMessage('Verification email sent! Please check your inbox to activate your account.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setAuthError(error.message)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value.endsWith(' ')) {
      const words = value.trim().split(/\s+/)
      const lastWord = words[words.length - 1]

      if (lastWord.startsWith('#') && lastWord.length > 1) {
        const cleanTag = lastWord.slice(1).toLowerCase()
        if (!searchTags.includes(cleanTag)) setSearchTags(prev => [...prev, cleanTag])
        setTextInput(value.substring(0, value.lastIndexOf('#')).trim())
        return
      }
    }
    setTextInput(value)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && textInput === '' && searchTags.length > 0) {
      setSearchTags(prev => prev.slice(0, -1))
    }
  }

  const removeSearchTag = (tagToRemove: string) => {
    setSearchTags(prev => prev.filter(t => t !== tagToRemove))
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

  const displayedLinks = links
    .filter(link => {
      if (feedView === 'all') return true
      return link.saves?.some((s: any) => s.user_id === user?.id)
    })
    .filter(link => {
      if (searchTags.length > 0) {
        const postTags = link.tags?.map((t: string) => t.toLowerCase()) || []
        const matchesAllTags = searchTags.every(tag => postTags.includes(tag))
        if (!matchesAllTags) return false
      }
      if (textInput.trim()) {
        const cleanQuery = textInput.toLowerCase().trim()
        return link.title?.toLowerCase().includes(cleanQuery)
      }
      return true
    })

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8 relative">
      {/* Synchronization Configured Header */}
      <header className="max-w-4xl mx-auto mb-12 flex justify-between items-center bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-md">
        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">CloudsLinked</h1>
        {user && (
          <div className="flex items-center gap-4">
            <Link href={`/user/${user.id}`} className="flex items-center gap-2 group bg-gray-900/50 hover:bg-gray-700/50 border border-gray-700 rounded-lg px-3 py-1.5 transition text-sm font-medium">
              <img src={currentProfile?.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg'} alt="My Profile" className="w-5 h-5 rounded-full object-cover border border-gray-600 group-hover:border-blue-400 transition" />
              <span className="text-gray-300 group-hover:text-blue-400 transition">@{currentProfile?.username || 'user'}</span>
            </Link>
            <button onClick={() => supabase.auth.signOut()} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
              <LogOut className="w-3.5 h-3.5" /> Log Out
            </button>
          </div>
        )}
      </header>

      <main className="max-w-4xl mx-auto space-y-12">
        {!user ? (
          <section className="max-w-md mx-auto bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl">
            <h2 className="text-lg font-bold mb-4 text-white uppercase text-center tracking-wider">{authMode === 'login' ? 'Sign In' : 'Create Account'}</h2>
            <form onSubmit={handleAuth} className="space-y-4">
              {authError && <div className="text-red-400 text-xs bg-red-900/20 p-2 rounded border border-red-500/20">{authError}</div>}
              {authMessage && <div className="text-emerald-400 text-xs bg-emerald-900/20 p-3 rounded border border-emerald-500/20 font-medium">{authMessage}</div>}
              
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none" required />
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none" required />
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm transition font-medium">{authMode === 'login' ? 'Log In' : 'Sign Up'}</button>
            </form>
            <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); setAuthMessage(''); }} className="w-full text-center text-xs text-blue-400 mt-4 hover:underline">{authMode === 'login' ? "Need an account? Sign up" : "Have an account? Log in"}</button>
          </section>
        ) : (
          <section className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-blue-400" /> Share a Resource
            </h2>
            <form onSubmit={handleCreatePost} className="space-y-4">
              {formError && <div className="text-red-400 text-sm">{formError}</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Title *" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none" required />
                <input type="url" placeholder="URL *" value={url} onChange={e => setUrl(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none" required />
              </div>
              <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none resize-none" />
              <input type="text" placeholder="Tags (separated by commas)" value={tagsInput} onChange={e => setTagsInput(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none" />
              <button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm transition font-medium">{submitting ? 'Uploading...' : 'Post to Vault'}</button>
            </form>
          </section>
        )}

        <hr className="border-gray-800" />

        <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Folder className="w-5 h-5 text-teal-400" /> {feedView === 'all' ? 'Files' : 'My Bookmarked Files'}
            </h2>
            
            <div className="flex flex-1 md:justify-end items-center gap-3 max-w-2xl w-full ml-auto">
              <div className="flex flex-wrap items-center gap-1.5 flex-1 bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-lg px-2.5 py-1.5 focus-within:border-blue-500 transition cursor-text relative pl-8" onClick={() => inputRef.current?.focus()}>
                <Search className="w-4 h-4 text-gray-500 absolute left-2.5 top-2.5" />
                {searchTags.map((tag, idx) => (
                  <span key={idx} className="flex items-center gap-1 bg-blue-600/30 text-blue-400 border border-blue-500/40 text-[10px] font-mono pl-2 pr-1 py-0.5 rounded-md shadow-sm">
                    #{tag}
                    <button type="button" onClick={(e) => { e.stopPropagation(); removeSearchTag(tag); }} className="hover:bg-blue-500/40 text-blue-300 w-3.5 h-3.5 rounded flex items-center justify-center"><X className="w-2.5 h-2.5" /></button>
                  </span>
                ))}
                <input ref={inputRef} type="text" placeholder={searchTags.length === 0 ? "Type title or #tags with a space..." : ""} value={textInput} onChange={handleInputChange} onKeyDown={handleInputKeyDown} className="flex-1 min-w-[120px] text-xs bg-transparent text-white placeholder-gray-500 focus:outline-none" />
              </div>

              {user && (
                <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700 text-[11px] font-medium shrink-0">
                  <button onClick={() => setFeedView('all')} className={`px-2.5 py-1.5 rounded-md transition flex items-center gap-1 ${feedView === 'all' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}><Globe className="w-3.5 h-3.5" /> All</button>
                  <button onClick={() => setFeedView('saved')} className={`px-2.5 py-1.5 rounded-md transition flex items-center gap-1 ${feedView === 'saved' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}><Bookmark className="w-3.5 h-3.5" /> Saved ({links.filter(l => l.saves?.some((s: any) => s.user_id === user.id)).length})</button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-800/40 border border-gray-800 p-3 rounded-lg text-xs text-gray-400 space-y-1 font-medium">
            <span className="text-gray-200 flex items-center gap-1.5"><Lightbulb className="w-4 h-4 text-amber-400" /> How to query multiple filters at once:</span>
            <p>Type your tags using a hashtag and follow them with a <kbd className="bg-gray-900 border border-gray-700 px-1 py-0.5 rounded text-gray-300 font-mono text-[10px]">Space</kbd> to turn them into bubbles, then type any regular title text.</p>
          </div>

          {loading ? (
            <p className="text-center text-gray-400 animate-pulse py-12">Loading feed...</p>
          ) : displayedLinks.length === 0 ? (
            <p className="text-center text-gray-500 py-12 bg-gray-800/30 rounded-xl border border-gray-800">⚡ No matches found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedLinks.map((link) => {
                const isLiked = link.likes?.some((l: any) => l.user_id === user?.id) || false
                const isSaved = link.saves?.some((s: any) => s.user_id === user?.id) || false
                const isOwnPost = user && link.user_id === user.id
                const likesCount = link.likes?.length || 0

                return (
                  <div key={link.id} className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex flex-col justify-between h-full space-y-4 shadow-md relative group hover:border-gray-600 transition">
                    
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                      {/* Flag Button */}
                      {user && !isOwnPost && (
                        <button 
                          onClick={() => setSelectedReportLinkId(link.id)}
                          className="bg-gray-900/50 border border-gray-700 text-gray-400 hover:text-amber-400 hover:border-amber-500/50 p-1.5 rounded-lg transition duration-200"
                          title="Report Content"
                        >
                          <Flag className="w-4 h-4" />
                        </button>
                      )}

                      {isOwnPost && (
                        <button onClick={() => handleDeletePost(link.id)} className="bg-gray-900/50 border border-gray-700 text-gray-400 hover:text-red-400 hover:border-red-500/50 p-1.5 rounded-lg transition duration-200"><Trash2 className="w-4 h-4" /></button>
                      )}

                      {user && (
                        <button onClick={() => handleToggleSave(link.id, isSaved)} className={`p-1.5 rounded-lg border transition duration-200 ${isSaved ? 'bg-blue-900/40 border-blue-500 text-blue-400' : 'bg-gray-900/50 border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'}`}><Bookmark className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} /></button>
                      )}
                    </div>

                    <div className="space-y-3">
                      {link.profiles && (
                        <Link href={`/user/${link.user_id}`} className="flex items-center gap-2 group border-b border-gray-700/50 pb-2 max-w-[70%]">
                          <img src={link.profiles.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg'} alt="Avatar" className="w-6 h-6 rounded-full bg-gray-900 object-cover" />
                          <span className="text-xs font-semibold text-gray-300 group-hover:text-blue-400 transition truncate">@{link.profiles.username || 'user'}</span>
                        </Link>
                      )}
                      <div>
                        <h3 className="text-lg font-bold text-white truncate pr-20">{link.title}</h3>
                        <p className="text-gray-400 text-xs line-clamp-2 mt-1">{link.description || 'No description.'}</p>
                        {link.tags && link.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2.5">
                            {link.tags.map((tag: string, i: number) => <span key={i} className="bg-gray-900 text-blue-400 border border-gray-700/60 rounded text-[10px] px-1.5 py-0.5 font-mono">#{tag}</span>)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-gray-700/40 pt-2">
                      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                        <span className="font-medium">{link.views || 0} views</span>
                        <button onClick={() => handleToggleLike(link.id, isLiked)} className={`flex items-center gap-1 font-medium transition ${isLiked ? 'text-red-400' : 'text-gray-500 hover:text-red-300'}`}><Heart className="w-4 h-4" fill={isLiked ? "currentColor" : "none"} /><span>{likesCount}</span></button>
                      </div>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" onClick={() => trackView(link.id, link.views)} className="flex items-center justify-center gap-1.5 w-full bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 rounded-lg transition font-medium">Open Files <ExternalLink className="w-3.5 h-3.5" /></a>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>

      {/* --- REPORT DIALOG MODAL LAYOUT --- */}
      {selectedReportLinkId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-gray-700 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Flag className="w-5 h-5 text-amber-400" /> Flag Resource
              </h3>
              <button onClick={() => setSelectedReportLinkId(null)} className="text-gray-400 hover:text-white transition p-1 rounded-lg bg-gray-900/50"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Reason for Report</label>
                <select value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition">
                  <option value="stolen content">Stolen Content</option>
                  <option value="inappropriate content">Inappropriate Content</option>
                  <option value="malware">Malware / Virus</option>
                  <option value="other">Other Issue</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Additional Details</label>
                <textarea required rows={4} placeholder="Please specify why this content should be reviewed..." value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition resize-none" />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={() => setSelectedReportLinkId(null)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium transition">Cancel</button>
                <button type="submit" disabled={reporting} className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white py-2 rounded-lg text-sm font-medium transition shadow-md">{reporting ? 'Filing Report...' : 'Submit Flag'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}