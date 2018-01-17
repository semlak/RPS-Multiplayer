"use strict";



function shuffleArray(arr) {
	// returns a shuffled version of the array. Does not alter the input array
	// Tries to implement the Knuth Shuffle.
	function randomUpToN(n) {
		// does not return n, but numbers between 0 and n-1
		return (Math.floor(Math.random() * n));
	}

	function swapArrayElements(arr, i, j) {
		// swaps  the elements i and j or arr. Does  not return anything. It alters input array.
		if (i !== j) {
			let t = arr[i];
			arr[i] = arr[j];
			arr[j] = t;
		}
	}

	// clone the array
	var outputArr = arr.slice(0);
	let n = arr.length;
	for (let i = 0; i < n - 1; i++) {
		let j = randomUpToN(n - i);
		// swap element i with the element at (i+j). max i+j value is i + (n-i) - 1 = n - 1

		swapArrayElements(outputArr, i, i + j)
		// console.log(outputArr)
	}
	return outputArr;
}



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
		// this.player1 = player1;
		// this.player2 = player2;
		// this.player1Wins = 0;
		// this.player1Losses = 0;
		// this.player2Wins = 0;
		// this.player2Losses = 0;
		// this.ties = 0;
		this.gameID = null;


		// Will game be best 2 out of 3, 3 out of 5, ..., the maxNumberOfGames would be 3 or 5 in those cases. This value should always be odd.
		if (!maxNumberOfGames || maxNumberOfGames % 2 === 0) {
			// I plan to prevent the UI from even allowing to get here, but in case that doesn't work, throw error. I might try to change to handle in better way
			throw "Max Number of Games must be Odd";
		}
		else {
			this.maxNumberOfGames = maxNumberOfGames;
		}
		// this.player1LastPlay = undefined;
		// this.player1CurrentPlay = undefined;
		// this.player2LastPlay = undefined;
		// this.player2CurrentPlay = undefined;
		// console.log("player1: ", player1, "player2", player2)
		UsersRef.once('value', function(snapshot) {
			// console.log("snapshot", snapshot, snapshot.val());
			let users = snapshot.val();
			let player1Name = users[player1].displayName;
			let player2Name = users[player2].displayName;
			GamesRef.push({
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
		this.usersKnownByClient = new Map();
		this.authUser = firebase.auth().currentUser;
		// console.log("auth user on App creation: ", this.authUser)
		// if (this.authUser != null) {
		this.createFirebaseListeners();
		this.lastOpponentAction = null;

		// }
		this.createAppEventListeners();
		this.gathering = new Gathering(database, 'OnlineUsers')
		this.opponentActionListener = null;
		this.gathering.onUpdated((count, users) => {
			$("#user-table-body").empty();
			// console.log("gathering count", count, "users", users);
			for (let uid in users) {
				// console.log("user is ", uid, users[uid])
				if (uid !== this.authUser.uid) {
					$("#user-table-body").append(
						$("<tr>").html("<td class='btn btn-primary' data-uid='" + uid + "'>" + users[uid] + "</td>"
							// + "<td>" + (user.online ? "Online" : "Offline") + "</td>"
							// + "<td>" + (user.gameInProgress ? "In Game" : "Not in Game") + "</td>"
							// employee.role + "</td><td>" +
							// employee.startDate + "</td><td>" +
							// monthsWorked + "</td><td>"
						)
						// .addClass(user.online ? "user-online" : "").addClass(user.gameInProgress ? "user-in-game" : "user-available")
						.addClass("user-online user-available")
						// .attr("data-uid", uid)
					)
				}
			}
		})

		// this.game = new RPSGame("joe", "Xena", 5);
	}
	onUserAuth(user) {
		console.log("in onUserAuth", user, user.displayName)
		// database.ref("Users\/user.displayName").set({
		// 	online: true,

		// });
		let userInfo = {
			displayName: user.displayName,
			uid: user.uid,
			online: true,
			gameInProgress: false
		}
		let key = user.uid;
		console.log("adding userInfo", userInfo);
		UsersRef.child(key).set({
			displayName: user.displayName,
			uid: user.uid,
			online: true,
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
		// console.log("tryig to start game");
		let element = $(this);
		// console.log("element: ", element);
		let playeruid = element.data("uid");
		// console.log("playeruid:", playeruid);
		let useruid = firebase.auth().currentUser.uid;
		// app.gathering.join(firebase.auth().currentUser.uid, firebase.auth().currentUser.displayName);

		if (useruid !== playeruid) {
			app.game = new RPSGame(useruid, playeruid, 5);
		}
	}

	createFirebaseListeners() {
		// console.log("app: ", app);
		// console.log("app.game", app.game);
		let authUser = app.authUser;
		let usersKnownByClient = app.usersKnownByClient;

		authUser = firebase.auth().currentUser;
		if (authUser != null) {
			usersKnownByClient.set(authUser.uid, authUser.displayName);
			// app.gathering.join(firebase.auth().currentUser.uid, firebase.auth().currentUser.displayName);


		}
		UsersRef.on("child_added", function(snapshot) {
			authUser = firebase.auth().currentUser;
			if (authUser != null) {
				// app.gathering.join(firebase.auth().currentUser.uid, firebase.auth().currentUser.displayName);
			}

			let user = snapshot.val()
			// console.log("Users child_added", user, "authUser", authUser.uid)
			usersKnownByClient.set(user.uid, user.displayName);
			// return;
			// let monthsWorked = Math.abs(moment(employee.startDate).diff(moment(), "months"))
			// if (authUser != null && !usersKnownByClient.has(user.uid) && user.uid !== authUser.uid) {
			if (authUser != null && user.uid !== authUser.uid) {
				// if (true) {
				$("#user-table-body").append(
					$("<tr>").html("<td class='btn btn-primary' data-uid='" + user.uid + "'>" + user.displayName + "</td>" +
						"<td>" + (user.online ? "Online" : "Offline") + "</td>" +
						"<td>" + (user.gameInProgress ? "In Game" : "Not in Game") + "</td>"
						// employee.role + "</td><td>" +
						// employee.startDate + "</td><td>" +
						// monthsWorked + "</td><td>"
					).addClass(user.online ? "user-online" : "").addClass(user.gameInProgress ? "user-in-game" : "user-available")
					.attr("data-uid", user.uid)
				)

			}
		})

		GamesRef.on("child_added", function(snapshot) {
			authUser = app.authUser;
			let game = snapshot.val();
			// console.log("game child_added", game, "snapshot", snapshot);
			// app.updateGame(game);
			// debugger
			// app.game.gameID = game.id
			if (game.player1 === authUser.uid || game.player2 === authUser.uid) {
				// game.id = snapshot.id;
				// if (typeof game.id !== "string") {
				// console.log("trying to update game id for ", snapshot.key)
				// GamesRef.child(snapshot.key).update({
				// 	id: snapshot.key
				// }).then(game => {
				// 	$(".card.game").show();
				// 	app.updateGame(game)
				// }
				app.setGameID(snapshot.key);
				GamesRef.child(app.gameID + "/chat").on("child_added", function(snapshot) {
					let message = snapshot.val();
					let text = message.text;
					let opponentName = game.player1 !== authUser.uid ? game.player1Name : game.player2Name;
					// console.log("message.text: ", text);
					$(".game.chat .card-body").prepend($("<div>").html("<span class='playerid " + (message.playerID === authUser.uid ? "player" : "opponent") + "'>" + (message.playerID === authUser.uid ? "Me" : opponentName) + ": </span> <span class='message-text'>" + text + "<span>"))
					// $(".game.chat .card-body").prepend($("<p>").html( message.text  ))
				})

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
							}
						})
					}
				})
				// GamesRef.child(app.gameID + "/player1Won").on("value", function(snapshot) {
				// 	// console.log  ("in player1Won listener, value", snapshot.val())
				// 	if (snapshot.val()) {
				// 		$("#game-over-modal .modal-body").text("You Won the Entire Match!!!")
				// 		$("#game-over-modal").modal("show");
				// 		console.log("\n\n\n\n****** Player1 won entire match ******")
				// 		// console.log("player1 Won entire match!!")

				// 	}
				// })
				// GamesRef.child(app.gameID + "/player2Won").on("value", function(snapshot) {
				// 	// console.log  ("in player2Won listener, value", snapshot.val())
				// 	if (snapshot.val()) {
				// 		$("#game-over-modal .modal-body").text("Sorry. You lose match :*(")

				// 		$("#game-over-modal").modal("show");

				// 		console.log("\n\n\n\n****** Player2 won entire match ******")
				// 		// console.log("player2 Won entire match!!")
				// 	}
				// })


				UsersRef.child(authUser.uid + "/games").push({
					gameid: snapshot.key
				})
				// UsersRef.child(game.player2 + "/games").push({
				// 	gameid: snapshot.key
				// })
				// app.updateGame(game)
				// }
				// else {
				// $(".card.game").show();
				app.updateGame(game);
				// }
				// this newly added game is a game for our player! Show the player the game interface.
				// app.currentGameID = game.
			}
		});

		GamesRef.on("child_removed", function(snapshot) {
			authUser = app.authUser;
			let game = snapshot.val();
			// console.log("game child_removed", game, "snapshot", snapshot);
			if (game.player1 === authUser.uid || game.player2 === authUser.uid) {
				console.log("Gamed ended/canceled")
				$(".card.game").hide();
				$(".card#available-users").show();

			}
		})

		GamesRef.on("child_changed", function(snapshot) {
			authUser = app.authUser;
			let game = snapshot.val();
			// console.log("game child_changed", game, "snapshot", snapshot);
			app.updateGame(game);
		})


		// Listen for changes in authorized user state
		firebase.auth().onAuthStateChanged(function(user) {
			if (user) {
				console.log("detected change in auth user state. User is signed in.")
				// User is signed in.
				$("#user-signin-card, #user-create-card").hide();
				$(".card#available-users").show();
				$("#logout-button").text("Logoff " + user.displayName)

				app.authUser = user;
				let gathering = app.gathering;
				// gathering.
				app.gathering.join(firebase.auth().currentUser.uid, firebase.auth().currentUser.displayName);


			}
			else {
				console.log("detected change in auth user state. User is signed out.")

				$("#logout-button").text("Login");
				// $(".card#user-signin, .card#user-create").show();
				app.authUser = null;

				// No user is signed in.
			}
		});
		// firebase.auth().user().onCreate(function(event) {
		// 	console.log("user created", event)
		// })



		// database.ref().on("value", function(snapshot) {
		// 	console.log("received change for value", snapshot.val())
		// 	// If Firebase has a highPrice and highBidder stored (first case)
		// 	if (snapshot.child("highBidder").exists() && snapshot.child("highPrice").exists()) {

		// 		// Set the variables for highBidder/highPrice equal to the stored values in firebase.
		// 		highPrice = snapshot.val().highPrice;
		// 		highBidder = snapshot.val().highBidder;

		// 		// highBidder = ...


		// 		// Change the HTML to reflect the stored values
		// 		// $("#highest-price").text(highPrice);
		// 		// $('#highest-bidder').text(highBidder);

		// 	}
		// })

	}
	getUsers() {
		database.ref().on("Users", function(snapshot) {
			console.log("snap", snapshot);
			let users = snapshot.val();
			console.log("users", users);
		})
	}
	endCurrentGame() {
		console.log("end current game")
		GamesRef.child(app.gameID).remove();
		// this should result in the app listener realizing there  is no longer a game, and reload the option to select an opponent for a new game
	}

	gameAction(event) {
		event.preventDefault();
		let gameAction = $(this).val();
		console.log("gameAction", gameAction);
		let playerid = firebase.auth().currentUser.uid;
		// UsersRef.get(player);

		GamesRef.child(app.gameID).once('value', function(snapshot) {
			console.log("gameAction snapshot", snapshot)
			let game = snapshot.val();
			$(".btn.game-action").prop("disabled", true);
			let player = playerid === game.player1 ? "player1" : "player2";
			let opponent = playerid !== game.player1 ? "player1" : "player2";
			// GamesRef.child(app.gameID + "/" + player + "Actions").set({action: gameAction}).then(_ => {
			GamesRef.child(app.gameID).update({
				[player + "Actions"]: gameAction
			}).then(_ => {
				console.log("action is pushed")
				app.opponentActionListener = GamesRef.child(app.gameID + "/" + opponent + "Actions").on("value", function(snapshot) {
					// when receive update,
					// if (snapshot.key !== app.lastOpponentAction) {
					let opponentAction = snapshot.val();
					if (typeof opponentAction === "string" && opponentAction.match(/(rock|paper|scissors)/)) {
						// app.lastOpponentAction = snapshot.key;
						$(".btn.game-action").prop("disabled", false);

						GamesRef.child(app.gameID + "/" + opponent + "Actions").off();

						GamesRef.child(app.gameID).update({
							[player + "Actions"]: null
						})
						console.log("snapshot.key", snapshot.key)
						console.log("opponentAction", opponentAction)
						let outcome = checkWin(getPlay(gameAction), getPlay(opponentAction))
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
								console.log("playerWon" , playerWon)
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

	}

	createAppEventListeners() {
		$(document).on("click", ".user-available .btn", app.tryToStartGame);
		$(document).on("click", ".game .btn#end-game", app.endCurrentGame);
		$(document).on("click", ".game .btn.game-action", app.gameAction);
		$(document).on("click", "#new-message-send", app.postMessage);
		$(document).on("click", "button#new-game-from-modal", function(e) {
			e.preventDefault();
			console.log("starting new game");

			$("#game-over-modal").modal("hide");
			app.endCurrentGame();
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
						displayName: displayName
					}).then(_ => app.onUserAuth(user));

				}).catch(function(error) {
					// Handle Errors here.
					var errorCode = error.code;
					var errorMessage = error.message;
					console.log("had error with firebase.auth()", error)
					// ...
				});

				app.createFirebaseListeners();

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
					app.onUserAuth(data);
				}).catch(function(error) {
					// Handle Errors here.
					var errorCode = error.code;
					var errorMessage = error.message;


				});
				app.createFirebaseListeners()

			}

		});


		$("#logout-button").on("click", function(event) {
			if ($(this).text().match("Logoff")) {
				console.log("logging off")
				if (app.gathering) {
					app.gathering.leave();
				}

				firebase.auth().signOut().then(function() {
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