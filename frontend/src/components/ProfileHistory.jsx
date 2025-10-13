import React from 'react';
import PropTypes from 'prop-types';
import './ProfileHistory.css';

const ProfileHistory = ({ history }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <div className="profile-history">
      <h3>Event Participation History</h3>
      <div className="history-list">
        {history.map((entry) => (
          <div key={entry.event_id} className={`history-item ${entry.resolution_state}`}>
            <div className="event-header">
              <span className="event-title">{entry.title || 'Untitled Event'}</span>
              <span className="event-date">{formatDate(entry.end_time) || 'N/A'}</span>
            </div>
            
            <div className="event-details">
              <div className="detail-row">
                <span>Prediction:</span>
                <span className="prediction">{entry.prediction || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span>Entry Fee:</span>
                <span className="entry-fee">-{entry.entry_fee || 0} pts</span>
              </div>
              {entry.resolution_state === 'win' && (
                <div className="detail-row won">
                  <span>Points Won:</span>
                  <span className="points">+{entry.points_awarded || entry.entry_fee || 0} pts</span>
                </div>
              )}
              {entry.resolution_state === 'loss' && (
                <div className="detail-row lost">
                  <span>Result:</span>
                  <span className="result">Loss</span>
                </div>
              )}
              {entry.resolution_state === 'pending' && (
                <div className="detail-row pending">
                  <span>Status:</span>
                  <span className="result">Resolution Pending</span>
                </div>
              )}
            </div>
            
            {entry.resolution_details && (
              <div className="resolution-details">
                <div className="price-movement">
                  <span>Initial Price: ${entry.initial_price || 'N/A'}</span>
                  <span> → </span>
                  <span>Final Price: ${entry.final_price || 'N/A'}</span>
                </div>
                <div className="correct-answer">
                  Correct Prediction: {entry.correct_answer || 'N/A'}
                </div>
              </div>
            )}
          </div>
        ))}
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