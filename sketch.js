let socket;
let playerName;
let playerTeam;
let playerId;
let gameState = 'waiting'; // Possible states: 'waiting', 'choosing', 'revealing', 'ended'
let currentRound = 0;
let myChoice = null;
let choices = {};
let results = {};
let teamScores = { red: 0, green: 0 };
let winner;
let playerData = {}; // Store player data from the server

// Game emojis
const emojiMap = {
  'rock': '✊',
  'paper': '✋',
  'scissors': '✌️'
};
let selectedItemIndex = -1; // -1 means no selection
const items = ['rock', 'paper', 'scissors'];
const itemLabels = ['Rock', 'Paper', 'Scissors'];

console.log("sketch.js loaded");

// This ensures p5.js doesn't try to create a global canvas
window.setup = function() {
  console.log("p5.js setup function called");
  
  try {
    // Get player info from sessionStorage
    playerName = sessionStorage.getItem('playerName') || 'Player';
    playerTeam = sessionStorage.getItem('playerTeam') || 'red';
    console.log("Player info retrieved:", playerName, playerTeam);
    
    // Create canvas and place it in the gameCanvas div
    let canvas = createCanvas(800, 600);
    canvas.parent('gameCanvas');
    console.log("Canvas created and added to gameCanvas div");
    
    // Initialize socket connection
    socket = io.connect('/', {
      reconnectionAttempts: 5,
      timeout: 10000,
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log("Socket connected successfully");
      
      // Join team
      socket.emit('joinTeam', {
        name: playerName,
        team: playerTeam
      });
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      // Error handling will be done in the main HTML file
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Attempting to reconnect (${attemptNumber})...`);
    });

    socket.on('reconnect', () => {
      console.log('Reconnected to server');
    });

    // Socket event handlers
    socket.on('joinedTeam', (data) => {
      console.log("Joined team:", data);
      playerId = data.playerId;
      gameState = 'waiting';
    });
    
    socket.on('teamUpdate', (data) => {
      console.log("Team update:", data);
      // Update player data based on team rosters
      data.redTeam.forEach((name, index) => {
        const id = Object.keys(playerData).find(key => playerData[key]?.name === name && playerData[key]?.team === 'red');
        if (!id) {
          // This is a new player we don't have in our data
          console.log("New red team player:", name);
        }
      });
      
      data.greenTeam.forEach((name, index) => {
        const id = Object.keys(playerData).find(key => playerData[key]?.name === name && playerData[key]?.team === 'green');
        if (!id) {
          // This is a new player we don't have in our data
          console.log("New green team player:", name);
        }
      });
    });
    
    socket.on('roundStart', (data) => {
      console.log("Round start:", data);
      currentRound = data.round;
      gameState = 'choosing';
      myChoice = null;
      selectedItemIndex = -1;
    });
    
    socket.on('roundResult', (data) => {
      console.log("Round result:", data);
      choices = data.choices || {};
      results = data.results || {};
      teamScores = data.teamScores || { red: 0, green: 0 };
      
      // Update player data
      if (data.playerData) {
        playerData = data.playerData;
      }
      
      gameState = 'revealing';
      
      // Auto-ready for next round after 5 seconds
      setTimeout(() => {
        if (gameState === 'revealing') {
          socket.emit('playerReady');
        }
      }, 5000);
    });
    
    socket.on('gameEnd', (data) => {
      console.log("Game end:", data);
      winner = data.winner;
      teamScores = data.teamScores || { red: 0, green: 0 };
      gameState = 'ended';
    });
    
    socket.on('playerDisconnected', (data) => {
      console.log("Player disconnected:", data);
    });
    
    // Set text properties
    textAlign(CENTER, CENTER);
  } catch (error) {
    console.error("Error in setup:", error);
    alert("An error occurred while setting up the game. Please refresh the page and try again.");
  }
};

window.draw = function() {
  try {
    background(240);
    
    // Display game header
    displayHeader();
    
    if (gameState === 'waiting') {
      displayWaitingScreen();
    } else if (gameState === 'choosing') {
      displayChoiceScreen();
    } else if (gameState === 'waiting_for_others') {
      displayWaitingForOthersScreen();
    } else if (gameState === 'revealing') {
      displayResultScreen();
    } else if (gameState === 'ended') {
      displayGameEndScreen();
    }
  } catch (error) {
    console.error("Error in draw:", error);
    // Don't show alert here as it would spam the user
    // Just log the error and try to continue
  }
};

function displayHeader() {
  fill(50);
  textSize(24);
  text(`Rock Paper Scissors - ${playerName} (${playerTeam.toUpperCase()} Team)`, width / 2, 30);
  
  // Display team scores
  textSize(18);
  fill(220, 50, 50); // Red team color
  text(`Red Team: ${teamScores.red}`, width / 4, 60);
  fill(50, 180, 50); // Green team color
  text(`Green Team: ${teamScores.green}`, 3 * width / 4, 60);
  
  // Display current round if game is active
  if (currentRound > 0 && gameState !== 'ended') {
    fill(50);
    textSize(20);
    text(`Round ${currentRound}/3`, width / 2, 90);
  }
}

function displayWaitingScreen() {
  fill(50);
  textSize(28);
  text("Waiting for players to join both teams...", width / 2, height / 2 - 40);
  
  textSize(20);
  text("Click the button below when you're ready to play", width / 2, height / 2 + 20);
  
  // Ready button
  drawButton("I'm Ready", width / 2 - 75, height / 2 + 60, 150, 50);
}

function displayChoiceScreen() {
  fill(50);
  textSize(24);
  text("Choose your weapon!", width / 2, 130);
  
  // Draw the three choices with labels
  const itemWidth = 150;
  const spacing = 100;
  const startX = width / 2 - (itemWidth * 1.5 + spacing);
  const itemY = height / 2;
  
  for (let i = 0; i < 3; i++) {
    const x = startX + i * (itemWidth + spacing);
    
    // Draw selection indicator if this item is selected
    if (i === selectedItemIndex) {
      noFill();
      strokeWeight(5);
      stroke(0, 255, 0);
      ellipse(x, itemY, itemWidth + 20, itemWidth + 20);
      strokeWeight(1);
      noStroke();
    }
    
    // Draw the emoji
    fill(50);
    noStroke();
    textSize(80);
    text(emojiMap[items[i]], x, itemY);
    
    // Draw the item label
    textSize(20);
    text(itemLabels[i], x, itemY + itemWidth / 2 + 30);
  }
  
  // Draw confirm button if an item is selected
  if (selectedItemIndex >= 0) {
    drawButton("Confirm Choice", width / 2 - 100, height - 100, 200, 50);
  }
}

function displayWaitingForOthersScreen() {
  fill(50);
  textSize(28);
  text("Waiting for other players to choose...", width / 2, height / 2 - 40);
  
  // Display my choice
  if (myChoice) {
    textSize(80);
    text(emojiMap[myChoice], width / 2, height / 2 + 50);
    
    textSize(20);
    text("Your choice: " + myChoice, width / 2, height / 2 + 150);
  }
}

function displayResultScreen() {
  fill(50);
  textSize(24);
  text("Round Results", width / 2, 130);
  
  // Display my choice
  if (myChoice) {
    textSize(80);
    text(emojiMap[myChoice], width / 3, height / 2 - 50);
    
    textSize(20);
    text("Your choice: " + myChoice, width / 3, height / 2 + 100);
  }
  
  // Display my result
  if (results[playerId]) {
    const myResult = results[playerId];
    textSize(20);
    text(`Wins: ${myResult.wins} | Losses: ${myResult.losses} | Ties: ${myResult.ties}`, width / 2, height / 2 + 150);
  }
  
  // Display team results
  textSize(22);
  const redTeamRoundScore = calculateTeamRoundScore('red');
  const greenTeamRoundScore = calculateTeamRoundScore('green');
  
  fill(220, 50, 50); // Red team color
  text(`Red Team Round Score: ${redTeamRoundScore}`, width / 4, height - 100);
  
  fill(50, 180, 50); // Green team color
  text(`Green Team Round Score: ${greenTeamRoundScore}`, 3 * width / 4, height - 100);
  
  // Display waiting for next round message
  fill(50);
  textSize(18);
  text("Waiting for next round...", width / 2, height - 50);
}

function displayGameEndScreen() {
  fill(50);
  textSize(32);
  text("Game Over!", width / 2, 150);
  
  textSize(28);
  if (winner === 'tie') {
    text("It's a tie!", width / 2, height / 2 - 50);
  } else {
    const winnerText = winner.charAt(0).toUpperCase() + winner.slice(1);
    text(`${winnerText} Team Wins!`, width / 2, height / 2 - 50);
  }
  
  // Display final scores
  textSize(24);
  fill(220, 50, 50); // Red team color
  text(`Red Team: ${teamScores.red}`, width / 3, height / 2 + 30);
  
  fill(50, 180, 50); // Green team color
  text(`Green Team: ${teamScores.green}`, 2 * width / 3, height / 2 + 30);
  
  // Play again button
  drawButton("Play Again", width / 2 - 100, height - 100, 200, 50);
}

function drawButton(label, x, y, w, h) {
  // Button background
  fill(70, 130, 230);
  stroke(50);
  strokeWeight(2);
  rect(x, y, w, h, 10);
  
  // Button text
  fill(255);
  noStroke();
  textSize(20);
  text(label, x + w / 2, y + h / 2);
}

function calculateTeamRoundScore(team) {
  let score = 0;
  
  // Get team players from the server's response
  Object.keys(choices).forEach(playerId => {
    // Check if this player is from the team we're calculating for
    if (playerData && playerData[playerId] && playerData[playerId].team === team) {
      // Add their wins to the score
      if (results[playerId]) {
        score += results[playerId].wins;
      }
    }
  });
  
  return score;
}

window.mousePressed = function() {
  try {
    if (gameState === 'waiting') {
      // Check if ready button is clicked
      if (mouseX > width / 2 - 75 && mouseX < width / 2 + 75 && 
          mouseY > height / 2 + 60 && mouseY < height / 2 + 110) {
        console.log("Ready button clicked");
        socket.emit('playerReady');
      }
    } else if (gameState === 'choosing') {
      // Check if one of the items is clicked
      const itemWidth = 150;
      const spacing = 100;
      const startX = width / 2 - (itemWidth * 1.5 + spacing);
      const itemY = height / 2;
      
      for (let i = 0; i < 3; i++) {
        const x = startX + i * (itemWidth + spacing);
        
        // Check if this item is clicked
        if (dist(mouseX, mouseY, x, itemY) < itemWidth / 2) {
          console.log("Selected item:", items[i]);
          selectedItemIndex = i;
          myChoice = items[i];
          break;
        }
      }
      
      // Check if confirm button is clicked
      if (selectedItemIndex >= 0 && 
          mouseX > width / 2 - 100 && mouseX < width / 2 + 100 && 
          mouseY > height - 100 && mouseY < height - 50) {
        console.log("Confirm choice button clicked:", myChoice);
        socket.emit('choice', myChoice);
        gameState = 'waiting_for_others';
      }
    } else if (gameState === 'ended') {
      // Check if play again button is clicked
      if (mouseX > width / 2 - 100 && mouseX < width / 2 + 100 && 
          mouseY > height - 100 && mouseY < height - 50) {
        console.log("Play again button clicked");
        // Reload the page to start over
        window.location.reload();
      }
    }
  } catch (error) {
    console.error("Error in mousePressed:", error);
  }
};