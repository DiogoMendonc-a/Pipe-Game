// Asynchronous IIFE
(async () =>
    {
        // Game Values
        // Grid
        const GRID_WIDTH = 9
        const GRID_HEIGHT = 7
        const TILE_SIZE = 32
        const MAX_BLOCKED_TILES = 8
        const GRID_HORIZONTAL_OFFSET = 64 // How wide a margin to leave to the right of the grid.

        // Tile queue 
        const QUEUE_SIZE = 5

        // Objective
        const MINIMUM_GOAL_LENGTH = 5
        const MAXIMUM_GOAL_LENGTH = 10

        // Water timers
        const DELAY_UNTIL_WATER_FLOW = 10000.0
        const WATER_TICK_TIME = 1000.0

        // Text
        const TEXT_FONT_SIZE = 64
        const GOAL_TEXT_SIZE = 18
        const END_TEXT_SIZE = 24

        // Screen shake
        const SCREEN_SHAKE_TIME = 100.0
        const SCREEN_SHAKE_AMPLITUDE = 2
        const SCREEN_SHAKE_SPEED = 20

        /**
         * Grid representing the game area.
         */
        class Grid {
            /**
             * 
             * @param {number} width Number of tiles per row.
             * @param {number} height Number of tiles per column.
             * @param {number} tileSize Width or height of each tile, in pixels. Tiles are assumed square.
             * @param {number} maxBlockedTiles Maximum number of tile where the player can't place pipes.
             * @param {number} offset Number of pixels the entire grid is moved horizontally.
             */
            constructor(width, height, tileSize, maxBlockedTiles, offset) {
                this.width = width
                this.height = height
                this.offset = offset
                this.tiles = [width * height]
                
                // Create empty tiles
                let emptyType = new EmptyTileType()
                for (let i = 0; i < this.width; i++) {
                    for (let j = 0; j < this.height; j++) {
                        this.tiles[i * width + j] = new GridTile(i, j, tileSize, emptyType)
                        this.tiles[i * width + j].drawOffset = this.offset
                        this.tiles[i * width + j].updateSpriteTransform()
                    }
                }
                
                // Set starting tile
                {
                    let x = Math.floor(Math.random() * this.width)
                    let y = Math.floor(Math.random() * (this.height - 1))
                    waterHeadTile = this.getTile(x,y)
                    waterHeadTile.setType(new StartTileType())
                }   
                
                // Set blocked tiles
                let blockedType = new BlockedTileType()
                for (let index = 0; index < maxBlockedTiles; index++) {
                    let x = Math.floor(Math.random() * this.width)
                    let y = Math.floor(Math.random() * this.height)
                    let tile = this.getTile(x, y)

                    if(tile === waterHeadTile) continue

                    var upNeighbour = this.getNeighbour(tile, Directions.UP)
                    if (upNeighbour === null) continue
                    if (upNeighbour === waterHeadTile) continue

                    this.getTile(x, y).setType(blockedType)
                }

            }

            /**
             * Gets the tile in given coordinates.
             * @param {number} x The x coordinate.
             * @param {number} y The y coordinate.
             * @returns {Tile} The tile in the coordinates.
             */
            getTile(x, y) {
                return this.tiles[x * this.width + y]
            }

            /**
             * Gets the tile that neighbours another in a given direction.
             * @param {GridTile} tile Target tile.
             * @param {Directions} direction Direction in which to search.
             * @returns {Tile} The neighbouring tile if it exists, `null` otherwise
             */
            getNeighbour(tile, direction) {
                switch (direction) {
                    case Directions.UP:
                        if(tile.y > 0) {
                            return this.getTile(tile.x, tile.y - 1)
                        }
                        break
                    case Directions.RIGHT:
                        if(tile.x < grid.width - 1) {
                            return this.getTile(tile.x + 1, tile.y)
                        }
                        break
                    case Directions.DOWN:
                        if(tile.y < grid.height - 1) {
                            return this.getTile(tile.x, tile.y + 1)
                        }
                        break
                    case Directions.LEFT:
                        if(tile.x > 0) {
                            return this.getTile(tile.x - 1, tile.y)
                        }    
                        break
                    default:
                        break
                }
                return null
            }
        }
        
        // A tile to be drawn in the world.
        class Tile {
            /**
             * 
             * @param {number} x Horizontal position of the tile.
             * @param {number} y Vertical position of the tile.
             * @param {number} tileSize Tile width in pixels.
             * @param {number} angle rotation of the tile in degrees.
             */
            constructor(x, y, tileSize, angle) {
                this.x = x
                this.y = y
                this.tileSize = tileSize
                this.angle = angle
                this.drawOffset = 0
            }

            /**
             * Creates the tile's sprite.
             * @param {PIXI.Texture} texture Texture to set.
             */
            setSprite(texture) {
                this.sprite = new PIXI.Sprite(texture)
                app.stage.addChild(this.sprite)
                this.updateSpriteTransform()
            }

            /**
             * Updates the transform of the sprite container to reflect the tile's data.
             */
            updateSpriteTransform() {
                this.sprite.anchor.set(0.5)
                this.sprite.x = this.drawOffset + this.x * this.tileSize + this.tileSize / 2
                this.sprite.y = this.y * this.tileSize + this.tileSize / 2
                this.sprite.angle = this.angle
            }
        }

        /**
         * Tile that can hold a pipe.
         */
        class PipeTile extends Tile {
            /**
             * 
             * @param {number} x Horizontal position of the tile.
             * @param {number} y Vertical position of the tile.
             * @param {number} tileSize Tile width in pixels.
             * @param {TileType} type The Type of this tile.
             */
            constructor(x, y, tileSize, type) {
                super(x, y, tileSize, type.getAngle())
                this.type = type
                this.setSprite()
            }

            setSprite() {
                super.setSprite(this.type.texture)
            }

            /**
             * Sets the type of this tyle, reloading its sprite.
             * @param {TileType} type Type to be set.
             */
            setType(type) {
                this.type = type
                this.angle = this.type.getAngle()
                this.setSprite()
            }
        }

        /**
         * Tile belonging to the playable grid.
         */
        class GridTile extends PipeTile {
            /**
             * 
             * @param {number} x Horizontal position of the tile.
             * @param {number} y Vertical position of the tile.
             * @param {number} tileSize Tile width in pixels.
             * @param {TileType} type The Type of this tile.
             */
            constructor(x, y, tileSize, type) { 
                super(x, y, tileSize, type)
                this.openConnections = type.getConnections()
                this.locked = false
            }

            setSprite() {
                super.setSprite(this.type.texture)
                if(this.type.replaceable) {
                    this.sprite.on('pointerdown', () => { deployPipeOnTile(this) })
                    this.sprite.eventMode = 'static'
                }
            }

            setType(type) {
                super.setType(type)
                this.openConnections = type.getConnections()
            }            

            /**
             * Checks if a connection from the tile is traversable.
             * @param {Directions} direction Direction to test.
             * @returns {boolean} Wether that direction is still traversable.
             */
            canConnectTo(direction) {
                    return this.openConnections.includes(direction)
            }

            /**
             * Closes a direction, forbiding further water passage.
             * @param {Directions} direction Direction to close.
             */
            closeConnection(direction) {
                var oldConnections = this.openConnections
                this.openConnections = []
                oldConnections.forEach(element => {
                    if(element != direction) {
                        this.openConnections.push(element)
                    }
                })
            }
        }

        /**
         * Holds the data for each type of tile.
         */
        class TileType {
            /**
             * 
             * @param {PIXI.Texture} texture The type's texture.
             */
            constructor(texture) {
                this.texture = texture
                this.replaceable = true
            }

            /**
             * The angle the sprite must be rotate by when displaying tiles of this type.
             * @returns {number} Angle
             */
            getAngle() {
                return 0
            }

            /**
             * Connections this type of tile can accept.
             * @returns {Directions} Connections directions.
             */
            getConnections() {
                return []
            }
        }
        
        class StartTileType extends TileType {
            constructor() {
                super(startTexture)
                this.replaceable = false
            }

            getConnections() {
                return [Directions.DOWN]
            }
        }

        class BlockedTileType extends TileType {
            constructor() {
                super(blockedTexture)
                this.replaceable = false
            }

            getConnections() {
                return []
            }
        }
        
        class EmptyTileType extends TileType {
            constructor() {
                super(emptyTexture)
            }
        }

        class CrossTileType extends TileType {
            constructor() {
                super(crossTexture)
            }        

            getConnections() {
                return [Directions.UP, Directions.RIGHT, Directions.DOWN, Directions.LEFT]
            }
        }

        class StraightTileType extends TileType {
            constructor(vertical) {
                super(straigthTexture)
                this.vertical = vertical
            }
            
            getAngle() {
                return this.vertical ? 90 : 0
            }  

            getConnections() {
                return this.vertical ? [Directions.UP, Directions.DOWN] : [Directions.RIGHT, Directions.LEFT]
            }
        }

        class CurvedTileType extends TileType {
            constructor(direction) {
                super(curvedTexture)
                this.direction = direction
            }        
            
            getAngle() {
                switch(this.direction) {
                    case CurvedDirections.UPLEFT:
                        return 0
                    case CurvedDirections.UPRIGHT:
                        return 90
                    case CurvedDirections.DOWNLEFT:
                        return 270
                    case CurvedDirections.DOWNRIGHT:
                        return 180
                }
            }  

            getConnections() {
                switch(this.direction) {
                    case CurvedDirections.UPLEFT:
                        return [Directions.UP, Directions.LEFT]
                    case CurvedDirections.UPRIGHT:
                        return [Directions.UP, Directions.RIGHT]
                    case CurvedDirections.DOWNLEFT:
                        return [Directions.DOWN, Directions.LEFT]
                    case CurvedDirections.DOWNRIGHT:
                        return [Directions.DOWN, Directions.RIGHT]
                }
            }  
        }
        
        /**
         * Tile to be drawn on top of the grid, representing the water flow.
         */
        class WaterOverlayTile extends Tile {
        }

        class WaterSideTile extends WaterOverlayTile {
            constructor(x, y, tileSize, direction) {
                switch (direction) {
                    case Directions.UP:
                        super(x, y, tileSize, 180)
                        break
                    case Directions.RIGHT:
                        super(x, y, tileSize, 270)
                        break
                    case Directions.DOWN:
                        super(x, y, tileSize, 0)
                        break
                    case Directions.LEFT:
                        super(x, y, tileSize, 90)
                        break
                    default:
                        super(x, y, tileSize, 0)
                        break
                    }
                this.drawOffset = grid.offset
                this.setSprite(waterSideTexture)
            }
        }

        class WaterCenterTile extends WaterOverlayTile {
            constructor(x, y, tileSize) {
                super(x, y, tileSize, 0)
                this.drawOffset = grid.offset
                this.setSprite(waterCenterTexture)
            }
        }

        /**
         * Picks a random tile type from the available types.
         * @returns A random Tile.
         */
        function getRandomTileType() {
            return tileTypes[Math.floor(Math.random() * tileTypes.length)]
        }

        /**
         * Replaces a tile's type, if the tile allows it.
         * @param {GridTile} tile Tile that was pressed.
         */
        function deployPipeOnTile(tile) {
            if(lost) return
            if(!tile.type.replaceable) return
            if(tile.locked) return

            tile.setType(queue[0].type)
            queue.shift()
            queue.forEach(element => {
                element.y += 1
                element.updateSpriteTransform()
            })

            queue.push(new PipeTile(0, 0, queue[0].tileSize, getRandomTileType()))
            screenShakeRemainingTime = SCREEN_SHAKE_TIME
        }

        /**
         * Picks a neighbouring tile to the water head for the water to flow towards.
         * If it is not found, loss is triggered.
         * If it is found, the connection is closed and water begins to flow through the segment.
         */
        function pickWaterGoal() {
            var validNeighbours = []
            waterHeadTile.openConnections.forEach((connection) => {
                var neighbour = grid.getNeighbour(waterHeadTile, connection)
                if(neighbour === null) {
                    return
                }
                if(neighbour.canConnectTo(getOppositeDirection(connection))) {
                    validNeighbours.push([connection, neighbour])
                }
            })

            if(validNeighbours.length === 0) {
                if(!won) {
                    const text = new PIXI.Text({
                        text: 'You Lose!',
                        style: {
                            fontFamily: 'Arial',
                            fontSize: TEXT_FONT_SIZE,
                            fill: 0xff1010,
                            align: 'center',
                        }
                    })
                    text.x = (TILE_SIZE * GRID_WIDTH / 2)
                    text.y = TILE_SIZE * GRID_HEIGHT / 2
                    text.zIndex = 10
                    setTextHeight(text, END_TEXT_SIZE)
                    app.stage.addChild(text)
                }
                    
                lost = true
                return
            }

            waterGoalDirection = validNeighbours[0][0]
            waterGoalTile = validNeighbours[0][1]

            waterHeadTile.closeConnection(waterGoalDirection)
            waterGoalTile.closeConnection(getOppositeDirection(waterGoalDirection))
            waterGoalTile.locked = true
        }

        /**
         * Wraps up water movement towards a tile and checks for victory.
         */
        function finishWaterTick() {
            waterHeadTile = waterGoalTile
            waterLength += 1
            if(waterLength === goalLength && !won) {
                const text = new PIXI.Text({
                    text: 'You Win!',
                    style: {
                        fontFamily: 'Arial',
                        fontSize: TEXT_FONT_SIZE,
                        fill: 0x10ff10,
                        align: 'center',
                    }
                })
                text.x = (TILE_SIZE * GRID_WIDTH / 2)
                text.y = TILE_SIZE * GRID_HEIGHT / 2
                text.zIndex = 10
                setTextHeight(text, END_TEXT_SIZE)
                app.stage.addChild(text)

                won = true
            }
        }

        /**
         * Resizes the renderer and stage to fit without windows of varying sizes.
         */
        function resize() {
            if (window.innerWidth / window.innerHeight >= ratio) {
                var w = window.innerHeight * ratio
                var h = window.innerHeight
            } else {
                var w = window.innerWidth
                var h = window.innerWidth / ratio
            }
            app.renderer.resize(w, h)
            app.stage.scale = w / (GRID_HORIZONTAL_OFFSET + (GRID_WIDTH + 2) * TILE_SIZE)
        }

        const CurvedDirections = Object.freeze({
            UPLEFT:     0,
            UPRIGHT:    1,
            DOWNLEFT:   2,
            DOWNRIGHT:  3
        })

        const Directions = Object.freeze({
            UP:     0,
            RIGHT:  1,
            DOWN:   2,
            LEFT:   3
        })

        /**
         * Gets the direction opposite of the one given.
         * @param {Directions} direction 
         * @returns Opposite direction.
         */
        function getOppositeDirection(direction) {
            switch (direction) {
                case Directions.UP:
                    return Directions.DOWN
                case Directions.RIGHT:
                    return Directions.LEFT
                case Directions.DOWN:
                    return Directions.UP
                case Directions.LEFT:
                    return Directions.RIGHT
            }
        }

        /**
         * Changes text height, while maintaining the container's aspect ratio.
         * @param {PIXI.Text} text Text object to modify.
         * @param {*} height Target height.
         */
        function setTextHeight(text, height) {
            let ratio =  text.width / text.height
            text.height = height
            text.width = height * ratio
        }

        /**
         * Loads a texture from a file.
         * @param {String} path Path to file containing the texture.
         * @returns Loaded texture.
         */
        async function loadTexture(path) {
            let texture = await PIXI.Assets.load(path)
            texture.source. scaleMode = PIXI.SCALE_MODES.NEAREST
            return texture
        }

        // Init PIXI
        const app = new PIXI.Application()        
        await app.init({ background: '#00090b', resizeTo: window })
        document.body.appendChild(app.canvas)

        // Set window size
        let ratio = (GRID_WIDTH * TILE_SIZE + GRID_HORIZONTAL_OFFSET) / (GRID_HEIGHT * TILE_SIZE + GOAL_TEXT_SIZE * 2)
        resize()
        window.onresize = resize
 
        // Load textures
        const startTexture = await loadTexture('textures/start.png')
        const blockedTexture = await loadTexture('textures/blocked.png')

        const emptyTexture = await loadTexture('textures/empty.png')

        const crossTexture = await loadTexture('textures/cross.png')
        const straigthTexture = await loadTexture('textures/straight.png')
        const curvedTexture  = await loadTexture('textures/curved.png')

        const waterCenterTexture = await loadTexture('textures/water_center.png')
        const waterSideTexture = await loadTexture('textures/water_side.png')
        
        // Set tile types
        const tileTypes = [
            new CrossTileType(),
            new StraightTileType(false),
            new StraightTileType(true),
            new CurvedTileType(CurvedDirections.UPLEFT),
            new CurvedTileType(CurvedDirections.UPRIGHT),
            new CurvedTileType(CurvedDirections.DOWNLEFT),
            new CurvedTileType(CurvedDirections.DOWNRIGHT)
        ]
        
        // Generate game
        var waterHeadTile
        const grid = new Grid(GRID_WIDTH, GRID_HEIGHT, TILE_SIZE, MAX_BLOCKED_TILES, GRID_HORIZONTAL_OFFSET)
        const queue = []

        for (let index = 0; index < QUEUE_SIZE; index++) {
            queue.push(new PipeTile(0, QUEUE_SIZE - 1 - index, TILE_SIZE, getRandomTileType()))
        }

        // Set timers
        var initCooldown = DELAY_UNTIL_WATER_FLOW
        var waterCooldown = WATER_TICK_TIME

        // Set end game flags
        var lost = false
        var won = false

        // Set goal
        var goalLength = Math.floor(Math.random() * (MAXIMUM_GOAL_LENGTH - MINIMUM_GOAL_LENGTH) + MINIMUM_GOAL_LENGTH)
        var waterLength = 0


        const goalText = new PIXI.Text({
            text: 'Goal: ' + goalLength,
            style: {
                fontFamily: 'Arial',
                fontSize: TEXT_FONT_SIZE,
                fill: 0xffffff,
                align: 'top-left',
            }
        })
        goalText.x = 0
        goalText.y = TILE_SIZE * GRID_HEIGHT
        goalText.zIndex = 10
        setTextHeight(goalText, GOAL_TEXT_SIZE)
        app.stage.addChild(goalText)
        
        // Set water tick phases
        let waterTickPhase = 0
        var waterGoalTile
        var waterGoalDirection
        
        const countdownText = new PIXI.Text({
            text: 'Water in: ' + initCooldown,
            style: {
                fontFamily: 'Arial',
                fontSize: TEXT_FONT_SIZE,
                fill: 0x1111ff,
                align: 'top-left',
            }
        })
        countdownText.x = 0
        countdownText.y = TILE_SIZE * GRID_HEIGHT + GOAL_TEXT_SIZE
        countdownText.zIndex = 10
        setTextHeight(countdownText, GOAL_TEXT_SIZE)
        app.stage.addChild(countdownText)

        // Water update function
        app.ticker.add(() => {
            if(lost) {
                return
            }
            if(initCooldown > 0) {
                initCooldown -= app.ticker.deltaMS
                if(initCooldown <= 0) {
                    countdownText.text = 'Water flowing!'
                }
                else {
                    countdownText.text = 'Water in: ' + (initCooldown / 1000).toFixed(2)
                }
                return
            }
            if(waterCooldown > 0) {
                waterCooldown -= app.ticker.deltaMS
                return
            }

            waterTickPhase++
            if(waterTickPhase === 1) {
                pickWaterGoal()
                if(lost) return
                new WaterSideTile(waterHeadTile.x, waterHeadTile.y, waterHeadTile.tileSize, waterGoalDirection)
            }
            if(waterTickPhase === 2) {
                new WaterSideTile(waterGoalTile.x, waterGoalTile.y, waterGoalTile.tileSize, getOppositeDirection(waterGoalDirection))
            }
            if(waterTickPhase === 3) {
                new WaterCenterTile(waterGoalTile.x, waterGoalTile.y, waterGoalTile.tileSize)
                finishWaterTick()
                waterTickPhase = 0
            }
            waterCooldown = WATER_TICK_TIME
        })

        // Screen shake
        let screenShakeRemainingTime = 0
        app.ticker.add(() => { 
            if(screenShakeRemainingTime <= 0) {
                app.stage.position.x = 0
                app.stage.position.y = 0
                return
            }
            app.stage.position.x = Math.sin(screenShakeRemainingTime * SCREEN_SHAKE_SPEED) * SCREEN_SHAKE_AMPLITUDE
            app.stage.position.y = Math.sin(screenShakeRemainingTime * SCREEN_SHAKE_SPEED * SCREEN_SHAKE_SPEED) * SCREEN_SHAKE_AMPLITUDE
            screenShakeRemainingTime -= app.ticker.deltaMS
        })
    })()