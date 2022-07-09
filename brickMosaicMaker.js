'use strict';


const brickColours = {
  "black": [33, 33, 33],
  "blue": [0, 85, 191],
  "bright_green": [16, 203, 49],
  "bright_light_blue": [159, 195, 233],
  "bright_light_orange": [247, 186, 48],
  "bright_light_yellow": [243, 224, 85],
  "bright_pink": [255, 187, 255],
  "coral": [255, 99, 71],
  "dark_azure": [51, 153, 255],
  "dark_blue": [20, 48, 68],
  "dark_bluish_gray": [89, 93, 96],
  "dark_brown": [55, 33, 0],
  "dark_orange": [179, 84, 8],
  "dark_pink": [211, 53, 157],
  "dark_red": [106, 14, 21],
  "dark_tan": [144, 116, 80],
  "dark_turquoise": [0, 138, 128],
  "lavender": [188, 166, 208],
  "light_aqua": [204, 255, 255],
  "light_bluish_gray": [175, 181, 199],
  "light_nougat": [254, 204, 176],
  "lime": [165, 202, 24],
  "magenta": [144, 31, 118],
  "medium_azure": [66, 192, 251],
  "medium_blue": [115, 150, 200],
  "medium_nougat": [175, 116, 70],
  "olive_green": [124, 144, 81],
  "orange": [255, 126, 20],
  "red": [179, 0, 6],
  "reddish_brown": [95, 49, 9],
  "sand_blue": [90, 113, 132],
  "tan": [222, 198, 156],
  "white": [255, 255, 255],
  "yellow": [247, 209, 23],
  "yellowish_green": [226, 249, 154]
}

const drawCircle = (x, y, r, colour, canvas_ctx) => {
  // rgba is more performant
  // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
  let circle = new Path2D()
  // x, y, radius, start_angle, end_angle
  circle.arc(x, y, r, 0, 2 * Math.PI);
  canvas_ctx.fillStyle = `rgba(${colour[0]},${colour[1]},${colour[2]},1)`
  canvas_ctx.fill(circle)
}


class Brickificator {

  constructor(input_image, size = 3, factor = 9) {
    /*
     * factor is roughly the diameter of the brick pieces (in px) (though it can be
     * different depending on the context e.g. while generating different parts of
     * the instructions)
     *
     * size gives the number of brick pieces along width and height by this formula
     *    [width, height] = [size * 16, size * 16]
     */
    this.input_image_gl = input_image._  // plz dont delete that underscore
    this.factor = factor

    this.idxToColour = {}
    this.pieceList = {}

    this.LABColours = undefined
    this.size = undefined

    this.updateSize(size)
  }

  updateSize(s) {
    if (![1, 2, 3, 4].includes(s)) throw `size must be one of 1,2,3,4 - got ${s}, typeof(size) == ${typeof (size)} (must be int)`
    this.size = [16 * s, 16 * s]
  }

  initColoursUsed = () => {
    const coloursUsed = {}
    for (const colour in brickColours)
      coloursUsed[colour] = { 'pieceCount': 0, 'colourID': undefined }
    return coloursUsed
  }

  initLABColours = () => {
    const LABColours = {}
    for (let [key, rgb] of Object.entries(brickColours))
      LABColours[key] = RGBtoLAB(rgb)
    return LABColours
  }

  SquaredEuclideanDist = (v0, v1) => {
    // Don't need to take the sqrt, since we will just be
    // comparing two of these squared Euclidean  distances.
    // We wanna go fast! SQRT Slow! SQRT Pointless!
    const d1 = v0[0] - v1[0]
    const d2 = v0[1] - v1[1]
    const d3 = v0[2] - v1[2]
    return d1 * d1 + d2 * d2 + d3 * d3
  }

  getClosestBrickColour = (rgb) => {
    /* From the Colour Difference Wikipedia page[0], it turns
     * out that distances in RGB colour space are not perceptibly
     * uniform - that is, a colour distance of "5" will look different
     * for different pairs of equally spaced RGB colours.
     *
     * This website[1] has colour conversion formulas - try Lab colour
     * space for distances.
     *
     * [0] https://en.wikipedia.org/wiki/Color_difference
     * [1] https://en.wikipedia.org/wiki/CIELAB_color_space#RGB_and_CMYK_conversions
     * [2] stackoverflow link https://stackoverflow.com/questions/9018016/how-to-compare-two-colors-for-similarity-difference
     * [3] how to convert http://www.easyrgb.com/en/math.php#text2
     */
    let minimumColourDist = Number.MAX_SAFE_INTEGER
    let closestColour = ""
    for (let colour in this.LABColours) {
      const brickRGB = this.LABColours[colour]
      const colourDist = this.SquaredEuclideanDist(rgb, brickRGB)
      if (colourDist < minimumColourDist) {
        minimumColourDist = colourDist
        closestColour = colour
      }
    }
    return closestColour
  }

  periodicAvgOnChunk = (imgData, I0, J0, chunkWidth, chunkHeight, canvasWidth, canvasHeight) => {
    let R = 0, G = 0, B = 0, n = 0
    const period = 4
    const imin = Math.floor(chunkWidth * I0) * period
    const jmin = Math.floor(chunkHeight * J0) * canvasWidth * period
    const imax = Math.ceil(chunkWidth * (I0 + 1)) * period
    const jmax = Math.ceil(chunkHeight * (J0 + 1)) * canvasWidth * period

    for (let j = jmin; j < jmax; j += canvasWidth * period) {
      for (let i = imin; i < imax; i += period) {
        R += imgData[j + i]
        G += imgData[j + i + 1]
        B += imgData[j + i + 2]
        n += 1
      }
    }
    return [R / n, G / n, B / n]
  }

  commenceBrickification = (output_ctx) => {
    // Set canvas size, with appropriate css scaling to make it look good
    output_ctx.canvas.width = this.factor * this.size[0] * window.devicePixelRatio
    output_ctx.canvas.height = this.factor * this.size[1] * window.devicePixelRatio

    // make the output canvas' background black
    output_ctx.fillStyle = 'black';
    output_ctx.fillRect(0, 0, output_ctx.canvas.width, output_ctx.canvas.width)

    this.idxToColour = {}
    let current_colour_id = 1  // this is used in the PDF
    const coloursUsed = this.initColoursUsed()  // this holds information for PDF generation

    if (this.LABColours == undefined) {
      this.LABColours = this.initLABColours()
    }

    // Create canvas that we can use to look at input_image_gl's canvas
    // Since input_image_gl is a webgl canvas, we need to create a seperate
    // 2d canvas to query pixel data
    const canvas = document.createElement('canvas')
    canvas.width = this.input_image_gl.width
    canvas.height = this.input_image_gl.height

    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.input_image_gl.gl.canvas, 0, 0);

    const width_chunk_size = canvas.width / this.size[0]
    const height_chunk_size = canvas.height / this.size[1]

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data

    for (let j = 0; j < this.size[1]; j++) {
      for (let i = 0; i < this.size[0]; i++) {
        const RGBavg = this.periodicAvgOnChunk(
          imgData,
          i, j,
          width_chunk_size, height_chunk_size,
          canvas.width, canvas.height
        )

        // find the closest colour
        const targetColour = RGBtoLAB(RGBavg)
        const closest_brick_colour = this.getClosestBrickColour(targetColour)

        // update the colours that were used
        coloursUsed[closest_brick_colour]['pieceCount']++
        if (coloursUsed[closest_brick_colour]['colourID'] == undefined) {
          coloursUsed[closest_brick_colour]['colourID'] = current_colour_id++
        }

        this.idxToColour[[i, j]] = closest_brick_colour
        drawCircle(
          (i * this.factor + this.factor / 2) * window.devicePixelRatio,
          (j * this.factor + this.factor / 2) * window.devicePixelRatio,
          this.factor / 2 * window.devicePixelRatio,
          brickColours[closest_brick_colour],
          output_ctx
        )
      }
    }
    this.pieceList = coloursUsed
  }

  makeMosaicInstructions = (name) => {
    Instructionificator.Instructionificate(
      name,
      this.pieceList,
      this.idxToColour,
      this.size,
      this.factor
    )
  }
}
