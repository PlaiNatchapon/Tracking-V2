const express = require('express');
const XLSX = require('xlsx');

module.exports = function(pool) {    
    const router = express.Router();

    console.log("📊 โหลด Report Routes สำเร็จ!");

    router.get('/export-inventory', async (req, res) => {
        try {
            const query = `
                SELECT id, product_code, product_name, category_brand, details, cost_price, selling_price, stock_remaining 
                FROM product_inventory 
                ORDER BY id ASC
            `;
            const result = await pool.query(query);
            const products = result.rows;

            const dataForExcel = products.map(item => ({
                "ID": item.id,
                "รหัสสินค้า": item.product_code,
                "ชื่อสินค้า": item.product_name,
                "หมวดหมู่/แบรนด์": item.category_brand || "-",
                "รายละเอียด": item.details || "-",
                "ราคาทุน": item.cost_price,
                "ราคาขาย": item.selling_price,
                "สินค้าคงเหลือ": item.stock_remaining
            }));

            const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Product Inventory");

            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

            res.setHeader('Content-Disposition', 'attachment; filename="product_inventory_report.xlsx"');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.send(excelBuffer);

        } catch (err) {
            console.error("Error exporting inventory Excel:", err);
            res.status(500).json({ success: false, message: "ไม่สามารถออกรายงานได้ในขณะนี้" });
        }
    });

    return router; // 👈 คืนค่า router กลับไป
};