document.addEventListener('DOMContentLoaded', function() {
    const analyzeBtn = document.getElementById('analyze-btn');
    const statusEl = document.getElementById('status');
    const statusTextEl = document.getElementById('status-text');
    const statusIconEl = document.querySelector('.status-icon');

    analyzeBtn.addEventListener('click', async () => {
        analyzeBtn.disabled = true;
        setStatus('analyzing', '⚙️', 'Analyzing reviews...');

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab.url.includes('google.com') && !tab.url.includes('maps.google.com')) {
                setStatus('error', '❌', 'Please navigate to a Google Maps page');
                analyzeBtn.disabled = false;
                return;
            }

            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content_script.js']
            });

            chrome.tabs.sendMessage(tab.id, { action: 'analyzeReviews' }, (response) => {
                if (chrome.runtime.lastError) {
                    setStatus('error', '❌', 'Error: ' + chrome.runtime.lastError.message);
                } else if (response && response.success) {
                    setStatus('complete', '✅', `Analyzed ${response.count} reviews`);
                    setTimeout(() => {
                        setStatus('', '⚡', 'Ready to analyze');
                    }, 3000);
                } else {
                    setStatus('error', '❌', 'No reviews found on this page');
                }
                analyzeBtn.disabled = false;
            });
        } catch (error) {
            setStatus('error', '❌', 'Error: ' + error.message);
            analyzeBtn.disabled = false;
        }
    });

    document.getElementById('settings-link').addEventListener('click', (e) => {
        e.preventDefault();
        alert('Settings feature coming soon!');
    });

    function setStatus(className, icon, text) {
        statusEl.className = 'status' + (className ? ' ' + className : '');
        statusIconEl.textContent = icon;
        statusTextEl.textContent = text;
    }
});