process.on("uncaughtException", console.error);
require('./settings');
const { default: 
	makeWASocket, 
	makeCacheableSignalKeyStore, 
	useMultiFileAuthState, 
	DisconnectReason, 
	fetchLatestBaileysVersion, 
	generateForwardMessageContent, 
	generateWAMessage, 
	prepareWAMessageMedia, 
	generateWAMessageFromContent, 
	generateMessageID, 
	downloadContentFromMessage, 
	makeInMemoryStore, 
	jidDecode, 
	proto, 
	delay 
} = require("lily-baileys");
const { color } = require('./lib/color');
const readline = require("readline");
const NodeCache = require("node-cache");
const msgRetryCounterCache = new NodeCache();
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const { Low, JSONFile } = require('./lib/lowdb');
const yargs = require('yargs/yargs');
const fs = require('fs');
const chalk = require('chalk');
const FileType = require('file-type');
const path = require('path');
const axios = require('axios');
const _ = require('lodash');
const util = require('util');
const moment = require('moment-timezone');
const PhoneNumber = require('awesome-phonenumber');

const { 
	imageToWebp, 
	videoToWebp, 
	writeExifImg, 
	writeExifVid 
} = require('./lib/exif');

const { 
	smsg, 
	await, 
	clockString, 
	enumGetKey, 
	fetchBuffer, 
	fetchJson, 
	format, 
	formatDate, 
	formatp, 
	generateProfilePicture, 
	getBuffer, 
	getGroupAdmins, 
	getRandom, 
	getSizeMedia, 
	isUrl, 
	json, 
	logic, 
	msToDate, 
	parseMention, 
	sizeLimit, 
	runtime, 
	sleep, 
	sort, 
	toNumber 
} = require('./lib/myfunc');

const store = makeInMemoryStore({
	logger: pino().child({
		level: 'silent',
		stream: 'store'
	})
});
global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse());

global.db = new Low(new JSONFile(`src/${tempatDB}`));

global.DATABASE = global.db;

global.muatDatabase = async function muatDatabase() {
	if (global.db.READ) {
		return new Promise((resolve) => {
			const interval = setInterval(() => {
				if (!global.db.READ) {
					clearInterval(interval);
					resolve(global.db.data == null ? global.muatDatabase() : global.db.data);
				}
			}, 1000);
		});
	}

	if (global.db.data !== null) return;

	global.db.READ = true;

	try {
		await global.db.read();
		global.db.data = {
			users: {},
			database: {},
			chats: {},
			game: {},
			settings: {},
			message: {},
			...(global.db.data || {})
		};
		global.db.chain = _.chain(global.db.data);
	} catch (err) {
		console.error('⚠️ Gagal membaca database:', err);
	} finally {
		global.db.READ = false;
	}
};

muatDatabase();

if (global.db) {
	setInterval(async () => {
		if (global.db.data && !global.db.READ) {
			try {
				await global.db.write();
			} catch (err) {
				console.error('⚠️ Gagal menyimpan database:', err);
			}
		}
	}, 30 * 1000);
}

const phoneNumber = ownerNumber;
const owner = JSON.parse(fs.readFileSync('./src/data/role/owner.json'));
const contacts = JSON.parse(fs.readFileSync('./src/data/role/contacts.json'));
const usePairingCode = true;
const session = `./src/jadibot/${m.sender.split("@")[0]}`;

const question = (text) => {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	return new Promise((resolve) => {
		rl.question(text, resolve)
	});
};

const client = {}
const jadibot = async (sock, m, from) => {
	const { state, saveCreds } = await useMultiFileAuthState(session);
	client[from] = makeWASocket({
		printQRInTerminal: !usePairingCode,
		syncFullHistory: true,
		markOnlineOnConnect: true,
		connectTimeoutMs: 60000, 
		defaultQueryTimeoutMs: 0,
		keepAliveIntervalMs: 10000,
		generateHighQualityLinkPreview: true, 
		patchMessageBeforeSending: (message) => {
			const requiresPatch = !!(
				message.buttonsMessage 
				|| message.templateMessage
				|| message.listMessage
			);
			if (requiresPatch) {
				message = {
					viewOnceMessage: {
						message: {
							messageContextInfo: {
								deviceListMetadataVersion: 2,
								deviceListMetadata: {},
							},
							...message,
						},
					},
				};
			}

			return message;
		},
		version: (await (await fetch('https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/src/Defaults/baileys-version.json')).json()).version,
		browser: ["Windows", "Chrome", "20.0.04"],
		logger: pino({ level: 'fatal' }),
		auth: { 
			creds: state.creds, 
			keys: makeCacheableSignalKeyStore(state.keys, pino().child({ 
				level: 'silent', 
				stream: 'store' 
			})), 
		}
	});

	if (usePairingCode && !client[from].user && !client[from].authState.creds.registered) {
		setTimeout(async () => {
			code = await client[from].requestPairingCode(m.sender.split("@")[0]);
			code = code?.match(/.{1,4}/g)?.join("-") || code;

			let text = `🗣️ *Kode Pairing untuk @${m.sender.split("@")[0]}*.\n\n`;
			text += `🕊️ *Kode:* ${code}\n\n`;
			text += `📖 *Cara Menggunakan:*\n`;
			text += `1. Klik *titik tiga* di pojok kanan atas.\n`;
			text += `2. Pilih menu *Perangkat Tertaut*.\n`;
			text += `3. Ketuk *Tautkan dengan nomor telepon saja*.\n\n`;
			text += `⏳ *Ingat ya, kode ini hanya berlaku selama 20 detik!*\n\n`;
			text += `❌ *Kalau mau berhenti, cukup ketik .stopjadibot.*\n`;

			let button = [{
				"name": "cta_copy",
				"buttonParamsJson": `{
					"display_text": "${code}",
					"id": "${code}",
					"copy_code": "${code}"
				}`
			}]
			sock.sendButtonText(from, button, text.trim(), footer, m);
		}, 20000);
	};

	client[from].ev.on("connection.update", async (update) => {
		const { connection, lastDisconnect } = update;

		if (connection === "close") {
			let reason = new Boom(lastDisconnect?.error)?.output.statusCode;

			if (reason === DisconnectReason.badSession) {
				sock.sendMessage(m.chat, { 
					text: "⚠️ *Ada masalah dengan sesi!* Coba hapus sesi dan mulai lagi ya. 😊" 
				});
				stopjadibot(sock, m, from);
			} else if (reason === DisconnectReason.connectionClosed) {
				sock.sendMessage(m.chat, { 
					text: "🔄 *Koneksi terputus!* Lagi coba menyambungkan ulang... Tunggu sebentar ya. 😌" 
				});
				jadibot(sock, m, from);
			} else if (reason === DisconnectReason.connectionLost) {
				sock.sendMessage(m.chat, { 
					text: "🌐 *Koneksi hilang!* Aku lagi nyoba sambungin ulang ke server... 🙏" 
				});
				jadibot(sock, m, from);
			} else if (reason === DisconnectReason.connectionReplaced) {
				sock.sendMessage(m.chat, { 
					text: "⚠️ *Sesi bot ini terhubung ke server lain!* Coba restart bot ya supaya bisa nyambung lagi." 
				});
				stopjadibot(sock, m, from);
			} else if (reason === DisconnectReason.loggedOut) {
				sock.sendMessage(m.chat, { 
					text: "🚪 *Perangkat kamu keluar!* Hapus sesi dan pindai ulang QR untuk menghubungkan lagi ya. 😉" 
				});
				stopjadibot(sock, m, from);
			} else if (reason === DisconnectReason.restartRequired) {
				sock.sendMessage(m.chat, { 
					text: "♻️ *Koneksi butuh restart!* Aku lagi mulai ulang koneksi sekarang. Tunggu sebentar ya! 😊" 
				});
				jadibot(sock, m, from);
			} else if (reason === DisconnectReason.timedOut) {
				sock.sendMessage(m.chat, { 
					text: "⏱️ *Waktu koneksi habis!* Lagi mencoba menyambungkan ulang. Harap sabar ya! 🙏" 
				});
				jadibot(sock, m, from);
			} else {
				console.log(`❓ Unknown DisconnectReason: ${reason} | ${connection}`);
				jadibot(sock, m, from);
			}
		} else if (connection === "open") {
			sock.sendMessage(m.chat, { 
				text: "🎉 *Yay! Bot berhasil terhubung kembali!* Sekarang aku siap membantu kakak. 😉" 
			});
			console.log('Connected...', update);
		}
	});

	client[from].ev.on('creds.update', saveCreds)
	client[from].ev.on("messages.upsert",() => { })

	client[from].ev.on('group-participants.update', async (anu) => {
		if (welcome) {
			try {
				let metadata = await sock.groupMetadata(anu.id)
				let participants = anu.participants
				for (let num of participants) {
					let ppuser, ppgroup
					try {
						ppuser = await sock.profilePictureUrl(num, 'image')
					} catch (err) {
						ppuser = `https://files.catbox.moe/a6zaap.jpg`
					}
					try {
						ppgroup = await sock.profilePictureUrl(anu.id, 'image')
					} catch (err) {
						ppgroup = `https://files.catbox.moe/a6zaap.jpg`
					}
					let participantName = `@${num.split('@')[0]}`
					if (anu.action === 'add') {
						let welcomeText = `✨ *Selamat Datang di Grup, Kak ${participantName}!* 👋\n\nHai Kak! Senang banget kamu bisa join di grup ini. Yuk, saling sapa dan kenalan sama member lainnya. Jangan lupa baca deskripsi grup ya~ 💬💕`
						await sock.sendMessage(anu.id, {
							contextInfo: {
								mentionedJid: [num],
								forwardingScore: 999,
								isForwarded: true,
								externalAdReply: {
									showAdAttribution: true,
									title: `Welcome New Sensei! ✨`,
									body: `Dari ${ownerName}`,
									previewType: "PHOTO",
									thumbnailUrl: ppgroup,
									sourceUrl: wagc
								}
							},
							text: welcomeText,
						})
					} else if (anu.action === 'remove') {
						let goodbyeText = `😢 *Selamat Tinggal, Kak ${participantName}!* 👋\n\nTerima kasih sudah menjadi bagian dari grup ini. Semoga kita bisa bertemu lagi di lain kesempatan. Hati-hati di perjalanan ya~ 💐`
						await sock.sendMessage(anu.id, {
							contextInfo: {
								mentionedJid: [num],
								forwardingScore: 999,
								isForwarded: true,
								externalAdReply: {
									showAdAttribution: true,
									title: `Goodbye from ${metadata.subject}! 🌟`,
									body: `Dari ${ownerName}`,
									previewType: "PHOTO",
									thumbnailUrl: ppgroup,
									sourceUrl: wagc
								}
							},
							text: goodbyeText,
						})
					}
				}
			} catch (error) {
				console.error('❌ Terjadi kesalahan di fitur auto send join/leave:', error)
			}
		}
	})

	client[from].ev.on('call', async (call) => {
		if (anticall) {
			for (let id of call) {
				if (id.status === 'offer') {
					await sock.sendMessage(id.from, { 
						text: `Maaf ya, kami nggak bisa menerima panggilan *${id.isVideo ? 'video' : 'suara'}* saat ini. 🙏\nKalau @${id.from.split('@')[0]} butuh bantuan, langsung hubungi owner aja ya! 😊`, 
						mentions: [id.from] 
					});
					await sock.rejectCall(id.id, id.from);
				}
			}
		}
	});

	client[from].ev.on('messages.upsert', async chatUpdate => {
		if (autoswview){
			mek = chatUpdate.messages[0]
			if (mek.key && mek.key.remoteJid === 'status@broadcast') {
				await sock.readMessages([mek.key]) 
			}
		}
	});

	client[from].ev.on('group-participants.update', async (anu) => {
		if (adminevent) {
			console.log(anu);
			try {
				let participants = anu.participants;
				for (let num of participants) {
					try {
						ppuser = await client[from].profilePictureUrl(num, 'image');
					} catch (err) {
						ppuser = 'https://files.catbox.moe/a6zaap.jpg';
					}
					try {
						ppgroup = await client[from].profilePictureUrl(anu.id, 'image');
					} catch (err) {
						ppgroup = 'https://files.catbox.moe/a6zaap.jpg';
					}

					if (anu.action == 'promote') {
						const time = moment.tz('Asia/Jakarta').format('HH:mm:ss');
						const date = moment.tz('Asia/Jakarta').format('DD/MM/YYYY');
						body = `🎉 *Selamat @${num.split("@")[0]}!* Kamu baru saja dipromosikan menjadi *admin* 🥳\n\nWaktu: ${time}\nTanggal: ${date}`;
						client[from].sendMessage(anu.id, {
							text: body,
							contextInfo: {
								mentionedJid: [num],
								"externalAdReply": {
									"showAdAttribution": true,
									"containsAutoReply": true,
									"title": `Pemberitahuan Admin`,
									"body": `Selamat Bergabung!`,
									"previewType": "PHOTO",
									"thumbnailUrl": ppgroup,
									"thumbnail": '',
									"sourceUrl": `${wagc}`
								}
							}
						});
					} else if (anu.action == 'demote') {
						const time = moment.tz('Asia/Jakarta').format('HH:mm:ss');
						const date = moment.tz('Asia/Jakarta').format('DD/MM/YYYY');
						body = `😬 *Ups, @${num.split("@")[0]}!* Kamu telah *di-demote* dari posisi *admin*.\n\nWaktu: ${time}\nTanggal: ${date}`;
						client[from].sendMessage(anu.id, {
							text: body,
							contextInfo: {
								mentionedJid: [num],
								"externalAdReply": {
									"showAdAttribution": true,
									"containsAutoReply": true,
									"title": `Pemberitahuan Admin`,
									"body": `Ada perubahan status admin`,
									"previewType": "PHOTO",
									"thumbnailUrl": ppgroup,
									"thumbnail": '',
									"sourceUrl": `${wagc}`
								}
							}
						});
					}
				}
			} catch (err) {
				console.log(err);
			}
		}
	});

	client[from].ev.on("groups.update", async (json) => {
		if (groupevent) {
			try {
				let ppgroup = 'https://files.catbox.moe/a6zaap.jpg';
				try {
					ppgroup = await client[from].profilePictureUrl(json[0].id, 'image');
				} catch (err) {
					console.warn('⚠️ Gagal dapetin foto grup, pake gambar default aja ya.');
				}
				const res = json[0];
				if (res.announce === true) {
					await sleep(2000);
					client[from].sendMessage(res.id, {
						text: `🔒 *Oops, Gerbang Grup Ditutup!* 🔒\n\nSekarang cuma *admin* yang bisa ngobrol di sini. Jangan sedih ya, tunggu admin buka lagi! 🥺✨`,
					});
				} else if (res.announce === false) {
					await sleep(2000);
					client[from].sendMessage(res.id, {
						text: `🔓 *Yay, Gerbang Grup Terbuka!* 🔓\n\nSekarang semua anggota bebas ngobrol seru lagi di sini. Ayo ramein! 🎉😄`,
					});
				}

				if (res.restrict === true) {
					await sleep(2000);
					client[from].sendMessage(res.id, {
						text: `🔐 *Info Grup Dikunci!* 🔐\n\nHanya *admin* yang bisa edit info grup sekarang. Tetap tertib ya! 😇📚`,
					});
				} else if (res.restrict === false) {
					await sleep(2000);
					client[from].sendMessage(res.id, {
						text: `🔓 *Info Grup Dibuka!* 🔓\n\nSemua anggota bisa ikut edit info grup. Jangan lupa sopan dan bijak ya! 😊📢`,
					});
				}

				if (res.desc) {
					await sleep(2000);
					client[from].sendMessage(res.id, {
						text: `📝 *Deskripsi Baru Nih!* 📝\n\nGrup ini punya deskripsi baru lho:\n\n${res.desc}\n\nKeren gak? 😍✨`,
					});
				}

				if (res.subject) {
					await sleep(2000);
					client[from].sendMessage(res.id, {
						text: `🖊️ *Nama Grup Baru!* 🖊️\n\nSekarang grup kita punya nama baru:\n\n*${res.subject}*\n\nGimana, kece kan? 😎🔥`,
					});
				}

				if (res.memberAddMode === true) {
					await sleep(2000);
					client[from].sendMessage(res.id, {
						text: `🛡️ *Tambah Anggota? Tertutup Dulu!* 🛡️\n\nSekarang cuma *admin* yang bisa nambah anggota baru. Yuk, patuhi aturan ya! 👀✨`,
					});
				} else if (res.memberAddMode === false) {
					await sleep(2000);
					client[from].sendMessage(res.id, {
						text: `✅ *Tambah Anggota Bebas!* ✅\n\nSekarang semua anggota bisa ngajak teman-temannya masuk grup ini. Ayo tambah rame! 🥳🎈`,
					});
				}

				if (res.joinApprovalMode === true) {
					await sleep(2000);
					client[from].sendMessage(res.id, {
						text: `🛡️ *Pintu Masuk Dijaga Ketat!* 🛡️\n\nCalon anggota baru harus dapet *persetujuan admin* dulu ya sebelum bisa gabung. Tetap aman dan tertib! 🤝🔒`,
					});
				} else if (res.joinApprovalMode === false) {
					await sleep(2000);
					client[from].sendMessage(res.id, {
						text: `✅ *Pintu Masuk Terbuka Lebar!* ✅\n\nAnggota baru bisa langsung gabung tanpa nunggu persetujuan admin. Yuk, tambah rame di sini! 🎊😊`,
					});
				}

			} catch (error) {
				console.error('❌ Oops, ada yang error waktu proses pembaruan grup:', error);
			}
		}
	});

	client[from].ev.on('messages.upsert', async chatUpdate => {
		try {
			mek = chatUpdate.messages[0]
			if (!mek.message) return
			mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
			if (mek.key && mek.key.remoteJid === 'status@broadcast') return
			m = smsg(client[from], mek, store)
			require("./case")(client[from], m, chatUpdate, mek, store)
		} catch (err) {
			console.log(chalk.yellow.bold("[ ERROR ] case.js :\n") + chalk.redBright(util.format(err)))
		}
	})

	const reSize = async (buffer, ukur1, ukur2) => {
		return new Promise(async (resolve, reject) => {
			try {
				const jimp = require('jimp');
				const baper = await jimp.read(buffer);
				const ab = await baper.resize(ukur1, ukur2).getBufferAsync(jimp.MIME_JPEG);
				resolve(ab);
			} catch (error) {
				reject(error);
			}
		});
	};

	client[from].decodeJid = (jid) => {
		if (!jid) return jid
		if (/:\d+@/gi.test(jid)) {
			let decode = jidDecode(jid) || {}
			return decode.user && decode.server && decode.user + '@' + decode.server || jid
		} else return jid
	}

	client[from].ev.on('contacts.update', update => {
		for (let contact of update) {
			let id = client[from].decodeJid(contact.id)
			if (store && store.contacts) store.contacts[id] = {
				id,
				name: contact.notify
			}
		}
	})

	client[from].getName = (jid, withoutContact = false) => {
		id = client[from].decodeJid(jid)
		withoutContact = client[from].withoutContact || withoutContact
		let v
		if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
			v = store.contacts[id] || {}
			if (!(v.name || v.subject)) v = client[from].groupMetadata(id) || {}
			resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'))
		})
		else v = id === '0@s.whatsapp.net' ? {
			id,
			name: 'WhatsApp'
		} : id === client[from].decodeJid(client[from].user.id) ? client[from].user : (store.contacts[id] || {})
		return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
	}

	client[from].sendContact = async (jid, kontak, quoted = '', opts = {}) => {
		let list = []
		for (let i of kontak) {
			list.push({
				displayName: await client[from].getName(i),
				vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${await client[from].getName(i)}\nFN:${await client[from].getName(i)}\nitem1.TEL;waid=${i.split('@')[0]}:${i.split('@')[0]}\nitem1.X-ABLabel:Mobile\nEND:VCARD`
			})
		}
		client[from].sendMessage(jid, { contacts: { displayName: `${list.length} Contact`, contacts: list }, ...opts }, { quoted })
	}

	client[from].public = true

	client[from].serializeM = (m) => smsg(client[from], m, store)

	const uploadFile = {
		upload: sock.waUploadToServer
	};

	client[from].mentionedJid = (teks = '') => {
		return teks.match('@') ? [...teks.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net') : []
	};

	client[from].sendButtonText = (jid, buttons = [], text, footer, quoted = '', options = {
		contextInfo: {
			mentionedJid: parseMention(text),
		}
	}) => {
		let button = []
		for (let i = 0; i < buttons.length; i++) {
			button.push({
				"name": buttons[i].name,
				"buttonParamsJson": JSON.parse(JSON.stringify(buttons[i].buttonParamsJson))
			})
		}
		let msg = generateWAMessageFromContent(jid, {
			viewOnceMessage: {
				message: {
					'messageContextInfo': {
						'deviceListMetadata': {},
						'deviceListMetadataVersion': 2
					},
					interactiveMessage: proto.Message.InteractiveMessage.create({
						...options,
						mentionedJid: parseMention(text),
						body: proto.Message.InteractiveMessage.Body.create({
							text: text
						}),
						footer: proto.Message.InteractiveMessage.Footer.create({
							text: footer
						}),
						header: proto.Message.InteractiveMessage.Header.create({
							title: "",
							hasMediaAttachment: false
						}),
						nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
							buttons: button,
						})
					})
				}
			}
		}, {
			quoted: quoted
		})

		sock.relayMessage(msg.key.remoteJid, msg.message, {
			messageId: msg.key.id
		})
		return msg
	}
	
	client[from].sendButtonImage = async (jid, image, buttons = [], text, footer, quoted = '', options = {
		contextInfo: {
			mentionedJid: parseMention(text),
		}
	}) => {
		let button = []
		for (let i = 0; i < buttons.length; i++) {
			button.push({
				"name": buttons[i].name,
				"buttonParamsJson": JSON.parse(JSON.stringify(buttons[i].buttonParamsJson))
			})
		}
		var imageMessage = await prepareWAMessageMedia({
				image: image,
			},
			uploadFile,
		);
		let msg = generateWAMessageFromContent(jid, {
			viewOnceMessage: {
				message: {
					'messageContextInfo': {
						'deviceListMetadata': {},
						'deviceListMetadataVersion': 2
					},
					interactiveMessage: proto.Message.InteractiveMessage.create({
						...options,
						body: proto.Message.InteractiveMessage.Body.create({
							text: ""
						}),
						footer: proto.Message.InteractiveMessage.Footer.create({
							text: footer
						}),
						header: proto.Message.InteractiveMessage.Header.create({
							title: text,
							subtitle: text,
							hasMediaAttachment: true,
							imageMessage: imageMessage.imageMessage
						}),
						nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
							buttons: button,
						})
					})
				}
			}
		}, {
			quoted: quoted
		})

		sock.relayMessage(msg.key.remoteJid, msg.message, {
			messageId: msg.key.id
		})
		return msg
	}

	client[from].sendButtonVideo = async (jid, video, buttons = [], text, footer, quoted = '', options = {
		contextInfo: {
			mentionedJid: parseMention(text),
		}
	}) => {
		let button = []
		for (let i = 0; i < buttons.length; i++) {
			button.push({
				"name": buttons[i].name,
				"buttonParamsJson": JSON.parse(JSON.stringify(buttons[i].buttonParamsJson))
			})
		}
		var videoMessage = await prepareWAMessageMedia({
				video: video,
			},
			uploadFile,
		);
		let msg = generateWAMessageFromContent(jid, {
			viewOnceMessage: {
				message: {
					'messageContextInfo': {
						'deviceListMetadata': {},
						'deviceListMetadataVersion': 2
					},
					interactiveMessage: proto.Message.InteractiveMessage.create({
						...options,
						body: proto.Message.InteractiveMessage.Body.create({
							text: ""
						}),
						footer: proto.Message.InteractiveMessage.Footer.create({
							text: footer
						}),
						header: proto.Message.InteractiveMessage.Header.create({
							title: text,
							subtitle: text,
							videoMessage: videoMessage.videoMessage,
							hasMediaAttachment: true
						}),
						nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
							buttons: button,
						})
					})
				}
			}
		}, {
			quoted: quoted
		})

		sock.relayMessage(msg.key.remoteJid, msg.message, {
			messageId: msg.key.id
		})
		return msg
	}

	client[from].sendButtonDocument = async (jid, document = {}, buttons = [], text, footer, quoted = '', options = {
		contextInfo: {
			mentionedJid: parseMention(text),
		}
	}) => {
		let button = []
		for (let i = 0; i < buttons.length; i++) {
			button.push({
				"name": buttons[i].name,
				"buttonParamsJson": JSON.parse(JSON.stringify(buttons[i].buttonParamsJson))
			})
		}
		let msg = generateWAMessageFromContent(jid, {
			viewOnceMessage: {
				message: {
					'messageContextInfo': {
						'deviceListMetadata': {},
						'deviceListMetadataVersion': 2
					},
					interactiveMessage: proto.Message.InteractiveMessage.create({
						...options,
						body: proto.Message.InteractiveMessage.Body.create({
							text: text
						}),
						footer: proto.Message.InteractiveMessage.Footer.create({
							text: footer
						}),
						header: proto.Message.InteractiveMessage.Header.create({
							title: "",
							hasMediaAttachment: true,
							...(await prepareWAMessageMedia(document, {
								upload: sock.waUploadToServer
							}))
						}),
						gifPlayback: true,
						nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
							buttons: button,
						})
					})
				}
			}
		}, {
			quoted: quoted
		})

		await sock.relayMessage(msg.key.remoteJid, msg.message, {
			messageId: msg.key.id
		})
		return msg
	}

	client[from].sendText = (jid, text, quoted = '', options) => client[from].sendMessage(jid, {
		text: text,
		...options
	}, {
		quoted,
		...options
	})

	client[from].sendImage = async (jid, path, caption = '', quoted = '', options) => {
		let buffer = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,` [1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
		return await client[from].sendMessage(jid, {
			image: buffer,
			caption: caption,
			...options
		}, {
			quoted
		})
	}

	client[from].sendTextWithMentions = async (jid, text, quoted, options = {}) => client[from].sendMessage(jid, {
		text: text,
		mentions: [...text.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net'),
		...options
	}, {
		quoted
	})

	client[from].sendFromOwner = async (jid, text, quoted, options = {}) => {
		for (const a of jid) {
			await client[from].sendMessage(a + '@s.whatsapp.net', { text, ...options }, { quoted });
		}
	}

	client[from].sendImageAsSticker = async (jid, path, quoted, options = {}) => {
		let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
		let buffer
		if (options && (options.packname || options.author)) {
			buffer = await writeExifImg(buff, options)
		} else {
			buffer = await imageToWebp(buff)
		}
		await client[from].sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted })
		.then( response => {
			fs.unlinkSync(buffer)
			return response
		})
	}

	client[from].sendAudio = async (jid, path, quoted = '', ptt = false, options) => {
		let buffer = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
		return await client[from].sendMessage(jid, { audio: buffer, ptt: ptt, ...options }, { quoted })
	}

	client[from].sendVideo = async (jid, path, caption = '', quoted = '', gif = false, options) => {
		let buffer = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
		return await client[from].sendMessage(jid, { video: buffer, caption: caption, gifPlayback: gif, ...options }, { quoted })
	}

	client[from].sendVideoAsSticker = async (jid, path, quoted, options = {}) => {
		let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
		let buffer
		if (options && (options.packname || options.author)) {
			buffer = await writeExifVid(buff, options)
		} else {
			buffer = await videoToWebp(buff)
		}
		await client[from].sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted })
		return buffer
	}

	client[from].sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
		let mime = '';
		let res = await axios.head(url)
		mime = res.headers['content-type']
		if (mime.split("/")[1] === "gif") {
			 return client[from].sendMessage(jid, { video: await getBuffer(url), caption: caption, gifPlayback: true, ...options}, { quoted: quoted, ...options})
		}
		let type = mime.split("/")[0]+"Message"
		if (mime === "application/pdf"){
			return client[from].sendMessage(jid, { document: await getBuffer(url), mimetype: 'application/pdf', caption: caption, ...options}, { quoted: quoted, ...options })
		}
		if (mime.split("/")[0] === "image"){
			return client[from].sendMessage(jid, { image: await getBuffer(url), caption: caption, ...options}, { quoted: quoted, ...options})
		}
		if (mime.split("/")[0] === "video"){
			return client[from].sendMessage(jid, { video: await getBuffer(url), caption: caption, mimetype: 'video/mp4', ...options}, { quoted: quoted, ...options })
		}
		if (mime.split("/")[0] === "audio"){
			return client[from].sendMessage(jid, { audio: await getBuffer(url), caption: caption, mimetype: 'audio/mpeg', ...options}, { quoted: quoted, ...options })
		}
	}

	client[from].getFile = async (PATH, save) => {
		let res
		let data = Buffer.isBuffer(PATH) ? PATH : /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split`,`[1], 'base64') : /^https?:\/\//.test(PATH) ? await (res = await getBuffer(PATH)) : fs.existsSync(PATH) ? (filename = PATH, fs.readFileSync(PATH)) : typeof PATH === 'string' ? PATH : Buffer.alloc(0)
		//if (!Buffer.isBuffer(data)) throw new TypeError('Result is not a buffer')
		let type = await FileType.fromBuffer(data) || {
			mime: 'application/octet-stream',
			ext: '.bin'
		}
		filename = path.join(__filename, '../src/' + new Date * 1 + '.' + type.ext)
		if (data && save) fs.promises.writeFile(filename, data)
		return {
			res,
			filename,
			size: await getSizeMedia(data),
			...type,
			data
		}
	}

	client[from].sendFile = async (jid, path, filename = '', caption = '', quoted, ptt = false, options = {}) => {
		let type = await client[from].getFile(path, true);
		let { res, data: file, filename: pathFile } = type;
		if (res && res.status !== 200 || file.length <= 65536) {
		try {
			throw {
				json: JSON.parse(file.toString())
			};
		} catch (e) {
			if (e.json) throw e.json;
		}
	}
	let opt = {
		filename
	};
	if (quoted) opt.quoted = quoted;
	if (!type) options.asDocument = true;
	let mtype = '',
	mimetype = type.mime,
	convert;
	if (/webp/.test(type.mime) || (/image/.test(type.mime) && options.asSticker)) mtype = 'sticker';
	else if (/image/.test(type.mime) || (/webp/.test(type.mime) && options.asImage)) mtype = 'image';
	else if (/video/.test(type.mime)) mtype = 'video';
	else if (/audio/.test(type.mime)) {
		convert = await (ptt ? toPTT : toAudio)(file, type.ext);
		file = convert.data;
		pathFile = convert.filename;
		mtype = 'audio';
		mimetype = 'audio/ogg; codecs=opus';
	} else mtype = 'document';
		if (options.asDocument) mtype = 'document';
		delete options.asSticker;
		delete options.asLocation;
		delete options.asVideo;
		delete options.asDocument;
		delete options.asImage;
		let message = { ...options, caption, ptt, [mtype]: { url: pathFile }, mimetype };
		let m;
		try {
			m = await client[from].sendMessage(jid, message, { ...opt, ...options });
		} catch (e) {
			console.error(e)
			m = null;
		} finally {
			if (!m) m = await client[from].sendMessage(jid, { ...message, [mtype]: file }, { ...opt, ...options });
			file = null;
			return m;
		}
	}

	client[from].sendPoll = (jid, name = '', values = [], selectableCount = global.select) => {
		return client[from].sendMessage(jid, {
			poll: {
				name,
				values,
				selectableCount
			}
		})
	};

	client[from].cMod = (jid, copy, text = '', sender = client[from].user.id, options = {}) => {
		//let copy = message.toJSON()
		let mtype = Object.keys(copy.message)[0]
		let isEphemeral = mtype === 'ephemeralMessage'
		if (isEphemeral) {
			mtype = Object.keys(copy.message.ephemeralMessage.message)[0]
		}
		let msg = isEphemeral ? copy.message.ephemeralMessage.message : copy.message
		let content = msg[mtype]
		if (typeof content === 'string') msg[mtype] = text || content
		else if (content.caption) content.caption = text || content.caption
		else if (content.text) content.text = text || content.text
		if (typeof content !== 'string') msg[mtype] = {
			...content,
			...options
		}
		if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant
		else if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant
		if (copy.key.remoteJid.includes('@s.whatsapp.net')) sender = sender || copy.key.remoteJid
		else if (copy.key.remoteJid.includes('@broadcast')) sender = sender || copy.key.remoteJid
		copy.key.remoteJid = jid
		copy.key.fromMe = sender === client[from].user.id
		return proto.WebMessageInfo.fromObject(copy)
	}

	client[from].sendMedia = async (jid, path, fileName = '', caption = '', quoted = '', options = {}) => {
		let types = await client[from].getFile(path, true)
		let { mime, ext, res, data, filename } = types
		if (res && res.status !== 200 || file.length <= 65536) {
			try { throw { json: JSON.parse(file.toString()) } }
			catch (e) { if (e.json) throw e.json }
		}
		let type = '', mimetype = mime, pathFile = filename
		if (options.asDocument) type = 'document'
		if (options.asSticker || /webp/.test(mime)) {
			let { writeExif } = require('./lib/exif')
			let media = { mimetype: mime, data }
			pathFile = await writeExif(media, { packname: options.packname ? options.packname : global.packname, author: options.author ? options.author : global.author, categories: options.categories ? options.categories : [] })
			await fs.promises.unlink(filename)
			type = 'sticker'
			mimetype = 'image/webp'
		}
		else if (/image/.test(mime)) type = 'image'
		else if (/video/.test(mime)) type = 'video'
		else if (/audio/.test(mime)) type = 'audio'
		else type = 'document'
		await client[from].sendMessage(jid, { [type]: { url: pathFile }, caption, mimetype, fileName, ...options }, { quoted, ...options })
		return fs.promises.unlink(pathFile)
	}

	client[from].copyNForward = async (jid, message, forceForward = false, options = {}) => {
		let vtype
		if (options.readViewOnce) {
			message.message = message.message && message.message.ephemeralMessage && message.message.ephemeralMessage.message ? message.message.ephemeralMessage.message : (message.message || undefined)
			vtype = Object.keys(message.message.viewOnceMessage.message)[0]
			delete(message.message && message.message.ignore ? message.message.ignore : (message.message || undefined))
			delete message.message.viewOnceMessage.message[vtype].viewOnce
			message.message = {
				...message.message.viewOnceMessage.message
			}
		}
		let mtype = Object.keys(message.message)[0]
		let content = await generateForwardMessageContent(message, forceForward)
		let ctype = Object.keys(content)[0]
		let context = {}
		if (mtype != "conversation") context = message.message[mtype].contextInfo
		content[ctype].contextInfo = {
			...context,
			...content[ctype].contextInfo
		}
		const waMessage = await generateWAMessageFromContent(jid, content, options ? {
			...content[ctype],
			...options,
			...(options.contextInfo ? {
				contextInfo: {
					...content[ctype].contextInfo,
					...options.contextInfo
				}
			} : {})
		} : {})
		await client[from].relayMessage(jid, waMessage.message, { messageId:waMessage.key.id })
		return waMessage
	}

	client[from].parseMention = (text = '') => {
		return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net')
	}

	client[from].parseMention = (text = '') => {
		return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net')
	};

	client[from].downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
		let quoted = message.msg ? message.msg : message
		let mime = (message.msg || message).mimetype || ''
		let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
		const stream = await downloadContentFromMessage(quoted, messageType)
		let buffer = Buffer.from([])
		for await(const chunk of stream) {
			buffer = Buffer.concat([buffer, chunk])
		}
		let type = await FileType.fromBuffer(buffer)
		let trueFileName = attachExtension ? ('./temp/' + filename + '.' + type.ext) : './temp/' + filename
		await fs.writeFileSync(trueFileName, buffer)
		return trueFileName
	}

	client[from].downloadMediaMessage = async (message) => {
		let mime = (message.msg || message).mimetype || ''
		let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
		const stream = await downloadContentFromMessage(message, messageType)
		let buffer = Buffer.from([])
		for await(const chunk of stream) {
			buffer = Buffer.concat([buffer, chunk])
		}

		return buffer
	}
 
	return client[from]
};

const stopjadibot = async (sock, m, from) => {
	if (!client[from]) {
		return m.reply("⚠️ *Tidak ada bot yang sedang terkoneksi saat ini!*");
	}
	fs.rm(`./src/jadibot/${m.sender.split("@")[0]}`, { recursive: true, force: true }, (err) => {
		if (err) {
			console.error(err);
			return m.reply("❌ *Gagal menghapus sesi. Coba lagi ya!*");
		}
		m.reply("✅ *Sesi bot berhasil dihapus!*\nSekarang bot sudah berhenti bekerja. 😊");
	});
	delete client[from];
	m.reply("🛑 *Bot telah dihentikan!* Kalau perlu bantuan, hubungi aku lagi ya. 😉");
	await sleep(2000);
	process.exit();
};

async function listjadibot(sock, m) {
	let from = m.key.remoteJid;
	let mentions = [];
	let text = "📃 *Daftar Bot yang Terkoneksi:*\n";
	for (let jadibot of Object.keys(client)) {
		mentions.push(jadibot);
		text += `• @${jadibot.replace('@s.whatsapp.net', '')}\n`;
	}
	if (mentions.length === 0) {
		text += "⚠️ *Belum ada bot yang terkoneksi saat ini.*";
	}
	return sock.sendMessage(from, { text: text.trim(), mentions });
}

module.exports = { 
	jadibot, 
	stopjadibot, 
	listjadibot 
};