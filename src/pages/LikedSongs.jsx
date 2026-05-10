import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import { useLikes } from '../hooks/useLikes'
import Sidebar from '../components/Sidebar'
import { Play, Music, Heart } from 'lucide-react'

function fmt(s) {
  if (!s) return '0:00'
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function LikedSongs() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { playSong, currentSong, queue, isLiked, toggleLike } = usePlayer()
  
  const { likedSongs, loading } = useLikes(user?.id)

  const handlePlay = (i) => {
    playSong(likedSongs, i)
  }

  return (
    <>
      <Sidebar />
      <main className="main-content">
        <section className="center-view">
          <div className="center-container">
            
            {/* Hero */}
            <div className="hero-card pink">
              <div className="hero-tag">Your Collection</div>
              <h1 className="hero-title">Liked Songs</h1>
              <p className="hero-desc">{likedSongs.length} songs you've saved to your library.</p>
              {likedSongs.length > 0 && (
                <button className="btn-primary" onClick={() => handlePlay(0)}>
                  <Play size={18} fill="currentColor" />
                  Play All
                </button>
              )}
            </div>

            <div className="section-header">
              <h2 className="section-title">All Favorites</h2>
            </div>

            {loading ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading your collection...</div>
            ) : likedSongs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', background: 'var(--surface)', borderRadius: 24, border: '1px dashed var(--border)' }}>
                <Heart size={48} className="text-muted" style={{ marginBottom: 16, opacity: 0.3 }} />
                <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No liked songs yet</p>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Tap the heart on any song to save it here.</p>
                <button className="btn-primary" onClick={() => navigate('/dashboard')}>Browse Music</button>
              </div>
            ) : (
              <div className="song-list">
                {likedSongs.map((song, i) => {
                  const isActive = currentSong?.$id === song.$id
                  return (
                    <div 
                      key={song.$id} 
                      className={`song-row ${isActive ? 'active' : ''}`}
                      onClick={() => handlePlay(i)}
                    >
                      <img src={song.cover_url} className="song-cover" alt="cover" />
                      <div className="song-info">
                        <p className="song-title">{song.title}</p>
                        <p className="song-artist">{song.artist}</p>
                      </div>
                      <span className="song-duration" style={{ marginRight: 16 }}>{fmt(song.duration)}</span>
                      <button 
                        className="song-action"
                        onClick={(e) => { e.stopPropagation(); toggleLike(song.$id); }}
                        style={{ color: 'var(--accent)' }}
                      >
                        <Heart size={18} fill="currentColor" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

          </div>
        </section>
      </main>
    </>
  )
}