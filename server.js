//npm modules
const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const { v4: uuid } = require("uuid");
const fs = require("fs");

// create the server
const app = express();

// add and configure middleware
app.use(
  express.static("public"),
  bodyParser.json(),
  session({
    genid: (req) => {
      console.log(req.sessionID);
      return uuid();
    },
    secret: "my secret",
    resave: false,
    saveUninitialized: true,
  })
);

app.get("/game/new", (req, res) => {
  const gameNumber = Math.floor(Math.random() * 100000);
  const game = {
    startTime: new Date().toISOString(),
    players: [
      {
        sessionID: req.sessionID,
        number: null,
        moves: [],
      },
    ],
  };

  let data = JSON.stringify(game);
  if (!fs.existsSync("games")) {
    fs.mkdirSync("games");
  }
  fs.writeFile(`games/${gameNumber}.json`, data, () => res.end(gameNumber.toString()));
});

app.post("/game/join", (req, res) => {
  const gameNumber = req.body.number;
  let gameData = JSON.parse(fs.readFileSync(`games/${gameNumber}.json`));
  if (gameData.players.length > 1) {
    res.status(400).send("Game already has more than 1 player.");
    return;
  }
  if (gameData.players[0].sessionID === req.sessionID) {
    res.status(400).send("This player started the game. Other player must join.");
    return;
  }
  gameData.players.push({
    sessionID: req.sessionID,
    number: null,
    moves: [],
  });
  fs.writeFile(`games/${gameNumber}.json`, JSON.stringify(gameData), () => res.end("ok"));
});

app.post("/guess-number", (req, res) => {
  const gameNumber = req.body.gameNumber;
  const number = req.body.number;
  let gameData = JSON.parse(fs.readFileSync(`games/${gameNumber}.json`));
  if (gameData.players[0].sessionID === req.sessionID) {
    gameData.players[0].number = number;
  } else {
    gameData.players[1].number = number;
  }
  fs.writeFileSync(`games/${gameNumber}.json`, JSON.stringify(gameData));
  res.end("ok");
});

app.post("/opponent-joined-status", (req, res) => {
  const gameNumber = req.body.gameNumber;
  fs.readFile(`games/${gameNumber}.json`, (err, data) => {
    let gameData = JSON.parse(data);
    if (gameData.players.length == 2) {
      res.end("ok");
      return;
    }
  });
  let fileWatch = fs.watch(`games/${gameNumber}.json`, (eventType, filename) => {
    if (eventType == "change") {
      fs.readFile(`games/${gameNumber}.json`, (err, data) => {
        let gameData = JSON.parse(data);
        if (gameData.players.length == 2) {
          res.end("ok");
          fileWatch.close();
        }
      });
    }
  });
});

app.post("/opponent-number-status", (req, res) => {
  const gameNumber = req.body.gameNumber;
  fs.readFile(`games/${gameNumber}.json`, (err, data) => {
    let gameData = JSON.parse(data);
    let opponentIndex = gameData.players[0].sessionID === req.sessionID ? 1 : 0;
    if (gameData.players[opponentIndex].number != null) {
      res.end("ok");
      return;
    }
  });
  let fileWatch = fs.watch(`games/${gameNumber}.json`, (eventType, filename) => {
    if (eventType == "change") {
      fs.readFile(`games/${gameNumber}.json`, (err, data) => {
        let gameData = JSON.parse(data);
        let opponentIndex = gameData.players[0].sessionID === req.sessionID ? 1 : 0;
        if (gameData.players[opponentIndex].number != null) {
          res.end("ok");
          fileWatch.close();
        }
      });
    }
  });
});

app.post("/make-move", (req, res) => {
  const gameNumber = req.body.gameNumber;
  const tryNumber = req.body.number;
  let playerIndex;
  let gameData = JSON.parse(fs.readFileSync(`games/${gameNumber}.json`));
  if (gameData.players[0].sessionID === req.sessionID) {
    playerIndex = 0;
  } else {
    playerIndex = 1;
  }
  number = gameData.players[1 - playerIndex].number;
  bulls = getBulls(number, tryNumber);
  cows = getCows(number, tryNumber);
  gameData.players[playerIndex].moves.push({ tryNumber: tryNumber, bulls: bulls, cows: cows });
  fs.writeFile(`games/${gameNumber}.json`, JSON.stringify(gameData), () =>
    res.end(JSON.stringify({ bulls: bulls, cows: cows }))
  );
});

app.post("/wait-for-move", (req, res) => {
  const gameNumber = req.body.gameNumber;
  let opponentMovesCount;
  fs.readFile(`games/${gameNumber}.json`, (err, data) => {
    let gameData = JSON.parse(data);
    let opponentIndex = gameData.players[0].sessionID === req.sessionID ? 1 : 0;
    opponentMovesCount = gameData.players[opponentIndex].moves.length;
  });
  let fileWatch = fs.watch(`games/${gameNumber}.json`, (eventType, filename) => {
    if (eventType == "change") {
      fs.readFile(`games/${gameNumber}.json`, (err, data) => {
        let gameData = JSON.parse(data);
        let opponentIndex = gameData.players[0].sessionID === req.sessionID ? 1 : 0;
        if (gameData.players[opponentIndex].moves.length > opponentMovesCount) {
          res.end(JSON.stringify(gameData.players[opponentIndex].moves[opponentMovesCount]));
          fileWatch.close();
        }
      });
    }
  });
});

app.post("/end-game", (req, res) => {
  req.session.destroy();
  fs.unlink(`games/${req.body.gameNumber}.json`, () => res.end('ok'));
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server started.");
});

function getBulls(number, tryNumber) {
  let result = 0;
  for (let i = 0; i < 4; i++) {
    if (number.charAt(i) === tryNumber.charAt(i)) {
      result++;
    }
  }
  return result;
}

function getCows(number, tryNumber) {
  let result = 0;
  for (let i = 0; i < 4; i++) {
    if (number.includes(tryNumber.charAt(i)) && number.charAt(i) != tryNumber.charAt(i)) {
      result++;
    }
  }
  return result;
}
