import { TPosts, TPostStatus, TPostType } from "src/types"

export type FilterPostsOptions = {
  acceptStatus?: TPostStatus[]
  acceptType?: TPostType[]
}

const initialOption: FilterPostsOptions = {
  acceptStatus: ["Public"],
  acceptType: ["Post"],
}
const current = new Date()
const tomorrow = new Date(current)
tomorrow.setDate(tomorrow.getDate() + 1)
tomorrow.setHours(0, 0, 0, 0)

export function filterPosts(
  posts: TPosts,
  options: FilterPostsOptions = initialOption
) {
  const { acceptStatus = ["Public"], acceptType = ["Post"] } = options
  if (!Array.isArray(posts)) return []

  const filteredPosts = posts
    // filter data
    .filter((post) => {
      if (!post) return false
      const title = post.title || (post as any).Title || (post as any).name || (post as any).Name
      const slug = post.slug || (post as any).Slug
      const postDate = new Date(post?.date?.start_date || post.createdTime)
      if (!title || !slug || postDate > tomorrow) return false
      return true
    })
    // filter status
    .filter((post) => {
      const rawStatus = post?.status || (post as any)?.Status || (post as any)?.status
      const postStatus = Array.isArray(rawStatus) ? rawStatus[0] : (rawStatus || "Public")
      return acceptStatus.includes(postStatus as any)
    })
    // filter type
    .filter((post) => {
      const rawType = post?.type || (post as any)?.Type || (post as any)?.type
      const postType = Array.isArray(rawType) ? rawType[0] : (rawType || "Post")
      return acceptType.includes(postType as any)
    })
  return filteredPosts
}
