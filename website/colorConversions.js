// Thanks to http://www.easyrgb.com/en/math.php#text2

const valInBounds = (val, min, max) => {
  return (min <= val) && (val <= max)
}

const RGBtoXYZ = (rgb) => {
  /* rgb is an array [r, g, b]
  */
  for (c of rgb) {
    if (!valInBounds(c, 0, 255)) { throw `color ${c} out of bounds` }
  }

  const [r, g, b] = rgb

  const Rnorm = (r / 255),
    Gnorm = (g / 255),
    Bnorm = (b / 255);

  const idunnowhatthisdoes = (c) => {
    if (c > 0.04045) {
      return Math.pow(((c + 0.055) / 1.055), 2.4) * 100
    }
    return c / 12.92 * 100
  }

  const Rp = idunnowhatthisdoes(Rnorm),
    Gp = idunnowhatthisdoes(Gnorm),
    Bp = idunnowhatthisdoes(Bnorm);

  // this is begging to be a matrix multiplication :'(
  const X = Rp * 0.4124 + Gp * 0.3576 + Bp * 0.1805,
    Y = Rp * 0.2126 + Gp * 0.7152 + Bp * 0.0722,
    Z = Rp * 0.0193 + Gp * 0.1192 + Bp * 0.9505;

  return [X, Y, Z]
}

const XYZtoLAB = (xyz) => {
  /* reference colours, arbitrarily choosing mid morning daylight (from
   * http://www.easyrgb.com/en/math.php#text2):
   */
  const X2 = 95.799
  const Y2 = 100
  const Z10 = 90.926

  const [X, Y, Z] = xyz

  const Xnorm = X / X2,
    Ynorm = Y / Y2,
    Znorm = Z / Z10;

  const idunnowhatthisdoes = (c) => {
    if (c > 0.008856) {
      return Math.pow(c, 0.33333333333)
    }
    return 7.787 * c  + 16 / 116
  }

  const Xp = idunnowhatthisdoes(Xnorm),
    Yp = idunnowhatthisdoes(Ynorm),
    Zp = idunnowhatthisdoes(Znorm);

  L = (116 * Yp) - 16
  a = 500 * (Xp - Yp)
  b = 200 * (Yp - Zp)

  return [L, a, b]
}

const RGBtoLAB = (rgb) => XYZtoLAB(RGBtoXYZ(rgb))
