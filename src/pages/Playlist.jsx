import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { usePlayer } from '../context/PlayerContext'
import { useAuth } from '../context/AuthContext'
import { getGeminiProactivePlaylist, getMoodPlaylist, searchYouTube } from '../services/ai'
import Sidebar from '../components/Sidebar'
import { 
  Play, 
  Heart, 
  Clock, 
  Music,
  Sparkles,
  Smile,
  Coffee,
  CloudRain,
  Dumbbell,
  Brain,
  PartyPopper
} from 'lucide-react'

const MOOD_META = {
  Happy:   { icon: Smile, color: '#fbbf24', heroClass: 'hero-card yellow' },
  Chill:   { icon: Coffee, color: '#34d399', heroClass: 'hero-card teal' },
  Sad:     { icon: CloudRain, color: '#60a5fa', heroClass: 'hero-card blue' },
  Workout: { icon: Dumbbell, color: '#f97316', heroClass: 'hero-card orange' },
  Focus:   { icon: Brain, color: '#a855f7', heroClass: 'hero-card purple' },
  Party:   { icon: PartyPopper, color: '#ff6b6b', heroClass: 'hero-card pink' },
}

function fmt(s) {
  if (!s) return '0:00'
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function Playlist() {
  const [params] = useSearchParams()
  const mood = params.get('mood') || 'Happy'
  const navigate = useNavigate()
  const meta = MOOD_META[mood] || MOOD_META.Happy
  const MoodIcon = meta.icon
  
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [playlistId, setPlaylistId] = useState(null)
  const [dynamicTitle, setDynamicTitle] = useState(`${mood} Vibes`)
  const [dynamicCover, setDynamicCover] = useState('')
  const { playSong, currentSong, isLiked, toggleLike } = usePlayer()
  const { user } = useAuth()

  const fetchAISongs = async (forceRegen = false) => {
    if (!user?.id) return
    try {
      setLoading(true)
      
      const { databases, DB_ID, COLLECTIONS, ID, Query } = await import('../services/appwrite')
      
      if (!forceRegen) {
        try {
          const res = await databases.listDocuments(DB_ID, COLLECTIONS.PLAYLISTS, [
            Query.equal('user', user.id),
            Query.equal('mood', mood),
            Query.limit(1)
          ])
          
          if (res.documents[0]) {
            const existing = res.documents[0]
            setPlaylistId(existing.$id)
            setDynamicTitle(existing.name || `${mood} Vibes`)
            setDynamicCover(existing.cover_url || '')
            
            // Resolve songs manually if not expanded
            const resolvedSongs = await Promise.all(existing.songs.map(async (sid) => {
              try {
                return await databases.getDocument(DB_ID, COLLECTIONS.SONGS, sid)
              } catch (e) { return null }
            }))
            setSongs(resolvedSongs.filter(Boolean))
            setLoading(false)
            return
          }
        } catch (e) {
          console.error("Existing playlist fetch error", e)
        }
      }

      let context = { likedArtists: [], recentSongs: [] }
      try {
        const histRes = await databases.listDocuments(DB_ID, COLLECTIONS.HISTORY, [
          Query.equal('user', user.id),
          Query.orderDesc('$createdAt'),
          Query.limit(10)
        ])
        const likesRes = await databases.listDocuments(DB_ID, COLLECTIONS.LIKES, [
          Query.equal('user', user.id),
          Query.limit(20)
        ])
        
        // Manual expand for history context
        const histSongs = await Promise.all(histRes.documents.map(async (h) => {
          try {
            return await databases.getDocument(DB_ID, COLLECTIONS.SONGS, h.song)
          } catch (e) { return null }
        }))
        
        const recent = histSongs.filter(Boolean).map(s => ({ title: s.title, artist: s.artist }))
        
        // Manual expand for likes context
        const likedSongs = await Promise.all(likesRes.documents.map(async (l) => {
          try {
            return await databases.getDocument(DB_ID, COLLECTIONS.SONGS, l.song)
          } catch (e) { return null }
        }))
        
        const artists = likedSongs.filter(Boolean).map(s => s.artist)
        const uniqueArtists = [...new Set(artists)]
        
        context = { likedArtists: uniqueArtists, recentSongs: recent }
      } catch(e) {
        console.error("Context gather error", e)
      }

      const aiResult = await getMoodPlaylist(mood, context)
      const suggestions = aiResult?.songs || []
      const newTitle = aiResult?.playlistTitle || `${mood} Vibes`
      const coverSearch = aiResult?.coverSearchTerm || mood
      const newCover = `https://images.unsplash.com/photo-1614149162883-504ce4d13909?q=80&w=800&auto=format&fit=crop&q=${encodeURIComponent(coverSearch)}` 
      // Note: source.unsplash is deprecated, using a dynamic search style

      setDynamicTitle(newTitle)
      setDynamicCover(newCover)

      const resolvedIds = []
      const resolvedSongs = []

      for (const s of suggestions) {
        const ytSong = await searchYouTube(`${s.title} ${s.artist}`)
        if (ytSong) {
          let appwriteSong
          try {
            const res = await databases.listDocuments(DB_ID, COLLECTIONS.SONGS, [
              Query.equal('audio_url', ytSong.audio_url),
              Query.limit(1)
            ])
            appwriteSong = res.documents[0]
            
            if (!appwriteSong) {
              appwriteSong = await databases.createDocument(DB_ID, COLLECTIONS.SONGS, ID.unique(), {
                title: ytSong.title,
                artist: ytSong.artist,
                cover_url: ytSong.cover_url,
                audio_url: ytSong.audio_url,
                mood: mood
              })
            }
          } catch (e) {
            console.error("Song create/fetch error", e)
          }
          if (appwriteSong) {
            resolvedIds.push(appwriteSong.$id)
            resolvedSongs.push(appwriteSong)
          }
        }
      }

      if (playlistId) {
        await databases.updateDocument(DB_ID, COLLECTIONS.PLAYLISTS, playlistId, { 
          songs: resolvedIds, 
          name: newTitle, 
          cover_url: newCover 
        })
      } else {
        const newPlaylist = await databases.createDocument(DB_ID, COLLECTIONS.PLAYLISTS, ID.unique(), {
          name: newTitle,
          mood: mood,
          user: user.id,
          songs: resolvedIds,
          cover_url: newCover
        })
        setPlaylistId(newPlaylist.$id)
      }

      setSongs(resolvedSongs)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAISongs()
  }, [mood, user?.id])

  return (
    <>
      <Sidebar />
      <main className="main-content">
        <section className="center-view">
          <div className="center-container">
            
            {/* Hero */}
            <div className={`hero-card ${mood.toLowerCase() === 'happy' ? 'yellow' : mood.toLowerCase() === 'chill' ? 'teal' : mood.toLowerCase() === 'sad' ? 'blue' : mood.toLowerCase() === 'workout' ? 'orange' : mood.toLowerCase() === 'focus' ? 'purple' : 'pink'}`} style={dynamicCover ? { backgroundImage: `url(${dynamicCover})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' } : {}}>
              {dynamicCover && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />}
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div className="hero-tag" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                   <Sparkles size={14} fill="currentColor" /> AI Curated
                </div>
                <h1 className="hero-title">{dynamicTitle}</h1>
                <p className="hero-desc" style={{ opacity: 0.9 }}>Enjoy a custom selection of tracks generated just for you based on: "{mood}".</p>
                
                <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
                   {songs.length > 0 && (
                     <button className="btn-primary" style={{ background: 'white', color: 'black' }} onClick={() => playSong(songs, 0)}>
                       <Play size={18} fill="currentColor" /> Play Mix
                     </button>
                   )}
                   <button className="btn-primary" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }} onClick={() => fetchAISongs(true)}>
                      <Sparkles size={18} /> Refresh AI
                   </button>
                </div>
              </div>
            </div>

            <div className="section-header">
              <h2 className="section-title">Tracks</h2>
            </div>

            {loading ? (
              <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Sparkles size={48} className="text-muted" style={{ marginBottom: 16, animation: 'pulse 2s infinite' }} />
                <p style={{ fontSize: 18, fontWeight: 700 }}>Gemini is curating your mix...</p>
              </div>
            ) : (
              <div className="song-list">
                {songs.map((song, i) => (
                  <div key={song.$id} className={`song-row ${currentSong?.$id === song.$id ? 'active' : ''}`} onClick={() => playSong(songs, i)}>
                    <img src={song.cover_url} className="song-cover" alt="cover" />
                    <div className="song-info">
                      <p className="song-title">{song.title}</p>
                      <p className="song-artist">{song.artist}</p>
                    </div>
                    <span className="song-duration" style={{ marginRight: 16 }}>{fmt(song.duration)}</span>
                    <button 
                      className="song-action"
                      onClick={(e) => { e.stopPropagation(); toggleLike(song.$id); }}
                      style={{ color: isLiked(song.$id) ? 'var(--accent)' : 'inherit' }}
                    >
                      <Heart size={18} fill={isLiked(song.$id) ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  )
}