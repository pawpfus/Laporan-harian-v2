  let DEFAULT_SB_URL = 'https://penaujinawijzwcimgde.supabase.co';
  let DEFAULT_SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlbmF1amluYXdpanp3Y2ltZ2RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NzgzNzcsImV4cCI6MjA5NDU1NDM3N30.FNNGqO7X5wpZ9Ng8qehPagS74uP-GMo8Z2AdzSEU6v4';
  const LS_URL_KEY = 'sb_url';
  const LS_KEY_KEY = 'sb_key';
  const LS_PRODUKSI_KEY = 'produksi_data';
  const LS_THEME_KEY = 'app_theme';

  let sbClient = null;
  let cachedData = [];
  let filteredData = [];
  let activeFilter = 'semua';
  let currentPage = 1;
  const rowsPerPage = 10;
  let tableDateFrom = null, tableDateTo = null;
  let rekapDateFrom = null, rekapDateTo = null;

  function getDateRange(preset) {
    const now = new Date();
    const pad = n => String(n).padStart(2,'0');
    const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    const todayStr = fmt(now);
    if (preset === 'hari_ini') return { from: todayStr, to: todayStr };
    if (preset === 'minggu_ini') {
      const day = now.getDay();
      const mon = new Date(now); mon.setDate(now.getDate() - (day===0?6:day-1));
      const sun = new Date(mon); sun.setDate(mon.getDate()+6);
      return { from: fmt(mon), to: fmt(sun) };
    }
    if (preset === 'bulan_ini') {
      const from = `${now.getFullYear()}-${pad(now.getMonth()+1)}-01`;
      const last = new Date(now.getFullYear(), now.getMonth()+1, 0);
      return { from, to: fmt(last) };
    }
    return { from: null, to: null };
  }

  const PRESET_LABELS = { hari_ini:'Hari Ini', minggu_ini:'Minggu Ini', bulan_ini:'Bulan Ini', semua:'Semua Waktu' };

  function toggleWaktuDropdown(prefix) {
    const dd = document.getElementById(prefix+'-waktu-dropdown');
    const btn = document.getElementById(prefix+'-btn-waktu');
    const isOpen = dd.classList.contains('open');
    document.querySelectorAll('.waktu-dropdown').forEach(d=>d.classList.remove('open'));
    document.querySelectorAll('.btn-waktu').forEach(b=>b.classList.remove('open'));
    if (!isOpen) { dd.classList.add('open'); btn.classList.add('open'); }
  }

  function closeAllWaktuDropdowns() {
    document.querySelectorAll('.waktu-dropdown').forEach(d=>d.classList.remove('open'));
    document.querySelectorAll('.btn-waktu').forEach(b=>b.classList.remove('open'));
  }

  document.addEventListener('click', e => {
    if (!e.target.closest('.waktu-wrap') && !e.target.closest('#download-wrap')) {
      closeAllWaktuDropdowns(); closeDownloadDropdown();
    }
  });

  function updateWaktuLabel(prefix, label) {
    const span = document.getElementById(prefix+'-waktu-label');
    const btn  = document.getElementById(prefix+'-btn-waktu');
    if (span) span.textContent = label;
    if (btn) btn.classList.toggle('has-filter', label !== 'Semua Waktu');
  }

  function setActiveWaktuOpt(prefix, preset) {
    document.querySelectorAll('#'+prefix+'-waktu-dropdown .btn-waktu-opt').forEach(b=>b.classList.remove('active'));
    const match = [...document.querySelectorAll('#'+prefix+'-waktu-dropdown .btn-waktu-opt')]
      .find(b=>b.getAttribute('onclick')?.includes("'"+preset+"'"));
    if (match) match.classList.add('active');
  }

  function applyTableDatePreset(preset) {
    const r = getDateRange(preset);
    tableDateFrom = r.from; tableDateTo = r.to;
    const fi = document.getElementById('t-date-from');
    const ti = document.getElementById('t-date-to');
    if (fi) fi.value = r.from||''; if (ti) ti.value = r.to||'';
  }

  function applyRekapDatePreset(preset) {
    const r = getDateRange(preset);
    rekapDateFrom = r.from; rekapDateTo = r.to;
    const fi = document.getElementById('r-date-from');
    const ti = document.getElementById('r-date-to');
    if (fi) fi.value = r.from||''; if (ti) ti.value = r.to||'';
  }

  function setTableDatePreset(preset) {
    applyTableDatePreset(preset);
    setActiveWaktuOpt('t', preset);
    updateWaktuLabel('t', PRESET_LABELS[preset]||preset);
    closeAllWaktuDropdowns(); currentPage=1; renderTable(true);
  }

  function setRekapDatePreset(preset) {
    applyRekapDatePreset(preset);
    setActiveWaktuOpt('r', preset);
    updateWaktuLabel('r', PRESET_LABELS[preset]||preset);
    closeAllWaktuDropdowns(); renderRekap();
  }

  function applyTableCustomRange() {
    const from = document.getElementById('t-date-from')?.value||null;
    const to   = document.getElementById('t-date-to')?.value||null;
    if (!from||!to) return;
    tableDateFrom=from; tableDateTo=to;
    document.querySelectorAll('#t-waktu-dropdown .btn-waktu-opt').forEach(b=>b.classList.remove('active'));
    updateWaktuLabel('t', from+' — '+to);
    closeAllWaktuDropdowns(); currentPage=1; renderTable(true);
  }

  function applyRekapCustomRange() {
    const from = document.getElementById('r-date-from')?.value||null;
    const to   = document.getElementById('r-date-to')?.value||null;
    if (!from||!to) return;
    rekapDateFrom=from; rekapDateTo=to;
    document.querySelectorAll('#r-waktu-dropdown .btn-waktu-opt').forEach(b=>b.classList.remove('active'));
    updateWaktuLabel('r', from+' — '+to);
    closeAllWaktuDropdowns(); renderRekap();
  }

  // ── CHART ──
  let chartK = null, chartG = null;
  const KOMODITAS_COLORS = { 'Padi':'#2d5c2e', 'Jagung':'#c47c12', 'Kedelai':'#1a5fa8' };
  const KEGIATAN_COLORS  = { 'Tanam':'#0f7a6b', 'Panen':'#c47c12', 'Olah Lahan':'#6b7569', 'Bera':'#9da89c' };
  const isDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
  function chartAxisColor() { return isDark() ? '#5a635a' : '#9da89c'; }
  function chartGridColor()  { return isDark() ? 'rgba(255,255,255,0.05)' : 'rgba(26,31,26,0.05)'; }

  function baseChartOptions() {
    return {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      animation: { duration: 350 },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => '  '+parseFloat(ctx.parsed.x).toFixed(1)+' Ha' } }
      },
      scales: {
        x: {
          grid: { color: chartGridColor() },
          ticks: { font: { size: 11, family: 'DM Mono' }, color: chartAxisColor(), callback: v=>v+' Ha' }
        },
        y: {
          grid: { display: false },
          ticks: { font: { size: 12, family: 'Instrument Sans' }, color: chartAxisColor() }
        }
      }
    };
  }

  function initCharts() {
    chartK = new Chart(document.getElementById('chartKomoditas'), {
      type: 'bar',
      data: { labels:[], datasets:[{ data:[], backgroundColor:[], borderRadius:5, barThickness:22 }] },
      options: baseChartOptions()
    });
    chartG = new Chart(document.getElementById('chartKegiatan'), {
      type: 'bar',
      data: { labels:[], datasets:[{ data:[], backgroundColor:[], borderRadius:5, barThickness:22 }] },
      options: baseChartOptions()
    });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (!chartK||!chartG) return;
      const gridCol=chartGridColor(), tickCol=chartAxisColor();
      [chartK,chartG].forEach(c => {
        c.options.scales.x.grid.color = gridCol;
        c.options.scales.x.ticks.color = tickCol;
        c.options.scales.y.ticks.color = tickCol;
        c.update();
      });
    });
  }

  function updateCharts(data) {
    const kom={}, keg={};
    data.forEach(d => {
      const luas = parseFloat(d.luas||0);
      kom[d.komoditas] = (kom[d.komoditas]||0) + luas;
      keg[d.kegiatan]  = (keg[d.kegiatan]||0)  + luas;
    });
    const komEntries = Object.entries(kom).sort((a,b)=>b[1]-a[1]);
    const kegEntries = Object.entries(keg).sort((a,b)=>b[1]-a[1]);

    chartK.data.labels = komEntries.map(e=>e[0]);
    chartK.data.datasets[0].data = komEntries.map(e=>parseFloat(e[1].toFixed(1)));
    chartK.data.datasets[0].backgroundColor = komEntries.map(e=>KOMODITAS_COLORS[e[0]]||'#639922');
    chartK.update();

    chartG.data.labels = kegEntries.map(e=>e[0]);
    chartG.data.datasets[0].data = kegEntries.map(e=>parseFloat(e[1].toFixed(1)));
    chartG.data.datasets[0].backgroundColor = kegEntries.map(e=>KEGIATAN_COLORS[e[0]]||'#888780');
    chartG.update();

    document.getElementById('legend-komoditas').innerHTML = komEntries.length
      ? komEntries.map(([k,v])=>`<span class="legend-item"><span class="legend-dot" style="background:${KOMODITAS_COLORS[k]||'#639922'}"></span>${k} <strong style="color:var(--ink);margin-left:2px;font-family:var(--font-mono)">${v.toFixed(1)} Ha</strong></span>`).join('')
      : '<span style="font-size:12px;color:var(--ink-3)">Belum ada data</span>';

    document.getElementById('legend-kegiatan').innerHTML = kegEntries.length
      ? kegEntries.map(([k,v])=>`<span class="legend-item"><span class="legend-dot" style="background:${KEGIATAN_COLORS[k]||'#888780'}"></span>${k} <strong style="color:var(--ink);margin-left:2px;font-family:var(--font-mono)">${v.toFixed(1)} Ha</strong></span>`).join('')
      : '<span style="font-size:12px;color:var(--ink-3)">Belum ada data</span>';
  }

  // ── REKAP ──
  function setRekapFilter(filter) {
    activeFilter = filter;
    const sel = document.getElementById('rekap-filter');
    if (sel&&sel.value!==filter) sel.value=filter;
    renderRekap();
  }
  async function updateRekap() { await renderRekap(); }
  async function renderRekap() {
    ['stat-total','stat-luas','stat-desa','stat-kelompok'].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.innerHTML='<i class="ti ti-loader spin" style="font-size:16px"></i>';
    });
    const data = await fetchAllForRekap({ dateFrom:rekapDateFrom, dateTo:rekapDateTo, jenis:activeFilter });
    const totalLuas     = data.reduce((s,d)=>s+parseFloat(d.luas||0),0);
    const totalDesa     = new Set(data.map(d=>d.desa)).size;
    const totalKelompok = new Set(data.map(d=>d.kelompok_tani)).size;
    document.getElementById('stat-total').textContent    = data.length;
    document.getElementById('stat-luas').textContent     = totalLuas.toFixed(1);
    document.getElementById('stat-desa').textContent     = totalDesa;
    document.getElementById('stat-kelompok').textContent = totalKelompok;
    updateCharts(data);
  }

  // ── THEME ──
  function toggleTheme() {
    const root = document.documentElement;
    const icon = document.getElementById('theme-icon');
    if (root.classList.contains('dark-mode')) {
      root.classList.remove('dark-mode');
      root.classList.add('light-mode');
      icon.className = 'ti ti-moon';
      localStorage.setItem(LS_THEME_KEY, 'light');
    } else if (root.classList.contains('light-mode')) {
      root.classList.remove('light-mode');
      root.classList.add('dark-mode');
      icon.className = 'ti ti-sun';
      localStorage.setItem(LS_THEME_KEY, 'dark');
    } else {
      // If no class, check system preference
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isSystemDark) {
        root.classList.add('light-mode');
        icon.className = 'ti ti-moon';
        localStorage.setItem(LS_THEME_KEY, 'light');
      } else {
        root.classList.add('dark-mode');
        icon.className = 'ti ti-sun';
        localStorage.setItem(LS_THEME_KEY, 'dark');
      }
    }
  }

  function initTheme() {
    const savedTheme = localStorage.getItem(LS_THEME_KEY);
    const root = document.documentElement;
    const icon = document.getElementById('theme-icon');
    if (savedTheme === 'dark') {
      root.classList.add('dark-mode');
      icon.className = 'ti ti-sun';
    } else if (savedTheme === 'light') {
      root.classList.add('light-mode');
      icon.className = 'ti ti-moon';
    } else {
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      icon.className = isSystemDark ? 'ti ti-sun' : 'ti ti-moon';
    }
  }

  // ── INIT ──
  async function init() {
    initTheme();
    initCharts();
    loadProduksiFromLS();
    const url = localStorage.getItem(LS_URL_KEY)||DEFAULT_SB_URL;
    const key = localStorage.getItem(LS_KEY_KEY)||DEFAULT_SB_KEY;
    if (!url||!key) { showOfflinePopup(); return; }
    try {
      const { createClient } = window.supabase;
      sbClient = createClient(url, key);
      const { error } = await sbClient.from('laporan').select('id',{count:'exact',head:true});
      if (error) throw error;
      setDbStatus(true); hideOfflinePopup();
      applyTableDatePreset('bulan_ini'); applyRekapDatePreset('bulan_ini');
    } catch(e) { setDbStatus(false); showOfflinePopup(); }
  }

  function showOfflinePopup() { document.getElementById('offline-popup').classList.add('active'); }
  function hideOfflinePopup() { document.getElementById('offline-popup').classList.remove('active'); }

  async function retryConnection() {
    const btn = document.getElementById('btn-retry');
    btn.disabled=true; btn.innerHTML='<i class="ti ti-loader spin"></i> Menghubungkan…';
    const url = localStorage.getItem(LS_URL_KEY)||DEFAULT_SB_URL;
    const key = localStorage.getItem(LS_KEY_KEY)||DEFAULT_SB_KEY;
    try {
      const { createClient } = window.supabase;
      sbClient = createClient(url, key);
      const { error } = await sbClient.from('laporan').select('id',{count:'exact',head:true});
      if (error) throw error;
      setDbStatus(true); hideOfflinePopup();
      showAlert('Berhasil terhubung ke database!','success');
      applyTableDatePreset('bulan_ini'); applyRekapDatePreset('bulan_ini');
      await renderTable(true); await renderRekap();
    } catch(e) { setDbStatus(false); }
    finally { btn.disabled=false; btn.innerHTML='<i class="ti ti-refresh"></i> Coba Lagi'; }
  }

  async function connectSupabase(url, key) {
    if (!url || !key) return false;
    try {
      const { createClient } = window.supabase;
      sbClient = createClient(url, key);
      const { error } = await sbClient.from('laporan').select('id',{count:'exact',head:true});
      if (error) throw error;
      setDbStatus(true);
      hideOfflinePopup();
      return true;
    } catch(e) {
      setDbStatus(false);
      return false;
    }
  }

  function bukaSettingsModal() {
    document.getElementById('set-url').value = localStorage.getItem(LS_URL_KEY) || DEFAULT_SB_URL || '';
    document.getElementById('set-key').value = localStorage.getItem(LS_KEY_KEY) || DEFAULT_SB_KEY || '';
    document.getElementById('settings-modal').classList.add('active');
  }

  function tutupSettingsModal() {
    document.getElementById('settings-modal').classList.remove('active');
  }

  async function simpanSettings() {
    const url = document.getElementById('set-url').value.trim();
    const key = document.getElementById('set-key').value.trim();
    if (!url || !key) { showAlert('URL dan Key wajib diisi', 'warning'); return; }

    localStorage.setItem(LS_URL_KEY, url);
    localStorage.setItem(LS_KEY_KEY, key);

    showAlert('Menghubungkan ke database...', 'success');
    const ok = await connectSupabase(url, key);
    if (ok) {
      showAlert('Berhasil terhubung!', 'success');
      tutupSettingsModal();
      await renderTable(true);
      await renderRekap();
    } else {
      showAlert('Gagal terhubung. Periksa URL/Key.', 'error');
    }
  }

  function setDbStatus(ok) {
    document.getElementById('db-dot').className = 'db-dot '+(ok?'ok':'err');
    document.getElementById('db-label').textContent = ok?'Terhubung':'Terputus';
  }

  // ── ALERT ──
  function esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function showAlert(msg, type='success') {
    const box=document.getElementById('alert-box');
    const msgEl=document.getElementById('alert-msg');
    const icon=document.getElementById('alert-icon');
    const iconMap={success:'ti ti-circle-check',warning:'ti ti-alert-triangle',error:'ti ti-circle-x'};
    box.className='alert '+type;
    msgEl.textContent=msg;
    icon.className=iconMap[type]||iconMap.success;
    clearTimeout(box._timer);
    box._timer=setTimeout(()=>{box.className='alert hidden';},4000);
  }

  // ── DATA OPS ──
  let totalCount = 0;

  async function fetchData({ page=1, dateFrom=null, dateTo=null, search='', komoditas='semua', kegiatan='semua' }={}) {
    if (!sbClient) return [];
    const from=(page-1)*rowsPerPage, to=from+rowsPerPage-1;
    let q = sbClient.from('laporan').select('*',{count:'exact'})
      .order('tanggal',{ascending:false}).order('created_at',{ascending:false}).range(from,to);
    if (dateFrom) q=q.gte('tanggal',dateFrom);
    if (dateTo)   q=q.lte('tanggal',dateTo);
    if (komoditas!=='semua') q=q.eq('komoditas',komoditas);
    if (kegiatan !=='semua') q=q.eq('kegiatan',kegiatan);
    if (search) {
      const s = `%${search}%`;
      q = q.or(`desa.ilike.${s},kelompok_tani.ilike.${s},user_name.ilike.${s}`);
    }
    const { data, error, count } = await q;
    if (error) { showAlert('Gagal memuat data: '+error.message,'error'); return []; }
    let rows = data||[];
    cachedData=rows; totalCount=count||0; return rows;
  }

  async function fetchAllForExport({ dateFrom=null, dateTo=null, komoditas='semua', kegiatan='semua' }={}) {
    if (!sbClient) return [];
    let q = sbClient.from('laporan').select('*').order('tanggal',{ascending:false});
    if (dateFrom) q=q.gte('tanggal',dateFrom);
    if (dateTo)   q=q.lte('tanggal',dateTo);
    if (komoditas!=='semua') q=q.eq('komoditas',komoditas);
    if (kegiatan !=='semua') q=q.eq('kegiatan',kegiatan);
    const { data, error } = await q;
    if (error) { showAlert('Gagal memuat data ekspor: '+error.message,'error'); return []; }
    return data||[];
  }

  async function fetchAllForRekap({ dateFrom=null, dateTo=null, jenis='semua' }={}) {
    if (!sbClient) return [];
    let q = sbClient.from('laporan').select('*').order('tanggal',{ascending:false});
    if (dateFrom) q=q.gte('tanggal',dateFrom);
    if (dateTo)   q=q.lte('tanggal',dateTo);
    if (jenis!=='semua') q=q.eq('jenis_ltt',jenis);
    const { data, error } = await q;
    if (error) { showAlert('Gagal memuat rekap: '+error.message,'error'); return []; }
    return data||[];
  }

  function resetInputForm() {
    document.getElementById('f-user').value = '';
    document.getElementById('f-desa').value = '';
    document.getElementById('f-kelompok').value = '';
    document.getElementById('f-luas').value = '';
    document.getElementById('f-jenis').selectedIndex = 0;
    document.getElementById('f-kegiatan').selectedIndex = 0;
    document.getElementById('f-komoditas').selectedIndex = 0;
    document.getElementById('f-tanggal').value = today();
    showAlert('Form telah dikosongkan', 'success');
  }

  async function simpanData() {
    if (!sbClient) { showAlert('Belum terhubung ke database','warning'); return; }
    const tanggal=document.getElementById('f-tanggal').value;
    const desa=document.getElementById('f-desa').value.trim();
    const kelompok=document.getElementById('f-kelompok').value.trim();
    const user=document.getElementById('f-user').value.trim();
    const luas=parseFloat(document.getElementById('f-luas').value)||0;
    if (!desa||!kelompok||!user||!tanggal) { showAlert('Semua data wajib diisi','warning'); return; }
    const btn=document.getElementById('btn-simpan');
    btn.disabled=true; btn.innerHTML='<i class="ti ti-loader spin"></i> Menyimpan…';
    const row={tanggal,desa,kelompok_tani:kelompok,jenis_ltt:document.getElementById('f-jenis').value,
      kegiatan:document.getElementById('f-kegiatan').value,komoditas:document.getElementById('f-komoditas').value,
      luas:parseFloat(luas.toFixed(2)),user_name:user};
    const { error } = await sbClient.from('laporan').insert([row]);
    btn.disabled=false; btn.innerHTML='<i class="ti ti-device-floppy"></i> Simpan Laporan';
    if (error) { showAlert('Gagal menyimpan: '+error.message,'error'); return; }
    document.getElementById('f-desa').value='';
    document.getElementById('f-kelompok').value='';
    document.getElementById('f-luas').value='';
    showAlert('Laporan berhasil disimpan ke database','success');
    await renderTable(true);
  }

  async function hapusData(id) {
    if (!confirm('Hapus laporan ini?')) return;
    const { error } = await sbClient.from('laporan').delete().eq('id',id);
    if (error) { showAlert('Gagal menghapus: '+error.message,'error'); return; }
    showAlert('Laporan dihapus','warning');
    await renderTable(true); await renderRekap();
  }

  // ── TABLE ──
  function getBadge(k) {
    const map={Padi:'padi',Jagung:'jagung',Kedelai:'kedelai'};
    return `<span class="badge badge-${map[k]||'padi'}">${k}</span>`;
  }

  async function renderTable(fetchFromServer=true) {
    const container=document.getElementById('table-container');
    const searchTerm=(document.getElementById('t-search')?.value||'').toLowerCase().trim();
    const filterKomoditas=document.getElementById('t-filter-komoditas')?.value||'semua';
    const filterKegiatan=document.getElementById('t-filter-kegiatan')?.value||'semua';

    if (fetchFromServer) {
      container.innerHTML=`<div class="loading-state"><i class="ti ti-loader spin"></i> Memuat data…</div>`;
      await fetchData({ page:currentPage, dateFrom:tableDateFrom, dateTo:tableDateTo, search:searchTerm, komoditas:filterKomoditas, kegiatan:filterKegiatan });
    }

    document.getElementById('data-count').textContent=totalCount+' laporan';

    if (!cachedData.length) {
      container.innerHTML=`<div class="empty-state"><i class="ti ti-inbox"></i>Tidak ada data yang cocok</div>`;
      return;
    }

    const totalPages=Math.max(1,Math.ceil(totalCount/rowsPerPage));
    if (currentPage>totalPages) currentPage=totalPages;

    const rows=cachedData.map(d=>`
      <tr>
        <td class="mono">${esc(d.tanggal)}</td>
        <td>${esc(d.desa)}</td>
        <td>${esc(d.kelompok_tani)}</td>
        <td>${esc(d.jenis_ltt)}</td>
        <td>${esc(d.kegiatan)}</td>
        <td>${getBadge(d.komoditas)}</td>
        <td class="mono" style="text-align:right">${parseFloat(d.luas).toFixed(1)}</td>
        <td>${esc(d.user_name)}</td>
        <td style="text-align:right;white-space:nowrap">
          <button class="btn-row-action edit" onclick="bukaEditModal('${d.id}')" title="Edit"><i class="ti ti-edit"></i></button>
          <button class="btn-row-action trash" onclick="hapusData('${d.id}')" title="Hapus"><i class="ti ti-trash"></i></button>
        </td>
      </tr>`).join('');

    let paginationHtml='';
    if (totalPages>1) {
      const maxBtns=5;
      let startP=Math.max(1,currentPage-Math.floor(maxBtns/2));
      let endP=Math.min(totalPages,startP+maxBtns-1);
      if (endP-startP<maxBtns-1) startP=Math.max(1,endP-maxBtns+1);
      let pageBtns='';
      for (let p=startP;p<=endP;p++) {
        pageBtns+=`<button class="btn-page${p===currentPage?' btn-page-active':''}" onclick="goToPage(${p})" ${p===currentPage?'disabled':''}>${p}</button>`;
      }
      paginationHtml=`<div class="pagination-bar">
        <span class="pagination-info">Halaman <strong>${currentPage}</strong> dari <strong>${totalPages}</strong> · Total <strong>${totalCount}</strong></span>
        <div class="pagination-buttons">
          <button class="btn-page" onclick="goToPage(1)" ${currentPage===1?'disabled':''}>«</button>
          <button class="btn-page" onclick="changePage(-1)" ${currentPage===1?'disabled':''}>‹</button>
          ${pageBtns}
          <button class="btn-page" onclick="changePage(1)" ${currentPage===totalPages?'disabled':''}>›</button>
          <button class="btn-page" onclick="goToPage(${totalPages})" ${currentPage===totalPages?'disabled':''}>»</button>
        </div></div>`;
    }

    container.innerHTML=`
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Tanggal</th><th>Desa</th><th>Kelompok Tani</th>
            <th>Jenis LTT</th><th>Kegiatan</th><th>Komoditas</th>
            <th>Luas (Ha)</th><th>User</th><th></th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>${paginationHtml}`;
  }

  function handleTableSearchFilter() { currentPage=1; renderTable(true); }
  function changePage(offset) { currentPage+=offset; renderTable(true); }
  function goToPage(p) { currentPage=p; renderTable(true); }

  // ── EDIT MODAL ──
  function bukaEditModal(id) {
    const item=cachedData.find(d=>d.id===id);
    if (!item) return;
    document.getElementById('edit-id').value=item.id;
    document.getElementById('edit-tanggal').value=item.tanggal;
    document.getElementById('edit-user').value=item.user_name||'';
    document.getElementById('edit-desa').value=item.desa||'';
    document.getElementById('edit-kelompok').value=item.kelompok_tani||'';
    document.getElementById('edit-jenis').value=item.jenis_ltt||'Reguler';
    document.getElementById('edit-kegiatan').value=item.kegiatan||'Bera';
    document.getElementById('edit-komoditas').value=item.komoditas||'Padi';
    document.getElementById('edit-luas').value=item.luas||0;
    document.getElementById('edit-modal').classList.add('active');
  }
  function tutupEditModal() { document.getElementById('edit-modal').classList.remove('active'); }

  async function updateData() {
    if (!sbClient) { showAlert('Belum terhubung ke database','warning'); return; }
    const id=document.getElementById('edit-id').value;
    const tanggal=document.getElementById('edit-tanggal').value;
    const desa=document.getElementById('edit-desa').value.trim();
    const kelompok=document.getElementById('edit-kelompok').value.trim();
    const user=document.getElementById('edit-user').value.trim();
    const luas=parseFloat(document.getElementById('edit-luas').value)||0;
    if (!desa||!kelompok||!user||!tanggal) { showAlert('Semua data wajib diisi','warning'); return; }
    const btn=document.getElementById('btn-update');
    btn.disabled=true; btn.innerHTML='<i class="ti ti-loader spin"></i> Menyimpan…';
    const row={tanggal,desa,kelompok_tani:kelompok,jenis_ltt:document.getElementById('edit-jenis').value,
      kegiatan:document.getElementById('edit-kegiatan').value,komoditas:document.getElementById('edit-komoditas').value,
      luas:parseFloat(luas.toFixed(2)),user_name:user};
    const { error } = await sbClient.from('laporan').update(row).eq('id',id);
    btn.disabled=false; btn.innerHTML='Simpan Perubahan';
    if (error) { showAlert('Gagal memperbarui: '+error.message,'error'); return; }
    tutupEditModal(); showAlert('Laporan berhasil diperbarui!','success');
    await renderTable(true); await renderRekap();
  }

  // ── EXPORT ──
  async function getExportRows() {
    const filterKomoditas=document.getElementById('t-filter-komoditas')?.value||'semua';
    const filterKegiatan=document.getElementById('t-filter-kegiatan')?.value||'semua';
    const all=await fetchAllForExport({ dateFrom:tableDateFrom, dateTo:tableDateTo, komoditas:filterKomoditas, kegiatan:filterKegiatan });
    return all.map(d=>({ Tanggal:d.tanggal, Desa:d.desa, 'Kelompok Tani':d.kelompok_tani,
      'Jenis LTT':d.jenis_ltt, Kegiatan:d.kegiatan, Komoditas:d.komoditas,
      'Luas (Ha)':parseFloat(d.luas), User:d.user_name }));
  }

  async function exportPDF() {
    showAlert('Menyiapkan data ekspor…','success');
    const rows=await getExportRows();
    if (!rows.length) { showAlert('Tidak ada data untuk diekspor','warning'); return; }
    try {
      const { jsPDF }=window.jspdf;
      const doc=new jsPDF('l','mm','a4');
      doc.setFont('helvetica','bold'); doc.setFontSize(16);
      doc.text('LAPORAN PERTANIAN',14,15);
      doc.setFontSize(10); doc.setFont('helvetica','normal');
      doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`,14,21);
      const headers=[['Tanggal','Desa','Kelompok Tani','Jenis LTT','Kegiatan','Komoditas','Luas (Ha)','User']];
      const body=rows.map(r=>[r.Tanggal,r.Desa,r['Kelompok Tani'],r['Jenis LTT'],r.Kegiatan,r.Komoditas,r['Luas (Ha)'].toFixed(1),r.User]);
      const totalLuas=rows.reduce((s,r)=>s+r['Luas (Ha)'],0);
      const foot=[['Total','','','','','',totalLuas.toFixed(1)+' Ha','']];
      doc.autoTable({ head:headers, body:body, foot:foot, startY:26, theme:'striped',
        headStyles:{fillColor:[45,92,46],textColor:[255,255,255],fontStyle:'bold'},
        footStyles:{fillColor:[240,245,240],textColor:[45,92,46],fontStyle:'bold'},
        styles:{font:'helvetica',fontSize:9}, columnStyles:{6:{halign:'right'}} });
      doc.save(`laporan_pertanian_${today()}.pdf`);
      showAlert('File PDF berhasil diunduh','success');
    } catch(error) { showAlert('Gagal mengekspor PDF: '+error.message,'error'); }
  }

  async function exportExcel() {
    showAlert('Menyiapkan data ekspor…','success');
    const rows=await getExportRows();
    if (!rows.length) { showAlert('Tidak ada data untuk diekspor','warning'); return; }
    const ws=XLSX.utils.json_to_sheet(rows);
    ws['!cols']=[{wch:12},{wch:20},{wch:22},{wch:16},{wch:14},{wch:12},{wch:12},{wch:16}];
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'Laporan');
    XLSX.writeFile(wb,`laporan_pertanian_${today()}.xlsx`);
    showAlert('File Excel berhasil diunduh','success');
  }

  function today() { return new Date().toISOString().split('T')[0]; }

  // ── TABS ──
  function switchTab(name) {
    ['input','data','rekap','produksi'].forEach(t=>{
      document.getElementById('panel-'+t).className='panel'+(t===name?' active':'');
      document.getElementById('tab-'+t).className='tab'+(t===name?' active':'');
    });
    if (name==='data')     renderTable(true);
    if (name==='rekap')    updateRekap();
    if (name==='produksi') renderProduksiTable();
  }

  // ── DOWNLOAD DROPDOWN ──
  function toggleDownloadDropdown() {
    const btn=document.getElementById('btn-download');
    const dd=document.getElementById('download-dropdown');
    const open=dd.classList.toggle('open');
    btn.classList.toggle('open',open);
  }
  function closeDownloadDropdown() {
    document.getElementById('download-dropdown')?.classList.remove('open');
    document.getElementById('btn-download')?.classList.remove('open');
  }

  // ── PRODUKSI ──
  let produksiRows=[], produksiIdCounter=0;
  const KOMODITAS_LIST=['Padi','Jagung','Kedelai'];

  function saveProduksiToLS() {
    localStorage.setItem(LS_PRODUKSI_KEY, JSON.stringify(produksiRows));
  }

  function loadProduksiFromLS() {
    const data = localStorage.getItem(LS_PRODUKSI_KEY);
    if (data) {
      try {
        produksiRows = JSON.parse(data);
        if (produksiRows.length > 0) {
          produksiIdCounter = Math.max(...produksiRows.map(r => r.id));
        }
      } catch (e) {
        console.error('Gagal memuat data produksi dari localStorage', e);
        produksiRows = [];
      }
    }
  }

  function tambahBarisProduksi() {
    const id=++produksiIdCounter;
    produksiRows.push({id,nama:'',desa:'',komoditas:'Padi',luas:'',karung:'',beratKarung:'',kadarAir:14});
    saveProduksiToLS();
    renderProduksiCards();
    setTimeout(()=>{
      const el=document.querySelector(`#calc-card-${id} .input-nama`);
      if(el) el.focus();
    },60);
  }

  function hapusBarisProduksi(id) {
    produksiRows=produksiRows.filter(r=>r.id!==id);
    saveProduksiToLS();
    renderProduksiCards();
  }

  function updateProduksiRow(id,field,value) {
    const row=produksiRows.find(r=>r.id===id);
    if (!row) return;
    row[field]=value;
    saveProduksiToLS();
    const nm=document.querySelector(`#calc-card-${id} .calc-card-name`);
    const sub=document.querySelector(`#calc-card-${id} .calc-card-sub`);
    if(nm){nm.textContent=row.nama||'Nama petani…';nm.classList.toggle('calc-card-name-placeholder',!row.nama);}
    if(sub) sub.textContent=[row.desa,row.komoditas].filter(Boolean).join(' · ')||'Desa · Komoditas';
    const {gkp,gkg,beras,produk}=calcProduksi(row);
    const setRes=(sel,val,dec)=>{
      const el=document.querySelector(`#calc-card-${id} ${sel}`);
      if(!el) return;
      el.textContent=val>0?fmt(val,dec):'—';
      el.classList.toggle('has-val',val>0);
    };
    setRes('.res-gkp',gkp,1); setRes('.res-gkg',gkg,1);
    setRes('.res-beras',beras,1); setRes('.res-produk',produk,3);
    renderTotalBar();
  }

  function calcProduksi(row) {
    const luas=parseFloat(row.luas)||0;
    const karung=parseFloat(row.karung)||0;
    const berat=parseFloat(row.beratKarung)||0;
    const ka=parseFloat(row.kadarAir)??14;
    const gkp=karung*berat;
    const gkg=ka<100?gkp*(100-ka)/86:0;
    const beras=gkg*0.63;
    const produk=luas>0?(gkp/luas/1000):0;
    return {gkp,gkg,beras,produk};
  }

  function fmt(n,dec=1) {
    if(!n||isNaN(n)) return '—';
    return n.toLocaleString('id-ID',{minimumFractionDigits:dec,maximumFractionDigits:dec});
  }

  function renderProduksiCards() {
    const container=document.getElementById('produksi-cards');
    if (!container) return;
    if (!produksiRows.length) {
      container.innerHTML=`<div class="produksi-empty"><i class="ti ti-scale"></i><strong>Belum ada data</strong>Klik "+ Tambah Petani" untuk mulai menghitung</div>`;
      renderTotalBar(); return;
    }
    container.innerHTML=produksiRows.map((row,idx)=>{
      const {gkp,gkg,beras,produk}=calcProduksi(row);
      const komodOpts=KOMODITAS_LIST.map(k=>`<option${k===row.komoditas?' selected':''}>${k}</option>`).join('');
      const subText=[row.desa,row.komoditas].filter(Boolean).join(' · ')||'Desa · Komoditas';
      return `<div class="calc-card" id="calc-card-${row.id}">
        <div class="calc-card-header">
          <div class="calc-card-num">${idx+1}</div>
          <div class="calc-card-identity">
            <div class="calc-card-name${!row.nama?' calc-card-name-placeholder':''}">${row.nama||'Nama petani…'}</div>
            <div class="calc-card-sub">${subText}</div>
          </div>
          <button class="btn-hapus-baris" onclick="hapusBarisProduksi(${row.id})" title="Hapus"><i class="ti ti-x"></i></button>
        </div>
        <div class="calc-card-body">
          <div class="calc-inputs">
            <div class="calc-field calc-field-full">
              <div class="calc-field-label">Nama Petani / Poktan</div>
              <input class="calc-input input-nama" value="${row.nama}" placeholder="Nama petani atau kelompok tani…"
                oninput="updateProduksiRow(${row.id},'nama',this.value)" />
            </div>
            <div class="calc-field">
              <div class="calc-field-label">Desa</div>
              <input class="calc-input" value="${row.desa}" placeholder="Nama desa…"
                oninput="updateProduksiRow(${row.id},'desa',this.value)" />
            </div>
            <div class="calc-field">
              <div class="calc-field-label">Komoditas</div>
              <select class="calc-input" onchange="updateProduksiRow(${row.id},'komoditas',this.value)">${komodOpts}</select>
            </div>
            <div class="calc-field">
              <div class="calc-field-label">Luas</div>
              <div class="calc-field-control">
                <input class="calc-input num" type="number" min="0" step="0.01" value="${row.luas}" placeholder="0,00"
                  oninput="updateProduksiRow(${row.id},'luas',this.value)" />
                <span class="calc-input-unit">Ha</span>
              </div>
            </div>
            <div class="calc-field">
              <div class="calc-field-label">Kadar Air</div>
              <div class="calc-field-control">
                <input class="calc-input num" type="number" min="0" max="99" step="0.1" value="${row.kadarAir}" placeholder="14"
                  oninput="updateProduksiRow(${row.id},'kadarAir',this.value)" />
                <span class="calc-input-unit">%</span>
              </div>
            </div>
            <div class="calc-field">
              <div class="calc-field-label">Jumlah Karung</div>
              <div class="calc-field-control">
                <input class="calc-input num" type="number" min="0" step="1" value="${row.karung}" placeholder="0"
                  oninput="updateProduksiRow(${row.id},'karung',this.value)" />
                <span class="calc-input-unit">krg</span>
              </div>
            </div>
            <div class="calc-field">
              <div class="calc-field-label">Berat Rata-rata</div>
              <div class="calc-field-control">
                <input class="calc-input num" type="number" min="0" step="0.1" value="${row.beratKarung}" placeholder="0,0"
                  oninput="updateProduksiRow(${row.id},'beratKarung',this.value)" />
                <span class="calc-input-unit">kg</span>
              </div>
            </div>
          </div>
          <div class="calc-results">
            <div class="calc-result-item">
              <div class="calc-result-label">GKP</div>
              <div class="calc-result-val res-gkp${gkp>0?' has-val':''}">${gkp>0?fmt(gkp):'—'}</div>
              <div class="calc-result-unit">Gabah Kering Panen</div>
            </div>
            <div class="calc-result-item">
              <div class="calc-result-label">GKG</div>
              <div class="calc-result-val res-gkg${gkg>0?' has-val':''}">${gkg>0?fmt(gkg):'—'}</div>
              <div class="calc-result-unit">KA standar 14%</div>
            </div>
            <div class="calc-result-item">
              <div class="calc-result-label">Beras</div>
              <div class="calc-result-val res-beras${beras>0?' has-val':''}">${beras>0?fmt(beras):'—'}</div>
              <div class="calc-result-unit">rendemen 63%</div>
            </div>
            <div class="calc-result-item">
              <div class="calc-result-label">Produktivitas</div>
              <div class="calc-result-val res-produk${produk>0?' has-val':''}">${produk>0?fmt(produk,3):'—'}</div>
              <div class="calc-result-unit">ton / Ha</div>
            </div>
          </div>
        </div>
      </div>`;
    }).join('');
    renderTotalBar();
  }

  function renderTotalBar() {
    const wrap=document.getElementById('produksi-total-wrap');
    if (!wrap) return;
    if (!produksiRows.length) { wrap.innerHTML=''; return; }
    let totalLuas=0,totalGKP=0,totalGKG=0,totalBeras=0;
    produksiRows.forEach(row=>{
      const c=calcProduksi(row);
      totalLuas+=parseFloat(row.luas)||0;
      totalGKP+=c.gkp; totalGKG+=c.gkg; totalBeras+=c.beras;
    });
    const totalProduk=totalLuas>0?(totalGKP/totalLuas/1000):0;
    wrap.innerHTML=`<div class="produksi-total-bar">
      <div class="ptb-item"><div class="ptb-label">Total Luas</div><div class="ptb-val">${fmt(totalLuas,2)}</div><div class="ptb-unit">Hektar</div></div>
      <div class="ptb-item"><div class="ptb-label">Total GKP</div><div class="ptb-val">${fmt(totalGKP)}</div><div class="ptb-unit">kg</div></div>
      <div class="ptb-item"><div class="ptb-label">Total GKG</div><div class="ptb-val">${fmt(totalGKG)}</div><div class="ptb-unit">kg</div></div>
      <div class="ptb-item"><div class="ptb-label">Total Beras</div><div class="ptb-val">${fmt(totalBeras)}</div><div class="ptb-unit">kg</div></div>
      <div class="ptb-item"><div class="ptb-label">Produktivitas Rata-rata</div><div class="ptb-val">${fmt(totalProduk,3)}</div><div class="ptb-unit">ton/Ha</div></div>
    </div>`;
  }

  function renderProduksiTable() { renderProduksiCards(); }

  // ── EXPOSE ──
  window.switchTab=switchTab; window.tambahBarisProduksi=tambahBarisProduksi;
  window.hapusBarisProduksi=hapusBarisProduksi; window.updateProduksiRow=updateProduksiRow;
  window.simpanData=simpanData; window.hapusData=hapusData;
  window.exportPDF=exportPDF; window.exportExcel=exportExcel;
  window.toggleDownloadDropdown=toggleDownloadDropdown; window.closeDownloadDropdown=closeDownloadDropdown;
  window.connectSupabase=connectSupabase; window.retryConnection=retryConnection;
  window.setRekapFilter=setRekapFilter; window.handleTableSearchFilter=handleTableSearchFilter;
  window.changePage=changePage; window.goToPage=goToPage;
  window.bukaEditModal=bukaEditModal; window.tutupEditModal=tutupEditModal; window.updateData=updateData;
  window.setTableDatePreset=setTableDatePreset; window.setRekapDatePreset=setRekapDatePreset;
  window.toggleWaktuDropdown=toggleWaktuDropdown;
  window.applyTableCustomRange=applyTableCustomRange; window.applyRekapCustomRange=applyRekapCustomRange;
  window.toggleTheme=toggleTheme; window.resetInputForm=resetInputForm;
  window.bukaSettingsModal=bukaSettingsModal; window.tutupSettingsModal=tutupSettingsModal;
  window.simpanSettings=simpanSettings;

  // ── BOOT ──
  document.getElementById('f-tanggal').value=today();
  init();
