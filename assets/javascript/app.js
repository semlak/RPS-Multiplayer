"use strict";


// Initialize Firebase
var config = {
  apiKey: "AIzaSyBkyF3iDkn4oj30QNEJ8vsnIF57PY0xki0",
  authDomain: "rps-game-d93c5.firebaseapp.com",
  databaseURL: "https://rps-game-d93c5.firebaseio.com",
  projectId: "rps-game-d93c5",
  storageBucket: "rps-game-d93c5.appspot.com",
  messagingSenderId: "131891175803"
};
firebase.initializeApp(config);

const provider = new firebase.auth.GoogleAuthProvider();

var database = firebase.database();
// var UsersRef = database.ref("Users");
var GamesRef = database.ref("Games")


var app = null;

const GamePlay = {
  ROCK: 1,
  PAPER: 2,
  SCISSORS: 3
}

let getPlay = function(action) {
  if (action === "rock") {
    return GamePlay.ROCK;
  }
  else if (action === "paper") {
    return GamePlay.PAPER;
  }
  else if (action === "scissors") {
    return GamePlay.SCISSORS;
  }
  else {
    throw "Action was not rock, paper, or scissors"
  }
}

let checkWin = function(play1, play2) {
  // play1 and play2 are instances of GamePlay enumerable object
  if (play1 === play2) {
    //tie
    return 0;
  }
  if ((play1 === GamePlay.ROCK && play2 !== GamePlay.PAPER) ||
    (play1 === GamePlay.PAPER && play2 !== GamePlay.SCISSORS) ||
    (play1 === GamePlay.SCISSORS && play2 !== GamePlay.ROCK)) {
    // play 1 wins
    return -1
  }
  else {
    // play 2 wins
    return 1;
  }
}




let RPSGame = class RPSGame {
  constructor(player1, player1Name, player2, player2Name, maxNumberOfGames) {
    let me = this;
    me.gameID = null;
    me.player1 = player1;
    me.player1Name = player1Name;
    me.player2  = player2;
    me.player2Name = player2Name;

    // Will game be best 2 out of 3, 3 out of 5, ..., the maxNumberOfGames would be 3 or 5 in those cases.
    // This value should always be odd.
    if (!maxNumberOfGames || maxNumberOfGames % 2 === 0) {
      // I plan to prevent the UI from even allowing to get here, but in case that doesn't work, throw error. I might try to change to handle in better way
      // throw "Max Number of Games must be Odd";
      maxNumberOfGames = 5;
    }
    me.maxNumberOfGames = maxNumberOfGames;

    //this next section was the part where a fatal error was being created, hense the attempt to detect various errors.
    //This should at least catch error and handle more gracefully than before, by desplaying a modal advising user to refresh.

          try {
            if (typeof player1 !== "string" || typeof player2 !== "string" || typeof player1Name !== "string" || typeof maxNumberOfGames !== "number" ) {
              throw "Error detected in initial game data just before trying to push new game to firebase server."
            }
      me.gameID = GamesRef.push({
        player1: player1,
        player2: player2,
        player1Wins: 0,
        player2Wins: 0,
        player1Name: player1Name,
        player2Name: player2Name,
        ties: 0,
        maxNumberOfGames,
        gameInProgress: true
      }).key();
    } catch (error) {
      // console.log("error while trying to start new game")
      // console.log(error)
      $("#feedback-modal .modal-body")
        .text("Error detected: '" + error + "'.  \nPlease refresh page and try again.");
      $("#feedback-modal").modal("show");
    }

  }

}


let RPSApp = class RPSApp {
  constructor() {
    app = this;
    firebase.auth().onAuthStateChanged(app.authChangeCallback);

    this.authUser = firebase.auth().currentUser;

    this.createAppEventListeners();
    if (this.gathering == null) {
      this.gathering = new Gathering(database, 'OnlineUsers')
    }
    this.opponentActionListener = null;



  }

  updateGame(game) {
    // console.log("in updateGame(), game: ", game)

    let authUser = firebase.auth().currentUser;
    let opponentName = game.player1 !== authUser.uid ? game.player1Name : game.player2Name;
    let opponentuid = game.player1 !== authUser.uid ? game.player1 : game.player2;
    let opponentScore = game.player1 !== authUser.uid ? game.player1Wins : game.player2Wins;
    let playerScore = game.player1 === authUser.uid ? game.player1Wins : game.player2Wins;
    $(".card.game").show();
    $(".card#available-users").hide();
    $(".game #opponent-display-name").text(opponentName);
    $(".game #your-score").text(playerScore);
    $(".game #opponent-score").text(opponentScore);
    $(".game #ties").text(game.ties);
    // $(".btn.game-action").prop("disabled", false);

  }

  tryToStartGame(event) {
    // console.log("tryig to start game");
    let element = $(this);
    // console.log("element: ", element);
    let playeruid = element.data("uid");
    let playerDisplayName = element.text();
    // console.log("playeruid:", playeruid);
    let useruid = firebase.auth().currentUser.uid;
    let userDisplayname = firebase.auth().currentUser.displayName
    $(".btn.game-action").prop("disabled", false);
    // app.gathering.join(firebase.auth().currentUser.uid, firebase.auth().currentUser.displayName);

    if (useruid !== playeruid) {
      app.game = new RPSGame(useruid, userDisplayname, playeruid, playerDisplayName, 5);
    }
  }

  removeFirebaseListeners() {
    // UsersRef.off("child_added");
    GamesRef.off("child_removed");
    GamesRef.off("child_changed");
    if (typeof app.gameID === "string" ) {
      GamesRef.child(app.gameID).off("value");
      GamesRef.child(app.gameID + "/gameInProgress").off("value");
      GamesRef.child(app.gameID + "/player1Actions").off("value")
      GamesRef.child(app.gameID + "/player2Actions").off("value")
    }
  }

  createFirebaseListeners() {
    let authUser = app.authUser;
    // let usersKnownByClient = app.usersKnownByClient;

    authUser = firebase.auth().currentUser;

    // child_added is when a new game is detected, should also fire on page refresh.
    GamesRef.on("child_added", app.GamesRefChildAddedCallback)

    // child_removed is when game is deleted. Not quite the same as when one of the players finally wins
    // (the game entity would continue to exist until one of the players actually hits the end game button)
    GamesRef.on("child_removed", function(snapshot) {
      let authUser = app.authUser;
      let game = snapshot.val();
      // console.log("game child_removed", game, "snapshot", snapshot);
      if (game.player1 === authUser.uid || game.player2 === authUser.uid) {
        // console.log("Gamed ended/canceled")
        $(".card.game").hide();
        $(".game.chat .card-footer").empty();
        $(".card#available-users").show();
        //app.gathering.leave()
        //app.gathering.join(authUser.uid, {displayName: authUser.displayName, inGame: false});
        app.gathering.updateStatus(authUser.uid, {displayName: authUser.displayName, inGame: false})
        $(".card#available-users .card-footer").text("Select a user to play!")
      }
    })

    app.gathering.onUpdated((count, users) => {
      // console.log("Received update for gathering: count", count, "users", users);
      $("#available-users .card-body").empty();
      for (let uid in users) {
        // console.log("user is ", uid, users[uid])
        let user = users[uid]
        if (uid !== app.authUser.uid) {
          $("#available-users .card-body").append(
            $("<div>").addClass("btn btn-primary user-online").data("uid", uid).text(user.displayName)
            .addClass(user.inGame ? "disabled" : "user-available")
          )
        }
      }
      $(".card#available-users .card-footer").text("Select a user to play!")
    })
  }

  MessageChildAdded(snapshot) {
    let authUser = app.authUser;
    let message = snapshot.val();
    let text = message.text;
    let opponentName = app.game.player1 !== authUser.uid ? app.game.player1Name : app.game.player2Name;
    // console.log("message", message);
    $(".game.chat .card-footer").prepend(
      $("<div>")
      .append($("<span>").addClass("playerid " + (message.playerID === authUser.uid ? "player" : "opponent"))
        .text("[" + (message.playerID === authUser.uid ? "Me" : opponentName) + "]: "))
      .append($("<span>").addClass("message-text").text(text))
    ).show();
  }

  GameInProgressChange(snapshot) {
    // console.log("/gameInProgress listener triggered, snapshot", snapshot.val())
    if (!snapshot.val()) {
      // game is over. Player possibly ended game, but possible due to player could have won/lost. check
      GamesRef.child(app.gameID).once("value", function(snapshot) {
        let game = snapshot.val();
        // console.log("game snapshot is ", game)
        if (game != null && (game.player1Won || game.player2Won)) {
          let thisPlayerWon = (game.player1Won && app.authUser.uid === game.player1) || (game.player2Won && app.authUser.uid === game.player2);
          $("#game-over-modal .modal-body").text(thisPlayerWon ? "You Won the Entire Match!!!" : "Sorry. You lose match :*(")
          $("#game-over-modal").modal("show");
          $(".btn.game-action").prop("disabled", true);
          $(".btn#end-game").text("Go Back To Opponent Selection")
        }
        GamesRef.child(app.gameID).off("value");
        GamesRef.child(app.gameID + "/gameInProgress").off("value");
      })
    }
  }

  GamesRefChildAddedCallback(snapshot) {
    // console.log("running GamesRefChildAddedCallback")
    let authUser = app.authUser;
    let game = snapshot.val();
    // New game is detected. check to see if this player is one of the game's players.
    if (game.player1 === authUser.uid || game.player2 === authUser.uid) {
      // user is one of the games's players.
      $(".btn.game-action").prop("disabled", false);
      if (app.game == null) {
        // this should only happen if the player was in middle of game and refreshed page. Recreate essential app.game data
        app.game = {}; let arr = ["player1", "player1Name", "player2", "player2Name", "maxNumberOfGames"]
        arr.forEach(key => app.game[key] = game[key])
      }
      // update gathering so that User's inGame status is set to true (prevents other players from trying to start game with player)
      app.gathering.updateStatus(authUser.uid, {displayName: authUser.displayName, inGame: true})

      // app.setGameID(snapshot.key);
      app.gameID = snapshot.key;
      GamesRef.child(app.gameID).on("value", function(snapshot) {
        // let authUser = app.authUser;
        let game = snapshot.val();
        if (game != null) {
          // console.log("game child_changed", game, "snapshot", snapshot);
          app.updateGame(game);
        }
        else {
          GamesRef.child(app.gameID).off("value");
        }
      })

      GamesRef.child(app.gameID + "/chat").on("child_added", app.MessageChildAdded)
      GamesRef.child(app.gameID + "/gameInProgress").on("value", app.GameInProgressChange)

      // update the actual rendering of the game on screen
      app.updateGame(game);
    }
    else {
      // the user for this client is not one of the players of the game. However, wait a bit (with settimeout) to try and avoid issues with incorrectly reading status of user as available or unavailable
      setTimeout(function() {
        $(".card#available-users .user-online").each(function(index) {
          // console.log("index", index)
          // console.log($(this));
          if ($(this).data("uid") === game.player1 || $(this).data("uid") === game.player2 ) {
            $(this).removeClass("user-available").addClass("disabled");
          }
        })

      }, 10);
    }

  }

  authChangeCallback(authUser) {
    if (authUser) {
      // console.log("detected change in auth user state. User is signed in.")
      // console.log("authUser: ", authUser.displayName, authUser)
      if (typeof authUser.displayName === "string") {
        // let authUser = firebase.auth().currentUser;
        // console.log("authUser: ", authUser.displayName, authUser)
        $(".card#available-users").show();
        $(".modal").modal("hide");
        $("#landing-div").hide();
        $("#logout-button").text("Logoff " + authUser.displayName)

        app.authUser = authUser;
        app.createFirebaseListeners();
        // if (app.gathering == null) {
          app.gathering = new Gathering(database, 'OnlineUsers')
        // }
        // Join gathering. This is not for a specific game, but just to keep track of users who are online.
        // app.gathering.join(firebase.auth().currentUser.uid, firebase.auth().currentUser.displayName);
        app.gathering.join(authUser.uid, {displayName: authUser.displayName, inGame: false});

      }
      else {
        // This should only run if the logged in user was just created (logged in upon registered)
        // This is because firebase does not seem to allow setting the username while registering. I set it immeediately
        // upon successful user registeration, but this listener fires before that happens. Hence, wait a bit
        // and then manullay run the callback again.

        setTimeout(function() {
          // console.log("running timout function")
          app.authChangeCallback(firebase.auth().currentUser)
        }, 100);

      }
    }
    else {
      // console.log("detected change in auth user state. User is signed out.")
      app.authUser = null;

      $("#logout-button").text("Login/Sign-Up");
      $(".card.game").hide();
      $(".card#available-users").hide();
      $("#landing-div").show();
    }
  }

  endCurrentGame(callback) {
    // console.log("end current game")
    GamesRef.child(app.gameID).remove();
    $(".btn#end-game").text("End Game")
    $(".btn.game-action").prop("disabled", false);

    //disabled the following, it allowed, for example, to start a new game immediately after end game, but might have been cause of fatal errors.
    //if (typeof callback === "function") callback(snapshot.val())

    //Removal of game should result in the app listener (Games child_removed) realizing there  is no longer a game, and reload the option to select an opponent for a new game
  }

  gameAction(event) {
    /*
    This is callback for after current user selects rock, paper, or scissors (by clicking one of the buttons)
    This has a lot of the logic of the game.
    There are two basic situations:
      One: the user selects before the opponent selects.
        In that case, user waits for opponent to select, and then the round is evaluated
      Two: the opponent had already selected and was waiting for our user to select.
        The round can be immediately evaluated.

    As far as determining who wins, both player's clients determine if they win or lose.
    They each update their own win/loss counts in firebase. The tie is only updated once, by whichever is player1
    If the current player wins the entire match, they update firebase with that info.
      The loser of the match relies on winner to update database
      At that point, the value in firebase under the game object "gameInProgress" is updated from true to false,
        which both players have listeners for that will fire.
    */
    event.preventDefault();
    let playerid = firebase.auth().currentUser.uid;
    let playerAction = $(this).val();
    // playerAction is string "rock", "paper", or "scissors"
    // now send to firebase.
    GamesRef.child(app.gameID).once('value', function(snapshot) {
      let game = snapshot.val();
      $(".btn.game-action").prop("disabled", true);
      let player = playerid === game.player1 ? "player1" : "player2";
      let opponent = playerid !== game.player1 ? "player1" : "player2";
      // GamesRef.child(app.gameID + "/" + player + "Actions").set({action: playerAction}).then(_ => {
      GamesRef.child(app.gameID).update({
        [player + "Actions"]: playerAction
      }).then(_ => {
        // this is where the app checks for (or waits for) an opponent action
        app.opponentActionListener = GamesRef.child(app.gameID + "/" + opponent + "Actions").on("value", function(snapshot) {
          // opponent action was received
          let opponentAction = snapshot.val();
          if (typeof opponentAction === "string" && opponentAction.match(/(rock|paper|scissors)/)) {
            // console.log("enabling rock/paper/scissors buttons after detecting opponent action");
            $(".btn.game-action").prop("disabled", false);
            //Now that opponent action was received, disable listener.
            GamesRef.child(app.gameID + "/" + opponent + "Actions").off();

            // Also, clear out player's own last action.
            GamesRef.child(app.gameID).update({
              [player + "Actions"]: null
            })

            // check who wins round
            let outcome = checkWin(getPlay(playerAction), getPlay(opponentAction))
            // console.log(outcome)
            if (outcome === 0) {
              // console.log("Game tied!")
              // so that only one player updates the tie count, haver player1 do it.
              if (player === "player1") {
                GamesRef.child(app.gameID).once('value', snapshot => {
                  let oldTies = snapshot.val().ties;
                  let newTies = oldTies + 1
                  GamesRef.child(app.gameID).update({
                    ties: newTies,
                  })
                })
              }

            }
            else if (outcome < 0) {
              // console.log("*You won that round")
              GamesRef.child(app.gameID).once('value', snapshot => {
                let oldWins = snapshot.val()[player + "Wins"]
                let newWins = oldWins + 1
                let playerWon = false;
                if (newWins >= Math.floor(game.maxNumberOfGames / 2) + 1) {
                  playerWon = true;
                }
                GamesRef.child(app.gameID).update({
                  [player + "Wins"]: newWins,
                  [player + "Won"]: playerWon
                })
                // console.log("playerWon", playerWon)
                if (playerWon) {
                  GamesRef.child(app.gameID).update({
                    gameInProgress: false
                  })
                }
              })
            }
            else {
              // console.log("*You lost that round")
              // score updates from other listener. The client who won the match will update the database
            }
          }
        });
      });
    })

  }

  postMessage(event) {
    // console.log("in app.postMessage")
    event.preventDefault();

    let message = $("#new-message-text").val().trim();
    if (message.length > 0) {
      $("#new-message-text").val("");
      GamesRef.child(app.gameID + "/chat").push({
        playerID: firebase.auth().currentUser.uid,
        text: message
      })

    }
    $("#new-message-text").val("");

  }

  registerNewUserClick(event) {
    event.preventDefault();
    // console.log($("#email-input").val());
    let displayName = $("#name-input").val().trim();
    let email = $("#email-input").val().trim();
    let password = $("#password-input").val().trim();
    let passwordConfirm = $("#password-confirm").val().trim();
    if (!displayName.match("[a-zA-Z]+")) {
      $("#name-input").removeClass("is-valid").addClass("is-invalid")
    }
    else {
      $("#name-input").removeClass("is-invalid")
    }
    if (!email.match("[a-zA-Z]+.*@.*[a-zA-Z]+.*[.][a-zA-Z]+")) {
      $("#email-input").addClass("is-invalid")
    }
    else {
      $("#email-input").removeClass("is-invalid")      }
    if (password.length < 6) {
      $("#password-input").removeClass("is-valid").addClass("is-invalid")

    }
    else {
      $("#password-input").removeClass("is-invalid")
    }
    if (password !== passwordConfirm) {
      $("#password-confirm").removeClass("is-valid").addClass("is-invalid")
    }
    else {
      $("#password-confirm").removeClass("is-invalid")
    }
    if (displayName.match("[a-zA-Z]+") && email.match("[a-zA-Z]+.*@.*[a-zA-Z]+.*[.][a-zA-Z]+") && password.length >= 6 && password === passwordConfirm) {
      // if (true) {
      $("#modal-registration-form .form-control").removeClass("is-invalid").addClass("is-valid");
      $("#modal-registration-form .valid-feedback").text("Registering New User. Please wait...");

      // console.log(email);
      firebase.auth().createUserWithEmailAndPassword(email, password).then(function(data) {
        // app.createFirebaseListeners();
        let authUser = firebase.auth().currentUser;
        $("#modal-registration-form .form-control").removeClass("is-invalid").addClass("is-valid");
        $("#modal-registration-form .valid-feedback").text("New User Created!");

        authUser.updateProfile({
          uid: authUser.uid,
          displayName: displayName
        })
        // .then(_ => app.onUserAuth(user));

      }).catch(function(error) {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        // console.log("had error with firebase.auth()", error)
        // $("#modal-registration-form").addClass("form-control is-invalid")
        $("#registration-feedback-div").addClass("is-invalid")
        $("#modal-registration-form .form-control").removeClass("is-valid");
        $("#registration-feedback").text(errorMessage);
        // ...
      });

      // app.createFirebaseListeners();

    }
    else {
      // console.log("Form data is invalid. Display message");
      // handled above
    }

  };

  loginViaGoogleClick(e) {
    e.preventDefault();
    console.log('trying to login via google');
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
      .then((result) => console.log('Google SignIn result:', result))
      .catch(err => console.log('Google SignIn err:', err));
  };

  loginViaFacebookClick(e) {
    e.preventDefault();
    console.log('trying to login via google');
    const provider = new firebase.auth.FacebookAuthProvider();
    firebase.auth().signInWithPopup(provider)
      .then((result) => console.log('Google SignIn result:', result))
      .catch(err => console.log('Google SignIn err:', err));
  };

  loginUserClick(event) {
    event.preventDefault();
    // console.log($("#user-email").val());
    let email = $("#user-email").val().trim();
    let password = $("#user-password").val().trim();

    if (!email.match("[a-zA-Z]+.*@.*[a-zA-Z]+.*[.][a-zA-Z]+")) {
      $("#modal-login-form .form-control").removeClass("is-valid").addClass("is-invalid");
      $("#modal-login-form .invalid-feedback").text("Email address does not appear valid.");
    }
    else if (password.length <6 ) {
      $("#modal-login-form .form-control").removeClass("is-valid").addClass("is-invalid");
      $("#modal-login-form .invalid-feedback").text("Password must be at least 6 characters.");
    }
    else {
      $("#modal-login-form .form-control").removeClass("is-invalid").addClass("is-valid");
      $("#modal-login-form .valid-feedback").text("Logging in. Please wait...");
      firebase.auth().signInWithEmailAndPassword(email, password).then(function(data) {
        // console.log("user logged in", data);
        // Don't need to do anything here. There is a separate listener that fires when a user is authenticated or deauthenticated.
        // The listener is firebase.auth().onAuthStateChanged, and it takes a callback, app.authChangeCallback
      }).catch(function(error) {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        // console.log(errorCode, errorMessage)
        $("#modal-login-form .form-control").removeClass("is-valid").addClass("is-invalid");
        $("#modal-login-form .invalid-feedback").text(errorMessage);
      });
    }
  }


  createAppEventListeners() {
    $(document).on("click", ".user-available", app.tryToStartGame);
    $(document).on("click", ".game .btn#end-game", app.endCurrentGame);
    $(document).on("click", ".game .btn.game-action", app.gameAction);
    $(document).on("click", "#new-message-send", app.postMessage);


    $("#register-button").on("click", app.registerNewUserClick)


    $("#user-signin").on("click", app.loginUserClick);
    $("#google-signin").on("click", app.loginViaGoogleClick);


    $("#logout-button").on("click", function(event) {
      // console.log("logging off")
      if ($(this).text().match("Logoff")) {
        // console.log("logging off")
        if (app.gathering && app.gathering != null) {
          app.gathering.leave();
        }
        firebase.auth().signOut().then(function() {
          app.removeFirebaseListeners()
          // Sign-out successful.
          // console.log("Sign-out successful")
        }).catch(function(error) {
          // console.log(error)
          // An error happened.
        });

      }
      else {
        $(".modal").modal("hide")
        $("#authenticate-modal").modal("show");
        // $(".card#user-signin, .card#user-create").show();

      }
    })

    // database.ref().on("value", function(snap) {
    //   // console.log(snap.val());
    //   return;
    //   // $("#click-value").text(snap.val().clickCount);
    //   recentUser = snap.val().name;
    //   recentEmail = snap.val().email;
    //   recentAge = snap.val().age;
    //   recentMessage = snap.val().message;

    //   $("#name-display").text(recentUser);
    //   $("#email-display").text(recentEmail);
    //   $("#age-display").text(recentAge);
    //   $("#comment-display").text(recentMessage);
    // }, function(err) {
    //   // console.log("error while trying to set clickCounter from firebase")
    //   // if (!recentUser) recentUser = initialUser;
    //   // if (!recentEmail) recentEmail = initialEmail;
    //   // if (!recentAge) recentAge = recentAge;
    //   // if (!recentMessage) recentMessage = initialMessage;
    // });
  }

  setGameID(id) {
    this.gameID = id;
  }

}






$(document).ready(function() {
  let app = new RPSApp("Joe", "Xena", 5);
  // $(document).popover({selector: '[rel=popover]'});

  // window.addEventListener('load', function() {
  // initApp()
  // });



})
