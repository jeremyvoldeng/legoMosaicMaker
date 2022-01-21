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


const IDENTITY = (x) => x


class Legoificator {

  constructor(input_image, factor = 9, size = [64, 64]) {
    this.input_image_gl = input_image._
    this.factor = factor
    this.size = size
    this.mini_input_ctx = undefined

    this.resizeImage()
  }

  draw_circle = (x, y, r, colour, canvas_ctx) => {
    let circle = new Path2D()
    // x, y, radius, start_angle, end_angle
    circle.arc(x, y, r, 0, 2 * Math.PI);
    canvas_ctx.fillStyle = `rgb(${colour[0]},${colour[1]},${colour[2]})`
    canvas_ctx.fill(circle)
    canvas_ctx.fillStyle = 'black'
  }

  init_colours_used = () => {
    const coloursUsed = {}
    for (const colour in legoColours) {
      coloursUsed[colour] = [0, 0]
    }
    return coloursUsed
  }

  nthOfArray = (array, period, start) => {
    const vs = []
    for (let i = start; i < array.length; i += period) {
      vs.push(array[i])
    }
    return vs
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

    for (let i = 0; i < this.size[0]; i++) {
      for (let j = 0; j < this.size[1]; j++) {
        const vals = ctx.getImageData(
          i * width_chunk_size,
          j * width_chunk_size,
          width_chunk_size,
          height_chunk_size
        ).data
        const rs = this.nthOfArray(vals, 4, 0)
        const gs = this.nthOfArray(vals, 4, 1)
        const bs = this.nthOfArray(vals, 4, 2)
        const R = rs.reduce((a,b) => a + b) / rs.length
        const G = gs.reduce((a,b) => a + b) / gs.length
        const B = bs.reduce((a,b) => a + b) / bs.length
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

    output_ctx.canvas.width = this.factor * this.size[0]
    output_ctx.canvas.height = this.factor * this.size[1]

    const coloursUsed = this.init_colours_used()

    for (let i = 0; i < this.size[0]; i++) {
      for (let j = 0; j < this.size[1]; j++) {
        const [r, g, b, a] = this.mini_input_ctx.getImageData(i, j, 1, 1).data

        let closest_lego_colour
        if (useLAB) {
          closest_lego_colour = this.getClosestLegoColour([r, g, b], RGBtoLAB)
        } else {
          closest_lego_colour = this.getClosestLegoColour([r, g, b])
        }

        this.draw_circle(
          i * this.factor + this.factor / 2,
          j * this.factor + this.factor / 2,
          this.factor / 2,
          legoColours[closest_lego_colour],
          output_ctx
        )
      }
    }
    return true
  }

  updateLegoificatedEntity = (output_ctx, useLAB = false) => {
    this.resizeImage()
    this.commenceLegoification(output_ctx, useLAB)
  }

}
