// Environment และ User configurations
const ENV_CONFIG = {
    DEV: {
        loginUrl: "https://auth-sit.local-gov.dev/auth/login?redirectUri=https%3A%2F%2Fhealth-dev.local-gov.dev&client_id=c7f25863-1c4e-4498-9ca9-07d1570f955b",
        gotoUrl: "https://health-dev.local-gov.dev",
        users: {
            champ: { username: "khwanchais@bedrockanalytics.ai", password: "Cchamp@no1" },
            preaw: { username: "Wasanao@bedrockanalytics.ai", password: "Wasana@P09" },
            biwbiw: { username: "0987702032", password: "Nuttiya17@cliniter" },
            mark: { username: "TanachatT@bedrockanalytics.ai", password: "Mark@1709" },
            province: { username: "khwanchai.s@cliniter.com", password: "Cchamp@12345" },
            country: { username: "momorecountry@gmail.com", password: "Mo@027314" }
        }
    },
    SIT: {
        loginUrl: "https://auth-uat.local-gov.dev/auth/login?redirectUri=https%3A%2F%2Fhealth-sit.local-gov.dev&client_id=c7f25863-1c4e-4498-9ca9-07d1570f955b",
        gotoUrl: "https://health-sit.local-gov.dev",
        users: {
            champ: { username: "khwanchais@bedrockanalytics.ai", password: "Cchamp@12345" },
            preaw: { username: "Wasanao@bedrockanalytics.ai", password: "Wasana@P09" },
            biwbiw: { username: "baragascar112@gmail.com", password: "Nuttiya17@cliniter" },
            provincere: { username: "khwanchai.s@cliniter.com", password: "Cchamp@12345" },
            provincebk: { username: "cliniterbangkok@gmail.com", password: "Cliniter@bk09" },
            country: { username: "PcuCountry.sit@gmail.com", password: "Pcu@sit09" }
        }
    },
    UAT: {
        loginUrl: "https://auth-uat.local-gov.dev/auth/login?redirectUri=https%3A%2F%2Fhealth-uat.local-gov.dev%2F&client_id=1c5d4f79-6134-4a9c-8358-51fd4c0a8a77",
        gotoUrl: "https://health-uat.local-gov.dev",
        users: {
            champ: { username: "khwanchais@bedrockanalytics.ai", password: "Cchamp@12345" },
            preaw: { username: "Wasanao@bedrockanalytics.ai", password: "Wasana@P09" },
            biwbiw: { username: "baragascar112@gmail.com", password: "Nuttiya17@cliniter" },
            province: { username: "khwanchai.s@cliniter.com", password: "Cchamp@12345" },
            country: { username: "PcuCountry.sit@gmail.com", password: "Pcu@sit09" }
        }
    },
    PROD: {
        loginUrl: "https://auth.localgov.ai/auth/login?redirectUri=https%3A%2F%2Fhealth.localgov.ai&client_id=ba5e885f-fccd-4fdf-8a69-940d54f9d8b3",
        gotoUrl: "https://health.localgov.ai",
        users: {
            bedrock: { username: "SHPHbedrock90002@gmail.com", password: "Sbd@3516!" },
            provincere: { username: "SHPHbedrockPAO@gmail.com", password: "Sbd@3516!" }
        }
    }
};

// DOM elements
const statusDiv = document.getElementById('status');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');

// Status management
function updateStatus(message, type = 'info') {
    statusDiv.className = `status ${type}`;
    statusDiv.innerHTML = type === 'working' ? 
        `<div class="loading"></div>${message}` : message;
}

function updateProgress(percentage) {
    if (percentage > 0) {
        progressBar.style.display = 'block';
        progressFill.style.width = `${percentage}%`;
    } else {
        progressBar.style.display = 'none';
    }
}

// Clear storage and cookies
async function clearStorageAndCookies(urls) {
    try {
        updateStatus('🗑️ กำลังล้าง Cookies และ Storage...', 'working');
        
        // Clear cookies for all related domains
        const domains = urls.map(url => new URL(url).hostname);
        
        for (const domain of domains) {
            // Get all cookies for this domain
            const cookies = await chrome.cookies.getAll({ domain: domain });
            console.log(`Clearing ${cookies.length} cookies for ${domain}`);
            
            // Remove each cookie
            for (const cookie of cookies) {
                try {
                    await chrome.cookies.remove({
                        url: `https://${domain}${cookie.path}`,
                        name: cookie.name
                    });
                } catch (e) {
                    console.log(`Failed to remove cookie ${cookie.name}:`, e);
                }
            }
            
            // Also try with different protocols and subdomains
            const variations = [
                `https://${domain}`,
                `https://www.${domain}`,
                `http://${domain}`,
                `http://www.${domain}`
            ];
            
            for (const url of variations) {
                try {
                    const cookiesVariation = await chrome.cookies.getAll({ url: url });
                    for (const cookie of cookiesVariation) {
                        await chrome.cookies.remove({
                            url: url,
                            name: cookie.name
                        });
                    }
                } catch (e) {
                    // Ignore errors for variations
                }
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error clearing storage:', error);
        return false;
    }
}

// Send message with retry mechanism
async function sendMessageWithRetry(tabId, message, maxRetries = 5) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            await chrome.tabs.sendMessage(tabId, message);
            return true;
        } catch (error) {
            console.log(`Message attempt ${i + 1} failed:`, error.message);
            if (i === maxRetries - 1) {
                throw error;
            }
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

// Main login process
async function performLogin(env, userKey) {
    const config = ENV_CONFIG[env];
    const userConfig = config.users[userKey];
    
    if (!userConfig) {
        updateStatus('❌ ไม่พบข้อมูล User', 'error');
        return;
    }

    try {
        updateStatus('🔄 เริ่มต้นกระบวนการ Login...', 'working');
        updateProgress(10);

        // Get current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Step 1: Clear storage and cookies FIRST (before navigation)
        updateStatus('🗑️ กำลังล้าง Storage และ Cookies ทั้งหมด...', 'working');
        const relatedUrls = [config.loginUrl, config.gotoUrl];
        await clearStorageAndCookies(relatedUrls);
        updateProgress(20);

        // Step 2: Navigate to login URL
        updateStatus('🌐 กำลังไปยังหน้า Login...', 'working');
        await chrome.tabs.update(tab.id, { url: config.loginUrl });
        updateProgress(30);

        // Wait for page to load completely
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Step 3: Clear localStorage via content script
        updateStatus('🧹 กำลังล้าง LocalStorage...', 'working');
        try {
            await sendMessageWithRetry(tab.id, { action: 'clearStorage' });
        } catch (error) {
            console.log('Could not clear localStorage via content script:', error);
        }
        updateProgress(40);

        // Wait for content script to be ready
        updateStatus('⏳ กำลังรอ Content Script พร้อมใช้งาน...', 'working');
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Step 4: Wait for login form and fill it
        updateStatus('📝 กำลังรอหน้า Login และกรอกข้อมูล...', 'working');
        
        try {
            await sendMessageWithRetry(tab.id, {
                action: 'login',
                username: userConfig.username,
                password: userConfig.password
            });
        } catch (error) {
            // If content script isn't ready, inject it manually
            updateStatus('🔄 กำลังโหลด Content Script...', 'working');
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });
            
            // Wait and try again
            await new Promise(resolve => setTimeout(resolve, 1000));
            await sendMessageWithRetry(tab.id, {
                action: 'login',
                username: userConfig.username,
                password: userConfig.password
            });
        }
        
        updateProgress(70);

        // Wait for login to complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Step 5: Check if login was successful and redirect
        updateStatus('✅ Login สำเร็จ! กำลังไปยังหน้าหลัก...', 'working');
        updateProgress(85);

        // Wait 5 seconds before redirecting
        setTimeout(async () => {
            updateStatus('🎯 กำลังไปยังหน้าปลายทาง...', 'working');
            await chrome.tabs.update(tab.id, { url: config.gotoUrl });
            updateProgress(100);
            
            setTimeout(() => {
                updateStatus('🎉 เสร็จสิ้น! เข้าสู่ระบบสำเร็จ', 'info');
                updateProgress(0);
            }, 1000);
        }, 8000);

    } catch (error) {
        console.error('Login error:', error);
        updateStatus(`❌ เกิดข้อผิดพลาด: ${error.message}`, 'error');
        updateProgress(0);
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // ส่วนจัดการ Tab Switching
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const tabId = tab.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // ส่วนจัดการ User Buttons
    document.querySelectorAll('.user-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const env = e.target.getAttribute('data-env');
            const user = e.target.getAttribute('data-user');
            
            // Disable all buttons during process
            document.querySelectorAll('.user-btn').forEach(btn => {
                btn.style.opacity = '0.6';
                btn.style.pointerEvents = 'none';
            });
            
            // Highlight selected button
            e.target.style.background = 'linear-gradient(45deg, #ff9800, #f57c00)';
            
            performLogin(env, user).finally(() => {
                // Re-enable buttons after process
                setTimeout(() => {
                    document.querySelectorAll('.user-btn').forEach(btn => {
                        btn.style.opacity = '1';
                        btn.style.pointerEvents = 'auto';
                        btn.style.background = 'linear-gradient(90deg, rgba(255, 255, 255, 0.12))';
                    });
                }, 2000);
            });
        });
    });

    const fillButton = document.getElementById('fillForm');
    const statusDiv = document.getElementById('statusform');
    
    function showStatusform(message, type = 'success') {
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
        
        // ซ่อนสถานะหลังจาก 3 วินาที
        setTimeout(() => {
            statusDiv.textContent = 'พร้อมใช้งาน - เข้าสู่หน้าสร้างหรือแก้ไขผู้รับบริการ';
            statusDiv.className = 'status';
        }, 3000);
    }
    fillButton.addEventListener('click', async function() {
        try {
            // ดึงข้อมูล tab ที่กำลังใช้งาน
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // ส่งข้อความไปยัง content script
            chrome.tabs.sendMessage(tab.id, { action: 'fillForm' }, function(response) {
                if (chrome.runtime.lastError) {
                    showStatusform('เกิดข้อผิดพลาด: ' + chrome.runtime.lastError.message, 'error');
                    return;
                }
                
                if (response && response.success) {
                    showStatusform('กรอกข้อมูลเรียบร้อย! 🎉');
                } else {
                    showStatusform('ไม่พบฟิลด์ที่ต้องการกรอก', 'error');
                }
            });
            
        } catch (error) {
            showStatusform('เกิดข้อผิดพลาด: ' + error.message, 'error');
        }
    });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'status') {
        updateStatus(message.message, message.status);
    }
});