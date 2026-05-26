import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  createBlogPost,
  deleteBlogPost,
  getAdminBlogPosts,
  getGuidesVisibility,
  setGuidesVisibility,
  updateBlogPost,
  type BlogPost,
  type BlogPostCreatePayload,
  type BlogPostUpdatePayload,
} from '../api/blog'
import { getTodayDealSkipHistory, skipDealOfTheDay } from '../api/games'
import { useAuthStore } from '../store/authStore'

const ADMIN_USERNAME = 'odinwattz'
const ADMIN_EMAIL = 'odinwattez@outlook.com'

type Category = 'guide' | 'news' | 'tutorial'

const defaultForm: BlogPostCreatePayload = {
  slug: '',
  title: '',
  excerpt: '',
  content: '',
  category: 'guide',
  featured_image: '',
  is_published: true,
}

export function AdminBlogPage() {
  const { user, isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null)
  const [formData, setFormData] = useState<BlogPostCreatePayload>(defaultForm)

  const isAdmin = useMemo(() => {
    return (
      !!user &&
      user.username?.toLowerCase() === ADMIN_USERNAME &&
      user.email?.toLowerCase() === ADMIN_EMAIL
    )
  }, [user])

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['admin-blog-posts'],
    queryFn: getAdminBlogPosts,
    enabled: isAuthenticated() && isAdmin,
  })

  const { data: guidesVisibility } = useQuery({
    queryKey: ['blog-guides-visibility'],
    queryFn: getGuidesVisibility,
    enabled: isAuthenticated() && isAdmin,
  })

  const { data: dealSkipHistory, isLoading: isLoadingDealSkipHistory } = useQuery({
    queryKey: ['deal-of-the-day-skips-today'],
    queryFn: getTodayDealSkipHistory,
    enabled: isAuthenticated() && isAdmin,
  })

  const createMutation = useMutation({
    mutationFn: createBlogPost,
    onSuccess: () => {
      toast.success('Blogpost aangemaakt')
      setFormData(defaultForm)
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] })
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] })
    },
    onError: () => toast.error('Aanmaken mislukt'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ postId, data }: { postId: number; data: BlogPostUpdatePayload }) =>
      updateBlogPost(postId, data),
    onSuccess: () => {
      toast.success('Blogpost bijgewerkt')
      setEditingPost(null)
      setFormData(defaultForm)
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] })
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] })
    },
    onError: () => toast.error('Updaten mislukt'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBlogPost,
    onSuccess: () => {
      toast.success('Blogpost verwijderd')
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] })
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] })
    },
    onError: () => toast.error('Verwijderen mislukt'),
  })

  const toggleGuidesVisibilityMutation = useMutation({
    mutationFn: setGuidesVisibility,
    onSuccess: (data) => {
      toast.success(data.guides_enabled ? 'Gidsen knop aangezet' : 'Gidsen knop uitgezet')
      queryClient.invalidateQueries({ queryKey: ['blog-guides-visibility'] })
    },
    onError: () => toast.error('Gidsen zichtbaarheid aanpassen mislukt'),
  })

  const skipDealOfDayMutation = useMutation({
    mutationFn: skipDealOfTheDay,
    onSuccess: (deal) => {
      toast.success(`Nieuwe featured deal: ${deal.name}`)
      queryClient.invalidateQueries({ queryKey: ['deal-of-the-day'] })
      queryClient.invalidateQueries({ queryKey: ['deal-of-the-day-skips-today'] })
    },
    onError: () => toast.error('Featured game skippen mislukt'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Titel en content zijn verplicht')
      return
    }

    if (!editingPost && !formData.slug.trim()) {
      toast.error('Slug is verplicht voor een nieuwe post')
      return
    }

    if (editingPost) {
      const updateData: BlogPostUpdatePayload = {
        title: formData.title,
        excerpt: formData.excerpt,
        content: formData.content,
        category: formData.category,
        featured_image: formData.featured_image,
        is_published: formData.is_published,
      }
      updateMutation.mutate({ postId: editingPost.id, data: updateData })
      return
    }

    createMutation.mutate(formData)
  }

  const startEdit = (post: BlogPost) => {
    setEditingPost(post)
    setFormData({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt || '',
      content: post.content,
      category: post.category as Category,
      author: post.author,
      featured_image: post.featured_image || '',
      is_published: post.is_published,
    })
  }

  const cancelEdit = () => {
    setEditingPost(null)
    setFormData(defaultForm)
  }

  if (!isAuthenticated()) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 20px' }}>
        <h1 style={{ color: '#082030' }}>Admin Blog</h1>
        <p style={{ color: '#5888a5' }}>Log eerst in om de adminpagina te bekijken.</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 20px' }}>
        <h1 style={{ color: '#082030' }}>Geen toegang</h1>
        <p style={{ color: '#5888a5' }}>
          Alleen odinwattz met e-mail odinwattez@outlook.com mag deze pagina gebruiken.
        </p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 20px 40px' }}>
      <h1 style={{ color: '#082030', marginBottom: '8px' }}>Blog Admin</h1>
      <p style={{ color: '#5888a5', marginBottom: '20px' }}>
        Voeg blogposts toe, werk ze bij of verwijder ze.
      </p>

      <section
        style={{
          border: '1px solid rgba(90, 175, 225, 0.35)',
          background: 'rgba(225,245,255,0.5)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
        }}
      >
        <h2 style={{ color: '#082030', margin: '0 0 6px' }}>Site zichtbaarheid</h2>
        <p style={{ color: '#5888a5', margin: '0 0 10px' }}>
          Verberg of toon de Gidsen knop voor iedereen in de navbar.
        </p>
        <label style={{ color: '#1a4a68', fontSize: '0.95rem' }}>
          <input
            type="checkbox"
            checked={guidesVisibility?.guides_enabled ?? true}
            disabled={toggleGuidesVisibilityMutation.isPending}
            onChange={(e) => toggleGuidesVisibilityMutation.mutate(e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          Gidsen knop tonen in navbar
        </label>
      </section>

      <section
        style={{
          border: '1px solid rgba(90, 175, 225, 0.35)',
          background: 'rgba(225,245,255,0.5)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
        }}
      >
        <h2 style={{ color: '#082030', margin: '0 0 6px' }}>Deal of the Day</h2>
        <p style={{ color: '#5888a5', margin: '0 0 10px' }}>
          Forceer direct een andere featured game voor vandaag.
        </p>
        <button
          type="button"
          onClick={() => skipDealOfDayMutation.mutate()}
          disabled={skipDealOfDayMutation.isPending}
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            border: 'none',
            background: '#1278a8',
            color: 'white',
            cursor: skipDealOfDayMutation.isPending ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            opacity: skipDealOfDayMutation.isPending ? 0.75 : 1,
          }}
        >
          {skipDealOfDayMutation.isPending ? 'Nieuwe featured game ophalen...' : 'Skip featured game'}
        </button>
        <div style={{ marginTop: '12px', color: '#1a4a68', fontSize: '0.92rem' }}>
          {isLoadingDealSkipHistory ? (
            <span style={{ color: '#5888a5' }}>Skipgeschiedenis laden...</span>
          ) : (
            <>
              <div style={{ marginBottom: '8px' }}>
                Vandaag geskipt: <strong>{dealSkipHistory?.count ?? 0}</strong>
              </div>
              {(dealSkipHistory?.skipped_appids?.length ?? 0) > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {dealSkipHistory?.skipped_appids.map((appid) => (
                    <span
                      key={appid}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '999px',
                        background: 'rgba(18, 120, 168, 0.12)',
                        border: '1px solid rgba(18, 120, 168, 0.25)',
                        color: '#1278a8',
                        fontFamily: 'monospace',
                      }}
                    >
                      {appid}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        style={{
          border: '1px solid rgba(90, 175, 225, 0.35)',
          background: 'rgba(225,245,255,0.5)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          display: 'grid',
          gap: '10px',
        }}
      >
        <input
          placeholder="Slug (bijv. mijn-blogpost)"
          value={formData.slug}
          disabled={!!editingPost}
          onChange={e => setFormData(prev => ({ ...prev, slug: e.target.value }))}
          style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(90,175,225,0.4)' }}
        />
        <input
          placeholder="Titel"
          value={formData.title}
          onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
          style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(90,175,225,0.4)' }}
        />
        <input
          placeholder="Korte samenvatting"
          value={formData.excerpt || ''}
          onChange={e => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
          style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(90,175,225,0.4)' }}
        />
        <select
          value={formData.category}
          onChange={e => setFormData(prev => ({ ...prev, category: e.target.value as Category }))}
          style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(90,175,225,0.4)' }}
        >
          <option value="guide">guide</option>
          <option value="news">news</option>
          <option value="tutorial">tutorial</option>
        </select>
        <input
          placeholder="Featured image URL (optioneel)"
          value={formData.featured_image || ''}
          onChange={e => setFormData(prev => ({ ...prev, featured_image: e.target.value }))}
          style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(90,175,225,0.4)' }}
        />
        <label style={{ color: '#1a4a68', fontSize: '0.9rem' }}>
          <input
            type="checkbox"
            checked={formData.is_published}
            onChange={e => setFormData(prev => ({ ...prev, is_published: e.target.checked }))}
            style={{ marginRight: '8px' }}
          />
          Gepubliceerd
        </label>
        <textarea
          placeholder="Markdown content"
          value={formData.content}
          onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
          rows={12}
          style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(90,175,225,0.4)' }}
        />
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: 'none',
              background: '#1278a8',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {editingPost ? 'Update post' : 'Nieuwe post maken'}
          </button>
          {editingPost && (
            <button
              type="button"
              onClick={cancelEdit}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(90,175,225,0.4)',
                background: 'white',
                color: '#1a4a68',
                cursor: 'pointer',
              }}
            >
              Annuleren
            </button>
          )}
        </div>
      </form>

      <div style={{ display: 'grid', gap: '10px' }}>
        <h2 style={{ color: '#082030', marginBottom: '4px' }}>Alle posts</h2>
        {isLoading ? (
          <p style={{ color: '#5888a5' }}>Laden...</p>
        ) : (
          posts.map(post => (
            <div
              key={post.id}
              style={{
                border: '1px solid rgba(90,175,225,0.3)',
                borderRadius: '10px',
                padding: '12px',
                background: post.is_published ? 'rgba(225,245,255,0.45)' : 'rgba(245,245,245,0.8)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div>
                <div style={{ color: '#082030', fontWeight: 600 }}>{post.title}</div>
                <div style={{ color: '#5888a5', fontSize: '0.85rem' }}>
                  /blog/{post.slug} | {post.category} | {post.is_published ? 'published' : 'draft'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => startEdit(post)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(90,175,225,0.4)',
                    background: 'white',
                    color: '#1a4a68',
                    cursor: 'pointer',
                  }}
                >
                  Bewerken
                </button>
                <button
                  onClick={() => deleteMutation.mutate(post.id)}
                  disabled={deleteMutation.isPending}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#c24141',
                    color: 'white',
                    cursor: 'pointer',
                  }}
                >
                  Verwijderen
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
