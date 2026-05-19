import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getBlogPost } from '../api/blog'
import { SEO } from '../components/SEO'
import { ChevronLeft, Calendar, User } from 'lucide-react'

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>()
  
  const { data: post, isLoading, error } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: () => getBlogPost(slug!),
    enabled: !!slug,
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', color: '#5888a5' }}>
        <p>Guide laden...</p>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <h1 style={{ color: '#082030' }}>Guide niet gevonden</h1>
        <Link to="/blog" style={{ color: '#1278a8', textDecoration: 'none' }}>
          ← Terug naar blog
        </Link>
      </div>
    )
  }

  // Article schema for SEO
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || post.title,
    image: post.featured_image,
    author: {
      '@type': 'Organization',
      name: post.author,
    },
    datePublished: post.published_at,
    dateModified: post.updated_at,
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <>
      <SEO
        title={post.title}
        description={post.excerpt || post.title}
        image={post.featured_image}
        url={`/blog/${post.slug}`}
      />
      <script type="application/ld+json">
        {JSON.stringify(articleSchema)}
      </script>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
        {/* Back button */}
        <Link
          to="/blog"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: '#1278a8',
            textDecoration: 'none',
            marginBottom: '20px',
            fontSize: '0.875rem',
          }}
        >
          <ChevronLeft size={16} /> Terug naar blog
        </Link>

        {/* Featured image */}
        {post.featured_image && (
          <img
            src={post.featured_image}
            alt={post.title}
            loading="lazy"
            decoding="async"
            style={{
              width: '100%',
              maxHeight: '400px',
              objectFit: 'cover',
              borderRadius: '12px',
              marginBottom: '30px',
            }}
          />
        )}

        {/* Header */}
        <h1 style={{ color: '#082030', marginBottom: '10px', fontSize: '2rem' }}>
          {post.title}
        </h1>

        {/* Meta info */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', fontSize: '0.875rem', color: '#5888a5' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <User size={14} /> {post.author}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={14} /> {formatDate(post.published_at || post.created_at)}
          </span>
          <span style={{ background: 'rgba(18, 120, 168, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
            {post.category}
          </span>
        </div>

        {/* Content */}
        <div
          style={{
            fontSize: '1rem',
            lineHeight: '1.7',
            color: '#082030',
          }}
          className="blog-content"
          dangerouslySetInnerHTML={{
            __html: post.content
              .replace(/^### (.*?)$/gm, '<h3 style="color: #1278a8; margin-top: 20px; margin-bottom: 10px;">$1</h3>')
              .replace(/^## (.*?)$/gm, '<h2 style="color: #082030; margin-top: 30px; margin-bottom: 15px; font-size: 1.5rem;">$1</h2>')
              .replace(/^# (.*?)$/gm, '<h1 style="color: #082030; margin-top: 30px; margin-bottom: 15px; font-size: 1.75rem;">$1</h1>')
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/\*(.*?)\*/g, '<em>$1</em>')
              .replace(/\n\n/g, '</p><p style="margin: 15px 0;">')
              .replace(/^- (.*?)$/gm, '<li style="margin-left: 20px;">$1</li>')
              .replace(/\n✅/g, '<br>✅')
              .replace(/\n❌/g, '<br>❌')
              .replace(/\n⚠️/g, '<br>⚠️')
              .replace(/\n🎮/g, '<br>🎮')
          }}
        />

        {/* Footer */}
        <div style={{ marginTop: '60px', paddingTop: '20px', borderTop: '1px solid rgba(90, 175, 225, 0.3)' }}>
          <p style={{ fontSize: '0.875rem', color: '#5888a5' }}>
            Views: {post.view_count} | Laatste update: {formatDate(post.updated_at)}
          </p>
        </div>
      </div>
    </>
  )
}
