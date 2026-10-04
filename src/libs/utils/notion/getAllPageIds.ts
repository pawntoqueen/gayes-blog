import { idToUuid } from "notion-utils"
import { ExtendedRecordMap, ID } from "notion-types"

export default function getAllPageIds(
  response: ExtendedRecordMap,
  viewId?: string
) {
  const collectionQuery = response?.collection_query
  if (!collectionQuery) return []
  const views = Object.values(collectionQuery)[0]
  if (!views) return []

  let pageIds: ID[] = []
  if (viewId) {
    const vId = idToUuid(viewId)
    pageIds = views[vId]?.blockIds || []
  } else {
    const pageSet = new Set<ID>()
    // * type not exist
    Object.values(views).forEach((view: any) => {
      const blockIds =
        view?.collection_group_results?.blockIds ||
        view?.results?.blockIds ||
        view?.reducerResults?.collection_group_results?.blockIds ||
        view?.reducerResults?.blockIds ||
        view?.blockIds ||
        []
      blockIds.forEach((id: ID) => pageSet.add(id))
    })
    pageIds = [...pageSet]
  }
  return pageIds
}
