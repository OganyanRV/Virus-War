var socket = new WebSocket("ws://localhost:8080/ws");

let turn = false;
let is_first_turn = true;
let is_first = false;
let moves = 3;
let cell_states = new Array(6);
let size = 10;

let directions = [[0, -1], [0, 1], [1, 0], [-1, 0], [1, -1], [1, 1], [-1, -1], [-1, 1]]

socket.onopen = function () {
    CreateField();
}

let field;

socket.onmessage = function (message) {
    let data = JSON.parse(message.data);
    let status = document.getElementById('Status');
    if (!data.game_started) {        
        let field_image = document.getElementById('playground');
        field_image.style.visibility = 'visible';
        if (data.turn) {
            status.innerText = `Ваш ход. Вирусов осталось: ${moves}`;
        } else {
            status.innerText = `Ход противника.`
        }        
        turn = data.turn;
        is_first = data.turn;
        if (data.turn) {
            cell_states[0] = 'red_virus.png';
            cell_states[1] = 'blue_virus.png';
            cell_states[2] = 'red_wall.png';
            cell_states[3] = 'blue_wall.png';

            cell_states[4] = 'red_wall_b.png';
            cell_states[5] = 'blue_wall_b.png';
        } else {
            cell_states[0] = 'blue_virus.png';
            cell_states[1] = 'red_virus.png';
            cell_states[2] = 'blue_wall.png';
            cell_states[3] = 'red_wall.png';

            cell_states[4] = 'blue_wall_b.png';
            cell_states[5] = 'red_wall_b.png';
        }
        field = [];
        moves = 3;
        for (i = 0; i < size; i++) {
            field[i] = new Array(size).fill(0);
        }
    } else {
        let data = JSON.parse(message.data);
        if (data.error) {
            alert("Неправильный ход");
        } else {
            for (const cell of data.points) {
                field[cell[0]][cell[1]] = cell[2];
                let cell_image = document.getElementById(`${cell[0]}_${cell[1]}`)
                cell_image.src = `/images/` + cell_states[cell[2] - 1];
            }
            moves = data.moves;
            turn = data.turn;
            if (data.turn) {
                status.innerText = `Ваш ход. Вирусов осталось: ${moves}`;
            } else {
                status.innerText = `Ход противника.`
            }
            if (data.game_ended) {
                if (data.winner) {
                    alert("Поздравляем! Вы победили");
                } else {
                    alert("К сожалению, Вы проиграли");
                }
                window.location.href = "index.html";
            }
        }

    }

}

socket.onerror = function (error) {
    alert("Произошла ошибка" + error.data);
}

function CreateField() {
    let wrapper = document.getElementById('playground');
    wrapper.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    wrapper.style.gridTemplateRows = `repeat(${size}, 1fr)`;
    let buffer = ``;
    for (i = 0; i < size; i++) {
        for (j = 0; j < size; j++) {
            buffer +=
                `<div class='cell' onclick='Click(${i}, ${j})'> 
                        <img id='${i}_${j}' src='/images/free_cell.png' style='width: 100%; max-height:100% draggable="false"'>  
                    </div>\n`;
        }
    }
    wrapper.innerHTML = buffer;
}


function Click(x, y) {
    if (turn && moves) {
        if (is_first_turn) {
            if (is_first && x != 0) { 
                alert("Начать можно только с верхнего ряда");
                return;
            } else if (!is_first && x != size - 1) {
                alert("Начать можно только с нижнего ряда");
                return;
            }
        } else {
            if (field[x][y] == 1 || field[x][y] == 3 || field[x][y] == 5) {
                alert("Запрещено захватывать свой цвет");
                return;
            }
            if (field[x][y] == 4 || field[x][y] == 6) {
                alert("Запрещено захватывать цепочки соперника");
                return;
            }
            let is_allowed = false;
            for (direction of directions) {
                let next_node = [x + direction[0], y + direction[1]];
                if (next_node[0] >= 0 && next_node[0] < size && next_node[1] >= 0 && next_node[1] < size) {
                    if (field[next_node[0]][next_node[1]] == 1 || field[next_node[0]][next_node[1]] == 3) {
                        is_allowed = true;
                        break;
                    }
                }
            }
            if (!is_allowed) {
                alert("Такой ход запрещен");
                return;
            }
        }


        socket.send(JSON.stringify(
            {
                point: { x, y }
            }
        ));

        is_first_turn = false;
    } else {
        alert("Сейчас не ваш ход");
    }
}


