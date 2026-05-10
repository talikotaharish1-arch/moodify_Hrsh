import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import client, { databases, DB_ID, COLLECTIONS, ID } from '../services/appwrite'
import { Query } from 'appwrite'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import Sidebar from '../components/Sidebar'
import { Play, Users, Plus, Trash2, Headphones, Sparkles, Send, Music, MessageSquare, X } from 'lucide-react'

function fmt(s) {
  if (!s) return '0:00'
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

const moodMeta = {
  Happy:   { color: '#fbbf24', emoji: '😊' },
  Chill:   { color: '#34d399', emoji: '🌙' },
  Sad:     { color: '#60a5fa', emoji: '🌧️' },
  Workout: { color: '#f97316', emoji: '💪' },
  Focus:   { color: '#a855f7', emoji: '🧠' },
  Party:   { color: '#ff6b6b', emoji: '🎉' },
  Romance: { color: '#f472b6', emoji: '💖' },
  Hype:    { color: '#00d4ff', emoji: '🔥' },
}

function JamSession() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { playSong, clearPlayer } = usePlayer()

  const [view, setView] = useState('browse')
  const [activeRoom, setActiveRoom] = useState(null)
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [creating, setCreating] = useState(false)
  const [selectedSong, setSelectedSong] = useState(null)
  const [availableSongs, setAvailableSongs] = useState([])
  const [createSearch, setCreateSearch] = useState('')

  useEffect(() => {
    fetchRooms()
    databases.listDocuments(DB_ID, COLLECTIONS.SONGS).then(res => setAvailableSongs(res.documents)).catch(console.error)
    
    const unsubscribe = client.subscribe([`databases.${DB_ID}.collections.${COLLECTIONS.JAM_ROOMS}.documents`], (e) => {
      fetchRooms()
    })
    return () => unsubscribe()
  }, [])

  const fetchRooms = async () => {
    try {
      const result = await databases.listDocuments(DB_ID, COLLECTIONS.JAM_ROOMS, [
        Query.orderDesc('$createdAt')
      ])
      
      // Manual expand for host and song
      const expandedRooms = await Promise.all(result.documents.map(async (r) => {
        let host = r.host
        let song = r.current_songs
        
        try {
          // If Appwrite stores them as IDs, fetch the actual documents
          // Note: If you set up relationships in Appwrite, this might be automatic
          if (typeof host === 'string') {
             // For users, you might need a 'users' collection or use account.get (but only for current user)
             // We'll assume a 'users' collection or metadata
          }
          if (typeof song === 'string') {
             song = await databases.getDocument(DB_ID, COLLECTIONS.SONGS, song)
          }
        } catch (e) {}
        
        return { ...r, host_data: host, song_data: song }
      }))
      
      setRooms(expandedRooms)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const createRoom = async () => {
    if (!roomName.trim()) return
    setCreating(true)
    try {
      const room = await databases.createDocument(DB_ID, COLLECTIONS.JAM_ROOMS, ID.unique(), {
        name: roomName,
        host: user.id,
        listeners: 1,
        playback_position: 0,
        current_songs: selectedSong?.$id || null,
        is_playing: !!selectedSong
      })
      
      setActiveRoom(room)
      setView('room')
      setShowCreate(false)
      setRoomName('')
    } catch (err) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  const joinRoom = async (room) => {
    try {
      await databases.updateDocument(DB_ID, COLLECTIONS.JAM_ROOMS, room.$id, {
        listeners: (room.listeners || 0) + 1,
      })
    } catch {}
    setActiveRoom(room)
    setView('room')
  }

  const leaveRoom = async (room) => {
    try {
      await databases.updateDocument(DB_ID, COLLECTIONS.JAM_ROOMS, room.$id, {
        listeners: Math.max((room.listeners || 1) - 1, 0),
      })
    } catch {}
    clearPlayer()
    setView('browse')
    setActiveRoom(null)
  }

  const deleteRoom = async (e, roomId) => {
    e.stopPropagation()
    if (!confirm('Delete this room?')) return
    try {
      await databases.deleteDocument(DB_ID, COLLECTIONS.JAM_ROOMS, roomId)
      fetchRooms()
    } catch (err) {
      console.error(err)
    }
  }

  if (view === 'room' && activeRoom) {
    return <RoomView room={activeRoom} user={user} onBack={() => leaveRoom(activeRoom)} playSong={playSong} clearPlayer={clearPlayer} />
  }

  return (
    <>
      <Sidebar />
      <main className="main-content">
        <section className="center-view">
          <div className="center-container">
            
            <div className="hero-card teal">
              <div className="hero-tag">Live Communities</div>
              <h1 className="hero-title">Jam Sessions</h1>
              <p className="hero-desc">Listen together in real-time. Join a room or start your own broadcast.</p>
              <button className="btn-primary" onClick={() => setShowCreate(true)} style={{ background: 'white', color: '#00d4ff' }}>
                <Plus size={18} /> Create New Room
              </button>
            </div>

            <div className="section-header">
               <h2 className="section-title">Live Now</h2>
               <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#34d399', fontSize: 13, fontWeight: 700 }}>
                  <span className="pulse-indicator" />
                  {rooms.reduce((s, r) => s + (r.listeners || 0), 0)} listening
               </div>
            </div>

            {loading ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Searching for live jams...</div>
            ) : rooms.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '100px 0' }}>
                 <Headphones size={64} className="text-muted" style={{ marginBottom: 24, opacity: 0.2 }} />
                 <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Silence in the air</h2>
                 <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>No rooms are currently live. Be the first to start a session!</p>
                 <button className="btn-primary" onClick={() => setShowCreate(true)}>Start Jam Session</button>
              </div>
            ) : (
              <div className="room-grid">
                {rooms.map(room => {
                  const song = room.song_data
                  const host = room.host_data
                  const meta = moodMeta[song?.mood || 'Chill'] || moodMeta.Chill
                  const isHost = user?.id === room.host

                  return (
                    <div key={room.$id} className="item-card" onClick={() => joinRoom(room)}>
                      <div className="item-card-cover" style={{ background: `linear-gradient(135deg, ${meta.color}44, ${meta.color}11)` }}>
                        {meta.emoji}
                        <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', padding: '4px 10px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 6 }}>
                           <div className="pulse-indicator" style={{ background: meta.color }} />
                           <span style={{ fontSize: 11, fontWeight: 800, color: 'white' }}>{room.listeners || 0}</span>
                        </div>
                      </div>
                      <div className="item-card-content">
                        <h3 className="item-card-title">{room.name}</h3>
                        <p className="item-card-subtitle" style={{ marginBottom: 12 }}>Hosted by {host?.name || 'Unknown'}</p>
                        <div style={{ padding: '8px 12px', background: 'var(--surface-light)', borderRadius: 12, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                           <Music size={14} /> {song?.title || 'No song playing'}
                        </div>
                      </div>
                      {isHost && (
                        <button onClick={(e) => deleteRoom(e, room.$id)} 
                          style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(255,107,107,0.2)', border: 'none', color: '#ff6b6b', padding: 8, borderRadius: 10, cursor: 'pointer' }}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

          </div>
        </section>
      </main>

      {showCreate && (
        <div className="sidebar-overlay show" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => { setShowCreate(false); setSelectedSong(null); setCreateSearch(''); }}>
           <div className="auth-card" style={{ maxWidth: 500, width: '90%' }} onClick={e => e.stopPropagation()}>
              <h2 className="section-title">Start Broadcasting</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>Create a room and invite others to listen with you.</p>
              
              <div className="form-group">
                <label className="form-label">ROOM NAME</label>
                <input autoFocus className="form-input" value={roomName} onChange={e => setRoomName(e.target.value)} placeholder="Late Night Vibing..." />
              </div>

               <div className="form-group">
                 <label className="form-label">STARTING SONG (OPTIONAL)</label>
                 <input 
                   type="text" 
                   className="form-input" 
                   style={{ marginBottom: 12, fontSize: 13, height: 40 }}
                   placeholder="Search song to start with..." 
                   value={createSearch}
                   onChange={e => setCreateSearch(e.target.value)}
                 />
                 <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 12, padding: 8 }}>
                    {availableSongs.filter(s => s.title.toLowerCase().includes(createSearch.toLowerCase()) || s.artist.toLowerCase().includes(createSearch.toLowerCase())).map(s => (
                      <div key={s.$id} 
                        onClick={() => setSelectedSong(s)}
                        style={{ 
                          padding: '8px 12px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                          background: selectedSong?.$id === s.$id ? 'var(--accent-light)' : 'transparent',
                          border: selectedSong?.$id === s.$id ? '1px solid var(--accent)' : '1px solid transparent'
                        }}
                      >
                         <img src={s.cover_url} style={{ width: 32, height: 32, borderRadius: 6 }} alt="" />
                         <div style={{ flex: 1, overflow: 'hidden' }}>
                            <p style={{ fontSize: 13, fontWeight: 700, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>{s.title}</p>
                            <p style={{ fontSize: 11, margin: 0, color: 'var(--text-secondary)' }}>{s.artist}</p>
                         </div>
                      </div>
                    ))}
                 </div>
               </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                 <button className="auth-btn" style={{ background: 'var(--surface)', color: 'var(--text-primary)' }} onClick={() => setShowCreate(false)}>Cancel</button>
                 <button className="auth-btn" style={{ background: 'var(--accent)' }} onClick={createRoom} disabled={creating}>{creating ? 'Opening Room...' : 'Start Session'}</button>
              </div>
           </div>
        </div>
      )}
    </>
  )
}

function RoomView({ room, user, onBack, playSong }) {
  const { togglePlay, setPlaying, playing, seekTo, progress, duration } = usePlayer()
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState('')
  const [currentRoom, setCurrentRoom] = useState(room)
  const [songs, setSongs] = useState([])
  const [showSongPicker, setShowSongPicker] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const chatEndRef = useRef(null)
  const lastSongIdRef = useRef(null)
  const progressRef = useRef(0)
  const playingRef = useRef(false)
  const typingTimeoutRef = useRef(null)
  const [typingUsers, setTypingUsers] = useState([])
  const [showMobileChat, setShowMobileChat] = useState(false)

  useEffect(() => { progressRef.current = progress }, [progress])
  useEffect(() => { playingRef.current = playing }, [playing])

  const hostId = room.host?.id || room.host
  const isHost = user?.id === hostId

  useEffect(() => {
    if (isHost && !currentRoom.current_songs) {
      setShowSongPicker(true)
    }
  }, [isHost, currentRoom.current_songs])

  useEffect(() => {
    if (isHost) {
      databases.listDocuments(DB_ID, COLLECTIONS.SONGS)
        .then(res => setSongs(res.documents))
        .catch(console.error)
    }
  }, [isHost])

  // Host: Periodically sync playback position to DB
  useEffect(() => {
    if (!isHost) return
    const interval = setInterval(() => {
       if (playing) {
         databases.updateDocument(DB_ID, COLLECTIONS.JAM_ROOMS, room.$id, { playback_position: progressRef.current })
       }
    }, 100)
    return () => clearInterval(interval)
  }, [isHost, playing])

  const fetchRoom = async () => {
    try {
      const r = await databases.getDocument(DB_ID, COLLECTIONS.JAM_ROOMS, room.$id)
      
      // Manual expand for song
      if (r.current_songs && typeof r.current_songs === 'string') {
        const song = await databases.getDocument(DB_ID, COLLECTIONS.SONGS, r.current_songs)
        r.song_data = song
      }

      setCurrentRoom(r)
      
      if (!isHost) {
        if (playingRef.current !== r.is_playing) setPlaying(r.is_playing)
        if (Math.abs(progressRef.current - r.playback_position) > 3) {
           seekTo(r.playback_position)
        }
        if (r.song_data && r.song_data.$id !== lastSongIdRef.current) {
           lastSongIdRef.current = r.song_data.$id
           playSong([r.song_data], 0)
        }
      } else {
        if (r.song_data) {
           if (r.song_data.$id !== lastSongIdRef.current) {
              lastSongIdRef.current = r.song_data.$id
              playSong([r.song_data], 0)
           }
        }
      }
    } catch(e) { console.error(e) }
  }

  useEffect(() => {
    fetchMessages()
    fetchRoom()

    const unsubscribe = client.subscribe([
      `databases.${DB_ID}.collections.${COLLECTIONS.MESSAGES}.documents`,
      `databases.${DB_ID}.collections.${COLLECTIONS.JAM_ROOMS}.documents`,
      `databases.${DB_ID}.collections.${COLLECTIONS.TYPING}.documents` 
    ], (response) => {
      if (response.events.some(e => e.includes(`collections.${COLLECTIONS.MESSAGES}`))) fetchMessages()
      if (response.events.some(e => e.includes(`collections.${COLLECTIONS.JAM_ROOMS}`))) fetchRoom()
      if (response.events.some(e => e.includes(`collections.${COLLECTIONS.TYPING}`))) fetchTyping()
    })

    fetchTyping()

    return () => unsubscribe()
  }, [room.$id])

  const fetchTyping = async () => {
    try {
      const result = await databases.listDocuments(DB_ID, COLLECTIONS.TYPING, [
        Query.equal('room', room.$id)
      ])
      const others = result.documents.filter(t => t.user !== user.id)
      setTypingUsers(others.map(t => t.user_name || 'Someone'))
    } catch (e) {}
  }

  const handleTyping = async () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    else {
      try {
        await databases.createDocument(DB_ID, COLLECTIONS.TYPING, user.id, { 
          user: user.id, 
          room: room.$id,
          user_name: user.name || user.email.split('@')[0]
        })
      } catch (e) {}
    }

    typingTimeoutRef.current = setTimeout(async () => {
      typingTimeoutRef.current = null
      try {
        await databases.deleteDocument(DB_ID, COLLECTIONS.TYPING, user.id)
      } catch (e) {}
    }, 3000)
  }

  const fetchMessages = async () => {
    const result = await databases.listDocuments(DB_ID, COLLECTIONS.MESSAGES, [
      Query.equal('room', room.$id),
      Query.orderAsc('$createdAt')
    ])
    setMessages(result.documents)
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const sendMessage = async () => {
    if (!message.trim()) return
    const text = message
    setMessage('')
    await databases.createDocument(DB_ID, COLLECTIONS.MESSAGES, ID.unique(), { 
      room: room.$id, 
      user: user.id, 
      text,
      user_name: user.name || user.email.split('@')[0]
    })
  }

  const song = currentRoom.expand?.current_songs
  const meta = moodMeta[song?.mood || 'Chill'] || moodMeta.Chill

  return (
    <>
      <Sidebar />
      <main className="main-content jam-layout">
         <section className="center-view jam-player-section">
            <div className="center-container" style={{ padding: '0 24px' }}>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  <button onClick={onBack} className="section-link" style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                     ← Leave Room
                  </button>
               </div>

               <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 48 }}>
                  <div style={{ width: 120, height: 120, borderRadius: 24, background: `linear-gradient(135deg, ${meta.color}, #a855f7)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, boxShadow: `0 20px 40px ${meta.color}33` }}>
                     {meta.emoji}
                  </div>
                  <div>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255, 59, 48, 0.1)', color: '#FF3B30', padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 800, letterSpacing: 1 }}>
                         <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF3B30', animation: 'pulse 2s infinite' }} />
                         LIVE
                       </div>
                       {isHost && (
                         <button onClick={async () => {
                           if (confirm('End this session for everyone?')) {
                             await databases.deleteDocument(DB_ID, COLLECTIONS.JAM_ROOMS, room.$id)
                             onBack()
                           }
                         }} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                           End Session
                         </button>
                       )}
                     </div>
                     <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.04em' }}>{currentRoom.name}</h1>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>{currentRoom.listeners || 0} listening now • Sync enabled</p>
                        <button 
                          className="mobile-only section-link" 
                          onClick={() => setShowMobileChat(true)}
                          style={{ display: 'none', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: 8, fontSize: 13 }}
                        >
                           <MessageSquare size={14} /> Open Chat
                        </button>
                     </div>
                  </div>
               </div>

               <div className="hero-card" style={{ background: 'var(--surface)', padding: 48, textAlign: 'center' }}>
                  <img src={song?.cover_url} style={{ width: 240, height: 240, borderRadius: 32, objectFit: 'cover', margin: '0 auto 32px', boxShadow: '0 32px 64px rgba(0,0,0,0.4)' }} alt="playing" />
                  <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{song?.title || 'Nothing playing'}</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 18, marginBottom: 32 }}>{song?.artist || '—'}</p>
                  
                  <div style={{ width: '100%', maxWidth: 500, margin: '0 auto' }}>
                     <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, marginBottom: 12, cursor: isHost ? 'pointer' : 'default' }}
                          onClick={isHost ? (e) => {
                             const rect = e.currentTarget.getBoundingClientRect()
                             const p = (e.clientX - rect.left) / rect.width
                             seekTo(p * duration)
                             databases.updateDocument(DB_ID, COLLECTIONS.JAM_ROOMS, room.$id, { playback_position: p * duration })
                          } : undefined}>
                        <div style={{ height: '100%', width: `${(progress / (duration || 1)) * 100}%`, background: meta.color, borderRadius: 99, transition: 'width 0.1s linear' }} />
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)' }}>
                        <span>{fmt(progress)}</span>
                        <span>{fmt(duration)}</span>
                     </div>
                  </div>

                  {isHost && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 32 }}>
                      <button onClick={async () => {
                        const newState = !currentRoom.is_playing
                        togglePlay()
                        await databases.updateDocument(DB_ID, COLLECTIONS.JAM_ROOMS, room.$id, { is_playing: newState })
                      }} className="btn-play" style={{ width: 56, height: 56, background: meta.color }}>
                        {currentRoom.is_playing ? <span style={{ fontSize: 24 }}>⏸</span> : <Play size={24} fill="black" style={{ marginLeft: 4 }} />}
                      </button>
                      <button className="btn-primary" style={{ background: 'var(--surface-hover)' }} onClick={() => setShowSongPicker(true)}>
                        Change Song
                      </button>
                    </div>
                  )}
                  {!isHost && (
                    <p style={{ marginTop: 24, fontSize: 14, color: 'var(--text-secondary)' }}>
                      {currentRoom.is_playing ? '▶ Host is playing' : '⏸ Host paused the session'}
                    </p>
                  )}
               </div>
            </div>
         </section>

         {showSongPicker && isHost && (
           <div className="sidebar-overlay show" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setShowSongPicker(false)}>
              <div className="auth-card" style={{ maxWidth: 500, width: '90%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                   <h2 className="section-title" style={{ margin: 0 }}>Pick a Song</h2>
                   <button onClick={() => setShowSongPicker(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 24 }}>&times;</button>
                 </div>
                 
                 <input 
                   type="text" 
                   className="form-input" 
                   placeholder="Search your library..." 
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                   style={{ marginBottom: 16 }}
                 />
                 
                 <div style={{ flex: 1, overflowY: 'auto' }} className="song-list">
                    {songs.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.artist.toLowerCase().includes(searchQuery.toLowerCase())).map(s => (
                      <div key={s.$id} className="song-row" onClick={async () => {
                         await databases.updateDocument(DB_ID, COLLECTIONS.JAM_ROOMS, room.$id, { current_songs: s.$id, is_playing: true, playback_position: 0 })
                         playSong([s], 0)
                         setShowSongPicker(false)
                      }}>
                         <img src={s.cover_url} className="song-cover" alt="cover" />
                         <div className="song-info">
                            <p className="song-title">{s.title}</p>
                            <p className="song-artist">{s.artist}</p>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
         )}

         <aside className={`jam-chat-sidebar ${showMobileChat ? 'show-mobile' : ''}`}>
            <div style={{ padding: '32px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399' }} />
                  <h3 style={{ fontSize: 16, fontWeight: 800, letterSpacing: '0.02em', textTransform: 'uppercase', opacity: 0.8 }}>Live Chat</h3>
               </div>
               <button className="mobile-only" onClick={() => setShowMobileChat(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}>
                  <X size={20} />
               </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
               {messages.length === 0 && (
                 <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', opacity: 0.3 }}>
                    <Headphones size={48} style={{ marginBottom: 16 }} />
                    <p style={{ fontSize: 13 }}>No messages yet...</p>
                 </div>
               )}
                {messages.map(m => {
                   const mUserName = m.user_name || (m.user ? `Member ${m.user.slice(0,4)}` : 'Member')
                   const isMe = m.user === user?.id

                   return (
                     <div key={m.$id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                        {!isMe && <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, marginLeft: 12 }}>{mUserName}</p>}
                        <div style={{ 
                          padding: '12px 16px', borderRadius: 20, 
                          background: isMe ? 'var(--accent)' : 'var(--surface)',
                          color: isMe ? 'white' : 'var(--text-primary)',
                          border: isMe ? 'none' : '1px solid var(--border)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                          fontSize: 14,
                          lineHeight: 1.5
                        }}>
                           {m.text}
                        </div>
                     </div>
                   )
                 })}
               <div ref={chatEndRef} />
            </div>

            {typingUsers.length > 0 && (
              <div style={{ padding: '0 24px 12px', fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 6 }}>
                 <div className="typing-dot" />
                 {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </div>
            )}

            <div style={{ padding: 24, background: 'rgba(0,0,0,0.05)' }}>
               <div style={{ display: 'flex', gap: 10 }}>
                  <input value={message} 
                    onChange={e => {
                      setMessage(e.target.value)
                      handleTyping()
                    }} 
                    onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Message the session..." 
                    style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 18px', color: 'var(--text-primary)', outline: 'none', fontSize: 14 }} />
                  <button onClick={sendMessage} style={{ width: 48, height: 48, borderRadius: 16, background: 'var(--accent)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}>
                     <Send size={18} />
                  </button>
               </div>
            </div>
         </aside>

         <button className="mobile-chat-fab" onClick={() => setShowMobileChat(true)}>
            <MessageSquare size={24} />
         </button>
      </main>
    </>
  )
}

export default JamSession