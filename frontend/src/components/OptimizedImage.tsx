import type { ImgHTMLAttributes } from 'react'

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'loading' | 'decoding' | 'fetchPriority'> {
  priority?: boolean
  loading?: 'eager' | 'lazy'
  decoding?: 'async' | 'auto' | 'sync'
  fetchPriority?: 'high' | 'low' | 'auto'
}

export function OptimizedImage({
  priority = false,
  loading,
  decoding = 'async',
  fetchPriority,
  ...props
}: OptimizedImageProps) {
  const resolvedLoading = loading ?? (priority ? 'eager' : 'lazy')
  const resolvedFetchPriority = fetchPriority ?? (priority ? 'high' : 'low')

  return (
    <img
      {...props}
      loading={resolvedLoading}
      decoding={decoding}
      fetchPriority={resolvedFetchPriority}
    />
  )
}