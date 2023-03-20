window.addEventListener("load", function () {
    const canvas = document.getElementById("gameArea");
    canvas.width = 1400;
    canvas.height = 500;
    const canvasContext = canvas.getContext("2d");
    const game = new Game(canvas);
    // animation loop
    let lastTime = 0;
    function animate(timeStamp) {
        const deltaTime = timeStamp - lastTime;
        lastTime = timeStamp;
        canvasContext.fillStyle = "lightblue";
        canvasContext.fillRect(0, 0, canvas.width, canvas.height);
        game.draw(canvasContext);
        game.update(deltaTime);
        requestAnimationFrame(animate);
    }
    animate(0);
});
class GameInterface {
    canvas;
    width;
    height;
    player;
    inputHandler;
    background;
    ui;
    enemies;
    particles;
    explosions;
    input;
    ammo;
    maxAmmo;
    ammoTimer;
    ammoInterval;
    enemyTimer;
    enemyInterval;
    maxEnemies;
    gameOver;
    gameStarted;
    backgroundAudio;
    collisionAudio;
    explosionAudio;
    shootAudio;
    playerLife;
    score;
    winningScore;
    gameTime;
    timeLimit;
    speed = 1;
    debugMode = false;
}
class Rectangle {
    _x = 0;
    _y = 0;
    _width;
    _height;
    speedX = 0;
    speedY = 0;
    maxSpeedX;
    maxSpeedY;
    frameX = 0;
    frameY = 0;
    maxFrame = 30;
    image;
    color;
    _markedForDeletion = false;
    game;
    _lives;
    _score;
    constructor(game) {
        this.game = game;
    }
    get x() {
        return this._x;
    }
    get y() {
        return this._y;
    }
    set x(newX) {
        this._x = newX;
    }
    set y(newY) {
        this._y = newY;
    }
    get width() {
        return this._width;
    }
    get height() {
        return this._height;
    }
    set width(newWidth) {
        this._width = newWidth;
    }
    set height(newHeight) {
        this._height = newHeight;
    }
    get markedForDeletion() {
        return this._markedForDeletion;
    }
    set markedForDeletion(newValue) {
        this._markedForDeletion = newValue;
    }
    get lives() {
        return this._lives;
    }
    set lives(lives) {
        this._lives = lives;
    }
    get score() {
        return this._score;
    }
    set score(score) {
        this._score = score;
    }
    generateRandomColor() {
        let color;
        var red = 0;
        var green = 0;
        var blue = 0;
        // dont let it gerate a square pitch black
        while (red == 0 && green == 0 && blue == 0) {
            red = Math.floor(Math.random() * 255);
            green = Math.floor(Math.random() * 255);
            blue = Math.floor(Math.random() * 255);
        }
        let colorRed = red.toString(16);
        let colorGreen = green.toString(16);
        let colorBlue = blue.toString(16);
        color = "#" + colorRed + colorGreen + colorBlue;
        return color;
    }
}
class Game extends GameInterface {
    constructor(canvas) {
        super();
        this.canvas = canvas;
        this.width = canvas.width;
        this.height = canvas.height;
        this.player = new Player(this);
        this.inputHandler = new InputHandler(this);
        this.background = new Background(this);
        this.ui = new UI(this);
        this.particles = [];
        this.explosions = [];
        this.enemies = [];
        this.input = [];
        this.ammo = 20;
        this.maxAmmo = 50;
        this.ammoTimer = 0;
        this.ammoInterval = 350;
        this.enemyTimer = 0;
        this.enemyInterval = 2000;
        this.maxEnemies = 20;
        this.gameOver = false;
        this.gameStarted = false;
        this.score = 0;
        this.winningScore = 100;
        this.gameTime = 0;
        this.timeLimit = 30000;
        this.speed = 1;
        this.backgroundAudio = document.getElementById("backgroundSound");
        this.collisionAudio = document.getElementById("collisionSound");
        this.explosionAudio = document.getElementById("explosionSound");
        this.shootAudio = document.getElementById("shootSound");
        this.playerLife = 20;
    }
    update(deltaTime) {
        // update background
        this.background.update(deltaTime);
        this.background.layer4.update(deltaTime);
        if (!this.gameOver) {
            this.gameTime += deltaTime;
            if (this.gameTime > this.timeLimit) {
                this.gameOver = true;
            }
        }
        // update player
        this.player.update(deltaTime);
        //update ammo after 0.5 second;
        if (this.ammoTimer > this.ammoInterval) {
            if (this.ammo < this.maxAmmo) {
                this.ammo++;
                this.ammoTimer = 0;
            }
        }
        else {
            this.ammoTimer += deltaTime;
        }
        // add a new enemie of random type each enemyInterval
        if (this.enemyTimer > this.enemyInterval && !this.gameOver) {
            if (this.enemies.length < this.maxEnemies) {
                this.addEnemy();
                this.enemyTimer = 0;
            }
        }
        else {
            this.enemyTimer += deltaTime;
        }
        //update enemies
        this.enemies.forEach((enemy) => {
            enemy.update(deltaTime);
            // check if some enemy collided with the player
            let collided = this.checkCollisions(this.player, enemy) ||
                this.checkCollisions(enemy, this.player);
            if (collided) {
                // mark enemy for deletion
                enemy.markedForDeletion = true;
                // decrease the score  of the player
                if (!this.gameOver)
                    this.player.score--;
                // if player don't have lives than remove player and game over
                //if (this.player.lives <= 0) this.player.markedForDeletion = true;
                if (this.player.lives <= 0)
                    this.gameOver = true;
                // play collision sound
                this.collisionAudio.load();
                this.collisionAudio.play();
                // verify if the enemy was a lucky, if true than active powerUp state
                if (enemy.type === "lucky") {
                    this.player.enterPowerUp();
                }
                // particles at the position of the collision
                for (let i = 0; i < enemy.score / 2.0; i++) {
                    this.particles.push(new Particle(this, enemy.x + enemy.width * 0.5, enemy.y + enemy.height * 0.5));
                }
                // add explosion at the place of the collision with the player
                this.addExplosion(enemy);
            }
            // verify if each projectile collided with some enemy
            this.player.projectiles.forEach((projectile) => {
                let collided = this.checkCollisions(projectile, enemy);
                if (collided) {
                    // marke projectile for deletion
                    projectile.markedForDeletion = true;
                    // decrease the lives of the enemy
                    enemy.lives--;
                    // play collision sound
                    this.collisionAudio.load();
                    this.collisionAudio.play();
                    // after projectille hit the enemy the enemy will spill one gear
                    this.particles.push(new Particle(this, enemy.x + enemy.width * 0.5, enemy.y + enemy.height * 0.5));
                    // if enemy don't have lives than mark him for deletion
                    if (enemy.lives <= 0) {
                        enemy.markedForDeletion = true;
                        // play explosion audio
                        this.explosionAudio.load();
                        this.explosionAudio.play();
                        //increase player score;
                        if (!this.gameOver)
                            this.score += enemy.score;
                        //if (this.score > this.winningScore) this.gameOver = true;
                        // add particles at the place of the collision between the particle and enemy
                        for (let i = 0; i < enemy.score; i++) {
                            this.particles.push(new Particle(this, enemy.x + enemy.width * 0.5, enemy.y + enemy.height * 0.5));
                        }
                        // add drones inside the hiveWhale
                        if (enemy.type == "hivewhale") {
                            for (let i = 0; i < 4; i += 1) {
                                this.enemies.push(new Drone(this, enemy.x + Math.random() * enemy.width * 0.5, enemy.y + Math.random() * enemy.height * 0.5));
                            }
                        }
                        // add explosion at the place of the collision with the projectile
                        this.addExplosion(enemy);
                    }
                }
            });
            // remove the marked for deletion enemies
            this.enemies = this.enemies.filter((enemy) => !enemy.markedForDeletion);
        });
        // update particles
        this.particles.forEach((particle) => particle.update(deltaTime));
        // remove the particles marked for deletion
        this.particles = this.particles.filter((particle) => !particle.markedForDeletion);
        // update explosions
        this.explosions.forEach((explosion) => explosion.update(deltaTime));
        // remove marked for deletion explosions
        this.explosions = this.explosions.filter((explosion) => !explosion.markedForDeletion);
    }
    draw(context) {
        context.save();
        // draw background
        this.background.draw(context);
        // draw the UI
        this.ui.draw(context);
        // draw player
        this.player.draw(context);
        // draw particles
        this.particles.forEach((particle) => particle.draw(context));
        // draw enemies
        this.enemies.forEach((enemy) => enemy.draw(context));
        //draw explosions
        this.explosions.forEach((explosion) => explosion.draw(context));
        // draw front layer
        this.background.layer4.draw(context);
        context.restore();
    }
    addEnemy() {
        let enemyType = this.chooseEnemyType();
        if (enemyType === "angler1") {
            this.enemies.push(new Angler1(this));
        }
        else if (enemyType == "angler2") {
            this.enemies.push(new Angler2(this));
        }
        else if (enemyType == "hiveWhale") {
            this.enemies.push(new Hivewhale(this));
        }
        else if (enemyType == "lucky") {
            this.enemies.push(new Lucky(this));
        }
    }
    checkCollisions(rectangle1, rectangle2) {
        let topLeftCorner;
        let topRightCorner;
        let bottomLeftCorner;
        let bottomRightCorner;
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
        return (topLeftCorner || topRightCorner || bottomLeftCorner || bottomRightCorner);
    }
    chooseEnemyType() {
        let enemyType;
        let randomNumber = Math.random() * 100;
        if (randomNumber >= 0 && randomNumber <= 30) {
            enemyType = "angler1";
        }
        if (randomNumber > 30 && randomNumber <= 60) {
            enemyType = "angler2";
        }
        if (randomNumber > 60 && randomNumber < 90) {
            enemyType = "lucky";
        }
        if (randomNumber > 90 && randomNumber <= 100) {
            enemyType = "hiveWhale";
        }
        return enemyType;
    }
    addExplosion(enemy) {
        const randomize = Math.random();
        if (randomize < 0.5) {
            this.explosions.push(new SmokeExplosion(this, enemy.x + enemy.width * 0.5, enemy.y + enemy.height * 0.5));
        }
        else if (randomize > 0.5) {
            this.explosions.push(new FireExplosion(this, enemy.x + enemy.width * 0.5, enemy.y + enemy.height * 0.5));
        }
    }
}
class Player extends Rectangle {
    projectiles;
    powerUp;
    powerUpTimer = 0;
    powerUpLimit = 10000;
    constructor(game) {
        super(game);
        this.width = 120;
        this.height = 190;
        this.x = 20;
        this.y = 100;
        this.maxSpeedY = 5;
        this.maxSpeedX = 5;
        this.maxFrame = 35;
        this.projectiles = [];
        this.image = document.getElementById("playerImage");
        this.lives = 20;
        this.powerUp = false;
        this.powerUpTimer = 0;
        this.powerUpLimit = 10000;
    }
    update(deltaTime) {
        // handles motion of the player
        if (this.game.input.includes("ArrowUp"))
            this.speedY = -this.maxSpeedY;
        if (this.game.input.includes("ArrowDown"))
            this.speedY = +this.maxSpeedY;
        if (!this.game.input.includes("ArrowUp") &&
            !this.game.input.includes("ArrowDown")) {
            this.speedY = 0;
        }
        if (this.game.input.includes("ArrowLeft"))
            this.speedX = -this.maxSpeedX;
        if (this.game.input.includes("ArrowRight"))
            this.speedX = this.maxSpeedX;
        if (!this.game.input.includes("ArrowLeft") &&
            !this.game.input.includes("ArrowRight")) {
            this.speedX = 0;
        }
        // update the projectiles
        this.projectiles.forEach((projectile) => {
            projectile.update(deltaTime);
        });
        // player remove the projectiles marked for deletion
        this.projectiles = this.projectiles.filter((projectile) => !projectile.markedForDeletion);
        // animate the player;
        if (this.frameX < this.maxFrame) {
            this.frameX++;
        }
        else {
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
        if (this.y < -this.height * 0.5)
            this.y = -this.height * 0.5;
        // check powerUp
        if (this.powerUp) {
            if (this.powerUpTimer > this.powerUpLimit) {
                this.powerUp = false;
                this.powerUpTimer = 0;
                this.frameY = 0;
            }
            else {
                this.powerUpTimer += deltaTime;
                this.frameY = 1;
                if (this.game.ammo < this.game.maxAmmo)
                    this.game.ammo += 0.1;
            }
        }
    }
    draw(context) {
        context.save();
        // draw the projectiles
        this.projectiles.forEach((projectile) => projectile.draw(context));
        // draw the player
        if (this.game.debugMode) {
            context.strokeRect(this.x, this.y, this.width, this.height);
        }
        context.drawImage(this.image, this.frameX * this.width, this.frameY * this.height, this.width, this.height, this.x, this.y, this.width, this.height);
        context.restore();
    }
    shootTop() {
        if (this.game.ammo >= 1) {
            this.projectiles.push(new Projectile(this.game, this.x + 80, this.y + 30));
            if (this.powerUp) {
                this.shootDown();
            }
            this.game.shootAudio.load();
            this.game.shootAudio.play();
            this.game.ammo--;
        }
    }
    shootDown() {
        if (this.game.ammo > 0) {
            this.projectiles.push(new Projectile(this.game, this.x + 80, this.y + 175));
        }
    }
    enterPowerUp() {
        this.powerUp = true;
        this.powerUpTimer = 0;
        if (this.game.ammo < this.game.maxAmmo) {
            this.game.ammo = this.game.maxAmmo;
        }
    }
}
class InputHandler {
    game;
    constructor(game) {
        this.game = game;
        document.addEventListener("keydown", (event) => {
            // handle movement of the player and shoot
            if ((event.key === "ArrowDown" ||
                event.key === "ArrowUp" ||
                event.key == "ArrowLeft" ||
                event.key == "ArrowRight") &&
                this.game.input.indexOf(event.key) == -1) {
                this.game.input.push(event.key);
            }
            else if (event.key === " ") {
                this.game.player.shootTop();
            }
            else if (event.key == "d") {
                this.game.debugMode = !this.game.debugMode;
            }
            if (!this.game.gameStarted) {
                this.game.gameStarted = true;
                //this.game.backgroundAudio.load();
                //this.game.backgroundAudio.play();
                //this.game.backgroundAudio.loop = true;
            }
        });
        document.addEventListener("keyup", (event) => {
            let index = this.game.input.indexOf(event.key);
            if (index !== -1) {
                this.game.input.splice(index, 1);
            }
        });
    }
}
class Enemy extends Rectangle {
    type;
    constructor(game) {
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
    update(deltaTime) {
        this.x += this.speedX - this.game.speed;
        if (this.x < 0) {
            this.markedForDeletion = true;
        }
        if (this.frameX < this.maxFrame) {
            this.frameX++;
        }
        else {
            this.frameX = 0;
        }
    }
    draw(context) {
        context.save();
        context.drawImage(this.image, this.frameX * this.width, this.frameY * this.height, this.width, this.height, this.x, this.y, this.width, this.height);
        if (this.game.debugMode) {
            context.strokeRect(this.x, this.y, this.width, this.height);
            context.font = "20px helvetica";
            context.fillText(this.lives.toString(), this.x, this.y);
        }
        context.restore();
    }
}
class Angler1 extends Enemy {
    constructor(game) {
        super(game);
        this.width = 228;
        this.height = 169;
        this.image = document.getElementById("angler1");
        this.y = Math.random() * (this.game.height * 0.95 - this.height);
        this.frameY = Math.floor(Math.random() * 3);
        this.maxFrame = 37;
        this.lives = 3;
        this.score = this.lives;
    }
}
class Angler2 extends Enemy {
    constructor(game) {
        super(game);
        this.width = 213;
        this.height = 169;
        this.y = Math.random() * (this.game.height * 0.95 - this.height);
        this.image = document.getElementById("angler2");
        this.frameY = Math.floor(Math.random() * 2);
        this.maxFrame = 37;
        this.lives = 3;
        this.score = this.lives;
    }
}
class Drone extends Enemy {
    constructor(game, x, y) {
        super(game);
        this.x = x;
        this.y = y;
        this.width = 115;
        this.height = 95;
        this.y = Math.random() * (this.game.height * 0.95 - this.height);
        this.frameX = Math.random() * -4.2 - 0.5;
        this.image = document.getElementById("drone");
        this.frameY = Math.floor(Math.random() * 2);
        this.maxFrame = 37;
        this.lives = 1;
        this.score = this.lives;
    }
}
class Lucky extends Enemy {
    constructor(game) {
        super(game);
        this.width = 99;
        this.height = 95;
        this.y = Math.random() * (this.game.height * 0.95 - this.height);
        this.image = document.getElementById("lucky");
        this.frameY = Math.floor(Math.random() * 2);
        this.maxFrame = 37;
        this.lives = 1;
        this.score = 15;
        this.type = "lucky";
    }
}
class Hivewhale extends Enemy {
    constructor(game) {
        super(game);
        this.width = 400;
        this.height = 227;
        this.y = Math.random() * (this.game.height * 0.95 - this.height);
        this.image = document.getElementById("hiveWhale");
        this.maxFrame = 37;
        this.lives = 15;
        this.score = this.lives;
        this.speedX = Math.random() * -1.2 - 0.2;
        this.type = "hivewhale";
    }
}
class Projectile extends Rectangle {
    constructor(game, x, y) {
        super(game);
        this.x = x;
        this.y = y;
        this.width = 28;
        this.height = 10;
        this.maxSpeedX = 5;
        this.speedX = this.maxSpeedX;
        this.maxFrame = 10;
        this.image = document.getElementById("projectile");
    }
    update(deltaTime) {
        this.x += this.speedX;
        if (this.x > this.game.width * 0.9) {
            this.markedForDeletion = true;
        }
        if (this.frameX < this.maxFrame) {
            this.frameX++;
        }
        else {
            this.frameX = 0;
            this.frameY += 1;
        }
        if (this.frameY >= 8) {
            this.frameY = 0;
        }
    }
    draw(context) {
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
    game;
    color;
    fontSize;
    fontFamily;
    constructor(game) {
        this.game = game;
        this.color = "white";
        this.fontSize = 25;
        this.fontFamily = "Dancing Script";
    }
    draw(context) {
        context.save();
        context.shadowOffsetX = 2;
        context.shadowOffsetY = 2;
        context.shadowColor = "black";
        context.fillStyle = this.color;
        //score
        context.font = this.fontSize + "px " + this.fontFamily;
        context.fillText("Score: " + this.game.score, 20, 40);
        // timer
        const formattedTime = (this.game.gameTime * 0.001).toFixed(1);
        context.fillText("Timer: " + formattedTime, 20, 100);
        // game over messages
        if (this.game.gameOver) {
            context.textAlign = "center";
            let message1;
            let message2;
            if (this.game.score > this.game.winningScore) {
                message1 = "Most Wondrous!";
                message2 = "well done explorer!";
            }
            else {
                message1 = "Blazes!";
                message2 = "Get my repair kit and try again!";
            }
            context.font = "70px " + this.fontFamily;
            context.fillText(message1, this.game.width * 0.5, this.game.height * 0.5 - 20);
            context.font = "25px " + this.fontFamily;
            context.fillText(message2, this.game.width * 0.5, this.game.height * 0.5 + 20);
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
    speedModifier;
    constructor(game, image, speedModifier) {
        super(game);
        this.image = image;
        this.speedModifier = speedModifier;
        this.width = this.game.width;
        this.height = this.game.height;
        //this.height = this.game.height;
    }
    update(deltaTime) {
        if (this.x <= -this.width)
            this.x = 0;
        this.x -= this.game.speed * this.speedModifier;
    }
    draw(context) {
        context.drawImage(this.image, this.x, this.y, this.width, this.height);
        context.drawImage(this.image, this.x + this.width, this.y, this.width, this.height);
    }
}
class Background {
    game;
    image1;
    image2;
    image3;
    image4;
    layer1;
    layer2;
    layer3;
    layer4;
    layers;
    constructor(game) {
        this.game = game;
        this.image1 = document.getElementById("layer1");
        this.image2 = document.getElementById("layer2");
        this.image3 = document.getElementById("layer3");
        this.image4 = document.getElementById("layer4");
        this.layer1 = new Layer(this.game, this.image1, 0.1);
        this.layer2 = new Layer(this.game, this.image2, 0.3);
        this.layer3 = new Layer(this.game, this.image3, 1);
        this.layer4 = new Layer(this.game, this.image4, 1.5);
        this.layers = [];
        this.layers.push(this.layer1, this.layer2, this.layer3);
    }
    update(deltaTime) {
        this.layers.forEach((layer) => layer.update(deltaTime));
    }
    draw(context) {
        this.layers.forEach((layer) => layer.draw(context));
    }
}
class Particle extends Rectangle {
    spriteSize;
    sizeModifier;
    size;
    gravity;
    angle;
    va;
    bounce;
    bottomBounceBoundary;
    bounceLimit;
    constructor(game, x, y) {
        super(game);
        this.x = x;
        this.y = y;
        this.image = document.getElementById("gears");
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
    update(deltaTime) {
        this.angle += this.va;
        this.speedY += this.gravity;
        this.x += this.speedX + this.game.speed;
        this.y += this.speedY;
        // if the has to be deleted
        if (this.y > this.game.height - this.size ||
            this.x < -this.size ||
            this.x > this.width - this.size) {
            this.markedForDeletion = true;
        }
        // make the particle bounce
        if (this.bounce < this.bounceLimit &&
            this.y > this.game.height - this.bottomBounceBoundary) {
            this.bounce++;
            this.speedY *= -0.7;
        }
    }
    draw(context) {
        context.save();
        context.translate(this.x, this.y);
        context.rotate(this.angle);
        context.drawImage(this.image, this.frameX * this.spriteSize, this.frameY * this.spriteSize, this.spriteSize, this.spriteSize, 0 - this.size * 0.5, // very important
        0 - this.size * 0.5, // very important
        this.size, this.size);
        context.restore();
    }
}
class Explosion extends Rectangle {
    spriteHeight;
    spriteWidth;
    fps;
    interval;
    timer;
    constructor(game, x, y) {
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
    update(deltaTime) {
        this.x -= this.game.speed;
        if (this.timer > this.interval) {
            this.frameX++;
            this.timer = 0;
        }
        else {
            this.timer += deltaTime;
        }
        if (this.frameX > this.maxFrame)
            this.markedForDeletion = true;
    }
    draw(context) {
        context.drawImage(this.image, this.frameX * this.spriteWidth, this.frameY, this.spriteWidth, this.spriteHeight, this.x, this.y, this.width, this.height);
    }
}
class SmokeExplosion extends Explosion {
    constructor(game, x, y) {
        super(game, x, y);
        this.image = document.getElementById("smokeExplosion");
    }
}
class FireExplosion extends Explosion {
    constructor(game, x, y) {
        super(game, x, y);
        this.image = document.getElementById("fireExplosion");
    }
}
