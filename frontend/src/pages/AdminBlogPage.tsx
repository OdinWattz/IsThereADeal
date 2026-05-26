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
import {
  addFeaturedBlacklistItem,
  addFeaturedQueueItem,
  addFeaturedWhitelistItem,
  deleteDealSkipHistoryByDate,
  deleteDealSkipHistoryItem,
  deleteFeaturedBlacklistItem,
  deleteFeaturedQueueItem,
  deleteFeaturedWhitelistItem,
  getAdminAuditLog,
  getAdminHealth,
  getAdminUsers,
  getDealSkipHistory,
  getFeaturedBlacklist,
  getFeaturedConfig,
  getFeaturedQueue,
  getFeaturedWhitelist,
  getTodayDealSkipHistory,
  setAdminUserActive,
  setManualFeaturedDeal,
  skipDealOfTheDay,
  updateFeaturedConfig,
} from '../api/games'
import { useAuthStore } from '../store/authStore'

const ADMIN_USERNAME = 'odinwattz'
const ADMIN_EMAIL = 'odinwattez@outlook.com'
const ADMIN_USER_ID = 1

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
  const [manualFeaturedAppid, setManualFeaturedAppid] = useState('')
  const [queueAppid, setQueueAppid] = useState('')
  const [queueNote, setQueueNote] = useState('')
  const [blacklistAppid, setBlacklistAppid] = useState('')
  const [blacklistReason, setBlacklistReason] = useState('')
  const [blacklistDays, setBlacklistDays] = useState('')
  const [whitelistAppid, setWhitelistAppid] = useState('')
  const [whitelistBoost, setWhitelistBoost] = useState('3')
  const [skipDeleteDate, setSkipDeleteDate] = useState('')

  const isAdmin = useMemo(() => {
    return (
      !!user &&
      user.id === ADMIN_USER_ID &&
      user.username === ADMIN_USERNAME &&
      user.email === ADMIN_EMAIL
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

  const { data: fullDealSkipHistory, isLoading: isLoadingFullDealSkipHistory } = useQuery({
    queryKey: ['deal-of-the-day-skips-history'],
    queryFn: () => getDealSkipHistory(150),
    enabled: isAuthenticated() && isAdmin,
  })

  const { data: featuredConfig } = useQuery({
    queryKey: ['featured-config'],
    queryFn: getFeaturedConfig,
    enabled: isAuthenticated() && isAdmin,
  })

  const { data: featuredQueue } = useQuery({
    queryKey: ['featured-queue'],
    queryFn: getFeaturedQueue,
    enabled: isAuthenticated() && isAdmin,
  })

  const { data: featuredBlacklist } = useQuery({
    queryKey: ['featured-blacklist'],
    queryFn: getFeaturedBlacklist,
    enabled: isAuthenticated() && isAdmin,
  })

  const { data: featuredWhitelist } = useQuery({
    queryKey: ['featured-whitelist'],
    queryFn: getFeaturedWhitelist,
    enabled: isAuthenticated() && isAdmin,
  })

  const { data: adminHealth } = useQuery({
    queryKey: ['admin-health'],
    queryFn: getAdminHealth,
    enabled: isAuthenticated() && isAdmin,
  })

  const { data: adminAuditLog } = useQuery({
    queryKey: ['admin-audit-log'],
    queryFn: () => getAdminAuditLog(80),
    enabled: isAuthenticated() && isAdmin,
  })

  const { data: adminUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => getAdminUsers(100),
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
      queryClient.invalidateQueries({ queryKey: ['deal-of-the-day-skips-history'] })
    },
    onError: () => toast.error('Featured game skippen mislukt'),
  })

  const deleteSkipHistoryItemMutation = useMutation({
    mutationFn: deleteDealSkipHistoryItem,
    onSuccess: () => {
      toast.success('Skip-entry verwijderd')
      queryClient.invalidateQueries({ queryKey: ['deal-of-the-day-skips-today'] })
      queryClient.invalidateQueries({ queryKey: ['deal-of-the-day-skips-history'] })
    },
    onError: () => toast.error('Verwijderen van skip-entry mislukt'),
  })

  const deleteSkipHistoryByDateMutation = useMutation({
    mutationFn: deleteDealSkipHistoryByDate,
    onSuccess: () => {
      toast.success('Skip-entries voor datum verwijderd')
      queryClient.invalidateQueries({ queryKey: ['deal-of-the-day-skips-today'] })
      queryClient.invalidateQueries({ queryKey: ['deal-of-the-day-skips-history'] })
      queryClient.invalidateQueries({ queryKey: ['admin-audit-log'] })
    },
    onError: () => toast.error('Bulk verwijderen mislukt'),
  })

  const updateFeaturedConfigMutation = useMutation({
    mutationFn: updateFeaturedConfig,
    onSuccess: () => {
      toast.success('Featured config bijgewerkt')
      queryClient.invalidateQueries({ queryKey: ['featured-config'] })
      queryClient.invalidateQueries({ queryKey: ['admin-audit-log'] })
    },
    onError: () => toast.error('Config bijwerken mislukt'),
  })

  const manualFeaturedMutation = useMutation({
    mutationFn: setManualFeaturedDeal,
    onSuccess: (deal) => {
      toast.success(`Handmatig ingesteld: ${deal.name}`)
      queryClient.invalidateQueries({ queryKey: ['deal-of-the-day'] })
      queryClient.invalidateQueries({ queryKey: ['admin-audit-log'] })
    },
    onError: () => toast.error('Handmatig instellen mislukt'),
  })

  const addQueueItemMutation = useMutation({
    mutationFn: ({ steam_appid, note }: { steam_appid: string; note?: string }) => addFeaturedQueueItem(steam_appid, note),
    onSuccess: () => {
      toast.success('Queue-item toegevoegd')
      setQueueAppid('')
      setQueueNote('')
      queryClient.invalidateQueries({ queryKey: ['featured-queue'] })
      queryClient.invalidateQueries({ queryKey: ['admin-audit-log'] })
    },
    onError: () => toast.error('Queue-item toevoegen mislukt'),
  })

  const deleteQueueItemMutation = useMutation({
    mutationFn: deleteFeaturedQueueItem,
    onSuccess: () => {
      toast.success('Queue-item verwijderd')
      queryClient.invalidateQueries({ queryKey: ['featured-queue'] })
      queryClient.invalidateQueries({ queryKey: ['admin-audit-log'] })
    },
    onError: () => toast.error('Queue-item verwijderen mislukt'),
  })

  const addBlacklistItemMutation = useMutation({
    mutationFn: ({ steam_appid, reason, expires_in_days }: { steam_appid: string; reason?: string; expires_in_days?: number }) =>
      addFeaturedBlacklistItem(steam_appid, reason, expires_in_days),
    onSuccess: () => {
      toast.success('Blacklist bijgewerkt')
      setBlacklistAppid('')
      setBlacklistReason('')
      setBlacklistDays('')
      queryClient.invalidateQueries({ queryKey: ['featured-blacklist'] })
      queryClient.invalidateQueries({ queryKey: ['admin-audit-log'] })
    },
    onError: () => toast.error('Blacklist bijwerken mislukt'),
  })

  const deleteBlacklistItemMutation = useMutation({
    mutationFn: deleteFeaturedBlacklistItem,
    onSuccess: () => {
      toast.success('Blacklist item verwijderd')
      queryClient.invalidateQueries({ queryKey: ['featured-blacklist'] })
      queryClient.invalidateQueries({ queryKey: ['admin-audit-log'] })
    },
    onError: () => toast.error('Blacklist verwijderen mislukt'),
  })

  const addWhitelistItemMutation = useMutation({
    mutationFn: ({ steam_appid, boost }: { steam_appid: string; boost: number }) => addFeaturedWhitelistItem(steam_appid, boost),
    onSuccess: () => {
      toast.success('Whitelist bijgewerkt')
      setWhitelistAppid('')
      setWhitelistBoost('3')
      queryClient.invalidateQueries({ queryKey: ['featured-whitelist'] })
      queryClient.invalidateQueries({ queryKey: ['admin-audit-log'] })
    },
    onError: () => toast.error('Whitelist bijwerken mislukt'),
  })

  const deleteWhitelistItemMutation = useMutation({
    mutationFn: deleteFeaturedWhitelistItem,
    onSuccess: () => {
      toast.success('Whitelist item verwijderd')
      queryClient.invalidateQueries({ queryKey: ['featured-whitelist'] })
      queryClient.invalidateQueries({ queryKey: ['admin-audit-log'] })
    },
    onError: () => toast.error('Whitelist verwijderen mislukt'),
  })

  const setUserActiveMutation = useMutation({
    mutationFn: ({ userId, is_active }: { userId: number; is_active: boolean }) => setAdminUserActive(userId, is_active),
    onSuccess: () => {
      toast.success('Gebruikerstatus aangepast')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: () => toast.error('Gebruikerstatus aanpassen mislukt'),
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

      <section
        style={{
          border: '1px solid rgba(90, 175, 225, 0.35)',
          background: 'rgba(225,245,255,0.5)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
        }}
      >
        <h2 style={{ color: '#082030', margin: '0 0 6px' }}>Featured skip history</h2>
        <p style={{ color: '#5888a5', margin: '0 0 10px' }}>
          Verwijder entries om geskiptte games weer beschikbaar te maken voor selectie.
        </p>
        {isLoadingFullDealSkipHistory ? (
          <p style={{ color: '#5888a5' }}>Geschiedenis laden...</p>
        ) : (
          <div style={{ display: 'grid', gap: '8px' }}>
            <div style={{ color: '#1a4a68', fontSize: '0.92rem' }}>
              Totaal entries: <strong>{fullDealSkipHistory?.count ?? 0}</strong>
            </div>
            {(fullDealSkipHistory?.items?.length ?? 0) === 0 ? (
              <p style={{ color: '#5888a5' }}>Nog geen skipgeschiedenis aanwezig.</p>
            ) : (
              fullDealSkipHistory?.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px',
                    border: '1px solid rgba(90,175,225,0.28)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    background: 'rgba(255,255,255,0.55)',
                  }}
                >
                  <div style={{ color: '#1a4a68', fontSize: '0.88rem' }}>
                    <strong style={{ fontFamily: 'monospace' }}>{item.steam_appid}</strong>
                    {' · '}
                    {item.featured_date ?? 'onbekende datum'}
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteSkipHistoryItemMutation.mutate(item.id)}
                    disabled={deleteSkipHistoryItemMutation.isPending}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#c24141',
                      color: 'white',
                      cursor: deleteSkipHistoryItemMutation.isPending ? 'not-allowed' : 'pointer',
                      opacity: deleteSkipHistoryItemMutation.isPending ? 0.75 : 1,
                      fontSize: '0.85rem',
                    }}
                  >
                    Verwijder
                  </button>
                </div>
              ))
            )}
          </div>
        )}
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
        <h2 style={{ color: '#082030', margin: '0 0 8px' }}>Admin Health</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px' }}>
          <div style={{ color: '#1a4a68' }}>Skips vandaag: <strong>{adminHealth?.today_skip_count ?? 0}</strong></div>
          <div style={{ color: '#1a4a68' }}>Queue pending: <strong>{adminHealth?.queue_pending ?? 0}</strong></div>
          <div style={{ color: '#1a4a68' }}>Blacklist actief: <strong>{adminHealth?.blacklist_active ?? 0}</strong></div>
          <div style={{ color: '#1a4a68' }}>Whitelist actief: <strong>{adminHealth?.whitelist_active ?? 0}</strong></div>
          <div style={{ color: '#1a4a68' }}>Users: <strong>{adminHealth?.user_count ?? 0}</strong></div>
        </div>
      </section>

      <section
        style={{
          border: '1px solid rgba(90, 175, 225, 0.35)',
          background: 'rgba(225,245,255,0.5)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
          display: 'grid',
          gap: '12px',
        }}
      >
        <h2 style={{ color: '#082030', margin: 0 }}>Featured Controls</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px' }}>
          <input
            type="number"
            step="0.1"
            placeholder="Min deal rating"
            defaultValue={featuredConfig?.min_deal_rating ?? 5}
            id="featured_min_deal_rating"
            style={{ padding: '8px', borderRadius: '8px', border: '1px solid rgba(90,175,225,0.4)' }}
          />
          <input
            type="number"
            step="0.01"
            placeholder="Min sale price"
            defaultValue={featuredConfig?.min_sale_price ?? 1}
            id="featured_min_sale_price"
            style={{ padding: '8px', borderRadius: '8px', border: '1px solid rgba(90,175,225,0.4)' }}
          />
          <input
            type="number"
            placeholder="Exclude days"
            defaultValue={featuredConfig?.exclude_days ?? 30}
            id="featured_exclude_days"
            style={{ padding: '8px', borderRadius: '8px', border: '1px solid rgba(90,175,225,0.4)' }}
          />
          <input
            type="number"
            placeholder="Image retries"
            defaultValue={featuredConfig?.image_retry_count ?? 10}
            id="featured_image_retry_count"
            style={{ padding: '8px', borderRadius: '8px', border: '1px solid rgba(90,175,225,0.4)' }}
          />
        </div>
        <div>
          <button
            type="button"
            onClick={() => {
              const minDealRating = Number((document.getElementById('featured_min_deal_rating') as HTMLInputElement)?.value || 5)
              const minSalePrice = Number((document.getElementById('featured_min_sale_price') as HTMLInputElement)?.value || 1)
              const excludeDays = Number((document.getElementById('featured_exclude_days') as HTMLInputElement)?.value || 30)
              const imageRetries = Number((document.getElementById('featured_image_retry_count') as HTMLInputElement)?.value || 10)
              updateFeaturedConfigMutation.mutate({
                min_deal_rating: minDealRating,
                min_sale_price: minSalePrice,
                exclude_days: excludeDays,
                image_retry_count: imageRetries,
              })
            }}
            style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: '#1278a8', color: 'white', fontWeight: 600, cursor: 'pointer' }}
          >
            Save featured config
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input
            placeholder="Manual featured appid"
            value={manualFeaturedAppid}
            onChange={(e) => setManualFeaturedAppid(e.target.value)}
            style={{ padding: '8px', borderRadius: '8px', border: '1px solid rgba(90,175,225,0.4)', minWidth: '220px' }}
          />
          <button
            type="button"
            onClick={() => manualFeaturedMutation.mutate(manualFeaturedAppid)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: '#1278a8', color: 'white', cursor: 'pointer' }}
          >
            Set manual featured
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input
            placeholder="Queue appid"
            value={queueAppid}
            onChange={(e) => setQueueAppid(e.target.value)}
            style={{ padding: '8px', borderRadius: '8px', border: '1px solid rgba(90,175,225,0.4)', minWidth: '180px' }}
          />
          <input
            placeholder="Queue note"
            value={queueNote}
            onChange={(e) => setQueueNote(e.target.value)}
            style={{ padding: '8px', borderRadius: '8px', border: '1px solid rgba(90,175,225,0.4)', minWidth: '220px' }}
          />
          <button type="button" onClick={() => addQueueItemMutation.mutate({ steam_appid: queueAppid, note: queueNote })} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: '#1278a8', color: 'white', cursor: 'pointer' }}>
            Add queue
          </button>
        </div>
        <div style={{ display: 'grid', gap: '6px' }}>
          {featuredQueue?.items?.slice(0, 12).map((item) => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(90,175,225,0.28)', borderRadius: '8px', padding: '6px 8px' }}>
              <span style={{ color: '#1a4a68', fontSize: '0.86rem' }}>{item.position}. {item.steam_appid} {item.consumed_at ? '(consumed)' : ''}</span>
              <button type="button" onClick={() => deleteQueueItemMutation.mutate(item.id)} style={{ padding: '5px 8px', borderRadius: '6px', border: 'none', background: '#c24141', color: 'white', cursor: 'pointer', fontSize: '0.8rem' }}>Delete</button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input placeholder="Blacklist appid" value={blacklistAppid} onChange={(e) => setBlacklistAppid(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid rgba(90,175,225,0.4)', minWidth: '180px' }} />
          <input placeholder="Reason" value={blacklistReason} onChange={(e) => setBlacklistReason(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid rgba(90,175,225,0.4)', minWidth: '220px' }} />
          <input placeholder="Expires in days" value={blacklistDays} onChange={(e) => setBlacklistDays(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid rgba(90,175,225,0.4)', width: '130px' }} />
          <button type="button" onClick={() => addBlacklistItemMutation.mutate({ steam_appid: blacklistAppid, reason: blacklistReason, expires_in_days: blacklistDays ? Number(blacklistDays) : undefined })} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: '#1278a8', color: 'white', cursor: 'pointer' }}>
            Add blacklist
          </button>
        </div>
        <div style={{ display: 'grid', gap: '6px' }}>
          {featuredBlacklist?.items?.slice(0, 12).map((item) => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(90,175,225,0.28)', borderRadius: '8px', padding: '6px 8px' }}>
              <span style={{ color: '#1a4a68', fontSize: '0.86rem' }}>{item.steam_appid} {item.reason ? `- ${item.reason}` : ''}</span>
              <button type="button" onClick={() => deleteBlacklistItemMutation.mutate(item.id)} style={{ padding: '5px 8px', borderRadius: '6px', border: 'none', background: '#c24141', color: 'white', cursor: 'pointer', fontSize: '0.8rem' }}>Delete</button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input placeholder="Whitelist appid" value={whitelistAppid} onChange={(e) => setWhitelistAppid(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid rgba(90,175,225,0.4)', minWidth: '180px' }} />
          <input placeholder="Boost" value={whitelistBoost} onChange={(e) => setWhitelistBoost(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid rgba(90,175,225,0.4)', width: '120px' }} />
          <button type="button" onClick={() => addWhitelistItemMutation.mutate({ steam_appid: whitelistAppid, boost: Number(whitelistBoost || 3) })} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: '#1278a8', color: 'white', cursor: 'pointer' }}>
            Add whitelist
          </button>
        </div>
        <div style={{ display: 'grid', gap: '6px' }}>
          {featuredWhitelist?.items?.slice(0, 12).map((item) => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(90,175,225,0.28)', borderRadius: '8px', padding: '6px 8px' }}>
              <span style={{ color: '#1a4a68', fontSize: '0.86rem' }}>{item.steam_appid} (boost {item.boost})</span>
              <button type="button" onClick={() => deleteWhitelistItemMutation.mutate(item.id)} style={{ padding: '5px 8px', borderRadius: '6px', border: 'none', background: '#c24141', color: 'white', cursor: 'pointer', fontSize: '0.8rem' }}>Delete</button>
            </div>
          ))}
        </div>
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
        <h2 style={{ color: '#082030', margin: '0 0 8px' }}>Skip History Tools</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="date" value={skipDeleteDate} onChange={(e) => setSkipDeleteDate(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid rgba(90,175,225,0.4)' }} />
          <button type="button" onClick={() => skipDeleteDate && deleteSkipHistoryByDateMutation.mutate(skipDeleteDate)} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: '#c24141', color: 'white', cursor: 'pointer' }}>
            Delete skips by date
          </button>
        </div>
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
        <h2 style={{ color: '#082030', margin: '0 0 8px' }}>User Moderation</h2>
        <div style={{ display: 'grid', gap: '6px' }}>
          {adminUsers?.items?.slice(0, 20).map((u) => (
            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(90,175,225,0.28)', borderRadius: '8px', padding: '6px 8px' }}>
              <span style={{ color: '#1a4a68', fontSize: '0.86rem' }}>{u.username} ({u.email})</span>
              <button type="button" onClick={() => setUserActiveMutation.mutate({ userId: u.id, is_active: !u.is_active })} style={{ padding: '5px 8px', borderRadius: '6px', border: 'none', background: u.is_active ? '#c24141' : '#1278a8', color: 'white', cursor: 'pointer', fontSize: '0.8rem' }}>
                {u.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          ))}
        </div>
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
        <h2 style={{ color: '#082030', margin: '0 0 8px' }}>Audit Log</h2>
        <div style={{ display: 'grid', gap: '6px' }}>
          {adminAuditLog?.items?.slice(0, 30).map((log) => (
            <div key={log.id} style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(90,175,225,0.28)', borderRadius: '8px', padding: '6px 8px', color: '#1a4a68', fontSize: '0.82rem' }}>
              <strong>{log.action}</strong> · {log.actor_username} · {log.target_value ?? '-'}
            </div>
          ))}
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
