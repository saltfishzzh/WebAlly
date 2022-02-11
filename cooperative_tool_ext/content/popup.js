function saveUserInfo() {
    var username = document.getElementById('username');
    var useremail = document.getElementById('useremail');
    var helperemail = document.getElementById('helperemail');
    // var status = document.getElementById('helper');
    var helpernumber = document.getElementById('helpernumber');

    // if (status.checked) {
    //     chrome.storage.sync.set({helpstatus: "helper"});
    // }
    // else {
    //     chrome.storage.sync.set({helpstatus: "helpee"});
    // }

    if (username.value) {
        chrome.storage.sync.set({username: username.value});
    } else {
        alert("Error: Please fill out your name.");
        window.close();
        return;
    }
    if (useremail.value) {
        chrome.storage.sync.set({useremail: useremail.value});
    } else {
        alert("Error: Please fill out your email.");
        window.close();
        return;
    }

    if (helperemail.value) {
        chrome.storage.sync.set({helper: helperemail.value});
    } else {
        alert("Error: Please fill out the helper's email.");
        window.close();
        return;
    }

    if (helpernumber.value) {
        chrome.storage.sync.set({helpernumber: helpernumber.value});
    } else {
        alert("Error: Please fill out the helper's phone number.");
        window.close();
        return;
    }

    alert("Form saved successfully! The information will only be stored in your browser.");
    window.close();
}

window.addEventListener('load', function(evt) {
    statusDisplay = document.getElementById('status-display');
    document.getElementById('saveuserinfo')
            .addEventListener('submit', saveUserInfo);
    chrome.storage.sync.get((config) => {
        console.log(config.useremail, config.username, config.helper, config.helpstatus);
    })
});
