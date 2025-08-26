let axios = require('axios');
let BodyForm = require('form-data');
let fs = require('fs');
const fetch = require('node-fetch');
let cheerio = require('cheerio');
const { fromBuffer } = require('file-type');

async function CatBox(filePath) {
	try {
		const fileStream = fs.createReadStream(filePath);
		const formData = new BodyForm();
		formData.append('fileToUpload', fileStream);
		formData.append('reqtype', 'fileupload');
		formData.append('userhash', '');
		const response = await axios.post('https://catbox.moe/user/api.php', formData, {
			headers: {
				...formData.getHeaders(),
			},
		});
		return response.data;
	} catch (error) {
		console.error("Error at Catbox uploader:", error);
		return "Terjadi kesalahan saat upload ke Catbox.";
	}
};

async function pomfCDN(path) {
	try {
		const fileStream = fs.createReadStream(path);
		const formData = new BodyForm();
		formData.append('files[]', fileStream);
		const response = await axios.post('https://pomf.lain.la/upload.php', formData, {
			headers: {
				...formData.getHeaders(),
			},
		});
		return response.data.files[0].url;
	} catch (error) {
		console.log("Error at pomf uploader in lib/uploader.js:", error);
		return "Terjadi Kesalahan";
	}
};

async function fileIO(filePath) {
	try {
		const fileStream = fs.createReadStream(filePath);
		const formData = new BodyForm();
		formData.append('file', fileStream);
		const response = await axios.post('https://file.io/?expires=1d', formData, {
			headers: formData.getHeaders(),
		});
		if (response.data && response.data.success) {
			return response.data.link;
		} else {
			throw new Error('File upload failed.');
		}
	} catch (error) {
		console.error('Error at File.io uploader:', error);
		return 'Terjadi kesalahan saat upload ke file.io.';
	}
};

async function uploadFile(filePath) {
	try {
		const buffer = fs.readFileSync(filePath);
		let { ext } = await fromBuffer(buffer);
		let bodyForm = new BodyForm();
		bodyForm.append("file", buffer, "file." + ext);
		let res = await fetch("https://8030.us.kg/api/upload.php", {
			method: "POST",
			body: bodyForm,
		});
		let data = await res.json();
		console.log('Respons dari server:', data);
		if (data.result && data.result.url) {
			return data.result.url;
		} else {
			return '';
		}
	} catch (error) {
		console.error('Terjadi kesalahan:', error);
		return '';
	}
};

module.exports = { CatBox, pomfCDN, fileIO, uploadFile };
