'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface CloudLink {
  id: number
  title: string
  url: string
  description: string
  tags: string[]
  created_at: string
}

export default function Home() {
  // --- STATE FOR VIEWING POSTS ---
  const [links, setLinks] = useState<CloudLink[]>([])
  const [loading, setLoading] = useState(true)

  // --- STATE FOR CREATING A POST ---
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Function to pull latest data from Supabase
  async function fetchLinks() {
    const { data, error } = await supabase
      .from('links')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching links:', error.message)
    } else if (data) {
      setLinks(data as CloudLink[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchLinks()
  }, [])

  // --- HANDLER TO SUBMIT A NEW POST ---
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')

    // Basic Validation
    if (!title || !url) {
      setFormError('Title and URL are required!')
      setSubmitting(false)
      return
    }

    // Process comma-separated tags into a clean array (e.g., "math, notes" -> ["math", "notes"])
    const processedTags = tagsInput
      ? tagsInput.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean)
      : []

    // Insert data into Supabase 'links' table
    const { error } = await supabase.from('links').insert([
      {
        title,
        url,
        description,
        tags: processedTags,
      },
    ])

    if (error) {
      setFormError(error.message)
      setSubmitting(false)
    } else {
      // Clear the form fields on success
      setTitle('')
      setUrl('')
      setDescription('')
      setTagsInput('')
      setSubmitting(false)
      
      // Instantly refresh the view grid with the new post!
      fetchLinks()
    }
  }

  const getDisplayImage = (url: string) => {
    if (url.includes('drive.google.com')) {
      return 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=500&q=80'
    }
    return 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=500&q=80'
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      {/* Header */}
      <header className="max-w-4xl mx-auto mb-12 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent sm:text-5xl">
          Cloud Link Vault
        </h1>
        <p className="mt-2 text-gray-400">Share and discover cloud resources instantly.</p>
      </header>

      <main className="max-w-4xl mx-auto space-y-12">
        {/* 1) INTERFACE: CREATE A POST FORM */}
        <section className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span>➕</span> Share a New Resource
          </h2>
          
          <form onSubmit={handleCreatePost} className="space-y-4">
            {formError && (
              <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded-lg text-sm">
                ⚠️ {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Resource Title *</label>
                <input
                  type="text"
                  placeholder="e.g., Physics Midterm Study Guide"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Cloud Link URL *</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Description</label>
              <textarea
                placeholder="What is inside this folder? Mention any passwords or instructions..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Tags (separated by commas)</label>
              <input
                type="text"
                placeholder="exam, notes, physics"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-medium py-2 px-4 rounded-lg transition duration-200 shadow-md"
            >
              {submitting ? 'Uploading to Vault...' : 'Post to Vault 🚀'}
            </button>
          </form>
        </section>

        <hr className="border-gray-800" />

        {/* 2) INTERFACE: VIEW ALL POSTS */}
        <section>
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span>📂</span> Explorable Vault Items
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-400 animate-pulse">Loading links...</p>
            </div>
          ) : links.length === 0 ? (
            <div className="text-center p-12 bg-gray-800 rounded-xl border border-gray-700">
              <p className="text-gray-400">The vault is currently empty. Drop the first link above!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {links.map((link) => (
                <div 
                  key={link.id} 
                  className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-lg hover:shadow-xl hover:border-gray-600 transition flex flex-col h-full"
                >
                  <div className="h-32 w-full relative bg-gray-700">
                    <img 
                      src={getDisplayImage(link.url)} 
                      alt={link.title}
                      className="w-full h-full object-cover opacity-75"
                    />
                    <span className="absolute top-2 right-2 bg-gray-900/80 backdrop-blur-sm text-[10px] px-2 py-0.5 rounded-full font-semibold text-blue-400 border border-blue-500/20">
                      {link.url.includes('google.com') ? 'Google Drive' : 'OneDrive'}
                    </span>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-white truncate" title={link.title}>
                        {link.title}
                      </h3>
                      <p className="text-gray-400 text-xs line-clamp-2 mt-1">
                        {link.description || 'No description provided.'}
                      </p>
                    </div>

                    <div>
                      {link.tags && link.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {link.tags.map((tag, idx) => (
                            <span key={idx} className="text-[10px] bg-gray-900 text-gray-400 px-2 py-0.5 rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition"
                      >
                        Open Files ↗
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}