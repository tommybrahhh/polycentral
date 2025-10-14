// Simple test script to verify the participants endpoint works
const axios = require('axios');

async function testParticipantsEndpoint() {
  try {
    // First, get a valid admin token by logging in
    const loginResponse = await axios.post('http://localhost:8080/api/auth/login', {
      identifier: 'admin', // Replace with actual admin credentials
      password: 'adminpassword' // Replace with actual admin password
    });
    
    const token = loginResponse.data.token;
    console.log('Admin token obtained:', token);
    
    // Get all events to find one with participants
    const eventsResponse = await axios.get('http://localhost:8080/api/admin/events', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Events found:', eventsResponse.data.events.length);
    
    // Try to get participants for the first event
    if (eventsResponse.data.events.length > 0) {
      const eventId = eventsResponse.data.events[0].id;
      console.log('Testing participants endpoint for event ID:', eventId);
      
      const participantsResponse = await axios.get(`http://localhost:8080/api/admin/events/${eventId}/participants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Participants endpoint response:', {
        status: participantsResponse.status,
        data: participantsResponse.data
      });
    } else {
      console.log('No events found to test with');
    }
    
  } catch (error) {
    if (error.response) {
      console.error('Error response:', {
        status: error.response.status,
        data: error.response.data
      });
    } else {
      console.error('Error:', error.message);
    }
  }
}

testParticipantsEndpoint();