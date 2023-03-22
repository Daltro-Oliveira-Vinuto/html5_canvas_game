window.addEventListener("load", function () {
  const canvas: HTMLCanvasElement = document.getElementById(
    "gameArea"
  ) as HTMLCanvasElement;
  canvas.width = 1400;
  canvas.height = 500;

  const canvasContext: CanvasRenderingContext2D = canvas.getContext("2d");
  canvasContext.fillStyle = "";

  const game: Game = new Game(canvas);

  // animation loop
  let lastTime: number = 0;
  function animate(timeStamp: number) {
    const deltaTime: number = timeStamp - lastTime;
    lastTime = timeStamp;

    // clear the screen
    canvasContext.fillRect(0, 0, canvas.width, canvas.height);

    // call object game
    game.draw(canvasContext);
    game.update(deltaTime);
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
  public background: Background;
  public ui: UI;
  public enemies: Enemy[];
  public particles: Particle[];
  public explosions: Explosion[];
  public inputs: string[];

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

  public winningScore: number;

  public gameTime: number;
  public timeLimit: number;
  public speed: number = 1;

  public debugMode: boolean = false;
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

  protected spriteHeight: number;
  protected spriteWidth: number;
  protected fps: number;
  protected interval: number;
  protected timer: number;

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
    this.particles = [];
    this.explosions = [];
    this.enemies = [];
    this.inputs = [];

    this.ammo = 20;
    this.maxAmmo = 50;
    this.ammoTimer = 0;
    this.ammoInterval = 350;

    this.enemyTimer = 0;
    this.enemyInterval = 2000;
    this.maxEnemies = 20;
    this.gameOver = false;
    this.gameStarted = false;

    this.winningScore = 100;

    this.gameTime = 0;
    this.timeLimit = 60000;

    this.speed = 1;

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

    this.background = new Background(this);
    this.background.addLayer("layer1", 0.1);
    this.background.addLayer("layer2", 0.3);
    this.background.addLayer("layer3", 1);
    this.background.addLayer("layer4", 1.5);
  }

  public update(deltaTime: number): void {
    // update background
    this.background.update(deltaTime);

    // verify if the time has ended
    if (!this.gameOver) {
      this.gameTime += deltaTime;
      if (this.gameTime > this.timeLimit) {
        this.gameOver = true;
      }
    }

    //update ammo after 0.5 second;
    if (this.ammoTimer > this.ammoInterval) {
      if (this.ammo < this.maxAmmo) {
        this.ammo++;
        this.ammoTimer = 0;
      }
    } else {
      this.ammoTimer += deltaTime;
    }

    // add a new enemie of random type each enemyInterval
    if (this.enemyTimer > this.enemyInterval && !this.gameOver) {
      if (this.enemies.length < this.maxEnemies) {
        this.addEnemy();
        this.enemyTimer = 0;
      }
    } else {
      this.enemyTimer += deltaTime;
    }

    // update player
    this.player.update(deltaTime);

    // update particles
    this.particles.forEach((particle: Particle) => particle.update(deltaTime));

    // remove the particles marked for deletion
    this.particles = this.particles.filter(
      (particle: Particle) => !particle.markedForDeletion
    );

    // update explosions
    this.explosions.forEach((explosion: Explosion) =>
      explosion.update(deltaTime)
    );
    // remove marked for deletion explosions
    this.explosions = this.explosions.filter(
      (explosion: Explosion) => !explosion.markedForDeletion
    );

    //update enemies
    this.enemies.forEach((enemy: Enemy) => {
      //update enemy
      enemy.update(deltaTime);

      // check if some enemy collided with the player
      let collided: boolean =
        this.checkCollisions(this.player, enemy) ||
        this.checkCollisions(enemy, this.player);
      if (collided) {
        // mark enemy for deletion
        enemy.markedForDeletion = true;

        // decrease the score  of the player if the enemy isn't a lucky fish
        if (!this.gameOver && enemy.type !== "lucky") this.player.score--;

        // verify if the enemy was a lucky, if true than active powerUp state
        if (enemy.type === "lucky") {
          this.player.enterPowerUp();
        }

        // if player don't have lives than game over is true
        if (this.player.lives <= 0) this.gameOver = true;

        // load and play collision sound
        this.collisionAudio.load();
        this.collisionAudio.play();

        // particles at the position of the collision
        for (let i = 0; i < enemy.score / 2.0; i++) {
          this.particles.push(
            new Particle(
              this,
              enemy.x + enemy.width * 0.5,
              enemy.y + enemy.height * 0.5
            )
          );
        }

        // add explosion at the place of the collision with the player
        this.addExplosion(enemy);
      }

      // verify if some projectile collided with some enemy
      this.player.projectiles.forEach((projectile) => {
        let collided: boolean = this.checkCollisions(projectile, enemy);
        if (collided) {
          // marke projectile for deletion
          projectile.markedForDeletion = true;

          // decrease the lives of the enemy by the projectile damage
          enemy.lives -= projectile.damage;

          // play collision sound
          this.collisionAudio.load();
          this.collisionAudio.play();

          // after a projectille hit the enemy the enemy will spill one gear
          this.particles.push(
            new Particle(
              this,
              enemy.x + enemy.width * 0.5,
              enemy.y + enemy.height * 0.5
            )
          );

          // if enemy don't have lives than mark him for deletion
          if (enemy.lives <= 0) {
            enemy.markedForDeletion = true;

            // load and play explosion audio
            this.explosionAudio.load();
            this.explosionAudio.play();

            //increase player score;
            if (!this.gameOver) this.player.score += enemy.score;

            // add particles at the place in which the enemy exploded
            for (let i = 0; i < enemy.score; i++) {
              this.particles.push(
                new Particle(
                  this,
                  enemy.x + enemy.width * 0.5,
                  enemy.y + enemy.height * 0.5
                )
              );
            }

            // add explosion at the place of the collision with the projectile
            this.addExplosion(enemy);

            // if enemy is a hivewhale than add the drones
            if (enemy.type == "hivewhale") {
              enemy.addChild();
            }
          }
        }
      });
    });

    // remove the marked for deletion enemies
    this.enemies = this.enemies.filter(
      (enemy: Enemy) => !enemy.markedForDeletion
    );
  }

  public draw(context: CanvasRenderingContext2D): void {
    context.save();

    // draw background
    this.background.draw(context);

    // draw the UI
    this.ui.draw(context);

    // draw player
    this.player.draw(context);

    // draw particles
    this.particles.forEach((particle: Particle) => particle.draw(context));

    // draw enemies
    this.enemies.forEach((enemy: Enemy) => enemy.draw(context));

    //draw explosions
    this.explosions.forEach((explosion: Explosion) => explosion.draw(context));

    // draw front layer
    this.background.layers[3].draw(context);

    context.restore();
  }

  public addEnemy(): void {
    let enemyType: string = this.chooseEnemyType();

    if (enemyType === "angler1") {
      this.enemies.push(new Angler1(this));
    } else if (enemyType == "angler2") {
      this.enemies.push(new Angler2(this));
    } else if (enemyType == "hiveWhale") {
      this.enemies.push(new Hivewhale(this));
    } else if (enemyType == "lucky") {
      this.enemies.push(new Lucky(this));
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

  private chooseEnemyType(): string {
    let enemyType: string;
    let randomNumber: number = Math.random() * 100;

    if (randomNumber >= 0 && randomNumber <= 30) {
      enemyType = "angler1";
    }
    if (randomNumber > 30 && randomNumber <= 60) {
      enemyType = "angler2";
    }

    if (randomNumber > 60 && randomNumber < 90) {
      enemyType = "lucky";
    }

    if (randomNumber >= 90 && randomNumber <= 100) {
      enemyType = "hiveWhale";
    }

    return enemyType;
  }

  public addExplosion(enemy: Enemy): void {
    const randomize: number = Math.random();

    if (randomize < 0.5) {
      this.explosions.push(
        new SmokeExplosion(
          this,
          enemy.x + enemy.width * 0.5,
          enemy.y + enemy.height * 0.5
        )
      );
    } else if (randomize > 0.5) {
      this.explosions.push(
        new FireExplosion(
          this,
          enemy.x + enemy.width * 0.5,
          enemy.y + enemy.height * 0.5
        )
      );
    }
  }
}

class Player extends Rectangle {
  public projectiles: Projectile[];
  public powerUp: boolean;
  protected powerUpTimer = 0;
  protected powerUpLimit = 10000;

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

    this.lives = 20;
    this.score = 0;

    this.powerUp = false;
    this.powerUpTimer = 0;
    this.powerUpLimit = 10000;
  }

  public update(deltaTime: number): void {
    // handles motion of the player
    if (this.game.inputs.includes("ArrowUp")) this.speedY = -this.maxSpeedY;
    if (this.game.inputs.includes("ArrowDown")) this.speedY = +this.maxSpeedY;
    if (
      !this.game.inputs.includes("ArrowUp") &&
      !this.game.inputs.includes("ArrowDown")
    ) {
      this.speedY = 0;
    }

    if (this.game.inputs.includes("ArrowLeft")) this.speedX = -this.maxSpeedX;
    if (this.game.inputs.includes("ArrowRight")) this.speedX = this.maxSpeedX;
    if (
      !this.game.inputs.includes("ArrowLeft") &&
      !this.game.inputs.includes("ArrowRight")
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
    //if (this.y <= 0 || this.y + this.height >= this.game.height)
    //  this.y -= this.speedY;
    if (this.x <= 0 || this.x + this.width >= this.game.width)
      this.x -= this.speedX;

    if (this.y > this.game.height - this.height * 0.5)
      this.y = this.game.height - this.height * 0.5;
    if (this.y < -this.height * 0.5) this.y = -this.height * 0.5;

    // check powerUp
    if (this.powerUp) {
      if (this.powerUpTimer > this.powerUpLimit) {
        this.powerUp = false;
        this.powerUpTimer = 0;
        this.frameY = 0;
      } else {
        this.powerUpTimer += deltaTime;
        this.frameY = 1;
        if (this.game.ammo < this.game.maxAmmo) this.game.ammo += 0.1;
      }
    }
  }

  public draw(context: CanvasRenderingContext2D): void {
    context.save();

    // draw the projectiles
    this.projectiles.forEach((projectile: Projectile) =>
      projectile.draw(context)
    );

    // draw the player
    if (this.game.debugMode) {
      context.strokeRect(this.x, this.y, this.width, this.height);
    }
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
    if (this.game.ammo >= 1) {
      this.projectiles.push(
        new Projectile(this.game, this.x + 80, this.y + 30)
      );

      if (this.powerUp) {
        this.shootDown();
      }
      this.game.shootAudio.load();
      this.game.shootAudio.play();
      this.game.ammo--;
    }
  }

  public shootDown(): void {
    if (this.game.ammo > 0) {
      this.projectiles.push(
        new Projectile(this.game, this.x + 80, this.y + 175)
      );
    }
  }

  public enterPowerUp(): void {
    this.powerUp = true;
    this.powerUpTimer = 0;
    if (this.game.ammo < this.game.maxAmmo) {
      this.game.ammo = this.game.maxAmmo;
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
        this.game.inputs.indexOf(event.key) == -1
      ) {
        this.game.inputs.push(event.key);
      } else if (event.key === " ") {
        this.game.player.shootTop();
      } else if (event.key == "d") {
        this.game.debugMode = !this.game.debugMode;
      }

      if (!this.game.gameStarted) {
        this.game.gameStarted = true;
        this.game.backgroundAudio.load();
        this.game.backgroundAudio.play();
        this.game.backgroundAudio.loop = true;
      }
    });

    document.addEventListener("keyup", (event: KeyboardEvent) => {
      let index = this.game.inputs.indexOf(event.key);
      if (index !== -1) {
        this.game.inputs.splice(index, 1);
      }
    });
  }
}

class Enemy extends Rectangle {
  public type: string;
  protected totalChilds: number;

  public constructor(game: Game) {
    super(game);
    this.x = this.game.width;
    this.y = Math.random() * (this.game.height * 0.95 - this.height);
    this.speedX = Math.random() * -1.5 - 1;
    this.width = 50;
    this.height = 50;
    this.color = this.generateRandomColor();
    this.lives = 2;
    this.score = this.lives;
    this.type = "";
  }

  public update(deltaTime: number): void {
    this.x += this.speedX - this.game.speed;
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

    if (this.game.debugMode) {
      context.strokeRect(this.x, this.y, this.width, this.height);
      context.font = "20px helvetica";
      context.fillText(this.lives.toString(), this.x, this.y);
    }

    context.restore();
  }

  public addChild(): void {}
}

class Angler1 extends Enemy {
  public constructor(game: Game) {
    super(game);
    this.width = 228;
    this.height = 169;
    this.image = document.getElementById("angler1") as CanvasImageSource;
    this.y = Math.random() * (this.game.height * 0.95 - this.height);
    this.frameY = Math.floor(Math.random() * 3);
    this.maxFrame = 37;
    this.lives = 3;
    this.score = this.lives;
  }
}

class Angler2 extends Enemy {
  public constructor(game: Game) {
    super(game);
    this.width = 213;
    this.height = 169;
    this.y = Math.random() * (this.game.height * 0.95 - this.height);
    this.image = document.getElementById("angler2") as CanvasImageSource;
    this.frameY = Math.floor(Math.random() * 2);
    this.maxFrame = 37;
    this.lives = 3;
    this.score = this.lives;
  }
}

class Drone extends Enemy {
  public constructor(game: Game, x: number, y: number) {
    super(game);
    this.x = x;
    this.y = y;
    this.width = 115;
    this.height = 95;
    this.frameX = Math.random() * -4.0 - 2.0;
    this.image = document.getElementById("drone") as CanvasImageSource;
    this.frameY = Math.floor(Math.random() * 2);
    this.maxFrame = 37;
    this.lives = 1;
    this.score = this.lives;
  }
}

class Lucky extends Enemy {
  public constructor(game: Game) {
    super(game);
    this.width = 99;
    this.height = 95;
    this.y = Math.random() * (this.game.height * 0.95 - this.height);
    this.image = document.getElementById("lucky") as CanvasImageSource;
    this.frameY = Math.floor(Math.random() * 2);
    this.maxFrame = 37;
    this.lives = 1;
    this.score = 15;
    this.type = "lucky";
  }
}

class Hivewhale extends Enemy {
  public constructor(game: Game) {
    super(game);
    this.width = 400;
    this.height = 227;
    this.y = Math.random() * (this.game.height * 0.95 - this.height);
    this.image = document.getElementById("hiveWhale") as CanvasImageSource;
    this.maxFrame = 37;
    this.lives = 15;
    this.score = this.lives;
    this.speedX = Math.random() * -1.2 - 0.2;
    this.type = "hivewhale";
    this.totalChilds = 1;
  }

  public override addChild(): void {
    // add drones inside the hiveWhale
    for (let i = 0; i < this.totalChilds; i += 1) {
      this.game.enemies.push(
        new Drone(
          this.game,
          this.x + this.width * 0.5 + (Math.random() * -1.0 + 0.5) * this.width,
          this.y + this.height * 0.5 + Math.random() * -1.0 * +0.5 * this.height
        )
      );
    }
  }
}

class Projectile extends Rectangle {
  public damage: number;

  public constructor(game: Game, x: number, y: number) {
    super(game);
    this.x = x;
    this.y = y;
    this.width = 28;
    this.height = 10;
    this.maxSpeedX = 5;
    this.speedX = this.maxSpeedX;

    this.maxFrame = 10;

    this.image = document.getElementById("projectile") as CanvasImageSource;

    this.damage = 1;
  }

  public update(deltaTime: number): void {
    this.x += this.speedX;

    if (this.x > this.game.width * 0.9) {
      this.markedForDeletion = true;
    }

    if (this.frameX < this.maxFrame) {
      this.frameX++;
    } else {
      this.frameX = 0;
      this.frameY += 1;
    }

    if (this.frameY >= 8) {
      this.frameY = 0;
    }
  }

  public draw(context: CanvasRenderingContext2D) {
    context.save();

    if (this.game.debugMode) {
      context.strokeRect(this.x, this.y, this.width, this.height);
    }

    /* context.drawImage(
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
    */
    context.drawImage(this.image, this.x, this.y, this.width, this.height);

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
    this.fontFamily = "Dancing Script";
  }

  public draw(context: CanvasRenderingContext2D) {
    context.save();

    context.shadowOffsetX = 2;
    context.shadowOffsetY = 2;
    context.shadowColor = "black";

    context.fillStyle = this.color;

    //score
    context.font = this.fontSize + "px " + this.fontFamily;
    context.fillText("Score: " + this.game.player.score, 20, 40);

    // timer
    const formattedTime: string = (this.game.gameTime * 0.001).toFixed(1);
    context.fillText("Timer: " + formattedTime, 20, 100);

    // game over messages
    if (this.game.gameOver) {
      context.textAlign = "center";
      let message1: string;
      let message2: string;

      if (this.game.player.score > this.game.winningScore) {
        message1 = "Most Wondrous!";
        message2 = "well done explorer!";
      } else {
        message1 = "Blazes!";
        message2 = "Get my repair kit and try again!";
      }
      context.font = "70px " + this.fontFamily;
      context.fillText(
        message1,
        this.game.width * 0.5,
        this.game.height * 0.5 - 20
      );

      context.font = "25px " + this.fontFamily;
      context.fillText(
        message2,
        this.game.width * 0.5,
        this.game.height * 0.5 + 20
      );
    }

    // draw ammo
    if (this.game.player.powerUp === true) {
      context.fillStyle = "#ffffbd";
    }

    for (let i = 0; i < this.game.ammo; i++) {
      context.fillRect(20 + i * 10, 50, 3, 20);
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
    this.width = this.game.width;
    this.height = this.game.height;
  }

  public update(deltaTime: number): void {
    if (this.x <= -this.width) this.x = 0;
    this.x -= this.game.speed * this.speedModifier;
  }

  public draw(context: CanvasRenderingContext2D): void {
    context.drawImage(this.image, this.x, this.y, this.width, this.height);
    context.drawImage(
      this.image,
      this.x + this.width,
      this.y,
      this.width,
      this.height
    );
  }
}

class Background {
  protected game: Game;
  public layers: Layer[];

  public constructor(game: Game) {
    this.game = game;
    this.layers = [];
  }

  public update(deltaTime: number): void {
    this.layers.forEach((layer: Layer) => layer.update(deltaTime));
  }

  public draw(context: CanvasRenderingContext2D) {
    this.layers.forEach((layer: Layer) => layer.draw(context));
  }

  public addLayer(imageID: string, speedModifier: number): void {
    var image: CanvasImageSource = document.getElementById(
      imageID
    ) as CanvasImageSource;

    this.layers.push(new Layer(this.game, image, speedModifier));
  }
}

class Particle extends Rectangle {
  protected spriteSize: number;
  protected sizeModifier: number;
  protected size: number;
  protected gravity: number;
  protected angle: number;
  protected va: number;
  protected bounce: number;
  protected bottomBounceBoundary: number;
  protected bounceLimit: number;

  public constructor(game: Game, x: number, y: number) {
    super(game);
    this.x = x;
    this.y = y;
    this.image = document.getElementById("gears") as CanvasImageSource;
    this.frameX = Math.floor(Math.random() * 3);
    this.frameY = Math.floor(Math.random() * 3);
    this.spriteSize = 50;
    this.sizeModifier = Math.random() * 0.5 + 0.5;
    this.size = Math.floor(this.spriteSize * this.sizeModifier);
    this.speedX = Math.random() * 6 - 3;
    this.speedY = Math.random() * -15;
    this.gravity = 0.5;
    this.markedForDeletion = false;

    this.angle = 0;
    this.va = Math.random() * 0.2 - 0.1;

    this.bounce = 0;
    this.bounceLimit = 2;
    this.bottomBounceBoundary = Math.random() * 80 + 60;
  }

  public update(deltaTime: number): void {
    this.angle += this.va;

    this.speedY += this.gravity;

    this.x += this.speedX + this.game.speed;
    this.y += this.speedY;

    // if the has to be deleted
    if (
      this.y > this.game.height - this.size ||
      this.x < -this.size ||
      this.x > this.width - this.size
    ) {
      this.markedForDeletion = true;
    }

    // make the particle bounce
    if (
      this.bounce < this.bounceLimit &&
      this.y > this.game.height - this.bottomBounceBoundary
    ) {
      this.bounce++;
      this.speedY *= -0.7;
    }
  }

  public draw(context: CanvasRenderingContext2D): void {
    context.save();

    context.translate(this.x, this.y);
    context.rotate(this.angle);
    context.drawImage(
      this.image,
      this.frameX * this.spriteSize,
      this.frameY * this.spriteSize,
      this.spriteSize,
      this.spriteSize,
      0 - this.size * 0.5, // very important
      0 - this.size * 0.5, // very important
      this.size,
      this.size
    );

    context.restore();
  }
}

class Explosion extends Rectangle {
  public constructor(game: Game, x: number, y: number) {
    super(game);
    this.x = x;
    this.y = y;

    this.frameX = 0;
    this.frameY = 0;
    this.maxFrame = 8;
    this.spriteHeight = 200;
    this.timer = 0;
    this.fps = 30;
    this.interval = 1000 / this.fps;
    this.markedForDeletion = false;

    this.spriteWidth = 200;
    this.width = this.spriteWidth;
    this.height = this.spriteHeight;
    this.x = x - this.width * 0.5;
    this.y = y - this.width * 0.5;
  }

  public update(deltaTime: number): void {
    this.x -= this.game.speed;
    if (this.timer > this.interval) {
      this.frameX++;
      this.timer = 0;
    } else {
      this.timer += deltaTime;
    }

    if (this.frameX > this.maxFrame) this.markedForDeletion = true;
  }

  public draw(context: CanvasRenderingContext2D): void {
    context.drawImage(
      this.image,
      this.frameX * this.spriteWidth,
      this.frameY,
      this.spriteWidth,
      this.spriteHeight,
      this.x,
      this.y,
      this.width,
      this.height
    );
  }
}

class SmokeExplosion extends Explosion {
  public constructor(game: Game, x: number, y: number) {
    super(game, x, y);
    this.image = document.getElementById("smokeExplosion") as CanvasImageSource;
  }
}

class FireExplosion extends Explosion {
  public constructor(game: Game, x: number, y: number) {
    super(game, x, y);
    this.image = document.getElementById("fireExplosion") as CanvasImageSource;
  }
}
