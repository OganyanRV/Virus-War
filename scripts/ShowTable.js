      let date_format = {
            day: 'numeric',
            month: 'numeric',
            year: '2-digit',
            hour: 'numeric',
            minute: 'numeric'
        };

        async function init() {

            let response = await fetch("/get_archive");

            if (response.ok) {
                let data = await response.json();
                let table = document.getElementById("table_data");
                table.innerHTML = ``;
                if (data.length > 0) {
                    var header = table.createTHead();
                    var hrow = header.insertRow();
                    hrow.insertCell().innerHTML = "Дата";
                    hrow.insertCell().innerHTML = "Продолжительность";
                    hrow.insertCell().innerHTML = "Результат";
                }
                let body = table.createTBody();
                for (row of data) {
                    var newRow = body.insertRow();
                    console.log(row);
                    for (let [key, value] of Object.entries(row)) {
                        let cell = newRow.insertCell();
                        if (key == 'date') {
                            let data = new Date(value);
                            cell.innerHTML = data.toLocaleString("ru", date_format);
                        } else {
                            if (value == null) {
                                cell.innerHTML = '';
                            } else {
                                cell.innerHTML = value;
                            }
                        }

                    }
                }
            }
        }