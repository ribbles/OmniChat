document.addEventListener('DOMContentLoaded', function() {
    // Open chat in a new tab
    document.getElementById('openChat').addEventListener('click', function() {
        chrome.tabs.create({url: 'chat.html'});
        window.close();
    });

    // Close popup when any link is clicked
    document.querySelectorAll('a').forEach(function(link) {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            chrome.tabs.create({url: this.href});
            window.close();
        });
    });
});

console.log('Popup script loaded.');