let myBulls = 0;
let opponentBulls = 0;

function endGame(gameNumber) {
  let result;
  if (myBulls === 4 && opponentBulls !== 4) {
    result = `<span class="text-success">Ви виграли!!!</span>`;
  } else if (opponentBulls === 4 && myBulls !== 4) {
    result = `<span class="text-danger">Ви програли :(</span>`;
  } else {
    result = `<span class="text-warning">Нічия :)</span>`;
  }
  document.querySelector("#current-move-container").innerHTML = `<h3>${result}</h3>`;
  fetch("/end-game", {
    method: "POST",
    headers: { "Content-Type": "application/json;charset=utf-8" },
    body: `{"gameNumber": "${gameNumber}"}`,
  });
}

function waitForMove(gameNumber, isPlayerFirst) {
  document.querySelector("#active-move-container").style.display = "none";
  document.querySelector("#waiting-for-move-container").style.display = "block";
  fetch("/wait-for-move", {
    method: "POST",
    headers: { "Content-Type": "application/json;charset=utf-8" },
    body: `{"gameNumber": "${gameNumber}"}`,
  })
    .then((response) => {
      if (response.ok) {
        response.json().then((data) => {
          document
            .querySelector("#opponent-moves-container tbody")
            .insertAdjacentHTML(
              "beforeend",
              `<tr><td>${data.tryNumber}</td><td>${data.bulls}</td><td>${data.cows}</td></tr>`
            );
          opponentBulls = data.bulls;
          if (isPlayerFirst && (myBulls === 4 || opponentBulls === 4)) {
            endGame(gameNumber);
          } else {
            document.querySelector("#active-move-container").style.display = "block";
            document.querySelector("#waiting-for-move-container").style.display = "none";
          }
        });
      } else {
        response.text().then((text) => (document.querySelector("#current-move-container").textContent = text));
      }
    })
    .catch((error) => console.error(error));
}

function makeMove(gameNumber, isPlayerFirst) {
  document.querySelector("#current-move-container").innerHTML = `
  <div id="active-move-container">
    Baш хід:
    <div class="input-group input-group-lg pt-4">
      <input id="input-try-number" type="text" class="form-control col-2" />
      <div class="input-group-append">
        <button class="btn btn-primary" type="button" id="btn-make-move">Надіслати</button>
      </div>
    </div>
  </div>
  <div id="waiting-for-move-container">Хід суперника...<br><br><br><br></div>`;
  document.querySelector("#my-moves-container").innerHTML = `
  <div class="table-sm pt-4" style="max-width: 400px;">  
    <table class="table">
      <thead>
        <tr>
          <th scope="col">Мої ходи</th>
          <th scope="col">Бики</th>
          <th scope="col">Корови</th>
        </tr>
      </thead>
      <tbody>
      </tbody>
    </table>
  </div>`;
  document.querySelector("#opponent-moves-container").innerHTML = `
  <div class="table-sm pt-4" style="max-width: 400px;">  
    <table class="table">
      <thead>
        <tr>
          <th scope="col">Ходи суперника</th>
          <th scope="col">Бики</th>
          <th scope="col">Корови</th>
        </tr>
      </thead>
      <tbody>
      </tbody>
    </table>
  </div>`;
  if (isPlayerFirst) {
    document.querySelector("#waiting-for-move-container").setAttribute("style", "display: none;");
  } else {
    waitForMove(gameNumber, isPlayerFirst);
  }
  document.querySelector("#btn-make-move").addEventListener("click", () => {
    const number = document.querySelector("#input-try-number").value;
    fetch("/make-move", {
      method: "POST",
      headers: { "Content-Type": "application/json;charset=utf-8" },
      body: `{"number": "${number}", "gameNumber": "${gameNumber}"}`,
    })
      .then((response) => {
        if (response.ok) {
          response.json().then((data) => {
            document
              .querySelector("#my-moves-container tbody")
              .insertAdjacentHTML(
                "beforeend",
                `<tr><td>${number}</td><td>${data.bulls}</td><td>${data.cows}</td></tr>`
              );
            myBulls = data.bulls;
            if (!isPlayerFirst && (opponentBulls === 4 || myBulls === 4)) {
              endGame(gameNumber);
            } else {
              waitForMove(gameNumber, isPlayerFirst);
            }
          });
        } else {
          response.text().then((text) => (document.querySelector("#current-move-container").textContent = text));
        }
      })
      .catch((error) => console.error(error));
  });
}

function startGame(gameNumber, isNewGame) {
  document.querySelector("#start-game-container").style.display = "none";
  document.querySelector("#game-number-container").innerHTML = `<p>Номер гри: ${gameNumber}</p>`;
  document.querySelector("#guessed-number-container").innerHTML = ` 
    Загадайте, будь ласка, число:
    <div class="input-group input-group-lg pt-4">
      <input id="input-guessed-number" type="text" class="form-control col-2" />
      <div class="input-group-append">
        <button class="btn btn-primary" type="button" id="btn-guess-number">Загадати</button>
      </div>
    </div>`;
  document.querySelector("#btn-guess-number").addEventListener("click", () => {
    const number = document.querySelector("#input-guessed-number").value;
    fetch("/guess-number", {
      method: "POST",
      headers: { "Content-Type": "application/json;charset=utf-8" },
      body: `{"number": "${number}", "gameNumber": "${gameNumber}"}`,
    })
      .then((response) => {
        if (response.ok) {
          document.querySelector("#guessed-number-container").textContent = `Ваше число: ${number}`;
          if (!isNewGame) {
            return response;
          }
          document.querySelector("#current-move-container").textContent = `Суперник ще не приєднався.`;
          return fetch("/opponent-joined-status", {
            method: "POST",
            headers: { "Content-Type": "application/json;charset=utf-8" },
            body: `{"gameNumber": "${gameNumber}"}`,
          });
        } else {
          return response;
        }
      })
      .then((response) => {
        if (response.ok) {
          document.querySelector("#current-move-container").textContent = `Суперник ще не загадав число.`;
          return fetch("/opponent-number-status", {
            method: "POST",
            headers: { "Content-Type": "application/json;charset=utf-8" },
            body: `{"gameNumber": "${gameNumber}"}`,
          });
        }
        return response;
      })
      .then((response) => {
        if (response.ok) {
          makeMove(gameNumber, isNewGame);
        }
      })
      .catch((error) => console.error(error));
  });
}

document.addEventListener("DOMContentLoaded", function (event) {
  document.querySelector("#btn-new-game").addEventListener("click", () => {
    fetch("/game/new")
      .then((response) => response.text())
      .then((gameNumber) => startGame(gameNumber, true))
      .catch((error) => console.error(error));
  });

  document.querySelector("#btn-join-game").addEventListener("click", () => {
    const gameNumber = document.querySelector("#input-game-number").value;
    fetch("/game/join", {
      method: "POST",
      headers: { "Content-Type": "application/json;charset=utf-8" },
      body: `{"number": "${gameNumber}"}`,
    })
      .then((response) => {
        if (response.ok) {
          startGame(gameNumber, false);
        } else {
          response.text().then((text) => {
            document.querySelector("#game-container").textContent = text;
          });
        }
      })
      .catch((error) => {
        console.error(error);
      });
  });
});
