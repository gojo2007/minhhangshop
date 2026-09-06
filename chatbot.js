"use strict";

// 1. AUTO-INJECT COMPONENT STYLES & TYPING ANIMATION
(function injectChatStyles() {
    if (!document.getElementById('mh-chat-styles')) {
        const style = document.createElement('style');
        style.id = 'mh-chat-styles';
        style.textContent = `
            .chat-typing { display: flex; gap: 4px; padding: 12px 16px; background: #EAEAEA; border-radius: 12px; width: max-content; align-items: center; border-bottom-left-radius: 2px; }
            .chat-typing span { width: 6px; height: 6px; background: #888; border-radius: 50%; animation: typing 1.4s infinite ease-in-out both; }
            .chat-typing span:nth-child(1) { animation-delay: -0.32s; }
            .chat-typing span:nth-child(2) { animation-delay: -0.16s; }
            @keyframes typing { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
            .bot-action-btn { margin-top: 10px; background: var(--text-main, #111); color: #fff; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600; font-family: var(--font-body); transition: 0.2s; }
            .bot-action-btn:hover { background: var(--gold, #D4AF37); color: #111; }
        `;
        document.head.appendChild(style);
    }
})();

// 2. TỪ ĐIỂN ĐỒNG NGHĨA
const synonyms = {
    "quan bo": "quần jean",
    "quan rinh": "quần jean",
    "ao phong": "áo thun",
    "t-shirt": "áo thun",
    "sz": "size",
    "nhieu xien": "giá",
    "gia bn": "giá bao nhiêu",
    "sop": "shop",
    "freeship": "giao hàng",
    "re nhat": "flash sale",
    "giam gia": "flash sale",
    "khuyen mai": "flash sale",
    "con trai": "nam",
    "con gai": "nu",
    "phu nu": "nu",
    "dan ong": "nam",
    "cap doi": "đôi",
    "tui xach": "túi",
    "mat kinh": "kính",
    "giay the thao": "sneaker"
};

// 3. LƯU TRỮ NGỮ CẢNH
let aiContext = {
    lastMentionedProduct: null
};

// 4. CÁC HÀM TIỆN ÍCH & GIAO DIỆN CHAT
function toggleChat() {
    const chatBox = document.getElementById('chat-box');
    chatBox.style.display = chatBox.style.display === 'flex' ? 'none' : 'flex';
}

function removeAccents(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, function(tag) {
        const charsToReplace = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
        return charsToReplace[tag] || tag;
    });
}

function sendChatMessage() {
    const input = document.getElementById('chat-input');
    let msg = input.value.trim();
    if (!msg) return;

    appendChat('user', escapeHTML(msg));
    input.value = '';
    showTypingIndicator();

    setTimeout(() => {
        removeTypingIndicator();
        const reply = analyzeAndRespond(msg);
        appendChat('bot', reply);
    }, 1000 + Math.random() * 500); 
}

function appendChat(sender, text) {
    const chatBody = document.getElementById('chat-body');
    const div = document.createElement('div');
    div.className = 'chat-msg';
    div.style.padding = '10px 15px';
    div.style.borderRadius = '12px';
    div.style.maxWidth = '85%';
    div.style.lineHeight = '1.4';
    div.style.marginBottom = '5px';
    
    if (sender === 'user') {
        div.style.background = 'var(--text-main, #111)';
        div.style.color = '#fff';
        div.style.alignSelf = 'flex-end';
        div.style.borderBottomRightRadius = '2px';
    } else {
        div.style.background = '#EAEAEA';
        div.style.color = '#111';
        div.style.alignSelf = 'flex-start';
        div.style.borderBottomLeftRadius = '2px';
    }
    
    div.innerHTML = text; 
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
}

function showTypingIndicator() {
    const chatBody = document.getElementById('chat-body');
    const div = document.createElement('div');
    div.id = 'active-typing';
    div.className = 'chat-typing';
    div.innerHTML = '<span></span><span></span><span></span>';
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
}

function removeTypingIndicator() {
    const typing = document.getElementById('active-typing');
    if (typing) typing.remove();
}

// THUẬT TOÁN FUZZY MATCH (NỘI BỘ CHO CHATBOT ĐỂ CHỐNG LỖI)
function chatFuzzyMatch(queryWord, targetText) {
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

// 5. BỘ NÃO XỬ LÝ NGÔN NGỮ (NLP ENGINE)
function analyzeAndRespond(userInput) {
    let text = removeAccents(userInput.toLowerCase());
    
    for (let key in synonyms) {
        text = text.replace(new RegExp(key, 'g'), removeAccents(synonyms[key]));
    }

    // A. XỬ LÝ NGỮ CẢNH
    if (aiContext.lastMentionedProduct && (text.includes('mau') || text.includes('size') || text.includes('kich co') || text.includes('mua') || text.includes('dat hang'))) {
        let p = aiContext.lastMentionedProduct;
        let priceStr = typeof formatMoney === 'function' ? formatMoney(p.price) : p.price;
        let actionBtn = `<br><button class="bot-action-btn" onclick="openProduct('${escapeHTML(p.name)}', '${priceStr}', '${p.image || p.img}', ['#000','#fff','#808080'], ['S','M','L','XL'])">🛒 Xem & Mua Ngay</button>`;

        if (text.includes('mau')) return `Các màu sắc của <b>${p.name}</b> được hiển thị trực tiếp trong bảng chi tiết. Bạn bấm nút bên dưới để xem nhé!` + actionBtn;
        if (text.includes('size') || text.includes('kich co')) return `Mẫu <b>${p.name}</b> hiện có các size: <b>${p.sizes ? p.sizes.join(', ') : 'Free Size'}</b> ạ.` + actionBtn;
        if (text.includes('mua') || text.includes('dat hang')) return `Dạ, để đặt mua <b>${p.name}</b>, bạn chỉ cần bấm vào nút bên dưới để chọn size và thêm vào giỏ hàng nhé!` + actionBtn;
    }

    // B. KỊCH BẢN GIẢI QUYẾT TÌNH HUỐNG KHÓ
    if (text.includes('nhan vien') || text.includes('nguoi that') || text.includes('admin') || text.includes('khong hieu') || text.includes('boc phot') || text.includes('that vong')) {
        return `Dạ, AI của tụi mình xin lỗi nếu làm bạn chưa hài lòng. Để giải quyết ngay lập tức, bạn vui lòng nhắn tin trực tiếp với Admin qua <a href="https://zalo.me/03372788528" target="_blank" style="color: var(--gold, #D4AF37); font-weight: bold; text-decoration: underline;">Zalo: 03372788528</a> nhé. Sẽ có nhân viên thật hỗ trợ bạn 24/7 ạ!`;
    }

    if (text.includes('chat lieu') || text.includes('chat vai') || text.includes('xu long') || text.includes('phai mau') || text.includes('ra mau')) {
        return `Các sản phẩm của Minh Hằng Store đều được kiểm định chất lượng kỹ lưỡng. Đối với áo cotton 100%, bạn lộn trái khi giặt để áo bền màu nhất nhé. Nếu nhận hàng thấy vải lỗi xù lông, shop cam kết đổi trả 100% miễn phí ạ!`;
    }

    if (text.includes('bao lau') || text.includes('may ngay') || text.includes('khi nao nhan')) {
        return `Dạ, thời gian giao hàng dự kiến:<br>- Nội thành TP.HCM: Giao hỏa tốc trong 2H hoặc trong ngày.<br>- Các tỉnh khác: Từ 2 - 4 ngày tùy khu vực ạ. (Miễn phí vận chuyển đơn từ 500k).`;
    }

    if (text.includes('mua si') || text.includes('ban buon') || text.includes('dai ly') || text.includes('chiet khau')) {
        return `Minh Hằng Store luôn có chính sách chiết khấu rất tốt (lên tới 40%) cho khách hàng mua sỉ hoặc đại lý. Bạn hãy liên hệ trực tiếp <a href="https://zalo.me/03372788528" target="_blank" style="color: var(--gold, #D4AF37); font-weight: bold; text-decoration: underline;">Zalo: 03372788528</a> để nhận bảng báo giá sỉ nhé!`;
    }

    // C. XỬ LÝ Ý ĐỊNH CHUNG
    if (text === 'chao' || text.includes('chao ban') || text.includes('hello')) return "Chào bạn! Mình là trợ lý AI của Minh Hằng Store. Hiện kho hàng đang có nhiều sản phẩm Hot. Bạn cần tìm đồ nam, nữ, phụ kiện hay muốn lọc đồ theo giá tiền dưới 500k?";
    if (text.includes('ship') || text.includes('giao hang')) return "Dạ Minh Hằng Store <b>freeship toàn quốc</b> cho đơn từ 500.000đ. Giao hỏa tốc nội thành TP.HCM trong 2H ạ!";
    if (text.includes('doi tra') || text.includes('bao hanh')) return "Bạn được đổi trả miễn phí trong vòng 7 ngày nếu không vừa size hoặc lỗi NSX nhé!";
    if (text.includes('dia chi') || text.includes('cua hang o dau') || text.includes('chi nhanh')) return "Dạ Minh Hằng Store hiện có chi nhánh trung tâm tại TP.HCM. Bạn có thể bấm vào phần 'CỬA HÀNG' ở menu phía dưới để xem địa chỉ cụ thể nhé!";

    // D. XỬ LÝ TÌM KIẾM SẢN PHẨM & LỌC GIÁ
    let maxPrice = Infinity;
    let priceMatch = text.match(/duoi\s+(\d+)\s*(k|nghin|trieu)/);
    if (priceMatch) {
        let number = parseInt(priceMatch[1]);
        if (priceMatch[2] === 'k' || priceMatch[2] === 'nghin') maxPrice = number * 1000;
        if (priceMatch[2] === 'trieu') maxPrice = number * 1000000;
        text = text.replace(priceMatch[0], '').trim();
    }

    const stopWords = ['tim', 'cho', 'hoi', 'muon', 'co', 'ban', 'khong'];
    let keywords = text.split(' ').filter(w => w.length > 1 && !stopWords.includes(w)); 
    
    let matchedProducts = [];

    if(typeof window.products !== 'undefined' && keywords.length > 0) {
        window.products.forEach(p => {
            let matchScore = 0;
            
            // TÍCH HỢP AI TÌM KIẾM SAI CHÍNH TẢ
            keywords.forEach(k => { 
                if (chatFuzzyMatch(k, p.name)) matchScore += 2; 
            });
            
            if (keywords.some(k => removeAccents(p.category.join(' ')).includes(k))) matchScore += 1;

            if (matchScore > 0 && p.price <= maxPrice) {
                matchedProducts.push({ product: p, score: matchScore });
            }
        });
    }

    if (matchedProducts.length > 0) {
        matchedProducts.sort((a, b) => b.score - a.score); 
        
        if (maxPrice !== Infinity && keywords.length === 0) {
            let resHTML = `Mình tìm thấy các sản phẩm dưới ${typeof formatMoney === 'function' ? formatMoney(maxPrice) : maxPrice} cho bạn nè:<br><ul style="padding-left:15px; margin-top:5px; margin-bottom: 0;">`;
            let limit = Math.min(matchedProducts.length, 3);
            for(let i=0; i<limit; i++) {
                let p = matchedProducts[i].product;
                resHTML += `<li style="margin-bottom: 4px;"><b>${p.name}</b> - ${typeof formatMoney === 'function' ? formatMoney(p.price) : p.price}</li>`;
            }
            resHTML += `</ul>`;
            return resHTML;
        }

        let bestMatch = matchedProducts[0].product;
        aiContext.lastMentionedProduct = bestMatch; 

        let productImage = bestMatch.image || bestMatch.img; 
        let priceStr = typeof formatMoney === 'function' ? formatMoney(bestMatch.price) : bestMatch.price;
        
        let imgTag = productImage ? `<img src="${productImage}" style="width:100%; max-width:250px; border-radius:8px; margin-top:10px; margin-bottom:5px; display:block; object-fit:cover; aspect-ratio:3/4; border: 1px solid #ccc;" alt="${bestMatch.name}" onerror="this.style.display='none'">` : '';
        let actionBtn = `<button class="bot-action-btn" onclick="openProduct('${escapeHTML(bestMatch.name)}', '${priceStr}', '${productImage}', ['#000','#fff','#808080'], ['S','M','L','XL'])">🔍 Xem & Mua Ngay</button>`;

        if (text.includes('gia') || text.includes('bao nhieu') || text.includes('tien')) {
            return `Mẫu <b>${bestMatch.name}</b> hiện có giá là <b style="color: var(--gold, #D4AF37);">${priceStr}</b>. ${bestMatch.oldPrice ? `(Giá gốc <del>${bestMatch.oldPrice}</del>)` : ''}. Bạn muốn xem chi tiết và đặt hàng không?<br>` + imgTag + actionBtn;
        }
        if (text.includes('size') || text.includes('kich co')) {
            let sizes = bestMatch.sizes ? bestMatch.sizes.join(', ') : "Freesize";
            return `Mẫu <b>${bestMatch.name}</b> đang có các size: <b>${sizes}</b>. Bạn cao nặng bao nhiêu để mình tư vấn? Hoặc bấm vào dưới đây để xem thông số cụ thể nhé.<br>` + imgTag + actionBtn;
        }
        
        return `Dạ đây, có phải bạn đang tìm <b>${bestMatch.name}</b> không? <br>Sản phẩm này có giá <b style="color: var(--gold, #D4AF37);">${priceStr}</b>.<br>` + imgTag + actionBtn;
    }

    if (maxPrice !== Infinity) {
         return `Tiếc quá, hiện kho hàng không có sản phẩm nào khớp yêu cầu mà giá dưới ${typeof formatMoney === 'function' ? formatMoney(maxPrice) : maxPrice}. Bạn có thể nới lỏng ngân sách hoặc đổi từ khóa (VD: "áo thun", "quần short") được không?`;
    }

    // E. FALLBACK KHẨN CẤP
    return `Dạ, kiến thức của AI mình về câu hỏi này còn hạn chế nên chưa thể trả lời chính xác cho bạn được. 😅
    <br><br>
    Để được hỗ trợ tốt nhất và giải đáp mọi thắc mắc, bạn hãy nhắn tin trực tiếp với chủ shop qua 
    <a href="https://zalo.me/03372788528" target="_blank" style="color: var(--gold, #D4AF37); font-weight: bold; text-decoration: underline;">Zalo CSKH: 03372788528</a> nhé! Sẽ có nhân viên thật hỗ trợ bạn ngay lập tức ạ.`;
}
/* =========================================================
   TÍNH NĂNG NÂNG CẤP: EMOJI PICKER & TRACK ORDER (PROMAX)
========================================================= */

// --- 1. XỬ LÝ BẢNG EMOJI ---
const aiEmojis = ['😀','😂','😍','🥰','😎','😋','🤔','🙄','😪','😴','😷','🤧','🤢','🤮','🥵','🤠','🥳','🤫','🤥','🤡','🤓','😈','👻','💀','👽','🤖','💩','😺','😸','😹'];

function initEmojiPicker() {
    const popup = document.getElementById('emoji-picker-popup');
    if(!popup) return;
    // Tự động sinh emoji từ mảng dữ liệu
    popup.innerHTML = aiEmojis.map(e => `<div class="emoji-item" onclick="insertEmoji('${e}')">${e}</div>`).join('');
}

function toggleEmojiPicker(e) {
    e.stopPropagation(); // Ngăn sự kiện click lan ra ngoài
    const popup = document.getElementById('emoji-picker-popup');
    if(popup) {
        popup.style.display = (popup.style.display === 'none' || popup.style.display === '') ? 'grid' : 'none';
    }
}

function insertEmoji(emoji) {
    const input = document.getElementById('chat-input');
    if(input) {
        input.value += emoji;
        input.focus(); // Đưa con trỏ chuột về lại thanh chat
    }
}

// Lắng nghe sự kiện click toàn trang để đóng Emoji Box khi click ra ngoài
document.addEventListener('click', function(e) {
    const popup = document.getElementById('emoji-picker-popup');
    if (popup && popup.style.display === 'grid' && !e.target.closest('.chatbot-input-area')) {
        popup.style.display = 'none';
    }
});

// Chạy hàm khởi tạo Emoji ngay khi trang vừa tải xong
window.addEventListener('DOMContentLoaded', initEmojiPicker);


// --- 2. XỬ LÝ POPUP TRACK ORDER TRONG CHATBOT ---
function toggleChatTrack() {
    const modal = document.getElementById('chat-track-modal');
    if(modal) {
        if(modal.style.display === 'none' || modal.style.display === '') {
            modal.style.display = 'flex';
            // Đóng bảng emoji nếu nó vô tình đang mở
            const emojiPopup = document.getElementById('emoji-picker-popup');
            if(emojiPopup) emojiPopup.style.display = 'none';
        } else {
            modal.style.display = 'none';
        }
    }
}

function submitChatTrack() {
    const codeInput = document.getElementById('track-chat-code');
    const contactInput = document.getElementById('track-chat-contact');
    
    const code = codeInput ? codeInput.value.trim() : '';
    
    // Validate nhanh xem khách có nhập mã chưa
    if(!code) {
        if(typeof showToast === 'function') showToast("Vui lòng nhập mã đơn hàng (Order number)!");
        else alert("Vui lòng nhập mã đơn hàng!");
        return;
    }

    toggleChatTrack(); // Đóng popup
    if(typeof showToast === 'function') showToast(`Đang kết nối hệ thống tra cứu đơn: <b>${code}</b>...`);
    
    // Giả lập xử lý dữ liệu và AI phản hồi (Tạo cảm giác chân thực)
    setTimeout(() => {
        const chatBody = document.getElementById('chat-body');
        if(chatBody) { 
            const time = new Date().toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit', second:'2-digit'});
            
            chatBody.innerHTML += `
                <div style="text-align: center; font-size: 0.75rem; color: var(--text-light); margin-bottom: -5px; margin-top: 15px;">Stylist AI Tư Vấn - ${time}</div>
                <div class="chat-msg bot-msg" style="padding: 12px 16px; border-radius: 16px; max-width: 85%; line-height: 1.5; background: #EAEAEA; color: #111; align-self: flex-start; border-bottom-left-radius: 4px;">
                    Đơn hàng <b>${code}</b> của bạn hiện đang ở trạng thái: <b>Đang đóng gói và chờ giao cho đơn vị vận chuyển</b>. Dự kiến sẽ giao đến trong 1-2 ngày tới nhé! Đội ngũ Minh Hằng Store cảm ơn bạn!
                </div>
            `;
            // Tự động cuộn chuột xuống tin nhắn mới nhất
            chatBody.scrollTop = chatBody.scrollHeight; 
            
            // Xóa nội dung trong ô input sau khi gửi
            if(codeInput) codeInput.value = '';
            if(contactInput) contactInput.value = '';
        }
    }, 1200); // Đợi 1.2s rồi AI mới trả lời
}