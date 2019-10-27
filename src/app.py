#!/usr/bin/python

# Flask
from flask import Flask, render_template, jsonify, request, flash, redirect, url_for
from flask_bootstrap import Bootstrap
from werkzeug.utils import secure_filename
# Pandas
import pandas as pd
# Numpy
import numpy as np
# OS
import os
# Config
import config
# Sessions
from uuid import uuid4
# Time
import time
# PDF
import PyPDF2
from PIL import Image


# APP
app = Flask(__name__)
app.secret_key = config.APP_KEY
Bootstrap(app)

# Static path
static_path = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "static"))

# Uploads path
uploads_path = os.path.join(static_path, "uploads")
app.config['UPLOAD_FOLDER'] = uploads_path


# LANDING
@app.route('/')
def index():
    return render_template('index.html')


# UPLOAD FILES
@app.route('/upload', methods=['GET', 'POST'])
def upload_file():

    if request.method == 'POST' and 'capture' in request.files:
        # File
        f = request.files['capture']
        if f is None or f.filename.strip() == '':
            flash('No file selected!')
        else:
            # Create a unique "session ID" for this particular batch of uploads
            upload_key = str(uuid4())
            # Pattern for file names
            pattern = upload_key + '_' + time.strftime("%Y%m%d-%H%M%S")
            # New filename
            filename = secure_filename(pattern + "_" + f.filename)
            path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            # Save
            f.save(path)
            print('"{}" saved as "{}"'.format(f.filename, filename))
            # Name
            first, last = f.filename.split('.')[0].split('_')
            # Process
            return redirect(url_for('process', filename=filename, first=first, last=last))
    # GET
    return render_template('upload.html')


# PROCESS
@app.route("/process/<filename>/<first>/<last>")
def process(filename, first, last):
    
    # PDF
    pdf_path = os.path.join(uploads_path, filename)

    # Image
    image_name = filename.split('.')[0]
    image_path = os.path.join(uploads_path, image_name)
    
    # Contents
    contents = PyPDF2.PdfFileReader(open(pdf_path, "rb"))
    zero_page = contents.getPage(0)

    # Extract picture
    xObject = zero_page['/Resources']['/XObject'].getObject()
    img = None
    extension = ''
    for obj in xObject:
        if xObject[obj]['/Subtype'] == '/Image':
            size = (xObject[obj]['/Width'], xObject[obj]['/Height'])
            data = xObject[obj].getData()
            if xObject[obj]['/ColorSpace'] == '/DeviceRGB':
                mode = "RGB"
            else:
                mode = "P"
            if xObject[obj]['/Filter'] == '/FlateDecode':
                img = Image.frombytes(mode, size, data)
                extension = ".png"
                img.save(image_path + extension)
                break
            elif xObject[obj]['/Filter'] == '/DCTDecode':
                extension = ".jpg"
                img = open(image_path + extension, "wb")
                img.write(data)
                img.close()
                break
            elif xObject[obj]['/Filter'] == '/JPXDecode':
                extension = ".jp2"
                img = open(image_path + extension, "wb")
                img.write(data)
                img.close()
                break

    # Transformed image
    transformed_filename = first + "_" + last + '_genderless.png'
    transformed_image_static_path = os.path.join('transformed', transformed_filename)

    # CV path
    cv_filename = first + "_" + last + '.txt'
    cv_static_path = os.path.join('cv', cv_filename)

    # Show
    image_static_path = os.path.join('uploads', image_name + extension)
    image = dict(
        first=first, 
        last=last, 
        path=image_static_path, 
        transformed_path=transformed_image_static_path,
        cv_static_path=cv_static_path,
    )
    
    # VIEW
    return render_template('view.html', image=image)


if __name__ == '__main__':
    app.run(host='0.0.0.0')