let express = require('express');
let ap = express();
let db = require('mysql');
let http = require('http');
let WebSocker = require('ws');
let bodyParser = require('body-parser');
let server = http.createServer(ap);

let wss = new WebSocker.Server({ server });

ap.use(express.static('.'));
ap.use(bodyParser.urlencoded({ extended: true }));
ap.use(bodyParser.json());

var connection_db = db.createConnection({
    host: "localhost",
    user: "laba",
    password: "admin",
    database: "archive"
});

let size = 10;

let directions = [[0, -1], [0, 1], [1, 0], [-1, 0], [1, -1], [1, 1], [-1, -1], [-1, 1]]


connection_db.connect(function (error) {
    if (error) {
        console.log(error);
        return;
    }
    console.log("Connection to database established succesfuly");
});


let clients = []

let turn;
let moves;
let first_move;

let field;
let start_date;

wss.on('connection', function connection(ws, req) {

    clients.push(ws);

    ws.on('message', function incoming(message) {


        let index = clients.findIndex(function (item) { return item === ws });
        if (turn != index) {
            ws.send(JSON.stringify({ error: true }));
            return;
        }

        let data = JSON.parse(message);

        if (first_move[index]) {
            first_move[index] = false;
        }

        if (field[data.point.x][data.point.y] == 2 - index) {
            field[data.point.x][data.point.y] = 3 + index;
        } else {
            field[data.point.x][data.point.y] = 1 + index;
        }

        let [update_insert_data_first, update_insert_data_second] = InsertUpdate([data.point.x, data.point.y], field, index);
        if (field[data.point.x][data.point.y] === 1 + index) {
            update_insert_data_first.push([data.point.x, data.point.y, 1]);
            update_insert_data_second.push([data.point.x, data.point.y, 2]);
        } else if (field[data.point.x][data.point.y] === 3 + index) {
            update_insert_data_first.push([data.point.x, data.point.y, 3]);
            update_insert_data_second.push([data.point.x, data.point.y, 4]);
        }

        moves[index] -= 1;
        let turn_conitued = true;
        if (moves[index] == 0) {
            moves[1 - index] = 3;
            turn_conitued = false;
            turn = 1 - index;
            let [update_remove_data_first, update_remove_data_second] = RemoveUpdate(field, index);
            update_insert_data_first = update_insert_data_first.concat(update_remove_data_first);
            update_insert_data_second = update_insert_data_second.concat(update_remove_data_second);
        }

        let game_ended = false;
        let winner;

        if (!first_move[1 - index]) {
            if (moves[index] > 0) {
                game_ended = IsGameFinished(field, index);
                winner = 1 - index;
            }
            else {
                game_ended = IsGameFinished(field, 1 - index);
                winner = index;
            }
        }


        ws.send(JSON.stringify({
            game_started: true,
            points: update_insert_data_first,
            turn: turn_conitued,
            moves: moves[index],
            game_ended: game_ended,
            winner: (index == winner)
        }));

        clients[1 - index].send(JSON.stringify({
            game_started: true,
            points: update_insert_data_second,
            turn: !turn_conitued,
            moves: moves[1 - index],
            game_ended: game_ended,
            winner: (1 - index == winner)
        }));

        if (game_ended) {
            clients[0].close();
            clients[1].close();
            clients = [];
            let end_date = new Date();
            let result = (winner == 0) ? "Victory" : "Defeat";

            connection_db.query("INSERT INTO `archive`.`game` (`date`, `durab`, `result`) VALUES (?, ?, ?);",
                [start_date, Math.round((end_date - start_date) / 1000), result],
                function (error) {
                    if (error) {
                        console.log(error);
                        return;
                    }
                });
        }

    });


    if (clients.length == 2) {
        field = [];
        for (i = 0; i < size; i++) {
            field[i] = new Array(size).fill(0);
        }

        clients[0].send(JSON.stringify({
            game_started: false,
            turn: true,
            id: 0
        }));
        clients[1].send(JSON.stringify({
            game_started: false,
            turn: false,
            id: 1
        }));
        start_date = new Date();
        moves = new Array(2).fill(3);
        first_move = new Array(2).fill(true);
        turn = 0;
    }
    else if (clients.length == 1) { }
    else {
        alert("В игре может быть не больше 2 человек");
    }

});

function RemoveUpdate(array, type) { // type is index in clients array
    let visited = [];
    let result_for_first = [],
        result_for_second = [];
    for (i = 0; i < size; i++) {
        visited[i] = new Array(size).fill(false);
    }

    for (i = 0; i < size; i++) {
        for (j = 0; j < size; j++) {
            if (!visited[i][j] && array[i][j] === 2 - type) {
                queue = [];
                queue.push([i, j]);
                visited[i][j] = true;
                while (queue.length) {
                    let currnet_node = queue.shift();
                    for (const direction of directions) {
                        let next_node = [currnet_node[0] + direction[0], currnet_node[1] + direction[1]];
                        if (next_node[0] >= 0 && next_node[0] < size && next_node[1] >= 0 && next_node[1] < size) {
                            if (!visited[next_node[0]][next_node[1]]) {
                                if (array[next_node[0]][next_node[1]] === 2 - type || array[next_node[0]][next_node[1]] === 4 - type || array[next_node[0]][next_node[1]] === 6 - type) {
                                    visited[next_node[0]][next_node[1]] = true;
                                    queue.push(next_node);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    for (i = 0; i < size; i++) {
        for (j = 0; j < size; j++) {
            if (!visited[i][j] && array[i][j] == 4 - type) {
                array[i][j] = 6 - type;
                result_for_first.push([i, j, 6]);
                result_for_second.push([i, j, 5]);
            }
        }
    }

    return [result_for_first, result_for_second];

}

function IsGameFinished(array, type) {
    for (i = 0; i < size; i++) {
        for (j = 0; j < size; j++) {
            if (array[i][j] == 1 + type || array[i][j] == 3 + type) {
                for (const direction of directions) {
                    let next_node = [i + direction[0], j + direction[1]];
                    if (next_node[0] >= 0 && next_node[0] < size && next_node[1] >= 0 && next_node[1] < size) {
                        if (array[next_node[0]][next_node[1]] == 0 || array[next_node[0]][next_node[1]] == 2 - type) {
                            return false;
                        }
                    }
                }
            }
        }
    }
    return true;
}

function InsertUpdate(node, array, type) {
    let visited = [];
    let result_for_first = [],
        result_for_second = [];
    for (i = 0; i < size; i++) {
        visited[i] = new Array(size).fill(false);
    }
    visited[node[0]][node[1]] = true;
    queue = []
    queue.push(node);
    while (queue.length > 0) {
        let currnet_node = queue.shift();
        for (const direction of directions) {
            let next_node = [currnet_node[0] + direction[0], currnet_node[1] + direction[1]];
            if (next_node[0] >= 0 && next_node[0] < size && next_node[1] >= 0 && next_node[1] < size) {
                if (!visited[next_node[0]][next_node[1]] && array[next_node[0]][next_node[1]] === 5 + type) {
                    visited[next_node[0]][next_node[1]] = true;
                    array[next_node[0]][next_node[1]] = 3 + type;
                    queue.push(next_node);
                    result_for_first.push([next_node[0], next_node[1], 3]);
                    result_for_second.push([next_node[0], next_node[1], 4]);
                }
            }
        }
    }
    return [result_for_first, result_for_second];
}

let fs = require('fs');
ap.get("/", function (req, res) {
    var html = fs.readFileSync('./view/index.html');
    res.end(html);
});


ap.get("/get_archive", function (req, res) {
    connection_db.query("SELECT * FROM archive.game;", function (error, rows) {
        if (error) {
            console.log(error);
            return;
        }
        res.end(JSON.stringify(rows));
    });
})


server.listen(8080);
ap.listen(3000, function(error) {
    if (error) {
        console.log(error);
        return;
    }
    console.log("Server is listening on port 3000");
});
