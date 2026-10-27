import React, { useState, useEffect } from 'react';
import { ChefHat, Volume2, VolumeX, Clock, Check, ArrowRight, Flame } from 'lucide-react';
import { socket } from '../utils/socket';
import { soundManager } from '../utils/sound';
import { authFetch } from '../utils/staffAuth';
import { useToast } from '../components/Toast';
import '../styles/kitchen.css';

export default function KitchenKdsApp() {
  const { addToast } = useToast();
  const [tickets, setTickets] = useState([]);
  const [isMuted, setIsMuted] = useState(soundManager.isMuted());
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setTickets(data.filter((o) => o.status === 'pending' || o.status === 'preparing'));
      }
    } catch (e) {}
  };

  useEffect(() => {
    socket.emit('join-kitchen');

    const handleNewOrder = (order) => {
      soundManager.playNewOrderChime();
      setTickets((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
      addToast(`New Kitchen Ticket: ${order.tableName} (#${order.orderNumber})`, 'warning', 6000);
    };

    const handleStatusChanged = (updated) => {
      if (updated.status === 'ready' || updated.status === 'served' || updated.status === 'completed' || updated.status === 'cancelled') {
        setTickets((prev) => prev.filter((o) => o.id !== updated.id));
      } else {
        setTickets((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      }
    };

    socket.on('order:new', handleNewOrder);
    socket.on('order:status_changed', handleStatusChanged);

    return () => {
      socket.off('order:new', handleNewOrder);
      socket.off('order:status_changed', handleStatusChanged);
    };
  }, []);

  const updateTicketStatus = async (ticketId, nextStatus) => {
    try {
      const res = await authFetch(`/api/orders/${ticketId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        soundManager.playClick();
        if (nextStatus === 'ready') {
          soundManager.playOrderReady();
        }
      }
    } catch (e) {
      addToast('Failed to update kitchen ticket', 'error');
    }
  };

  const getUrgency = (createdAt) => {
    const elapsedMinutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (elapsedMinutes >= 20) return { class: 'urgency-red', text: `${elapsedMinutes}m (CRITICAL)` };
    if (elapsedMinutes >= 10) return { class: 'urgency-orange', text: `${elapsedMinutes}m (ATTENTION)` };
    return { class: 'urgency-green', text: `${elapsedMinutes}m` };
  };

  return (
    <div className="kds-container">
      <header className="kds-header">
        <div className="kds-brand">
          <ChefHat size={30} style={{ color: 'var(--primary)' }} />
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Table<span style={{ color: '#00e676' }}>Mint</span> Kitchen Station</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Live Kitchen Display System (KDS)
            </span>
          </div>
          <span className="kds-badge">{tickets.length} ACTIVE ORDERS</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700 }}>
            {currentTime}
          </div>
          <button
            className="btn-icon"
            onClick={() => {
              const m = soundManager.toggleMute();
              setIsMuted(m);
            }}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </header>

      {tickets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-muted)' }}>
          <ChefHat size={56} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <h3>All Kitchen Orders Cleared!</h3>
          <p>Standing by for incoming customer orders...</p>
        </div>
      ) : (
        <div className="kds-tickets-grid">
          {tickets.map((ticket) => {
            const urgency = getUrgency(ticket.createdAt);
            return (
              <div key={ticket.id} className="kds-ticket">
                <div className={`kds-ticket-header ${urgency.class}`}>
                  <div className="kds-ticket-table">
                    {ticket.tableName} • #{ticket.orderNumber}
                  </div>
                  <div className="kds-timer-badge">
                    <Clock size={14} /> {urgency.text}
                  </div>
                </div>

                <div className="kds-ticket-body">
                  {ticket.items?.map((item, idx) => (
                    <div key={idx} className="kds-item-line">
                      <div className="kds-item-qty">{item.quantity}</div>
                      <div className="kds-item-details">
                        <div className="kds-item-name">{item.name}</div>
                        {item.notes && <div className="kds-item-mods">Note: {item.notes}</div>}
                      </div>
                    </div>
                  ))}

                  {ticket.notes && (
                    <div
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        borderLeft: '3px solid #ef4444',
                        padding: '6px 10px',
                        borderRadius: 4,
                        fontSize: '0.85rem',
                        color: '#fca5a5',
                        marginTop: 6
                      }}
                    >
                      ⚠️ Chef Special Instruction: {ticket.notes}
                    </div>
                  )}
                </div>

                <div className="kds-ticket-footer">
                  {ticket.status === 'pending' ? (
                    <button
                      className="btn-kds-action"
                      style={{ background: '#f59e0b', color: '#000' }}
                      onClick={() => updateTicketStatus(ticket.id, 'preparing')}
                    >
                      <Flame size={16} /> Start Cooking
                    </button>
                  ) : (
                    <button
                      className="btn-kds-action"
                      style={{ background: '#10b981', color: '#000' }}
                      onClick={() => updateTicketStatus(ticket.id, 'ready')}
                    >
                      <Check size={16} /> Ready For Pickup
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
