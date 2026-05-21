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

export interface BlogPostCreatePayload {
  slug: string
  title: string
  excerpt?: string
  content: string
  category: 'guide' | 'news' | 'tutorial'
  author?: string
  featured_image?: string
  is_published: boolean
}

export interface BlogPostUpdatePayload {
  title?: string
  excerpt?: string
  content?: string
  category?: 'guide' | 'news' | 'tutorial'
  featured_image?: string
  is_published?: boolean
}

export interface GuidesVisibility {
  guides_enabled: boolean
}

export const getBlogPosts = (category?: string, skip = 0, limit = 20) =>
  api.get<BlogPost[]>('/blog', {
    params: { category, skip, limit }
  }).then(r => r.data)

export const getBlogPost = (slug: string) =>
  api.get<BlogPost>(`/blog/${slug}`).then(r => r.data)

export const getBlogCategories = () =>
  api.get<string[]>('/blog/categories').then(r => r.data)

export const createBlogPost = (post: BlogPostCreatePayload) =>
  api.post<BlogPost>('/blog', post).then(r => r.data)

export const updateBlogPost = (postId: number, post: BlogPostUpdatePayload) =>
  api.put<BlogPost>(`/blog/${postId}`, post).then(r => r.data)

export const deleteBlogPost = (postId: number) =>
  api.delete(`/blog/${postId}`).then(r => r.data)

export const getAdminBlogPosts = () =>
  api.get<BlogPost[]>('/blog/admin/posts').then(r => r.data)

export const getGuidesVisibility = () =>
  api.get<GuidesVisibility>('/blog/visibility').then(r => r.data)

export const setGuidesVisibility = (guidesEnabled: boolean) =>
  api.patch<GuidesVisibility>('/blog/admin/visibility', { guides_enabled: guidesEnabled }).then(r => r.data)
