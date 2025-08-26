require('../settings');
const axios = require("axios");

// Fungsi untuk mendapatkan daftar subdomain
async function getDnsRecords() {
	try {
		const response = await axios.get(
			`https://api.cloudflare.com/client/v4/zones/${global.CF_ZONE_ID}/dns_records`,
			{
				headers: {
					"Authorization": `Bearer ${global.CF_API_KEY}`,
					"Content-Type": "application/json"
				}
			}
		);

		if (!response.data.success) {
			return `❌ Gagal mengambil data: ${JSON.stringify(response.data.errors, null, 2)}`;
		}

		return response.data.result.map(record => ({
			id: record.id,
			type: record.type,
			name: record.name,
			content: record.content
		}));
	} catch (error) {
		return `❌ Error: ${error.message}`;
	}
}

// Fungsi untuk membuat subdomain
async function createDnsRecord(type, name, content, ttl = 1, proxied = false) {
	try {
		const response = await axios.post(
			`https://api.cloudflare.com/client/v4/zones/${global.CF_ZONE_ID}/dns_records`,
			{
				type,
				name,
				content,
				ttl,
				proxied
			},
			{
				headers: {
					"Authorization": `Bearer ${global.CF_API_KEY}`,
					"Content-Type": "application/json"
				}
			}
		);

		if (response.data.success) {
			return `✅ Subdomain *${name}* berhasil dibuat dengan tipe *${type}* menuju *${content}*.`;
		} else {
			console.error("Cloudflare API Error:", response.data.errors); // Cetak detail error
			return `❌ Gagal membuat subdomain. Error: ${JSON.stringify(response.data.errors, null, 2)}`;
		}
	} catch (error) {
		console.error("Axios Error:", error.response ? error.response.data : error.message); // Cetak detail error dari Axios
		return `❌ Error: ${error.message}`;
	}
}

// Fungsi untuk menghapus subdomain berdasarkan ID
async function deleteDnsRecord(recordId) {
	try {
		const response = await axios.delete(
			`https://api.cloudflare.com/client/v4/zones/${global.CF_ZONE_ID}/dns_records/${recordId}`,
			{
				headers: {
					"Authorization": `Bearer ${global.CF_API_KEY}`,
					"Content-Type": "application/json"
				}
			}
		);

		if (response.data.success) {
			return "✅ Subdomain berhasil dihapus.";
		} else {
			return `❌ Gagal menghapus subdomain. Error: ${JSON.stringify(response.data.errors, null, 2)}`;
		}
	} catch (error) {
		return `❌ Error: ${error.message}`;
	}
}

module.exports = {
	getDnsRecords,
	createDnsRecord,
	deleteDnsRecord
};