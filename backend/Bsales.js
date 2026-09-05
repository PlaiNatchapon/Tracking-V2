// ไฟล์ Bsales.js
const express = require('express');
const router = express.Router();

// ห่อด้วยฟังก์ชันที่รับ pool เข้ามา (เพื่อให้เหมือนกับ Blogin.js ของคุณ)
module.exports = function(pool) {

    // เนื่องจากใน server.js เรากำหนด /api/products ไปแล้ว 
    // ตรงนี้เราจึงใส่แค่ /search เส้นทางเต็มจะกลายเป็น /api/products/search อัตโนมัติ
    router.get('/search', async (req, res) => {
        try {
            const keyword = req.query.q || '';
            
            const query = `
                SELECT product_code, product_name, category_brand, details, cost_price, selling_price, stock_remaining 
                FROM product_inventory 
                WHERE product_code ILIKE $1 OR product_name ILIKE $2
                LIMIT 10;
            `;
            
            const values = [`%${keyword}%`, `%${keyword}%`];
            const result = await pool.query(query, values);

            res.json(result.rows);
        } catch (err) {
            console.error("Database search error:", err.message);
            res.status(500).send('Server Error');
        }
    });

    return router;
};