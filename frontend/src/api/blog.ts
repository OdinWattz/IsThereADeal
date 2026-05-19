import api from './client'

export interface BlogPost {
  id: number
  slug: string
  title: string
  excerpt?: string
  content: string
  category: 'guide' | 'news' | 'tutorial'
  author: string
  featured_image?: string
  is_published: boolean
  view_count: number
  created_at: string
  updated_at: string
  published_at?: string
}

export const getBlogPosts = (category?: string, skip = 0, limit = 20) =>
  api.get<BlogPost[]>('/blog', {
    params: { category, skip, limit }
  }).then(r => r.data)

export const getBlogPost = (slug: string) =>
  api.get<BlogPost>(`/blog/${slug}`).then(r => r.data)

export const getBlogCategories = () =>
  api.get<string[]>('/blog/categories').then(r => r.data)

export const createBlogPost = (post: Omit<BlogPost, 'id' | 'created_at' | 'updated_at' | 'view_count'>) =>
  api.post<BlogPost>('/blog', post).then(r => r.data)

export const updateBlogPost = (postId: number, post: Partial<BlogPost>) =>
  api.put<BlogPost>(`/blog/${postId}`, post).then(r => r.data)
