'use strict';

const clockmod = (i,m) => i % m ? i % m : m
const getColFromGridIdx = (gridIdx, size) => (clockmod(gridIdx, (size[0] / 16)) - 1) * 16
const getRowFromGridIdx = (gridIdx, size) => Math.floor((gridIdx - 1) / (size[1] / 16)) * 16


class Instructionificator {
  /* There are a lot of magic numbers in this class.
   * We all need more ~~~magic~~~ in our lives!!!
   * You are welcome.
   */

  static Instructionificate = (name, mainMosaic, coloursUsed, idxToColour, size, factor) => {

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

    const mosaicCircleRadius = mosaicDim / (2 * size[0])

    this.generateFullMosaic(
      doc,
      (pdfWidth - mosaicDim / 2) / 2 - mosaicCircleRadius * size[0] / 2,
      (pdfHeight - mosaicDim) / 2,
      mosaicCircleRadius,
      idxToColour
    )

    // INSTRUCTION PAGE
    doc.addPage('a4', 'landscape')
    doc.rect(0, 0, pdfWidth, pdfHeight, 'F')
    doc.setFontSize(16)
    doc.setTextColor(192, 192, 192)
    doc.text(
      `The following pages have each 16x16 tile section displayed, with the corresponding colour code on the margin. Fill it all in!\nThere are ${size[0] * size[1]} total pieces.`,
      mosaicDim / 6,
      (pdfHeight - mosaicDim) / 2,
      {maxWidth: mosaicDim / 2}
    )

    this.generateFullMosaic(
      doc,
      (pdfWidth - mosaicDim / 2) / 2,
      (pdfHeight - mosaicDim) / 2,
      mosaicCircleRadius,
      idxToColour
    )

    this.makeGridOverlay(
      doc,
      (pdfWidth - mosaicDim / 2) / 2,
      (pdfHeight - mosaicDim) / 2,
      mosaicDim,
      size
    )

    // REST OF THE PAGES
    for (let gridIdx = 1; gridIdx < numMajorSquares + 1; gridIdx++) {
      doc.addPage('a4', 'landscape')

      // Make black background
      doc.rect(0, 0, pdfWidth, pdfHeight, 'F')

      this.generatePagePieceList(doc, 20, 8, gridIdx, size, factor, coloursUsed, idxToColour)

      const mosaicLeftEdge = 140
      const mosaicTopEdge = 20
      this.generateNumberedMosaicSegment(
        doc,
        mosaicLeftEdge,
        mosaicTopEdge,
        gridIdx,
        size,
        factor,
        coloursUsed,
        idxToColour
      )

      doc.setFontSize(24)
      doc.setTextColor(192, 192, 192)
      doc.text(`Tile ${gridIdx}`, mosaicLeftEdge + mosaicDim / 2, 30 + mosaicTopEdge + mosaicDim, { align: "center" })
    }

    doc.save(`${name}.pdf`)
  }

  static makeGridOverlay = (doc, x0, y0, mosaicDim, size) => {
    // const fontSize = size[0] == 64 ? 16 : 12 * (6 - size[0] / 16)
    const fontSize = 12 * (6 - size[0] / 16)

    doc.setFontSize(fontSize)
    doc.setTextColor(255,255,255)

    const numMajorSquares = Math.pow(size[0] / 16, 2)
    for (let gridIdx = 1; gridIdx < numMajorSquares + 1; gridIdx++) {
      const xStart = getColFromGridIdx(gridIdx, size)
      const yStart = getRowFromGridIdx(gridIdx, size)

      doc.text(
        gridIdx.toString(),
        (xStart + 8) * mosaicDim / size[0] + x0,
        (yStart + 8) * mosaicDim / size[1] + y0,
        { baseline: 'middle', align: 'center' }
      )
    }
  }

  static generatePagePieceList = (doc, x0, y0, gridIdx, size, factor, coloursUsed, idxToColour) => {
    const height = 35 * (factor * 2.5) + 25
    const width = height / 2.4

    const pageColourCount = {}
    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 16; j++) {
        const xStart = getColFromGridIdx(gridIdx, size)
        const yStart = getRowFromGridIdx(gridIdx, size)

        const mosaicColourAtij = idxToColour[[xStart + i, yStart + j]]
        if (!pageColourCount[mosaicColourAtij]) {
          pageColourCount[mosaicColourAtij] = 0
        }
        pageColourCount[mosaicColourAtij]++
      }
    }

    const pieceKVs = Object.entries(coloursUsed)
      .filter(e => Object.keys(pageColourCount).includes(e[0]))
      .sort((e1, e2) => e1[1]['colourID'] > e2[1]['colourID'])

    let ypos = 0
    const r = factor / 4 + (35 - Object.keys(pieceKVs).length) / 10
    const fontSize = factor + (35 - Object.keys(pieceKVs).length) / 5

    doc.setFontSize(fontSize)
    doc.setTextColor(255,255,255)

    for (const [colourName, colourInfo] of pieceKVs) {
      const x = x0 + 2 * r
      const y = 3 * r + 2.5 * r * ypos++

      doc.setFillColor(...legoColours[colourName])
      doc.circle(x, y, r, 'F')

      doc.text(
        `${colourInfo['colourID']}: ${beautifyLegoColourName(colourName)}, ${pageColourCount[colourName]}`,
        x + 1.618 * r,
        y,
        { baseline: "middle" }
      )
    }
  }

  static generateFullPieceList = (doc, x0, y0, coloursUsed, factor) => {
    const height = 35 * (factor * 2.5) + 25
    const width = height / 2.4

    const pieceKVs = Object.entries(coloursUsed)
      .filter(e => e[1]['colourID'] != undefined)
      .sort((e1, e2) => e1[1]['colourID'] > e2[1]['colourID'])

    const r = factor / 4
    const fontSize = factor
    for (const [colourName, colourInfo] of pieceKVs) {
      const x = x0 + 2 * r
      const y = y0 + 2.5 * r * colourInfo['colourID']

      doc.setFillColor(...legoColours[colourName])
      doc.circle(x, y, r, 'F')

      doc.setFontSize(fontSize)
      doc.setTextColor(255,255,255)
      doc.text(
        `${colourInfo['colourID']}: ${colourName}, ${colourInfo['pieceCount']}`,
        x + 1.618 * r,
        y,
        { baseline: "middle" }
      )
    }
  }

  static generateFullMosaic = (doc, x0, y0, r, idxToColour) => {
    for (let [idx, colour] of Object.entries(idxToColour)) {
      const [i,j] = idx.split(",").map(Number)
      const x = i * 2 * r + x0
      const y = j * 2 * r + y0
      doc.setFillColor(...legoColours[colour])
      doc.circle(x, y, r, 'F')
    }
  }

  static generateNumberedMosaicSegment = (doc, x0, y0, gridIdx, size, factor, coloursUsed, idxToColour) => {
    /*
     *  Mosaics can be size 16, 32, 48, 64 (multiples of 16):
     *
     *                     gridIdx Numbering
     *                     -----------------
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
    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 16; j++) {
        const xStart = getColFromGridIdx(gridIdx, size)
        const yStart = getRowFromGridIdx(gridIdx, size)

        const mosaicColourAtij = idxToColour[[xStart + i, yStart + j]]
        const x = i * factor + factor / 2 + x0
        const y = j * factor + factor / 2 + y0

        doc.setFillColor(...legoColours[mosaicColourAtij])
        doc.circle(x, y, factor / 2, 'F')

        if (legoColours[mosaicColourAtij].reduce(add) > 127 * 3)
          doc.setTextColor(0, 0, 0)
        else
          doc.setTextColor(255, 255, 255)

        doc.setFontSize(12)
        doc.text(
          '' + coloursUsed[mosaicColourAtij]["colourID"], // fastest way to convert to str
          x, y, { align: "center" , baseline: "middle" }
        )
      }
    }
  }

}
