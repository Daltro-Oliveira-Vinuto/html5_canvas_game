window.addEventListener("load", function () {
    const canvas = document.getElementById("gameArea");
    canvas.width = 1500;
    canvas.height = 900;
    const canvasContext = canvas.getContext("2d");
    const game = new Game(canvas);
    // animation loop
    let lastTime = 0;
    function animate(timeStamp) {
        const deltaTime = timeStamp - lastTime;
        lastTime = timeStamp;
        canvasContext.fillRect(0, 0, canvas.width, canvas.height);
        game.update(deltaTime);
        game.draw(canvasContext);
        requestAnimationFrame(animate);
    }
    animate(0);
});
class Rectangle {
    _x;
    _y;
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
class Game {
    canvas;
    width;
    height;
    player;
    inputHandler;
    ui;
    enemies;
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
    constructor(canvas) {
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
        this.backgroundAudio = document.getElementById("backgroundSound");
        this.collisionAudio = document.getElementById("collisionSound");
        this.explosionAudio = document.getElementById("explosionSound");
        this.shootAudio = document.getElementById("shootSound");
        this.playerLife = 20;
    }
    update(deltaTime) {
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
        }
        else {
            this.ammoTimer += deltaTime;
        }
        // add a new enemie of type angler1 per second
        if (this.enemyTimer > this.enemyInterval && !this.gameOver) {
            if (this.enemies.length < this.maxEnemies) {
                this.addEnemy("angler1");
                this.enemyTimer = 0;
            }
        }
        else {
            this.enemyTimer += deltaTime;
        }
        //update enemies
        this.enemies.forEach((enemy) => {
            enemy.update(deltaTime);
            // check if some enemy collide with the player
            let collided = this.checkCollisions(this.player, enemy) ||
                this.checkCollisions(enemy, this.player);
            if (collided) {
                // mark enemy for deletion
                enemy.markedForDeletion = true;
                // decrease the live of the player
                this.player.lives -= 1;
                // if player don't have lives than remove player and game over
                if (this.player.lives <= 0)
                    this.player.markedForDeletion = true;
                // play collision sound
                this.collisionAudio.load();
                this.collisionAudio.play();
            }
            // verify if each projectile collided with some enemy
            this.player.projectiles.forEach((projectile) => {
                let collided = this.checkCollisions(projectile, enemy);
                if (collided) {
                    // marke projectile for deletion
                    projectile.markedForDeletion = true;
                    // decrease the lives of the enemy
                    enemy.lives--;
                    // if enemy don't have lives than mark him for deletion
                    if (enemy.lives <= 0)
                        enemy.markedForDeletion = true;
                    this.explosionAudio.load();
                    this.explosionAudio.play();
                }
            });
            // remove the marked for deletion enemies
            this.enemies = this.enemies.filter((enemy) => !enemy.markedForDeletion);
        });
    }
    draw(context) {
        context.save();
        // draw enemies
        this.enemies.forEach((enemy) => enemy.draw(context));
        // draw player
        this.player.draw(context);
        // draw the UI
        this.ui.draw(context);
        context.restore();
    }
    addEnemy(enemyType) {
        if (enemyType === "angler1") {
            this.enemies.push(new Angler(this));
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
}
class Player extends Rectangle {
    projectiles;
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
        this.lives = 5;
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
        if (this.y <= 0 || this.y + this.height >= this.game.height)
            this.y -= this.speedY;
        if (this.x <= 0 || this.x + this.width >= this.game.width)
            this.x -= this.speedX;
    }
    draw(context) {
        context.save();
        // draw the projectiles
        this.projectiles.forEach((projectile) => projectile.draw(context));
        // draw the player
        context.drawImage(this.image, this.frameX * this.width, this.frameY * this.height, this.width, this.height, this.x, this.y, this.width, this.height);
        context.restore();
    }
    shootTop() {
        if (this.game.ammo > 0) {
            this.projectiles.push(new Projectile(this.game, this.x + this.width * 0.9, this.y + 30));
            this.game.shootAudio.load();
            this.game.shootAudio.play();
            this.game.ammo--;
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
            if (!this.game.gameStarted) {
                this.game.gameStarted = true;
                this.game.backgroundAudio.load();
                this.game.backgroundAudio.play();
                this.game.backgroundAudio.loop = true;
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
    constructor(game) {
        super(game);
        this.x = this.game.width;
        this.y = Math.random() * (this.game.height * 0.8);
        this.speedX = Math.random() * -1.5 - 1;
        this.width = 50;
        this.height = 50;
        this.color = this.generateRandomColor();
        this.lives = 1;
    }
    update(deltaTime) {
        this.x += this.speedX;
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
        context.restore();
    }
}
class Angler extends Enemy {
    constructor(game) {
        super(game);
        this.width = 228;
        this.height = 169;
        this.image = document.getElementById("angler1");
        this.maxFrame = 37;
        this.lives = 3;
    }
}
class Projectile extends Rectangle {
    constructor(game, x, y) {
        super(game);
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 10;
        this.maxSpeedX = 5;
        this.speedX = this.maxSpeedX;
    }
    update(deltaTime) {
        this.x += this.speedX;
        if (this.x > this.game.width * 0.9) {
            this.markedForDeletion = true;
        }
    }
    draw(context) {
        context.save();
        context.fillStyle = "#ff0000";
        context.fillRect(this.x, this.y, this.width, this.height);
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
        this.color = "yellow";
        this.fontSize = 25;
        this.fontFamily = "Helvetica";
    }
    draw(context) {
        context.save();
        context.fillStyle = this.color;
        for (let i = 0; i < this.game.ammo; i++) {
            context.fillRect(20 + i * 10, 50, 3, 20);
        }
        context.restore();
    }
}
class Layer {
}
class Background {
}
class Particle {
}
//# sourceMappingURL=index.js.map