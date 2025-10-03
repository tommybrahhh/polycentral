import React from 'react';
import axios from 'axios';
import { useTournaments } from '../hooks/useTournaments';

export const TournamentCard = ({ tournament }) => {
  const { enterTournament, getPotSize, loadingStates } = useTournaments();
  const [entryPoints, setEntryPoints] = React.useState(tournament.min_entry);
  const [potSize, setPotSize] = React.useState(tournament.pot_size);

  React.useEffect(() => {
    const fetchPot = async () => {
      const updatedPot = await getPotSize(tournament.id);
      setPotSize(updatedPot);
    };
    const interval = setInterval(fetchPot, 5000);
    return () => clearInterval(interval);
  }, [tournament.id]);

  const handleEntry = async () => {
    try {
      await enterTournament(tournament.id, entryPoints);
      const newPot = await getPotSize(tournament.id);
      setPotSize(newPot);
    } catch (error) {
      console.error('Entry failed:', error);
    }
  };

  return (
    <div className="card bg-white rounded-lg p-6 shadow-lg mb-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
        <h3 className="text-xl font-bold mb-2 md:mb-0">{tournament.name}</h3>
        <div className="badge bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
          {tournament.status}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center">
          <span className="mr-2">🏆</span>
          <span className="font-medium">Pot Size:</span>
          <span className="ml-2 font-bold text-green-600">{potSize}</span>
        </div>
        <div className="flex items-center">
          <span className="mr-2">👥</span>
          <span className="font-medium">Entries:</span>
          <span className="ml-2">{tournament.participants_count}</span>
        </div>
      </div>

      <div className="entry-controls flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEntryPoints(Math.max(tournament.min_entry, entryPoints - 25))}
            className="px-3 py-1 bg-gray-200 rounded-lg hover:bg-gray-300"
            disabled={loadingStates.entry}
          >
            -25
          </button>
          <input
            type="number"
            value={entryPoints}
            onChange={(e) => setEntryPoints(Math.max(tournament.min_entry, parseInt(e.target.value) || 0))}
            className="w-20 text-center border rounded-lg py-1"
            min={tournament.min_entry}
          />
          <button
            onClick={() => setEntryPoints(entryPoints + 25)}
            className="px-3 py-1 bg-gray-200 rounded-lg hover:bg-gray-300"
            disabled={loadingStates.entry}
          >
            +25
          </button>
        </div>
        <button
          onClick={handleEntry}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          disabled={loadingStates.entry}
        >
          {loadingStates.entry ? 'Entering...' : 'Enter Tournament'}
        </button>
      </div>

      {loadingStates.pot && (
        <div className="mt-4 text-gray-500">Updating pot...</div>
      )}
    </div>
  );
};