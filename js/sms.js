(() => {
  let result = [];

  function decodeBasic(value){
    return value.replace(/<br\s*\/?>(?:\r?\n)?/gi, '\n')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>');
  }

  function cleanCell(value){
    return value.trim()
      .replace(/^\\\|/, '|')
      .replace(/\\([*_~])/g, '$1');
  }

  function parseMarkdownTable(text){
    const rows = [];

    for (const raw of text.split(/\r?\n/)){
      if (!raw.trim().startsWith('|')) continue;

      const cells = raw.trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map(value => value.trim());

      if (cells.length < 10) continue;
      if (/^[-: ]+$/.test(cells[0])) continue;
      if (!/^\d+$/.test(cells[0])) continue;

      const sender = cells[4] || '';
      const date = (cells[cells.length - 1].match(/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/) || [''])[0];
      let message = decodeBasic(cells[8] || '');

      message = message.replace(/^발신:\s*[0-9-]+\s*\n?/, '');

      const parts = message.split('\n').map(cleanCell).filter(Boolean);
      if (parts.length) rows.push({ message: parts.join('\n'), date, sender });
    }

    return rows;
  }

  function parseRaw(text){
    const lines = decodeBasic(text).replace(/\r\n?/g, '\n').split('\n');
    const rows = [];
    let index = 0;

    while (index < lines.length){
      const columns = lines[index].split('\t');
      const isStart = columns.length >= 8 &&
        /^\d+$/.test((columns[0] || '').trim()) &&
        /^(sms|lms)$/i.test((columns[6] || '').trim());

      if (!isStart){
        index++;
        continue;
      }

      const sender = (columns[4] || '').trim();
      let content = columns.slice(8).join('\t');
      const collected = [];
      let date = '';

      content = content.replace(/^발신:\s*[0-9-]+\s*/, '');

      const tail = content.match(/^(.*?)(?:\t)(\d{1,3}(?:\.\d{1,3}){3})(?:\t)(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s*$/);
      if (tail){
        if (tail[1].trim()) collected.push(tail[1].trim());
        date = tail[3].slice(0, 16);
        index++;
      } else {
        if (content.trim()) collected.push(content.trim());
        index++;

        while (index < lines.length){
          const next = lines[index];
          const nextColumns = next.split('\t');
          const nextStart = nextColumns.length >= 8 &&
            /^\d+$/.test((nextColumns[0] || '').trim()) &&
            /^(sms|lms)$/i.test((nextColumns[6] || '').trim());

          if (nextStart) break;

          const end = next.match(/^(.*?)(?:\t)(\d{1,3}(?:\.\d{1,3}){3})(?:\t)(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s*$/);
          if (end){
            if (end[1].trim()) collected.push(end[1].trim());
            date = end[3].slice(0, 16);
            index++;
            break;
          }

          if (next.trim()) collected.push(next.trim());
          index++;
        }
      }

      const messageParts = collected.map(cleanCell).filter(Boolean);
      if (messageParts.length) rows.push({ message: messageParts.join('\n'), date, sender });
    }

    return rows;
  }

  function setStatus(text){
    document.getElementById('status').textContent = text;
  }

  function render(){
    const body = document.getElementById('body');
    body.innerHTML = '';

    if (!result.length){
      body.innerHTML = '<tr><td colspan="3">변환 결과가 없습니다.</td></tr>';
      document.getElementById('records').textContent = '문의 0건';
      document.getElementById('rows').textContent = '출력 0행';
      return;
    }

    let records = 0;
    result.forEach(item => {
      if (item.date) records++;

      const row = document.createElement('tr');
      [item.message, item.date, item.sender].forEach(value => {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
      });
      body.appendChild(row);
    });

    document.getElementById('records').textContent = `문의 ${records}건`;
    document.getElementById('rows').textContent = `출력 ${result.length}행`;
  }

  function transform(){
    const input = document.getElementById('input');
    const text = input.value.trim();

    if (!text){
      setStatus('원본 내용을 붙여넣어 주세요.');
      return;
    }

    result = text.split(/\r?\n/).some(line => line.trim().startsWith('|'))
      ? parseMarkdownTable(text)
      : parseRaw(text);

    render();
    setStatus(result.length ? '변환이 완료되었습니다.' : '인식 가능한 SMS 로그를 찾지 못했습니다.');
  }

  function tsvCell(value){
    const text = String(value ?? '');
    return /[\t\n"]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function makeTSV(){
    return [
      '메시지\t발신날짜\t발신번호',
      ...result.map(item => [item.message, item.date, item.sender].map(tsvCell).join('\t'))
    ].join('\r\n');
  }

  function escapeHtml(value){
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function copyTSV(){
    if (!result.length) transform();
    if (!result.length) return;

    const plain = makeTSV();
    const htmlRows = result.map(item =>
      '<tr>' +
        '<td style="text-align:left;mso-horizontal-page-align:left;">' + escapeHtml(item.message).replace(/\n/g, '<br>') + '</td>' +
        '<td>' + escapeHtml(item.date) + '</td>' +
        '<td>' + escapeHtml(item.sender) + '</td>' +
      '</tr>'
    ).join('');
    const htmlTable = '<table border="1" cellspacing="0" cellpadding="0">' +
      '<tr><th>메시지</th><th>발신날짜</th><th>발신번호</th></tr>' + htmlRows +
      '</table>';

    try {
      if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write){
        const item = new ClipboardItem({
          'text/plain': new Blob([plain], { type: 'text/plain' }),
          'text/html': new Blob([htmlTable], { type: 'text/html' })
        });
        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(plain);
      }
      setStatus('복사했습니다. Excel A1 셀에 붙여넣으면 메시지 / 발신날짜 / 발신번호 3개 칸으로 들어갑니다.');
    } catch (error) {
      const fallback = document.createElement('textarea');
      fallback.value = plain;
      document.body.appendChild(fallback);
      fallback.select();
      document.execCommand('copy');
      fallback.remove();
      setStatus('복사했습니다. Excel A1 셀에 붙여넣으세요.');
    }
  }

  function csvCell(value){
    return `"${String(value).replace(/"/g, '""')}"`;
  }

  function downloadCSV(){
    if (!result.length) transform();
    if (!result.length) return;

    const csv = [
      '메시지,발신날짜,발신번호',
      ...result.map(item => [item.message, item.date, item.sender].map(csvCell).join(','))
    ].join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'SMS_추출결과.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function downloadXLSX(){
    if (!result.length) transform();
    if (!result.length) return;

    try {
      if (typeof XLSX === 'undefined'){
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const data = [
        ['메시지', '발신날짜', '발신번호'],
        ...result.map(item => [item.message, item.date, item.sender])
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      worksheet['!cols'] = [{ wch: 60 }, { wch: 19 }, { wch: 16 }];
      const range = XLSX.utils.decode_range(worksheet['!ref']);

      for (let row = 0; row <= range.e.r; row++){
        const messageCell = worksheet[XLSX.utils.encode_cell({ r: row, c: 0 })];
        if (messageCell){
          messageCell.s = messageCell.s || {};
          messageCell.s.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
        }

        for (let column = 1; column <= 2; column++){
          const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: column })];
          if (cell){
            cell.s = cell.s || {};
            cell.s.alignment = { vertical: 'center' };
          }
        }
      }

      delete worksheet['!rows'];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'SMS 추출결과');
      XLSX.writeFile(workbook, 'SMS_추출결과.xlsx');
      setStatus('XLSX 파일을 다운로드했습니다.');
    } catch (error) {
      setStatus('XLSX 생성 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.');
    }
  }

  document.getElementById('convert').addEventListener('click', transform);
  document.getElementById('copy').addEventListener('click', copyTSV);
  document.getElementById('download').addEventListener('click', downloadCSV);
  document.getElementById('downloadXlsx').addEventListener('click', downloadXLSX);
  document.getElementById('clear').addEventListener('click', () => {
    document.getElementById('input').value = '';
    result = [];
    render();
    setStatus('');
  });
  document.getElementById('sample').addEventListener('click', () => {
    document.getElementById('input').value = `198667\t0\t1240\t01043261210\t1544-7813\t완료\tsms\t1\t테스트 테스트 입니다.\t3.172.39.18\t2026-06-18 13:02:35
198361\t0\t65535\t01043261210\t010-1111-2222\t완료\tsms\t1\t발신:010-1111-2222
테스트 입니다.\t3.172.39.18\t2026-06-16 15:38:43
175227\t0\t1240\t01043261210\t1544-7813\t완료\tsms\t1\t[스마트로그] 본인확인
인증번호(330711)를 입력하세요.\t3.172.39.9\t2025-09-30 13:46:38`;
    transform();
  });
  document.getElementById('input').addEventListener('paste', () => setTimeout(transform, 0));

  render();
})();
