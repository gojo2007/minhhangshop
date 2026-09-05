"use strict";

// =================================================================
// 1. AUTO-INJECT COMPONENT STYLES
// =================================================================
(function injectCoreStyles() {
    if (!document.getElementById('mh-core-styles')) {
        const style = document.createElement('style');
        style.id = 'mh-core-styles';
        style.textContent = `
            #toast { visibility: hidden; min-width: 250px; background-color: var(--text-main, #111); color: #fff; text-align: center; border-radius: 8px; padding: 16px 20px; position: fixed; z-index: 999999; left: 50%; bottom: 30px; transform: translateX(-50%); box-shadow: 0 10px 30px rgba(0,0,0,0.2); font-weight: 500; font-size: 0.95rem; opacity: 0; transition: opacity 0.3s ease, bottom 0.3s ease; }
            #toast.show { visibility: visible; opacity: 1; bottom: 50px; }
        `;
        document.head.appendChild(style);
    }
})();

// =================================================================
// 2. KHỞI TẠO STATE & HẰNG SỐ
// =================================================================
const VIP_TIERS = [
    { name: "MEMBER", minSpent: 0, discountRate: 0, nextTier: "SILVER", nextSpent: 2000000 },
    { name: "SILVER", minSpent: 2000000, discountRate: 0.05, nextTier: "GOLD", nextSpent: 5000000 },
    { name: "GOLD", minSpent: 5000000, discountRate: 0.10, nextTier: "DIAMOND", nextSpent: 10000000 },
    { name: "DIAMOND", minSpent: 10000000, discountRate: 0.15, nextTier: "MAX", nextSpent: 10000000 }
];

let cart = []; 
let wishlist = [];
let recentlyViewed = []; 
let discountRate = 0;

try { 
    cart = JSON.parse(localStorage.getItem('mh_cart')) || []; 
    wishlist = JSON.parse(localStorage.getItem('mh_wishlist')) || [];
    recentlyViewed = JSON.parse(localStorage.getItem('mh_recently_viewed_v2')) || [];
} catch (e) { 
    cart = []; wishlist = []; recentlyViewed = [];
}

// =================================================================
// 3. TIỆN ÍCH (UTILITIES)
// =================================================================
const formatMoney = (amount) => {
    if (isNaN(amount) || amount === null) return '0đ';
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
};

function escapeHTML(value) { 
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(value ?? '').replace(/[&<>"']/g, char => map[char]); 
}

function removeAccents(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

function safeImageUrl(value) {
    const fallback = 'https://placehold.co/400x533/f8f8f8/333333?text=Minh+Hang+Store';
    const url = String(value || fallback).trim();
    // BẢN VÁ LỖI: Cho phép file:| để chạy trên máy không có Live Server
    return /^(https?:|file:|data:image\/|\.\/|\/)/i.test(url) ? escapeHTML(url) : fallback;
}

let toastTimeout;
function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.setAttribute('role', 'alert');
        document.body.appendChild(toast);
    }
    toast.innerHTML = message; 
    toast.classList.add('show'); 
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { toast.classList.remove('show'); }, 3000); 
}

// =================================================================
// 4. QUẢN LÝ NGƯỜI DÙNG & VIP
// =================================================================
function getUserSpent() {
    let spent = localStorage.getItem('user_total_spent');
    if (!spent) {
        spent = Math.floor(Math.random() * 8000000); 
        localStorage.setItem('user_total_spent', spent);
    }
    return parseInt(spent);
}

function populateProfileData() {
    const name = localStorage.getItem('logged_in_user') || 'Khách hàng';
    const email = localStorage.getItem('logged_in_email') || 'Chưa cập nhật';
    
    if(document.getElementById('display-profile-name')) document.getElementById('display-profile-name').innerText = name;
    if(document.getElementById('display-profile-email')) document.getElementById('display-profile-email').innerText = email;
    if(document.getElementById('display-orders-name')) document.getElementById('display-orders-name').innerText = name.split(' ').slice(-1)[0] || name;

    let spent = getUserSpent();
    let currentTier = VIP_TIERS.slice().reverse().find(tier => spent >= tier.minSpent) || VIP_TIERS[0];
    discountRate = currentTier.discountRate; 
    
    if(document.getElementById('vip-tier-display')) {
        document.getElementById('vip-tier-display').innerText = currentTier.name;
        document.getElementById('vip-discount-display').innerText = `Giảm ${currentTier.discountRate * 100}% toàn shop`;
        document.getElementById('vip-spent-display').innerText = formatMoney(spent);
        
        let reqDisplay = document.getElementById('vip-next-req-display');
        let progressFill = document.getElementById('vip-progress-fill');
        
        if (currentTier.name === "DIAMOND") {
            reqDisplay.innerHTML = "Bạn đã đạt hạng thẻ cao nhất!";
            progressFill.style.width = "100%";
        } else {
            let nextTierObj = VIP_TIERS.find(t => t.name === currentTier.nextTier);
            if (nextTierObj) {
                let needed = nextTierObj.minSpent - spent;
                let percent = Math.min((spent / nextTierObj.minSpent) * 100, 100);
                reqDisplay.innerHTML = `Mua thêm <b>${formatMoney(needed)}</b> để thăng hạng <b>${nextTierObj.name} (Giảm ${nextTierObj.discountRate * 100}%)</b>`;
                progressFill.style.width = percent + "%";
            }
        }
    }
}

// =================================================================
// 5. RENDER GIAO DIỆN SẢN PHẨM
// =================================================================
function createProductCard(p) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.price = p.price;
    const badgeHTML = p.badge ? `<div class="badge" style="background: ${p.badgeColor || 'var(--gold)'};">${p.badge}</div>` : '';
    const priceHTML = p.oldPrice 
        ? `<div><span style="text-decoration: line-through; color: var(--text-light); font-size: 0.95rem; margin-right: 10px;">${p.oldPrice}</span><span class="product-price" style="color: var(--accent-red); font-size: 1.3rem; font-weight: 700;">${formatMoney(p.price)}</span></div>`
        : `<div class="product-price">${formatMoney(p.price)}</div>`;
    
    const fallbackImage = 'https://placehold.co/400x533/f8f8f8/333333?text=Minh+Hang+Store';
    
    card.innerHTML = `
        ${badgeHTML}
        <img class="product-img" loading="lazy" decoding="async" alt="${escapeHTML(p.name)}" src="${safeImageUrl(p.image)}" onerror="this.onerror=null; this.src='${fallbackImage}';">
        <div class="product-info">
            <div class="product-name">${escapeHTML(p.name)}</div>
            ${priceHTML}
        </div>
    `;

    const infoDiv = card.querySelector('.product-info');
    infoDiv.insertAdjacentHTML('beforeend', `<div class="card-reviews">⭐⭐⭐⭐⭐ (${p.rating || '4.8'}/5) - ${p.reviews || '120'} đánh giá</div>`);
    
    const compareCb = document.createElement('div');
    compareCb.className = 'compare-cb-container';
    compareCb.innerHTML = `<input type="checkbox" aria-label="So sánh sản phẩm" class="compare-checkbox"> So sánh`;
    compareCb.onclick = (e) => e.stopPropagation();
    
    const checkbox = compareCb.querySelector('input');
    checkbox.onchange = () => handleCompareSelection(checkbox, p.name, formatMoney(p.price));
    infoDiv.appendChild(compareCb);

    card.addEventListener('click', () => {
        openProduct(p.name, formatMoney(p.price), p.image, p.colors || ['#000', '#fff'], p.sizes || ['S','M','L']);
    });
    return card;
}

function renderAllProducts() {
    const containers = {
        'flash-sale': document.getElementById('grid-sale'), 
        'nu': document.getElementById('grid-nu'), 
        'nam': document.getElementById('grid-nam'),
        'unisex': document.getElementById('grid-unisex'), 
        'phu-kien': document.getElementById('grid-phukien'), 
        'cong-nghe': document.getElementById('grid-congnghe')
    };
    
    if(typeof window.products !== 'undefined' && Array.isArray(window.products)) {
        const fragments = {};
        window.products.forEach(p => { 
            p.category.forEach(cat => {
                if(containers[cat]) {
                    if (!fragments[cat]) fragments[cat] = document.createDocumentFragment();
                    fragments[cat].appendChild(createProductCard(p)); 
                }
            });
        });
        
        for (let cat in fragments) {
            if (containers[cat]) containers[cat].appendChild(fragments[cat]);
        }
    }
}

function renderMixMatch() {
    const container = document.getElementById('mix-match-container');
    if (!container || typeof mixMatchData === 'undefined') return;

    let htmlContent = '';
    mixMatchData.forEach(item => {
        htmlContent += `
        <div class="shop-the-look-flex" style="display: flex; gap: 40px; background: var(--card-bg); padding: 40px; border-radius: 16px; box-shadow: 0 15px 40px rgba(0,0,0,0.03); margin-bottom: 30px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 300px;">
                <img src="${safeImageUrl(item.image)}" style="width:100%; height:100%; object-fit:cover; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);" loading="lazy" decoding="async" alt="${escapeHTML(item.title)}">
            </div>
            <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; min-width: 300px;">
                <h3 style="font-family: var(--font-heading); font-size: clamp(2rem, 3vw, 2.5rem); margin-bottom: 20px;">${escapeHTML(item.title)}</h3>
                <p style="margin-bottom: 30px; color: var(--text-light); font-size: 1.1rem; line-height: 1.7;">${escapeHTML(item.description)}</p>
                <button class="btn" style="background: var(--text-main); color: var(--bg-color); width: max-content; border: none; border-radius: 8px; padding: 16px 30px;" 
                        onclick="addToCart('${escapeHTML(item.comboName)}', '${escapeHTML(item.totalPrice)}', '${safeImageUrl(item.image)}')">
                    [ THÊM TẤT CẢ VÀO GIỎ HÀNG ]
                </button>
            </div>
        </div>
        `;
    });
    container.innerHTML = htmlContent;
}

function addToRecentlyViewed(name, price, imgUrl) {
    recentlyViewed = recentlyViewed.filter(item => item.name !== name);
    recentlyViewed.unshift({ name, price, imgUrl });
    if (recentlyViewed.length > 4) recentlyViewed.pop(); 
    localStorage.setItem('mh_recently_viewed_v2', JSON.stringify(recentlyViewed));
    renderRecentlyViewed();
}

function renderRecentlyViewed() {
    const container = document.getElementById('rv-grid-container');
    const section = document.getElementById('recently-viewed-section');
    if (!container || !section) return;

    if (recentlyViewed.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    const fallbackImage = 'https://placehold.co/400x533/f8f8f8/333333?text=Minh+Hang+Store';
    
    container.innerHTML = recentlyViewed.map(item => `
        <div class="product-card" onclick="openProduct('${escapeHTML(item.name)}', '${escapeHTML(item.price)}', '${safeImageUrl(item.imgUrl)}', ['#000', '#fff'], ['S', 'M', 'L'])">
            <img class="product-img" src="${safeImageUrl(item.imgUrl)}" alt="${escapeHTML(item.name)}" loading="lazy" style="aspect-ratio: 3/4; object-fit: cover;" onerror="this.onerror=null; this.src='${fallbackImage}';">
            <div class="product-info" style="padding: 15px;">
                <div class="product-name" style="font-size: 0.95rem;">${escapeHTML(item.name)}</div>
                <div class="product-price" style="font-weight: bold; color: var(--gold);">${escapeHTML(item.price)}</div>
            </div>
        </div>
    `).join('');
    
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
    container.style.gap = '20px';
}

// =================================================================
// 6. GIỎ HÀNG & WISHLIST LOGIC
// =================================================================
function updateCartBadge() {
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    const badge = document.getElementById('cart-count');
    if(badge) { 
        badge.innerText = totalItems; 
        badge.style.display = totalItems > 0 ? 'flex' : 'none'; 
    }
}

function renderCart() {
    const container = document.getElementById('cart-items');
    if(!container) return; 
    let subTotal = 0;
    
    if(cart.length === 0) { 
        container.innerHTML = '<p style="text-align:center; color: var(--text-light); margin-top: 30px;">Giỏ hàng của bạn đang trống.</p>'; 
    } else {
        container.innerHTML = cart.map((item, index) => {
            subTotal += item.price * item.qty;
            return `
                <div class="cart-item">
                    <img src="${safeImageUrl(item.imgUrl)}" alt="${escapeHTML(item.name)}" loading="lazy" class="cart-item-img" onerror="this.onerror=null; this.src='https://placehold.co/400x533/f8f8f8/333333?text=MH'">
                    <div class="cart-item-info">
                        <div><div class="cart-item-title">${escapeHTML(item.name)}</div><div class="cart-item-price">${escapeHTML(item.priceStr)}</div></div>
                        <div style="display:flex; justify-content: space-between; align-items: center;">
                            <div class="cart-qty-ctrl">
                                <button class="qty-btn" onclick="updateQty(${index}, -1)">-</button>
                                <span style="color:var(--text-main);">${item.qty}</span>
                                <button class="qty-btn" onclick="updateQty(${index}, 1)">+</button>
                            </div>
                            <span class="cart-item-remove" role="button" tabindex="0" onclick="removeFromCart(${index})">Xóa</span>
                        </div>
                    </div>
                </div>`;
        }).join('');
    }

    let discountAmt = subTotal * discountRate; 
    let finalTotal = subTotal - discountAmt;
    
    const discountDisplay = document.getElementById('discount-display');
    if(discountDisplay) {
        if(discountRate > 0) { 
            discountDisplay.style.display = 'flex'; 
            discountDisplay.innerHTML = `VIP Giảm (${discountRate * 100}%): <span>-${formatMoney(discountAmt)}</span>`; 
        } else { 
            discountDisplay.style.display = 'none'; 
        }
    }
    
    const cartTotalEl = document.getElementById('cart-total-price');
    if(cartTotalEl) { 
        cartTotalEl.innerText = formatMoney(finalTotal); 
        cartTotalEl.setAttribute('data-val', finalTotal); 
    }
}

function updateQty(index, delta) { 
    if (cart[index].qty + delta > 0) {
        cart[index].qty += delta; 
        localStorage.setItem('mh_cart', JSON.stringify(cart)); 
        updateCartBadge(); renderCart(); 
    }
}

function removeFromCart(index) { 
    cart.splice(index, 1); 
    localStorage.setItem('mh_cart', JSON.stringify(cart)); 
    updateCartBadge(); renderCart(); 
}

function addToCart(name, priceStr, imgUrl = '') {
    let priceNum = parseInt(String(priceStr).replace(/\D/g, '')) || 0;
    const existingItem = cart.find(item => item.name === name);
    if (existingItem) { existingItem.qty++; } 
    else { cart.push({ name, priceStr, price: priceNum, imgUrl, qty: 1 }); }
    localStorage.setItem('mh_cart', JSON.stringify(cart)); 
    updateCartBadge(); renderCart(); 
    if(document.getElementById('details-modal')) document.getElementById('details-modal').style.display = 'none'; 
    toggleNoScroll(false); 
    showToast(`Đã thêm <b>${escapeHTML(name)}</b> vào giỏ hàng!`);
}

function addToWishlist(name, priceStr, imgUrl) {
    if (!wishlist.find(item => item.name === name)) {
        wishlist.push({ name, priceStr, imgUrl }); 
        localStorage.setItem('mh_wishlist', JSON.stringify(wishlist));
        const badge = document.getElementById('wishlist-count'); 
        if(badge) { 
            badge.innerText = wishlist.length; 
            badge.style.display = wishlist.length > 0 ? 'inline-block' : 'none'; 
        }
        if(document.getElementById('details-modal')) document.getElementById('details-modal').style.display = 'none'; 
        toggleNoScroll(false);
        showToast(`Đã lưu <b>${escapeHTML(name)}</b> vào danh sách yêu thích!`);
    } else { 
        showToast(`Sản phẩm <b>${escapeHTML(name)}</b> đã có trong mục yêu thích!`); 
    }
}

function removeFromWishlist(index) {
    wishlist.splice(index, 1); 
    localStorage.setItem('mh_wishlist', JSON.stringify(wishlist));
    const badge = document.getElementById('wishlist-count'); 
    if(badge) { 
        badge.innerText = wishlist.length; 
        badge.style.display = wishlist.length > 0 ? 'inline-block' : 'none'; 
    }
    renderWishlist();
}

function renderWishlist() {
    const container = document.getElementById('wishlist-items'); 
    if(!container) return; 
    if(wishlist.length === 0) { 
        container.innerHTML = '<p style="text-align:center; color: var(--text-light); margin-top: 30px;">Bạn chưa lưu sản phẩm nào.</p>'; 
    } else {
        container.innerHTML = wishlist.map((item, index) => `
            <div class="cart-item">
                <img src="${safeImageUrl(item.imgUrl)}" alt="${escapeHTML(item.name)}" loading="lazy" class="cart-item-img" onerror="this.onerror=null; this.src='https://placehold.co/400x533/f8f8f8/333333?text=MH'">
                <div class="cart-item-info">
                    <div><div class="cart-item-title">${escapeHTML(item.name)}</div><div class="cart-item-price">${escapeHTML(item.priceStr)}</div></div>
                    <div style="display:flex; justify-content: space-between; align-items: center; margin-top: 15px;">
                        <button class="btn" style="padding: 8px 15px; font-size: 0.8rem; margin:0; background: var(--text-main); color:var(--bg-color); border-radius:4px;" onclick="moveWishlistToCart(${index})">Thêm vào giỏ</button>
                        <span class="cart-item-remove" role="button" tabindex="0" onclick="removeFromWishlist(${index})">Bỏ lưu</span>
                    </div>
                </div>
            </div>`).join('');
    }
}

function moveWishlistToCart(index) { 
    const item = wishlist[index]; 
    if (!item) return; 
    addToCart(item.name, item.priceStr, item.imgUrl); 
    removeFromWishlist(index); 
}

// =================================================================
// 7. TÌM KIẾM, BỘ LỌC & UI ĐIỀU HƯỚNG
// =================================================================
let searchTimeout;

// Thuật toán Fuzzy Match (Tìm kiếm sai chính tả)
function fuzzyMatch(queryWord, targetText) {
    let q = removeAccents(queryWord.toLowerCase()).trim();
    let t = removeAccents(targetText.toLowerCase()).trim();
    if (t.includes(q)) return true;
    
    let tWords = t.split(' ');
    for (let tw of tWords) {
        if (tw === q) return true;
        if (q.length > 3 && tw.length > 3 && Math.abs(tw.length - q.length) <= 1) {
            let diff = 0;
            for (let i=0, j=0; i<q.length && j<tw.length; ) {
                if (q[i] !== tw[j]) { 
                    diff++; 
                    if(q.length > tw.length) i++; 
                    else if(q.length < tw.length) j++; 
                    else {i++; j++;} 
                } else { i++; j++; }
            }
            if (diff <= 1) return true;
        }
    }
    return false;
}

// Bơm AI sai chính tả & Vá lỗi đường dẫn hình ảnh tìm kiếm
function executeSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const query = document.getElementById('search-input').value.trim();
        const dropdown = document.getElementById('search-dropdown');
        if (!query) { 
            dropdown.style.display = 'none'; 
            document.querySelectorAll('.product-card').forEach(c => c.style.display = ''); 
            document.querySelectorAll('.category-wrapper').forEach(c => c.style.display = ''); 
            return; 
        }
        dropdown.style.display = 'flex'; dropdown.innerHTML = '';
        let matchCount = 0; const seen = new Set(); 
        
        let qWords = query.split(' ').filter(w => w.length > 1); 
        
        document.querySelectorAll('.product-card').forEach(card => {
            const pName = card.querySelector('.product-name');
            if (pName) {
                const isMatch = qWords.every(qw => fuzzyMatch(qw, pName.innerText));
                
                if (isMatch) {
                    card.style.display = ''; 
                    const exactName = pName.innerText;
                    if (!seen.has(exactName)) {
                        seen.add(exactName); matchCount++;
                        // BẢN VÁ LỖI: Dùng getAttribute('src') thay vì .src để chạy trên mọi máy
                        const img = card.querySelector('.product-img').getAttribute('src'); 
                        const price = card.querySelector('.product-price').innerText; 
                        dropdown.innerHTML += `
                            <div class="search-dropdown-item" onclick="openProduct('${escapeHTML(exactName)}', '${escapeHTML(price)}', '${safeImageUrl(img)}', ['#000'], ['S', 'M']); document.getElementById('search-dropdown').style.display='none';">
                                <img src="${safeImageUrl(img)}" alt="${escapeHTML(exactName)}" onerror="this.onerror=null; this.src='https://placehold.co/400x533/f8f8f8/333333?text=MH'">
                                <div><div class="title">${escapeHTML(exactName)}</div><div class="price">${escapeHTML(price)}</div></div>
                            </div>`;
                    }
                } else { card.style.display = 'none'; }
            }
        });
        
        document.querySelectorAll('.category-wrapper').forEach(wrapper => { 
            const hasVisible = Array.from(wrapper.querySelectorAll('.product-card')).some(c => c.style.display !== 'none'); 
            wrapper.style.display = hasVisible ? '' : 'none'; 
        });
        if (matchCount === 0) { dropdown.innerHTML = '<div style="padding: 15px; text-align: center; color: var(--text-light);">Không tìm thấy sản phẩm nào</div>'; }
    }, 300);
}

function applyFilters() {
    const priceFilter = document.getElementById('filter-price').value;
    const sortVal = document.getElementById('sort-select').value;
    document.querySelectorAll('.product-grid').forEach(grid => {
        let cards = Array.from(grid.querySelectorAll('.product-card'));
        cards.forEach(card => {
            let price = parseInt(card.getAttribute('data-price'));
            let show = true;
            if(priceFilter === 'under500' && price >= 500000) show = false;
            if(priceFilter === '500to1000' && (price < 500000 || price > 1000000)) show = false;
            if(priceFilter === 'over1000' && price <= 1000000) show = false;
            card.style.display = show ? '' : 'none';
        });
        if(sortVal === 'price-asc') cards.sort((a, b) => parseInt(a.getAttribute('data-price')) - parseInt(b.getAttribute('data-price')));
        else if(sortVal === 'price-desc') cards.sort((a, b) => parseInt(b.getAttribute('data-price')) - parseInt(a.getAttribute('data-price')));
        cards.forEach(card => grid.appendChild(card));
    });
}

function filterByCategory(keyword, title, sectionId = 'all') {
    toggleMobileNavCloseOnly();
    const mainHeader = document.querySelector('.section-title');
    const subHeader = document.querySelector('.section-subtitle');
    if (title) {
        if(mainHeader) mainHeader.innerText = title;
        if(subHeader) subHeader.innerText = 'Kết quả lọc cho: ' + (keyword === 'all' ? 'Tất cả' : keyword.replace(/\|/g, ' / '));
    }
    let totalMatches = 0;
    document.querySelectorAll('.category-wrapper').forEach(w => {
        if (sectionId !== 'all' && w.id !== sectionId) { w.style.display = 'none'; return; }
        let wrapperHasVisibleCard = false;
        const keys = keyword.toLowerCase().split('|');
        w.querySelectorAll('.product-card').forEach(card => {
            const name = card.querySelector('.product-name').innerText.toLowerCase();
            let isMatch = keyword === 'all' || keys.some(k => name.includes(k.trim()));
            card.style.display = isMatch ? '' : 'none';
            if (isMatch) { wrapperHasVisibleCard = true; totalMatches++; }
        });
        w.style.display = wrapperHasVisibleCard ? 'block' : 'none';
    });
    if (totalMatches === 0) showToast("Đang cập nhật thêm sản phẩm cho danh mục này!");
    const danhMuc = document.getElementById('danh-muc-san-pham');
    if(danhMuc) window.scrollTo({ top: danhMuc.offsetTop - 100, behavior: 'smooth' });
}

// =================================================================
// 8. CÁC HÀM UI & MODAL CHUNG
// =================================================================
function toggleNoScroll(isLock) { document.body.classList.toggle('no-scroll', isLock); }
function applyFiltersAndClose() { document.getElementById('filter-modal').style.display = 'none'; toggleNoScroll(false); applyFilters(); showToast("Đã áp dụng bộ lọc thành công!"); }
function openFilterModal() { document.getElementById('filter-modal').style.display = 'flex'; toggleNoScroll(true); }
function closeFilter(e) { if(e.target.id === 'filter-modal') { document.getElementById('filter-modal').style.display = 'none'; toggleNoScroll(false); } }
function toggleMobileNavCloseOnly() {
    const nav = document.getElementById('mobile-nav'); const backdrop = document.getElementById('mobile-nav-backdrop');
    if(nav && nav.classList.contains('open')) { nav.classList.remove('open'); backdrop.classList.remove('open'); toggleNoScroll(false); }
}
function closeAuthPages() { document.getElementById('standard-auth-page').style.display = 'none'; document.getElementById('vip-auth-page').style.display = 'none'; toggleNoScroll(false); }
function openAuthPage() { 
    if(localStorage.getItem('logged_in_user')) { populateProfileData(); document.getElementById('profile-page').style.display = 'block'; } 
    else { document.getElementById('standard-auth-page').style.display = 'block'; }
    toggleNoScroll(true); toggleMobileNavCloseOnly();
}
function processEmailLogin(isSocial = false, socialName = "Quang Anh Trần", socialEmail = "tranquanganh27012007@gmail.com") {
    let emailInput = document.getElementById('std-email-input').value.trim();
    if (isSocial) { localStorage.setItem('logged_in_user', socialName); localStorage.setItem('logged_in_email', socialEmail); } 
    else {
        if(!emailInput || !emailInput.includes('@')) { alert("Vui lòng nhập Email hợp lệ!"); return; }
        localStorage.setItem('logged_in_user', "Khách Hàng Mới"); localStorage.setItem('logged_in_email', emailInput);
    }
    populateProfileData(); document.getElementById('standard-auth-page').style.display = 'none'; document.getElementById('profile-page').style.display = 'block'; showToast("Đăng nhập thành công!");
}
function openVipAuthPage() { 
    if(localStorage.getItem('logged_in_user')) { populateProfileData(); document.getElementById('profile-page').style.display = 'block'; } 
    else { document.getElementById('vip-auth-page').style.display = 'block'; }
    toggleNoScroll(true); toggleMobileNavCloseOnly();
}
function processPhoneLogin(method) {
    let phoneInput = document.getElementById('auth-phone-input').value.trim();
    if (phoneInput.startsWith('0')) phoneInput = phoneInput.substring(1);
    if (!/^[3|5|7|8|9][0-9]{8}$/.test(phoneInput)) { alert("Vui lòng nhập số điện thoại hợp lệ!"); document.getElementById('auth-phone-input').focus(); return; }
    const formattedPhone = "0" + phoneInput; 
    const btn = document.querySelector('.btn-zalo');
    const originalText = btn.innerText;
    btn.innerText = "Đang gửi mã..."; btn.style.opacity = "0.7"; btn.style.pointerEvents = "none";
    setTimeout(() => {
        btn.innerText = originalText; btn.style.opacity = "1"; btn.style.pointerEvents = "auto";
        const otpCode = prompt(`Mã OTP đã được gửi qua ${method.toUpperCase()} đến số ${formattedPhone}.\n(Gợi ý mã test: 123456)`);
        if (otpCode === '123456') {
            localStorage.setItem('logged_in_user', 'Khách hàng VIP'); localStorage.setItem('logged_in_email', formattedPhone); populateProfileData(); 
            document.getElementById('vip-auth-page').style.display = 'none'; document.getElementById('profile-page').style.display = 'block'; 
            if(document.getElementById('auth-phone-input')) document.getElementById('auth-phone-input').value = ''; 
            showToast("Xác thực OTP thành công!");
        } else if (otpCode !== null) { alert("Mã OTP không chính xác. Vui lòng thử lại!"); }
    }, 800);
}
function handleLogout() {
    localStorage.removeItem('logged_in_user'); localStorage.removeItem('logged_in_email'); localStorage.removeItem('user_total_spent'); discountRate = 0; 
    if(document.getElementById('auth-phone-input')) document.getElementById('auth-phone-input').value = ""; 
    if(document.getElementById('std-email-input')) document.getElementById('std-email-input').value = ""; 
    document.getElementById('profile-page').style.display = 'none'; switchProfileTab('profile'); toggleNoScroll(false); showToast("Đã đăng xuất tài khoản.");
}
function switchProfileTab(tabName) {
    document.getElementById('nav-profile').classList.remove('active'); document.getElementById('nav-orders').classList.remove('active'); document.getElementById('nav-' + tabName).classList.add('active');
    document.getElementById('tab-profile').style.display = 'none'; document.getElementById('tab-orders').style.display = 'none'; document.getElementById('tab-' + tabName).style.display = 'block';
}
function closeProfilePage() { document.getElementById('profile-page').style.display = 'none'; toggleNoScroll(false); }
function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar'); const overlay = document.getElementById('sidebar-overlay');
    if (sidebar.classList.contains('open')) { sidebar.classList.remove('open'); overlay.style.display = 'none'; toggleNoScroll(false); } 
    else { const wishlistSidebar = document.getElementById('wishlist-sidebar'); if(wishlistSidebar) wishlistSidebar.classList.remove('open'); sidebar.classList.add('open'); overlay.style.display = 'block'; toggleNoScroll(true); renderCart(); }
}
function toggleWishlist() {
    const sidebar = document.getElementById('wishlist-sidebar'); const overlay = document.getElementById('sidebar-overlay');
    if (sidebar.classList.contains('open')) { sidebar.classList.remove('open'); overlay.style.display = 'none'; toggleNoScroll(false); } 
    else { document.getElementById('cart-sidebar').classList.remove('open'); sidebar.classList.add('open'); overlay.style.display = 'block'; toggleNoScroll(true); renderWishlist(); }
}
function closeSidebars() { document.getElementById('cart-sidebar').classList.remove('open'); document.getElementById('wishlist-sidebar').classList.remove('open'); document.getElementById('sidebar-overlay').style.display = 'none'; toggleNoScroll(false); }
function openCheckout() {
    if(cart.length === 0) { showToast("Giỏ hàng của bạn đang trống!"); return; }
    let total = document.getElementById('cart-total-price').getAttribute('data-val') || 0;
    document.getElementById('checkout-total-price').innerText = formatMoney(total);
    closeSidebars(); document.getElementById('checkout-modal').style.display = 'flex'; toggleNoScroll(true);
}
function closeCheckout(e) { if(e.target.id === 'checkout-modal') { document.getElementById('checkout-modal').style.display = 'none'; toggleNoScroll(false); } }
function completePayment() {
    let name = document.getElementById('chk-name').value.trim(); let phone = document.getElementById('chk-phone').value.trim(); let address = document.getElementById('chk-address').value.trim();
    if(!name || !phone || !address) { alert("Vui lòng điền đầy đủ thông tin nhận hàng!"); return; }
    if (!/^[0-9]{10,11}$/.test(phone)) { alert("Số điện thoại không hợp lệ. Vui lòng nhập lại (10-11 chữ số)."); return; }
    document.getElementById('checkout-modal').style.display = 'none';
    cart = []; localStorage.setItem('mh_cart', JSON.stringify(cart)); updateCartBadge(); renderCart();
    document.getElementById('reward-modal').style.display = 'flex'; toggleNoScroll(true); showToast(`Đã tạo mã đơn hàng thành công cho <b>${escapeHTML(name)}</b>.`);
}
function closeReward(e) { if(e && e.target.id !== 'reward-modal') return; document.getElementById('reward-modal').style.display = 'none'; toggleNoScroll(false); }
function copyRewardCode() { navigator.clipboard.writeText("NEXT15"); closeReward(); showToast("Đã copy mã NEXT15 vào bộ nhớ tạm!"); }

let compareList = [];
function handleCompareSelection(cb, name, price) {
    if(cb.checked) {
        if(compareList.length >= 2) { alert("Chỉ được so sánh tối đa 2 sản phẩm!"); cb.checked = false; return; }
        compareList.push({name, price});
    } else { compareList = compareList.filter(item => item.name !== name); }
}
function openCompareModal() {
    const ctn = document.getElementById('compare-container'); if(!ctn) return;
    if(compareList.length < 2) { alert("Vui lòng tích chọn 2 sản phẩm để so sánh!"); return; }
    ctn.innerHTML = compareList.map(item => `<div style="flex:1; border: 1px solid var(--border-color); padding: 20px; border-radius:8px;"><h3>${escapeHTML(item.name)}</h3><p style="color:var(--gold); font-size:1.2rem;">${escapeHTML(item.price)}</p><hr style="margin:10px 0; border:none; border-top:1px solid #eee;"><p>Chất liệu: Cao cấp</p><p>Size: Tiêu chuẩn</p></div>`).join('');
    document.getElementById('compare-modal').style.display = 'flex'; toggleNoScroll(true);
}
function closeCompare(e) { if(e.target.id === 'compare-modal') { document.getElementById('compare-modal').style.display = 'none'; toggleNoScroll(false); } }

function openProduct(name, price, imgUrl, colors, sizes) {
    document.getElementById('modal-title').innerText = name; 
    document.getElementById('modal-price').innerText = price;
    const imgEl = document.getElementById('modal-image'); 
    imgEl.src = imgUrl; 
    imgEl.alt = name;
    imgEl.onerror = function() { this.onerror=null; this.src='https://placehold.co/400x533/f8f8f8/333333?text=Minh+Hang+Store'; };
    
    document.getElementById('add-to-cart-btn').onclick = () => addToCart(name, price, imgUrl); 
    document.getElementById('add-to-wishlist-btn').onclick = () => addToWishlist(name, price, imgUrl);

    const colorContainer = document.getElementById('modal-colors'); colorContainer.innerHTML = '';
    colors.forEach((color, index) => {
        const cb = document.createElement('div'); cb.className = `color-box ${index === 0 ? 'active' : ''}`; cb.style.backgroundColor = color; cb.setAttribute('role', 'radio'); cb.setAttribute('aria-checked', index === 0 ? 'true' : 'false'); cb.tabIndex = 0;
        cb.onclick = () => { document.querySelectorAll('.color-box').forEach(el => { el.classList.remove('active'); el.setAttribute('aria-checked', 'false'); }); cb.classList.add('active'); cb.setAttribute('aria-checked', 'true'); };
        colorContainer.appendChild(cb);
    });

    const sizeContainer = document.getElementById('modal-sizes'); sizeContainer.innerHTML = '';
    sizes.forEach((size, index) => {
        const sb = document.createElement('div'); sb.className = `size-box ${index === 0 ? 'active' : ''}`; sb.innerText = size; sb.setAttribute('role', 'radio'); sb.setAttribute('aria-checked', index === 0 ? 'true' : 'false'); sb.tabIndex = 0;
        sb.onclick = () => { document.querySelectorAll('.size-box').forEach(el => { el.classList.remove('active'); el.setAttribute('aria-checked', 'false'); }); sb.classList.add('active'); sb.setAttribute('aria-checked', 'true'); };
        sizeContainer.appendChild(sb);
    });
    document.getElementById('details-modal').style.display = 'flex'; 
    toggleNoScroll(true);
    
    addToRecentlyViewed(name, price, imgUrl);
}

function closeProduct(e) { if(e.target.id === 'details-modal') { document.getElementById('details-modal').style.display = 'none'; toggleNoScroll(false); } }

function toggleSearchBox(e) {
    e.stopPropagation(); const sc = document.getElementById('search-box'); sc.classList.toggle('active');
    if(sc.classList.contains('active')) { document.getElementById('search-input').focus(); } 
    else { document.getElementById('search-input').blur(); document.getElementById('search-dropdown').style.display = 'none'; }
}

document.addEventListener('click', function(e) {
    if(!e.target.closest('.search-container')) { 
        const dropdown = document.getElementById('search-dropdown'); const searchContainer = document.getElementById('search-box');
        if(dropdown) dropdown.style.display = 'none'; if(searchContainer && searchContainer.classList.contains('active')) { searchContainer.classList.remove('active'); } 
    }
});

function openSizeGuide() { document.getElementById('size-modal').style.display = 'flex'; toggleNoScroll(true); }
function calculateSize() {
    const h = document.getElementById('height').value; const w = document.getElementById('weight').value; const res = document.getElementById('size-result');
    if(!h || !w) { res.innerText = "Vui lòng nhập đủ thông tin!"; res.style.color="var(--accent-red)"; return; }
    if(h < 160) res.innerText = "Gợi ý của bạn: Size S"; else if(h < 170) res.innerText = "Gợi ý của bạn: Size M"; else if(h < 180) res.innerText = "Gợi ý của bạn: Size L"; else res.innerText = "Gợi ý của bạn: Size XL";
    res.style.color = "var(--gold)";
}
function openTracking() { document.getElementById('tracking-modal').style.display = 'flex'; toggleNoScroll(true); }
function closeTracking(e) { if(e.target.id === 'tracking-modal') { document.getElementById('tracking-modal').style.display = 'none'; toggleNoScroll(false); } }
function trackOrder() { let code = document.getElementById('order-code').value; if(!code) { alert('Vui lòng nhập mã đơn hàng!'); return;} document.getElementById('tracking-result').style.display = 'block'; }
function toggleTheme() {
    const root = document.documentElement; const newTheme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', newTheme); localStorage.setItem('theme', newTheme);
    const themeBtn = document.getElementById('theme-toggle'); if(themeBtn) themeBtn.innerText = newTheme === 'dark' ? '🌙' : '☀️'; 
}
function subscribeNewsletter() {
    const email = document.getElementById('newsletter-email').value;
    if(email && email.includes('@')) { showToast(`Đăng ký thành công! Ưu đãi đã được gửi tới <b>${escapeHTML(email)}</b>`); document.getElementById('newsletter-email').value = ''; } 
    else { alert('Vui lòng nhập một địa chỉ email hợp lệ!'); }
}
function handleFooterLink(featureName) { showToast(`Đang điều hướng đến: <b>${escapeHTML(featureName)}</b>`); }
function toggleMobileNav() {
    const nav = document.getElementById('mobile-nav'); const backdrop = document.getElementById('mobile-nav-backdrop');
    nav.classList.toggle('open'); backdrop.classList.toggle('open'); toggleNoScroll(nav.classList.contains('open')); 
}
function toggleAccordion(element) {
    const allItems = document.querySelectorAll('.accordion-item'); const parentLi = element.parentElement;
    if(parentLi.classList.contains('active')) { parentLi.classList.remove('active'); } 
    else { allItems.forEach(item => item.classList.remove('active')); parentLi.classList.add('active'); }
}

// =================================================================
// 9. EVENT ON LOAD CUỐI CÙNG
// =================================================================
window.addEventListener('DOMContentLoaded', function() {
    renderAllProducts();
    renderMixMatch();
    renderRecentlyViewed();
    
    const loader = document.getElementById('global-loader');
    if(loader) { 
        loader.style.opacity = '0'; 
        loader.style.pointerEvents = 'none'; 
        setTimeout(() => loader.remove(), 500); 
    }
    
    const savedTheme = localStorage.getItem('theme');
    if(savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        const themeBtn = document.getElementById('theme-toggle');
        if(themeBtn) themeBtn.innerText = savedTheme === 'dark' ? '🌙' : '☀️';
    }

    if (localStorage.getItem('logged_in_user')) populateProfileData();
    updateCartBadge();
    
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.addEventListener('click', function() {
            document.querySelectorAll('.bottom-nav-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });
});

// =================================================================
// 10. VOICE SEARCH & PWA (TÍNH NĂNG PROMAX)
// =================================================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('Đã đăng ký PWA thành công! Sẵn sàng làm App.'))
        .catch(err => console.log('PWA đăng ký thất bại: ', err));
    });
}

function startVoiceSearch(targetInputId, triggerFunction) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { 
        showToast("Trình duyệt không hỗ trợ (Hãy dùng Google Chrome/Edge)!"); 
        return; 
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN'; 
    recognition.start();
    showToast("🎙️ Đang nghe... Hãy nói tên sản phẩm bạn muốn!");
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById(targetInputId).value = transcript;
        showToast(`Đã nhận diện: <b>${transcript}</b>`);
        if(typeof triggerFunction === 'function') triggerFunction();
    };
    recognition.onerror = (e) => { showToast("Không nghe rõ, vui lòng thử lại!"); };
}