// Thanks to http://www.easyrgb.com/en/math.php#text2

const valInBounds = (val, min, max) => {
  return (min <= val) && (val <= max)
}

const RGBtoHSL = (rgb) => {
  /* rgb is an array [r, g, b]
   */
  for (c of rgb) {
    if (!valInBounds(c, 0, 255)) { throw `color ${c} out of bounds` }
  }

  const [r, g, b] = rgb

  const Rnorm = (r / 255),
        Gnorm = (g / 255),
        Bnorm = (b / 255);

  const min_val = Math.min(Rnorm, Gnorm, Bnorm)
  const max_val = Math.max(Rnorm, Gnorm, Bnorm)
  const delta = max_val - min_val

  let H, S, L

  L = (min_val + max_val) / 2

  if (delta == 0) return [0, 0, L]

  if (L < 0.5)
    S = delta / (min_val + max_val)
  else
    S = delta / (2 - min_val - max_val)

  const del_R = (((max_val - Rnorm) / 6) + (delta / 2)) / delta
  const del_G = (((max_val - Gnorm) / 6) + (delta / 2)) / delta
  const del_B = (((max_val - Bnorm) / 6) + (delta / 2)) / delta

  if (Rnorm == max_val) {
    H = del_B - del_G
  } else if (Gnorm == max_val) {
    H = (1 / 3) * del_R - del_B
  } else {
    H = (2 / 3) * del_G - del_R
  }

  if (H < 0) { H++ }
  else if (H > 1) { H-- }

  // H = H * 359

  return [H, S, L]
}

const HSLtoRGB = (HSL) => {
  for (c of HSL) {
    if (!valInBounds(c, 0, 1)) { throw `color ${c} out of bounds` }
  }

  let R, G, B
  const [H, S, L] = HSL

  let v1, v2
  if (S == 0) {
    R = L * 255
    G = L * 255
    B = L * 255
  } else {
    if (L < 0.5)
      v1 = L * (1 + S)
    else
      v1 = (L + S) - S * L

    v2 = 2 * L - v1

    R = 255 * HuetoRGB(v2, v1, H + 1 / 3)
    G = 255 * HuetoRGB(v2, v1, H)
    B = 255 * HuetoRGB(v2, v1, H - 1 / 3)
  }

  return [R, G, B]
}

const HuetoRGB = (a, b, H) => {
  if (H < 0) { H++ }
  else if (H > 1) { H-- }

  if (6 * H < 1) return (a + (b - a) * 6 * H)
  else if (2 * H < 1) return b
  else if (3 * H < 1) return (a + 6 * (b - a) * (2 / 3 - H))
  else return a
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
