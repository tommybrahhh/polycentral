import React from 'react';
import { useNavigate } from 'react-router-dom';
import { normalizeEventOptions } from '../utils/eventUtils'; // Adjusted path to be relative to components directory

const EventCard = ({ event }) => {
  const navigate = useNavigate();
  const eventOptions = React.useMemo(() => normalizeEventOptions(event.options), [event.options]);

  // Helper function to determine if an event is closing soon (within 1 hour)
  const isEventClosingSoon = (event) => {
    const now = new Date();
    const endTime = new Date(event.end_time);
    const timeDiff = endTime - now; // difference in milliseconds
    const oneHour = 60 * 60 * 1000; // one hour in milliseconds
    return timeDiff > 0 && timeDiff <= oneHour;
  };

  // Helper function to determine if an event is expired
  const isEventExpired = (event) => {
    const now = new Date();
    const endTime = new Date(event.end_time);
    return now >= endTime;
  };

  // CountdownTimer component
  const CountdownTimer = ({ endTime }) => {
    const [timeLeft, setTimeLeft] = React.useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [isCritical, setIsCritical] = React.useState(false);
    const [isWarning, setIsWarning] = React.useState(false);

    React.useEffect(() => {
      const calculateTimeLeft = () => {
        const now = new Date();
        const end = new Date(endTime);
        const difference = end - now;

        if (difference <= 0) {
          return { days: 0, hours: 0, minutes: 0, seconds: 0 };
        }

        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        return { days, hours, minutes, seconds };
      };

      const timer = setInterval(() => {
        const newTimeLeft = calculateTimeLeft();
        setTimeLeft(newTimeLeft);
    
        // Calculate total time in minutes for warning states
        const totalMinutes = newTimeLeft.days * 24 * 60 + newTimeLeft.hours * 60 + newTimeLeft.minutes;
        const totalSeconds = totalMinutes * 60 + newTimeLeft.seconds;
    
        // Set warning states
        const isCriticalState = totalSeconds <= 60; // 1 minute or less
        const isWarningState = totalMinutes <= 60 && totalSeconds > 60; // 1 hour or less but more than 1 minute
        
        setIsCritical(isCriticalState);
        setIsWarning(isWarningState);
      }, 1000);

      // Initial calculation
      setTimeLeft(calculateTimeLeft());

      return () => clearInterval(timer);
    }, [endTime]);

    const formatTime = (value) => {
      return value.toString().padStart(2, '0');
    };

    const getTimeDisplay = () => {
      const { days, hours, minutes, seconds } = timeLeft;
      
      if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
      } else if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      } else {
        return `${seconds}s`;
      }
    };

    const timerClass = `countdown-timer ${isCritical ? 'critical' : isWarning ? 'warning' : 'normal'}`;

    return (
      <div className={timerClass}>
        <span className="icon">⏰</span>
        <span className="time-display">{getTimeDisplay()}</span>
      </div>
    );
  };

  // Don't render expired events
  if (isEventExpired(event)) {
    return null;
  }

  return (
    <div
      className="card"
      onClick={() => navigate(`/events/${event.id}`)}
      role="button"
      tabIndex={0}
      aria-label={`Event: ${event.title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          navigate(`/events/${event.id}`);
        }
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-md">
        <h3 className="text-primary">{event.title}</h3>
        <div className="flex items-center gap-4">
          <span className="text-secondary" aria-label={`${event.current_participants} participants`}>👥{event.current_participants}</span>
          <div className={`text-secondary ${isEventClosingSoon(event) ? 'text-orange' : 'text-success'}`}>
            {isEventClosingSoon(event) ? 'Closing' : 'Active'}
          </div>
          <CountdownTimer endTime={event.end_time} />
        </div>
      </div>
      
      {/* Sentiment Bar */}
      <div className="sentiment-bar mb-md">
        <div className="sentiment-fill higher" style={{ width: '70%' }}></div>
        <div className="sentiment-fill lower" style={{ width: '30%' }}></div>
      </div>
      
      <p className="text-primary mb-md">{event.description}</p>
      
      {/* Key Event Stats Bar */}
      <div className="flex gap-md mb-md">
        <div className="flex flex-col items-center">
          <span className="text-secondary text-sm">Prize Pool</span>
          <span className="text-primary font-semibold">💰 ${event.prize_pool?.toLocaleString() || 0}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-secondary text-sm">Entry Fee</span>
          <span className="text-primary font-semibold">🎫 {typeof event.entry_fee === 'number' ? `${event.entry_fee} PTS` : 'N/A'}</span>
        </div>
      </div>
      
      {/* Interactive Prediction Options Preview */}
      <div className="bg-surface p-md rounded-md mb-md">
        <h4 className="text-primary text-center mb-sm">Prediction Options</h4>
        <div className="flex gap-sm justify-center flex-wrap">
          {eventOptions.map((option) => (
            <div
              key={option.id}
              className={`btn btn-secondary text-sm ${option.value.includes('up') ? 'text-success' : 'text-danger'}`}
            >
              {option.label}
            </div>
          ))}
        </div>
      </div>
      
      {/* Call to Action Button */}
      <div className="text-center">
        <button className="btn btn-primary" onClick={(e) => {
          e.stopPropagation(); // Prevent card's onClick from firing twice
          navigate(`/events/${event.id}`);
        }}>
          View & Place Bet
        </button>
      </div>
    </div>
  );
};

export default EventCard;