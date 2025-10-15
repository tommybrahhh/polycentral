import React, { useState, useEffect } from 'react';
import { getAllUsers, getUserDetails, adjustUserPoints, updateUserRole, suspendUser, resetUserClaims } from '../../services/adminApi';
import '../../styles/admin.css';

const UserManagement = ({ activeTab, setActiveTab }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  
  // User action forms
  const [pointsForm, setPointsForm] = useState({ points: '', reason: '' });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchTerm]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await getAllUsers({
        page: currentPage,
        search: searchTerm
      });
      // The backend returns { users: [], pagination: {} } structure
      setUsers(response.data.users || []);
    } catch (err) {
      setError('Failed to load users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId) => {
    try {
      const response = await getUserDetails(userId);
      setSelectedUser(response.data);
    } catch (err) {
      const toast = document.createElement('div');
      toast.className = 'toast toast-error show';
      toast.textContent = 'Failed to load user details: ' + (err.response?.data?.message || err.message);
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  };

  const handleAdjustPoints = async (userId) => {
    try {
      setActionLoading(true);
      await adjustUserPoints(userId, parseInt(pointsForm.points), pointsForm.reason);
      
      // Reset form and refresh data
      setPointsForm({ points: '', reason: '' });
      fetchUsers();
      if (selectedUser && selectedUser.id === userId) {
        fetchUserDetails(userId);
      }
      
      const toast = document.createElement('div');
      toast.className = 'toast toast-success show';
      toast.textContent = 'User points adjusted successfully';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } catch (err) {
      const toast = document.createElement('div');
      toast.className = 'toast toast-error show';
      toast.textContent = 'Failed to adjust points: ' + (err.response?.data?.message || err.message);
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRole = async (userId, isAdmin) => {
    try {
      setActionLoading(true);
      await updateUserRole(userId, isAdmin);
      
      fetchUsers();
      if (selectedUser && selectedUser.id === userId) {
        fetchUserDetails(userId);
      }
      
      const toast = document.createElement('div');
      toast.className = 'toast toast-success show';
      toast.textContent = 'User role updated successfully';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } catch (err) {
      const toast = document.createElement('div');
      toast.className = 'toast toast-error show';
      toast.textContent = 'Failed to update role: ' + (err.response?.data?.message || err.message);
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspendUser = async (userId, isSuspended) => {
    try {
      setActionLoading(true);
      await suspendUser(userId, isSuspended);
      
      fetchUsers();
      if (selectedUser && selectedUser.id === userId) {
        fetchUserDetails(userId);
      }
      
      const toast = document.createElement('div');
      toast.className = 'toast toast-success show';
      const message = isSuspended ? 'User suspended successfully' : 'User unsuspended successfully';
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } catch (err) {
      const toast = document.createElement('div');
      toast.className = 'toast toast-error show';
      toast.textContent = 'Failed to update user status: ' + (err.response?.data?.message || err.message);
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetClaims = async (userId) => {
    try {
      setActionLoading(true);
      await resetUserClaims(userId);
      
      if (selectedUser && selectedUser.id === userId) {
        fetchUserDetails(userId);
      }
      
      const toast = document.createElement('div');
      toast.className = 'toast toast-success show';
      toast.textContent = 'User claims reset successfully';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } catch (err) {
      const toast = document.createElement('div');
      toast.className = 'toast toast-error show';
      toast.textContent = 'Failed to reset claims: ' + (err.response?.data?.message || err.message);
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  if (loading) return <div className="loading">Loading users...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="user-management">
      <div className="user-management-header">
        <h2>User Management</h2>
        <div className="search-container">
          <input
            type="text"
            placeholder="Search users by username or email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="search-input"
          />
        </div>
      </div>

      <div className="users-list">
        <table className="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Email</th>
              <th>Points</th>
              <th>Status</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentUsers.map(user => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>{user.points?.toLocaleString() || 0}</td>
                <td>
                  <span className={`status-badge ${user.is_suspended ? 'suspended' : 'active'}`}>
                    {user.is_suspended ? 'Suspended' : 'Active'}
                  </span>
                </td>
                <td>
                  <span className={`role-badge ${user.is_admin ? 'admin' : 'user'}`}>
                    {user.is_admin ? 'Admin' : 'User'}
                  </span>
                </td>
                <td>
                  <button 
                    className="button button-secondary button-small"
                    onClick={() => fetchUserDetails(user.id)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredUsers.length === 0 && (
          <div className="no-users">
            <p>No users found</p>
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

      {/* User Details Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>User Details: {selectedUser.username}</h3>
              <button className="close-button" onClick={() => setSelectedUser(null)}>×</button>
            </div>
            
            <div className="user-details">
              <div className="user-info-grid">
                <div className="info-item">
                  <label>ID:</label>
                  <span>{selectedUser.id}</span>
                </div>
                <div className="info-item">
                  <label>Username:</label>
                  <span>{selectedUser.username}</span>
                </div>
                <div className="info-item">
                  <label>Email:</label>
                  <span>{selectedUser.email}</span>
                </div>
                <div className="info-item">
                  <label>Points:</label>
                  <span>{selectedUser.points?.toLocaleString() || 0}</span>
                </div>
                <div className="info-item">
                  <label>Status:</label>
                  <span className={selectedUser.is_suspended ? 'status-suspended' : 'status-active'}>
                    {selectedUser.is_suspended ? 'Suspended' : 'Active'}
                  </span>
                </div>
                <div className="info-item">
                  <label>Role:</label>
                  <span className={selectedUser.is_admin ? 'role-admin' : 'role-user'}>
                    {selectedUser.is_admin ? 'Admin' : 'User'}
                  </span>
                </div>
                <div className="info-item">
                  <label>Total Events:</label>
                  <span>{selectedUser.total_events || 0}</span>
                </div>
                <div className="info-item">
                  <label>Won Events:</label>
                  <span>{selectedUser.won_events || 0}</span>
                </div>
              </div>

              <div className="user-actions">
                <div className="action-section">
                  <h4>Adjust Points</h4>
                  <div className="form-group">
                    <input
                      type="number"
                      placeholder="Points to add/remove"
                      value={pointsForm.points}
                      onChange={(e) => setPointsForm({...pointsForm, points: e.target.value})}
                    />
                    <textarea
                      placeholder="Reason for adjustment"
                      value={pointsForm.reason}
                      onChange={(e) => setPointsForm({...pointsForm, reason: e.target.value})}
                    />
                    <button
                      className="button button-primary"
                      onClick={() => handleAdjustPoints(selectedUser.id)}
                      disabled={actionLoading || !pointsForm.points}
                    >
                      {actionLoading ? 'Adjusting...' : 'Adjust Points'}
                    </button>
                  </div>
                </div>

                <div className="action-section">
                  <h4>User Management</h4>
                  <div className="button-group">
                    <button
                      className={`button ${selectedUser.is_admin ? 'button-secondary' : 'button-primary'}`}
                      onClick={() => handleUpdateRole(selectedUser.id, !selectedUser.is_admin)}
                      disabled={actionLoading}
                    >
                      {selectedUser.is_admin ? 'Remove Admin' : 'Make Admin'}
                    </button>
                    <button
                      className={`button ${selectedUser.is_suspended ? 'button-success' : 'button-warning'}`}
                      onClick={() => handleSuspendUser(selectedUser.id, !selectedUser.is_suspended)}
                      disabled={actionLoading}
                    >
                      {selectedUser.is_suspended ? 'Unsuspend User' : 'Suspend User'}
                    </button>
                    <button
                      className="button button-info"
                      onClick={() => handleResetClaims(selectedUser.id)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Resetting...' : 'Reset Claims'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;