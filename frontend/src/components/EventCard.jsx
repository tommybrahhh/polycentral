import React from 'react';
import { useTournaments } from '../hooks/useTournaments';

export const EventCard = ({ event, userPoints: propsUserPoints, onClick }) => {
  const { participateInEvent, loadingStates } = useTournaments();
  const [entryAmount, setEntryAmount] = React.useState(event.min_bet || 100);
  const [selectedPrediction, setSelectedPrediction] = React.useState(null);
  const [validationError, setValidationError] = React.useState('');
  
  // Use propsUserPoints if provided, otherwise default to 0
  const userPoints = propsUserPoints || 0;
  
  // If onClick is provided, use it for the entire card click
  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    }
  };

  const handleParticipation = async (prediction) => {
    // Validate event data
    if (!event) {
      setValidationError('Event data is missing');
      return;
    }

    if (!prediction) {
      setValidationError('Please select a prediction');
      return;
    }

    // Check if userPoints is provided
    if (userPoints === undefined || userPoints === null) {
      setValidationError('User points information not available');
      return;
    }

    if (entryAmount > userPoints) {
      setValidationError('Insufficient points');
      return;
    }

    // Use event.min_bet or default to 100
    const minBet = event.min_bet || 100;
    if (entryAmount < minBet) {
      setValidationError(`Minimum bet is ${minBet} points`);
      return;
    }

    // Use event.max_bet or default to 1000
    const maxBet = event.max_bet || 1000;
    if (entryAmount > maxBet) {
      setValidationError(`Maximum bet is ${maxBet} points`);
      return;
    }

    // Validate entry amount is divisible by 25
    if (entryAmount % 25 !== 0) {
      setValidationError('Bet amount must be divisible by 25');
      return;
    }

    try {
      await participateInEvent({
        eventId: event.id,
        prediction: prediction,
        entryFee: entryAmount
      });
      setValidationError('');
    } catch (error) {
      setValidationError(error.message || 'Participation failed');
    }
  };

  return (
    <div className="card bg-white rounded-xl p-6 shadow-card hover:shadow-card-hover transition-shadow duration-300 mb-4" onClick={handleClick}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-bold mb-2 md:mb-0">{event.title}</h3>
          <span className={`px-2 py-1 rounded-full text-sm font-medium ${
            event.event_type === 'prediction'
              ? 'bg-primary-100 text-primary-800'
              : 'bg-secondary-100 text-secondary-800'
          }`}>
            {event.event_type}
          </span>
        </div>
        <div className={`badge px-3 py-1 rounded-full text-sm font-medium ${
          event.status === 'active'
            ? 'bg-success-100 text-success-800'
            : event.status === 'closed'
              ? 'bg-warning-100 text-warning-800'
              : 'bg-gray-100 text-gray-800'
        }`}>
          {event.status}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center">
          <span className="mr-2">🏆</span>
          <span className="font-medium">Pot Size:</span>
          <span className="ml-2 font-bold text-success-600">${event.prize_pool?.toLocaleString() || 0}</span>
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

      {/* Betting interface for prediction events */}
      {event.event_type === 'prediction' && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="prediction-ui space-y-4">
            <div className="flex gap-2 justify-center">
              <button
                className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                  selectedPrediction === 'higher'
                    ? 'bg-success-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                }`}
                onClick={() => setSelectedPrediction('higher')}
                disabled={loadingStates.participation}
                aria-label="Predict higher price"
              >
                ▲ Higher
              </button>
              <button
                className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                  selectedPrediction === 'lower'
                    ? 'bg-danger-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                }`}
                onClick={() => setSelectedPrediction('lower')}
                disabled={loadingStates.participation}
                aria-label="Predict lower price"
              >
                ▼ Lower
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="number"
                  value={entryAmount}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setEntryAmount(Math.max(
                      event.min_bet || 100,
                      Math.min(value, event.max_bet || 1000)
                    ));
                  }}
                  min={event.min_bet || 100}
                  max={event.max_bet || 1000}
                  step="25"
                  className="w-full sm:w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  disabled={loadingStates.participation}
                  aria-label="Entry amount"
                />
                <button
                  onClick={() => handleParticipation(selectedPrediction)}
                  className="px-6 py-3 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 disabled:bg-gray-400 w-full sm:w-auto transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:transform-none"
                  disabled={!selectedPrediction || loadingStates.participation}
                  aria-describedby="participation-error"
                >
                  {loadingStates.participation ? 'Submitting...' : 'Place Bet'}
                </button>
              </div>
              
              {validationError && (
                <div
                  id="participation-error"
                  role="alert"
                  className="text-danger-500 text-sm mt-2 sm:mt-0 animate-pulse"
                >
                  {validationError}
                </div>
              )}
            </div>
            <p className="text-gray-500 text-sm mt-2 italic">
              Bet amount: {entryAmount} points (non-refundable)
            </p>
          </div>
        </div>
      )}
    </div>
  );
};