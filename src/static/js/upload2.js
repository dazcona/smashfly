var input = document.querySelector('input');
var preview = document.querySelector('.preview');
var pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = './static/js/pdf.worker.js';
var __PDF_DOC,
	__CURRENT_PAGE,
	__TOTAL_PAGES,
	__PAGE_RENDERING_IN_PROGRESS = 0,
	__CANVAS = $('#pdf-canvas').get(0),
  __CANVAS_CTX = __CANVAS.getContext('2d');

input.style.opacity = 0;

input.addEventListener('change', updateImageDisplay);function updateImageDisplay() {
  while(preview.firstChild) {
    preview.removeChild(preview.firstChild);
  }
  var curFiles = input.files;
  showPDF(URL.createObjectURL(curFiles[0]));
  // gettext(URL.createObjectURL(curFiles[0]));
  if (curFiles.length === 0) {
    var para = document.createElement('p');
    para.textContent = 'No files currently selected for upload';
    preview.appendChild(para);
  }
  else {
    var list = document.createElement('ol');
    preview.appendChild(list);
    for(var i = 0; i < curFiles.length; i++) {
      var listItem = document.createElement('li');
      var para = document.createElement('p');
      if(validFileType(curFiles[i])) {
        para.textContent = 'File name ' + curFiles[i].name + ', file size ' + returnFileSize(curFiles[i].size) + '.';
        //var image = document.createElement('img');
        //image.src = window.URL.createObjectURL(curFiles[i]);
        //listItem.appendChild(image);
        listItem.appendChild(para);
      } else {
        para.textContent = 'File name ' + curFiles[i].name + ': Not a valid file type. Update your selection.';
        listItem.appendChild(para);
      }
      list.appendChild(listItem);
    }
  }
}

$("#pdf-prev").on('click', function() {
	if(__CURRENT_PAGE != 1)
		showPage(--__CURRENT_PAGE);
});

$("#pdf-next").on('click', function() {
	if(__CURRENT_PAGE != __TOTAL_PAGES)
		showPage(++__CURRENT_PAGE);
});

var fileTypes = [
    'application/pdf',
]

function showPDF(pdf_url) {
	$("#pdf-loader").show();
	pdfjsLib.getDocument({
    url: pdf_url,
    nativeImageDecoderSupport: pdfjsLib.NativeImageDecoding.NONE,
  }).then(function(pdf_doc) {
		__PDF_DOC = pdf_doc;
		__TOTAL_PAGES = __PDF_DOC.numPages;
		$("#pdf-loader").hide();
		$("#pdf-contents").show();
		$("#pdf-total-pages").text(__TOTAL_PAGES);
		showPage(1);
	}).catch(function(error) {
		$("#pdf-loader").hide();
		$("#upload-button").show();
		alert(error.message);
	});
}

function showPage(page_no) {
	__PAGE_RENDERING_IN_PROGRESS = 1;
	__CURRENT_PAGE = page_no;
	$("#pdf-next, #pdf-prev").attr('disabled', 'disabled');
	$("#pdf-canvas").hide();
	$("#page-loader").show();
	$("#pdf-current-page").text(page_no);

	__PDF_DOC.getPage(page_no).then(function(page) {
		var scale_required = __CANVAS.width / page.getViewport(1).width;
		var viewport = page.getViewport(scale_required);
		__CANVAS.height = viewport.height;

		var renderContext = {
			canvasContext: __CANVAS_CTX,
			viewport: viewport
    };
    page.getOperatorList().then(function (ops) {
      for (var i=0; i < ops.fnArray.length; i++) {
        if (ops.fnArray[i] == pdfjsLib.OPS.paintImageXObject) {
          var image = page.objs.get(ops.argsArray[i][0])
          var canvas = document.getElementById('canvas2')
          var ctx = canvas.getContext('2d');
          canvas.width = image.width;
          canvas.height = image.height;
          var idata = ctx.createImageData(image.width, image.height);
          idata.data.set(image.data);
          ctx.putImageData(idata, 0, 0);
        }
      }
    })
		page.render(renderContext).then(function() {
			__PAGE_RENDERING_IN_PROGRESS = 0;
			$("#pdf-next, #pdf-prev").removeAttr('disabled');
			$("#pdf-canvas").show();
			$("#page-loader").hide();
		});
	});
}

async function gettext(pdfUrl){
  var censured = ["David", "Azcona", "david.azcona2@mail.dcu.ie", "Dublin", "(DCU)", "Arizona", "(ASU)", "Navarre", "(UPNA)", "DCU", "DCU's", "Ireland", "Dublin", "Brussels", "Spain", "Irish", "Arizona", "ASU"]
    var pdf = pdfjsLib.getDocument({ url: pdfUrl })
    return pdf.then(function(pdf_doc) {
		var maxPages = pdf_doc.numPages;
    var countPromises = [];
    for (var j = 1; j <= maxPages; j++) {
        var page = pdf_doc.getPage(j);
        countPromises.push(page.then(function(page) {
          var textContent = page.getTextContent();
          textContent.then(function(text){
          text.items.map(function (s) {
            var para = document.createElement("P");
            var splitSentence = s.str.split(" ")
            for (let index = 0; index < splitSentence.length; index++) {
              var word = document.createElement("span");
              var t = document.createTextNode(splitSentence[index] + " ");
              if (censured.indexOf(splitSentence[index]) > -1) {
                word.classList.add("blurry-text")
              }
              word.appendChild(t); 
              para.appendChild(word);
            }
            document.getElementById("container-text").appendChild(para);   
          })

        });
        }));
    }
	}).catch(function(error) {
		alert(error.message);
	});
}

function validFileType(file) {
  for(var i = 0; i < fileTypes.length; i++) {
    if(file.type === fileTypes[i]) {
      return true;
    }
  }
  return false;
}

function returnFileSize(number) {
  if(number < 1024) {
    return number + ' bytes';
  } else if(number >= 1024 && number < 1048576) {
    return (number/1024).toFixed(1) + ' KB';
  } else if(number >= 1048576) {
    return (number/1048576).toFixed(1) + ' MB';
  }
}