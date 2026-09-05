const DB_VERSION = 'mh_store_products_v12'; 

// 1. DỮ LIỆU SẢN PHẨM GỐC
let products = [
    { id: 'PROD-001', name: 'Đầm Dạ Hội Lụa Satin Cắt Lưng', price: 1890000, oldPrice: '2.500.000đ', image: './images/dam-da-hoi-lua-satin.jpg', category: ['nu'], badge: 'Limited', badgeColor: 'var(--gold)', colors: ['#800020', '#000'], sizes: ['S', 'M', 'L'], rating: 4.9, reviews: 124 },
    { id: 'PROD-002', name: 'Bộ Suit Nam Kẻ Sọc Cổ Điển', price: 3500000, image: './images/bo-suit-nam-ke-soc.jpg', category: ['nam'], badge: 'New Arrival', colors: ['#000080', '#2F4F4F'], sizes: ['M', 'L', 'XL'], rating: 4.8, reviews: 89 },
    { id: 'PROD-003', name: 'Đồng Hồ Cơ Nam Automatic Lộ Máy', price: 4500000, oldPrice: '5.200.000đ', image: './images/dong-ho-co-nam.jpg', category: ['phu-kien'], badge: 'High-end', badgeColor: 'var(--accent-red)', colors: ['#000', '#C0C0C0'], sizes: ['Free Size'], rating: 5.0, reviews: 342 }
];

// 2. DỮ LIỆU ĐỘNG: GÓC MIX & MATCH
const mixMatchData = [
    {
        id: "MM-001",
        title: "Thanh lịch chốn công sở",
        description: "Người mẫu mặc nguyên set: Áo Blazer Linen (1.250.000đ) + Quần Tây (750.000đ) + Giày Loafer (1.200.000đ)",
        totalPrice: "3.200.000đ",
        comboName: "Full Set Công Sở",
        image: "./images/mix-match-cong-so.jpg" 
    }
];

// 3. LINK ẢNH TĨNH ĐƯỢC CHUẨN HÓA THEO TÊN (SEO FRIENDLY)
const exactCatalog = {
    'nam': [
        { type: "Áo Thun Nam", image: "./images/ao-thun-nam.jpg" },
        { type: "Áo Sơ Mi Nam", image: "./images/ao-so-mi-nam.jpg" },
        { type: "Áo Khoác Bomber", image: "./images/ao-khoac-bomber.jpg" },
        { type: "Quần Jean Nam", image: "./images/quan-jean-nam.jpg" },
        { type: "Quần Tây Nam", image: "./images/quan-tay-nam.jpg" },
        { type: "Áo Polo Nam", image: "./images/ao-polo-nam.jpg" }, 
        { type: "Áo Len Nam", image: "./images/ao-len-nam.jpg" }
    ],
    'nu': [
        { type: "Đầm Dạ Hội", image: "./images/dam-da-hoi.jpg" },
        { type: "Chân Váy Jean", image: "./images/chan-vay-jean.jpg" },
        { type: "Áo Thun Nữ Basic", image: "./images/ao-thun-nu-basic.jpg" },
        { type: "Áo Khoác Tweed", image: "./images/ao-khoac-tweed.jpg" },
        { type: "Áo Sơ Mi Lụa", image: "./images/ao-so-mi-lua.jpg" },
        { type: "Jumpsuit Nữ", image: "./images/jumpsuit-nu.jpg" },
        { type: "Đầm Trễ Vai", image: "./images/dam-tre-vai.jpg" }
    ],
    'unisex': [
        { type: "Áo Hoodie Trơn", image: "./images/ao-hoodie-tron.jpg" },
        { type: "Quần Jogger", image: "./images/quan-jogger.jpg" },
        { type: "Áo Khoác Denim", image: "./images/ao-khoac-denim.jpg" },
        { type: "Áo Sweater", image: "./images/ao-sweater.jpg" },
        { type: "Áo Thun Oversize", image: "./images/ao-thun-oversize.jpg" },
        { type: "Quần Short Kaki", image: "./images/quan-short-kaki.jpg" }
    ],
    'phu-kien': [
        { type: "Đồng Hồ Nữ Dây Da", image: "./images/dong-ho-nu-day-da.jpg" },
        { type: "Đồng Hồ Nam Thép Không Gỉ", image: "./images/dong-ho-nam-thep.jpg" },
        { type: "Đồng Hồ Thời Trang Minimalist", image: "./images/dong-ho-minimalist.jpg" },
        { type: "Giày Bóng Đá Tốc Độ", image: "./images/giay-bong-da-toc-do.jpg" }, 
        { type: "Giày Sneaker Năng Động", image: "./images/giay-sneaker.jpg" },
        { type: "Túi Xách Da Đeo Chéo", image: "./images/tui-xach-da.jpg" },
        { type: "Kính Mát Chống UV", image: "./images/kinh-mat-chong-uv.jpg" }
    ]
};

const adjectives = ["Cao Cấp", "Basic", "Hàn Quốc", "Thể Thao", "Streetwear", "Thanh Lịch", "Cổ Điển"];

const categoryTargetCounts = {
    'nam': 7, 
    'nu': 7, 
    'unisex': 6, 
    'phu-kien': 7
};

function buildPerfectProducts() {
    const cachedProducts = localStorage.getItem(DB_VERSION);
    if (cachedProducts) {
        window.products = JSON.parse(cachedProducts);
        return;
    }

    let tempGenerated = [];
    let globalIdCounter = 101; 
    
    for (let cat in categoryTargetCounts) {
        let items = exactCatalog[cat];
        let targetCount = categoryTargetCounts[cat];
        
        for(let i = 0; i < targetCount; i++) {
            let itemTemplate = items[i % items.length];
            let adj = adjectives[Math.floor(Math.random() * adjectives.length)];
            let exactName = `${itemTemplate.type} ${adj} MH-${globalIdCounter}`;
            
            let basePriceRaw = (Math.floor(Math.random() * 225) + 25) * 10000;
            let price = Math.round(basePriceRaw / 10000) * 10000; 

            let isFlashSale = Math.random() > 0.85; 
            let staticImageURL = itemTemplate.image;
            
            let productCategories = [cat];
            if (isFlashSale) productCategories.push('flash-sale');

            let pRating = (Math.random() * (5.0 - 4.0) + 4.0).toFixed(1);
            let pReviews = Math.floor(Math.random() * 500) + 10;

            let p = {
                id: `PROD-${globalIdCounter}`,
                name: exactName,
                price: price,
                image: staticImageURL, 
                category: productCategories, 
                colors: ['#000000', '#FFFFFF', '#808080'].slice(0, Math.floor(Math.random() * 3) + 1),
                sizes: (cat === 'phu-kien') ? ['Free Size'] : ['S', 'M', 'L', 'XL'],
                rating: pRating,
                reviews: pReviews
            };

            if (isFlashSale) {
                let oldPriceRaw = price * (1 + (Math.random() * 0.4 + 0.3));
                let oldPriceRounded = Math.ceil(oldPriceRaw / 10000) * 10000;
                
                p.oldPrice = oldPriceRounded.toLocaleString('vi-VN') + 'đ';
                p.badge = 'FLASH SALE';
                p.badgeColor = 'var(--accent-red)';
                p.sold = Math.floor(Math.random() * 80) + 20;
            } else if (pRating >= 4.7 && pReviews > 200) {
                p.badge = 'Best Seller';
                p.badgeColor = 'var(--gold)';
            } else if (Math.random() > 0.7) {
                p.badge = 'New Arrival';
                p.badgeColor = '#0b5b9e'; 
            }
            
            tempGenerated.push(p);
            globalIdCounter++; 
        }
    }
    
    tempGenerated.sort(() => Math.random() - 0.5);
    let finalDatabase = products.concat(tempGenerated);
    
    localStorage.setItem(DB_VERSION, JSON.stringify(finalDatabase));
    window.products = finalDatabase;
}

buildPerfectProducts();