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


class Legoificator {

  constructor(input_image, factor = 9, scale = 3, size = [48, 48]) {
    this.input_image_gl = input_image._  // plz dont delete that underscore
    this.factor = factor
    this.size = size
    this.scale = scale

    this.idxToColour = {}
    this.pieceList = {}
    this.mini_input_ctx = undefined

    this.resizeImage()
  }

  updateSize(s) {
    if (![1,2,3,4].includes(s)) return
    this.size = [16 * s, 16 * s]
  }

  init_colours_used = () => {
    const coloursUsed = {}
    for (const colour in legoColours)
      coloursUsed[colour] = { 'pieceCount': 0, 'colourID': undefined }
    return coloursUsed
  }

  resizeImage = () => {
    /* notes:
     *  This is almost certainly an absurdly stupid way to do this in webgl, but I
     *  am stupid and just trying to move quickly so c'est la vie
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

    const nthOfArray = (array, period, start) => {
      const vs = []
      for (let i = start; i < array.length; i += period) {
        vs.push(array[i])
      }
      return vs
    }

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

  EuclideanDistance = (v1, v2) => {
    const [x0, y0, z0] = v1
    const [x1, y1, z1] = v2

    const d1 = x0 - x1
    const d2 = y0 - y1
    const d3 = z0 - z1

    return Math.sqrt(
      d1 * d1 + d2 * d2 + d3 * d3
    )
  }

  getClosestLegoColour = (rgb, colorScheme=IDENTITY) => {
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
    let minimum_colour_dist = 256
    let closest_colour = ""
    for (let colour in legoColours) {
      const lego_rgb = legoColours[colour]
      const colour_dist = this.EuclideanDistance(
        colorScheme(rgb),
        colorScheme(lego_rgb)
      )
      if (colour_dist < minimum_colour_dist) {
        minimum_colour_dist = colour_dist
        closest_colour = colour
      }
    }
    return closest_colour
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

    let current_colour_id = 1  // this is used in the PDF
    const coloursUsed = this.init_colours_used()  // this holds information for PDF generation
    this.idxToColour = {}

    for (let i = 0; i < this.size[0]; i++) {
      for (let j = 0; j < this.size[1]; j++) {
        // gimme a pixel!
        const [r, g, b, a] = this.mini_input_ctx.getImageData(i, j, 1, 1).data

        // find the closest colour
        let closest_lego_colour
        if (useLAB) {
          closest_lego_colour = this.getClosestLegoColour([r, g, b], RGBtoLAB)
        } else {
          closest_lego_colour = this.getClosestLegoColour([r, g, b])
        }

        // update the colours that were used
        coloursUsed[closest_lego_colour]['pieceCount']++
        if (coloursUsed[closest_lego_colour]['colourID'] == undefined) {
          coloursUsed[closest_lego_colour]['colourID'] = current_colour_id
          current_colour_id++
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
      this.scale,
      this.factor
    )
  }
}
