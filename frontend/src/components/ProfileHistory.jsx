import React from 'react';
import PropTypes from 'prop-types';
import '../styles/admin.css';

const ProfileHistory = ({ history }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <div className="admin-content">
      <div className="admin-component-header">
        <h2>Event Participation History</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        {history.length > 0 ? (
          history.map((entry) => (
            <div key={entry.participation_id} className="card p-4">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-ui-border">
                <span className="font-semibold text-off-white text-lg">
                  {entry.title || 'Untitled Event'}
                </span>
                <span className="text-light-gray text-sm">
                  {formatDate(entry.end_time) || 'N/A'}
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-light-gray">Prediction:</span>
                  <span className="font-medium text-off-white">
                    {entry.prediction || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-light-gray">Entry Fee:</span>
                  <span className="text-danger-red font-medium">
                    -{entry.entry_fee || 0} pts
                  </span>
                </div>
                {entry.resolution_state === 'win' && (
                  <div className="flex justify-between">
                    <span className="text-light-gray">Points Won:</span>
                    <span className="text-success-green font-semibold">
                      +{entry.points_awarded || entry.entry_fee || 0} pts
                    </span>
                  </div>
                )}
                {entry.resolution_state === 'loss' && (
                  <div className="flex justify-between">
                    <span className="text-light-gray">Result:</span>
                    <span className="text-danger-red font-medium">
                      Loss
                    </span>
                  </div>
                )}
                {entry.resolution_state === 'pending' && (
                  <div className="flex justify-between">
                    <span className="text-light-gray">Status:</span>
                    <span className="text-yellow-400 font-medium">
                      Resolution Pending
                    </span>
                  </div>
                )}
              </div>
              
              {entry.resolution_details && (
                <div className="p-3 bg-black bg-opacity-20 rounded-sm border border-ui-border">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-light-gray">Initial Price:</span>
                    <span className="text-off-white">${entry.initial_price || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-light-gray">Final Price:</span>
                    <span className="text-off-white">${entry.final_price || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-light-gray">Correct Prediction:</span>
                    <span className="text-off-white font-medium">
                      {entry.correct_answer || 'N/A'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="no-data">
            <p>No participation history available</p>
          </div>
        )}
      </div>
    </div>
  );
};

ProfileHistory.propTypes = {
  history: PropTypes.arrayOf(
    PropTypes.shape({
      event_id: PropTypes.number.isRequired,
      title: PropTypes.string,
      end_time: PropTypes.string,
      prediction: PropTypes.string,
      entry_fee: PropTypes.number,
      points_awarded: PropTypes.number,
      resolution_state: PropTypes.oneOf(['win', 'loss', 'pending']).isRequired,
      initial_price: PropTypes.number,
      final_price: PropTypes.number,
      correct_answer: PropTypes.string,
      resolution_details: PropTypes.object
    })
  ).isRequired
};

export default ProfileHistory;