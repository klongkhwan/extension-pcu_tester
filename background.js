// Background Script for Auto Login Extension
console.log('Auto Login Background Script Loaded');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Extension installed:', details);
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background received message:', message);
    
    // Forward status messages from content script to popup
    if (message.type === 'status') {
        // Try to send to popup if it's open
        chrome.runtime.sendMessage(message).catch(() => {
            // Popup might not be open, that's ok
            console.log('Status message forwarded (popup might be closed)');
        });
    }
    
    return true;
});

// Handle tab updates to detect navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        console.log('Tab updated:', tab.url);
        
        // Check if we're on a login page
        if (tab.url.includes('/auth/login')) {
            console.log('Login page detected');
        }
        
        // Check if we successfully navigated to the target site
        if (tab.url.includes('health-') || tab.url.includes('health.')) {
            console.log('Target site reached');
        }
    }
});

// Handle cookie changes to detect login state
chrome.cookies.onChanged.addListener((changeInfo) => {
    console.log('Cookie changed:', changeInfo);
});

// Enhanced function to clear all browser data
async function clearAllBrowserData() {
    try {
        console.log('Starting complete browser data clearing...');
        
        // Clear all browser data using browsingData API
        const dataTypes = {
            appcache: true,
            cache: true,
            cookies: true,
            downloads: false, // Keep downloads for user convenience
            fileSystems: true,
            formData: true,
            history: false, // Keep history for user convenience
            indexedDB: true,
            localStorage: true,
            passwords: false, // Keep passwords for user convenience
            pluginData: true,
            serviceWorkers: true,
            webSQL: true
        };
        
        // Clear data for all time
        await chrome.browsingData.remove({
            since: 0 // Clear everything from the beginning of time
        }, dataTypes);
        
        console.log('Browser data cleared successfully');
        return true;
    } catch (error) {
        console.error('Error clearing browser data:', error);
        return false;
    }
}

// Enhanced function to clear all cookies from all websites
async function clearAllCookies() {
    try {
        console.log('Starting complete cookie clearing...');
        
        // Get all cookies from all domains
        const allCookies = await chrome.cookies.getAll({});
        console.log(`Found ${allCookies.length} cookies to clear`);
        
        // Group cookies by domain for better logging
        const cookiesByDomain = {};
        for (const cookie of allCookies) {
            const domain = cookie.domain;
            if (!cookiesByDomain[domain]) {
                cookiesByDomain[domain] = [];
            }
            cookiesByDomain[domain].push(cookie);
        }
        
        console.log(`Clearing cookies from ${Object.keys(cookiesByDomain).length} domains`);
        
        // Remove all cookies
        const removePromises = allCookies.map(async (cookie) => {
            try {
                const url = `http${cookie.secure ? 's' : ''}://${cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain}${cookie.path}`;
                await chrome.cookies.remove({
                    url: url,
                    name: cookie.name,
                    storeId: cookie.storeId
                });
                return true;
            } catch (error) {
                console.warn(`Failed to remove cookie ${cookie.name} from ${cookie.domain}:`, error);
                return false;
            }
        });
        
        const results = await Promise.allSettled(removePromises);
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
        
        console.log(`Successfully cleared ${successCount}/${allCookies.length} cookies`);
        
        // Double-check by trying alternative removal methods
        await clearCookiesAlternativeMethod();
        
        return true;
    } catch (error) {
        console.error('Error clearing all cookies:', error);
        return false;
    }
}

// Alternative method to ensure all cookies are cleared
async function clearCookiesAlternativeMethod() {
    try {
        // Get all tabs to extract domains
        const tabs = await chrome.tabs.query({});
        const domains = new Set();
        
        // Extract domains from all open tabs
        for (const tab of tabs) {
            if (tab.url) {
                try {
                    const url = new URL(tab.url);
                    domains.add(url.hostname);
                    // Add variations
                    if (url.hostname.startsWith('www.')) {
                        domains.add(url.hostname.substring(4));
                    } else {
                        domains.add(`www.${url.hostname}`);
                    }
                } catch (e) {
                    // Invalid URL, skip
                }
            }
        }
        
        // Clear cookies for each domain
        for (const domain of domains) {
            await clearDomainCookies(domain);
        }
        
        // Clear cookies for common domains that might not be in tabs
        const commonDomains = [
            'google.com', 'facebook.com', 'amazon.com', 'microsoft.com',
            'apple.com', 'twitter.com', 'instagram.com', 'linkedin.com',
            'youtube.com', 'netflix.com', 'github.com', 'stackoverflow.com'
        ];
        
        for (const domain of commonDomains) {
            await clearDomainCookies(domain);
        }
        
        console.log('Alternative cookie clearing completed');
    } catch (error) {
        console.error('Error in alternative cookie clearing:', error);
    }
}

// Utility function to clear cookies for a domain (enhanced version)
async function clearDomainCookies(domain) {
    try {
        console.log(`Clearing cookies for domain: ${domain}`);
        
        // All possible domain variations
        const domainVariations = [
            domain,
            `.${domain}`,
            `www.${domain}`,
            `.www.${domain}`,
            domain.startsWith('www.') ? domain.substring(4) : `www.${domain}`
        ];
        
        // All possible URL variations
        const urlVariations = [];
        for (const d of domainVariations) {
            urlVariations.push(`https://${d.startsWith('.') ? d.substring(1) : d}`);
            urlVariations.push(`http://${d.startsWith('.') ? d.substring(1) : d}`);
            urlVariations.push(`https://${d.startsWith('.') ? d.substring(1) : d}/`);
            urlVariations.push(`http://${d.startsWith('.') ? d.substring(1) : d}/`);
        }
        
        let totalCleared = 0;
        
        // Clear cookies for each domain variation
        for (const domainVar of domainVariations) {
            try {
                const cookies = await chrome.cookies.getAll({ domain: domainVar });
                for (const cookie of cookies) {
                    try {
                        const url = `http${cookie.secure ? 's' : ''}://${cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain}${cookie.path}`;
                        await chrome.cookies.remove({
                            url: url,
                            name: cookie.name,
                            storeId: cookie.storeId
                        });
                        totalCleared++;
                    } catch (e) {
                        // Try alternative URL format
                        for (const urlVar of urlVariations) {
                            try {
                                await chrome.cookies.remove({
                                    url: urlVar,
                                    name: cookie.name,
                                    storeId: cookie.storeId
                                });
                                totalCleared++;
                                break;
                            } catch (e2) {
                                // Continue trying
                            }
                        }
                    }
                }
            } catch (e) {
                console.log(`Could not get cookies for domain variation ${domainVar}:`, e.message);
            }
        }
        
        // Clear cookies by URL patterns
        for (const url of urlVariations) {
            try {
                const urlCookies = await chrome.cookies.getAll({ url: url });
                for (const cookie of urlCookies) {
                    try {
                        await chrome.cookies.remove({
                            url: url,
                            name: cookie.name,
                            storeId: cookie.storeId
                        });
                        totalCleared++;
                    } catch (e) {
                        // Continue
                    }
                }
            } catch (e) {
                // Continue
            }
        }
        
        if (totalCleared > 0) {
            console.log(`Cleared ${totalCleared} cookies for domain: ${domain}`);
        }
        
        return true;
    } catch (error) {
        console.error(`Error clearing cookies for domain ${domain}:`, error);
        return false;
    }
}

// Enhanced message handler
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    console.log('Background received message:', message);
    
    try {
        if (message.action === 'clearCookies') {
            // Clear cookies for specific domain
            const success = await clearDomainCookies(message.domain);
            sendResponse({ success });
            return true;
        }
        
        if (message.action === 'clearAllCookies') {
            // Clear all cookies from all websites
            const success = await clearAllCookies();
            sendResponse({ success });
            return true;
        }
        
        if (message.action === 'clearAllBrowserData') {
            // Clear all browser data including cookies, cache, local storage, etc.
            const success = await clearAllBrowserData();
            sendResponse({ success });
            return true;
        }
        
        if (message.action === 'clearComplete') {
            // Complete clearing: both browser data and cookies
            console.log('Starting complete data clearing...');
            
            const browserDataSuccess = await clearAllBrowserData();
            const cookiesSuccess = await clearAllCookies();
            
            const success = browserDataSuccess && cookiesSuccess;
            console.log(`Complete clearing finished. Success: ${success}`);
            
            sendResponse({ 
                success,
                browserData: browserDataSuccess,
                cookies: cookiesSuccess
            });
            return true;
        }
        
        // Forward status messages from content script to popup
        if (message.type === 'status') {
            // Try to send to popup if it's open
            chrome.runtime.sendMessage(message).catch(() => {
                // Popup might not be open, that's ok
                console.log('Status message forwarded (popup might be closed)');
            });
        }
    } catch (error) {
        console.error('Error handling message:', error);
        sendResponse({ success: false, error: error.message });
    }
    
    return true;
});

// Function to clear data on extension startup (optional)
async function clearDataOnStartup() {
    try {
        // Get settings to check if auto-clear is enabled
        const result = await chrome.storage.sync.get(['autoClearOnStartup']);
        
        if (result.autoClearOnStartup) {
            console.log('Auto-clearing data on startup...');
            await clearAllBrowserData();
            await clearAllCookies();
            console.log('Startup data clearing completed');
        }
    } catch (error) {
        console.error('Error in startup clearing:', error);
    }
}

// Keep service worker alive
const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20e3);
chrome.runtime.onStartup.addListener(() => {
    keepAlive();
    clearDataOnStartup(); // Optional: clear data on browser startup
});
keepAlive();

// Periodic cleanup (optional)
setInterval(async () => {
    try {
        // Get settings to check if periodic cleanup is enabled
        const result = await chrome.storage.sync.get(['periodicCleanup']);
        
        if (result.periodicCleanup) {
            console.log('Performing periodic cleanup...');
            await clearAllCookies();
        }
    } catch (error) {
        console.error('Error in periodic cleanup:', error);
    }
}, 60 * 60 * 1000); // Every hour

console.log('Enhanced Auto Login Background Script fully loaded');