const theme = "animal"
const initilGifLimit = 10;

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

// function for getting somewhat random color. Used to make image tiles look pretty while loading
// Function will not same color twice i n a row
let previousColor = null;
let colors = ["#77B300", "#9933CC", "#CC0000", "#3366cc", "#F5E625", "#FF8C00", "#00FFFF", "#FF1493"];

let randomColor = function() {
	let filteredColors = colors.filter(color => color !== previousColor);
	previousColor = filteredColors[Math.floor(Math.random() * filteredColors.length)]
	return previousColor;
};


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







var app = null;

let RPSApp = class RPSApp {
	constructor() {
		this.gamme = new RPSGame("joe", "Xena", 5);
	}

}






const GamePlay = {
	ROCK: 1,
	PAPER: 2,
	SCISSORS: 3
}






let RPSGame = class RPSGame {
	constructor(player1, player2, maxNumberOfGames) {
		this.player1 = player1;
		this.player2 = player2;
		this.player1Wins = 0;
		this.player1Losses = 0;
		this.player2Wins = 0;
		this.player2Losses = 0;
		this.ties = 0;


		// Will game be best 2 out of 3, 3 out of 5, ..., the maxNumberOfGames would be 3 or 5 in those cases. This value should always be odd.
		if (!maxNumberOfGames || maxNumberOfGames % 2 === 0) {
			// I plan to prevent the UI from even allowing to get here, but in case that doesn't work, throw error. I might try to change to handle in better way
			throw "Max Number of Games must be Odd";
		}
		else {
			this.maxNumberOfGames = maxNumberOfGames;
		}

		this.player1LastPlay = undefined;
		this.player1CurrentPlay = undefined;
		this.player2LastPlay = undefined;
		this.player2CurrentPlay = undefined;
		this.createFirebaseListeners();
		this.createAppEventListeners();

	}

	createFirebaseListeners() {
		database.ref().on("child_added", function(snapshot) {
			let user= snapshot.val()
			console.log("hey", user)
			// return;
			// let monthsWorked = Math.abs(moment(employee.startDate).diff(moment(), "months"))

			$("#user-table-body").append(
				$("<tr>").html("<td>" +user.name + "</td><td>" +
					"Online" + "</td>"
					// employee.role + "</td><td>" +
					// employee.startDate + "</td><td>" +
					// monthsWorked + "</td><td>"
				)
			)
		})



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

	createAppEventListeners() {
		$("#add-user").on("click", function() {
			// Don't refresh the page!
			console.log("detected click");
			event.preventDefault();



			// YOUR TASK!!!

			// Code in the logic for storing and retrieving the most recent user.

			// Don't forget to provide initial data to your Firebase database.
			console.log($("#email-input").val());
			let formName = $("#email-input").val().trim();
			let password = $("#password-input").val().trim();
			let passwordConfirm = $("#password-confirm").val().trim();

			// if (password === passwordConfirm && formName.match("[a-zA-Z]+")) {
			if (true) {

				console.log(formName);
				firebase.auth().createUserWithEmailAndPassword(formName, password).catch(function(error) {
				  // Handle Errors here.
				  var errorCode = error.code;
				  var errorMessage = error.message;
				  // ...
				});


			}
			// let formEmail = $("#email-input").val().trim();
			// let formAge = $("#age-input").val().trim();
			// let formMessage = $("#comment-input").val().trim();
			// database.ref().push({
			// 	name: formName
			// });

		});

		$("#logout-button").on("click", function() {
			firebase.auth().signOut().then(function() {
			  // Sign-out successful.
			}).catch(function(error) {
			  // An error happened.
			});
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
}




$("#options-submit").on("click", function(e) {
	e.preventDefault();
	var val = $("#rangeinput").val();
	app.gifLimit = val;
	$("#optionsModal").modal("hide");
})

$(document).ready(function() {
	app = new RPSApp("Joe", "Xena", 5);
	// $(document).popover({selector: '[rel=popover]'});

	// window.addEventListener('load', function() {
	// initApp()
	// });



})