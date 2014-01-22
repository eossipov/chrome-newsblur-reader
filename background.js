var readHashes = new Array();

function httpRequest(address, method) {
    var req = (window.XMLHttpRequest) ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
    req.open(method, address, false);
    req.send(null);
    return req;
}
function checkLogin() {
    var req = httpRequest('http://www.newsblur.com/rss_feeds/search_feed', 'GET');
    if(req.status == 200)
    {
        var reqJSON = JSON.parse(req.responseText);
        return reqJSON.authenticated;
    }
    else return false;
}
function getFeeds() {
    if(checkLogin())
    {
        var req = httpRequest('http://www.newsblur.com/reader/feeds?update_counts=true', 'GET');
        if(req.status == 200)
        {
            var reqJSON = JSON.parse(req.responseText);
            return reqJSON.feeds;
        }
        else return -1;
    }
    else return -1;
}
function updateNotification(feeds) {
    if(feeds == -1)
    {
        chrome.browserAction.setBadgeBackgroundColor({ color: [255,128,0,255] });
        chrome.browserAction.setBadgeText({ text: '!' });
    }
    else
    {
        var count = 0;
        for(var i in feeds)
        {
            count += feeds[i].ps;
            count += feeds[i].nt;
            count += feeds[i].ng;
        }
        
        if(count > 999999)
        {
            count = (Math.round(count / 100000) / 10) + 'M';
        }
        else if(count > 9999)
        {
            count = Math.round(count / 1000) + 'k';
        }
        
        count = count == 0 ? '' : (count + '');
        chrome.browserAction.setBadgeBackgroundColor({ color: [255,0,0,255] });
        chrome.browserAction.setBadgeText({ text: count });
    }
}
function markStoriesRead() {
    if(readHashes.length == 0) return;
    var hashes = 'story_hash=' + readHashes.join('&story_hash=');
    //chrome.tabs.create({ url: 'http://www.newsblur.com/reader/mark_story_hashes_as_read?'+hashes });return false;
    var req = httpRequest('http://www.newsblur.com/reader/mark_story_hashes_as_read?'+hashes, 'POST');
    if(req.status == 200)
    {
        //var reqJSON = JSON.parse(req.responseText);
        readHashes = new Array();
    }
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    switch(request.action)
    {
        case "addHash":
            if(readHashes.indexOf(request.hash) == -1) readHashes[readHashes.length] = request.hash;
            break;
        case "openNewsBlur":
            if(request.message != '')
            {
                alert(request.message);
            }
        
            chrome.tabs.getAllInWindow(function(tabs) {
                var found = false;
                for(var i in tabs)
                {
                    if(tabs[i].url.indexOf("www.newsblur.com") != -1)
                    {
                        found = tabs[i].id;
                    }
                }
                
                if(found) chrome.tabs.update(found, { selected: true });
                else chrome.tabs.create({ url : "http://www.newsblur.com/" });
            });
            break;
        case "updateNotification":
            updateNotification(request.feeds);
            break;
    }
});

document.addEventListener('DOMContentLoaded', function () {
    updateNotification(getFeeds());
    setInterval(function() {
        updateNotification(getFeeds());
    }, 60000);
});

chrome.runtime.onConnect.addListener(function(vPort) {
    vPort.onDisconnect.addListener(function() {
        markStoriesRead();
        setTimeout(function() {
            updateNotification(getFeeds());
        }, 2000);
    });
});