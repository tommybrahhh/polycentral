# Variable Entry Fee System

## Overview
This document describes the new variable entry fee system that allows users to select from predefined entry fee options (100, 200, 500, 1000 points) for each bet, with rewards increasing proportionally.

## Features
- Users can select from 4 predefined entry fee options: 100, 200, 500, or 1000 points
- Rewards are distributed proportionally based on the amount each winner bet
- Higher entry fees result in potentially higher rewards when winning
- The system maintains backward compatibility with existing events

## Implementation Details

### Backend Changes
1. **API Endpoint**: The `/api/events/:id/bet` endpoint now accepts an optional `entryFee` parameter
2. **Validation**: 
   - Entry fee must be one of the predefined values: 100, 200, 500, 1000
   - Entry fee must be within the event's `min_bet` and `max_bet` constraints
   - Users must have sufficient points for the selected entry fee
3. **Reward Distribution**: 
   - Rewards are calculated proportionally based on each winner's bet amount
   - Formula: `winner_share = (winner_amount / total_winner_amount) * total_pot`
   - Winners receive their original bet amount plus their share of the pot

### Frontend Changes
1. **Entry Fee Selection Component**: 
   - Added to the Participation component
   - Displays 4 buttons for the predefined entry fee options
   - Visual feedback for selected option
   - Disabled buttons for options the user cannot afford
2. **Potential Rewards Display**:
   - Shows potential rewards for each entry fee option
   - Updated on both EventCard and EventDetail pages
   - Calculation based on current prize pool

### Database Schema
The system uses existing database columns:
- `participants.amount`: Stores the actual entry fee for each bet
- `events.min_bet` and `events.max_bet`: Define valid entry fee ranges
- `events.pot_enabled`: Enables the pot system (must be true)

## User Experience

### Making a Bet
1. User navigates to an event detail page
2. User selects an entry fee from the available options (100, 200, 500, 1000 points)
3. User clicks either "Higher" or "Lower" prediction button
4. System validates the user has sufficient points
5. Bet is placed with the selected entry fee
6. Points are deducted from user's balance
7. Event prize pool is updated

### Reward Calculation
When an event is resolved:
1. System determines the correct outcome (Higher or Lower)
2. Identifies all winners (users who predicted correctly)
3. Calculates total amount bet by all winners
4. Distributes pot proportionally to each winner
5. Each winner receives their original bet plus their share of the pot

### Example Scenarios

#### Scenario 1: User is the only participant
- User bets 500 points
- No other participants
- User wins
- User receives: 500 (original bet) + 0 (pot share) = 500 points

#### Scenario 2: Multiple participants, user wins
- User bets 500 points
- Another user bets 100 points
- Total pot: 600 points
- User predicted correctly, other user predicted incorrectly
- User receives: 500 (original bet) + 600 (full pot) = 1100 points

#### Scenario 3: Multiple winners
- User bets 500 points
- Another user bets 100 points
- Both predicted correctly
- Total pot: 600 points
- User's share: (500/600) * 600 = 500 points
- User receives: 500 (original bet) + 500 (pot share) = 1000 points

## Validation Rules
- Entry fee must be 100, 200, 500, or 1000 points
- User must have sufficient points for selected entry fee
- Event must be active (not expired)
- User cannot place multiple bets on the same event
- Entry fee must be within event's min_bet and max_bet constraints

## Error Handling
- Insufficient points: Clear error message showing how many more points needed
- Invalid entry fee: Error message listing valid options
- Event closed: Error message indicating event is no longer active
- Duplicate bet: Error message indicating user already placed a bet
- Server errors: Generic error message with retry option

## Testing
The feature has been tested with:
- All valid entry fee options
- Insufficient points scenarios
- Event expiration scenarios
- Multiple participants with different entry fees
- Reward distribution verification