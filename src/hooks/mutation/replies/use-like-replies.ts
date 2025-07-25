"use client"

import {
  InfiniteData,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { likeReplyComment, unlikeReplyComment } from "@/server/like"
import type { User } from "@/generated/prisma"
import { useMemo } from "react"
import { IPage, ReplyComment } from "@/types"

export function useLikeReplyCommentMutation({
  replyId,
  commentId,
  content,
}: {
  commentId: string
  replyId: string
  content: string
}) {
  const queryClient = useQueryClient()
  const queryKey = useMemo(() => ["replies", commentId], [commentId])

  const likeReplyCommentMutation = useMutation({
    mutationFn: async () => {
      const response = await likeReplyComment({ replyId, content })

      if (!response?.ok) {
        return
      }

      return true
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey })

      const previousComment = queryClient.getQueryData(queryKey)

      queryClient.setQueryData<InfiniteData<IPage<ReplyComment<User>[]>>>(
        queryKey,
        (oldData) => {
          if (!oldData) return

          const newReplies = {
            ...oldData,
            pages: oldData.pages.map((page) => {
              if (page) {
                return {
                  ...page,
                  data: page.data.map((reply) => {
                    if (reply.id === replyId) {
                      return {
                        ...reply,
                        _count: {
                          ...reply._count,
                          likeReplyComment: reply._count.likeReplyComment + 1,
                        },
                        isLiked: true,
                      }
                    } else {
                      return reply
                    }
                  }),
                }
              }

              return page
            }),
          }

          return newReplies
        }
      )

      return { previousComment }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(queryKey, context?.previousComment)
    },
  })

  const unlikeReplyCommentMutation = useMutation({
    mutationFn: async () => {
      const response = await unlikeReplyComment({ replyId })

      if (!response?.ok) {
        return
      }

      return true
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey })

      const previousComment = queryClient.getQueryData(queryKey)

      queryClient.setQueryData<InfiniteData<IPage<ReplyComment<User>[]>>>(
        queryKey,
        (oldData) => {
          if (!oldData) return

          const newReplies = {
            ...oldData,
            pages: oldData.pages.map((page) => {
              if (page) {
                return {
                  ...page,
                  data: page.data.map((reply) => {
                    if (reply.id === replyId) {
                      return {
                        ...reply,
                        _count: {
                          ...reply._count,
                          likeReplyComment: reply._count.likeReplyComment - 1,
                        },
                        isLiked: false,
                      }
                    } else {
                      return reply
                    }
                  }),
                }
              }

              return page
            }),
          }

          return newReplies
        }
      )

      return { previousComment }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })

  return { likeReplyCommentMutation, unlikeReplyCommentMutation }
}
