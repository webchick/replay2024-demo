import type SnakeRound from './Round';
import type SnakeTeam from './Team';
import { SLOWEST } from './constants';
import { random } from './utils';

export default class Snake {
	private round: SnakeRound;
	private team: SnakeTeam;

	private delay = SLOWEST;
	private speedX = 0;
	private speedY = 0;

	private x = [0];
	private y = [0];

	constructor(round: SnakeRound, team: SnakeTeam) {
		this.round = round;
		this.team = team;

		this.setKeyboardEvents();
		this.placeSnake();
		this.run();
	}

	run() {
		this.checkEatApple();
		this.move();
		this.checkCollision();
		this.draw();

		setTimeout(() => {
			window.requestAnimationFrame(this.run.bind(this));
		}, this.delay);
	}

	placeSnake() {
		this.x = [random(this.round.cellsWide)];
		this.y = [random(this.round.cellsTall)];
	}

	draw() {
		this.round.context.fillStyle = this.team.color;
		for (var i = 0; i < this.x.length; i++) {
			this.round.context.fillRect(
				this.x[i] * this.round.cellSize,
				this.y[i] * this.round.cellSize,
				this.round.cellSize,
				this.round.cellSize
			);
		}
	}

	hitWall() {
		const x = this.x[0];
		const y = this.y[0];
		return x <= 0 || x >= this.round.cellsWide || y <= 0 || y >= this.round.cellsTall;
	}

	stop() {
		this.speedX = 0;
		this.speedY = 0;
	}

	checkCollision() {
		if (this.hitWall()) {
			this.stop();
			return;
		}

		for (var i = 1; i < this.x.length; i++) {
			if (this.x[0] === this.x[i] && this.y[0] === this.y[i]) {
				this.reset();
				break;
			}
		}
	}

	clear() {
		this.x.forEach((x, i) => {
			this.clearTail(x, this.y[i]);
		});
	}

	clearTail(x: number | undefined, y: number | undefined) {
		if (x !== undefined && y !== undefined) {
			const gridX = x * this.round.cellSize;
			const gridY = y * this.round.cellSize;
			this.round.context.fillStyle = this.round.background;
			this.round.context.fillRect(gridX, gridY, this.round.cellSize, this.round.cellSize);

			this.round.context.moveTo(gridX, gridY);
			this.round.context.lineTo(gridX + this.round.cellSize, gridY);
			this.round.context.moveTo(gridX + this.round.cellSize, gridY);
			this.round.context.lineTo(gridX + this.round.cellSize, gridY + this.round.cellSize);
			this.round.context.moveTo(gridX + this.round.cellSize, gridY + this.round.cellSize);
			this.round.context.lineTo(gridX, gridY + this.round.cellSize);
			this.round.context.moveTo(gridX + this.round.cellSize, gridY + this.round.cellSize);

			this.round.context.stroke();
		}
	}

	checkEatApple() {
		if (this.x[0] === this.round.apple.x && this.y[0] === this.round.apple.y) {
			this.team.updateScore();
			this.round.eatApple();
			this.x.push(this.x[this.x.length - 1]);
			this.y.push(this.y[this.y.length - 1]);
			this.delay = this.delay * 0.9;
		}
	}

	move() {
		const nextX = this.x[0] + this.speedX;
		const nextY = this.y[0] + this.speedY;
		const xIsIn = nextX <= this.round.cellsWide && nextX >= 0;
		const yIsIn = nextY <= this.round.cellsTall && nextY >= 0;
		if (xIsIn && yIsIn) {
			this.x.unshift(nextX);
			this.y.unshift(nextY);
			const oldX = this.x.pop();
			const oldY = this.y.pop();
			this.clearTail(oldX, oldY);
		}
	}

	reset() {
		this.clear();
		this.stop();
		this.placeSnake();
	}

	setKeyboardEvents() {
		const Snake = this;
		document.addEventListener('keydown', function (event) {
			switch (event.key) {
				case 'ArrowLeft': // left arrow
					if (Snake.speedX !== 1) {
						Snake.speedX = -1;
						Snake.speedY = 0;
					}
					break;
				case 'ArrowUp': // up arrow
					if (Snake.speedY !== 1) {
						Snake.speedX = 0;
						Snake.speedY = -1;
					}
					break;
				case 'ArrowRight': // right arrow
					if (Snake.speedX !== -1) {
						Snake.speedX = 1;
						Snake.speedY = 0;
					}
					break;
				case 'ArrowDown': // down arrow
					if (Snake.speedY !== -1) {
						Snake.speedX = 0;
						Snake.speedY = 1;
					}
					break;
			}
		});
	}
}
