from tkinter.constants import CENTER
from typing import Text
from  PIL import Image, ImageDraw, ImageFont
from math import sqrt
from reportlab.pdfgen import textobject
from reportlab.pdfgen.canvas import Canvas
from tempfile import NamedTemporaryFile

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

coloursUsed = {
    "black" : [0,0],
    "blue" : [0,0],
    "bright_green" : [0,0],
    "bright_light_blue" : [0,0],
    "bright_light_orange" : [0,0],
    "bright_light_yellow" : [0,0],
    "bright_pink" : [0,0],
    "coral" : [0,0],
    "dark_azure" : [0,0],
    "dark_blue" : [0,0],
    "dark_bluish_gray" : [0,0],
    "dark_brown" : [0,0],
    "dark_orange" : [0,0],
    "dark_pink" : [0,0],
    "dark_red" : [0,0],
    "dark_tan" : [0,0],
    "dark_turquoise" : [0,0],
    "lavender" : [0,0],
    "light_aqua" : [0,0],
    "light_bluish_gray" : [0,0],
    "light_nougat" : [0,0],
    "lime" : [0,0],
    "magenta" : [0,0],
    "medium_azure" : [0,0],
    "medium_blue" : [0,0],
    "medium_nougat" : [0,0],
    "olive_green" : [0,0],
    "orange" : [0,0],
    "red" : [0,0],
    "reddish_brown" : [0,0],
    "sand_blue" : [0,0],
    "tan" : [0,0],
    "white" : [0,0],
    "yellow" : [0,0],
    "yellowish_green" : [0,0]
}

factor = 100
size = 48, 48

font = ImageFont.truetype("arial.ttf", 19)
numberTileFont = ImageFont.truetype("arial.ttf", 70)

newImage = Image
draw = ImageDraw
newImageNumbers = Image
drawNumbers = ImageDraw

def updateSize(newSize):
    global size
    size = newSize

def processImage(album):
    global newImage
    global draw
    global newImageNumbers
    global drawNumbers

    newImage = Image.new('RGB', (factor*size[0],factor*size[1]),(0,0,0))
    draw = ImageDraw.Draw(newImage)
    newImageNumbers = Image.new('RGB', (factor*size[0],factor*size[1]),(0,0,0))
    drawNumbers = ImageDraw.Draw(newImageNumbers)

    image = album.copy()
    image.thumbnail(size)

    for colours in coloursUsed:
        coloursUsed[colours] = [0,0]

    count = 1

    textColour = (255,255,255)

    for i in range(size[0]):
        for j in range(size[1]):
            [r,g,b] = image.getpixel((i,j))
            colourDifs = []
            for colour in legoColours:
                [cr,cg,cb] = legoColours[colour]
                colourDif = sqrt(abs(r-cr)**2 + abs(g-cg)**2 + abs(b-cb)**2)
                colourDifs.append((colourDif,legoColours[colour], colour))
            fill=tuple(min(colourDifs)[1])
            colour = min(colourDifs)[2]
            draw.ellipse((i*factor,j*factor,i*factor+factor-1,j*factor+factor-1),fill)
            drawNumbers.ellipse((i*factor,j*factor,i*factor+factor-1,j*factor+factor-1),fill)
            coloursUsed[colour][0] = coloursUsed[colour][0] + 1

            if sum(legoColours[colour]) > 450:
                 textColour = (0,0,0)
            else:
                textColour = (255,255,255)
            if coloursUsed[colour][1] > 0:
                drawNumbers.text((i*factor + 50, j*factor + 50), str(coloursUsed[colour][1]), font=numberTileFont, anchor="mm", fill=textColour)
            else:
                coloursUsed[colour][1] = count
                count = count + 1
                drawNumbers.text((i*factor + 50, j*factor + 50), str(coloursUsed[colour][1]), font=numberTileFont, anchor="mm", fill=textColour)

    colourNumbersImage = Image.new('RGB', (400, 1000),(0,0,0))
    draw = ImageDraw.Draw(colourNumbersImage)
    textColour = (200,200,200)
    for key, values in coloursUsed.items():
        if values[1] > 0:
            fill = (legoColours[key][0],legoColours[key][1],legoColours[key][2])
            draw.ellipse((12, 2+(25*values[1]), 33, 23+(25*values[1])), fill=fill)
            name = str(key)
            name = name.replace('_', ' ')
            draw.text((40, 3+(25*values[1])), ": " + name + ", " + str(coloursUsed[key][0]), font=font, fill=textColour)

    return newImage, colourNumbersImage

def makeInstructions(title):
    width = int(size[0]/16)
    height = int(size[1]/16)
    instructionPDF = Canvas(title + ".pdf", pagesize=(850,600))
    colourNumbersImage = Image.new('RGB', (400, 1000),(0,0,0))
    draw = ImageDraw.Draw(colourNumbersImage)
    textColour = (200,200,200)
    for key, values in coloursUsed.items():
        if values[1] > 0:
            fill = (legoColours[key][0],legoColours[key][1],legoColours[key][2])
            draw.ellipse((12, 2+(25*values[1]), 33, 23+(25*values[1])), fill=fill)
            name = str(key)
            name = name.replace('_', ' ')
            draw.text((40, 3+(25*values[1])), str(values[1]) + ": " + name + ", " + str(coloursUsed[key][0]), font=font, fill=textColour)

    colourNumbersImage.save(NamedTemporaryFile(), format = 'PNG')

    path = instructionPDF.beginPath()
    path.moveTo(0,0)
    path.lineTo(0,600)
    path.lineTo(850,600)
    path.lineTo(850,0)
    instructionPDF.drawPath(path, True,True)
    titleImage = Image.new('RGB', (850, 50), (0,0,0))
    drawText = ImageDraw.Draw(titleImage)
    drawText.text(xy=(425,25),text= title, anchor= "mm", font = ImageFont.truetype("GILSANUB", 25))
    instructionPDF.drawInlineImage(titleImage, x=0,y=550)
    instructionPDF.drawInlineImage(newImage, (850-500/height*width)/2, 50, width= 500/height*width, height= 500)
    instructionPDF.showPage()

    count = 1

    for i in range(width):
        for j in range(height):
            imageSegment = newImageNumbers.copy()
            (left, upper, right, lower) = (i*size[0]*factor/width, j*size[1]*factor/height, (i+1)*size[0]*factor/width, (j+1)*size[1]*factor/height)
            imageSegment = imageSegment.crop((left, upper, right, lower))
            imageSegment.save(NamedTemporaryFile(), format='PNG')
            instructionPDF.setFillColorRGB(0,0,0)
            path = instructionPDF.beginPath()
            path.moveTo(0,0)
            path.lineTo(0,600)
            path.lineTo(850,600)
            path.lineTo(850,0)
            instructionPDF.drawPath(path, True,True)
            pageNumberImage = Image.new('RGB', (50,50),(0,0,0))
            drawPageNumber = ImageDraw.Draw(pageNumberImage)
            drawPageNumber.text(xy=(25,25),text = str(count),anchor='mm', font = ImageFont.truetype("arial.ttf", 10))
            instructionPDF.drawInlineImage(pageNumberImage, x=0,y=0)
            instructionPDF.drawInlineImage(imageSegment, 300, 50, width= 500, height= 500)
            instructionPDF.drawInlineImage(colourNumbersImage, 50, 50, width= 200, height= 500)
            instructionPDF.showPage()
            count = count + 1

    return instructionPDF