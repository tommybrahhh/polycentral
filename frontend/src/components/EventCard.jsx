import React from 'react';
import { useNavigate } from 'react-router-dom';
import { normalizeEventOptions } from '../utils/eventUtils'; // Adjusted path to be relative to components directory

// CountdownTimer component - exported for use in EventDetail
export const CountdownTimer = ({ endTime }) => {
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
      
      {/* Dynamic Community Sentiment Bar */}
      {event.prediction_distribution && (event.prediction_distribution.up > 0 || event.prediction_distribution.down > 0) && (
        <div className="mb-md">
          <div className="flex justify-between text-xs text-secondary mb-1 px-1">
            <span className="text-success font-semibold">
              Bullish: {event.prediction_distribution.up.toFixed(0)}%
            </span>
            <span className="text-danger font-semibold">
              Bearish: {event.prediction_distribution.down.toFixed(0)}%
            </span>
          </div>
          <div className="sentiment-bar">
            <div
              className="sentiment-fill higher"
              style={{ width: `${event.prediction_distribution.up}%` }}
              title={`${event.prediction_distribution.up.toFixed(1)}% Bullish`}
            ></div>
            <div
              className="sentiment-fill lower"
              style={{ width: `${event.prediction_distribution.down}%` }}
              title={`${event.prediction_distribution.down.toFixed(1)}% Bearish`}
            ></div>
          </div>
        </div>
      )}
      
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
      
      {/* Option Volume Chart */}
      {event.option_volumes && Object.keys(event.option_volumes).length > 0 && (
        <div className="bg-surface p-md rounded-md mb-md">
          <h4 className="text-primary text-center mb-sm">Betting Volume</h4>
          <div className="space-y-2">
            {Object.entries(event.option_volumes).map(([option, data]) => (
              <div key={option} className="flex items-center gap-2">
                <span className="text-secondary text-xs w-20 truncate">
                  {option.includes('up') ? '📈 ' : '📉 '}
                  {option}
                </span>
                <div className="flex-grow bg-charcoal rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full ${
                      option.includes('up') ? 'bg-success' : 'bg-danger'
                    }`}
                    style={{
                      width: `${Math.min((data.total_amount / event.prize_pool) * 100, 100)}%`
                    }}
                    title={`${data.total_amount.toLocaleString()} points (${Math.round((data.total_amount / event.prize_pool) * 100)}%)`}
                  ></div>
                </div>
                <span className="text-secondary text-xs w-12 text-right">
                  {Math.round((data.total_amount / event.prize_pool) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
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