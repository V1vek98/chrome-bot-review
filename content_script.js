(function() {
    'use strict';

    let isAnalyzed = false;

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
        const reviewCountText = container.textContent;
        const countMatch = reviewCountText.match(/(\d+)\s*review/i);
        if (countMatch) {
            return parseInt(countMatch[1]);
        }
        
        const contributionsMatch = reviewCountText.match(/(\d+)\s*contribution/i);
        if (contributionsMatch) {
            return parseInt(contributionsMatch[1]);
        }
        
        return 1;
    }

    function extractRating(container) {
        const ratingElement = container.querySelector('[aria-label*="star"], [aria-label*="Star"], [class*="star"]');
        if (ratingElement) {
            const ariaLabel = ratingElement.getAttribute('aria-label');
            if (ariaLabel) {
                const match = ariaLabel.match(/(\d)/);
                if (match) return parseInt(match[1]);
            }
        }
        
        const starElements = container.querySelectorAll('[class*="star"][aria-checked="true"], [class*="star"][data-filled="true"]');
        if (starElements.length > 0) {
            return starElements.length;
        }
        
        return 5;
    }

    function scrapeReviews() {
        const reviewSelectors = [
            '[data-review-id]',
            '[class*="review"][class*="container"]',
            '[class*="review-item"]',
            '[jsaction*="review"]',
            'div[jstcache] > div[jsaction]'
        ];
        
        let reviewContainers = [];
        for (const selector of reviewSelectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                reviewContainers = elements;
                break;
            }
        }
        
        if (reviewContainers.length === 0) {
            const allDivs = document.querySelectorAll('div');
            reviewContainers = Array.from(allDivs).filter(div => {
                const text = div.textContent || '';
                return text.includes('review') && 
                       (text.includes('star') || text.includes('★')) &&
                       div.querySelector('img[src*="googleusercontent"]');
            });
        }
        
        const reviews = [];
        reviewContainers.forEach(container => {
            const nameSelectors = [
                '[class*="reviewer-name"]',
                '[class*="author-name"]',
                '[aria-label*="Written by"]',
                'a[href*="/contrib/"] > div',
                '[class*="review"] a[href*="contrib"]'
            ];
            
            let authorName = '';
            for (const selector of nameSelectors) {
                const element = container.querySelector(selector);
                if (element && element.textContent.trim()) {
                    authorName = element.textContent.trim();
                    break;
                }
            }
            
            const textSelectors = [
                '[class*="review-text"]',
                '[class*="review-content"]',
                '[data-review-text]',
                '[class*="snippet"]',
                'span[jsan*="7"]'
            ];
            
            let reviewText = '';
            for (const selector of textSelectors) {
                const element = container.querySelector(selector);
                if (element && element.textContent.trim().length > 10) {
                    reviewText = element.textContent.trim();
                    break;
                }
            }
            
            if (authorName && reviewText) {
                const review = {
                    authorName: authorName,
                    reviewText: reviewText,
                    rating: extractRating(container),
                    photoCount: container.querySelectorAll('img[src*="googleusercontent"]:not([aria-label*="profile"])').length,
                    reviewDate: container.querySelector('span[class*="date"], [class*="published"]')?.textContent || '',
                    totalReviews: extractReviewerCount(container),
                    hasLocalGuide: !!container.querySelector('[class*="local-guide"], [aria-label*="Local Guide"]')
                };
                reviews.push(review);
            }
        });
        
        return reviews;
    }

    function injectScores(reviews) {
        const reviewSelectors = [
            '[data-review-id]',
            '[class*="review"][class*="container"]',
            '[class*="review-item"]',
            '[jsaction*="review"]',
            'div[jstcache] > div[jsaction]'
        ];
        
        let reviewElements = [];
        for (const selector of reviewSelectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                reviewElements = elements;
                break;
            }
        }
        
        reviews.forEach((review, index) => {
            if (reviewElements[index]) {
                const score = calculateAuthenticityScore(review);
                const scoreElement = createScoreElement(score);
                
                const nameSelectors = [
                    '[class*="reviewer-name"]',
                    '[class*="author-name"]',
                    '[aria-label*="Written by"]',
                    'a[href*="/contrib/"] > div',
                    '[class*="review"] a[href*="contrib"]'
                ];
                
                let nameElement = null;
                for (const selector of nameSelectors) {
                    nameElement = reviewElements[index].querySelector(selector);
                    if (nameElement) break;
                }
                
                if (nameElement && !nameElement.querySelector('.authentiscore-badge')) {
                    nameElement.appendChild(scoreElement);
                }
            }
        });
    }

    function analyzeReviews() {
        if (isAnalyzed) {
            const existingBadges = document.querySelectorAll('.authentiscore-badge');
            existingBadges.forEach(badge => badge.remove());
        }
        
        const reviews = scrapeReviews();
        if (reviews.length > 0) {
            injectScores(reviews);
            isAnalyzed = true;
            return { success: true, count: reviews.length };
        }
        return { success: false, count: 0 };
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'analyzeReviews') {
            const result = analyzeReviews();
            sendResponse(result);
        }
    });

    if (!window.authentiScoreInjected) {
        window.authentiScoreInjected = true;
        console.log('AuthentiScore content script loaded');
    }
})();