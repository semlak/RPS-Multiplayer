# RPS-Multiplayer
## A Multiplayer Rock-Paper-Scissors Game written in JavaScript

### Overview

This is a small webapp/game I programmed as a homework assignment for a educational program I was completing.

* The game is written as a simple web-application where the majority of functionality is in JavaScript, with jQuery used to handle the page maniuplation, and [Firebase](https://firebase.google.com/) for authentication managment and persistent data storage. The program also uses some styling with [Bootstrap 4](https://getbootstrap.com/).

* A playable version of the game has been deployed via GitHub Pages, at [semlak.github.io/RPS-Multiplayer/](semlak.github.io/RPS-Multiplayer/)

* As far as the game goes, it is a really basic Rock-Paper-Scissors game that you play online against another human player. You need to sign-up with an email and password, and select from any available players to start a new game. It currently plays best out of 5 rounds (only counting non-draw rounds).

#### First time using application
1. Create a new sign-on ID. I have only implemented the Firebase email/password authentication, so that is the only way to authenticate. You need a valid-looking email address (the actual email address does not need to be real, but it needs to look like one) and a password with 6 or more characters.

2. Upon Logging in, you should be presented with a box containing buttons for other available players. Click on one of them. A game will immediately start (the other player does not currently get prompted whether to start the game, it just starts).


#### Options during game play:
1. You select Rock, Paper, or Scissors, and wait for your opponent to do the same. The application determines the winner of that round, and updates the scores accordingly. You play best out of 5 non-draw games (ties are recorded, but don't count towards the 5-game total).
2. You can end the game any time by pressing the button under the Rock-Paper-Scissors buttons that says "End Game"
3. You can send a chat messagae to your opponent any time during the game or after the game (assuming neither of you start a new game or hit "End Game")
4. Game records are cleared almost immediately after the game is over. "Almost" meaning that when the game is over, the game result is still displayed  along with any chat messages, but once either user selects to start a new game, it is removed.
5. Logging out and back in or refreshing the page should not cause the game to end--the game should resume where it left off.


### Running the app yourself:
#### Clone the repository

```
git clone https://github.com/semlak/RPS-Multiplayer
#or using SSH
git clone git@github.com:semlak/RPS-Multiplayer.git
cd RPS-Multiplayer
```

You need a Firebase database available. I am not able to provide instructions, but the database rules, you should be able to use the default coniguration:
```
{
  "rules": {
   ".read": "auth != null",
    ".write": "auth != null"
  }
}
```


You then need to update the config object in assets/javascript/app.js for your firebase deployment. You probably then need to run
```
firebase use --add
```

You would need the firebase npm installed to do that (```npm install -g firebase```)