// var ws;
// var wsEstablished = false;

// function sendMessage(msg) {
//   console.log("aaaaaaaa");
//   chrome.runtime.sendMessage({message: "sendWS", content: msg});
// }

// WebSocket Part
var ws = new WebSocket("ws://localhost:8181");
ws.onopen = function (e) {
  console.log('User builds ws connection');
}

function sendMessage(msg) {
  if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
      // console.log("sent message to ws");
      let tempMsg = JSON.parse(msg);
      if (tempMsg.type == "reCAPTCHA") {
        var audio = new Audio(chrome.runtime.getURL('/images/sent.mp3'));
        audio.play();
      }
  }
}


// Global Vars
var startPoints = [];
var endPoints = [];
var originalSizes = [];

var templates = ["template1.png", "template2.png", "template3.png", "template4.png"];
var templateImages = [];
var templMats = [];

// Get User Info from storage
var userName = "";
var userEmail = "";
var userHelpNeeded = true;
var userDefaultPartner = "";
var userDefaultPartnerNumber = "";
var requesterOS = "";
var screenScaling = 1.0;
var helperStartFlag = false;
var successFlag = false;

// Main function
function updateInfo() {
  chrome.storage.sync.get((config) => {
    userName = config.username;
    userEmail = config.useremail;
    userHelpNeeded = (config.helpstatus === "helpee"? true: false);
    userDefaultPartner = config.helper;
    userDefaultPartnerNumber = config.helpernumber;
    if (config.action === "Solve-Google-reCAPTCHA") {
      templates = ["template1.png", "template2.png", "template3.png", "template4.png"];
    }
    else if (config.action === 'Solve-Puzzle-CAPTCHA') {
      templates = ["puzzle_template.png"];
    }
    requesterOS = config.os;
  });
}
updateInfo();

var currentHelperClientId;
var updatedImageCount = 0

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  ws.onmessage = function(evt) {
    // console.log( "Received Message: " + evt.data);
    decoded = JSON.parse(evt.data);
    switch(decoded.type) {
        case "replyreCAPTCHA":
          // console.log("decoded", decoded);
          let message = decoded.message;
          let startP = startPoints[startPoints.length - 1];
          let endP = endPoints[endPoints.length - 1];
          let originalS = originalSizes[originalSizes.length - 1];
          // let clickX = (startP.x + (endP.x - startP.x) * message.x * 1.0 / message.width) * window.innerWidth / originalS.width;
          // let clickY = (startP.y + (endP.y - startP.y) * message.y * 1.0 / message.height) * window.innerWidth / originalS.width;
          let clickX = ((endP.x - startP.x) * message.x * 1.0 / message.width) * window.innerWidth / originalS.width;
          let clickY = ((endP.y - startP.y) * message.y * 1.0 / message.height) * window.innerWidth / originalS.width;
          // console.log(startP, endP, originalS, clickX, clickY);
          
          elementClick(clickX, clickY, message.tileNum, message.x_num, message.y_num);
          
          //chrome.runtime.sendMessage({message: 'screenshot'})
  
          break;
        case "helperStarted":
          if (!helperStartFlag) {
            // console.log("helperStarted", decoded.message);
            currentHelperClientId = decoded.message;
            var audio = new Audio(chrome.runtime.getURL('/images/helper.mp3'));
            audio.play();
            helperStartFlag = true;
          }
          break;
        case "success":
          if (!successFlag) {
            var audio = new Audio(chrome.runtime.getURL('/images/success.mp3'));
            audio.play();
            successFlag = true;
          }
          break;
        case "tryAgain":
          var audio = new Audio(chrome.runtime.getURL('/images/tryAgain.mp3'));
          audio.play();
          break;
  
    }
    // ws.close();
  };

    // var resp = sendResponse;
    // if (req.message !== 'init') {
    //     // console.log(req);
    // }
    if (req.message === 'screenshot') {
        updateInfo()
        // templateImages = [];
        // templMats = [];
        // startPoints = [];
        // endPoints = [];
        // originalSizes = [];
        var imageObj = document.createElement("img");
        imageObj.src = req.content;
        //document.body.appendChild(imageObj);
        imageObj.onload = () => {
            (function() {
                var imageCount = templates.length;
                var loadedCount = 0, errorCount = 0;
              
                var checkAllLoaded = function() {
                  if (loadedCount + errorCount == imageCount ) {
                    var src = cv.imread(imageObj);
                    for (var i = 0; i < imageCount; i++) {
                      var templateMat = cv.imread(templateImages[i]);
                      templMats.push(templateMat);
                    }
                    if (requesterOS === "mac") {
                      src = reduceSize(src, 0.5);
                    }
                    var temp = cropScreenshot(src, templMats);
                    var screenshotParams = getScreenSizeRatio(temp.image);
                    // console.log(screenshotParams);
                    if (screenshotParams.tileNum == 0) {
                      var audio = new Audio(chrome.runtime.getURL('/images/adjustScaling.mp3'));
                      audio.play();
                    }
                    else {
                      screenScaling = screenshotParams.screenScaling;
                      src = reduceSize(src, 1.0/screenScaling);
                      temp = cropScreenshot(src, templMats);
                      startPoints.push(temp.startPoint);
                      endPoints.push(temp.endPoint);
                      originalSizes.push(temp.originalSize);
                      // Transfer OpenCV Matrix to image
                      canvas = document.createElement("canvas");
                      document.body.appendChild(canvas);
                      canvas.style.visibility = 'hidden';
                      canvas.setAttribute("id", "canv");
                      cv.imshow("canv", temp.image);
                      let result = canvas.toDataURL();
                      canvas.parentNode.removeChild(canvas);
                      // Send over WebSocket
                      if (userDefaultPartnerNumber.length == 10) {
                        userDefaultPartnerNumber = "+1" + userDefaultPartnerNumber;
                      }
                      else if (userDefaultPartnerNumber.length == 11) {
                        userDefaultPartnerNumber = "+" + userDefaultPartnerNumber;
                      }
                      let currentTime = new Date().getTime();
                      let msg = {
                        user: userEmail,
                        userName: userName,
                        userStatus: userHelpNeeded,
                        target: userDefaultPartner,
                        targetNumber: userDefaultPartnerNumber,
                        type: "reCAPTCHA",
                        timestamp: currentTime,
                        tileNumber: screenshotParams.tileNum,
                        message: result
                      }
                      //req.ws.send(JSON.stringify(msg));
                      //sendResponse({message: "sendWS"})
                      //chrome.runtime.sendMessage({message: "sendWS", content: msg});
                      //return true;
                      // sendResponse({message: "sendWS", content: JSON.stringify(msg)})
                      // return true;
                      sendMessage(JSON.stringify(msg));
          
                      // Download
                      // var link = document.createElement('a');
                      // //document.body.appendChild(link);
                      // link.download = "img";
                      // link.href = result;
                      // link.click();
                    }
                    
                  }
                };
              
                var onload = function() {
                  loadedCount++;
                  checkAllLoaded();
                }, onerror = function() {
                  errorCount++;
                  checkAllLoaded();
                };   
              
                for (var i = 0; i < imageCount; i++) {
                  var img = new Image();
                  img.onload = onload; 
                  img.onerror = onerror;
                  img.src = chrome.runtime.getURL("/images/" + templates[i]);
                  templateImages.push(img);
                }
              })();
        }
        //imageObj.parentNode.removeChild(imageObj);
    }
    else if (req.message === 'updated') {
        var imageObj = document.createElement("img");
        imageObj.style.visibility = 'hidden';
        imageObj.src = req.content.image;
        var tileNum = req.content.tileNum
        var x_num = req.content.x_num
        var y_num = req.content.y_num
        //document.body.appendChild(imageObj);
        imageObj.onload = () => {
            var src = cv.imread(imageObj);
            if (requesterOS === "mac") {
              src = reduceSize(src, 0.5);
            }
            src = reduceSize(src, 1.0/screenScaling);
            tileNum = req.content.tileNum
            x_num = req.content.x_num
            y_num = req.content.y_num
            let temp = cropWithKnownCoords(src, startPoints[startPoints.length - 1], templMats, tileNum, x_num, y_num);
            //let temp = cropScreenshot(src, templMats);
            // startPoints.push(temp.startPoint);
            // endPoints.push(temp.endPoint);
            // originalSizes.push(temp.originalSize);
            //let cropped = cropWithKnownCoords(src, startPoints[startPoints.length - 1], endPoints[endPoints.length - 1])
            canvas = document.createElement("canvas");
            document.body.appendChild(canvas);
            canvas.style.visibility = 'hidden';
            canvas.setAttribute("id", "canv2");
            cv.imshow("canv2", temp.image);

            let result = canvas.toDataURL();

            canvas.parentNode.removeChild(canvas);
            // var link = document.createElement('a');
            // //document.body.appendChild(link);
            // link.download = "updated";
            // link.href = result;
            // link.click();

            let msg = {
              user: userEmail,
              userName: userName,
              userStatus: userHelpNeeded,
              target: userDefaultPartner,
              targetNumber: userDefaultPartnerNumber,
              helperClientId: currentHelperClientId,
              type: "realTimeUpdate",
              message: {image:result, tileNum:temp.tileNum, x_num:x_num, y_num:y_num}
            }
            console.log("message", msg);
            sendMessage(JSON.stringify(msg));
            // chrome.runtime.sendMessage({message: "sendWS", content: msg});
            // return true;

        }
    }
    else if (req.message === 'receiveWS') {
      // var evt = req.content;
      // console.log(evt.data);
      // ws.onmessage = function(evt) {
        console.log( "Received Message: " + req.content);
        decoded = JSON.parse(req.content);
        switch(decoded.type) {
            case "replyreCAPTCHA":
              // console.log("decoded", decoded);
              let message = decoded.message;
              let startP = startPoints[startPoints.length - 1];
              let endP = endPoints[endPoints.length - 1];
              let originalS = originalSizes[originalSizes.length - 1];
              // let clickX = (startP.x + (endP.x - startP.x) * message.x * 1.0 / message.width) * window.innerWidth / originalS.width;
              // let clickY = (startP.y + (endP.y - startP.y) * message.y * 1.0 / message.height) * window.innerWidth / originalS.width;
              let clickX = ((endP.x - startP.x) * message.x * 1.0 / message.width) * window.innerWidth / originalS.width;
              let clickY = ((endP.y - startP.y) * message.y * 1.0 / message.height) * window.innerWidth / originalS.width;
              // console.log(startP, endP, originalS, clickX, clickY);
              
              elementClick(clickX, clickY, message.tileNum, message.x_num, message.y_num);
              
              //chrome.runtime.sendMessage({message: 'screenshot'})
      
              break;
            case "helperStarted":
              if (!helperStartFlag) {
                // console.log("helperStarted", decoded.message);
                currentHelperClientId = decoded.message;
                var audio = new Audio(chrome.runtime.getURL('/images/helper.mp3'));
                audio.play();
                helperStartFlag = true;
              }
              break;
            case "success":
              if (!successFlag) {
                var audio = new Audio(chrome.runtime.getURL('/images/success.mp3'));
                audio.play();
                successFlag = true;
              }
              break;
            case "tryAgain":
              var audio = new Audio(chrome.runtime.getURL('/images/tryAgain.mp3'));
              audio.play();
              break;
      
        }
        // ws.close();
      // };
    }
})

var isTop = true;
function elementClick(x, y, tileNum, x_num, y_num) {
  var data = {'x': x, 'y': y, 'tileNum': tileNum, 'x_num': x_num, 'y_num': y_num};
  chrome.runtime.sendMessage({sendBack:true, data:data});
}

// OpenCV related function for cropping
function cropScreenshot(src, templ) {
    let originalSize = src.size();
    let dst = new cv.Mat();
    let mask = new cv.Mat();
    // console.log(dst, mask, src.rows, src.cols, templ[0].rows, templ[0].cols, cv.TM_CCOEFF);
    cv.matchTemplate(src, templ[0], dst, cv.TM_CCOEFF, mask);
    let result = cv.minMaxLoc(dst, mask);
    let maxPoint = result.maxLoc;
    //let color = new cv.Scalar(255, 0, 0, 255);
    let point = new cv.Point(maxPoint.x + templ[0].cols, maxPoint.y + templ[0].rows);
    //cv.rectangle(src, maxPoint, point, color, 2, cv.LINE_8, 0);
    let rect = new cv.Rect(maxPoint.x, maxPoint.y, templ[0].cols, templ[0].rows);
    let res = src.roi(rect);
    dst.delete();
    mask.delete();
    // // console.log(src);
    // console.warn("cropScreenshot");
    return {image:res, startPoint:maxPoint, endPoint:point, originalSize:originalSize};
  }
  
function cropWithKnownCoords(src, startP, templ, tileNum, x_num, y_num) {
    // console.log("cropWithKnownCoords", startP, tileNum, x_num, y_num, templ[0].cols, templ[0].cols);
    let rect = new cv.Rect(startP.x, startP.y, templ[0].cols, templ[0].rows);

    let tileConsts = [
      [[7, 137, 267], [128, 258, 388]],
      [[7, 104, 201, 298], [127, 224, 321, 418]]
    ]
    let res = src.roi(rect);

    if (x_num == tileNum && y_num == tileNum) {
      let newTileNum = findTileNumber(res);
      console.log("newTileNum for new page", newTileNum);
      return {image:res, tileNum:newTileNum};
    }
    else {
      let tileWidth = (tileNum == 3? 126: 95);
      let secondRect = new cv.Rect(tileConsts[tileNum - 3][0][x_num], tileConsts[tileNum - 3][1][y_num], tileWidth, tileWidth);
      let secondRes = res.roi(secondRect);
      return {image:secondRes, tileNum:-1};
    }

    
}

function findTileNumber(image) {
  let src = image.clone()
  cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0)
  cv.threshold(src, src, 230, 255, cv.THRESH_BINARY_INV);
  var contours = new cv.MatVector();
  var hierarchy = new cv.Mat();
  cv.findContours(src, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
  var image_number = 0;
  for (var i = 0; i < contours.size(); i++) {
    let cnts = contours.get(i)
    var rect = cv.boundingRect(cnts);
    if (rect.width >= 80 && rect.height >= 80) {
      image_number += 1;
    }
    //// console.log("aa", rect.x, rect.y, rect.width, rect.height);
  }
  // console.log("tileNum", image_number);
  let tileNum = 0;
  if (image_number >= 10) tileNum = 3;
  if (image_number >= 17) tileNum = 4;
  return tileNum;
}

function reduceSize(src, ratio) {
  let dst = new cv.Mat();
  let dsize = new cv.Size(src.cols * ratio, src.rows * ratio);
  cv.resize(src, dst, dsize, 0, 0, cv.INTER_AREA);
  return dst;
}

function getScreenSizeRatio(image) {
  let src = image.clone();
  cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0)
  cv.threshold(src, src, 230, 255, cv.THRESH_BINARY_INV);
  var contours = new cv.MatVector();
  var hierarchy = new cv.Mat();
  cv.findContours(src, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
  var tileCount = 0;
  var tileWidth = 0;
  var tileHeight = 0;
  for (var i = 0; i < contours.size(); i++) {
    let cnts = contours.get(i)
    var rect = cv.boundingRect(cnts);
    var width = rect.width * 1.0;
    var height = rect.height * 1.0;
    // console.log(width, height);
    if (width >= 90 && height >= 90 && (Math.abs(width - height) < 3)) {
      tileCount += 1;
      tileWidth = width;
      tileHeight = width;
    }
    //// console.log("aa", rect.x, rect.y, rect.width, rect.height);
  }
  // console.log(tileCount, tileWidth, tileHeight);
  let tile3 = tileWidth / 126.0;
  let tile4 = tileWidth / 95.0;
  if (Math.abs(tile3 - 1) < 0.01) {
    return {tileNum:3, screenScaling: 1};
  }
  else if (Math.abs(tile3 - 1.25) < 0.01) {
    return {tileNum:3, screenScaling: 1.25};
  }
  else if (Math.abs(tile3 - 1.5) < 0.01) {
    return {tileNum:3, screenScaling: 1.5};
  }
  else if (Math.abs(tile3 - 1.75) < 0.01) {
    return {tileNum:3, screenScaling: 1.75};
  }
  else if (Math.abs(tile3 - 2) < 0.01) {
    return {tileNum:3, screenScaling: 2};
  }
  else if (Math.abs(tile4 - 1) < 0.01) {
    return {tileNum:4, screenScaling: 1};
  }
  else if (Math.abs(tile4 - 1.25) < 0.01) {
    return {tileNum:4, screenScaling: 1.25};
  }
  else if (Math.abs(tile4 - 1.5) < 0.01) {
    return {tileNum:4, screenScaling: 1.5};
  }
  else if (Math.abs(tile4 - 1.75) < 0.01) {
    return {tileNum:4, screenScaling: 1.75};
  }
  else if (Math.abs(tile4 - 2) < 0.01) {
    return {tileNum:4, screenScaling: 2};
  }
  else {
    return {tileNum:0, screenScaling: 0};
  }
}