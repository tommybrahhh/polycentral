// Simple test to verify participants endpoint works
const axios = require('axios');

async function testParticipants() {
  try {
    console.log('Testing participants endpoint...');
    
    // Use the debug token endpoint to get a valid token
    const tokenResponse = await axios.get('http://localhost:8080/api/debug/token/1');
    const token = tokenResponse.data.token;
    console.log('Got test token:', token);
    
    // Get events to find one with participants
    const eventsResponse = await axios.get('http://localhost:8080/api/admin/events', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Total events:', eventsResponse.data.events.length);
    
    if (eventsResponse.data.events.length > 0) {
      const event = eventsResponse.data.events[0];
      console.log('Testing event:', event.id, event.title);
      
      // Test participants endpoint
      const participantsResponse = await axios.get(`http://localhost:8080/api/admin/events/${event.id}/participants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Participants response:', {
        status: participantsResponse.status,
        data: participantsResponse.data
      });
    }
    
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testParticipants();