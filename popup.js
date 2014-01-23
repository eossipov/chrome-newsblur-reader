var story_hashes = new Array();
var story_feedids = new Array();
var permalinks = new Array();
var unread_feeds = new Array();
var read_hashes = new Array();
var dontopen = false;
var feedData;

Element.prototype.remove = function() {
	this.parentElement.removeChild(this);
};
NodeList.prototype.remove = HTMLCollection.prototype.remove = function() {
	for(var i = 0, len = this.length; i < len; i++) {
		if(this[i] && this[i].parentElement) {
			this[i].parentElement.removeChild(this[i]);
		}
	}
};
String.prototype.replaceAll = function(target, replacement) {
  return this.split(target).join(replacement);
};
String.prototype.leftPad = function(padString, length) {
	var str = this;
	var pStr = '';
	while (pStr.length < length * padString.length)
		pStr = padString + pStr;
	return pStr+''+str;
}

function triggerEvent(el, type) {
	if ((el[type] || false) && typeof el[type] == 'function')
	{
		el[type](el);
	}
}
function httpRequest(address, method, params) {
	if(params == undefined) params = null;
	var req = (window.XMLHttpRequest) ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
	req.open(method, address, false);
	req.send(params);
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
		var req = httpRequest('http://www.newsblur.com/reader/feeds', 'GET');
		if(req.status == 200)
		{
			var reqJSON = JSON.parse(req.responseText);
			feedData = reqJSON;
			return reqJSON.feeds;
		}
		else return -1;
	}
	else return -1;
}
function getFeedStories(feedId, page, i) {
	if(page == null) page = 1;
	var stories = new Array();
	var storyCount = 0;
	var req = httpRequest('http://www.newsblur.com/reader/feed/'+feedId+'?read_filter=unread&page='+page, 'GET');
	if(req.status == 200)
	{
		var reqJSON = JSON.parse(req.responseText);
		storyCount += reqJSON.stories.length;
		stories = stories.concat(reqJSON.stories);
		
		if(i != null)
		{
			var group_hashes = new Array();
			document.getElementById('s'+unread_feeds[i][0]).innerHTML = '';
			var out = '';
			for(var j in stories)
			{
				group_hashes[group_hashes.length] = stories[j].story_hash;
				var intelligence = stories[j].intelligence;
				var isng = false; var isps = false; var isnt = false;
				if(intelligence.feed < 0 || intelligence.tags < 0 || intelligence.author < 0 || intelligence.title < 0)
					isng = true;
				else if(intelligence.feed > 0 || intelligence.tags > 0 || intelligence.author > 0 || intelligence.title > 0)
					isps = true;
				else
					isnt = true;
					
				var read_story = { "story_hash": stories[j].story_hash, "alignment": (isng ? 'ng' : (isps ? 'ps' : 'nt')) };
				var sid = stories[j].story_hash;
				var title = stories[j].story_title;
				out += '<div id="story'+sid+'" fid="'+feedId+'" class="story '+(isng ? 'ng' : (isps ? 'ps' : 'nt'))+'story">';
				out += '	<span style="display: none;" id="json'+sid+'">'+JSON.stringify(read_story)+'</span>';
				out += '	<a id="sread'+sid+'"><img src="icon-msg-read.gif" width="16" height="16" alt="Mark Read" style="float: right;"></a>';
				out += '	<h2><a id="slink'+sid+'" role="'+(isng ? 'ng' : (isps ? 'ps' : 'nt'))+'">'+title+'</a></h2>';
				out += '	<span id="date'+sid+'" class="story_date">'+stories[j].long_parsed_date+'</span>';
				out += '</div>';
				permalinks['slink'+sid] = stories[j].story_permalink;
				story_hashes['slink'+sid] = stories[j].story_hash;
				story_feedids['slink'+sid] = stories[j].story_feed_id;
			}
			
			document.getElementById('s'+feedId).innerHTML += out;
			document.getElementById('gread'+feedId).setAttribute('role', group_hashes.join(','));
			
			for(var j in stories)
			{
				var sid = stories[j].story_hash;
				document.getElementById('slink'+sid).onclick = function() {
					var this_id = this.id;
					
					chrome.runtime.sendMessage({ action: "addHash", hash: story_hashes[this.id] });
					read_hashes[read_hashes.length] = JSON.parse(document.getElementById(this.id.replace('slink','json')).innerHTML);
					
					var pnn = this.getAttribute('role');
					document.getElementById(pnn+'TotalUnread').innerHTML = (document.getElementById(pnn+'TotalUnread').innerHTML.replace(' unread', '') * 1 - 1) + ' unread';
					document.getElementById(pnn+story_feedids[this.id]).innerHTML = document.getElementById(pnn+story_feedids[this.id]).innerHTML * 1 - 1;
					
					var xps = document.getElementById('ps'+story_feedids[this.id]).innerHTML * 1;
					var xnt = document.getElementById('nt'+story_feedids[this.id]).innerHTML * 1;
					var xng = document.getElementById('ng'+story_feedids[this.id]).innerHTML * 1;
					
					if(document.getElementById('next'+story_feedids[this.id]) != null)
					{
						var ufi = document.getElementById('next'+story_feedids[this.id]).getAttribute('ufi');
						unread_feeds[ufi][3] = xps + xnt + xng;
						document.getElementById('mpage'+story_feedids[this.id]).innerHTML = Math.ceil(unread_feeds[ufi][3] / 6);
					}
					
					document.getElementById('story'+story_hashes[this.id]).remove();
					if(xps+','+xnt+','+xng == '0,0,0')
					{
						document.getElementById(story_feedids[this.id]).remove();
					}
					
					if(dontopen == false)
					{
						setTimeout(function() {
							chrome.tabs.create({ url: permalinks[this_id] });
						}, 500);
					}
				};
				
				document.getElementById('sread'+sid).onclick = function() {
					dontopen = true;
					var this_id = this.id.replace('sread', 'slink');
					triggerEvent(document.getElementById(this_id), 'onclick');
					dontopen = false;
				};
			}
			
			return false;
		}
	}
	page++;
	
	return stories;
}
function updateTotalUnread() {
	var req = httpRequest('http://www.newsblur.com/reader/feeds', 'GET');
	if(req.status == 200)
	{
		var reqJSON = JSON.parse(req.responseText);
		var uFeeds = reqJSON.feeds;
		var ps = 0;
		var nt = 0;
		var ng = 0;
		
		for(var i in uFeeds)
		{
			var this_ps = uFeeds[i].ps;
			var this_nt = uFeeds[i].nt;
			var this_ng = uFeeds[i].ng;
			
			for(var j in read_hashes)
			{
				if(read_hashes[j].story_hash.indexOf(uFeeds[i].id) != -1)
				{
					if(read_hashes[j].alignment == 'ps') this_ps--;
					if(read_hashes[j].alignment == 'nt') this_nt--;
					if(read_hashes[j].alignment == 'ng') this_ng--;
				}
			}
			
			ps += this_ps;
			nt += this_nt;
			ng += this_ng;
			
			if(this_ps + this_nt + this_ng <= 6 && document.getElementById('pag'+uFeeds[i].id) != null)
			{
				document.getElementById('pag'+uFeeds[i].id).remove();
			}
			
			//if(document.getElementById('ps'+uFeeds[i].id) != null) alert(document.getElementById('ps'+uFeeds[i].id)+','+uFeeds[i].id+','+uFeeds[i].ps);
			if(document.getElementById('ps'+uFeeds[i].id) != null) document.getElementById('ps'+uFeeds[i].id).innerHTML = this_ps;
			if(document.getElementById('nt'+uFeeds[i].id) != null) document.getElementById('nt'+uFeeds[i].id).innerHTML = this_nt;
			if(document.getElementById('ng'+uFeeds[i].id) != null) document.getElementById('ng'+uFeeds[i].id).innerHTML = this_ng;
		}
		
		document.getElementById('psTotalUnread').innerHTML = ps + ' unread';
		document.getElementById('ntTotalUnread').innerHTML = nt + ' unread';
		document.getElementById('ngTotalUnread').innerHTML = ng + ' unread';
	}
}
function openNewsBlur(message) {
	if(message == null) message = '';
	chrome.runtime.sendMessage({ action: "openNewsBlur", message: message });
}
function updateNotification() {
	chrome.runtime.sendMessage({ action: "updateNotification", feeds: getFeeds() });
}
function markFeedRead(feedId) {
	//alert('http://www.newsblur.com/reader/mark_feed_as_read?feed_id='+feedId);return;
	var req = httpRequest('http://www.newsblur.com/reader/mark_feed_as_read?feed_id='+feedId, 'POST');
	if(req.status == 200)
	{
		var reqJSON = JSON.parse(req.responseText);
	}
}
function markStoriesRead() {
	if(read_hashes.length == 0) return;
	var readHashes = new Array();
	for(var i in read_hashes)
	{
		readHashes[readHashes.length] = read_hashes[i].story_hash;
	}
	var hashes = 'story_hash=' + readHashes.join('&story_hash=');
	//chrome.tabs.create({ url: 'http://www.newsblur.com/reader/mark_story_hashes_as_read?'+hashes });return false;
	var req = httpRequest('http://www.newsblur.com/reader/mark_story_hashes_as_read?'+hashes, 'POST');
	if(req.status == 200)
	{
		//var reqJSON = JSON.parse(req.responseText);
		read_hashes = new Array();
	}
}
function displayFeeds() {
	unread_feeds = new Array();
	var feeds = getFeeds();
	for(var i in feeds)
	{
		if(feeds[i].ps > 0 || feeds[i].nt > 0 || feeds[i].ng > 0)
		{
			var x = unread_feeds.length;
			unread_feeds[x] = new Array();
			unread_feeds[x][0] = i;
			unread_feeds[x][1] = feeds[i];
			unread_feeds[x][3] = feeds[i].ps + feeds[i].nt + feeds[i].ng;
		}
	}
	
	document.getElementById('feedOut').innerHTML = '';
	
	var out = '';
	for(var i in unread_feeds)
	{
		var current_page = 1;
		if(document.getElementById(unread_feeds[i][0]) != null) current_page = document.getElementById(unread_feeds[i][0]).getAttribute('page');
		out += '<div class="feedTitle" id="'+unread_feeds[i][0]+'" page="'+current_page+'" style="overflow: hidden;">';
		out += '	<h1>'+unread_feeds[i][1].feed_title+'</h1>';
		out += '	<div style="float: right;">';
		out += '		<div id="ps'+unread_feeds[i][0]+'" class="psstory">'+''+'</div>';
		out += '		<div id="nt'+unread_feeds[i][0]+'" class="ntstory">'+''+'</div>';
		out += '		<div id="ng'+unread_feeds[i][0]+'" class="ngstory">'+''+'</div>';
		out += '	</div>';
		out += '	<p style="clear: left; font-size: small">';
		out += '		<a id="gread'+unread_feeds[i][0]+'" role=""><img src="icon-msg-read.gif" width="16" height="16" alt="Mark Read" style="float: right; margin-top: 2px;"></a>';
		if(Math.ceil(unread_feeds[i][3] / 6) > 1) out += '		Page <span id="cpage'+unread_feeds[i][0]+'">' + current_page + '</span> of <span id="mpage'+unread_feeds[i][0]+'">' + Math.ceil(unread_feeds[i][3] / 6) + '</span>';
		out += '	</p>';
		out += '</div>';
		out += '<div class="feedStories" id="s'+unread_feeds[i][0]+'">';
		out += '</div>';
		out += '<div class="pagination" id="pag'+unread_feeds[i][0]+'">';
		out += '	<a class="prevpage" id="prev'+unread_feeds[i][0]+'" ufi="'+i+'">&nbsp;</a>';
		out += '	<a class="nextpage" id="next'+unread_feeds[i][0]+'" ufi="'+i+'">Next Page</a>';
		out += '</div>';
	}
	
	document.getElementById('feedOut').innerHTML += out;
	updateTotalUnread();
	
	//Create button/link events
	for(var i in unread_feeds)
	{
		stories = getFeedStories(unread_feeds[i][0], current_page, i);
		
		//Group mark as read button
		document.getElementById('gread'+unread_feeds[i][0]).onclick = function() {
			var this_id = this.id.replace('gread','');
			
			//Remove the story elements that are currently being shown
			var role = this.getAttribute('role').split(',');
			for(k in role)
			{
				var shash = role[k];
				if(document.getElementById('story'+shash) != null) document.getElementById('story'+shash).remove();
			}
			
			//Update total unread at the top quickly without querying another api call
			var tps = document.getElementById('ps'+this_id).innerHTML * 1;
			var tnt = document.getElementById('nt'+this_id).innerHTML * 1;
			var tng = document.getElementById('ng'+this_id).innerHTML * 1;
			var topps = document.getElementById('psTotalUnread').innerHTML.replace(' unread', '') * 1;
			var topnt = document.getElementById('ntTotalUnread').innerHTML.replace(' unread', '') * 1;
			var topng = document.getElementById('ngTotalUnread').innerHTML.replace(' unread', '') * 1;
			document.getElementById('psTotalUnread').innerHTML = (topps-tps) + ' unread';
			document.getElementById('ntTotalUnread').innerHTML = (topnt-tnt) + ' unread';
			document.getElementById('ngTotalUnread').innerHTML = (topng-tng) + ' unread';
			
			//Remove the group header and pagination
			document.getElementById(this_id).remove();
			if(document.getElementById(this.id.replace('gread','pag')) != null) document.getElementById(this.id.replace('gread','pag')).remove();
			
			//Mark the feed as read
			markFeedRead(this_id);
		};
		
		//Group next page button
		if(document.getElementById('next'+unread_feeds[i][0]) != null)
		document.getElementById('next'+unread_feeds[i][0]).onclick = function() {
			var fid = this.id.replace('next','');
			var i = this.getAttribute('ufi');
			var max_page = Math.ceil(unread_feeds[i][3] / 6);
			var cpage = document.getElementById(fid).getAttribute('page');
			if(cpage >= max_page) return;
			document.getElementById('prev'+fid).innerHTML = 'Previous Page';
			cpage++;
			if(cpage == max_page) this.innerHTML = '&nbsp;';
			document.getElementById('cpage'+fid).innerHTML = cpage;
			document.getElementById(fid).setAttribute('page',cpage);
			getFeedStories(fid, cpage, i);
			markStoriesRead();
		};
		
		//Group previous page button
		if(document.getElementById('prev'+unread_feeds[i][0]) != null)
		document.getElementById('prev'+unread_feeds[i][0]).onclick = function() {
			var fid = this.id.replace('prev','');
			var i = this.getAttribute('ufi');
			var cpage = document.getElementById(fid).getAttribute('page');
			if(cpage <= 1) return;
			document.getElementById('next'+fid).innerHTML = 'Next Page';
			cpage--;
			if(cpage == 1) this.innerHTML = '&nbsp;';
			document.getElementById('cpage'+fid).innerHTML = cpage;
			document.getElementById(fid).setAttribute('page',cpage);
			markStoriesRead();
			getFeedStories(fid, cpage, i);
		};
	}
}
function loadFolders() {
	var folderCont = document.getElementById('folders');
	
	var folders = loopFolder(feedData.folders);
	
	for(var i in folders)
	{
		var option = document.createElement("option");
		option.text = folders[i][0];
		option.setAttribute('value', folders[i][1]);
		folderCont.add(option);
	}
	
	document.getElementById('bAddFeed').onclick = function () {
		var url = document.getElementById('feedURL').value;
		var req = httpRequest('http://www.newsblur.com/reader/add_url?url='+escape(url), 'POST');
		if(req.status == 200)
		{
			var reqJSON = JSON.parse(req.responseText);
			
		}
		alert(req.status);
	};
}
function loopFolder(folder, level) {
	if(level == null) level = 1;
	var folders = new Array();
	
	if(level == 1)
	{
		folders[0] = new Array();
		folders[0][0] = "Top Level";
		folders[0][1] = "";
	}
	
	var x = 1;
	for(var i in folder)
	{
		if(typeof folder[i] == 'object')
		{
			var keys = Object.keys(folder[i]);
			if(keys.length == 1 && keys[0] != '0')
			{
				var key = keys[0];
				x = folders.length;
				folders[x] = new Array();
				folders[x][0] = key.leftPad(' ',1).leftPad('---', Math.ceil(level / 2));
				folders[x][1] = key;
				folders[x][2] = new Array();
			}
		}
		
		folders = folders.concat(loopFolder(folder[i], level + 1));
	}
	
	return folders;
}

document.addEventListener('DOMContentLoaded', function () {
	if(checkLogin())
	{
		var port = chrome.runtime.connect({ name: 'checkPort' });
		
		displayFeeds();
		updateTotalUnread();
		loadFolders();
		
		document.getElementById('openNewsBlur').onclick = function() { openNewsBlur(); };
	}
	else
	{
		openNewsBlur("You will need to login to the NewsBlur website to access your data.");
		window.close();
	}
});