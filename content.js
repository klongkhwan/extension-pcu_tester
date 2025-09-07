function getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// โหลดข้อมูลจาก JSON ภายนอก
async function loadNames() {
    const response = await fetch("https://klongkhwan.github.io/tester/files/names.json");
    if (!response.ok) {
        throw new Error("โหลด names.json ไม่ได้");
    }
    return await response.json();
}

function generateRandomCID() {
  let digits = [];

  // สุ่มเลข 12 หลักแรก (หลักแรกห้ามเป็น 0)
  digits[0] = Math.floor(Math.random() * 9) + 1;
  for (let i = 1; i < 12; i++) {
    digits[i] = Math.floor(Math.random() * 10);
  }

  // คำนวณ checksum สำหรับหลักที่ 13
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (13 - i);
  }
  let checkDigit = (11 - (sum % 11)) % 10;

  digits[12] = checkDigit;

  return digits.join("");
}


function generateRandomPhone() {
    // สุ่มเบอร์โทรศัพท์ 10 หลัก (08xxxxxxxx หรือ09xxxxxxxx)
    const prefix = Math.random() < 0.5 ? '08' : '09';
    let phone = prefix;
    for (let i = 0; i < 8; i++) {
        phone += Math.floor(Math.random() * 10);
    }
    return phone;
}


// ฟังก์ชันกรอกข้อมูลแบบเร็ว (ไม่พิมพ์ทีละตัวอักษร)
async function fillText(field, text) {
    return new Promise((resolve) => {
        // Focus และส่ง focusin
        field.focus();
        field.dispatchEvent(new Event('focusin', { bubbles: true }));
        
        // กรอกข้อมูลเลย
        field.value = text;
        
        // ส่ง input และ change events
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
        
        // ส่ง focusout เพื่อให้ validation ทำงาน
        setTimeout(() => {
            field.dispatchEvent(new Event('focusout', { bubbles: true }));
            field.blur();
            
            // รอให้ validation ทำงานเสร็จ
            setTimeout(() => {
                resolve();
            }, 150);
        }, 50);
    });
}


// ฟังก์ชันกรอกฟิลด์
async function fillField(selector, value) {
    const field = document.querySelector(selector);
    if (field) {
        console.log(`กำลังกรอก ${selector} ด้วยค่า: "${value}"`);
        
        // scroll ไปที่ฟิลด์
        field.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        await new Promise(resolve => setTimeout(resolve, 300)); // รอให้ scroll เสร็จ
        
        if (field.tagName.toLowerCase() === 'select') {
            await selectOption(field, value);
        } else {
            await fillText(field, value);
        }
        
        // ตรวจสอบว่าค่าถูกกรอกแล้วหรือไม่
        const currentValue = field.value;
        console.log(`ค่าปัจจุบันใน ${selector}: "${currentValue}"`);
        
        return true;
    } else {
        // แสดง error และ throw exception
        const errorMessage = `❌ ERROR: ไม่พบ element "${selector}"`;
        console.error(errorMessage);
        throw new Error(errorMessage);
    }
}

// ฟังก์ชันหลักสำหรับกรอกฟอร์ม
async function fillForm() {
    try {
        // สุ่มข้อมูลทั้งหมด
        console.log("เริ่มโหลดชื่อ-สกุลจาก names.json ...");
        const namesData = await loadNames();

        // สุ่มชื่อและสกุล
        const firstName = getRandomItem(namesData.firstname).th;
        const lastName = getRandomItem(namesData.lastname).th;

        const cid = generateRandomCID();
        const phone = generateRandomPhone();
        
        console.log('เริ่มกรอกข้อมูล...');
        
        // กรอกข้อมูลตามลำดับ - หยุดทันทีเมื่อเจอ error
        await fillField('#phone', phone);
        console.log('✅ กรอกเบอร์โทรศัพท์สำเร็จ:', phone);

        await fillField('#firstName', firstName);
        console.log('✅ กรอกชื่อสำเร็จ:', firstName);
        
        await fillField('#lastName', lastName);
        console.log('✅ กรอกนามสกุลสำเร็จ:', lastName);
        
        await fillField('#cid', cid);
        console.log('✅ กรอกเลขบัตรประชาชนสำเร็จ:', cid);
        
        // คลิกที่ที่ว่างเพื่อออกจากฟิลด์สุดท้าย
        document.body.click();
        
        console.log('🎉 กรอกข้อมูลเสร็จสิ้นทั้งหมด!');
        console.log('ข้อมูลทั้งหมด:', {
            firstName, lastName, cid, phone
        });
        
        return true;
        
    } catch (error) {
        console.error('💥 กรอกฟอร์มล้มเหลว:', error.message);
        console.error('🛑 หยุดการทำงาน');
        return false;
    }
}


// รับฟังข้อความจาก popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'fillForm') {
        fillForm().then(success => {
            sendResponse({ success: success });
        }).catch(error => {
            console.error('Auto Form Filler Error:', error);
            sendResponse({ success: false, error: error.message });
        });
    }
    return true; // รักษาการเชื่อมต่อไว้สำหรับ async response
});

// Content Script for Auto Login
console.log('Auto Login Content Script Loaded');

// Let background know content script is ready
chrome.runtime.sendMessage({ type: 'contentScriptReady' }).catch(() => {
    console.log('Background script not ready yet');
});

// Utility function to wait for element
function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
            resolve(element);
            return;
        }

        const observer = new MutationObserver((mutations, obs) => {
            const element = document.querySelector(selector);
            if (element) {
                obs.disconnect();
                resolve(element);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        }, timeout);
    });
}

// Function to clear localStorage
function clearLocalStorage() {
    try {
        // Clear localStorage
        if (typeof(Storage) !== "undefined" && localStorage) {
            localStorage.clear();
            console.log('LocalStorage cleared');
        }
        
        // Clear sessionStorage
        if (typeof(Storage) !== "undefined" && sessionStorage) {
            sessionStorage.clear();
            console.log('SessionStorage cleared');
        }
        
        // Clear IndexedDB (if any)
        if ('indexedDB' in window) {
            indexedDB.databases().then(databases => {
                databases.forEach(db => {
                    indexedDB.deleteDatabase(db.name);
                });
            }).catch(e => console.log('Could not clear IndexedDB:', e));
        }
        
        // Clear WebSQL (deprecated but still might exist)
        if ('openDatabase' in window) {
            try {
                const db = openDatabase('', '', '', '');
                db.transaction(function(tx) {
                    tx.executeSql('DELETE FROM __WebKitDatabaseInfoTable__');
                });
            } catch(e) {
                console.log('Could not clear WebSQL:', e);
            }
        }
        
        console.log('All storage cleared successfully');
        return true;
    } catch (error) {
        console.error('Error clearing storage:', error);
        return false;
    }
}

// Function to fill login form
async function fillLoginForm(username, password) {
    try {
        console.log('Starting login form fill process...');
        
        // Send status update
        chrome.runtime.sendMessage({
            type: 'status',
            message: '🔍 กำลังค้นหา Input Fields...',
            status: 'working'
        });

        // Wait for username input
        const usernameInput = await waitForElement('input[type="text"][autocomplete="off"]', 15000);
        console.log('Username input found:', usernameInput);

        // Wait for password input
        const passwordInput = await waitForElement('input[autocomplete="off"][minlength="0"][maxlength="18"]', 15000);
        console.log('Password input found:', passwordInput);

        // Wait for login button
        const loginButton = await waitForElement('button[type="submit"]', 15000);
        console.log('Login button found:', loginButton);

        // Clear existing values
        usernameInput.value = '';
        passwordInput.value = '';

        // Fill username
        usernameInput.focus();
        usernameInput.value = username;
        usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
        usernameInput.dispatchEvent(new Event('change', { bubbles: true }));

        chrome.runtime.sendMessage({
            type: 'status',
            message: '📧 กรอก Username เรียบร้อย',
            status: 'working'
        });

        // Small delay between inputs
        await new Promise(resolve => setTimeout(resolve, 500));

        // Fill password
        passwordInput.focus();
        passwordInput.value = password;
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
        passwordInput.dispatchEvent(new Event('change', { bubbles: true }));

        chrome.runtime.sendMessage({
            type: 'status',
            message: '🔐 กรอก Password เรียบร้อย',
            status: 'working'
        });

        // Wait a bit before clicking
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Click login button
        chrome.runtime.sendMessage({
            type: 'status',
            message: '🚀 กำลังกดปุ่ม Login...',
            status: 'working'
        });

        loginButton.click();
        
        console.log('Login form submitted successfully');

        // Wait and check for login success/failure
        setTimeout(() => {
            const currentUrl = window.location.href;
            if (currentUrl.includes('health-') || currentUrl.includes('health.')) {
                chrome.runtime.sendMessage({
                    type: 'status',
                    message: '✅ Login สำเร็จ!',
                    status: 'info'
                });
            } else if (currentUrl.includes('login')) {
                // Still on login page, might be an error
                const errorElement = document.querySelector('.alert, .error, [class*="error"], [class*="alert"]');
                if (errorElement) {
                    chrome.runtime.sendMessage({
                        type: 'status',
                        message: '❌ Login ไม่สำเร็จ - ตรวจสอบข้อมูล',
                        status: 'error'
                    });
                }
            }
        }, 3000);

        return true;
    } catch (error) {
        console.error('Error filling login form:', error);
        chrome.runtime.sendMessage({
            type: 'status',
            message: `❌ ไม่พบ Input Fields: ${error.message}`,
            status: 'error'
        });
        return false;
    }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    console.log('Content script received message:', message);

    try {
        if (message.action === 'clearStorage') {
            const success = clearLocalStorage();
            sendResponse({ success });
            return true;
        }

        if (message.action === 'login') {
            // Clear storage first
            clearLocalStorage();
            
            // Wait for page to be ready
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Fill and submit login form
            const success = await fillLoginForm(message.username, message.password);
            sendResponse({ success });
            return true;
        }
    } catch (error) {
        console.error('Message handling error:', error);
        sendResponse({ success: false, error: error.message });
    }
    
    return true; // Keep message channel open for async response
});

// Auto-detect if we're on a login page and ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    
    // Check if we're on a login page
    const isLoginPage = window.location.href.includes('/auth/login');
    if (isLoginPage) {
        console.log('Detected login page, ready for auto-login');
        
        // Check if form elements exist
        setTimeout(() => {
            const usernameInput = document.querySelector('input[type="text"][autocomplete="off"]');
            const passwordInput = document.querySelector('input[autocomplete="off"][minlength="0"][maxlength="18"]');
            const loginButton = document.querySelector('button[type="submit"]');
            
            if (usernameInput && passwordInput && loginButton) {
                console.log('Login form elements detected and ready');
                chrome.runtime.sendMessage({
                    type: 'status',
                    message: '📄 หน้า Login พร้อมใช้งาน',
                    status: 'info'
                });
            }
        }, 1000);
    }
});

// Handle page navigation
window.addEventListener('beforeunload', () => {
    console.log('Page is being unloaded');
});

// Monitor for successful login (URL change)
let currentUrl = window.location.href;
const urlObserver = new MutationObserver(() => {
    if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        console.log('URL changed to:', currentUrl);
        
        if (currentUrl.includes('health-') || currentUrl.includes('health.')) {
            chrome.runtime.sendMessage({
                type: 'status',
                message: '🎉 เข้าสู่ระบบสำเร็จ!',
                status: 'info'
            });
        }
    }
});

urlObserver.observe(document.body, {
    childList: true,
    subtree: true
});


