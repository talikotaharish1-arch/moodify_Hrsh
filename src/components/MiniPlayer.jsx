import { usePlayer } from '../context/PlayerContext'
import { useNavigate } from 'react-router-dom'
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Shuffle, 
  Repeat,
  Maximize2,
  Heart
} from 'lucide-react'

function fmt(s) {
  if (!s) return '0:00'
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function MiniPlayer() {
  const { 
    currentSong, playing, progress, duration, 
    shuffle, repeat, muted, 
    toggleShuffle, toggleRepeat, toggleLike, isLiked, toggleMute,
    togglePlay, next, prev 
  } = usePlayer()
  const navigate = useNavigate()

  if (!currentSong) return null

  const pct = duration ? (progress / duration) * 100 : 0

  return (
    <div className="player-wrapper">
      <div 
        className="player-bar" 
        onClick={(e) => {
          if (e.target.closest('button')) return
          navigate('/player')
        }}
      >
        
        {/* Track Info */}
        <div className="player-track-info">
          <div className="player-cover-container">
             {currentSong.cover_url ? (
               <img src={currentSong.cover_url} className="player-cover-img" alt="cover" />
             ) : (
               <div className="player-cover-fallback">
                 <Maximize2 size={20} />
               </div>
             )}
          </div>
          <div className="player-meta">
            <p className="player-song-title">{currentSong.title}</p>
            <p className="player-song-artist">{currentSong.artist}</p>
          </div>
          <button 
            className="player-icon-btn" 
            style={{ marginLeft: 8, color: isLiked(currentSong.$id) ? 'var(--accent)' : 'inherit' }}
            onClick={(e) => { e.stopPropagation(); toggleLike(currentSong.$id); }}
          >
            <Heart size={20} fill={isLiked(currentSong.$id) ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Playback Controls */}
        <div className="player-center-controls">
          <div className="player-buttons">
            <button className="player-icon-btn" onClick={prev}>
              <SkipBack size={20} fill="currentColor" />
            </button>
            <button className="player-play-btn" onClick={togglePlay}>
              {playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" style={{ marginLeft: 2 }} />}
            </button>
            <button className="player-icon-btn" onClick={next}>
              <SkipForward size={20} fill="currentColor" />
            </button>
          </div>
          
          <div className="player-progress-area">
            <span className="player-time">{fmt(progress)}</span>
            <div className="player-progress-bar">
              <div className="player-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="player-time">{fmt(duration)}</span>
          </div>
        </div>

        {/* Volume & Extra */}
        <div className="player-extras-panel">
          <button className="player-icon-btn secondary" onClick={toggleMute}>
            {muted ? <VolumeX size={18} color="var(--accent)" /> : <Volume2 size={18} />}
          </button>
          <button 
            className="player-icon-btn secondary" 
            style={{ color: shuffle ? 'var(--accent)' : 'inherit' }}
            onClick={toggleShuffle}
          >
            <Shuffle size={18} />
          </button>
          <button 
            className="player-icon-btn secondary" 
            style={{ color: repeat ? 'var(--accent)' : 'inherit' }}
            onClick={toggleRepeat}
          >
            <Repeat size={18} />
          </button>
        </div>

      </div>
    </div>
  )
}