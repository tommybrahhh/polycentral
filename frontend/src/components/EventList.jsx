import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EventCard from './EventCard';

const EventList = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/events/active`);
        setEvents(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch events:', err);
        setError('Failed to load events');
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Helper function to determine if an event is expired
  const isEventExpired = (event) => {
    const now = new Date();
    const endTime = new Date(event.end_time);
    return now >= endTime;
  };

  // Filter out expired events
  const activeEvents = events.filter(event => !isEventExpired(event));

  if (loading) return <div className="loading">Loading events...</div>;
  if (error) return <div className="form-error">{error}</div>;

  return (
    <div className="events-container">
      <div className="events-list">
        {activeEvents.map(event => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
};

export default EventList;