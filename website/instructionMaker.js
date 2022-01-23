'use strict';

const clockmod = (i,m) => i % m ? i % m : m
const getColFromGridIdx = (gridIdx, size) => (clockmod(gridIdx, (size[0] / 16)) - 1) * 16
const getRowFromGridIdx = (gridIdx, size) => Math.floor((gridIdx - 1) / (size[1] / 16)) * 16


class Instructionificator {
  /* There are a lot of magic numbers in this class.
   * We all need more ~~~magic~~~ in our lives!!!
   * You are welcome.
   */

  static Instructionificate = (name, mainMosaic, pieceList, idxToColour, size, factor) => {

    // 210 x 297 mm
    // 793.706 x 1,122.52 px

    const pdfWidth = 297
    const pdfHeight = 210
    const mosaicDim = 140
    const numMajorSquares = Math.pow(size[0] / 16, 2)

    if (name === "")
      name = "Instructions"

    const doc = new jspdf.jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    })

    doc.setFontSize(20)
    doc.setTextColor(192, 192, 192)

    // TITLE PAGE
    doc.rect(0, 0, pdfWidth, pdfHeight, 'F')
    doc.text(name, pdfWidth / 2, 20, { align: "center" })
    doc.addImage(
      mainMosaic,
      'PNG',
      (pdfWidth - mosaicDim) / 2,
      (pdfHeight - mosaicDim) / 2,
      mosaicDim,
      mosaicDim,
      '',
      'NONE'
    )

    // INSTRUCTION PAGE
    doc.addPage('a4', 'landscape')
    doc.rect(0, 0, pdfWidth, pdfHeight, 'F')
    doc.setFontSize(16)
    doc.setTextColor(192, 192, 192)
    doc.text(
      `The following pages have each 16x16 tile section displayed, with the corresponding colour code on the margin. Fill it all in!\nThere are ${size[0] * size[1]} total pieces.`,
      mosaicDim / 4,
      (pdfHeight - mosaicDim) / 2,
      {maxWidth: mosaicDim / 2}
    )
    doc.addImage(
      mainMosaic,
      'PNG',
      (pdfWidth - mosaicDim / 2) / 2,
      (pdfHeight - mosaicDim) / 2,
      mosaicDim,
      mosaicDim,
      '',
      'NONE'
    )

    const gridOverlay = this.makeGridOverlay(mosaicDim, size)
    doc.addImage(
      gridOverlay,
      'PNG',
      (pdfWidth - mosaicDim / 2) / 2,
      (pdfHeight - mosaicDim) / 2,
      mosaicDim,
      mosaicDim,
      '',
      'NONE'
    )

    const pieceListCanvas = this.generatePieceListCanvas(pieceList, factor)
    const pieceListImage  = pieceListCanvas.toDataURL('image/png')
    const pieceListAR     = pieceListCanvas.height / pieceListCanvas.width

    doc.setFontSize(20)
    doc.setTextColor(192, 192, 192)

    // REST OF THE PAGES
    for (let gridIdx = 1; gridIdx < numMajorSquares + 1; gridIdx++) {
      doc.addPage('a4', 'landscape')
      // Make black background
      doc.rect(0, 0, pdfWidth, pdfHeight, 'F')
      doc.addImage(pieceListImage, 'PNG', 20, 10, 80, pieceListAR * 80, '', 'NONE')

      const numberedMosaic = this.generateNumberedMosaicSegmentImage(
        gridIdx,
        size,
        factor,
        pieceList,
        idxToColour
      )
      doc.addImage(numberedMosaic, 'PNG', 120, 20, mosaicDim, mosaicDim, '', 'NONE')

      doc.setFontSize(24)
      doc.setTextColor(192, 192, 192)
      doc.text(`Tile ${gridIdx}`, 120 + mosaicDim / 2, 40 + mosaicDim, { align: "center" })
    }

    doc.save(`${name}.pdf`)
  }

  static makeGridOverlay = (mosaicDim, size) => {
    const gridOverlay = document.createElement('canvas')
    const gridOverlayCtx = gridOverlay.getContext('2d')
    gridOverlay.height = mosaicDim
    gridOverlay.width = mosaicDim

    // when the size is 64 pixels across, there are 16 squares,
    // meaning that we need a much lower font size
    const fontSize = size[0] == 64 ? 16 : 12 * (6 - size[0] / 16)

    gridOverlayCtx.font = `${fontSize}pt serif`
    gridOverlayCtx.fillStyle = '#FFFFFF'
    gridOverlayCtx.textBaseline = 'middle'
    gridOverlayCtx.textAlign = 'center'

    const numMajorSquares = Math.pow(size[0] / 16, 2)
    for (let gridIdx = 1; gridIdx < numMajorSquares + 1; gridIdx++) {
      const xStart = getColFromGridIdx(gridIdx, size)
      const yStart = getRowFromGridIdx(gridIdx, size)

      gridOverlayCtx.fillText(
        gridIdx,
        (xStart + 8) * mosaicDim / size[0],
        (yStart + 8) * mosaicDim / size[1] + 4
      )
    }

    return gridOverlay.toDataURL('image/png')
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

  static generateNumberedMosaicSegmentImage = (gridIdx, size, factor, pieceList, idxToColour) => {
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

    mosaicSeg.width  = factor * 16
    mosaicSeg.height = factor * 16

    const fontSize = factor

    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 16; j++) {
        const xStart = getColFromGridIdx(gridIdx, size)
        const yStart = getRowFromGridIdx(gridIdx, size)

        const mosaicColourAtij = idxToColour[[xStart + i, yStart + j]]

        drawCircle(
          i * factor + factor / 2,
          (j * factor + factor / 2,
          factor / 2,
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
          i * factor + factor / 2,
          j * factor + fontSize / 2,
        )
      }
    }
    factor = prevFactor
    return mosaicSeg.toDataURL('image/png')
  }

}
