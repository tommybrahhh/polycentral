import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Leaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const usersPerPage = 20; // Matches backend limit
  const [loggedInUserId, setLoggedInUserId] = useState(null);
  const [timeframe, setTimeframe] = useState('all-time'); // all-time, monthly, weekly

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setLoggedInUserId(user.id);
    }

    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/leaderboard`, {
          params: {
            page: currentPage,
            limit: usersPerPage,
            timeframe: timeframe // Add timeframe parameter
          },
        });
        setLeaderboardData(response.data.users);
        setTotalPages(response.data.pages);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setError('Failed to load leaderboard. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [currentPage, timeframe]);

  const handleNextPage = () => {
    setCurrentPage((prevPage) => prevPage + 1);
  };

  const handlePreviousPage = () => {
    setCurrentPage((prevPage) => Math.max(1, prevPage - 1));
  };

  const handleTimeframeChange = (newTimeframe) => {
    setTimeframe(newTimeframe);
    setCurrentPage(1); // Reset to first page when timeframe changes
  };

  if (loading) {
    return <div className="text-center text-white">Loading Leaderboard...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-white mb-6 text-center">Leaderboard</h1>
      
      {/* Timeframe Selection Tabs */}
      <div className="flex justify-center mb-6">
        <div className="bg-gray-700 rounded-lg p-1 flex">
          {['all-time', 'monthly', 'weekly'].map((time) => (
            <button
              key={time}
              onClick={() => handleTimeframeChange(time)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                timeframe === time
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-600'
              }`}
            >
              {time === 'all-time' ? 'All Time' :
               time === 'monthly' ? 'Monthly' : 'Weekly'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg shadow-lg p-6">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Rank
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Username
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Points
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {leaderboardData.map((user, index) => {
              const isCurrentUser = user.id === loggedInUserId;
              const rank = (currentPage - 1) * usersPerPage + index + 1;
              
              return (
                <tr
                  key={user.id}
                  className={`hover:bg-gray-700 transition-colors ${
                    isCurrentUser
                      ? 'bg-blue-900 border-2 border-blue-400'
                      : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center">
                      <span className={`${isCurrentUser ? 'text-blue-200' : 'text-white'}`}>
                        {rank}
                      </span>
                      {isCurrentUser && (
                        <span className="ml-2 px-2 py-1 bg-blue-500 text-xs text-white rounded-full">
                          You
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={isCurrentUser ? 'text-blue-200 font-semibold' : 'text-gray-200'}>
                      {user.username}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={isCurrentUser ? 'text-blue-200 font-semibold' : 'text-gray-200'}>
                      {user.points.toLocaleString()}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-white">Page {currentPage}</span>
          <button
            onClick={handleNextPage}
            disabled={leaderboardData.length < usersPerPage}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
