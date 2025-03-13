# Rock Paper Scissors Game

A multiplayer Rock Paper Scissors game with betting features, built with Node.js, Express, Socket.IO, and p5.js.

## Features

- Real-time multiplayer gameplay
- Team-based competition (Red vs Green)
- Betting system where winners take losers' bets
- Visual feedback with emojis
- Sound effects

## How to Play

1. Choose a team (Red or Green)
2. Enter your name and bet amount
3. Click "JOIN" to enter the game
4. Click "I'm Ready" when you're ready to play
5. Choose Rock, Paper, or Scissors in each round
6. After 3 rounds, see if you've won or lost your bet!

## Local Development

1. Clone this repository
2. Install dependencies: `npm install`
3. Start the server: `npm start`
4. Open your browser to `http://localhost:3000`

## Deployment

This game can be deployed to various platforms:

### Vercel (Recommended)
1. Create an account at [vercel.com](https://vercel.com)
2. Install Vercel CLI: `npm install -g vercel` (or use the project's local installation)
3. Run `npm run deploy` or `npx vercel --prod` from the project directory
4. Follow the prompts to link your Vercel account and project
5. Your app will be deployed and a URL will be provided

### Render.com (Free)
1. Create an account at [render.com](https://render.com)
2. Create a new Web Service
3. Connect your GitHub repository
4. Use the following settings:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Node version: 14 or higher

### Heroku
1. Create an account at [heroku.com](https://heroku.com)
2. Install the Heroku CLI
3. Run `heroku create`
4. Run `git push heroku main`

### Railway.app
1. Create an account at [railway.app](https://railway.app)
2. Create a new project
3. Connect your GitHub repository
4. Railway will automatically detect your Node.js app and deploy it

## License

MIT 