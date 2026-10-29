// English for every Indonesian string the app shows (see lib/i18n.tsx).
// Keys are the Indonesian text exactly as written in t(); {placeholders}
// must match. A [singular, plural] pair is picked by the `n` parameter.
// The audience is personal shoppers outside Indonesia: "jastip" is
// "personal shopping", a jastip event a "shopping event", the jastip fee
// a "service fee". The brand Justipers stays.

export const en: Record<string, string | [string, string]> = {
  // Shared
  'Terjadi kesalahan. Coba lagi sebentar lagi.': 'Something went wrong. Please try again shortly.',
  'Memproses...': 'Processing...',
  'Menyimpan...': 'Saving...',
  Simpan: 'Save',
  '✓ Tersimpan': '✓ Saved',
  Batal: 'Cancel',
  Hapus: 'Delete',
  Tutup: 'Close',
  Kembali: 'Back',
  'Kembali ke Dashboard': 'Back to Dashboard',
  Lanjut: 'Continue',
  Next: 'Next',
  Ubah: 'Change',
  Gagal: 'Failed',
  Berhasil: 'Done',
  Gratis: 'Free',
  token: ['token', 'tokens'],
  '{n} token': ['{n} token', '{n} tokens'],
  '{n} items': ['{n} item', '{n} items'],
  '{n} barang': ['{n} item', '{n} items'],
  '{n} produk': ['{n} product', '{n} products'],
  'Saldo:': 'Balance:',
  'Biaya:': 'Cost:',
  'tidak terbatas': 'unlimited',
  'Izin dibutuhkan': 'Permission needed',
  'Format tidak didukung': 'Format not supported',
  'Pilih foto berformat JPG, JPEG, atau PNG.': 'Choose a JPG, JPEG or PNG photo.',
  'Foto tidak berhasil diproses. Coba pilih foto lain.':
    "The photo couldn't be processed. Try another one.",
  '✓ Link tersalin': '✓ Link copied',
  Download: 'Download',

  // Splash, login, sign-up
  'Kelola sat set, jastip anti ribet': 'The No.1 order management app for personal shoppers',
  'Kelola jastip tanpa ribet!': 'The No.1 order management app for personal shoppers',
  Daftar: 'Sign up',
  'Atau sudah punya akun?': 'Already have an account?',
  Masuk: 'Log in',
  'Selamat Datang!': 'Welcome!',
  'Login dengan akun': 'Log in to your account',
  Password: 'Password',
  'Tetap masuk': 'Stay logged in',
  Login: 'Log in',
  'Belum punya akun?': "Don't have an account?",
  'Akun ini sedang aktif di browser/perangkat lain. Apakah kamu mau keluar dari browser lain dan login di sini? Jika setuju, akunmu di browser lain akan secara otomatis keluar.':
    'This account is active in another browser or on another device. Do you want to log out there and log in here? If you agree, the other browser will be logged out automatically.',
  'Tidak setuju': 'No',
  Setuju: 'Yes, log in here',
  'Gabung Sekarang!': 'Join now!',
  'Daftar akun baru': 'Create a new account',
  'Akun baru dapat': 'New accounts get',
  '5 token gratis': '5 free tokens',
  'untuk mencoba Justipers.': 'to try Justipers.',
  'Cek email kamu': 'Check your email',
  'Kami mengirim link konfirmasi ke {email}. Buka link itu, lalu login untuk mulai memakai Justipers.':
    'We sent a confirmation link to {email}. Open it, then log in to start using Justipers.',
  Nama: 'Name',
  'Nama Lengkap': 'Full name',
  'Nama Jastip': 'Business name',
  'Verifikasi Password': 'Confirm password',
  "Password doesn't match!": "Password doesn't match!",
  'Sudah punya akun?': 'Already have an account?',
  Negara: 'Country',
  'Pilih negara': 'Choose your country',
  'Cari negara': 'Search countries',
  'Negara tidak ditemukan': 'No country found',

  // Account errors (lib/auth-store.tsx)
  'Kamu keluar karena akun ini sedang aktif di browser/perangkat lain.':
    'You were logged out because this account is active in another browser or on another device.',
  'Akun ini sedang aktif di browser/perangkat lain.':
    'This account is active in another browser or on another device.',
  'Email atau password salah. Coba lagi.': 'Wrong email or password. Try again.',
  'Email belum dikonfirmasi. Cek inbox kamu, lalu login lagi.':
    "Your email isn't confirmed yet. Check your inbox, then log in again.",
  'Email ini sudah terdaftar. Silakan login.': 'This email is already registered. Please log in.',
  'Password minimal 6 karakter.': 'The password must be at least 6 characters.',
  'Password baru harus berbeda dari yang lama.': 'The new password must differ from the old one.',
  'Alamat email tidak valid.': 'Invalid email address.',
  'Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.':
    'Too many attempts. Wait a moment, then try again.',
  'Token tidak cukup. Beli token dulu di Pengaturan Subscription.':
    'Not enough tokens. Buy tokens in Subscription Settings first.',
  'Menambah anggota akan tersedia saat Justipers versi lengkap dirilis.':
    'Adding members will be available when the full version of Justipers is released.',
  'Toko ini sudah mencapai batas {n} anggota.': 'This shop has reached its limit of {n} members.',
  'Email ini sudah menjadi anggota sebuah toko.': 'This email is already a member of a shop.',
  'Email ini sudah diundang.': 'This email has already been invited.',
  'Pemilik toko tidak bisa dihapus.': "The shop owner can't be removed.",
  'Admin tidak bisa dihapus. Minta pemilik toko mencabut status admin dulu.':
    "An admin can't be removed. Ask the shop owner to remove their admin role first.",
  'Hanya admin yang bisa memakai token toko.': "Only admins can use the shop's tokens.",
  'Hanya pemilik toko yang bisa melakukan ini.': 'Only the shop owner can do this.',
  'Tidak bisa terhubung ke server. Cek koneksi internet, lalu coba lagi.':
    "Can't reach the server. Check your internet connection, then try again.",
  'Toko tidak ditemukan untuk akun ini.': 'No shop was found for this account.',
  'Kamu belum login.': "You're not logged in.",

  // Dashboard
  'Logo jastip': 'Shop logo',
  'Hallo!': 'Hello!',
  'Buka menu': 'Open menu',
  'Token tersedia: tidak terbatas': 'Tokens available: unlimited',
  'Token tersedia: {n} token': ['Tokens available: {n} token', 'Tokens available: {n} tokens'],
  'Token tersedia': 'Tokens available',
  '∞ Tidak terbatas': '∞ Unlimited',
  'Jastip bulan ini': "This month's shopping",
  'Total Revenue (Bulan ini)': 'Total revenue (this month)',
  Profit: 'Profit',
  'Sedang berlangsung': 'Happening now',
  'Belum ada': 'None yet',
  'Total order': 'Total orders',
  'Buka event jastip': 'Open a shopping event',
  'List event jastip': 'Shopping events',
  'Ketik nama event, lokasi atau kode event': 'Search by event name, location or event code',
  'Cari event': 'Search events',
  'Tidak ada event yang cocok': 'No matching events',
  'Lihat detail': 'View details',
  'Halaman sebelumnya': 'Previous page',
  'Halaman {n}': 'Page {n}',
  'Halaman berikutnya': 'Next page',
  'Halaman {page} dari {pages} · {n} event': [
    'Page {page} of {pages} · {n} event',
    'Page {page} of {pages} · {n} events',
  ],
  'Pengaturan Akun': 'Account Settings',
  'Pengaturan Subscription': 'Subscription Settings',
  'Pengaturan Publikasi': 'Sharing Settings',
  Keluar: 'Log out',
  'Kamu sedang offline. Perubahan disimpan di perangkat ini dan akan disinkronkan saat online kembali.':
    "You're offline. Changes are saved on this device and will sync when you're back online.",

  // Buka event / Edit event
  'Edit event detail': 'Edit event details',
  'Buka Jastip': 'Open a shopping event',
  'Apakah event ini di Indonesia atau Internasional?':
    'Is this event in Indonesia or international?',
  Indonesia: 'Indonesia',
  Internasional: 'International',
  'Event di dalam negeri. Semua harga barang, tagihan, dan laporan memakai Rupiah (IDR).':
    'An event in Indonesia. All prices, bills and reports use Rupiah (IDR).',
  'Event di luar negeri, belanja dengan mata uang asing. Harga barang diisi dalam mata uang pilihanmu, lalu otomatis dihitung ke Rupiah untuk tagihan pelanggan dan laporan.':
    'An event abroad, shopping in a foreign currency. Enter prices in your chosen currency; they are converted to Rupiah automatically for customer bills and reports.',
  'Mata uang belanja': 'Shopping currency',
  'Kurs: 1 {currency} berapa Rupiah?': 'Exchange rate: how many Rupiah is 1 {currency}?',
  'Kurs ke Rupiah': 'Rate to Rupiah',
  'Dipakai untuk menghitung harga barang ke Rupiah. Bisa diubah nanti di Edit event detail.':
    'Used to convert prices to Rupiah. You can change it later in Edit event details.',
  'Jenis event': 'Event type',
  'Ubah jenis event': 'Change event type',
  'Nama Acara': 'Event name',
  'Nama acara': 'Event name',
  'Tanggal Acara': 'Event dates',
  'Tanggal acara': 'Event dates',
  'Tanggal acara:': 'Event dates:',
  'Dari:': 'From:',
  'Sampai:': 'To:',
  'Tanggal tidak bisa diubah karena event ini sudah punya pesanan.':
    "The dates can't be changed because this event already has orders.",
  'Tanggal tidak bisa diubah karena event ini sudah dimulai.':
    "The dates can't be changed because this event has already started.",
  Lokasi: 'Location',
  'Lokasi:': 'Location:',
  'Lokasi acara': 'Event location',
  'Ganti foto': 'Change photo',
  'Foto acara (optional)': 'Event photo (optional)',
  'Aktifkan akses foto di pengaturan untuk memilih foto acara.':
    'Allow photo access in settings to choose an event photo.',
  'Budget jastip': 'Shopping budget',
  'Buka event · {cost}': 'Open event · {cost}',
  'Biaya buka event:': 'Cost to open an event:',
  'Hanya admin yang bisa membuka event. Minta pemilik toko menjadikanmu admin.':
    'Only admins can open events. Ask the shop owner to make you an admin.',
  'Token tidak cukup.': 'Not enough tokens.',
  'Beli token': 'Buy tokens',
  'Gratis selama masa beta Justipers.': 'Free during the Justipers beta.',
  'Token dikembalikan jika event dihapus sebelum tanggal acara dan belum ada pesanan.':
    'The token is refunded if the event is deleted before its dates and has no orders.',

  // Currencies (lib/currency.ts)
  'Dolar Amerika': 'US Dollar',
  'Dolar Singapura': 'Singapore Dollar',
  'Ringgit Malaysia': 'Malaysian Ringgit',
  'Baht Thailand': 'Thai Baht',
  'Yen Jepang': 'Japanese Yen',
  'Won Korea': 'Korean Won',
  'Yuan Tiongkok': 'Chinese Yuan',
  'Dolar Hong Kong': 'Hong Kong Dollar',
  'Dolar Taiwan': 'Taiwan Dollar',
  'Dolar Australia': 'Australian Dollar',
  Euro: 'Euro',
  Poundsterling: 'Pound Sterling',
  'Riyal Saudi': 'Saudi Riyal',
  'Peso Filipina': 'Philippine Peso',
  'Dong Vietnam': 'Vietnamese Dong',

  // Event detail
  'Event belum dihapus.': 'The event was not deleted.',
  'Terjadi kesalahan. Event belum dihapus.': 'Something went wrong. The event was not deleted.',
  'Download laporan baru tersedia di versi web.':
    'Downloading the report is only available on the web version for now.',
  'Laporan Excel sudah diunduh.': 'The Excel report has been downloaded.',
  'Laporan gagal dibuat. Coba lagi.': "The report couldn't be created. Try again.",
  'Yuk order di {event}!': 'Order now at {event}!',
  'Klik link dibawah ini untuk pemesanan:': 'Tap the link below to order:',
  'Event tidak ditemukan': 'Event not found',
  'Menu event': 'Event menu',
  'Hapus event': 'Delete event',
  'Kode Event': 'Event code',
  'Bagikan form order jastip': 'Share the order form',
  'Salin link form order': 'Copy order form link',
  'Menyiapkan link...': 'Preparing link...',
  'Bagikan link form order': 'Share order form link',
  'Form order untuk customer': 'Order form for customers',
  'Publikasikan form order supaya customer bisa memesan lewat link.':
    'Publish the order form so customers can order through a link.',
  'Gratis selama masa beta.': 'Free during the beta.',
  'Biaya {n} token, sekali per event. Saldo: {balance} token.': [
    'Costs {n} token, once per event. Balance: {balance} tokens.',
    'Costs {n} tokens, once per event. Balance: {balance} tokens.',
  ],
  'Publikasikan form order · {cost}': 'Publish order form · {cost}',
  'Minta admin toko untuk mempublikasikan form order.':
    'Ask a shop admin to publish the order form.',
  Laporan: 'Report',
  'List pesanan': 'Orders',
  Keuangan: 'Finances',
  'Menu laporan': 'Report menu',
  'Download laporan Excel': 'Download Excel report',
  'Jastip budget': 'Shopping budget',
  Pengeluaran: 'Expenses',
  Pesanan: 'Orders',
  Revenue: 'Revenue',
  'Status pembayaran': 'Payment status',
  Lunas: 'Paid',
  'Belum lunas': 'Partly paid',
  'Belum Dibayar': 'Unpaid',
  'Belum dibayar': 'Unpaid',
  'Belum bayar': 'Unpaid',
  'Sudah dibayar': 'Paid',
  'Belum ada pengeluaran': 'No expenses yet',
  'Hapus pengeluaran {name}': 'Delete expense {name}',
  '+Tambah pengeluaran': '+Add expense',
  '+ Tambah pesanan': '+ Add order',
  'Cari pesanan dengan nama atau barang': 'Search orders by name or item',
  'Cari pesanan': 'Search orders',
  'Hapus pengeluaran?': 'Delete expense?',
  'Pengeluaran "{name}" akan dihapus dan tidak bisa dikembalikan.':
    'The expense "{name}" will be deleted. This can\'t be undone.',
  'Hapus event?': 'Delete event?',
  'Event "{event}" dan {n} pesanan di dalamnya akan dihapus dari semua perangkat toko ini dan tidak bisa dikembalikan.':
    [
      'The event "{event}" and its {n} order will be deleted from all of this shop\'s devices. This can\'t be undone.',
      'The event "{event}" and its {n} orders will be deleted from all of this shop\'s devices. This can\'t be undone.',
    ],
  'Event "{event}" akan dihapus dari semua perangkat toko ini dan tidak bisa dikembalikan.':
    'The event "{event}" will be deleted from all of this shop\'s devices. This can\'t be undone.',
  'Token buka event akan dikembalikan ke saldo toko.':
    "The event's token will be refunded to the shop's balance.",
  'Token tidak dikembalikan karena event ini sudah punya pesanan.':
    "The token isn't refunded because this event already has orders.",
  'Token tidak dikembalikan karena event ini sudah dimulai.':
    "The token isn't refunded because this event has already started.",
  'Publikasikan form order?': 'Publish the order form?',
  'Gratis selama masa beta. Setelah itu link form order bisa dibagikan ke customer.':
    'Free during the beta. After that, the order form link can be shared with customers.',
  '{n} token akan dipakai dari saldo toko (saldo sekarang {balance} token). Setelah itu link form order bisa dibagikan ke customer, dan membagikannya lagi tidak dikenai biaya.':
    [
      "{n} token will be taken from the shop's balance (now {balance} tokens). After that, the order form link can be shared with customers, and sharing it again is free.",
      "{n} tokens will be taken from the shop's balance (now {balance} tokens). After that, the order form link can be shared with customers, and sharing it again is free.",
    ],
  Publikasikan: 'Publish',
  'Tidak ada pesanan yang cocok': 'No matching orders',
  'Belum ada pesanan': 'No orders yet',
  ' · dari form customer, isi harga': ' · from the customer form, add prices',
  'Kelebihan bayar: kembalikan {amount}': 'Overpaid: refund {amount}',

  // Expenses sheet
  'Tutup tambah pengeluaran': 'Close add expense',
  'Tambah pengeluaran': 'Add expense',
  'Deskripsi pengeluaran': 'Expense description',
  'Contoh: Bayar ojek online, ongkos ke venue': 'E.g. ride to the venue, parking',
  'Tanggal pengeluaran:': 'Expense date:',
  'Tanggal pengeluaran': 'Expense date',
  'Jumlah pengeluaran': 'Expense amount',

  // Add order
  'Tambah pesanan': 'Add order',
  'Nomor order': 'Order number',
  'Copy-paste form pesanan': 'Paste an order form',
  'Copy paste chat pesanan dari whatsapp disini dan terapkan untuk secara otomatis mengisi form pesanan.':
    'Paste the order chat from WhatsApp here and apply it to fill in the order form automatically.',
  'Contoh form pesanan': 'Example order form',
  'Order form': 'Order form',
  'Copy Paste text order form disini.': 'Paste the order form text here.',
  Terapkan: 'Apply',
  'Terisi otomatis: {fields}. Cek lagi, lalu isi Harga dan Fee Jastip.':
    'Filled in automatically: {fields}. Check them, then add the prices and service fees.',
  'Belum ada data yang dikenali. Lihat "Contoh form pesanan" untuk format yang bisa dibaca.':
    'Nothing was recognised. See "Example order form" for a format that can be read.',
  'Atau isi manual form dibawah ini:': 'Or fill in the form below by hand:',
  'Form pesanan manual': 'Manual order form',
  Alamat: 'Address',
  'No. Whatsapp': 'WhatsApp number',
  'Metode pengiriman': 'Delivery method',
  Instant: 'Instant',
  'Via Expedisi': 'Via courier',
  'Total pembelanjaan': 'Total spent',
  'Total tagihan ke pelanggan': 'Total billed to customer',
  'Nama produk': 'Product name',
  'Nama produk {n}': 'Product name {n}',
  Jumlah: 'Quantity',
  'Jumlah produk {n}': 'Product quantity {n}',
  'Harga asli': 'Original price',
  'Harga ke pelanggan': 'Price to customer',
  'Harga asli hanya catatan untukmu. Selisihnya dengan harga ke pelanggan masuk ke profit, tidak mengubah tagihan, dan tidak tampil ke pelanggan. Boleh dikosongkan.':
    "The original price is only a note for you. The difference from the customer price counts as profit, doesn't change the bill and isn't shown to the customer. Optional.",
  'Fee Jastip': 'Service fee',
  'Pakai %': 'Use %',
  'Pakai IDR': 'Use IDR',
  'Hapus produk {name}': 'Delete product {name}',
  '+Tambah': '+Add',
  'DP (opsional)': 'Down payment (optional)',
  'DP lebih besar dari total tagihan. Kelebihan {amount} perlu dikembalikan ke pelanggan.':
    'The down payment is more than the total bill. The extra {amount} needs to go back to the customer.',
  'Sisa pembayaran {amount}. Pesanan akan berstatus Belum lunas.':
    'Remaining payment {amount}. The order will be marked Partly paid.',
  'Isi jika pelanggan sudah membayar uang muka. Boleh dikosongkan.':
    'Fill in if the customer has paid a deposit. Optional.',
  'Konfirmasi dan kirim total pembayaran': 'Confirm and send the total',
  'Hi! ini pesan konfirmasi dari {jastip}. Kami sudah catat pesananmu ya. Pesananmu ada {n} items dengan total pembayaran IDR {total}. Item pesananmu : {items}.':
    [
      "Hi! This is a confirmation from {jastip}. We've recorded your order. It has {n} item with a total of IDR {total}. Your item: {items}.",
      "Hi! This is a confirmation from {jastip}. We've recorded your order. It has {n} items with a total of IDR {total}. Your items: {items}.",
    ],
  'DP yang sudah dibayar IDR {dp}, sisa pembayaran IDR {rest}.':
    'Down payment received IDR {dp}, remaining IDR {rest}.',
  'Contoh rekomendasi order form': 'Recommended order form',
  'Kamu bisa modifikasi form pesanan dibawah ini tapi pastikan form pesanan memiliki komponen data Nama, Alamat, No.Whatsapp, dan List pesanan seperti dibawah ini agar data bisa tersalin secara otomatis dan tepat ke form di aplikasi Justipers.':
    'You can change the form below, but keep the Name, Address, WhatsApp number and Order list fields as shown so the details copy into the Justipers form automatically and correctly.',
  Contoh: 'Example',
  '✓ Contoh tersalin': '✓ Example copied',
  'Salin contoh form order': 'Copy example order form',
  'Hi dear, yuk lengkapi form pesanan dibawah ini ya': 'Hi! Please fill in the order form below',
  '[Nama produk (Jumlah)] contoh → Herborist lotion Strawberry (1), Wardah cushion shade N21 (1)':
    '[Product name (Quantity)] example → Herborist lotion Strawberry (1), Wardah cushion shade N21 (1)',

  // Order detail
  'Pesanan tidak ditemukan': 'Order not found',
  'Cetak label baru tersedia di versi web.':
    'Printing labels is only available on the web version for now.',
  'Label pengiriman': 'Shipping label',
  'Label pengiriman sudah diunduh.': 'The shipping label has been downloaded.',
  'Label gagal dibuat. Coba lagi.': "The label couldn't be created. Try again.",
  'Aktifkan akses foto di pengaturan untuk memilih foto struk.':
    'Allow photo access in settings to choose a receipt photo.',
  'Aktifkan akses galeri untuk menyimpan foto struk.':
    'Allow gallery access to save the receipt photo.',
  'Foto struk tersimpan ke galeri.': 'Receipt photo saved to the gallery.',
  'Foto struk tidak berhasil disimpan.': "The receipt photo couldn't be saved.",
  'Detil pesanan': 'Order details',
  'Menu pesanan': 'Order menu',
  'Hapus pesanan': 'Delete order',
  'Pembayaran ongkos kirim': 'Shipping payment',
  'Ongkos kirim': 'Shipping cost',
  'Tidak tersedia': 'Not available',
  'Sudah dibeli': 'Bought',
  'Jastip fee (per item):': 'Service fee (per item):',
  'Harga asli: {amount} (catatan pribadi)': 'Original price: {amount} (private note)',
  'Edit penanda': 'Edit mark',
  'Cetak penanda': 'Print tag',
  'Beri tanda': 'Mark',
  'Sisa pembayaran': 'Remaining payment',
  'Cetak tagihan customer': 'Print customer bill',
  'Simpan perubahan dulu untuk mencetak tagihan.': 'Save your changes first to print the bill.',
  'Cetak label pengiriman': 'Print shipping label',
  'Simpan perubahan dulu untuk mencetak label.': 'Save your changes first to print the label.',
  'Buang perubahan?': 'Discard changes?',
  'Perubahan di pesanan ini belum disimpan. Kalau kamu keluar sekarang, perubahannya hilang.':
    "Changes to this order aren't saved. If you leave now, they'll be lost.",
  Buang: 'Discard',
  'Lanjut edit': 'Keep editing',
  'Ubah status jadi Lunas?': 'Mark as Paid?',
  'Pelanggan ini baru membayar DP {dp}, masih ada sisa {rest}. Pastikan sisanya sudah dilunasi sebelum mengubah status menjadi Lunas.':
    'This customer has only paid a down payment of {dp}, with {rest} still to pay. Make sure the rest has been paid before marking the order as Paid.',
  'Pesanan ini baru dibayar sebagian. Pastikan pelanggan sudah melunasi sisanya sebelum mengubah status menjadi Lunas.':
    'This order is only partly paid. Make sure the customer has paid the rest before marking it as Paid.',
  'Ya, sudah lunas': "Yes, it's paid",
  'Hapus pesanan?': 'Delete order?',
  'Pesanan {order} atas nama {name} akan dihapus dari semua perangkat toko ini dan tidak bisa dikembalikan.':
    "Order {order} for {name} will be deleted from all of this shop's devices. This can't be undone.",
  'Barang sudah kamu beli di event.': 'You bought the item at the event.',
  'Barang habis atau tidak dijual di event.': 'Sold out or not sold at the event.',
  'Konfirmasi barang sudah dibeli': 'Confirm item bought',
  'Foto struk': 'Receipt photo',
  'Ganti foto struk': 'Change receipt photo',
  'Tambah foto struk': 'Add receipt photo',
  'Tandai sudah beli': 'Mark as bought',
  'Tambah list pesanan': 'Add item',
  'Tandai sudah dibeli': 'Mark as bought',

  // Shipping options (lib/ongkir.ts)
  'Bayar ongkir di awal': 'Shipping paid upfront',
  'Ongkir ditambahkan ke total tagihan pelanggan.':
    "Shipping is added to the customer's total bill.",
  'Ongkir dibayar saat pengiriman': 'Shipping paid on delivery',
  'Pelanggan bayar ongkir langsung ke kurir.': 'The customer pays the courier directly.',
  'Free ongkir': 'Free shipping',
  'Pelanggan tidak dikenakan ongkir.': "The customer isn't charged for shipping.",

  // Bill, tag, receipt
  'Waktu cetak': 'Printed at',
  'Cetak pesanan ke:': 'Print order to:',
  'Nama customer': 'Customer name',
  'Total pesanan': 'Total items',
  '*Harga sudah termasuk jastip fee': '*Prices include the service fee',
  Cetak: 'Print',
  'Total tagihan yang harus dibayar': 'Total to pay',
  'DP sudah dibayar': 'Down payment paid',
  'Kelebihan bayar (dikembalikan ke pelanggan)': 'Overpaid (refunded to the customer)',
  'Hi {customer}! Ini tagihan pesananmu dari {jastip} ({order}), total {total}. Lihat rinciannya di sini:\n{link}':
    "Hi {customer}! Here's your bill from {jastip} ({order}), total {total}. See the details here:\n{link}",
  'Kirim ke WhatsApp customer': "Send to customer's WhatsApp",
  'Bagikan link tagihan': 'Share bill link',
  'Customer bisa membuka tagihan dari link ini tanpa perlu login. Logo jastip tidak ikut tampil di link.':
    "Customers can open the bill from this link without logging in. Your shop logo isn't shown on the link.",
  Tagihan: 'Bill',
  'Tagihan tidak ditemukan': 'Bill not found',
  'Link tagihan ini tidak lengkap atau rusak. Minta jastiper mengirim ulang linknya.':
    'This bill link is incomplete or broken. Ask your personal shopper to send it again.',
  'Logo jastiper': 'Shop logo',
  'Logo Jastiper': 'Shop logo',

  // Customer order form (app/o.tsx)
  'Form order': 'Order form',
  'Form order tidak ditemukan': 'Order form not found',
  'Link form order ini tidak lengkap atau rusak. Minta jastiper mengirim ulang linknya.':
    'This order form link is incomplete or broken. Ask your personal shopper to send it again.',
  'Isi detail pesanan dibawah ini:': 'Fill in your order details below:',
  'Mengirim pesanan...': 'Sending order...',
  'Buat pesanan': 'Place order',
  'Pesanan belum terkirim. Cek koneksi internet, lalu coba lagi.':
    "Your order wasn't sent. Check your internet connection, then try again.",
  'Pesananmu sudah tercatat!': 'Your order has been received!',
  'Hi, list pesananmu sudah terkirim ke Jastiper. Tunggu konfirmasi dari Jastiper untuk konfirmasi pesanan dan pembayaran ya.':
    'Hi, your order list has been sent to your personal shopper. Please wait for them to confirm the order and payment.',
  'Lihat bukti pesanan': 'View order receipt',
  'Bukti cetak pesanan': 'Order receipt',
  'Menunggu konfirmasi dan total pembayaran': 'Waiting for confirmation and the total',

  // Account settings
  Pengaturan: 'Settings',
  'Data Akun': 'Account details',
  'Logo Jastip': 'Shop logo',
  'Belum ada logo': 'No logo yet',
  'Ganti logo': 'Change logo',
  'Unggah logo': 'Upload logo',
  'Hapus logo': 'Remove logo',
  'PNG atau JPG, persegi (rasio 1:1). Minimal {min} x {min} px, maksimal {max} x {max} px. Gambar yang lebih besar dikecilkan otomatis. Logo tampil di dashboard dan di cetakan.':
    'PNG or JPG, square (1:1). At least {min} x {min} px, at most {max} x {max} px. Larger images are scaled down automatically. The logo shows on the dashboard and on printouts.',
  'Aktifkan akses foto di pengaturan perangkat untuk memilih logo.':
    "Allow photo access in your device's settings to choose a logo.",
  'Format tidak didukung. Pilih gambar PNG atau JPG.':
    'Format not supported. Choose a PNG or JPG image.',
  'Gambar terlalu kecil ({width} x {height} px). Minimal {minWidth} x {minHeight} px.':
    'The image is too small ({width} x {height} px). It must be at least {minWidth} x {minHeight} px.',
  'Ukuran file terlalu besar ({size} MB). Maksimal {max} MB.':
    'The file is too large ({size} MB). The maximum is {max} MB.',
  'Logo terlalu besar untuk disimpan. Coba gambar yang lebih sederhana.':
    'The logo is too large to save. Try a simpler image.',
  'Logo tidak berhasil dibaca. Coba pilih gambar lain.':
    "The logo couldn't be read. Try another image.",
  'No. Telepon Jastip': 'Shop phone number',
  'Ditampilkan di tagihan customer, di bawah nama jastip.':
    'Shown on customer bills, under the business name.',
  'Ganti password': 'Change password',
  'Nama jastip dan nomor telepon hanya bisa diubah oleh pemilik toko.':
    'Only the shop owner can change the business name and phone number.',
  'Bahasa / Language': 'Language / Bahasa',
  'Berlaku untuk aplikasi di perangkat ini.': 'Applies to the app on this device.',
  'Ganti Password': 'Change Password',
  'Password baru': 'New password',
  'Masukkan password baru': 'Enter a new password',
  'Konfirmasi password baru': 'Confirm new password',
  'Password tidak sama': "Passwords don't match",

  // Sharing settings
  'Nomor WhatsApp Admin': 'Admin WhatsApp number',
  'Nomor ini akan digunakan untuk mengirim publikasi event jastip dan konfirmasi pesanan ke pelanggan.':
    'This number is used to send shopping event announcements and order confirmations to customers.',
  'Format kalimat pembuka publikasi event jastip': 'Opening line for shopping event announcements',
  'E.g: Halo semua! sebentar lagi event yang kamu tunggu-tunggu akan dimulai. Yuk catat tanggal dan harinya!':
    "E.g. Hi everyone! The event you've been waiting for starts soon. Save the date!",
  'Preview tampilan publikasi via Whatsapp:': 'Preview of the WhatsApp announcement:',
  'Foto event': 'Event photo',
  'Pengaturan publikasi hanya bisa diubah oleh pemilik toko.':
    'Only the shop owner can change the sharing settings.',

  // Tutorial (components/tutorial-overlay.tsx)
  Tutorial: 'Tutorial',
  Lewati: 'Skip',
  Mulai: 'Get started',
  Menu: 'Menu',
  'Langkah {n} dari {total}': 'Step {n} of {total}',
  'Selamat datang di Justipers!': 'Welcome to Justipers!',
  'Justipers membantumu mengelola jastip dari buka event, mencatat pesanan, sampai mengirim tagihan ke pelanggan. Yuk kenalan sebentar.':
    "Justipers app helps you run your personal shopper business, from opening an event and recording orders to sending bills to customers. Here's a quick tour.",
  Token: 'Tokens',
  'Membuka event dan mempublikasikan form order masing-masing memakai 1 token. Akun baru dapat 5 token gratis. Tap kartu ini untuk melihat riwayat dan membeli token.':
    'Opening an event and publishing its order form use 1 token each. New accounts get 5 free tokens. Tap this card to see your history and buy tokens.',
  'Ringkasan revenue, profit, dan jumlah order dari event bulan ini, serta event yang sedang berlangsung.':
    "A summary of this month's revenue, profit and orders, plus the event happening now.",
  'Mulai dari sini: isi nama acara, tanggal, dan lokasi. Di detail event kamu bisa membagikan link form order, menambah pesanan, mengirim tagihan ke WhatsApp customer, dan mengunduh laporan.':
    "Start here: fill in the event name, dates and location. In the event details you can share the order form link, add orders, send bills to customers' WhatsApp and download the report.",
  'Pengaturan akun, token dan anggota toko, publikasi, bahasa, dan tutorial ini ada di sini.':
    'Account settings, tokens and shop members, sharing, language and this tutorial are here.',

  // Subscription: tokens
  'Saldo token toko': "Shop's token balance",
  'Buka event {open} · Publikasi form order {publish} · Slot anggota {slot}':
    'Open event {open} · Publish order form {publish} · Member slot {slot}',
  'Justipers sedang dalam masa beta: token tidak terbatas dan semua fitur gratis. Saldo tokenmu ({n} token) tetap tersimpan untuk dipakai setelah beta berakhir.':
    'Justipers is in beta: tokens are unlimited and every feature is free. Your balance ({n} tokens) is kept for when the beta ends.',
  'Hanya admin yang bisa memakai dan membeli token toko.':
    "Only admins can use and buy the shop's tokens.",
  'Riwayat token': 'Token history',
  'Riwayat tidak bisa dimuat. Cek koneksi internet.':
    "The history couldn't be loaded. Check your internet connection.",
  'Memuat...': 'Loading...',
  'Belum ada riwayat.': 'No history yet.',
  'Tampilkan lebih sedikit': 'Show less',
  'Lihat semua riwayat': 'See all history',
  'Event yang sudah dihapus': 'Deleted event',
  'Token gratis': 'Free tokens',
  'Token gratis untuk mulai': 'Free tokens to get started',
  'Buka event': 'Open event',
  'Publikasi form order': 'Publish order form',
  'Slot anggota': 'Member slot',
  'Refund buka event': 'Open event refund',
  Penyesuaian: 'Adjustment',
  '{price} per token': '{price} per token',
  'Pembayaran online segera hadir. Untuk sementara, hubungi tim Justipers untuk menambah token.':
    'Online payment is coming soon. For now, contact the Justipers team to add tokens.',
  'Bayar (segera hadir)': 'Pay (coming soon)',

  // Subscription: members
  Owner: 'Owner',
  Admin: 'Admin',
  Anggota: 'Member',
  'Hapus anggota?': 'Remove member?',
  '{name} tidak bisa lagi membuka toko ini. Slot anggotanya ikut hilang dan token tidak dikembalikan.':
    "{name} will no longer be able to open this shop. Their member slot goes too, and the tokens aren't refunded.",
  'Batalkan undangan?': 'Cancel invitation?',
  'Undangan untuk {email} dibatalkan. Slot anggotanya ikut hilang dan token tidak dikembalikan.':
    "The invitation for {email} will be cancelled. The member slot goes too, and the tokens aren't refunded.",
  'Batalkan undangan': 'Cancel invitation',
  'Jadikan admin?': 'Make admin?',
  '{name} akan bisa memakai token toko: membuka event, mempublikasikan form order, dan membeli slot anggota.':
    "{name} will be able to use the shop's tokens: open events, publish order forms and buy member slots.",
  'Jadikan admin': 'Make admin',
  'Cabut status admin?': 'Remove admin role?',
  '{name} tidak bisa lagi memakai token toko.':
    "{name} will no longer be able to use the shop's tokens.",
  'Cabut admin': 'Remove admin',
  'Anggota toko': 'Shop members',
  '{used}/{limit} slot terpakai': '{used}/{limit} slots used',
  ' (kamu)': ' (you)',
  'Hapus anggota {email}': 'Remove member {email}',
  'Diundang, belum mendaftar': "Invited, hasn't signed up yet",
  'Batalkan undangan {email}': 'Cancel invitation for {email}',
  Batalkan: 'Cancel',
  'Admin hanya bisa dihapus setelah pemilik toko mencabut status adminnya.':
    'An admin can only be removed after the shop owner removes their admin role.',
  'Hanya admin yang bisa menambah atau menghapus anggota.':
    'Only admins can add or remove members.',
  'Undang anggota': 'Invite members',
  'Kamu bisa undang orang untuk memiliki akses yang sama di Justipers app.':
    'You can invite people to have the same access in the Justipers app.',
  'Fitur ini akan tersedia saat Justipers versi lengkap dirilis.':
    'This will be available when the full version of Justipers is released.',
  'Satu slot anggota {cost}, sekali bayar.': 'One member slot costs {cost}, paid once.',
  'Tambah anggota · Segera hadir': 'Add member · Coming soon',
  'Tambah anggota · {cost}': 'Add member · {cost}',
  'Tambah anggota': 'Add member',
  'Email anggota': "Member's email",
  'Ketik ulang email': 'Retype the email',
  'Email tidak sama.': "The emails don't match.",
  'Periksa email ini sebelum mengundang': 'Check this email before inviting',
  'Periksa email ini sebelum membeli': 'Check this email before buying',
  'Slot anggota terikat ke email ini dan tidak bisa diganti atau dipindahkan ke orang lain.':
    "The member slot is tied to this email and can't be changed or moved to someone else.",
  'Kalau emailnya salah, kamu perlu membeli slot baru untuk email yang benar.':
    "If the email is wrong, you'll need to buy a new slot for the right one.",
  'Menghapus anggota atau membatalkan undangan tidak mengembalikan token.':
    "Removing a member or cancelling an invitation doesn't refund the tokens.",
  'Anggota bergabung dengan mendaftar di Justipers memakai email ini persis.':
    'The member joins by signing up to Justipers with exactly this email.',
  'Token tidak cukup. Beli token dulu.': 'Not enough tokens. Buy tokens first.',
  'Undang · Gratis': 'Invite · Free',
  'Beli slot & undang · {n} token': [
    'Buy slot & invite · {n} token',
    'Buy slot & invite · {n} tokens',
  ],

  // Shop currency (lib/money.ts)
  'Apakah event ini di {country} atau Internasional?':
    'Is this event in {country} or international?',
  'Event di {country}. Semua harga barang, tagihan, dan laporan memakai {currency} ({code}).':
    'An event in {country}. All prices, bills and reports use {currency} ({code}).',
  'Event di luar negeri, belanja dengan mata uang asing. Harga barang diisi dalam mata uang pilihanmu, lalu otomatis dihitung ke {currency} untuk tagihan pelanggan dan laporan.':
    'An event abroad, shopping in a foreign currency. Enter prices in your chosen currency; they are converted to {currency} automatically for customer bills and reports.',
  'Kurs: 1 {currency} berapa {home}?': 'Exchange rate: how many {home} is 1 {currency}?',
  'Kurs ke {home}': 'Rate to {home}',
  'Dipakai untuk menghitung harga barang ke {currency}. Bisa diubah nanti di Edit event detail.':
    'Used to convert prices to {currency}. You can change it later in Edit event details.',
  'Pakai {currency}': 'Use {currency}',
  'DP yang sudah dibayar {dp}, sisa pembayaran {rest}.':
    'Down payment received {dp}, remaining {rest}.',
  '{foreign} ≈ {price} per barang (kurs 1 {code} = {rate})':
    '{foreign} ≈ {price} per item (rate 1 {code} = {rate})',
  'Fee jastip ({currency})': 'Service fee ({currency})',
  Rupiah: 'Rupiah',
  'Hi! ini pesan konfirmasi dari {jastip}. Kami sudah catat pesananmu ya. Pesananmu ada {n} items dengan total pembayaran {total}. Item pesananmu : {items}.':
    [
      "Hi! This is a confirmation from {jastip}. We've recorded your order. It has {n} item with a total of {total}. Your item: {items}.",
      "Hi! This is a confirmation from {jastip}. We've recorded your order. It has {n} items with a total of {total}. Your items: {items}.",
    ],

  // Excel report and shipping label
  'Powered by Justipers. No.1 Apps for Jastiper':
    'Powered by Justipers. The No.1 order management app for personal shoppers',
  'Laporan event': 'Event report',
  'Kode event': 'Event code',
  'Tanggal mulai': 'Start date',
  'Tanggal selesai': 'End date',
  'Kurs ke IDR': 'Rate to IDR',
  'Jumlah pesanan': 'Number of orders',
  'Total tagihan': 'Total billed',
  'Tanggal pesanan': 'Order date',
  'No. order': 'Order no.',
  'Nama pelanggan': 'Customer name',
  'Selisih harga': 'Price difference',
  'Fee jastip': 'Service fee',
  'Fee jastip (%)': 'Service fee (%)',
  'Fee jastip (IDR)': 'Service fee (IDR)',
  'Harga + fee jastip': 'Price + service fee',
  DP: 'Down payment',
  'Kelebihan bayar': 'Overpaid',
  'Payment type': 'Payment type',
  Ongkir: 'Shipping',
  'Total tagihan pesanan': 'Order total',
  'Harga ({currency})': 'Price ({currency})',
  'mata uang asing': 'foreign currency',
  '{name} (tidak tersedia)': '{name} (not available)',
  Deskripsi: 'Description',
  Tanggal: 'Date',
  'No.Whatsapp': 'WhatsApp no.',
  Pengirim: 'Sender',
};
