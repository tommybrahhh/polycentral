import React, { useState, useEffect } from 'react';
import {
  getAllEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  resolveEvent,
  resolveEventManual,
  suspendEvent,
  getEventParticipants,
  getEventTemplates,
  createEventTemplate,
  updateEventTemplate,
  deleteEventTemplate
} from '../../services/adminApi';

const EventManagement = () => {
  const [events, setEvents] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [eventsPerPage] = useState(10);
  
  // Event form state
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    entry_fee: 100,
    start_time: '',
    end_time: '',
    crypto_symbol: 'btc',
    max_participants: 100
  });
  
  // Template form state
  const [templateForm, setTemplateForm] = useState({
    name: '',
    title_template: '',
    description_template: '',
    entry_fee: 100,
    duration_hours: 24,
    crypto_symbol: 'btc'
  });

  // Manual resolution state
  const [showManualResolution, setShowManualResolution] = useState(false);
  const [manualResolutionData, setManualResolutionData] = useState({
    correctAnswer: '',
    finalPrice: ''
  });
  
  const [actionLoading, setActionLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, [currentPage, searchTerm, statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eventsResponse, templatesResponse] = await Promise.all([
        getAllEvents({ page: currentPage, search: searchTerm, status: statusFilter }),
        getEventTemplates()
      ]);
      
      setEvents(eventsResponse.data);
      setTemplates(templatesResponse.data);
    } catch (err) {
      setError('Failed to load events and templates');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEventParticipants = async (eventId) => {
    try {
      const response = await getEventParticipants(eventId);
      setParticipants(response.data);
    } catch (err) {
      const toast = document.createElement('div');
      toast.className = 'toast toast-error show';
      toast.textContent = 'Failed to load participants: ' + (err.response?.data?.message || err.message);
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await createEvent(eventForm);
      
      // Reset form and refresh data
      setEventForm({
        title: '',
        description: '',
        entry_fee: 100,
        start_time: '',
        end_time: '',
        crypto_symbol: 'btc',
        max_participants: 100
      });
      setShowCreateForm(false);
      fetchData();
      
      const toast = document.createElement('div');
      toast.className = 'toast toast-success show';
      toast.textContent = 'Event created successfully';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } catch (err) {
      const toast = document.createElement('div');
      toast.className = 'toast toast-error show';
      toast.textContent = 'Failed to create event: ' + (err.response?.data?.message || err.message);
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateEvent = async (eventId, eventData) => {
    try {
      setActionLoading(true);
      await updateEvent(eventId, eventData);
      
      fetchData();
      if (selectedEvent && selectedEvent.id === eventId) {
        setSelectedEvent(null);
      }
      
      const toast = document.createElement('div');
      toast.className = 'toast toast-success show';
      toast.textContent = 'Event updated successfully';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } catch (err) {
      const toast = document.createElement('div');
      toast.className = 'toast toast-error show';
      toast.textContent = 'Failed to update event: ' + (err.response?.data?.message || err.message);
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }
    
    try {
      setActionLoading(true);
      await deleteEvent(eventId);
      
      fetchData();
      if (selectedEvent && selectedEvent.id === eventId) {
        setSelectedEvent(null);
      }
      
      const toast = document.createElement('div');
      toast.className = 'toast toast-success show';
      toast.textContent = 'Event deleted successfully';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } catch (err) {
      const toast = document.createElement('div');
      toast.className = 'toast toast-error show';
      toast.textContent = 'Failed to delete event: ' + (err.response?.data?.message || err.message);
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveEvent = async (eventId) => {
    try {
      setActionLoading(true);
      await resolveEvent(eventId);
      
      fetchData();
      
      const toast = document.createElement('div');
      toast.className = 'toast toast-success show';
      toast.textContent = 'Event resolved successfully';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } catch (err) {
      const toast = document.createElement('div');
      toast.className = 'toast toast-error show';
      toast.textContent = 'Failed to resolve event: ' + (err.response?.data?.message || err.message);
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualResolution = async (eventId) => {
    try {
      setActionLoading(true);
      const { correctAnswer, finalPrice } = manualResolutionData;
      
      await resolveEventManual(
        eventId,
        correctAnswer,
        finalPrice ? parseFloat(finalPrice) : null
      );
      
      fetchData();
      setShowManualResolution(false);
      setManualResolutionData({ correctAnswer: '', finalPrice: '' });
      
      const toast = document.createElement('div');
      toast.className = 'toast toast-success show';
      toast.textContent = 'Event manually resolved successfully';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } catch (err) {
      const toast = document.createElement('div');
      toast.className = 'toast toast-error show';
      toast.textContent = 'Failed to manually resolve event: ' + (err.response?.data?.message || err.message);
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspendEvent = async (eventId, isSuspended) => {
    try {
      setActionLoading(true);
      await suspendEvent(eventId, isSuspended);
      
      fetchData();
      
      const toast = document.createElement('div');
      toast.className = 'toast toast-success show';
      const message = isSuspended ? 'Event suspended successfully' : 'Event unsuspended successfully';
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } catch (err) {
      const toast = document.createElement('div');
      toast.className = 'toast toast-error show';
      toast.textContent = 'Failed to update event status: ' + (err.response?.data?.message || err.message);
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await createEventTemplate(templateForm);
      
      // Reset form and refresh data
      setTemplateForm({
        name: '',
        title_template: '',
        description_template: '',
        entry_fee: 100,
        duration_hours: 24,
        crypto_symbol: 'btc'
      });
      setShowTemplateForm(false);
      fetchData();
      
      const toast = document.createElement('div');
      toast.className = 'toast toast-success show';
      toast.textContent = 'Template created successfully';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } catch (err) {
      const toast = document.createElement('div');
      toast.className = 'toast toast-error show';
      toast.textContent = 'Failed to create template: ' + (err.response?.data?.message || err.message);
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) {
      return;
    }
    
    try {
      setActionLoading(true);
      await deleteEventTemplate(templateId);
      
      fetchData();
      
      const toast = document.createElement('div');
      toast.className = 'toast toast-success show';
      toast.textContent = 'Template deleted successfully';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } catch (err) {
      const toast = document.createElement('div');
      toast.className = 'toast toast-error show';
      toast.textContent = 'Failed to delete template: ' + (err.response?.data?.message || err.message);
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter events based on search term and status
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const indexOfLastEvent = currentPage * eventsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
  const currentEvents = filteredEvents.slice(indexOfFirstEvent, indexOfLastEvent);
  const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);

  if (loading) return <div className="loading">Loading events...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="event-management">
      <div className="event-management-header">
        <h2>Event Management</h2>
        <div className="controls-container">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="search-input"
            />
          </div>
          <div className="filter-container">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <div className="button-group">
            <button 
              className="button button-primary"
              onClick={() => setShowCreateForm(true)}
            >
              Create Event
            </button>
            <button 
              className="button button-secondary"
              onClick={() => setShowTemplateForm(true)}
            >
              Manage Templates
            </button>
          </div>
        </div>
      </div>

      <div className="events-list">
        <table className="events-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Status</th>
              <th>Participants</th>
              <th>Prize Pool</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentEvents.map(event => (
              <tr key={event.id}>
                <td>{event.id}</td>
                <td className="event-title">{event.title}</td>
                <td>
                  <span className={`status-badge ${event.status}`}>
                    {event.status}
                  </span>
                </td>
                <td>{event.current_participants || 0}/{event.max_participants || '∞'}</td>
                <td>${event.prize_pool?.toLocaleString() || 0}</td>
                <td>{new Date(event.start_time).toLocaleDateString()}</td>
                <td>{new Date(event.end_time).toLocaleDateString()}</td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="button button-secondary button-small"
                      onClick={() => {
                        setSelectedEvent(event);
                        fetchEventParticipants(event.id);
                      }}
                    >
                      View
                    </button>
                    {event.status !== 'resolved' && (
                      <button 
                        className="button button-warning button-small"
                        onClick={() => handleSuspendEvent(event.id, !event.is_suspended)}
                        disabled={actionLoading}
                      >
                        {event.is_suspended ? 'Unsuspend' : 'Suspend'}
                      </button>
                    )}
                    {event.status === 'pending' && (
                      <>
                        <button
                          className="button button-success button-small"
                          onClick={() => handleResolveEvent(event.id)}
                          disabled={actionLoading}
                        >
                          Auto Resolve
                        </button>
                        <button
                          className="button button-info button-small"
                          onClick={() => {
                            setSelectedEvent(event);
                            setShowManualResolution(true);
                          }}
                          disabled={actionLoading}
                        >
                          Manual Resolve
                        </button>
                      </>
                    )}
                    <button 
                      className="button button-danger button-small"
                      onClick={() => handleDeleteEvent(event.id)}
                      disabled={actionLoading}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredEvents.length === 0 && (
          <div className="no-events">
            <p>No events found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            className="button button-secondary"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span className="page-info">
            Page {currentPage} of {totalPages}
          </span>
          <button 
            className="button button-secondary"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Event</h3>
              <button className="close-button" onClick={() => setShowCreateForm(false)}>×</button>
            </div>
            
            <form onSubmit={handleCreateEvent} className="event-form">
              <div className="form-group">
                <label htmlFor="title">Title:</label>
                <input
                  type="text"
                  id="title"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="description">Description:</label>
                <textarea
                  id="description"
                  value={eventForm.description}
                  onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="entry_fee">Entry Fee:</label>
                  <input
                    type="number"
                    id="entry_fee"
                    value={eventForm.entry_fee}
                    onChange={(e) => setEventForm({...eventForm, entry_fee: parseInt(e.target.value)})}
                    required
                    min="100"
                    step="25"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="max_participants">Max Participants:</label>
                  <input
                    type="number"
                    id="max_participants"
                    value={eventForm.max_participants}
                    onChange={(e) => setEventForm({...eventForm, max_participants: parseInt(e.target.value)})}
                    min="1"
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="start_time">Start Time:</label>
                  <input
                    type="datetime-local"
                    id="start_time"
                    value={eventForm.start_time}
                    onChange={(e) => setEventForm({...eventForm, start_time: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="end_time">End Time:</label>
                  <input
                    type="datetime-local"
                    id="end_time"
                    value={eventForm.end_time}
                    onChange={(e) => setEventForm({...eventForm, end_time: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="crypto_symbol">Cryptocurrency:</label>
                <select
                  id="crypto_symbol"
                  value={eventForm.crypto_symbol}
                  onChange={(e) => setEventForm({...eventForm, crypto_symbol: e.target.value})}
                >
                  <option value="btc">Bitcoin (BTC)</option>
                  <option value="eth">Ethereum (ETH)</option>
                  <option value="sol">Solana (SOL)</option>
                  <option value="ada">Cardano (ADA)</option>
                </select>
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="button button-secondary"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="button button-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Templates Modal */}
      {showTemplateForm && (
        <div className="modal-overlay" onClick={() => setShowTemplateForm(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Event Templates</h3>
              <button className="close-button" onClick={() => setShowTemplateForm(false)}>×</button>
            </div>
            
            <div className="templates-section">
              <h4>Create New Template</h4>
              <form onSubmit={handleCreateTemplate} className="template-form">
                <div className="form-group">
                  <label htmlFor="templateName">Template Name:</label>
                  <input
                    type="text"
                    id="templateName"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="titleTemplate">Title Template:</label>
                  <input
                    type="text"
                    id="titleTemplate"
                    value={templateForm.title_template}
                    onChange={(e) => setTemplateForm({...templateForm, title_template: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="descriptionTemplate">Description Template:</label>
                  <textarea
                    id="descriptionTemplate"
                    value={templateForm.description_template}
                    onChange={(e) => setTemplateForm({...templateForm, description_template: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="templateEntryFee">Entry Fee:</label>
                    <input
                      type="number"
                      id="templateEntryFee"
                      value={templateForm.entry_fee}
                      onChange={(e) => setTemplateForm({...templateForm, entry_fee: parseInt(e.target.value)})}
                      required
                      min="100"
                      step="25"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="durationHours">Duration (Hours):</label>
                    <input
                      type="number"
                      id="durationHours"
                      value={templateForm.duration_hours}
                      onChange={(e) => setTemplateForm({...templateForm, duration_hours: parseInt(e.target.value)})}
                      required
                      min="1"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="templateCrypto">Cryptocurrency:</label>
                  <select
                    id="templateCrypto"
                    value={templateForm.crypto_symbol}
                    onChange={(e) => setTemplateForm({...templateForm, crypto_symbol: e.target.value})}
                  >
                    <option value="btc">Bitcoin (BTC)</option>
                    <option value="eth">Ethereum (ETH)</option>
                    <option value="sol">Solana (SOL)</option>
                    <option value="ada">Cardano (ADA)</option>
                  </select>
                </div>
                
                <button 
                  type="submit" 
                  className="button button-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Creating...' : 'Create Template'}
                </button>
              </form>
              
              <div className="existing-templates">
                <h4>Existing Templates</h4>
                {templates.length > 0 ? (
                  <div className="templates-list">
                    {templates.map(template => (
                      <div key={template.id} className="template-item">
                        <div className="template-info">
                          <h5>{template.name}</h5>
                          <p>{template.title_template}</p>
                        </div>
                        <button 
                          className="button button-danger button-small"
                          onClick={() => handleDeleteTemplate(template.id)}
                          disabled={actionLoading}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No templates available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Event Details: {selectedEvent.title}</h3>
              <button className="close-button" onClick={() => setSelectedEvent(null)}>×</button>
            </div>
            
            <div className="event-details">
              <div className="event-info-grid">
                <div className="info-item">
                  <label>ID:</label>
                  <span>{selectedEvent.id}</span>
                </div>
                <div className="info-item">
                  <label>Status:</label>
                  <span className={`status-${selectedEvent.status}`}>{selectedEvent.status}</span>
                </div>
                <div className="info-item">
                  <label>Entry Fee:</label>
                  <span>{selectedEvent.entry_fee} points</span>
                </div>
                <div className="info-item">
                  <label>Participants:</label>
                  <span>{selectedEvent.current_participants || 0}/{selectedEvent.max_participants || '∞'}</span>
                </div>
                <div className="info-item">
                  <label>Prize Pool:</label>
                  <span>${selectedEvent.prize_pool?.toLocaleString() || 0}</span>
                </div>
                <div className="info-item">
                  <label>Platform Fees:</label>
                  <span>${selectedEvent.platform_fee?.toLocaleString() || 0}</span>
                </div>
                <div className="info-item">
                  <label>Start Time:</label>
                  <span>{new Date(selectedEvent.start_time).toLocaleString()}</span>
                </div>
                <div className="info-item">
                  <label>End Time:</label>
                  <span>{new Date(selectedEvent.end_time).toLocaleString()}</span>
                </div>
                {selectedEvent.correct_answer && (
                  <div className="info-item">
                    <label>Correct Answer:</label>
                    <span>{selectedEvent.correct_answer}</span>
                  </div>
                )}
              </div>

              <div className="participants-section">
                <h4>Participants ({participants.length})</h4>
                {participants.length > 0 ? (
                  <div className="participants-list">
                    <table className="participants-table">
                      <thead>
                        <tr>
                          <th>User ID</th>
                          <th>Prediction</th>
                          <th>Amount</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {participants.map(participant => (
                          <tr key={participant.id}>
                            <td>{participant.user_id}</td>
                            <td>{participant.prediction}</td>
                            <td>{participant.amount} points</td>
                            <td>{new Date(participant.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>No participants yet</p>
                )}
         
                {/* Manual Resolution Modal */}
                {showManualResolution && selectedEvent && (
                  <div className="modal-overlay" onClick={() => setShowManualResolution(false)}>
                    <div className="modal-content medium" onClick={e => e.stopPropagation()}>
                      <div className="modal-header">
                        <h3>Manual Resolution: {selectedEvent.title}</h3>
                        <button className="close-button" onClick={() => setShowManualResolution(false)}>×</button>
                      </div>
                      
                      <div className="manual-resolution-form">
                        <div className="form-group">
                          <label htmlFor="correctAnswer">Correct Answer:</label>
                          <select
                            id="correctAnswer"
                            value={manualResolutionData.correctAnswer}
                            onChange={(e) => setManualResolutionData({
                              ...manualResolutionData,
                              correctAnswer: e.target.value
                            })}
                            required
                          >
                            <option value="">Select correct answer</option>
                            <option value="Higher">Higher</option>
                            <option value="Lower">Lower</option>
                            <option value="0-3% up">0-3% up</option>
                            <option value="3-5% up">3-5% up</option>
                            <option value="5%+ up">5%+ up</option>
                            <option value="0-3% down">0-3% down</option>
                            <option value="3-5% down">3-5% down</option>
                            <option value="5%+ down">5%+ down</option>
                          </select>
                        </div>
                        
                        <div className="form-group">
                          <label htmlFor="finalPrice">Final Price (optional):</label>
                          <input
                            type="number"
                            id="finalPrice"
                            value={manualResolutionData.finalPrice}
                            onChange={(e) => setManualResolutionData({
                              ...manualResolutionData,
                              finalPrice: e.target.value
                            })}
                            placeholder="Enter final price if applicable"
                            step="0.01"
                            min="0"
                          />
                        </div>
                        
                        <div className="form-actions">
                          <button
                            type="button"
                            className="button button-secondary"
                            onClick={() => setShowManualResolution(false)}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="button button-primary"
                            onClick={() => handleManualResolution(selectedEvent.id)}
                            disabled={actionLoading || !manualResolutionData.correctAnswer}
                          >
                            {actionLoading ? 'Resolving...' : 'Resolve Event'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="event-actions">
                <h4>Event Actions</h4>
                <div className="button-group">
                  {selectedEvent.status !== 'resolved' && (
                    <button
                      className={`button ${selectedEvent.is_suspended ? 'button-success' : 'button-warning'}`}
                      onClick={() => handleSuspendEvent(selectedEvent.id, !selectedEvent.is_suspended)}
                      disabled={actionLoading}
                    >
                      {selectedEvent.is_suspended ? 'Unsuspend Event' : 'Suspend Event'}
                    </button>
                  )}
                  {selectedEvent.status === 'pending' && (
                    <button
                      className="button button-success"
                      onClick={() => handleResolveEvent(selectedEvent.id)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Resolving...' : 'Resolve Event'}
                    </button>
                  )}
                  <button
                    className="button button-danger"
                    onClick={() => handleDeleteEvent(selectedEvent.id)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Deleting...' : 'Delete Event'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventManagement;