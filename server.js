const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files (HTML and client-side JS)
app.use(express.static(__dirname));

// Add a route for the root path to ensure it's serving the index.html file
app.get('/', (req, res) => {
  console.log('Serving index.html');
  res.sendFile(__dirname + '/index.html');
});

// Game state
const teams = {
  red: [],
  green: []
};
const playerData = {}; // Store player info (name, team, etc.)
const choices = {}; // Object to store player choices for each round
let round = 0;    // Current round number
const teamScores = {
  red: 0,
  green: 0
};
const teamBets = {
  red: 0,
  green: 0
};

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);
  
  // Handle player joining a team
  socket.on('joinTeam', (data) => {
    console.log('Player joining team:', data);
    const { name, team, bet } = data;
    
    // Add player to the team
    teams[team].push(socket.id);
    
    // Store player data
    playerData[socket.id] = {
      name,
      team,
      bet: bet || 0,
      wins: 0,
      ready: false
    };
    
    // Add bet to team total
    teamBets[team] += (bet || 0);
    
    console.log(`Player ${name} joined ${team} team with bet: $${bet}`);
    console.log('Current teams:', {
      red: teams.red.map(id => playerData[id]?.name),
      green: teams.green.map(id => playerData[id]?.name)
    });
    console.log('Current team bets:', teamBets);
    
    // Notify player they've joined
    socket.emit('joinedTeam', {
      team,
      playerId: socket.id,
      playerName: name,
      bet: bet
    });
    
    // Notify all players about the updated team rosters
    io.emit('teamUpdate', {
      redTeam: teams.red.map(id => playerData[id]?.name || 'Unknown'),
      greenTeam: teams.green.map(id => playerData[id]?.name || 'Unknown'),
      playerData: playerData
    });
    
    // Check if we can start a round
    checkRoundStart();
  });
  
  // Handle player ready status
  socket.on('playerReady', () => {
    if (playerData[socket.id]) {
      console.log(`Player ${playerData[socket.id].name} is ready`);
      playerData[socket.id].ready = true;
      checkRoundStart();
    }
  });
  
  // Handle player's choice
  socket.on('choice', (choice) => {
    if (!playerData[socket.id]) return;
    
    console.log(`Player ${playerData[socket.id].name} chose ${choice}`);
    choices[socket.id] = choice;
    
    // Check if all players have made choices
    const allPlayersChosen = [...teams.red, ...teams.green].every(id => choices[id]);
    
    if (allPlayersChosen) {
      console.log('All players have made their choices, determining winners');
      determineWinners();
    } else {
      console.log('Waiting for other players to make their choices');
      console.log('Current choices:', Object.keys(choices).map(id => ({
        player: playerData[id]?.name,
        choice: choices[id]
      })));
    }
  });
  
  // Handle player disconnection
  socket.on('disconnect', () => {
    if (!playerData[socket.id]) return;
    
    const team = playerData[socket.id].team;
    const bet = playerData[socket.id].bet || 0;
    console.log(`Player ${playerData[socket.id].name} disconnected from ${team} team (bet: $${bet})`);
    
    // Remove player's bet from team total
    teamBets[team] -= bet;
    
    // Remove player from team
    teams[team] = teams[team].filter(id => id !== socket.id);
    
    // Remove player data
    delete playerData[socket.id];
    delete choices[socket.id];
    
    // Notify all players about the updated team rosters
    io.emit('teamUpdate', {
      redTeam: teams.red.map(id => playerData[id]?.name || 'Unknown'),
      greenTeam: teams.green.map(id => playerData[id]?.name || 'Unknown'),
      playerData: playerData
    });
    
    // Notify about player disconnection
    io.emit('playerDisconnected', { playerId: socket.id });
  });
});

function checkRoundStart() {
  // Check if we have at least one player on each team
  if (teams.red.length > 0 && teams.green.length > 0) {
    console.log('Both teams have players');
    
    // Check if all players are ready
    const allReady = [...teams.red, ...teams.green].every(id => playerData[id]?.ready);
    
    if (allReady) {
      console.log('All players are ready, starting new round');
      startNewRound();
    } else {
      console.log('Waiting for all players to be ready');
      console.log('Player ready status:', Object.keys(playerData).map(id => ({
        player: playerData[id]?.name,
        ready: playerData[id]?.ready
      })));
    }
  } else {
    console.log('Waiting for players on both teams');
    console.log('Current teams:', {
      red: teams.red.length,
      green: teams.green.length
    });
  }
}

function startNewRound() {
  round++;
  console.log(`Starting round ${round}`);
  
  // Reset choices
  Object.keys(choices).forEach(id => {
    delete choices[id];
  });
  
  // Reset ready status
  Object.keys(playerData).forEach(id => {
    playerData[id].ready = false;
  });
  
  // Notify all players about the new round
  io.emit('roundStart', { round });
}

function determineWinners() {
  // For each player, determine if they win against each opponent from the other team
  const results = {};
  
  // Red team players vs Green team players
  teams.red.forEach(redPlayerId => {
    const redChoice = choices[redPlayerId];
    results[redPlayerId] = { wins: 0, losses: 0, ties: 0 };
    
    teams.green.forEach(greenPlayerId => {
      const greenChoice = choices[greenPlayerId];
      const outcome = determineOutcome(redChoice, greenChoice);
      
      if (outcome === 'win') {
        results[redPlayerId].wins++;
        if (!results[greenPlayerId]) {
          results[greenPlayerId] = { wins: 0, losses: 0, ties: 0 };
        }
        results[greenPlayerId].losses++;
      } else if (outcome === 'loss') {
        results[redPlayerId].losses++;
        if (!results[greenPlayerId]) {
          results[greenPlayerId] = { wins: 0, losses: 0, ties: 0 };
        }
        results[greenPlayerId].wins++;
      } else {
        results[redPlayerId].ties++;
        if (!results[greenPlayerId]) {
          results[greenPlayerId] = { wins: 0, losses: 0, ties: 0 };
        }
        results[greenPlayerId].ties++;
      }
    });
  });
  
  // Update player stats
  Object.keys(results).forEach(playerId => {
    if (playerData[playerId]) {
      playerData[playerId].wins += results[playerId].wins;
    }
  });
  
  // Calculate team scores
  let redTeamWins = 0;
  let greenTeamWins = 0;
  
  teams.red.forEach(id => {
    redTeamWins += results[id]?.wins || 0;
  });
  
  teams.green.forEach(id => {
    greenTeamWins += results[id]?.wins || 0;
  });
  
  teamScores.red += redTeamWins;
  teamScores.green += greenTeamWins;
  
  // Send round results to all players
  io.emit('roundResult', {
    results,
    choices,
    teamScores,
    playerData,
    round
  });
  
  // Check if game should end
  if (round >= 3) {
    endGame();
  } else {
    // Wait 5 seconds before starting the next round
    setTimeout(() => {
      startNewRound();
    }, 5000);
  }
}

function determineOutcome(choice1, choice2) {
  if (choice1 === choice2) {
    return 'tie';
  }
  
  if ((choice1 === 'rock' && choice2 === 'scissors') ||
      (choice1 === 'paper' && choice2 === 'rock') ||
      (choice1 === 'scissors' && choice2 === 'paper')) {
    return 'win';
  }
  
  return 'loss';
}

function endGame() {
  let winner;
  
  if (teamScores.red > teamScores.green) {
    winner = 'red';
    console.log('Red team wins!');
  } else if (teamScores.green > teamScores.red) {
    winner = 'green';
    console.log('Green team wins!');
  } else {
    winner = 'tie';
    console.log('The game is a tie!');
  }
  
  // Calculate winnings for each player
  if (winner !== 'tie') {
    const losingTeam = winner === 'red' ? 'green' : 'red';
    console.log(`${winner} team wins the pot of $${teamBets[losingTeam]}`);
    
    // Calculate each player's share based on their bet
    const winningTeamPlayers = teams[winner];
    const totalWinningTeamBet = teamBets[winner];
    
    winningTeamPlayers.forEach(playerId => {
      const player = playerData[playerId];
      if (player && player.bet > 0 && totalWinningTeamBet > 0) {
        const playerShare = player.bet / totalWinningTeamBet;
        const playerWinnings = Math.round(teamBets[losingTeam] * playerShare);
        player.winnings = playerWinnings;
        console.log(`Player ${player.name} wins $${playerWinnings}`);
      }
    });
  } else {
    // In case of a tie, no one wins or loses money
    console.log('Tie game - all bets are returned');
  }
  
  // Send game end notification to all players
  io.emit('gameEnd', {
    winner,
    teamScores,
    playerData,
    teamBets
  });
  
  // Reset game state for a new game
  round = 0;
  teamScores.red = 0;
  teamScores.green = 0;
  
  // Don't reset teams or player data to allow for a rematch
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});