(() => {
const $ = id => document.getElementById(id);

function cleanLine(s){
  return s
    .replace(/\r/g,'')
    .replace(/\[([^\]]+)\]\([^)]+\)/g,'$1')   // Markdown link -> label
    .replace(/\u00a0/g,' ')
    .trim();
}

function cleanIp(s){
  return s.replace(/signal_cellular_alt/gi,'').trim();
}

function isIpLine(s){
  const v = cleanIp(s);
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(v);
}

function isDate(s){
  return /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(s);
}

function isDuration(s){
  return /^(?:(?:\d+\s*시간)\s*)?(?:(?:\d+\s*분)\s*)?(?:\d+\s*초)$/.test(s);
}

function normalizeAdType(s){
  return s.replace(/\s+/g,' ').trim();
}

function parseRecord(lines){
  if(!lines.length) return null;

  const ip = cleanIp(lines[0] || '');
  const dateIndex = lines.findIndex(isDate);
  if(!isIpLine(lines[0] || '') || dateIndex < 1) return null;

  const visitTime = lines[dateIndex];
  const duration = (lines[dateIndex + 1] && isDuration(lines[dateIndex + 1])) ? lines[dateIndex + 1] : '';

  const before = lines.slice(1, dateIndex).filter(Boolean);

  // 클릭유형
  const clickIndex = before.findIndex(v => /^광고-(유효|무효)$/.test(v));
  const clickType = clickIndex >= 0 ? before[clickIndex] : '';

  // 광고사이트: 도메인 형태
  const domainIndex = before.findIndex(v =>
    /^(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/.*)?$/i.test(v)
  );
  const adSite = domainIndex >= 0
    ? before[domainIndex].replace(/^https?:\/\//i,'').replace(/\/.*$/,'')
    : '';

  // 광고종류: 첫 번째 유입종류만 사용.
  // "네이버 통합검색 - 모바일/PC", "네이버 쇼핑 - PC", "네이버플러스 스토어 - PC" 등
  // 세부 노출 위치는 결과에서 제외.
  let adType = '';
  for(let i=0;i<before.length;i++){
    const v = before[i];
    if(/^광고-(유효|무효)$/.test(v)) continue;
    if(v === adSite) continue;
    if(/^(네이버 통합검색|네이버 쇼핑|네이버플러스 스토어)\s*-\s*(PC|모바일)$/i.test(v)) continue;
    if(/^(네이버 파워링크|네이버 쇼핑검색|네이버 검색)$/i.test(v) ||
       /Google 검색/i.test(v) || /구글.*Google 검색/i.test(v)){
      adType = normalizeAdType(v);
      break;
    }
  }

  // 구글 마크다운 이미지/표시가 섞인 경우 표준화
  if(/Google 검색/i.test(adType)) adType = '구글 Google 검색';

  // 키워드: 도메인 다음부터 날짜 전까지의 일반 텍스트.
  let keyword = '';
  if(domainIndex >= 0){
    const candidates = before.slice(domainIndex + 1).filter(v =>
      v && !/^광고-(유효|무효)$/.test(v) && v !== adSite
    );
    if(candidates.length) keyword = candidates.join(' ');
  }

  return {
    visitTime, ip, clickType, adType, adSite, keyword, duration
  };
}

function splitRecords(raw){
  // 빈 줄 유무와 관계없이 IP 행을 새 레코드 시작점으로 사용
  const lines = raw.split('\n').map(cleanLine).filter(v => v !== '');
  const records = [];
  let current = [];

  for(const line of lines){
    if(isIpLine(line)){
      if(current.length) records.push(current);
      current = [line];
    } else if(current.length){
      current.push(line);
    }
  }
  if(current.length) records.push(current);
  return records;
}

function toTSV(raw){
  const header = ['방문시간','IP','클릭유형','광고종류','광고사이트','키워드','체류시간'];
  const chunks = splitRecords(raw);
  const parsed = chunks.map(parseRecord).filter(Boolean);

  const rows = parsed.map(r => [
    r.visitTime, r.ip, r.clickType, r.adType, r.adSite, r.keyword, r.duration
  ].map(v => String(v ?? '').replace(/\t/g,' ').replace(/\n/g,' ')).join('\t'));

  return {
    text: [header.join('\t'), ...rows].join('\n'),
    total: chunks.length,
    parsed: parsed.length
  };
}

  $('sessionid-convert').addEventListener('click', () => {
  const raw = $('sessionid-input').value;
  if(!raw.trim()){
    $('sessionid-output').value = '';
    $('sessionid-input-status').className = 'status err';
    $('sessionid-input-status').textContent = '로그 데이터를 붙여넣어 주세요.';
    return;
  }

  const result = toTSV(raw);
  $('sessionid-output').value = result.text;
  $('sessionid-input-status').className = 'status ok';
  $('sessionid-input-status').textContent = `감지 ${result.total}건 / 변환 ${result.parsed}건`;
  $('sessionid-output-status').className = result.parsed ? 'status ok' : 'status err';
  $('sessionid-output-status').textContent = result.parsed
    ? `${result.parsed}건 전체를 TSV로 변환했습니다.`
    : '변환 가능한 로그 형식을 찾지 못했습니다.';
});

  $('sessionid-copy').addEventListener('click', async () => {
  const text = $('sessionid-output').value;
  if(!text) return;
  try{
    await navigator.clipboard.writeText(text);
    $('sessionid-output-status').className = 'status ok';
    $('sessionid-output-status').textContent = 'TSV 전체를 클립보드에 복사했습니다.';
  }catch(e){
    $('sessionid-output').focus();
    $('sessionid-output').select();
    document.execCommand('copy');
    $('sessionid-output-status').className = 'status ok';
    $('sessionid-output-status').textContent = 'TSV 전체를 클립보드에 복사했습니다.';
  }
});


function getTableData(){
  const text = $('sessionid-output').value.trim();
  if(!text) return [];
  return text.split('\n').map(row => row.split('\t'));
}

function ensureResult(){
  if(!$('sessionid-output').value.trim() && $('sessionid-input').value.trim()){
    $('sessionid-convert').click();
  }
  return $('sessionid-output').value.trim().length > 0;
}

function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvEscape(value){
  const s = String(value ?? '');
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

  $('sessionid-csv-download').addEventListener('click', () => {
  if(!ensureResult()) return;
  const data = getTableData();
  const csv = '\uFEFF' + data.map(row => row.map(csvEscape).join(',')).join('\r\n');
  downloadBlob(new Blob([csv], {type:'text/csv;charset=utf-8;'}), 'smartlog_log.csv');
  $('sessionid-output-status').className = 'status ok';
  $('sessionid-output-status').textContent = 'CSV 파일을 다운로드했습니다.';
});

  $('sessionid-xlsx-download').addEventListener('click', () => {
  if(!ensureResult()) return;
  if(typeof XLSX === 'undefined'){
    $('sessionid-output-status').className = 'status err';
    $('sessionid-output-status').textContent = 'XLSX 라이브러리를 불러오지 못했습니다. 인터넷 연결 후 다시 시도해 주세요.';
    return;
  }

  const data = getTableData();
  const ws = XLSX.utils.aoa_to_sheet(data);

  // 보기 편한 기본 열 너비
  ws['!cols'] = [
    {wch:20}, // 방문시간
    {wch:17}, // IP
    {wch:12}, // 클릭유형
    {wch:25}, // 광고종류
    {wch:28}, // 광고사이트
    {wch:30}, // 키워드
    {wch:12}  // 체류시간
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '로그');
  XLSX.writeFile(wb, 'smartlog_log.xlsx');

  $('sessionid-output-status').className = 'status ok';
  $('sessionid-output-status').textContent = 'XLSX 파일을 다운로드했습니다.';
});

  $('sessionid-clear').addEventListener('click', () => {
  $('sessionid-input').value = '';
  $('sessionid-output').value = '';
  $('sessionid-input-status').textContent = '';
  $('sessionid-output-status').textContent = '';
  $('sessionid-input').focus();
});
  })();
