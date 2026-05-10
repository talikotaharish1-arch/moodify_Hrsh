import { useState, useEffect } from 'react'
import { databases, DB_ID, COLLECTIONS, Query } from '../services/appwrite'

export function useLikes(userId) {
  const [likes, setLikes] = useState([]) // array of like records
  const [loading, setLoading] = useState(true)
  const [likedSongs, setLikedSongs] = useState([])

  useEffect(() => {
    if (!userId) return
    fetchLikes()
  }, [userId])

  const fetchLikes = async () => {
    try {
      const result = await databases.listDocuments(DB_ID, COLLECTIONS.LIKES, [
        Query.equal('user', userId)
      ])
      
      const likeDocs = result.documents
      setLikes(likeDocs)

      // Manual expand for songs
      const songs = await Promise.all(likeDocs.map(async (l) => {
        try {
          return await databases.getDocument(DB_ID, COLLECTIONS.SONGS, l.song)
        } catch (e) { return null }
      }))
      setLikedSongs(songs.filter(Boolean))

    } catch (err) {
      console.error('fetchLikes error:', err)
    } finally {
      setLoading(false)
    }
  }

  const isLiked = (songId) => likes.some(l => l.song === songId)

  const toggleLike = async (songId) => {
    const existing = likes.find(l => l.song === songId)
    if (existing) {
      // Unlike
      try {
        await databases.deleteDocument(DB_ID, COLLECTIONS.LIKES, existing.$id)
        setLikes(prev => prev.filter(l => l.$id !== existing.$id))
        setLikedSongs(prev => prev.filter(s => s.$id !== songId))
      } catch (err) {
        console.error('unlike error:', err)
      }
    } else {
      // Like
      try {
        const { ID } = await import('../services/appwrite')
        const newLike = await databases.createDocument(DB_ID, COLLECTIONS.LIKES, ID.unique(), {
          user: userId,
          song: songId,
        })
        setLikes(prev => [...prev, newLike])
        // Fetch the song to add it to likedSongs
        const song = await databases.getDocument(DB_ID, COLLECTIONS.SONGS, songId)
        setLikedSongs(prev => [...prev, song])
      } catch (err) {
        console.error('like error:', err)
      }
    }
  }

  return { likes, likedSongs, isLiked, toggleLike, loading, refetch: fetchLikes }
}