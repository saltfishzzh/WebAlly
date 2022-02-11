if (!window.isTop) {
    chrome.runtime.onMessage.addListener(function(coords) {
        //console.log(coords);
        if (!(typeof(coords.x) == "undefined")) {
            var target = document.elementFromPoint(coords.x, coords.y);
            if (target !== null) {

                // Simulate Click
                target.dispatchEvent(new MouseEvent('mouseover', {bubbles: false}))
                target.click();

                // Send message to update the image. The below codes are tryouts of different delay time
                //chrome.runtime.sendMessage({message: 'screenshot'});
                if (coords.x_num == 11 && coords.y_num == 11) {
                    setTimeout(function(){ 
                        chrome.runtime.sendMessage({message: 'screenshot', x_num: coords.x_num, y_num: coords.y_num, tileNum: coords.tileNum});
                        console.log("audio version")
                    }, 2000);
                }
                else 
                if (coords.tileNum == 3 || (coords.tileNum == coords.x_num && coords.tileNum == coords.y_num) || (coords.x_num == 10 && coords.y_num == 10)) {
                    setTimeout(function(){ 
                        chrome.runtime.sendMessage({message: 'screenshot', x_num: coords.x_num, y_num: coords.y_num, tileNum: coords.tileNum}); 
                    }, 2000);
                    setTimeout(function(){ 
                        chrome.runtime.sendMessage({message: 'screenshot', x_num: coords.x_num, y_num: coords.y_num, tileNum: coords.tileNum}); 
                    }, 3000);
                    setTimeout(function(){ 
                        chrome.runtime.sendMessage({message: 'screenshot', x_num: coords.x_num, y_num: coords.y_num, tileNum: coords.tileNum}); 
                    }, 4000);
                    setTimeout(function(){ 
                        chrome.runtime.sendMessage({message: 'screenshot', x_num: coords.x_num, y_num: coords.y_num, tileNum: coords.tileNum}); 
                    }, 5000);
                }
                else if (coords.tileNum == 4) {
                    setTimeout(function(){ 
                        chrome.runtime.sendMessage({message: 'screenshot', x_num: coords.x_num, y_num: coords.y_num, tileNum: coords.tileNum}); 
                    }, 200);
                }
                
                // setTimeout(function(){ 
                //     chrome.runtime.sendMessage({message: 'screenshot'}); 
                // }, 1000);
                // setTimeout(function(){ 
                //     chrome.runtime.sendMessage({message: 'screenshot'}); 
                // }, 1500);
                // setTimeout(function(){ 
                //     chrome.runtime.sendMessage({message: 'screenshot'}); 
                // }, 2000);
            }
        }
    })
}