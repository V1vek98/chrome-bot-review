(function() {
    'use strict';

    let isAnalyzed = false;
    let observerInstance = null;

    // Wait for element function using Promise
    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(selector)) {
                return resolve(document.querySelector(selector));
            }

            const observer = new MutationObserver((mutations, obs) => {
                if (document.querySelector(selector)) {
                    obs.disconnect();
                    resolve(document.querySelector(selector));
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Timeout waiting for selector: ${selector}`));
            }, timeout);
        });
    }

    function calculateAuthenticityScore(reviewObject) {
        let score = 100;
        
        const weights = {
            reviewerHistory: 25,
            languageGeneric: 20,
            reviewSpecificity: 15,
            photoContent: 10,
            reviewerName: 10,
            sentimentBalance: 10,
            textLength: 10
        };
        
        if (reviewObject.totalReviews === 1) {
            score -= weights.reviewerHistory * 0.8;
        } else if (reviewObject.totalReviews < 5) {
            score -= weights.reviewerHistory * 0.4;
        } else if (reviewObject.totalReviews > 100) {
            score += weights.reviewerHistory * 0.1;
        }
        
        const genericPhrases = [
            'great service', 'highly recommend', 'amazing place', 
            'excellent', 'terrible', 'worst', 'best ever',
            'love it', 'hate it', '10/10', 'would recommend',
            'nice place', 'good food', 'bad service', 'ok'
        ];
        const reviewLower = reviewObject.reviewText.toLowerCase();
        const genericCount = genericPhrases.filter(phrase => reviewLower.includes(phrase)).length;
        if (genericCount >= 3) {
            score -= weights.languageGeneric * 0.7;
        } else if (genericCount >= 1) {
            score -= weights.languageGeneric * 0.3;
        }
        
        const specificIndicators = /\b(ordered|tried|waiter|waitress|manager|dish|menu|parking|location|atmosphere|price|\$|minutes|hours|breakfast|lunch|dinner|coffee|pizza|burger|salad|chicken|beef|fish|vegetarian|spicy|sweet|salty|fresh|stale|cold|hot|warm)\b/gi;
        const specificMatches = reviewObject.reviewText.match(specificIndicators);
        if (!specificMatches || specificMatches.length < 2) {
            score -= weights.reviewSpecificity * 0.6;
        }
        
        if (reviewObject.photoCount === 0) {
            score -= weights.photoContent * 0.3;
        } else {
            score += weights.photoContent * 0.1;
        }
        
        const suspiciousNamePatterns = /^(user|guest|customer|person|test|admin|[a-z]{1,2}\d+)/i;
        const genericNames = ['john smith', 'jane doe', 'mary jane', 'bob jones', 'test user', 'google user'];
        if (suspiciousNamePatterns.test(reviewObject.authorName) || 
            genericNames.includes(reviewObject.authorName.toLowerCase())) {
            score -= weights.reviewerName * 0.7;
        }
        
        const rating = reviewObject.rating;
        const textLength = reviewObject.reviewText.length;
        if ((rating === 5 || rating === 1) && textLength < 50) {
            score -= weights.sentimentBalance * 0.5;
        }
        
        if (textLength < 20) {
            score -= weights.textLength * 0.8;
        } else if (textLength < 50) {
            score -= weights.textLength * 0.3;
        } else if (textLength > 500) {
            score += weights.textLength * 0.1;
        }
        
        score = Math.max(0, Math.min(100, score));
        
        return Math.round(score);
    }

    function createScoreElement(score) {
        const badge = document.createElement('span');
        badge.className = 'authentiscore-badge';
        badge.textContent = `${score}% Authentic`;
        badge.setAttribute('title', 'AuthentiScore: Review authenticity rating');
        
        if (score >= 80) {
            badge.style.color = '#0f9d58';
            badge.style.backgroundColor = 'rgba(15, 157, 88, 0.1)';
        } else if (score >= 60) {
            badge.style.color = '#f9ab00';
            badge.style.backgroundColor = 'rgba(249, 171, 0, 0.1)';
        } else {
            badge.style.color = '#ea4335';
            badge.style.backgroundColor = 'rgba(234, 67, 53, 0.1)';
        }
        
        badge.style.cssText += `
            margin-left: 8px;
            font-size: 12px;
            font-weight: bold;
            padding: 2px 8px;
            border-radius: 4px;
            display: inline-block;
            vertical-align: middle;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        return badge;
    }

    function extractReviewerCount(container) {
        // Look for patterns like "1 review", "5 contributions", etc.
        const textContent = container.textContent || '';
        const patterns = [
            /(\d+)\s*reviews?/i,
            /(\d+)\s*contributions?/i,
            /(\d+)\s*photos?/i
        ];
        
        for (const pattern of patterns) {
            const match = textContent.match(pattern);
            if (match) {
                return parseInt(match[1]);
            }
        }
        
        return 1;
    }

    function extractRating(container) {
        // Try to find rating from aria-label
        const ratingElements = container.querySelectorAll('[aria-label*="star" i], [aria-label*="Star" i]');
        for (const elem of ratingElements) {
            const ariaLabel = elem.getAttribute('aria-label');
            const match = ariaLabel.match(/(\d)/);
            if (match) return parseInt(match[1]);
        }
        
        // Count filled stars
        const filledStars = container.querySelectorAll('[aria-checked="true"], [data-filled="true"], .NhBTye');
        if (filledStars.length > 0 && filledStars.length <= 5) {
            return filledStars.length;
        }
        
        // Default to 5 if we can't determine
        return 5;
    }

    function scrapeGoogleMapsReviews() {
        console.log('AuthentiScore: Starting Google Maps review detection...');
        
        // Primary selectors for 2024 Google Maps
        const reviewSelectors = [
            '.jftiEf', // Primary review container selector
            'div[data-review-id]',
            '[jsaction*="review"]',
            'div[jstcache][jscontroller]',
            '.section-review',
            'div[data-hveid]'
        ];
        
        let reviewContainers = [];
        
        // Try each selector
        for (const selector of reviewSelectors) {
            const elements = document.querySelectorAll(selector);
            console.log(`AuthentiScore: Trying selector ${selector}, found ${elements.length} elements`);
            if (elements.length > 0) {
                reviewContainers = Array.from(elements);
                break;
            }
        }
        
        // If no containers found, try a more general approach
        if (reviewContainers.length === 0) {
            console.log('AuthentiScore: No review containers found with primary selectors, trying fallback...');
            
            // Look for elements that have both reviewer info and review text
            const allDivs = document.querySelectorAll('div');
            reviewContainers = Array.from(allDivs).filter(div => {
                // Check if it has a link to contributor profile
                const hasContribLink = div.querySelector('a[href*="/contrib/"], a[href*="/maps/contrib/"]');
                
                // Check if it has review-like text
                const textElements = div.querySelectorAll('span, div');
                const hasReviewText = Array.from(textElements).some(el => {
                    const text = el.textContent.trim();
                    return text.length > 20 && text.length < 5000 && !text.includes('Google');
                });
                
                // Check for time indicators
                const hasTimeInfo = div.textContent.match(/\b(\d+\s*(days?|weeks?|months?|years?|hours?)\s*ago)\b/i);
                
                return hasContribLink && hasReviewText && hasTimeInfo;
            });
            
            console.log(`AuthentiScore: Fallback found ${reviewContainers.length} potential review containers`);
        }
        
        const reviews = [];
        
        reviewContainers.forEach((container, index) => {
            try {
                // Extract reviewer name - 2024 selectors
                const nameSelectors = [
                    '.d4r55', // Primary name selector
                    'a[href*="/contrib/"] > div:first-child',
                    'a[href*="/maps/contrib/"] > div:first-child',
                    'a[href*="/contrib/"] span',
                    'button[jsaction] img[src*="googleusercontent"] + div',
                    '[aria-label*="Written by"]'
                ];
                
                let authorName = '';
                for (const selector of nameSelectors) {
                    const element = container.querySelector(selector);
                    if (element && element.textContent.trim()) {
                        authorName = element.textContent.trim();
                        break;
                    }
                }
                
                // Extract review text - 2024 selectors
                const textSelectors = [
                    '.wiI7pd', // Primary text selector
                    '.MyEned',
                    'span[style*="webkit-line-clamp"]',
                    '[data-review-text]',
                    'div[jsname] span[jsname]'
                ];
                
                let reviewText = '';
                for (const selector of textSelectors) {
                    const element = container.querySelector(selector);
                    if (element && element.textContent.trim().length > 10) {
                        reviewText = element.textContent.trim();
                        break;
                    }
                }
                
                // If we still don't have text, try a more general approach
                if (!reviewText) {
                    const spans = container.querySelectorAll('span');
                    for (const span of spans) {
                        const text = span.textContent.trim();
                        if (text.length > 20 && text.length < 5000 && 
                            !text.includes('ago') && !text.includes('Local Guide') &&
                            !span.querySelector('a')) {
                            reviewText = text;
                            break;
                        }
                    }
                }
                
                if (authorName && reviewText) {
                    const review = {
                        authorName: authorName,
                        reviewText: reviewText,
                        rating: extractRating(container),
                        photoCount: container.querySelectorAll('img[src*="googleusercontent"]:not([aria-label*="profile"])').length,
                        reviewDate: container.textContent.match(/\b(\d+\s*(days?|weeks?|months?|years?|hours?)\s*ago)\b/i)?.[0] || '',
                        totalReviews: extractReviewerCount(container),
                        hasLocalGuide: !!container.querySelector('[aria-label*="Local Guide"], .RfDO5c')
                    };
                    
                    reviews.push(review);
                    console.log(`AuthentiScore: Extracted review ${index + 1}:`, review.authorName);
                }
            } catch (error) {
                console.error(`AuthentiScore: Error extracting review ${index}:`, error);
            }
        });
        
        console.log(`AuthentiScore: Total reviews extracted: ${reviews.length}`);
        return reviews;
    }

    function injectScores(reviews) {
        console.log('AuthentiScore: Injecting scores for', reviews.length, 'reviews');
        
        // Get review containers again for score injection
        const reviewSelectors = [
            '.jftiEf',
            'div[data-review-id]',
            '[jsaction*="review"]',
            'div[jstcache][jscontroller]',
            '.section-review',
            'div[data-hveid]'
        ];
        
        let reviewElements = [];
        for (const selector of reviewSelectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                reviewElements = Array.from(elements);
                break;
            }
        }
        
        // If we can't find containers, try to match by author name
        if (reviewElements.length === 0) {
            reviews.forEach(review => {
                const allLinks = document.querySelectorAll('a[href*="/contrib/"], a[href*="/maps/contrib/"]');
                allLinks.forEach(link => {
                    if (link.textContent.trim() === review.authorName) {
                        const score = calculateAuthenticityScore(review);
                        const scoreElement = createScoreElement(score);
                        
                        if (!link.parentElement.querySelector('.authentiscore-badge')) {
                            link.parentElement.appendChild(scoreElement);
                        }
                    }
                });
            });
        } else {
            // Match reviews to elements and inject scores
            reviews.forEach((review, index) => {
                if (reviewElements[index]) {
                    const score = calculateAuthenticityScore(review);
                    const scoreElement = createScoreElement(score);
                    
                    // Find the best place to inject the score
                    const nameSelectors = [
                        '.d4r55',
                        'a[href*="/contrib/"]',
                        'a[href*="/maps/contrib/"]',
                        'button[jsaction] img[src*="googleusercontent"] + div'
                    ];
                    
                    let injectionTarget = null;
                    for (const selector of nameSelectors) {
                        const element = reviewElements[index].querySelector(selector);
                        if (element) {
                            injectionTarget = element;
                            break;
                        }
                    }
                    
                    if (injectionTarget && !injectionTarget.parentElement.querySelector('.authentiscore-badge')) {
                        injectionTarget.parentElement.appendChild(scoreElement);
                    }
                }
            });
        }
    }

    function setupMutationObserver() {
        if (observerInstance) {
            observerInstance.disconnect();
        }
        
        observerInstance = new MutationObserver((mutations) => {
            // Check if new reviews have been loaded
            const hasNewReviews = mutations.some(mutation => {
                return Array.from(mutation.addedNodes).some(node => {
                    if (node.nodeType === 1) { // Element node
                        return node.matches && (
                            node.matches('.jftiEf') ||
                            node.querySelector('.jftiEf') ||
                            node.querySelector('.wiI7pd') ||
                            node.querySelector('.d4r55')
                        );
                    }
                    return false;
                });
            });
            
            if (hasNewReviews && !isAnalyzed) {
                console.log('AuthentiScore: New reviews detected, analyzing...');
                setTimeout(() => {
                    analyzeReviews();
                }, 500);
            }
        });
        
        observerInstance.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    async function analyzeReviews() {
        if (isAnalyzed) {
            const existingBadges = document.querySelectorAll('.authentiscore-badge');
            existingBadges.forEach(badge => badge.remove());
            isAnalyzed = false;
        }
        
        // Try to wait for reviews to load
        try {
            await waitForElement('.jftiEf, .wiI7pd, [data-review-id]', 5000);
        } catch (error) {
            console.log('AuthentiScore: Timeout waiting for reviews, trying anyway...');
        }
        
        const reviews = scrapeGoogleMapsReviews();
        
        if (reviews.length > 0) {
            injectScores(reviews);
            isAnalyzed = true;
            
            // Setup observer for new reviews
            setupMutationObserver();
            
            return { success: true, count: reviews.length };
        }
        
        // If no reviews found, setup observer to wait for them
        setupMutationObserver();
        
        return { success: false, count: 0 };
    }

    // Message listener
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'analyzeReviews') {
            console.log('AuthentiScore: Received analyze request');
            analyzeReviews().then(result => {
                sendResponse(result);
            });
            return true; // Keep message channel open for async response
        }
    });

    // Initialize
    if (!window.authentiScoreInjected) {
        window.authentiScoreInjected = true;
        console.log('AuthentiScore content script loaded');
        
        // Setup observer immediately to catch reviews as they load
        setupMutationObserver();
    }
})();