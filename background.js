chrome.runtime.onInstalled.addListener(() => {
    console.log('AuthentiScore extension installed');
});

chrome.action.onClicked.addListener((tab) => {
    if (tab.url.includes('google.com') || tab.url.includes('maps.google.com')) {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content_script.js']
        });
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'logAnalysis') {
        console.log('Analysis complete:', request.data);
    }
    return true;
});