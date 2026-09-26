import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BedDouble, Search, RefreshCw, X, User as UserIcon, Calendar, Phone, Mail,
  ShieldCheck, Sparkles, CheckCircle2, AlertCircle, Clock, Wrench, ChevronRight,
  Filter, Tag, Check, Award
} from 'lucide-react';
import { api, money, type RoomRecord, type RoomsOverview, type ServiceRequest } from '../services/api';
import { PageHeading } from './GuestPortal';

interface RoomsManagementProps {
  navigate: (page: string) => void;
  initialRoomNumber?: string | null;
}

export default function RoomsManagement({ navigate, initialRoomNumber }: RoomsManagementProps) {
  const [data, setData] = useState<RoomsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const [selectedFloor, setSelectedFloor] = useState<number | 'All'>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRoom, setActiveRoom] = useState<RoomRecord | null>(null);
  const [roomRequests, setRoomRequests] = useState<ServiceRequest[]>([]);
  const [loadingRoomDetails, setLoadingRoomDetails] = useState(false);

  const fetchRooms = async () => {
    try {
      setError('');
      const res = await api<RoomsOverview>('/rooms');
      setData(res);
      // Auto-open initialRoomNumber if specified
      if (initialRoomNumber && !activeRoom) {
        const target = res.rooms.find(r => r.room_number === initialRoomNumber);
        if (target) openRoomDetails(target);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const openRoomDetails = async (room: RoomRecord) => {
    setActiveRoom(room);
    setLoadingRoomDetails(true);
    try {
      const res = await api<{ room: RoomRecord; requests: ServiceRequest[] }>(`/rooms/${room.room_number}`);
      setActiveRoom(res.room);
      setRoomRequests(res.requests);
    } catch {
      // fallback to existing room record
    } finally {
      setLoadingRoomDetails(false);
    }
  };

  const updateRoomStatus = async (roomNumber: string, newStatus: string) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const res = await api<{ ok: boolean; room: RoomRecord }>(`/rooms/${roomNumber}`, 'PATCH', { status: newStatus });
      setActiveRoom(res.room);
      setSuccess(`Room ${roomNumber} status updated to ${newStatus}.`);
      await fetchRooms();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const filteredRooms = useMemo(() => {
    if (!data) return [];
    return data.rooms.filter(room => {
      const matchFloor = selectedFloor === 'All' || room.floor === selectedFloor;
      const matchStatus = selectedStatus === 'All' || room.status === selectedStatus;
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        room.room_number.includes(query) ||
        (room.guest_name && room.guest_name.toLowerCase().includes(query)) ||
        room.type.toLowerCase().includes(query);
      return matchFloor && matchStatus && matchSearch;
    });
  }, [data, selectedFloor, selectedStatus, searchQuery]);

  const getStatusBadge = (status: RoomRecord['status']) => {
    switch (status) {
      case 'Occupied':
        return { label: 'Occupied', className: 'status-occupied-pill', icon: CheckCircle2 };
      case 'Available':
        return { label: 'Available', className: 'status-available-pill', icon: Sparkles };
      case 'Cleaning':
        return { label: 'Cleaning', className: 'status-cleaning-pill', icon: Clock };
      case 'Maintenance':
        return { label: 'Maintenance', className: 'status-maintenance-pill', icon: Wrench };
      default:
        return { label: status, className: 'status-default-pill', icon: BedDouble };
    }
  };

  const stats = data?.stats || {
    total: 150,
    occupied: 129,
    available: 16,
    cleaning: 3,
    maintenance: 2,
    occupancyRate: 86
  };

  return (
    <div className="rooms-management-page">
      <div className="overview-heading">
        <PageHeading
          eyebrow="ACCOMMODATION & GUEST PORTFOLIO"
          title="Resort Rooms & Customer Details"
          subtitle="Real-time occupancy tracking, customer demographics, room turn status, and guest history across all 150 resort keys."
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          <motion.button
            className="secondary"
            disabled={loading}
            onClick={fetchRooms}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <RefreshCw size={16} /> Refresh
          </motion.button>
          <motion.button
            className="light-button"
            onClick={() => navigate('overview')}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Back to Overview
          </motion.button>
        </div>
      </div>

      {error && (
        <motion.div className="error" role="alert" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {error}
        </motion.div>
      )}

      {success && (
        <motion.div className="success" role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Check size={18} /> {success}
        </motion.div>
      )}

      {/* Top Occupancy & Room Status Cards */}
      <div className="metric-grid">
        <motion.article
          className="metric room-stat-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -3 }}
        >
          <div>
            <span>Total Occupancy</span>
            <BedDouble size={20} />
          </div>
          <strong>{stats.occupancyRate}%</strong>
          <p>{stats.occupied} of {stats.total} rooms occupied</p>
        </motion.article>

        <motion.article
          className="metric room-stat-card available-stat"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          whileHover={{ y: -3 }}
          onClick={() => { setSelectedStatus('Available'); }}
          style={{ cursor: 'pointer' }}
        >
          <div>
            <span>Ready for Check-in</span>
            <Sparkles size={20} className="text-blue-500" />
          </div>
          <strong style={{ color: '#1565c0' }}>{stats.available} Rooms</strong>
          <p>Inspected and ready for guest arrival</p>
        </motion.article>

        <motion.article
          className="metric room-stat-card cleaning-stat"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ y: -3 }}
          onClick={() => { setSelectedStatus('Cleaning'); }}
          style={{ cursor: 'pointer' }}
        >
          <div>
            <span>Housekeeping</span>
            <Clock size={20} className="text-amber-500" />
          </div>
          <strong style={{ color: '#b45309' }}>{stats.cleaning} Rooms</strong>
          <p>Turn-down & cleaning in progress</p>
        </motion.article>

        <motion.article
          className="metric room-stat-card maintenance-stat"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          whileHover={{ y: -3 }}
          onClick={() => { setSelectedStatus('Maintenance'); }}
          style={{ cursor: 'pointer' }}
        >
          <div>
            <span>Out of Order</span>
            <Wrench size={20} className="text-rose-500" />
          </div>
          <strong style={{ color: '#be123c' }}>{stats.maintenance} Rooms</strong>
          <p>Under preventative maintenance</p>
        </motion.article>
      </div>

      {/* Filter and Search Bar */}
      <motion.div className="panel rooms-toolbar" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
        <div className="rooms-toolbar-row">
          <div className="tabs">
            {['All', 'Occupied', 'Available', 'Cleaning', 'Maintenance'].map(status => (
              <button
                key={status}
                className={selectedStatus === status ? 'selected' : ''}
                onClick={() => setSelectedStatus(status)}
              >
                {status}
                {status === 'All' && ` (${stats.total})`}
                {status === 'Occupied' && ` (${stats.occupied})`}
                {status === 'Available' && ` (${stats.available})`}
                {status === 'Cleaning' && ` (${stats.cleaning})`}
                {status === 'Maintenance' && ` (${stats.maintenance})`}
              </button>
            ))}
          </div>

          <div className="floor-tabs">
            <span className="filter-label"><Filter size={14} /> Floor:</span>
            {['All', 1, 2, 3].map(floor => (
              <button
                key={String(floor)}
                className={`floor-btn ${selectedFloor === floor ? 'active' : ''}`}
                onClick={() => setSelectedFloor(floor as number | 'All')}
              >
                {floor === 'All' ? 'All Floors' : `Floor ${floor}`}
              </button>
            ))}
          </div>

          <div className="search-field rooms-search">
            <Search size={16} />
            <input
              placeholder="Search room # or guest name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="icon-btn" onClick={() => setSearchQuery('')} style={{ padding: '2px' }}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="rooms-count-hint">
          Showing <b>{filteredRooms.length}</b> of {stats.total} total rooms
          {selectedStatus !== 'All' && ` • Filtered by ${selectedStatus}`}
          {selectedFloor !== 'All' && ` • Floor ${selectedFloor}`}
        </div>
      </motion.div>

      {/* Room Cards Grid */}
      {loading ? (
        <div className="loading-copy" style={{ textAlign: 'center', padding: '40px' }}>
          Loading accommodation grid...
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="empty-state">
          <BedDouble size={36} />
          <h3>No rooms match your filter</h3>
          <p>Try resetting the search query or status filter.</p>
          <button
            className="secondary"
            onClick={() => { setSelectedStatus('All'); setSelectedFloor('All'); setSearchQuery(''); }}
            style={{ marginTop: '12px' }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="rooms-grid">
          {filteredRooms.map((room, idx) => {
            const badge = getStatusBadge(room.status);
            const isOccupied = room.status === 'Occupied';

            return (
              <motion.article
                key={room.room_number}
                className={`room-card ${room.status.toLowerCase()} ${activeRoom?.room_number === room.room_number ? 'selected' : ''}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.015, 0.4) }}
                whileHover={{ y: -4, boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }}
                onClick={() => openRoomDetails(room)}
              >
                <div className="room-card-header">
                  <div className="room-number-wrap">
                    <span className="room-label">ROOM</span>
                    <strong className="room-num">{room.room_number}</strong>
                    <span className="room-floor-tag">Fl {room.floor}</span>
                  </div>
                  <span className={`room-status-badge ${badge.className}`}>
                    <badge.icon size={13} />
                    {badge.label}
                  </span>
                </div>

                <div className="room-card-body">
                  <span className="room-type">{room.type}</span>
                  <div className="room-price">{money(room.price_per_night)} <small>/ night</small></div>

                  {isOccupied && room.guest_name ? (
                    <div className="room-guest-preview">
                      <div className="guest-identity">
                        <span className="guest-avatar-small">
                          {room.guest_name.split(' ').map(n => n[0]).join('')}
                        </span>
                        <div>
                          <b className="guest-name">{room.guest_name}</b>
                          <small className="guest-meta">
                            {room.guest_age ? `${room.guest_age} yrs • ` : ''}{room.guest_gender || ''}
                          </small>
                        </div>
                      </div>
                      {room.vip_tier && room.vip_tier !== 'Standard' && (
                        <span className="vip-badge-small">
                          <Award size={11} /> {room.vip_tier}
                        </span>
                      )}
                    </div>
                  ) : room.status === 'Available' ? (
                    <div className="room-status-desc available">
                      <Sparkles size={14} /> Inspected & ready for check-in
                    </div>
                  ) : room.status === 'Cleaning' ? (
                    <div className="room-status-desc cleaning">
                      <Clock size={14} /> Housekeeping in progress
                    </div>
                  ) : (
                    <div className="room-status-desc maintenance">
                      <Wrench size={14} /> Under preventative maintenance
                    </div>
                  )}
                </div>

                <div className="room-card-footer">
                  <span className="action-hint">
                    {isOccupied ? 'View Guest Details' : 'View Room Info'} <ChevronRight size={14} />
                  </span>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      {/* Detailed Customer / Guest Modal Dialog */}
      <AnimatePresence>
        {activeRoom && (
          <div className="modal-overlay" onClick={() => setActiveRoom(null)}>
            <motion.div
              className="modal-content guest-details-modal"
              onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Modal Top Header */}
              <div className="guest-modal-header">
                <div className="header-left">
                  <div className="room-pill-large">
                    <BedDouble size={20} />
                    <span>Room {activeRoom.room_number}</span>
                  </div>
                  <div>
                    <h2>{activeRoom.type}</h2>
                    <p className="muted">Floor {activeRoom.floor} • Rate: {money(activeRoom.price_per_night)} / night</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className={`room-status-badge ${getStatusBadge(activeRoom.status).className}`}>
                    {activeRoom.status}
                  </span>
                  <button className="icon-btn close-modal-btn" onClick={() => setActiveRoom(null)} aria-label="Close modal">
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="guest-modal-body">
                {activeRoom.status === 'Occupied' && activeRoom.guest_name ? (
                  <>
                    {/* Guest Profile Section */}
                    <div className="profile-section-card">
                      <div className="profile-top">
                        <div className="avatar-large">
                          {activeRoom.guest_name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="profile-meta">
                          <div className="name-row">
                            <h3>{activeRoom.guest_name}</h3>
                            {activeRoom.vip_tier && (
                              <span className={`vip-tag vip-${activeRoom.vip_tier.toLowerCase()}`}>
                                <Award size={14} /> VIP {activeRoom.vip_tier}
                              </span>
                            )}
                          </div>
                          <p className="demographics-text">
                            <strong>Age:</strong> {activeRoom.guest_age || '32'} years old &bull; 
                            <strong> Gender:</strong> {activeRoom.guest_gender || 'Not specified'} &bull;
                            <strong> Guests:</strong> {activeRoom.guest_count || 1} Person(s)
                          </p>
                        </div>
                      </div>

                      {/* Contact & Communication */}
                      <div className="contact-grid">
                        <div className="contact-item">
                          <Mail size={16} />
                          <div>
                            <small>Email Address</small>
                            <span>{activeRoom.guest_email || 'alex.morgan@smartresort.demo'}</span>
                          </div>
                        </div>
                        <div className="contact-item">
                          <Phone size={16} />
                          <div>
                            <small>Contact Phone</small>
                            <span>{activeRoom.guest_phone || '+91 98201 44521'}</span>
                          </div>
                        </div>
                        <div className="contact-item">
                          <Calendar size={16} />
                          <div>
                            <small>Stay Period</small>
                            <span>
                              {activeRoom.check_in ? new Date(activeRoom.check_in).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '24 Sept'} - {activeRoom.check_out ? new Date(activeRoom.check_out).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '29 Sept 2026'}
                            </span>
                          </div>
                        </div>
                        <div className="contact-item">
                          <Tag size={16} />
                          <div>
                            <small>Billing Estimate</small>
                            <span style={{ color: 'var(--green)', fontWeight: 600 }}>
                              {money((activeRoom.price_per_night * 4))} (4 Nights)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Special Requests & Preferences */}
                    <div className="details-two-col">
                      <div className="detail-box">
                        <h4><Sparkles size={16} /> Special Requests & Preferences</h4>
                        <p>{activeRoom.special_requests || 'Standard resort stay amenities. No special dietary requests recorded.'}</p>
                      </div>

                      <div className="detail-box">
                        <h4><ShieldCheck size={16} /> Internal Guest Notes</h4>
                        <p>{activeRoom.notes || 'Keycard verified. Welcome refreshments presented upon check-in.'}</p>
                      </div>
                    </div>

                    {/* Recent Requests linked to this room */}
                    <div className="room-requests-section">
                      <h4>
                        Recent Service & Dining Orders for Room {activeRoom.room_number}
                        {roomRequests.length > 0 && <span className="pill" style={{ marginLeft: '8px' }}>{roomRequests.length} active</span>}
                      </h4>
                      {loadingRoomDetails ? (
                        <p className="loading-copy">Fetching room activity...</p>
                      ) : roomRequests.length > 0 ? (
                        <div className="room-requests-mini-list">
                          {roomRequests.map(req => (
                            <div key={req.id} className="request-mini-card">
                              <div>
                                <b>{req.title}</b>
                                <p>{req.detail || req.category}</p>
                                <small>{new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; #{req.id.slice(0, 8)}</small>
                              </div>
                              <span className={`status status-${req.status.toLowerCase().replace(' ', '-')}`}>
                                {req.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm muted" style={{ fontStyle: 'italic', padding: '8px 0' }}>
                          No recent orders or requests logged for this room today.
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  /* Vacant / Available / Maintenance room info */
                  <div className="vacant-room-panel">
                    <div className="empty-state" style={{ padding: '30px 0' }}>
                      <BedDouble size={48} style={{ color: 'var(--green-light)', marginBottom: '14px' }} />
                      <h3>Room {activeRoom.room_number} is Currently {activeRoom.status}</h3>
                      <p style={{ maxWidth: '420px', margin: '8px auto 20px' }}>
                        {activeRoom.status === 'Available' && 'This room is clean, fully inspected, and ready for immediate guest check-in.'}
                        {activeRoom.status === 'Cleaning' && 'Housekeeping staff is currently preparing this room for the next guest.'}
                        {activeRoom.status === 'Maintenance' && 'Engineering is attending to mechanical or maintenance items in this room.'}
                      </p>
                      <div className="vacant-specs-grid">
                        <div>
                          <small>Room Category</small>
                          <b>{activeRoom.type}</b>
                        </div>
                        <div>
                          <small>Nightly Tariff</small>
                          <b style={{ color: 'var(--green)' }}>{money(activeRoom.price_per_night)}</b>
                        </div>
                        <div>
                          <small>Floor</small>
                          <b>Level {activeRoom.floor}</b>
                        </div>
                        <div>
                          <small>Housekeeping Status</small>
                          <b>{activeRoom.notes || 'Routine Inspection'}</b>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Status Switcher & Quick Actions */}
                <div className="modal-status-bar">
                  <div className="status-label-group">
                    <span className="font-semibold text-sm">Update Room Status:</span>
                    <div className="status-buttons">
                      {(['Occupied', 'Available', 'Cleaning', 'Maintenance'] as const).map(st => (
                        <button
                          key={st}
                          disabled={busy || activeRoom.status === st}
                          className={`status-btn-choice ${activeRoom.status === st ? 'active' : ''} ${st.toLowerCase()}`}
                          onClick={() => updateRoomStatus(activeRoom.room_number, st)}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button className="primary" onClick={() => setActiveRoom(null)}>
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
