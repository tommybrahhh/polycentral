import React from 'react';
import { useTournaments } from '../hooks/useTournaments';
import { PredictionSelector } from './PredictionSelector';

export const EventCard = ({ event, userPoints: propsUserPoints, onClick }) => {
  const { participateInEvent, loadingStates } = useTournaments();
  const [entryAmount, setEntryAmount] = React.useState(event.min_bet || 100);
  
  // Use propsUserPoints if provided, otherwise default to 0
  const userPoints = propsUserPoints || 0;
  
  // If onClick is provided, use it for the entire card click
  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    }
  };

  const handleParticipate = async (prediction) => {
    try {
      await participateInEvent({
        eventId: event.id,
        prediction: prediction,
        entryFee: entryAmount
      });
    } catch (error) {
      console.error('Failed to place bet:', error);
    }
  };

  return (
    <div className="card bg-white rounded-lg p-6 shadow-lg mb-4" onClick={handleClick}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-bold mb-2 md:mb-0">{event.title}</h3>
          <span className={`px-2 py-1 rounded-full text-sm ${
            event.event_type === 'prediction'
              ? 'bg-purple-100 text-purple-800'
              : 'bg-blue-100 text-blue-800'
          }`}>
            {event.event_type}
          </span>
        </div>
        <div className="badge bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
          {event.status}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center">
          <span className="mr-2">🏆</span>
          <span className="font-medium">Pot Size:</span>
          <span className="ml-2 font-bold text-green-600">${event.prize_pool?.toLocaleString() || 0}</span>
        </div>
        <div className="flex items-center">
          <span className="mr-2">👥</span>
          <span className="font-medium">Participants:</span>
          <span className="ml-2">{event.current_participants}</span>
        </div>
        {event.event_type === 'prediction' && (
          <div className="col-span-2 flex items-center">
            <span className="mr-2">📈</span>
            <span className="font-medium">Current Price:</span>
            <span className="ml-2">${event.current_price?.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Prediction Selector for prediction events */}
      {event.event_type === 'prediction' && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <PredictionSelector
            event={event}
            onParticipate={handleParticipate}
            loading={loadingStates.participation}
            userPoints={userPoints}
          />
        </div>
      )}
    </div>
  );
};