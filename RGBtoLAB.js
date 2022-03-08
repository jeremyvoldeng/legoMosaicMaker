// Thanks to http://www.easyrgb.com/en/math.php#text2 for formulas

'use strict'

const idunnowhatthisdoesRGBtoXYZ = (c) => {
  if (c > 0.04045) {
    return Math.pow(((c + 0.055) / 1.055), 2.4) * 100
  }
  return c / 12.92 * 100
}

const idunnowhatthisdoesXYZtoLAB = (c) => {
  if (c > 0.008856) {
    return Math.pow(c, 0.33333333333)
  }
  return 7.787 * c + 16 / 116
}

// smaller function == faster function?
const RGBtoXYZ = (rgb) => {
  /* rgb is an array [r, g, b]
  */
  const Rp = idunnowhatthisdoesRGBtoXYZ(rgb[0] / 255),
    Gp = idunnowhatthisdoesRGBtoXYZ(rgb[1] / 255),
    Bp = idunnowhatthisdoesRGBtoXYZ(rgb[2] / 255);

  return [
    Rp * 0.4124 + Gp * 0.3576 + Bp * 0.1805,
    Rp * 0.2126 + Gp * 0.7152 + Bp * 0.0722,
    Rp * 0.0193 + Gp * 0.1192 + Bp * 0.9505
  ]
}

const XYZtoLAB = (xyz) => {
  /* reference colours, arbitrarily choosing mid morning daylight (from
   * http://www.easyrgb.com/en/math.php#text2):
   */
  // X2, Y2, Z10 constants
  const Xp = idunnowhatthisdoesXYZtoLAB(xyz[0] / 95.799),
    Yp = idunnowhatthisdoesXYZtoLAB(xyz[1] / 100),
    Zp = idunnowhatthisdoesXYZtoLAB(xyz[2] / 90.926);

  return [
    (116 * Yp) - 16,
    500 * (Xp - Yp),
    200 * (Yp - Zp)
  ]
}

const RGBtoLAB = (rgb) => XYZtoLAB(RGBtoXYZ(rgb))
