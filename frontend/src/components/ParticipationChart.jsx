import React, { useEffect, useRef, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

export default function ParticipationChart({ eventId }) {
  const [chartData, setChartData] = useState(null);
  const chartRef = useRef(null);
  
  const fetchData = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/events/${eventId}/participations?interval=hour`);
      const data = await response.json();
      
      const chartData = {
        labels: data.map(entry => new Date(entry.time_bucket).toLocaleTimeString()),
        datasets: [{
          label: 'Participants',
          data: data.map(entry => entry.participation_count),
          borderColor: 'hsl(39, 100%, 50%)',
          tension: 0.1,
          fill: true,
          backgroundColor: 'hsla(39, 100%, 50%, 0.2)'
        }]
      };
      
      setChartData(chartData);
    } catch (error) {
      console.error('Error fetching participation data:', error);
    }
  };

  useEffect(() => {
    // Get backend WebSocket URL from environment variable
    const apiUrl = new URL(import.meta.env.VITE_API_BASE_URL);
    const protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${apiUrl.host}/ws`;
    
    let ws;
    try {
      ws = new WebSocket(wsUrl);
      
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'participationUpdate' && message.eventId === eventId) {
          fetchData();
        }
      };

      ws.onerror = (error) => {
        console.warn('WebSocket connection failed, using polling only:', error);
      };
    } catch (error) {
      console.warn('WebSocket initialization failed, using polling only:', error);
    }

    fetchData(); // Initial load
    const interval = setInterval(fetchData, 300000); // Fallback polling every 5 minutes
    
    return () => {
      if (ws) {
        ws.close();
      }
      clearInterval(interval);
    };
  }, [eventId]);

  return (
    <div className="chart-container p-4 bg-white rounded-lg shadow">
      {chartData ? (
        <Line
          ref={chartRef}
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              title: { display: true, text: 'Participation Over Time' }
            },
            scales: {
              y: { beginAtZero: true, title: { display: true, text: 'Participants' } },
              x: { title: { display: true, text: 'Time' } }
            }
          }}
        />
      ) : (
        <div className="text-center text-gray-500">Loading participation data...</div>
      )}
    </div>
  );
}