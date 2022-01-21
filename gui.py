import PySimpleGUI as sg
from PIL import ImageTk, Image, ImageEnhance
import os
import legoImageMaker
import io

sg.theme('DarkBlue1')

image_viewer_column_left = [
    [sg.Text("Original Image:")],
    [sg.Image(key="-IMAGE-")],
]

image_viewer_column_right = [
    [sg.Text("Mosiac:")],
    [sg.Image(key="-LEGOIMAGE-")],
]

piece_viewer_column = [
    [sg.Text("Pieces Required: ")],
    [sg.Image(key="PIECES")],
]

layout = [
    [
        sg.Text("Lego Mosiac Maker", size = (100,2), font = 'Arial 20 bold' ), 
    ],[
        sg.Text("Select an Image: "), 
        sg.FileBrowse(key="-IN-"), 
        sg.Button("Submit"),
        sg.Text("Enter a name for the Image: "),
        sg.Input(key="Name", size = (20,1)),
        sg.VSeparator(),
        sg.Text("Size (16x16 Plates): "),
        sg.Text("Width"),
        sg.Input("3", size = (4,10), key="width"),
        sg.Text("Height"),
        sg.Input("3", size = (4,10), key="height"),
    ],[
        sg.Text("Image Adjustment Sliders: ", font = 'Arial 12 bold'),
    ],[
        sg.Text("Move the sliders to adjust the image settings. Alternatively, use the inputs below.", font = 'Arial 8 bold'),
    ],[
        sg.VSeparator(),
        sg.Text("Saturation"), 
        sg.Slider(range=(0,200), default_value=100, orientation="h", key="-SATURATION-", enable_events=True),
        sg.VSeperator(),
        sg.Text("Brightness"), 
        sg.Slider(range=(0,200), default_value=100, orientation="h", key="-BRIGHTNESS-", enable_events=True),
        sg.VSeperator(),
        sg.Text("Sharpness"), 
        sg.Slider(range=(0,200), default_value=100, orientation="h", key="-SHARPNESS-", enable_events=True),
        sg.VSeperator(),
        sg.Text("Contrast"), 
        sg.Slider(range=(0,200), default_value=100, orientation="h", key="-CONTRAST-", enable_events=True),
        sg.VSeperator(),
    ],[
        sg.Text("Image Adjustment Inputs: ", font = 'Arial 12 bold'),
    ],[
        sg.Text("Input a value between 0-200 to adjust the image settings. Alternatively, use the sliders above.", font = 'Arial 8 bold'),
    ],[
        sg.Text("Saturation:"), 
        sg.Input("100",size = (4,10), key='SATINPUT'),
        sg.VSeperator(),
        sg.Text("Brightness:"), 
        sg.Input("100",size = (4,10), key='BRIINPUT'),
        sg.VSeperator(),
        sg.Text("Sharpness:"),
        sg.Input("100",size = (4,10), key='SHAINPUT'),
        sg.VSeperator(),
        sg.Text("Contrast:"), 
        sg.Input("100",size = (4,10), key='CONINPUT'),
        sg.VSeperator(),
        sg.Button("Reset"),
        sg.Button("Enter"),
    ],[
        sg.Column(image_viewer_column_left),
        sg.VSeperator(),
        sg.Column(image_viewer_column_right),
        sg.VSeperator(),
        sg.Column(piece_viewer_column)
    ],
    [
        sg.Button("-DOWNLOAD-"),
        sg.Button("-SAVEIMAGE-"),
    ],
    [
        sg.Text("",key="Error"),
    ],
    [
        sg.Text("INSTRUCTIONS: \n \
            1. Download the image you would like to make a mosaic. \n \
            2. Crop the image to an aspect ratio with integer numbers (Ex. 3x3, 2x4, etc) !! If you don't do this, part of your image might be cropped out!\n \
            3. Upload the image using the \'Browse\' button \n \
            4. Select the width and height you would like to use that matches your image. For example, Lego uses a 3x3 grid of 16x16 plates for all mosaics except for the World Map, which uses 8x5. \n \
            5. Hit \'Submit\' \n \
            6. Adjust colour sliders to your liking. For example, sometimes adjusting brightness can bring out sharper colours and remove unwanted colours. \n \
            7. When you are satisfied, hit the Download button. A PDF copy of instructions for building as well as required pieces will be downloaded to your computer. \n \
            8. Enjoy building! :)"),
    ],
]

originalImage = Image
editedImage = Image
legoImage = Image
saturation = 1.0
sharpness = 1.0
brightness = 1.0
contrast = 1.0
newSize = 0,0

def processImage(image):
    global legoImage
    legoImage, numbersImage = legoImageMaker.generateMosaic(image)
    legoImage = legoImage.resize(newSize)
    bio = io.BytesIO()
    legoImage.save(bio,  format = "PNG")
    window["-LEGOIMAGE-"].update(bio.getvalue())
    width = numbersImage.width
    height = numbersImage.height
    factor = height/500
    numbersImage = numbersImage.resize((int(width/factor),int(height/factor)))
    bio = io.BytesIO()
    numbersImage.save(bio, format = 'PNG')
    window["PIECES"].update(bio.getvalue())

def updatedImageSettings(image):
    converter = ImageEnhance.Color(image)
    image = converter.enhance(saturation)
    converter = ImageEnhance.Sharpness(image)
    image = converter.enhance(sharpness)
    converter = ImageEnhance.Brightness(image)
    image = converter.enhance(brightness)
    converter = ImageEnhance.Contrast(image)
    image = converter.enhance(contrast)

window = sg.Window("Lego Mosaic Maker", layout, size=(1600,900), resizable=True)

while True:
    event, values = window.read()
 
    if event == "Exit" or event == sg.WIN_CLOSED:
        break
    elif event == "Submit":
        filename = values["-IN-"]
        size = 16*int(values["width"][0]), 16*int(values["height"][0])
        legoImageMaker.updateSize(size)
        try:
            originalImage = Image.open(filename)
            editedImage = originalImage
            factor = size[1]/500
            newSize = (int(size[0]/factor), 500)
            originalImage = originalImage.resize(newSize)
            bio = io.BytesIO()
            originalImage.save(bio,  format = "PNG")
            window["-IMAGE-"].update(bio.getvalue())
            processImage(originalImage)
        except: 
            window['Error'].update("ERROR: No Image Selected!")

    elif event == "-DOWNLOAD-":
        name = values["Name"]
        legoImageMaker.makeInstructions(name).save()

    elif event == "-SAVEIMAGE-":
        legoImageMaker.newImage.save('mosaic.jpg')

    elif event == "Reset":
        try:
            saturation = 1.0
            brightness = 1.0
            contrast = 1.0
            sharpness = 1.0
            window['-SATURATION-'].update(saturation*100)
            window['-BRIGHTNESS-'].update(brightness*100)
            window['-CONTRAST-'].update(contrast*100)
            window['-SHARPNESS-'].update(sharpness*100)
            imageCopy = originalImage.copy()
            converter = ImageEnhance.Color(imageCopy)
            imageCopy = converter.enhance(saturation)
            converter = ImageEnhance.Sharpness(imageCopy)
            imageCopy = converter.enhance(sharpness)
            converter = ImageEnhance.Brightness(imageCopy)
            imageCopy = converter.enhance(brightness)
            converter = ImageEnhance.Contrast(imageCopy)
            imageCopy = converter.enhance(contrast)
            bio = io.BytesIO()
            imageCopy.save(bio, format = "PNG")
            window["-IMAGE-"].update(bio.getvalue())
            processImage(imageCopy)
        except: 
            window['Error'].update("ERROR: No Image Selected!")

    elif event == "Enter":
        sat = int(values['SATINPUT'])
        bri = int(values['BRIINPUT'])
        sha = int(values['SHAINPUT'])
        con = int(values['CONINPUT'])
        # print(sat/100)
        # print(bri/100)
        # print(sha/100)
        # print(con/100)
        try:
            saturation = sat/100
            brightness = bri/100
            contrast = con/100
            sharpness = sha/100
            window['-SATURATION-'].update(saturation*100)
            window['-BRIGHTNESS-'].update(brightness*100)
            window['-CONTRAST-'].update(contrast*100)
            window['-SHARPNESS-'].update(sharpness*100)
            imageCopy = originalImage.copy()
            converter = ImageEnhance.Color(imageCopy)
            imageCopy = converter.enhance(saturation)
            converter = ImageEnhance.Sharpness(imageCopy)
            imageCopy = converter.enhance(sharpness)
            converter = ImageEnhance.Brightness(imageCopy)
            imageCopy = converter.enhance(brightness)
            converter = ImageEnhance.Contrast(imageCopy)
            imageCopy = converter.enhance(contrast)
            bio = io.BytesIO()
            imageCopy.save(bio, format = "PNG")
            window["-IMAGE-"].update(bio.getvalue())
            processImage(imageCopy)
        except: 
            window['Error'].update("ERROR: No Image Selected!")

    elif event == "-SATURATION-":
        i = values['-SATURATION-']
        try:
            window['SATINPUT'].update(int(i))
            saturation = i/100
            imageCopy = originalImage.copy()
            converter = ImageEnhance.Color(imageCopy)
            imageCopy = converter.enhance(saturation)
            converter = ImageEnhance.Sharpness(imageCopy)
            imageCopy = converter.enhance(sharpness)
            converter = ImageEnhance.Brightness(imageCopy)
            imageCopy = converter.enhance(brightness)
            converter = ImageEnhance.Contrast(imageCopy)
            imageCopy = converter.enhance(contrast)
            bio = io.BytesIO()
            imageCopy.save(bio, format = "PNG")
            window["-IMAGE-"].update(bio.getvalue())
            processImage(imageCopy)
        except: 
            window['Error'].update("ERROR: No Image Uploaded!")

    elif event == "SATINPUT":
        i = values['SATINPUT']
        print("yuh")
        try:
            window['-SATURATION-'].update(int(i))
            saturation = i/100
            imageCopy = originalImage.copy()
            converter = ImageEnhance.Color(imageCopy)
            imageCopy = converter.enhance(saturation)
            converter = ImageEnhance.Sharpness(imageCopy)
            imageCopy = converter.enhance(sharpness)
            converter = ImageEnhance.Brightness(imageCopy)
            imageCopy = converter.enhance(brightness)
            converter = ImageEnhance.Contrast(imageCopy)
            imageCopy = converter.enhance(contrast)
            bio = io.BytesIO()
            imageCopy.save(bio, format = "PNG")
            window["-IMAGE-"].update(bio.getvalue())
            processImage(imageCopy)
        except: 
            window['Error'].update("ERROR: No Image Uploaded!")
    
    elif event == "-BRIGHTNESS-":
        i = values['-BRIGHTNESS-']
        try:
            window['BRIINPUT'].update(int(i))
            brightness = i/100
            imageCopy = originalImage.copy()
            converter = ImageEnhance.Color(imageCopy)
            imageCopy = converter.enhance(saturation)
            converter = ImageEnhance.Sharpness(imageCopy)
            imageCopy = converter.enhance(sharpness)
            converter = ImageEnhance.Brightness(imageCopy)
            imageCopy = converter.enhance(brightness)
            converter = ImageEnhance.Contrast(imageCopy)
            imageCopy = converter.enhance(contrast)
            bio = io.BytesIO()
            imageCopy.save(bio, format = "PNG")
            window["-IMAGE-"].update(bio.getvalue())
            processImage(imageCopy)
        except:
            window['Error'].update("ERROR: No Image Uploaded!")

    elif event == "-SHARPNESS-":
        i = values['-SHARPNESS-']
        try:
            window['SHAINPUT'].update(int(i))
            sharpness = i/100
            imageCopy = originalImage.copy()
            converter = ImageEnhance.Color(imageCopy)
            imageCopy = converter.enhance(saturation)
            converter = ImageEnhance.Sharpness(imageCopy)
            imageCopy = converter.enhance(sharpness)
            converter = ImageEnhance.Brightness(imageCopy)
            imageCopy = converter.enhance(brightness)
            converter = ImageEnhance.Contrast(imageCopy)
            imageCopy = converter.enhance(contrast)
            bio = io.BytesIO()
            imageCopy.save(bio, format = "PNG")
            window["-IMAGE-"].update(bio.getvalue())
            processImage(imageCopy)
        except:
            window['Error'].update("ERROR: No Image Uploaded!")

    elif event == "-CONTRAST-":
        i = values['-CONTRAST-']
        try:
            window['CONINPUT'].update(int(i))
            contrast = i/100
            imageCopy = originalImage.copy()
            converter = ImageEnhance.Color(imageCopy)
            imageCopy = converter.enhance(saturation)
            converter = ImageEnhance.Sharpness(imageCopy)
            imageCopy = converter.enhance(sharpness)
            converter = ImageEnhance.Brightness(imageCopy)
            imageCopy = converter.enhance(brightness)
            converter = ImageEnhance.Contrast(imageCopy)
            imageCopy = converter.enhance(contrast)
            bio = io.BytesIO()
            imageCopy.save(bio, format = "PNG")
            window["-IMAGE-"].update(bio.getvalue())
            processImage(imageCopy)
        except:
            window['Error'].update("ERROR: No Image Uploaded!")

window.close() 