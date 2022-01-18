legoColours = {
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

const FACTOR = 9;
const SIZE = [64, 64];


const draw_circle = (x, y, r, colour, canvas_ctx) => {
  let circle = new Path2D()
  // x, y, radius, start_angle, end_angle
  circle.arc(x, y, r, 0, 2 * Math.PI);
  canvas_ctx.fillStyle = `rgb(${colour[0]},${colour[1]},${colour[2]})`
  canvas_ctx.fill(circle)
  canvas_ctx.fillStyle = 'black'
}

const init_colours_used = () => {
  coloursUsed = {}
  for (const colour in legoColours) {
    coloursUsed[colour] = [0, 0]
  }
  return coloursUsed
}

const resizeImage = (img) => {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE[0]
  canvas.height = SIZE[1]

  // draw the image to the canvas
  const ctx  = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, SIZE[0], SIZE[1]);

  return ctx
}

const nthOfArray = (array, period, start) => {
  vs = []
  for (let i = start; i < array.length; i += period) {
    vs.push(array[i])
  }
  return vs
}

const resizeImage2 = (img) => {
  /* notes:
   *    If this turns out to be the best method, we can integrate this
   *    into the main processImage loop for speed.
   *
   *    This version is qualitatively better than resizeImage - fewer
   *    misplaced pixels, more uniform colouring, e.t.c.
   *
   *    Potential improvements: gaussian-weighted averaging
   */
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height

  const small_canvas = document.createElement('canvas')
  small_canvas.width = SIZE[0]
  small_canvas.height = SIZE[1]

  const ctx  = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, img.width, img.height);

  const small_ctx  = small_canvas.getContext('2d');

  const width_chunk_size = canvas.width / SIZE[0]
  const height_chunk_size = canvas.height / SIZE[1]

  for (let i = 0; i < SIZE[0]; i++) {
    for (let j = 0; j < SIZE[1]; j++) {
      const vals = ctx.getImageData(
        i * width_chunk_size,
        j * width_chunk_size,
        width_chunk_size,
        height_chunk_size
      ).data
      const rs = nthOfArray(vals, 4, 0)
      const gs = nthOfArray(vals, 4, 1)
      const bs = nthOfArray(vals, 4, 2)
      const R = rs.reduce((a,b) => a + b) / rs.length
      const G = gs.reduce((a,b) => a + b) / gs.length
      const B = bs.reduce((a,b) => a + b) / bs.length
      small_ctx.fillStyle = `rgb(${R}, ${G}, ${B})`
      small_ctx.fillRect(i, j, 1, 1)
    }
  }

  return small_ctx
}

const RGBDistance = (r1, g1, b1, r2, g2, b2) => {
  d1 = r1 - r2
  d2 = g1 - g2
  d3 = b1 - b2
  return Math.sqrt(
    d1 * d1 + d2 * d2 + d3 * d3
  )
}

const sRGBDistance = (r1, g1, b1, r2, g2, b2) => {
  r = (r1 + r2) / 2
  d1 = r1 - r2
  d2 = g1 - g2
  d3 = b1 - b2
  return Math.sqrt(
    (2 + r / 256) * d1 * d1 + 4 * d2 * d2 + (2 + (255 - r) / 256) * d3 * d3
  )
}

const getClosestLegoColour = (r, g, b, distance_metric = RGBDistance) => {
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
   */
  minimum_colour_dist = 256
  closest_colour = ""
  for (let colour in legoColours) {
    const [lego_r, lego_g, lego_b] = legoColours[colour]
    colour_dist = distance_metric(r, g, b, lego_r, lego_g, lego_b)

    if (colour_dist < minimum_colour_dist) {
      minimum_colour_dist = colour_dist
      closest_colour = colour
    }
  }
  return closest_colour
}

const processImage = (input_img, input_ctx, output_ctx) => {
  output_ctx.canvas.width = FACTOR * SIZE[0]
  output_ctx.canvas.height = FACTOR * SIZE[1]

  coloursUsed = init_colours_used()

  const mini_input_ctx = resizeImage2(input_img)

  for (let i = 0; i < SIZE[0]; i++) {
    for (let j = 0; j < SIZE[1]; j++) {
      const [r, g, b, a] = mini_input_ctx.getImageData(i, j, 1, 1).data
      const closest_lego_colour = getClosestLegoColour(r, g, b)
      draw_circle(
        i * FACTOR + FACTOR / 2,
        j * FACTOR + FACTOR / 2,
        FACTOR / 2,
        legoColours[closest_lego_colour],
        output_ctx
      )
    }
  }
}
