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

  drawCircle = (x, y, r, colour, canvas_ctx) => {
    let circle = new Path2D()
    // x, y, radius, start_angle, end_angle
    circle.arc(x, y, r, 0, 2 * Math.PI);
    canvas_ctx.fillStyle = `rgb(${colour[0]},${colour[1]},${colour[2]})`
    canvas_ctx.fill(circle)
  }

  init_colours_used = () => {
    const coloursUsed = {}
    for (const colour in legoColours)
      coloursUsed[colour] = { 'pieceCount': 0, 'colourID': undefined }
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

  generatePDF = (name, mainMosaic, img_width, img_height) => {
    /* There are a lot of magic numbers in this function.
     * We all need more ~~~magic~~~ in our lives!!!
     */

    // 210 x 297 mm
    // 793.706 x 1,122.52 px

    const pdfWidth = 297
    const pdfHeight = 210
    const mosaicDim = 140

    const doc = new jspdf.jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    })

    if (name === "")
      name = "Placeholder"

    doc.setFontSize(20)
    doc.setTextColor(192, 192, 192)

    // TITLE PAGE
    // Make black background
    doc.rect(0, 0, pdfWidth, pdfHeight, 'F')
    doc.text(name, pdfWidth / 2, 20, { align: "center" })
    doc.addImage(mainMosaic, 'PNG', (pdfWidth - mosaicDim) / 2, (pdfHeight - mosaicDim) / 2, mosaicDim, mosaicDim, '', 'NONE')

    const pieceListCanvas = this.generatePieceListCanvas()
    const pieceListImage  = pieceListCanvas.toDataURL('image/png')
    const pieceListAR     = pieceListCanvas.height / pieceListCanvas.width

    // REST OF THE PAGES
    const num_major_squares = Math.pow(this.size[0] / 16, 2)
    for (let gridIdx = 1; gridIdx < num_major_squares; gridIdx++) {
      doc.addPage('a4', 'landscape')
      // Make black background
      doc.rect(0, 0, pdfWidth, pdfHeight, 'F')
      doc.addImage(pieceListImage, 'PNG', 20, 20, 80, pieceListAR * 80, '', 'NONE')

      const numberedMosaic = this.generateNumberedMosaicSegmentImage(gridIdx)
      doc.addImage(numberedMosaic, 'PNG', 120, 20, mosaicDim, mosaicDim, '', 'NONE')
    }

    doc.save("test.pdf")
  }

  generatePieceListCanvas = () => {
    if (this.pieceList === undefined) return

    const prevFactor = this.factor
    this.factor = 16

    const pieceListCanvas = document.createElement('canvas')
    const pieceListCTX = pieceListCanvas.getContext('2d', {alpha: false})
    pieceListCanvas.height = 35 * (this.factor * 2.5) + 25
    pieceListCanvas.width = pieceListCanvas.height / 2.4

    const pieceKVs = Object.entries(this.pieceList)
      .filter(e => e[1]['colourID'] != undefined)
      .sort((e1, e2) => e1[1]['colourID'] > e2[1]['colourID'])

    const r = this.factor
    const fontSize = this.factor
    for (const [colourName, colourInfo] of pieceKVs) {
      const x = 2 * r
      const y = (r * 2.5) * colourInfo['colourID']

      this.drawCircle(x, y, r, legoColours[colourName], pieceListCTX)

      pieceListCTX.font = `${fontSize}pt serif`
      pieceListCTX.fillStyle = '#ffffff'
      pieceListCTX.fillText(
        `${colourInfo['colourID']}: ${colourName}, ${colourInfo['pieceCount']}`,
        x + 1.618 * r,
        y + fontSize / 2
      )
    }
    this.factor = prevFactor
    return pieceListCanvas
  }

  generateNumberedMosaicSegmentImage = (gridIdx) => {
    /*
     *  Mosaics can be size 1, 2, 3, 4:
     *
     *                     gridIdx Numbering
     *                     -----------------
     *
     *  Size 1:  #         1
     *          
     *  Size 2:  ##        1 2
     *           ##        3 4
     *
     *  Size 3:  ###       1 2 3
     *           ###       4 5 6
     *           ###       7 8 9
     *
     *  Size 4:  ####      1  2  3  4
     *           ####      5  6  7  8
     *           ####      9 10 11 12
     *           ####     13 14 15 16
     *
     *  Each # represents a 16x16 grid of studs. This function
     *  returns a blown-up canvas of the grid at pos. gridIdx,
     *  where the grids are numbered across the rows.
     *
     *  "this.mini_input_ctx" is of size "this.size"
     */
    if (this.mini_input_ctx === undefined) {
      throw `Legoificator has not been initialized; mini_input_ctx is undefined`
    }

    // this is going to be big, so we want high res
    const prevFactor = this.factor
    this.factor = 32

    const mosaicSeg = document.createElement('canvas')
    const mosaicCtx = mosaicSeg.getContext('2d', {alpha: false})

    mosaicSeg.width  = this.scale * this.factor * 16
    mosaicSeg.height = this.scale * this.factor * 16

    const fontSize = this.factor

    const clockmod = (i,m) => i % m ? i % m : m
    const startX = (clockmod(gridIdx, (this.size[0] / 16)) - 1) * 16
    const startY = Math.floor((gridIdx - 1) / (this.size[1] / 16)) * 16

    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 16; j++) {
        const mosaicColourAtij = this.idxToColour[[i,j]]
        this.drawCircle(
          this.scale * (i * this.factor + this.factor / 2),
          this.scale * (j * this.factor + this.factor / 2),
          this.scale * this.factor / 2,
          legoColours[mosaicColourAtij],
          mosaicCtx
        )
        mosaicCtx.font = `${fontSize}pt serif`
        mosaicCtx.fillStyle =
          legoColours[mosaicColourAtij].reduce(add) > 127 * 3
          ? '#000000'
          : '#ffffff'
        mosaicCtx.textBaseline = 'middle'
        mosaicCtx.textAlign = 'center'
        mosaicCtx.fillText(
          this.pieceList[mosaicColourAtij]["colourID"],
          this.scale * (i * this.factor + this.factor / 2),
          this.scale * (j * this.factor + fontSize / 2),
        )
      }
    }
    this.factor = prevFactor
    return mosaicSeg.toDataURL('image/png')
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

        this.drawCircle(
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

}
