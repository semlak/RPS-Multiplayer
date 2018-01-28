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

		// Will game be best 2 out of 3, 3 out of 5, ..., the maxNumberOfGames would be 3 or 5 in those cases. This value should always be odd.
		if (!maxNumberOfGames || maxNumberOfGames % 2 === 0) {
			// I plan to prevent the UI from even allowing to get here, but in case that doesn't work, throw error. I might try to change to handle in better way
			// throw "Max Number of Games must be Odd";
			maxNumberOfGames = 5;
		}
		me.maxNumberOfGames = maxNumberOfGames;

		console.log("player1Name", player1Name, "player2Name", player2Name)


        	try {
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
			})
		} catch (error) {
			console.log("error while trying to start new game")
			console.log(error)
		}

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
		if (this.gathering == null) {
			this.gathering = new Gathering(database, 'OnlineUsers')
		}
		this.opponentActionListener = null;

		// Listen for changes in authorized user state


		// this.game = new RPSGame("joe", "Xena", 5);
	}
	// onUserAuth(user) {
	// 	let key = user.uid;
	// 	UsersRef.child(key).update({
	// 		gameInProgress: false
	// 	})

	// }

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
		console.log("tryig to start game");
		let element = $(this);
		console.log("element: ", element);
		let playeruid = element.data("uid");
		let playerDisplayName = element.text();
		console.log("playeruid:", playeruid);
		let useruid = firebase.auth().currentUser.uid;
		let userDisplayname = firebase.auth().currentUser.displayName
		// app.gathering.join(firebase.auth().currentUser.uid, firebase.auth().currentUser.displayName);

		if (useruid !== playeruid) {
			app.game = new RPSGame(useruid, userDisplayname, playeruid, playerDisplayName, 5);
		}
	}

	removeFirebaseListeners() {
		// UsersRef.off("child_added");
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
				$(".game.chat .card-footer").empty();
				$(".card#available-users").show();
				//app.gathering.leave()
				//app.gathering.join(authUser.uid, {displayName: authUser.displayName, inGame: false});
				app.gathering.updateStatus(authUser.uid, {displayName: authUser.displayName, inGame: false})
				$(".card#available-users .card-footer").text("Select a user to play!")
			}
			// setTimeout(function() {
			// 	$(".card#available-users .user-online").each(function(index) {
			// 		// console.log("index", index)
			// 		// console.log($(this));
			// 		if ($(this).data("uid") === game.player1 || $(this).data("uid") === game.player2 ) {
			// 			$(this).removeClass("disabled").addClass("user-available");
			// 		}
			// 	})

			// }, 10);

		})

		app.gathering.onUpdated((count, users) => {
			console.log("Received update for gathering: count", count, "users", users);
			$("#available-users .card-body").empty();
			for (let uid in users) {
				// console.log("user is ", uid, users[uid])
				let user = users[uid]
				if (uid !== this.authUser.uid) {
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
				.text((message.playerID === authUser.uid ? "Me" : opponentName) + ": "))
			.append($("<span>").addClass("message-text").text(text))
		)

	}

	GameInProgressChange(snapshot) {
		console.log("/gameInProgress listener triggered, snapshot", snapshot.val())
		if (!snapshot.val()) {
			// game is over. Player possibly ended game, but possible due to player could have won/lost. check
			GamesRef.child(app.gameID).once("value", function(snapshot) {
				let game = snapshot.val();
				console.log("game snapshot is ", game)
				if (game != null && (game.player1Won || game.player2Won)) {
					let thisPlayerWon = (game.player1Won && app.authUser.uid === game.player1) || (game.player2Won && app.authUser.uid === game.player2);
					$("#game-over-modal .modal-body").text(thisPlayerWon ? "You Won the Entire Match!!!" : "Sorry. You lose match :*(")
					$("#game-over-modal").modal("show");
					$(".btn.game-action").prop("disabled", true);
				}
			})
		}

	}

	GamesRefChildAddedCallback(snapshot) {
		console.log("running GamesRefChildAddedCallback")
		let authUser = app.authUser;
		let game = snapshot.val();
		if (game.player1 === authUser.uid || game.player2 === authUser.uid) {
			if (app.game == null) {
				// this should only happen if the player was in middle of game and refreshed page.
				app.game = {}; let arr = ["player1", "player1Name", "player2", "player2Name", "maxNumberOfGames"]
				arr.forEach(key => app.game[key] = game[key])
			}
			app.gathering.updateStatus(authUser.uid, {displayName: authUser.displayName, inGame: true})
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
			GamesRef.child(app.gameID + "/chat").on("child_added", app.MessageChildAdded)



			console.log("adding gameInProgress listener")

			GamesRef.child(app.gameID + "/gameInProgress").on("value", app.GameInProgressChange)
			// GamesRef.child(app.gameID + "/gameInProgress").on("value", function(snapshot) {
			// 	console.log("/gameInProgress listener triggered, snapshot", snapshot.val())
			// 	if (!snapshot.val()) {
			// 		// game is over. Player possibly ended game, but possible due to player could have won/lost. check
			// 		GamesRef.child(app.gameID).once("value", function(snapshot) {
			// 			let game = snapshot.val();
			// 			console.log("game snapshot is ", game)
			// 			if (game != null && (game.player1Won || game.player2Won)) {
			// 				let thisPlayerWon = (game.player1Won && authUser.uid === game.player1) || (game.player2Won && authUser.uid === game.player2);
			// 				$("#game-over-modal .modal-body").text(thisPlayerWon ? "You Won the Entire Match!!!" : "Sorry. You lose match :*(")
			// 				$("#game-over-modal").modal("show");
			// 				$(".btn.game-action").prop("disabled", true);
			// 			}
			// 		})
			// 	}
			// })

			// UsersRef.child(authUser.uid + "/games").push({
				// gameid: snapshot.key
			// })

			app.updateGame(game);
		}
		else {
			// the user for this client is not one of the players of the game.
			console.log("detected game where user is not one of the game's two players. Disable those player's new game buttons")
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
			console.log("detected change in auth user state. User is signed in.")
			console.log("authUser: ", authUser.displayName, authUser)
			if (typeof authUser.displayName === "string") {
				// let authUser = firebase.auth().currentUser;
				// console.log("authUser: ", authUser.displayName, authUser)
				$(".card#available-users").show();
				$(".modal").modal("hide");
				$("#landing-div").hide();
				$("#logout-button").text("Logoff " + authUser.displayName)

				app.authUser = authUser;
				app.createFirebaseListeners();
				if (this.gathering == null) {
					this.gathering = new Gathering(database, 'OnlineUsers')
				}
				// Join gathering. This is not for a specific game, but just to keep track of users who are online.
				// app.gathering.join(firebase.auth().currentUser.uid, firebase.auth().currentUser.displayName);
				app.gathering.join(authUser.uid, {displayName: authUser.displayName, inGame: false});

			}
			else {
				setTimeout(function() {
					console.log("running timout function")
					app.authChangeCallback(firebase.auth().currentUser)
				}, 100);

			}
		}
		else {
			console.log("detected change in auth user state. User is signed out.")

			$("#logout-button").text("Login/Sign-Up");
			// $(".card#available-users").show();
			$(".card.game").hide();
			$(".card#available-users").hide();
			$("#landing-div").show();


			// $(".card#user-signin, .card#user-create").show();
			app.authUser = null;

			// No user is signed in.
		}
	}

	// getUsers() {
	// 	database.ref().on("Users", function(snapshot) {
	// 		console.log("snap", snapshot);
	// 		let users = snapshot.val();
	// 		console.log("users", users);
	// 	})
	// }
	endCurrentGame(callback) {
		console.log("end current game")
		GamesRef.child(app.gameID).remove();

		// GamesRef.child(app.gameID).once("value", function(snapshot) {
		// 	let game = snapshot.val();
		// 	GamesRef.child(app.gameID).remove();
		// 	if (typeof callback === "function") callback(snapshot.val())
		// })

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
		// $(document).on("click", "button#new-game-from-modal", function(e) {
		// 	e.preventDefault();
		// 	$("#game-over-modal").modal("hide");
		// 	console.log("starting new game. First end current game.");

		// 	// create callback to create new game using same info initial info as ending game
		// 	// let callback = function(game) {
		// 	// 	let player1 = game.player1;
		// 	// 	let player2 = game.player2;
		// 	// 	let player1Name = game.player1Name;
		// 	// 	let player2Name = game.player2Name;
		// 	// 	let maxNumberOfGames = game.maxNumberOfGames;
		// 	// 	let newGame = new RPSGame(player1, player1Name, player2, player2Name, maxNumberOfGames)
		// 	// 	return newGame;
		// 	// }
		// 	console.log("enabling buttons just before ending current game");

		// 	$(".btn.game-action").prop("disabled", false);

		// 	// app.endCurrentGame(callback);
		// 	app.endCurrentGame();
		// })

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
				$("#email-input").removeClass("is-invalid")			}
			if (password.length < 6) {
				$("#password-input").removeClass("is-valid").addClass("is-invalid")

			}
			else {
				$("#password-input").removeClass("is-invalid")
			}
			if (password !== passwordConfirm) {
				$("#password-confirm").removeClass("is-valid")
			}
			else {
				$("#password-confirm").removeClass("is-invalid")
			}
			if (displayName.match("[a-zA-Z]+") && email.match("[a-zA-Z]+.*@.*[a-zA-Z]+.*[.][a-zA-Z]+") && password.length >= 6 && password === passwordConfirm) {
				// if (true) {

				// console.log(email);
				firebase.auth().createUserWithEmailAndPassword(email, password).then(function(data) {
					// app.createFirebaseListeners();
					let authUser = firebase.auth().currentUser;

					authUser.updateProfile({
						uid: authUser.uid,
						displayName: displayName
					})
					// .then(_ => app.onUserAuth(user));

				}).catch(function(error) {
					// Handle Errors here.
					var errorCode = error.code;
					var errorMessage = error.message;
					console.log("had error with firebase.auth()", error)
					// $("#modal-registration-form").addClass("form-control is-invalid")
					$("#registration-feedback-div").addClass("is-invalid")
					$("#registration-feedback").text(errorMessage);
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
					// $(".modal").modal("hide");
					// app.createFirebaseListeners();
					// app.onUserAuth(data);
				}).catch(function(error) {
					// Handle Errors here.
					var errorCode = error.code;
					var errorMessage = error.message;
					console.log(errorCode, errorMessage)
					$("#modal-login-form .form-control").removeClass("is-valid").addClass("is-invalid");
					$("#login-feedback").text(errorMessage);


				});
				// app.createFirebaseListeners()

			}

		});


		$("#logout-button").on("click", function(event) {
				console.log("logging off")
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
				$(".modal").modal("hide")
				$("#authenticate-modal").modal("show");
				// $(".card#user-signin, .card#user-create").show();

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