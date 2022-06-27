'use strict';


const beautifyLegoColourName = name => name
  .split("_")
  .map(s => s.charAt(0).toUpperCase() + s.slice(1))
  .join(" ")

const IDENTITY = x => x
const add = (a, b) => a + b

const clockmod = (i, m) => i % m ? i % m : m
const getColFromGridIdx = (gridIdx, size) => (clockmod(gridIdx, (size[0] / 16)) - 1) * 16
const getRowFromGridIdx = (gridIdx, size) => Math.floor((gridIdx - 1) / (size[1] / 16)) * 16

const legoColoursToID = {
  "black": 11,
  "blue": 7,
  "bright_green": 36,
  "bright_light_blue": 105,
  "bright_light_orange": 110,
  "bright_light_yellow": 103,
  "bright_pink": 104,
  "coral": 220,
  "dark_azure": 153,
  "dark_blue": 63,
  "dark_bluish_gray": 85,
  "dark_brown": 120,
  "dark_orange": 68,
  "dark_pink": 47,
  "dark_red": 59,
  "dark_tan": 69,
  "dark_turquoise": 39,
  "lavender": 154,
  "light_aqua": 152,
  "light_bluish_gray": 86,
  "light_nougat": 90,
  "lime": 34,
  "magenta": 71,
  "medium_azure": 156,
  "medium_blue": 42,
  "medium_nougat": 150,
  "olive_green": 155,
  "orange": 4,
  "red": 5,
  "reddish_brown": 88,
  "sand_blue": 55,
  "tan": 2,
  "white": 1,
  "yellow": 3,
  "yellowish_green": 158
}


class wantedListGenerator {
  // https://www.bricklink.com/help.asp?helpID=207
  // https://stackoverflow.com/questions/14340894/create-xml-in-javascript
  static createWantedList = (pieceList, size) => {
    /*
     * pieceList is {
     *    color1: {count: n1, colourId: m1},
     *    color2: {count: n2, colourId: m2},
     *    ...
     *  }
     */
    const wantedListDoc = document.implementation.createDocument(null, null)
    const inventory = wantedListDoc.createElement("INVENTORY")

    wantedListDoc.appendChild(inventory)

    wantedListGenerator.setBase(wantedListDoc, inventory, size)

    for (let [colour, countAndDifferentIdObj] of Object.entries(pieceList)) {
      const item = wantedListGenerator.setRound(
        wantedListDoc,
        inventory,
        countAndDifferentIdObj["pieceCount"],
        colour
      )
    }
    return wantedListDoc
  }

  static setBase = (doc, element, size) => {
    const basePlateId = "65803"  // 1x1, 2x2, 3x3, 4x4
    const connectorId = "2780"  // 3 per interior edge
    const basePlateCount = (size / 16) * (size / 16)
    const connectorCount = (size / 16 - 1) * (size / 16 - 1)
    wantedListGenerator.setPiece(doc, element, basePlateId, basePlateCount)
    wantedListGenerator.setPiece(doc, element, connectorId, connectorCount)
  }

  static setRound = (doc, element, count, colour) => {
    // 1x1 round on bricklink
    return wantedListGenerator.setPiece(doc, element, "98138", count, colour)
  }

  static setPiece = (doc, element, itemIdNum, count, colour) => {
    if (count <= 0) return

    const item = doc.createElement("ITEM")

    const itemType = doc.createElement("ITEMTYPE")
    itemType.innerHTML = "P"
    item.appendChild(itemType)

    const itemId = doc.createElement("ITEMID")
    itemId.innerHTML = itemIdNum
    item.appendChild(itemId)

    const minQty = doc.createElement("MINQTY")
    minQty.innerHTML = count.toString()
    item.appendChild(minQty)

    if (colour !== undefined) {
      const colorEl = doc.createElement("COLOR")
      colorEl.innerHTML = legoColoursToID[colour].toString()
      item.appendChild(colorEl)
    }

    element.appendChild(item)
  }

}


class Instructionificator {
  /* There are a lot of magic numbers in this class.
   * We all need more ~~~magic~~~ in our lives!!!
   * You are welcome.
   */
  // 210 x 297 mm
  // 793.706 x 1,122.52 px

  static pdfWidth = 297
  static pdfHeight = 210
  static mosaicDim = 140

  static Instructionificate = (name, coloursUsed, idxToColour, size, factor) => {
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
    doc.rect(0, 0, this.pdfWidth, this.pdfHeight, 'F')
    doc.text(name, this.pdfWidth / 2, 20, { align: "center" })

    const mosaicCircleRadius = this.mosaicDim / (2 * size[0])
    const mosaicTopEdge = 30
    const mosaicLeftEdge = 140

    this.generateFullMosaic(
      doc,
      (this.pdfWidth - this.mosaicDim / 2) / 2 - mosaicCircleRadius * size[0] / 2,
      (this.pdfHeight - this.mosaicDim) / 2,
      mosaicCircleRadius,
      idxToColour
    )

    // INSTRUCTION PAGE
    doc.setFontSize(16)
    doc.addPage('a4', 'landscape')
    doc.rect(0, 0, this.pdfWidth, this.pdfHeight, 'F')
    doc.text(
        "Fill in each tile 16x16 tile, piece by piece. Connect each edge of each tile " \
      + "with three connector pieces. There is also a '.txt' file that was also downloaded " \
      + "that lets you ",
      this.pdfWidth / 2,
      this.pdfHeight / 2,
      { align: "center", baseline: "middle", maxWidth: '' + 0.8 * this.pdfWidth }
    )

    // FULL PIECE LIST
    doc.addPage('a4', 'landscape')
    doc.rect(0, 0, this.pdfWidth, this.pdfHeight, 'F')

    this.generateFullMosaic(
      doc,
      mosaicLeftEdge,
      mosaicTopEdge,
      mosaicCircleRadius,
      idxToColour
    )

    this.generateFullPieceList(
      doc, 20, 8, coloursUsed, factor
    )

    this.makeGridOverlay(
      doc,
      mosaicLeftEdge,
      mosaicTopEdge,
      size
    )

    // REST OF THE PAGES
    for (let gridIdx = 1; gridIdx < numMajorSquares + 1; gridIdx++) {
      doc.addPage('a4', 'landscape')

      // Make black background
      doc.rect(0, 0, this.pdfWidth, this.pdfHeight, 'F')

      this.generatePagePieceList(doc, 20, 8, gridIdx, size, factor, coloursUsed, idxToColour)

      doc.setFontSize(24)
      doc.setTextColor(192, 192, 192)
      doc.text(
        `Tile ${gridIdx}`,
        mosaicLeftEdge + this.mosaicDim / 2,
        mosaicTopEdge,
        { align: "center" }
      )

      this.generateNumberedMosaicSegment(
        doc,
        mosaicLeftEdge,
        mosaicTopEdge + 10,
        gridIdx,
        size,
        factor,
        coloursUsed,
        idxToColour
      )
    }

    doc.save(`${name}.pdf`)
  }

  static makeGridOverlay = (doc, x0, y0, size) => {
    const fontSize = 12 * (6 - size[0] / 16)

    doc.setFontSize(fontSize)
    doc.setTextColor(255, 255, 255)

    const numMajorSquares = Math.pow(size[0] / 16, 2)
    for (let gridIdx = 1; gridIdx < numMajorSquares + 1; gridIdx++) {
      const xStart = getColFromGridIdx(gridIdx, size)
      const yStart = getRowFromGridIdx(gridIdx, size)

      doc.text(
        gridIdx.toString(),
        (xStart + 8) * this.mosaicDim / size[0] + x0,
        (yStart + 8) * this.mosaicDim / size[1] + y0,
        { baseline: 'middle', align: 'center' }
      )
    }
  }

  static generatePieceList = (doc, x0, y0, factor, pieceKVs) => {
    const numColours = Object.keys(pieceKVs).length
    const r = factor / 4 + (35 - numColours) / 10
    const fontSize = factor + (35 - numColours) / 5

    doc.setFontSize(fontSize)
    doc.setTextColor(255, 255, 255)

    const pieceListHeight = (2.5 * r * numColours)

    let ypos = 0
    for (const [colourName, colourInfo] of pieceKVs) {
      const x = x0 + 2 * r
      const y = this.pdfHeight / 2 - pieceListHeight / 2 + 2.5 * r * ypos++

      doc.setFillColor(...legoColours[colourName])
      doc.circle(x, y, r, 'F')

      if (legoColours[colourName].reduce(add) > 127 * 3)
        doc.setTextColor(0, 0, 0)
      else
        doc.setTextColor(255, 255, 255)

      doc.text(
        `${colourInfo['colourID']}`,
        x,
        y,
        { baseline: "middle", align: "center" }
      )

      doc.setTextColor(255, 255, 255)
      doc.text(
        `${beautifyLegoColourName(colourName)}, ${colourInfo['pageCount']}`,
        x + 1.618 * r,
        y,
        { baseline: "middle" }
      )
    }
  }

  static generatePagePieceList = (doc, x0, y0, gridIdx, size, factor, coloursUsed, idxToColour) => {
    const pageColours = {}
    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 16; j++) {
        const xStart = getColFromGridIdx(gridIdx, size)
        const yStart = getRowFromGridIdx(gridIdx, size)

        const mosaicColourAtij = idxToColour[[xStart + i, yStart + j]]
        if (!pageColours[mosaicColourAtij]) {
          pageColours[mosaicColourAtij] = 0
        }
        pageColours[mosaicColourAtij]++
      }
    }

    const pieceKVs = Object.entries(coloursUsed)
      .filter(e => Object.keys(pageColours).includes(e[0]))
      .sort((e1, e2) => e1[1]['colourID'] > e2[1]['colourID'])

    pieceKVs.forEach(e => e[1]['pageCount'] = pageColours[e[0]])

    this.generatePieceList(doc, x0, y0, factor, pieceKVs)
  }

  static generateFullPieceList = (doc, x0, y0, coloursUsed, factor) => {
    const pieceKVs = Object.entries(coloursUsed)
      .filter(e => e[1]['colourID'] != undefined)
      .sort((e1, e2) => e1[1]['colourID'] > e2[1]['colourID'])

    pieceKVs.forEach(e => e[1]['pageCount'] = coloursUsed[e[0]]['pieceCount'])

    this.generatePieceList(doc, x0, y0, factor, pieceKVs)
  }

  static generateFullMosaic = (doc, x0, y0, r, idxToColour) => {
    for (let [idx, colour] of Object.entries(idxToColour)) {
      const [i, j] = idx.split(",").map(Number)
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
          x, y, { align: "center", baseline: "middle" }
        )
      }
    }
  }

}
