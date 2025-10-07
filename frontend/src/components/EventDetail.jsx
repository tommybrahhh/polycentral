import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import Participation from './Participation';

const EventDetail = () => {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/events/${id}`);
        setEvent(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch event:', err);
        setError('Failed to load event');
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  if (loading) return <div className="loading">Loading event...</div>;
  if (error) return <div className="form-error">{error}</div>;
  if (!event) return <div className="form-error">Event not found</div>;

  return (
    <div className="event-detail-container">
      <div className="card">
        <div className="card-body">
          <h2 className="event-title">{event.title}</h2>
          
          {/* Price Display */}
          <div className="price-display">
            <div className="price-column">
              <div className="price-label">Current Price</div>
              <div className="price-value">${event.current_price?.toLocaleString() || 'N/A'}</div>
            </div>
            <div className="price-column">
              <div className="price-label">Initial Price</div>
              <div className="price-value">${event.initial_price?.toLocaleString() || 'N/A'}</div>
            </div>
          </div>
          
          {/* Chart Visualization */}
          <div className="chart-container">
            <svg className="chart" viewBox="0 0 100 40" preserveAspectRatio="none">
              <path d="M0,30 L20,25 L40,35 L60,20 L80,25 L100,15"
                    stroke="var(--orange-primary)"
                    strokeWidth="3"
                    fill="none"
                    filter="url(#glow)" />
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
            </svg>
          </div>
          
          {/* Metadata Bar */}
          <div className="metadata-bar">
            <div className="metadata-item">
              <span className="icon">🎫</span>
              <span className="hidden sm:inline">Entry: </span>{typeof event.entry_fee === 'number' ? event.entry_fee : 'N/A'}
            </div>
            <div className="metadata-item">
              <span className="icon">💰</span>
              Pot: ${event.prize_pool?.toLocaleString() || 0}
            </div>
          </div>
          
          {/* Event Description */}
          <div className="event-description">
            <p>{event.description}</p>
          </div>
          
          {/* Participation Component */}
          <Participation event={event} />
          
          {/* Resolution Status */}
          {event.status === 'resolved' && (
            <div className="resolution-info">
              <strong>Result:</strong> {event.correct_answer} -
              Final Price: ${event.final_price?.toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetail;