// WebSocket Part
var ws = new WebSocket("ws://localhost:8181");
ws.onopen = function (e) {
  console.log('User builds ws connection');
}

ws.onmessage = function(evt) {
  //console.log(evt);
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
    chrome.tabs.sendMessage(tabs[0].id, {
      message: "receiveWS", 
      content: evt.data
    }, function(response) {}); 
}); 
}

function sendMessage(msg) {
  if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
      // console.log("sent message to ws");
      // let tempMsg = JSON.parse(msg);
      if (msg.type == "reCAPTCHA") {
        var audio = new Audio(chrome.runtime.getURL('/images/sent.mp3'));
        audio.play();
      }
  }
}

chrome.storage.sync.get((config) => {
    if (config.dpr === undefined) {
      chrome.storage.sync.set({dpr: true})
    }
    if (!config.username) {
      chrome.storage.sync.set({username: "zhuohao"})
    }
    if (!config.useremail) {
      chrome.storage.sync.set({useremail: "zhuohao4@illinois.edu"})
    }
    if (!config.helper) {
      chrome.storage.sync.set({helper: "zhuohao4@illinois.edu"})
    }
    if (!config.helpstatus) {
      chrome.storage.sync.set({helpstatus: "helpee"})
    }
    if (!config.action) {
      chrome.storage.sync.set({action: "Solve-Google-reCAPTCHA"})
    }
    if (!config.helpernumber) {
      chrome.storage.sync.set({helpernumber: "+12179796769"})
    }
  })

chrome.runtime.getPlatformInfo(function(info) {
    chrome.storage.sync.set({os: info.os});
});

var flg = false;

function getCurrentScreen(_callback) {
    chrome.tabs.getSelected(null, (tab) => {
        //console.log("inject", tab.id)
        chrome.tabs.captureVisibleTab(tab.windowId, {format: 'png'}, (image) => {
            console.log("Successful screenshot")
            _callback({image: image, tab: tab});
        })
    })
}

function sendMessageToContent(tab, message, content) {
    chrome.tabs.sendMessage(tab.id, {message: "init"}, (res) => {
        if (res) {
            console.log(res);
            clearTimeout(timeout)
        }
    })

    var timeout = setTimeout(() => {
        setTimeout(() => {

            chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
                chrome.tabs.sendMessage(tabs[0].id, {
                  message: message, 
                  content: content,
                }, function(response) {
                  //console.log(response);
                })
            }); 

            chrome.tabs.sendMessage(tab.id, {message: 'init'}, function(response) {
              //console.log(response);
            })
        }, 100)
    }, 100)
}

chrome.commands.onCommand.addListener((command) => {
  if (command === 'Solve-Google-reCAPTCHA') {
    chrome.storage.sync.set({action: "Solve-Google-reCAPTCHA"});
  }
  else if (command === 'Solve-Puzzle-CAPTCHA') {
    chrome.storage.sync.set({action: "Solve-Puzzle-CAPTCHA"});
  }
  else if (command === 'take-full-screen') {
    chrome.storage.sync.set({action: "take-full-screen"});
  }
  console.log("command triggered");

  // chrome.tabs.query({currentWindow: true, active: true}).then((tabs)=>{
  //   chrome.tabs.captureVisibleTab(tab.windowId, {format: 'png'}).then((imageurl)=>{
  //     chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
  //       chrome.tabs.sendMessage(tabs[0].id, {
  //         message: "screenshot", 
  //         content: imageurl,
  //       }).then((response)=>{
  //         console.log("aaaaa", response);
  //       })
  //     }); 
  //   })
  // });
  
  getCurrentScreen( (screen) => {
      console.log(screen);
      sendMessageToContent(screen.tab, "screenshot", screen.image)

  })
      
})

var interval;

chrome.runtime.onMessage.addListener((req, sender, res) => {
  console.log(req);
    if (req.message === 'screenshot') {
        console.log("screenshot")
        getCurrentScreen( (screen) => {
            //console.log("interval")
            sendMessageToContent(screen.tab, "updated", {image:screen.image, x_num:req.x_num, y_num:req.y_num, tileNum:req.tileNum})
        })
    }
    else if (req.message === 'endUpdating') {
      console.log("clearInterval");
      //clearInterval(interval);
    }
    else if (req.message === 'sendWS') {
      console.log("sendWS");
      sendMessage(req.content);
    }
})

chrome.runtime.onMessage.addListener(function(message, sender) {
    if (message.sendBack) {
      chrome.tabs.sendMessage(sender.tab.id, message.data);
    }
})