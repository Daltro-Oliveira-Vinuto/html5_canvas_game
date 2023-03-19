window.addEventListener("load", function () {
  const canvas: HTMLCanvasElement = document.getElementById(
    "gameArea"
  ) as HTMLCanvasElement;
  canvas.width = 1500;
  canvas.height = 900;
  const canvasContext: CanvasRenderingContext2D = canvas.getContext("2d");

  const game: Game = new Game(canvas);

  // animation loop
  let lastTime: number = 0;
  function animate(timeStamp: number) {
    const deltaTime: number = timeStamp - lastTime;

    lastTime = timeStamp;
    canvasContext.fillStyle = "lightblue";
    canvasContext.fillRect(0, 0, canvas.width, canvas.height);
    game.update(deltaTime);
    game.draw(canvasContext);
    requestAnimationFrame(animate);
  }

  animate(0);
});

class GameInterface {
  public canvas: HTMLCanvasElement;
  public width: number;
  public height: number;
  public player: Player;
  public inputHandler: InputHandler;
  public ui: UI;
  public enemies: Enemy[];
  public input: string[];

  public ammo: number;
  public maxAmmo: number;
  public ammoTimer: number;
  public ammoInterval: number;

  public enemyTimer: number;
  public enemyInterval: number;
  public maxEnemies: number;

  public gameOver: boolean;
  public gameStarted: boolean;

  public backgroundAudio: HTMLAudioElement;
  public collisionAudio: HTMLAudioElement;
  public explosionAudio: HTMLAudioElement;
  public shootAudio: HTMLAudioElement;

  public playerLife: number;

  public score: number;
  public winningScore: number;

  public gameTime: number;
  public timeLimit: number;
  public speed: number = 1;
}

class Rectangle {
  protected _x: number = 0;
  protected _y: number = 0;
  protected _width: number;
  protected _height: number;
  protected speedX: number = 0;
  protected speedY: number = 0;
  protected maxSpeedX: number;
  protected maxSpeedY: number;
  protected frameX: number = 0;
  protected frameY: number = 0;
  protected maxFrame: number = 30;

  protected image: CanvasImageSource;
  protected color: string;

  protected _markedForDeletion: boolean = false;
  protected game: Game;

  protected _lives: number;
  protected _score: number;

  public constructor(game: Game) {
    this.game = game;
  }

  public get x(): number {
    return this._x;
  }

  public get y(): number {
    return this._y;
  }

  public set x(newX: number) {
    this._x = newX;
  }

  public set y(newY: number) {
    this._y = newY;
  }

  public get width(): number {
    return this._width;
  }

  public get height(): number {
    return this._height;
  }

  public set width(newWidth: number) {
    this._width = newWidth;
  }

  public set height(newHeight: number) {
    this._height = newHeight;
  }

  public get markedForDeletion(): boolean {
    return this._markedForDeletion;
  }

  public set markedForDeletion(newValue: boolean) {
    this._markedForDeletion = newValue;
  }

  public get lives(): number {
    return this._lives;
  }

  public set lives(lives: number) {
    this._lives = lives;
  }

  public get score(): number {
    return this._score;
  }

  public set score(score: number) {
    this._score = score;
  }

  public generateRandomColor(): string {
    let color: string;

    var red: number = 0;
    var green: number = 0;
    var blue: number = 0;
    // dont let it gerate a square pitch black
    while (red == 0 && green == 0 && blue == 0) {
      red = Math.floor(Math.random() * 255);
      green = Math.floor(Math.random() * 255);
      blue = Math.floor(Math.random() * 255);
    }

    let colorRed: string = red.toString(16);
    let colorGreen: string = green.toString(16);
    let colorBlue: string = blue.toString(16);

    color = "#" + colorRed + colorGreen + colorBlue;
    return color;
  }
}

class Game extends GameInterface {
  public constructor(canvas: HTMLCanvasElement) {
    super();
    this.canvas = canvas;
    this.width = canvas.width;
    this.height = canvas.height;
    this.player = new Player(this);
    this.inputHandler = new InputHandler(this);
    this.ui = new UI(this);
    this.enemies = [];
    this.input = [];
    this.ammo = 20;
    this.maxAmmo = 50;
    this.ammoTimer = 0;
    this.ammoInterval = 500;

    this.enemyTimer = 0;
    this.enemyInterval = 1500;
    this.maxEnemies = 20;
    this.gameOver = false;
    this.gameStarted = false;

    this.score = 0;
    this.winningScore = 5;

    this.gameTime = 0;
    this.timeLimit = 5000;

    this.backgroundAudio = document.getElementById(
      "backgroundSound"
    ) as HTMLAudioElement;

    this.collisionAudio = document.getElementById(
      "collisionSound"
    ) as HTMLAudioElement;

    this.explosionAudio = document.getElementById(
      "explosionSound"
    ) as HTMLAudioElement;

    this.shootAudio = document.getElementById("shootSound") as HTMLAudioElement;

    this.playerLife = 20;
  }

  public update(deltaTime: number): void {
    if (!this.gameOver) {
      this.gameTime += deltaTime;
      if (this.gameTime > this.timeLimit) {
        this.gameOver = true;
      }
    }

    // if player is marked for deletion than finish the game
    if (this.player.markedForDeletion) {
      window.location.reload();
    }
    // update player
    this.player.update(deltaTime);

    //update ammo after 0.5 second;
    if (this.ammoTimer > this.ammoInterval) {
      if (this.ammo < this.maxAmmo) {
        this.ammo++;
        this.ammoTimer = 0;
      }
    } else {
      this.ammoTimer += deltaTime;
    }

    // add a new enemie of type angler1 per second
    if (this.enemyTimer > this.enemyInterval && !this.gameOver) {
      if (this.enemies.length < this.maxEnemies) {
        this.addEnemy("angler1");
        this.enemyTimer = 0;
      }
    } else {
      this.enemyTimer += deltaTime;
    }

    //update enemies
    this.enemies.forEach((enemy: Enemy) => {
      enemy.update(deltaTime);

      // check if some enemy collide with the player
      let collided: boolean =
        this.checkCollisions(this.player, enemy) ||
        this.checkCollisions(enemy, this.player);
      if (collided) {
        // mark enemy for deletion
        enemy.markedForDeletion = true;

        // decrease the live of the player
        this.player.lives -= 1;

        // if player don't have lives than remove player and game over
        //if (this.player.lives <= 0) this.player.markedForDeletion = true;
        if (this.player.lives <= 0) this.gameOver = true;

        // play collision sound
        this.collisionAudio.load();
        this.collisionAudio.play();
      }

      // verify if each projectile collided with some enemy
      this.player.projectiles.forEach((projectile) => {
        let collided: boolean = this.checkCollisions(projectile, enemy);
        if (collided) {
          // marke projectile for deletion
          projectile.markedForDeletion = true;

          // decrease the lives of the enemy
          enemy.lives--;

          // if enemy don't have lives than mark him for deletion
          if (enemy.lives <= 0) {
            enemy.markedForDeletion = true;

            //increase player score;
            if (!this.gameOver) this.score += enemy.score;

            if (this.score > this.winningScore) {
              this.gameOver = true;
            }
          }

          this.explosionAudio.load();
          this.explosionAudio.play();
        }
      });

      // remove the marked for deletion enemies
      this.enemies = this.enemies.filter(
        (enemy: Enemy) => !enemy.markedForDeletion
      );
    });
  }

  public draw(context: CanvasRenderingContext2D): void {
    context.save();

    // draw enemies
    this.enemies.forEach((enemy: Enemy) => enemy.draw(context));

    // draw player
    this.player.draw(context);

    // draw the UI
    this.ui.draw(context);

    context.restore();
  }

  public addEnemy(enemyType: string): void {
    if (enemyType === "angler1") {
      this.enemies.push(new Angler(this));
    }
  }

  public checkCollisions(
    rectangle1: Rectangle,
    rectangle2: Rectangle
  ): boolean {
    let topLeftCorner: boolean;
    let topRightCorner: boolean;
    let bottomLeftCorner: boolean;
    let bottomRightCorner: boolean;

    topLeftCorner =
      rectangle1.x >= rectangle2.x &&
      rectangle1.x <= rectangle2.x + rectangle2.width &&
      rectangle1.y >= rectangle2.y &&
      rectangle1.y <= rectangle2.y + rectangle2.height;

    topRightCorner =
      rectangle1.x + rectangle1.width >= rectangle2.x &&
      rectangle1.x + rectangle1.width <= rectangle2.x + rectangle2.width &&
      rectangle1.y >= rectangle2.y &&
      rectangle1.y <= rectangle2.y + rectangle2.height;

    bottomLeftCorner =
      rectangle1.x >= rectangle2.x &&
      rectangle1.x <= rectangle2.x + rectangle2.width &&
      rectangle1.y + rectangle1.height >= rectangle2.y &&
      rectangle1.y + rectangle1.height <= rectangle2.y + rectangle2.height;

    bottomRightCorner =
      rectangle1.x + rectangle1.width >= rectangle2.x &&
      rectangle1.x + rectangle1.width <= rectangle2.x + rectangle2.width &&
      rectangle1.y + rectangle1.height >= rectangle2.y &&
      rectangle1.y + rectangle1.height <= rectangle2.y + rectangle2.height;

    return (
      topLeftCorner || topRightCorner || bottomLeftCorner || bottomRightCorner
    );
  }
}

class Player extends Rectangle {
  public projectiles: Projectile[];

  public constructor(game: Game) {
    super(game);
    this.width = 120;
    this.height = 190;
    this.x = 20;
    this.y = 100;
    this.maxSpeedY = 5;
    this.maxSpeedX = 5;
    this.maxFrame = 35;

    this.projectiles = [];

    this.image = document.getElementById("playerImage") as CanvasImageSource;

    this.lives = 5;
  }

  public update(deltaTime: number): void {
    // handles motion of the player
    if (this.game.input.includes("ArrowUp")) this.speedY = -this.maxSpeedY;
    if (this.game.input.includes("ArrowDown")) this.speedY = +this.maxSpeedY;
    if (
      !this.game.input.includes("ArrowUp") &&
      !this.game.input.includes("ArrowDown")
    ) {
      this.speedY = 0;
    }

    if (this.game.input.includes("ArrowLeft")) this.speedX = -this.maxSpeedX;
    if (this.game.input.includes("ArrowRight")) this.speedX = this.maxSpeedX;
    if (
      !this.game.input.includes("ArrowLeft") &&
      !this.game.input.includes("ArrowRight")
    ) {
      this.speedX = 0;
    }

    // update the projectiles
    this.projectiles.forEach((projectile: Projectile) => {
      projectile.update(deltaTime);
    });

    // player remove the projectiles marked for deletion
    this.projectiles = this.projectiles.filter(
      (projectile: Projectile) => !projectile.markedForDeletion
    );

    // animate the player;
    if (this.frameX < this.maxFrame) {
      this.frameX++;
    } else {
      this.frameX = 0;
    }

    // update the player position
    this.y += this.speedY;
    this.x += this.speedX;

    // stops the player from get out of the screen boundaries
    if (this.y <= 0 || this.y + this.height >= this.game.height)
      this.y -= this.speedY;
    if (this.x <= 0 || this.x + this.width >= this.game.width)
      this.x -= this.speedX;
  }

  public draw(context: CanvasRenderingContext2D): void {
    context.save();

    // draw the projectiles
    this.projectiles.forEach((projectile: Projectile) =>
      projectile.draw(context)
    );

    // draw the player
    context.drawImage(
      this.image,
      this.frameX * this.width,
      this.frameY * this.height,
      this.width,
      this.height,
      this.x,
      this.y,
      this.width,
      this.height
    );

    context.restore();
  }

  public shootTop(): void {
    if (this.game.ammo > 0) {
      this.projectiles.push(
        new Projectile(this.game, this.x + this.width * 0.9, this.y + 30)
      );

      this.game.shootAudio.load();
      this.game.shootAudio.play();
      this.game.ammo--;
    }
  }
}

class InputHandler {
  private game: Game;

  public constructor(game: Game) {
    this.game = game;

    document.addEventListener("keydown", (event: KeyboardEvent) => {
      // handle movement of the player and shoot
      if (
        (event.key === "ArrowDown" ||
          event.key === "ArrowUp" ||
          event.key == "ArrowLeft" ||
          event.key == "ArrowRight") &&
        this.game.input.indexOf(event.key) == -1
      ) {
        this.game.input.push(event.key);
      } else if (event.key === " ") {
        this.game.player.shootTop();
      }

      if (!this.game.gameStarted) {
        this.game.gameStarted = true;
        this.game.backgroundAudio.load();
        this.game.backgroundAudio.play();
        this.game.backgroundAudio.loop = true;
      }
    });

    document.addEventListener("keyup", (event: KeyboardEvent) => {
      let index = this.game.input.indexOf(event.key);
      if (index !== -1) {
        this.game.input.splice(index, 1);
      }
    });
  }
}

class Enemy extends Rectangle {
  public constructor(game: Game) {
    super(game);
    this.x = this.game.width;
    this.y = Math.random() * (this.game.height * 0.8);
    this.speedX = Math.random() * -1.5 - 1;
    this.width = 50;
    this.height = 50;
    this.color = this.generateRandomColor();
    this.lives = 2;
    this.score = this.lives;
  }

  public update(deltaTime: number): void {
    this.x += this.speedX;
    if (this.x < 0) {
      this.markedForDeletion = true;
    }

    if (this.frameX < this.maxFrame) {
      this.frameX++;
    } else {
      this.frameX = 0;
    }
  }

  public draw(context: CanvasRenderingContext2D): void {
    context.save();

    context.drawImage(
      this.image,
      this.frameX * this.width,
      this.frameY * this.height,
      this.width,
      this.height,
      this.x,
      this.y,
      this.width,
      this.height
    );

    context.fillStyle = "black";
    context.font = "20px helvetica";
    context.fillText(this.lives.toString(), this.x, this.y);

    context.restore();
  }
}

class Angler extends Enemy {
  public constructor(game: Game) {
    super(game);
    this.width = 228;
    this.height = 169;
    this.image = document.getElementById("angler1") as CanvasImageSource;
    this.maxFrame = 37;
    this.lives = 3;
  }
}

class Projectile extends Rectangle {
  public constructor(game: Game, x: number, y: number) {
    super(game);
    this.x = x;
    this.y = y;
    this.width = 20;
    this.height = 10;
    this.maxSpeedX = 5;
    this.speedX = this.maxSpeedX;
  }

  public update(deltaTime: number): void {
    this.x += this.speedX;

    if (this.x > this.game.width * 0.9) {
      this.markedForDeletion = true;
    }
  }

  public draw(context: CanvasRenderingContext2D) {
    context.save();
    context.fillStyle = "#ff0000";
    context.fillRect(this.x, this.y, this.width, this.height);
    context.restore();
  }
}

class UI {
  private game: Game;
  private color: string;
  private fontSize: number;
  private fontFamily: string;

  public constructor(game: Game) {
    this.game = game;

    this.color = "white";
    this.fontSize = 25;
    this.fontFamily = "Helvetica";
  }

  public draw(context: CanvasRenderingContext2D) {
    context.save();

    context.shadowOffsetX = 2;
    context.shadowOffsetY = 2;
    context.shadowColor = "black";

    // ammo
    context.fillStyle = this.color;
    for (let i = 0; i < this.game.ammo; i++) {
      context.fillRect(20 + i * 10, 50, 3, 20);
    }

    //score
    context.font = this.fontSize + "px " + this.fontFamily;
    context.fillText("Score: " + this.game.score, 20, 40);

    // timer
    const formattedTime: string = (this.game.gameTime * 0.001).toFixed(1);
    context.fillText("Timer: " + formattedTime, 20, 100);

    // game over messages
    if (this.game.gameOver) {
      context.textAlign = "center";
      let message1: string;
      let message2: string;

      if (this.game.score > this.game.winningScore) {
        message1 = "you win";
        message2 = "well done";
      } else {
        message1 = "You lose";
        message2 = "Try again next time";
      }
      context.font = "50px " + this.fontFamily;
      context.fillText(
        message1,
        this.game.width * 0.5,
        this.game.height * 0.5 - 40
      );

      context.font = "25px " + this.fontFamily;
      context.fillText(
        message2,
        this.game.width * 0.5,
        this.game.height * 0.5 + 40
      );
    }

    context.restore();
  }
}

class Layer extends Rectangle {
  protected speedModifier: number;

  public constructor(
    game: Game,
    image: CanvasImageSource,
    speedModifier: number
  ) {
    super(game);
    this.image = image;
    this.speedModifier = speedModifier;
    this.width = 1768;
    this.height = 500;
  }

  public update(deltaTime: number): void {
    if (this.x <= -this.width) this.x = 0;
    else this.x -= this.game.speed * this.speedModifier;
  }

  public draw(context: CanvasRenderingContext2D): void {
    context.drawImage(this.image, this.x, this.y);
  }
}

class Background {
  protected game: Game;
  protected image1: CanvasImageSource;
  protected layer1: Layer;
  protected layers: Layer[];

  public constructor(game: Game) {
    this.game = game;
    this.image1 = document.getElementById("layer1") as CanvasImageSource;
    this.layer1 = new Layer(this.game, this.image1, 1);

    this.layers.push(this.layer1);
  }

  public update(deltaTime: number): void {
    this.layers.forEach((layer: Layer) => layer.update(deltaTime));
  }

  public draw(context: CanvasRenderingContext2D) {
    this.layers.forEach((layer: Layer) => layer.draw(context));
  }
}

class Particle {}
