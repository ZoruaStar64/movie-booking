document.addEventListener('DOMContentLoaded', function() {
    // Конфигурация
    const config = {
        firstSessionTime: 10,
        lastSessionTime: 20,
        sessionStep: 2,
        archiveDepth: 3,        // дни в прошлом
        maxBookingPeriod: 7     // дни в будущем
    };

    // Текущая дата и время
    const now = new Date();
    const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();

    // DOM элементы
    const dateButtonsContainer = document.getElementById('dateButtons');
    const timeButtonsContainer = document.getElementById('timeButtons');
    const seatsContainer = document.getElementById('seatsContainer');
    const selectedDateTimeElement = document.getElementById('selectedDateTime');
    const selectedSeatsInfoElement = document.getElementById('selectedSeatsInfo');
    const bookButton = document.getElementById('bookButton');

    // Начальное состояние
    let state = {
        selectedDate: null,
        selectedTime: null,
        selectedSeats: [],
        bookings: cleanupOldBookings(loadBookings())
    };
    saveBookings(state.bookings); // сохраняем очищенные

    // Инициализация
    initDateButtons();
    updateUI();

    // ========== Основные функции ==========
    
    function initDateButtons() {
        dateButtonsContainer.innerHTML = '';

        for (let i = config.archiveDepth; i > 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            createDateButton(date, true);
        }

        createDateButton(new Date(), false);

        for (let i = 1; i <= config.maxBookingPeriod; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            createDateButton(date, false);
        }
    }

    function createDateButton(date, isPast) {
        const button = document.createElement('button');
        button.className = 'date-btn' + (isPast ? ' past' : '');
        button.textContent = formatDate(date);
        button.dataset.date = date.toISOString().split('T')[0];

        if (isPast) {
            button.disabled = true;
        } else {
            button.onclick = function () {
                state.selectedDate = date;
                state.selectedTime = null;
                state.selectedSeats = [];
                updateTimeButtons();
                updateUI();
            };
        }

        dateButtonsContainer.appendChild(button);
    }

    function updateTimeButtons() {
        timeButtonsContainer.innerHTML = '';
        if (!state.selectedDate) return;

        const isToday = state.selectedDate.toDateString() === currentDate.toDateString();
        const isPastDate = state.selectedDate < currentDate;

        for (let hour = config.firstSessionTime; hour <= config.lastSessionTime; hour += config.sessionStep) {
            const button = document.createElement('button');
            button.className = 'time-btn';
            button.textContent = `${hour}:00`;
            button.dataset.time = hour;

            const isPastTime = isPastDate || (isToday && (hour < currentHour || (hour === currentHour && currentMinutes > 0)));

            if (isPastTime) {
                button.classList.add('past');
                button.disabled = true;
            } else {
                button.onclick = function () {
                    state.selectedTime = hour;
                    state.selectedSeats = [];
                    updateUI();
                };
            }

            timeButtonsContainer.appendChild(button);
        }
    }

    function updateUI() {
        updateButtonsActiveState();
        updateSeatsDisplay();
        updateBookingInfo();

        if (state.selectedDate && state.selectedTime) {
            selectedDateTimeElement.textContent = `${formatDate(state.selectedDate)} ${state.selectedTime}:00`;
        } else {
            selectedDateTimeElement.textContent = '';
        }
    }

    function updateButtonsActiveState() {
        document.querySelectorAll('.date-btn').forEach(button => {
            const buttonDate = new Date(button.dataset.date);
            button.classList.remove('active');
            if (state.selectedDate && state.selectedDate.toDateString() === buttonDate.toDateString()) {
                button.classList.add('active');
            }
        });

        document.querySelectorAll('.time-btn').forEach(button => {
            button.classList.remove('active');
            if (state.selectedTime && parseInt(button.dataset.time) === state.selectedTime) {
                button.classList.add('active');
            }
        });
    }

    function updateSeatsDisplay() {
        seatsContainer.innerHTML = '';
        if (!state.selectedDate || !state.selectedTime) return;

        const dateKey = getDateKey(state.selectedDate);
        const timeKey = state.selectedTime.toString();

        for (let row = 1; row <= 5; row++) {
            for (let num = 1; num <= 10; num++) {
                const seatId = `Ряд ${row}, Место ${num}`;
                const seat = document.createElement('div');
                seat.className = 'seat';
                seat.textContent = seatId;
                seat.dataset.seatId = seatId;

                const isBooked = state.bookings[dateKey] &&
                                 state.bookings[dateKey][timeKey] &&
                                 state.bookings[dateKey][timeKey].includes(seatId);

                if (isBooked) {
                    seat.classList.add('booked');
                } else {
                    const isToday = state.selectedDate.toDateString() === currentDate.toDateString();
                    const isPastDate = state.selectedDate < currentDate;
                    const isPastTime = isPastDate || (isToday && (state.selectedTime < currentHour || (state.selectedTime === currentHour && currentMinutes > 0)));

                    if (!isPastTime) {
                        seat.onclick = function () {
                            toggleSeatSelection(seatId);
                        };
                    }
                }

                if (state.selectedSeats.includes(seatId)) {
                    seat.classList.add('selected');
                }

                seatsContainer.appendChild(seat);
            }
        }
    }

    function toggleSeatSelection(seatId) {
        const index = state.selectedSeats.indexOf(seatId);
        if (index === -1) {
            state.selectedSeats.push(seatId);
        } else {
            state.selectedSeats.splice(index, 1);
        }
        updateUI();
    }

    function updateBookingInfo() {
        if (state.selectedSeats.length > 0) {
            selectedSeatsInfoElement.innerHTML = `
                <h3>Выбранные места:</h3>
                <ul>${state.selectedSeats.map(seat => `<li>${seat}</li>`).join('')}</ul>
            `;
            bookButton.disabled = false;
        } else {
            selectedSeatsInfoElement.innerHTML = '<p>Выберите места для бронирования</p>';
            bookButton.disabled = true;
        }
    }

    bookButton.addEventListener('click', function () {
        if (state.selectedDate && state.selectedTime && state.selectedSeats.length > 0) {
            const dateKey = getDateKey(state.selectedDate);
            const timeKey = state.selectedTime.toString();

            if (!state.bookings[dateKey]) state.bookings[dateKey] = {};
            if (!state.bookings[dateKey][timeKey]) state.bookings[dateKey][timeKey] = [];

            state.bookings[dateKey][timeKey] = [
                ...state.bookings[dateKey][timeKey],
                ...state.selectedSeats
            ];

            saveBookings(state.bookings);
            state.selectedSeats = [];
            updateUI();

            alert('Места успешно забронированы!');
        }
    });

    // ========== Вспомогательные функции ==========

    function formatDate(date) {
        const options = { weekday: 'short', day: 'numeric', month: 'short' };
        return date.toLocaleDateString('ru-RU', options);
    }

    function getDateKey(date) {
        return date.toISOString().split('T')[0];
    }

    function loadBookings() {
        const json = localStorage.getItem('cinemaBookings');
        return json ? JSON.parse(json) : {};
    }

    function saveBookings(bookings) {
        localStorage.setItem('cinemaBookings', JSON.stringify(bookings));
    }

    function cleanupOldBookings(bookings) {
        const cleaned = {};
        const minDate = new Date(currentDate);
        minDate.setDate(minDate.getDate() - config.archiveDepth);

        for (const dateKey in bookings) {
            const date = new Date(dateKey);
            if (date >= minDate) {
                cleaned[dateKey] = bookings[dateKey];
            }
        }
        return cleaned;
    }
});
