'use strict';


const drawCircle = (x, y, r, colour, canvas_ctx) => {
  let circle = new Path2D()
  // x, y, radius, start_angle, end_angle
  circle.arc(x, y, r, 0, 2 * Math.PI);
  canvas_ctx.fillStyle = `rgb(${colour[0]},${colour[1]},${colour[2]})`
  canvas_ctx.fill(circle)
}


class Instructionificator {

  static Instructionificate = (name, mainMosaic, pieceList, idxToColour, size, scale, factor) => {
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
      name = "Instructions"

    doc.setFontSize(20)
    doc.setTextColor(192, 192, 192)

    // TITLE PAGE
    // Make black background
    doc.rect(0, 0, pdfWidth, pdfHeight, 'F')
    doc.text(name, pdfWidth / 2, 20, { align: "center" })
    doc.addImage(mainMosaic, 'PNG', (pdfWidth - mosaicDim) / 2, (pdfHeight - mosaicDim) / 2, mosaicDim, mosaicDim, '', 'NONE')

    const pieceListCanvas = this.generatePieceListCanvas(pieceList, factor)
    const pieceListImage  = pieceListCanvas.toDataURL('image/png')
    const pieceListAR     = pieceListCanvas.height / pieceListCanvas.width

    // REST OF THE PAGES
    const num_major_squares = Math.pow(size[0] / 16, 2)
    for (let gridIdx = 1; gridIdx < num_major_squares; gridIdx++) {
      doc.addPage('a4', 'landscape')
      // Make black background
      doc.rect(0, 0, pdfWidth, pdfHeight, 'F')
      doc.addImage(pieceListImage, 'PNG', 20, 20, 80, pieceListAR * 80, '', 'NONE')

      const numberedMosaic = this.generateNumberedMosaicSegmentImage(
        gridIdx,
        size,
        scale,
        factor,
        pieceList,
        idxToColour
      )
      doc.addImage(numberedMosaic, 'PNG', 120, 20, mosaicDim, mosaicDim, '', 'NONE')
    }

    doc.save(`${name}.pdf`)
  }

  static generatePieceListCanvas = (pieceList, factor) => {
    if (pieceList === undefined) return

    const prevFactor = factor
    factor = 16

    const pieceListCanvas = document.createElement('canvas')
    const pieceListCTX = pieceListCanvas.getContext('2d', {alpha: false})
    pieceListCanvas.height = 35 * (factor * 2.5) + 25
    pieceListCanvas.width = pieceListCanvas.height / 2.4

    const pieceKVs = Object.entries(pieceList)
      .filter(e => e[1]['colourID'] != undefined)
      .sort((e1, e2) => e1[1]['colourID'] > e2[1]['colourID'])

    const r = factor
    const fontSize = factor
    for (const [colourName, colourInfo] of pieceKVs) {
      const x = 2 * r
      const y = (r * 2.5) * colourInfo['colourID']

      drawCircle(x, y, r, legoColours[colourName], pieceListCTX)

      pieceListCTX.font = `${fontSize}pt serif`
      pieceListCTX.fillStyle = '#ffffff'
      pieceListCTX.fillText(
        `${colourInfo['colourID']}: ${colourName}, ${colourInfo['pieceCount']}`,
        x + 1.618 * r,
        y + fontSize / 2
      )
    }
    factor = prevFactor
    return pieceListCanvas
  }

  static generateNumberedMosaicSegmentImage = (gridIdx, size, scale, factor, pieceList, idxToColour) => {
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
     */
    const prevFactor = factor
    factor = 32

    const mosaicSeg = document.createElement('canvas')
    const mosaicCtx = mosaicSeg.getContext('2d', {alpha: false})

    mosaicSeg.width  = scale * factor * 16
    mosaicSeg.height = scale * factor * 16

    const fontSize = factor

    const clockmod = (i,m) => i % m ? i % m : m
    const startX = (clockmod(gridIdx, (size[0] / 16)) - 1) * 16
    const startY = Math.floor((gridIdx - 1) / (size[1] / 16)) * 16

    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 16; j++) {
        const mosaicColourAtij = idxToColour[[i,j]]
        drawCircle(
          scale * (i * factor + factor / 2),
          scale * (j * factor + factor / 2),
          scale * factor / 2,
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
          pieceList[mosaicColourAtij]["colourID"],
          scale * (i * factor + factor / 2),
          scale * (j * factor + fontSize / 2),
        )
      }
    }
    factor = prevFactor
    return mosaicSeg.toDataURL('image/png')
  }

}
