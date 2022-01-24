'use strict';


const legoColours = {
  "black" : [33,33,33],
  "blue" : [0,85,191],
  "bright_green" : [16,203,49],
  "bright_light_blue" : [159,195,233],
  "bright_light_orange" : [247,186,48],
  "bright_light_yellow" : [243,224,85],
  "bright_pink" : [255,187,255],
  "coral" : [255,99,71],
  "dark_azure" : [51,153,255],
  "dark_blue" : [20,48,68],
  "dark_bluish_gray" : [89,93,96],
  "dark_brown" : [55,33,0],
  "dark_orange" : [179,84,8],
  "dark_pink" : [211,53,157],
  "dark_red" : [106,14,21],
  "dark_tan" : [144,116,80],
  "dark_turquoise" : [0,138,128],
  "lavender" : [188,166,208],
  "light_aqua" : [204,255,255],
  "light_bluish_gray" : [175,181,199],
  "light_nougat" : [254,204,176],
  "lime" : [165,202,24],
  "magenta" : [144,31,118],
  "medium_azure" : [66,192,251],
  "medium_blue" : [115,150,200],
  "medium_nougat" : [175,116,70],
  "olive_green" : [124,144,81],
  "orange" : [255,126,20],
  "red" : [179,0,6],
  "reddish_brown" : [95,49,9],
  "sand_blue" : [90,113,132],
  "tan" : [222,198,156],
  "white" : [255,255,255],
  "yellow" : [247,209,23],
  "yellowish_green" : [226,249,154]
}

// functions for kwargs, reduce, e.t.c.
const IDENTITY = x => x
const add = (a,b) => a + b

const drawCircle = (x, y, r, colour, canvas_ctx) => {
  let circle = new Path2D()
  // x, y, radius, start_angle, end_angle
  circle.arc(x, y, r, 0, 2 * Math.PI);
  canvas_ctx.fillStyle = `rgb(${colour[0]},${colour[1]},${colour[2]})`
  canvas_ctx.fill(circle)
}

const nthOfArray = (array, period, start) => {
  const vs = []
  for (let i = start; i < array.length; i += period) {
    vs.push(array[i])
  }
  return vs
}


class Legoificator {

  constructor(input_image, size = 3, factor = 9, scale = 3) {
    /*
     * factor is roughly the diameter of the lego pieces (in px) (though it can be
     * different depending on the context e.g. while generating different parts of
     * the instructions)
     *
     * size gives the number of lego pieces along width and height by this formula
     *    [width, height] = [size * 16, size * 16]
     *
     * scale is used to incrase the scale of the image
     */
    this.input_image_gl = input_image._  // plz dont delete that underscore
    this.factor = factor
    this.scale = scale

    this.idxToColour = {}
    this.pieceList = {}

    this.LABColours = undefined
    this.mini_input_ctx = undefined
    this.size = undefined

    this.updateSize(size)
    this.resizeImage()

  }

  updateSize(s) {
    if (![1,2,3,4].includes(s)) throw `size must be one of 1,2,3,4 - got ${s}, typeof(size) == ${typeof(size)} (must be int)`
    this.size = [16 * s, 16 * s]
  }

  initColoursUsed = () => {
    const coloursUsed = {}
    for (const colour in legoColours)
      coloursUsed[colour] = { 'pieceCount': 0, 'colourID': undefined }
    return coloursUsed
  }

  initLABColours = () => {
    const LABColours = {}
    for (let [key,rgb] of Object.entries(legoColours))
      LABColours[key] = RGBtoLAB(rgb)
    return LABColours
  }

  resizeImage = () => {
    /* notes:
     *  This is almost certainly an absurdly stupid way to do this in webgl, but I
     *  am stupid and just trying to move quickly so c'est la vie
     *
     *  Should make this a webGL thing too w/ glfx, and when a texture is applied to
     *  the input image, also apply it to this small image. This is probably the
     *  method with the greatest performance returns.
     *
     *  The question is: does the resizing commute with any affects that are applied?
     *  e.g. does local averaging commute with saturation, brightness, contrast?
     */
    const canvas = document.createElement('canvas')
    canvas.width = this.input_image_gl.width
    canvas.height = this.input_image_gl.height

    const small_canvas = document.createElement('canvas')
    small_canvas.width = this.size[0]
    small_canvas.height = this.size[1]

    const ctx  = canvas.getContext('2d');
    const small_ctx  = small_canvas.getContext('2d');

    ctx.drawImage(this.input_image_gl.gl.canvas, 0, 0);

    const width_chunk_size = canvas.width / this.size[0]
    const height_chunk_size = canvas.height / this.size[1]

    for (let i = 0; i < this.size[0]; i++) {
      for (let j = 0; j < this.size[1]; j++) {
        const vals = ctx.getImageData(
          i * width_chunk_size,
          j * width_chunk_size,
          width_chunk_size,
          height_chunk_size
        ).data
        const rs = nthOfArray(vals, 4, 0)
        const gs = nthOfArray(vals, 4, 1)
        const bs = nthOfArray(vals, 4, 2)
        const R = rs.reduce(add) / rs.length
        const G = gs.reduce(add) / gs.length
        const B = bs.reduce(add) / bs.length
        small_ctx.fillStyle = `rgb(${R}, ${G}, ${B})`
        small_ctx.fillRect(i, j, 1, 1)
      }
    }

    this.mini_input_ctx = small_ctx
  }

  SquaredEuclideanDist = (v1, v2) => {
    const [x0, y0, z0] = v1
    const [x1, y1, z1] = v2

    const d1 = x0 - x1
    const d2 = y0 - y1
    const d3 = z0 - z1

    // Don't need to take the sqrt, since we will just be
    // comparing two of these squared Euclidean  distances.
    // We wanna go fast! SQRT Slow! SQRT Pointless!
    return d1 * d1 + d2 * d2 + d3 * d3
  }

  getClosestLegoColour = (rgb, colours=legoColours) => {
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
    for (let colour in colours) {
      const legoRGB = colours[colour]
      const colourDist = this.SquaredEuclideanDist(rgb, legoRGB)
      if (colourDist < minimumColourDist) {
        minimumColourDist = colourDist
        closestColour = colour
      }
    }
    return closestColour
  }

  commenceLegoification = (output_ctx, useLAB = false)  => {
    if (this.mini_input_ctx === undefined) {
      throw `Legoificator has not been initialized; mini_input_ctx is undefined`
    }

    // Set canvas size, with appropriate css scaling to make it look good
    output_ctx.canvas.style.width = `${this.factor * this.size[0]}px`
    output_ctx.canvas.style.height = `${this.factor * this.size[1]}px`
    output_ctx.canvas.width = this.factor * this.size[0] * this.scale
    output_ctx.canvas.height = this.factor * this.size[1] * this.scale

    // make the output canvas' background black
    output_ctx.fillStyle = 'black';
    output_ctx.fillRect(0, 0, output_ctx.canvas.width, output_ctx.canvas.width)

    this.idxToColour = {}
    let current_colour_id = 1  // this is used in the PDF
    const coloursUsed = this.initColoursUsed()  // this holds information for PDF generation

    if (useLAB && this.LABColours == undefined) {
      this.LABColours = this.initLABColours()
    }
    const colourPalette = useLAB ? this.LABColours : legoColours

    for (let i = 0; i < this.size[0]; i++) {
      for (let j = 0; j < this.size[1]; j++) {
        // gimme a pixel!
        // If we could load all the pixels into a matrix or smth, that'd be nice
        // ~7% of runtime is gettings these pixels individually 
        const [r, g, b, a] = this.mini_input_ctx.getImageData(i, j, 1, 1).data

        const targetColour = useLAB ? RGBtoLAB([r, g, b]) : [r, g, b]
        // find the closest colour
        const closest_lego_colour = this.getClosestLegoColour(
          targetColour, colourPalette
        )

        // update the colours that were used
        coloursUsed[closest_lego_colour]['pieceCount']++
        if (coloursUsed[closest_lego_colour]['colourID'] == undefined) {
          coloursUsed[closest_lego_colour]['colourID'] = current_colour_id++
        }

        this.idxToColour[[i,j]] = closest_lego_colour

        drawCircle(
          this.scale * (i * this.factor + this.factor / 2),
          this.scale * (j * this.factor + this.factor / 2),
          this.scale * this.factor / 2,
          legoColours[closest_lego_colour],
          output_ctx
        )
      }
    }
    this.pieceList = coloursUsed
  }

  updateLegoificatedEntity = (output_ctx, useLAB = false) => {
    this.resizeImage()
    this.commenceLegoification(output_ctx, useLAB)
  }

  makeMosaicInstructions = (name, mosaicImg) => {
    Instructionificator.Instructionificate(
      name,
      mosaicImg,
      this.pieceList,
      this.idxToColour,
      this.size,
      this.factor
    )
  }
}
