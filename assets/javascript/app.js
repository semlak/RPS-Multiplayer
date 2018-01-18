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

var database = firebase.database();
var UsersRef = database.ref("Users");
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
	constructor(player1, player2, maxNumberOfGames) {
		let self = this;
		this.gameID = null;

		// Will game be best 2 out of 3, 3 out of 5, ..., the maxNumberOfGames would be 3 or 5 in those cases. This value should always be odd.
		if (!maxNumberOfGames || maxNumberOfGames % 2 === 0) {
			// I plan to prevent the UI from even allowing to get here, but in case that doesn't work, throw error. I might try to change to handle in better way
			throw "Max Number of Games must be Odd";
		}
		else {
			this.maxNumberOfGames = maxNumberOfGames;
		}
		UsersRef.once('value', function(snapshot) {
			let users = snapshot.val();
			let player1Name = users[player1].displayName;
			let player2Name = users[player2].displayName;
			self.gameID = GamesRef.push({
				player1: player1,
				player2: player2,
				player1Wins: 0,
				player2Wins: 0,
				player1Name: player1Name,
				player2Name: player2Name,
				ties: 0,
				maxNumberOfGames,
				gameInProgress: true
			})

		});


	}

}



let RPSApp = class RPSApp {
	constructor() {
		app = this;
		firebase.auth().onAuthStateChanged(app.authChangeCallback);

		// this.usersKnownByClient = new Map();
		this.authUser = firebase.auth().currentUser;
		// console.log("auth user on App creation: ", this.authUser)
		// if (this.authUser != null) {
		// this.createFirebaseListeners();
		this.lastOpponentAction = null;

		this.createAppEventListeners();
		this.gathering = new Gathering(database, 'OnlineUsers')
		this.opponentActionListener = null;

		// Listen for changes in authorized user state


		// this.game = new RPSGame("joe", "Xena", 5);
	}
	onUserAuth(user) {
		let key = user.uid;
		UsersRef.child(key).update({
			gameInProgress: false
		})

	}

	updateGame(game) {
		// console.log("in updateGame(), game: ", game)

		let user = firebase.auth().currentUser;
		let opponentName = game.player1 !== user.uid ? game.player1Name : game.player2Name;
		let opponentuid = game.player1 !== user.uid ? game.player1 : game.player2;
		let opponentScore = game.player1 !== user.uid ? game.player1Wins : game.player2Wins;
		let playerScore = game.player1 === user.uid ? game.player1Wins : game.player2Wins;
		$(".card.game").show();
		$(".card#available-users").hide();
		$(".game #opponent-display-name").text(opponentName);
		$(".game #your-score").text(playerScore);
		$(".game #opponent-score").text(opponentScore);
		$(".game #ties").text(game.ties);
		// $(".btn.game-action").prop("disabled", false);

	}

	tryToStartGame(event) {
		console.log("tryig to start game");
		let element = $(this);
		console.log("element: ", element);
		let playeruid = element.data("uid");
		console.log("playeruid:", playeruid);
		let useruid = firebase.auth().currentUser.uid;
		// app.gathering.join(firebase.auth().currentUser.uid, firebase.auth().currentUser.displayName);

		if (useruid !== playeruid) {
			app.game = new RPSGame(useruid, playeruid, 5);
		}
	}

	removeFirebaseListeners() {
		UsersRef.off("child_added");
		GamesRef.off("child_removed");
		GamesRef.off("child_changed");
	}

	createFirebaseListeners() {
		let authUser = app.authUser;
		// let usersKnownByClient = app.usersKnownByClient;

		authUser = firebase.auth().currentUser;
		// if (authUser != null) {
		// 	// usersKnownByClient.set(authUser.uid, authUser.displayName);
		// 	// app.gathering.join(firebase.auth().currentUser.uid, firebase.auth().currentUser.displayName);


		// }
		GamesRef.on("child_added", app.GamesRefChildAddedCallback)

		GamesRef.on("child_removed", function(snapshot) {
			let authUser = app.authUser;
			let game = snapshot.val();
			// console.log("game child_removed", game, "snapshot", snapshot);
			if (game.player1 === authUser.uid || game.player2 === authUser.uid) {
				console.log("Gamed ended/canceled")
				$(".card.game").hide();
				$(".card#available-users").show();

			}
		})

		app.gathering.onUpdated((count, users) => {
			$("#available-users .card-body").empty();
			// console.log("gathering count", count, "users", users);
			for (let uid in users) {
				// console.log("user is ", uid, users[uid])
				if (uid !== this.authUser.uid) {
					$("#available-users .card-body").append(
						$("<div>").addClass("btn btn-primary user-online user-available").data("uid", uid).text(users[uid])
					)
				}
			}
		})

	}

	GamesRefChildAddedCallback(snapshot) {
		console.log("running GamesRefChildAddedCallback")
		let authUser = app.authUser;
		let game = snapshot.val();
		if (game.player1 === authUser.uid || game.player2 === authUser.uid) {
			console.log("enabling buttons after detecting new game");
			$(".btn.game-action").prop("disabled", false);

			app.setGameID(snapshot.key);
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

			console.log("adding chat listener")
			GamesRef.child(app.gameID + "/chat").on("child_added", function(snapshot) {
				console.log("chat child_added event triggerred", snapshot, snapshot.val())
				let message = snapshot.val();
				let text = message.text;
				let opponentName = game.player1 !== authUser.uid ? game.player1Name : game.player2Name;
				$(".game.chat .card-body").prepend($("<div>").html("<span class='playerid " + (message.playerID === authUser.uid ? "player" : "opponent") + "'>" + (message.playerID === authUser.uid ? "Me" : opponentName) + ": </span> <span class='message-text'>" + text + "<span>"))
			})

			console.log("adding gameInProgress listener")

			GamesRef.child(app.gameID + "/gameInProgress").on("value", function(snapshot) {
				console.log("/gameInProgress listener triggered, snapshot", snapshot.val())
				if (!snapshot.val()) {
					// game is over. Player possibly ended game, but possible due to player could have won/lost. check
					GamesRef.child(app.gameID).once("value", function(snapshot) {
						let game = snapshot.val();
						console.log("game snapshot is ", game)
						if (game != null && (game.player1Won || game.player2Won)) {
							let thisPlayerWon = (game.player1Won && authUser.uid === game.player1) || (game.player2Won && authUser.uid === game.player2);
							$("#game-over-modal .modal-body").text(thisPlayerWon ? "You Won the Entire Match!!!" : "Sorry. You lose match :*(")
							$("#game-over-modal").modal("show");
							$(".btn.game-action").prop("disabled", true);
						}
					})
				}
			})

			UsersRef.child(authUser.uid + "/games").push({
				gameid: snapshot.key
			})

			app.updateGame(game);
		}

	}

	authChangeCallback(user) {
		if (user) {
			console.log("detected change in auth user state. User is signed in.")
			// User is signed in.
			// $("#user-signin-card, #user-create-card").hide();
			$(".card#user-signin, .card#user-create").hide();
			$(".card#available-users").show();
			$("#logout-button").text("Logoff " + user.displayName)

			app.authUser = user;
			app.createFirebaseListeners();

			let gathering = app.gathering;
			// Join gathering. This is not for a specific game, but just to keep track of users who are online.
			app.gathering.join(firebase.auth().currentUser.uid, firebase.auth().currentUser.displayName);

		}
		else {
			console.log("detected change in auth user state. User is signed out.")

			$("#logout-button").text("Login");
			$(".card#available-users").show();
			$(".card.game").hide();
			$(".card#available-users").hide();

			// $(".card#user-signin, .card#user-create").show();
			app.authUser = null;

			// No user is signed in.
		}
	}

	getUsers() {
		database.ref().on("Users", function(snapshot) {
			console.log("snap", snapshot);
			let users = snapshot.val();
			console.log("users", users);
		})
	}
	endCurrentGame(callback) {
		console.log("end current game")
		GamesRef.child(app.gameID).once("value", function(snapshot) {
			let game = snapshot.val();
			GamesRef.child(app.gameID).remove();
			if (typeof callback === "function") callback(snapshot.val())
		})

		// this should result in the app listener realizing there  is no longer a game, and reload the option to select an opponent for a new game
	}

	gameAction(event) {
		// this is callback for after use selects rock, paper, or scissors
		event.preventDefault();
		let playerid = firebase.auth().currentUser.uid;
		let playerAction = $(this).val();
		// playerAction is string "rock", "paper", or "scissors"
		// now send to firebase.
		GamesRef.child(app.gameID).once('value', function(snapshot) {
			// console.log("playerAction snapshot", snapshot, "val", snapshot.val())
			let game = snapshot.val();
			$(".btn.game-action").prop("disabled", true);
			let player = playerid === game.player1 ? "player1" : "player2";
			let opponent = playerid !== game.player1 ? "player1" : "player2";
			// GamesRef.child(app.gameID + "/" + player + "Actions").set({action: playerAction}).then(_ => {
			GamesRef.child(app.gameID).update({
				[player + "Actions"]: playerAction
			}).then(_ => {
				// console.log("action is pushed")
				app.opponentActionListener = GamesRef.child(app.gameID + "/" + opponent + "Actions").on("value", function(snapshot) {
					// when receive update,
					// if (snapshot.key !== app.lastOpponentAction) {
					let opponentAction = snapshot.val();
					if (typeof opponentAction === "string" && opponentAction.match(/(rock|paper|scissors)/)) {
						// app.lastOpponentAction = snapshot.key;
						console.log("enabling buttons after detecting opponent action");
						$(".btn.game-action").prop("disabled", false);

						GamesRef.child(app.gameID + "/" + opponent + "Actions").off();

						GamesRef.child(app.gameID).update({
							[player + "Actions"]: null
						})
						console.log("snapshot.key", snapshot.key)
						console.log("opponentAction", opponentAction)
						let outcome = checkWin(getPlay(playerAction), getPlay(opponentAction))
						console.log(outcome)
						if (outcome === 0) {
							console.log("Game tied!")
							GamesRef.child(app.gameID).once('value', snapshot => {
								let oldTies = snapshot.val().ties;
								// console.log("oldWins", oldWins);
								let newTies = oldTies + 1
								console.log("newTies", newTies);
								GamesRef.child(app.gameID).update({
									ties: newTies,
								})
							})
						}
						else if (outcome < 0) {
							console.log("*You won that round")
							GamesRef.child(app.gameID).once('value', snapshot => {
								let oldWins = snapshot.val()[player + "Wins"]
								// console.log("oldWins", oldWins);
								let newWins = oldWins + 1
								let playerWon = false;
								if (newWins >= Math.floor(game.maxNumberOfGames / 2) + 1) {
									playerWon = true;
								}
								// console.log("newWins", newWins);
								// console.log(player + " Won?", playerWon)
								GamesRef.child(app.gameID).update({
									[player + "Wins"]: newWins,
									[player + "Won"]: playerWon

								})
								console.log("playerWon", playerWon)
								if (playerWon) {
									GamesRef.child(app.gameID).update({
										gameInProgress: false
									})

								}
							})
						}
						else {
							console.log("*You lost that round")
							// The client who won the match will  update the database
							// console.log("\n\n\n\n****** You lost ******")

						}

					}
					// console.log("opponentActions", opponentActions);
					// let opponentAction = opponentActions[opponentActions.length - 1]

				});


			});

			// gameid: snapshot.key
		})

	}

	postMessage(event) {
		console.log("in app.postMessage")
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

	createAppEventListeners() {
		$(document).on("click", ".user-available", app.tryToStartGame);
		$(document).on("click", ".game .btn#end-game", app.endCurrentGame);
		$(document).on("click", ".game .btn.game-action", app.gameAction);
		$(document).on("click", "#new-message-send", app.postMessage);
		$(document).on("click", "button#new-game-from-modal", function(e) {
			e.preventDefault();
			console.log("starting new game");

			$("#game-over-modal").modal("hide");
			// create callback to create new game using same info initial info as ending game
			let callback = function(game) {
				let newGame = new RPSGame(game.player1, game.player2, game.maxNumberOfGames)
				return newGame;
			}
			console.log("enabling buttons just before ending current game");

			$(".btn.game-action").prop("disabled", false);

			app.endCurrentGame(callback);
		})

		// $("button#new-game-from-modal").on("click", function(e) {
		// 	e.preventDefault();
		// 	console.log("starting new game");

		// 	$("#game-over-modal").modal("hide");
		// })

		$("#add-user").on("click", function(event) {
			// Don't refresh the page!
			// console.log("detected click");
			event.preventDefault();
			// console.log($("#email-input").val());
			let displayName = $("#name-input").val().trim();
			let email = $("#email-input").val().trim();
			let password = $("#password-input").val().trim();
			let passwordConfirm = $("#password-confirm").val().trim();

			if (displayName.match("[a-zA-Z]+") && email.match("[a-zA-Z]+.*@.*[a-zA-Z]+.*[.][a-zA-Z]+") && password === passwordConfirm) {
				// if (true) {

				// console.log(email);
				firebase.auth().createUserWithEmailAndPassword(email, password).then(function(data) {
					// app.createFirebaseListeners();
					let user = firebase.auth().currentUser;

					user.updateProfile({
						uid: user.uid,
						displayName: displayName
					}).then(_ => app.onUserAuth(user));

				}).catch(function(error) {
					// Handle Errors here.
					var errorCode = error.code;
					var errorMessage = error.message;
					console.log("had error with firebase.auth()", error)
					// ...
				});

				// app.createFirebaseListeners();

			}
			else {
				console.log("Form data is invalid. Display message");
			}

		});

		$("#user-signin").on("click", function(event) {
			// Don't refresh the page!
			// console.log("detected click");
			event.preventDefault();
			// console.log($("#user-email").val());
			let email = $("#user-email").val().trim();
			let password = $("#user-password").val().trim();

			if (email.length > 0 && password.length > 0) {

				// console.log(email);
				firebase.auth().signInWithEmailAndPassword(email, password).then(function(data) {
					console.log("user logged in", data);
					// app.createFirebaseListeners();
					// app.onUserAuth(data);
				}).catch(function(error) {
					// Handle Errors here.
					var errorCode = error.code;
					var errorMessage = error.message;


				});
				// app.createFirebaseListeners()

			}

		});


		$("#logout-button").on("click", function(event) {
			if ($(this).text().match("Logoff")) {
				console.log("logging off")
				if (app.gathering) {
					app.gathering.leave();
				}

				firebase.auth().signOut().then(function() {
					app.removeFirebaseListeners()
					// Sign-out successful.
					console.log("Sign-out successful")
				}).catch(function(error) {
					console.log(error)
					// An error happened.
				});

			}
			else {
				$(".card#user-signin, .card#user-create").show();

			}
		})

		// database.ref().on("value", function(snap) {
		// 	console.log(snap.val());
		// 	return;
		// 	// $("#click-value").text(snap.val().clickCount);
		// 	recentUser = snap.val().name;
		// 	recentEmail = snap.val().email;
		// 	recentAge = snap.val().age;
		// 	recentMessage = snap.val().message;

		// 	$("#name-display").text(recentUser);
		// 	$("#email-display").text(recentEmail);
		// 	$("#age-display").text(recentAge);
		// 	$("#comment-display").text(recentMessage);
		// }, function(err) {
		// 	console.log("error while trying to set clickCounter from firebase")
		// 	// if (!recentUser) recentUser = initialUser;
		// 	// if (!recentEmail) recentEmail = initialEmail;
		// 	// if (!recentAge) recentAge = recentAge;
		// 	// if (!recentMessage) recentMessage = initialMessage;
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