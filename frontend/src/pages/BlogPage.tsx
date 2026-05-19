import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getBlogPosts, getBlogCategories } from '../api/blog'
import { SEO } from '../components/SEO'
import { useState } from 'react'
import { Search } from 'lucide-react'

export function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined)
  const [searchTerm, setSearchTerm] = useState('')

  const { data: posts = [] } = useQuery({
    queryKey: ['blog-posts', selectedCategory],
    queryFn: () => getBlogPosts(selectedCategory, 0, 50),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['blog-categories'],
    queryFn: () => getBlogCategories(),
  })

  const filteredPosts = posts.filter(
    post =>
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.excerpt?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <>
      <SEO
        title="Blog & Gidsen - Speluitgaven tips & tricks"
        description="Leer hoe je het meeste uit je gaming budget haalt met onze gidsen en tutorials."
        url="/blog"
      />

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
        {/* Header */}
        <h1 style={{ color: '#082030', marginBottom: '10px' }}>📚 Blog & Gidsen</h1>
        <p style={{ color: '#5888a5', marginBottom: '30px', fontSize: '1rem' }}>
          Leer alles over spelkopen, veiligheid en tips & tricks
        </p>

        {/* Search & Filter */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '30px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '10px',
                color: '#5888a5',
              }}
            />
            <input
              type="text"
              placeholder="Zoek gidsen..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                border: '1px solid rgba(90, 175, 225, 0.3)',
                borderRadius: '8px',
                fontSize: '0.875rem',
                backgroundColor: 'rgba(255,255,255,0.8)',
              }}
            />
          </div>
        </div>

        {/* Category filter */}
        {categories.length > 0 && (
          <div style={{ marginBottom: '30px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedCategory(undefined)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(90, 175, 225, 0.3)',
                background: !selectedCategory ? 'rgba(18, 120, 168, 0.15)' : 'rgba(255,255,255,0.8)',
                color: !selectedCategory ? '#1278a8' : '#5888a5',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 500,
              }}
            >
              Alles
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(90, 175, 225, 0.3)',
                  background: selectedCategory === cat ? 'rgba(18, 120, 168, 0.15)' : 'rgba(255,255,255,0.8)',
                  color: selectedCategory === cat ? '#1278a8' : '#5888a5',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  textTransform: 'capitalize',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Posts grid */}
        <div style={{ display: 'grid', gap: '20px' }}>
          {filteredPosts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#5888a5' }}>
              <p>Geen gidsen gevonden</p>
            </div>
          ) : (
            filteredPosts.map(post => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: post.featured_image ? '200px 1fr' : '1fr',
                  gap: '20px',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid rgba(90, 175, 225, 0.3)',
                  backgroundColor: 'rgba(225, 245, 255, 0.5)',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e =>
                  (e.currentTarget.style.backgroundColor = 'rgba(225, 245, 255, 0.8)')
                }
                onMouseLeave={e =>
                  (e.currentTarget.style.backgroundColor = 'rgba(225, 245, 255, 0.5)')
                }
              >
                {/* Image */}
                {post.featured_image && (
                  <img
                    src={post.featured_image}
                    alt={post.title}
                    loading="lazy"
                    decoding="async"
                    style={{
                      width: '100%',
                      height: '150px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                    }}
                  />
                )}

                {/* Content */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'rgba(18, 120, 168, 0.2)',
                          color: '#1278a8',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                        }}
                      >
                        {post.category}
                      </span>
                    </div>
                    <h3 style={{ color: '#082030', marginBottom: '8px', fontSize: '1.1rem' }}>
                      {post.title}
                    </h3>
                    <p style={{ color: '#5888a5', fontSize: '0.875rem', marginBottom: '10px' }}>
                      {post.excerpt || post.content.substring(0, 120) + '...'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: '#7aabcc' }}>
                    <span>{post.author}</span>
                    <span>{formatDate(post.published_at || post.created_at)}</span>
                    <span>{post.view_count} views</span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </>
  )
}
