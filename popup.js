// ... existing setup code ...
document.getElementById('openChat').addEventListener('click', function() {
    chrome.tabs.create({url: 'chat.html'});
});
console.log('Popup script loaded.');
