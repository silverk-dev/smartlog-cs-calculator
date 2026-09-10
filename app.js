(() => {
  // =========================================================
  // Version
  // 새 버전을 배포할 때 이 값만 먼저 변경하세요.
  // PATCH: 1.0.0 → 1.0.1 (오타/버그/작은 UI 수정)
  // MINOR: 1.0.0 → 1.1.0 (기능 추가)
  // MAJOR: 1.0.0 → 2.0.0 (큰 정책/계산 구조 변경)
  // =========================================================
  const APP_VERSION = '1.0.0';
  const RELEASE_DATE = '2026-09-10';
  const PRICING_YEAR = '2026';

  const $ = s => document.querySelector(s);
  let mode = 'refund';

  function renderVersion(){
    const versionText = `v${APP_VERSION}`;
    const headerVersion = $('#app-version');
    const footerVersion = $('#footer-version');

    if (headerVersion) headerVersion.textContent = versionText;
    if (footerVersion) footerVersion.textContent = versionText;

    document.title = `스마트로그 CS 전용 계산기 ${versionText}`;

    const metaVersion = document.querySelector('meta[name="application-version"]');
    if (metaVersion) metaVersion.setAttribute('content', APP_VERSION);
  }

  const generalPvs = [10,20,30,40,50,60,70,80,90,100,110,120,130,140,150,160,170,180,190,200,250,300];
  const partnerPvs = [10,20,30,40,50,60,70,80,90,100];

  const money = n => Number.isFinite(n) ? Math.round(n).toLocaleString('ko-KR') + '원' : '-';
  const floor100 = n => Math.floor((n + 0.000001) / 100) * 100;
  const refundMonthly = pv => 18700 + (1100 * pv);
  const generalMonthlyNet = pv => 17000 + (1000 * pv);
  const labelPv = pv => pv + '만PV';

  const generalDiscount = months => {
    if (months === 6) return 0.10;
    if (months === 12) return 0.20;
    if (months === 24) return 0.30;
    return 0;
  };

  function generalTotal(){
    const pv = Number($('#refund-pv').value);
    const months = Number($('#general-months').value);
    if (pv >= 300 && months !== 1) return null;
    return floor100(generalMonthlyNet(pv) * months * (1 - generalDiscount(months)) * 1.1);
  }

  function partnerTotal(){
    const pv = Number($('#refund-pv').value);
    const discount = Number($('#discount').value);
    const months = Number($('#months').value);
    return floor100(refundMonthly(pv) * (1 - discount / 100) * months);
  }

  function dateUTC(value){
    if (!value) return null;
    const [y,m,d] = value.split('-').map(Number);
    return new Date(Date.UTC(y,m-1,d));
  }

  function daysInclusive(a,b){
    return Math.floor((b-a)/86400000)+1;
  }

  function fillSelect(el, values, preferred){
    const old = Number(el.value);
    el.innerHTML = '';
    values.forEach(v => {
      const o = document.createElement('option');
      o.value = String(v);
      o.textContent = labelPv(v);
      el.appendChild(o);
    });
    const selected = values.includes(old) ? old : (values.includes(preferred) ? preferred : values[0]);
    el.value = String(selected);
  }

  function updateGeneralMonthAvailability(){
    const pv = Number($('#refund-pv').value);
    const sel = $('#general-months');
    [...sel.options].forEach(o => {
      o.disabled = pv >= 300 && Number(o.value) !== 1;
    });
    if (pv >= 300) sel.value = '1';
  }

  function updatePrices(){
    if ($('#member').value === 'general'){
      updateGeneralMonthAvailability();
      const total = generalTotal();
      const months = Number($('#general-months').value);
      const discount = generalDiscount(months);
      $('#general-total').textContent = total === null ? '1개월만 이용 가능' : money(total);
      $('#general-discount-badge').textContent = discount ? Math.round(discount * 100) + '% 할인' : '할인 없음';
    } else {
      $('#partner-total').textContent = money(partnerTotal());
    }
  }

  function updatePvOptions(){
    const partner = $('#member').value === 'partner';
    fillSelect($('#refund-pv'), partner ? partnerPvs : generalPvs, 10);
    fillSelect($('#current-pv'), partner ? partnerPvs : generalPvs.filter(v => v <= 200), 10);
    const cur = Number($('#current-pv').value) || 10;
    const targets = (partner ? partnerPvs : generalPvs).filter(v => v > cur);
    fillSelect($('#target-pv'), targets.length ? targets : [cur], 20);
    updatePrices();
  }

  function clearResults(){
    $('#main-result').textContent = '-';
    $('#result-note').textContent = '조건을 입력한 후 계산해 주세요.';
    ['#d-days','#d-monthly','#d-daily','#d-work','#d-floor'].forEach(s => $(s).textContent = '-');
    $('#cs-text').value = '';
    $('#validation').textContent = '';
    $('#copy-status').textContent = '';
  }

  function syncUI(){
    const partner = $('#member').value === 'partner';

    $('#refund-fields').classList.toggle('hidden', mode !== 'refund');
    $('#upgrade-fields').classList.toggle('hidden', mode !== 'upgrade');

    $('#general-month-wrap').classList.toggle('hidden', partner);
    $('#general-price-box').classList.toggle('hidden', partner);
    $('#partner-refund-options').classList.toggle('hidden', !partner);
    $('#partner-price-box').classList.toggle('hidden', !partner);
    $('#upgrade-partner-options').classList.toggle('hidden', !partner);

    $('#result-label').textContent = mode === 'refund' ? '최종 환불금액' : '최종 추가 결제금액';
    $('#d-work-label').textContent = mode === 'refund' ? '사용금액' : '추가금액';

    $('#tab-refund').classList.toggle('active', mode === 'refund');
    $('#tab-upgrade').classList.toggle('active', mode === 'upgrade');

    updatePvOptions();
    clearResults();
  }

  function validDates(a,b,msg){
    if(!a || !b){
      $('#validation').textContent = '날짜를 모두 입력해 주세요.';
      return false;
    }
    if(b < a){
      $('#validation').textContent = msg;
      return false;
    }
    return true;
  }

  function calculateRefund(){
    const partner = $('#member').value === 'partner';
    const pv = Number($('#refund-pv').value);
    const start = dateUTC($('#start-date').value);
    const end = dateUTC($('#refund-date').value);

    if(!validDates(start,end,'환불 요청일은 서비스 시작일보다 빠를 수 없습니다.')) return;

    const days = daysInclusive(start,end);
    let paid, monthly, daily, used, usedFloor, period;

    if(partner){
      period = Number($('#months').value);
      paid = partnerTotal();
      monthly = paid / period;
      daily = monthly / 30;
      used = daily * days;
      usedFloor = floor100(used);
    } else {
      period = Number($('#general-months').value);
      paid = generalTotal();

      if(paid === null){
        $('#validation').textContent = '300만PV는 1개월 선불제만 선택할 수 있습니다.';
        return;
      }

      monthly = refundMonthly(pv);
      daily = monthly / 30;
      used = daily * days;
      usedFloor = floor100(used);
    }

    const refund = paid - usedFloor;

    $('#validation').textContent = '';
    $('#main-result').textContent = money(refund);
    $('#main-result').style.color = refund < 0 ? '#fecaca' : '#ffffff';
    $('#result-note').textContent = refund < 0
      ? '계산상 사용금액이 결제금액을 초과합니다. 실제 처리 기준을 확인해 주세요.'
      : (partner ? '파트너 결제기간 기준으로 계산된 환불금액입니다.' : '실제 결제금액에서 월 정가 기준 사용요금을 차감했습니다.');

    $('#d-days').textContent = days + '일';
    $('#d-monthly').textContent = money(monthly);
    $('#d-daily').textContent = money(daily);
    $('#d-work').textContent = money(used);
    $('#d-floor').textContent = money(usedFloor);

    $('#cs-text').value =
`[환불 계산]
회원구분: ${partner ? '일반 파트너회원' : '일반회원'}
페이지뷰: ${labelPv(pv)}
결제기간: ${period}개월${partner ? ` / ${$('#discount').value}% 할인` : ''}
실제 결제금액: ${money(paid)}
서비스 사용일: ${days}일
사용요금(100원 단위 절삭): ${money(usedFloor)}
최종 환불금액: ${money(refund)}`;
  }

  function calculateUpgrade(){
    const partner = $('#member').value === 'partner';
    const cur = Number($('#current-pv').value);
    const target = Number($('#target-pv').value);

    if(target <= cur){
      $('#validation').textContent = '업그레이드 PV는 현재 PV보다 높아야 합니다.';
      return;
    }

    const req = dateUTC($('#request-date').value);
    const end = dateUTC($('#end-date').value);

    if(!validDates(req,end,'기존 만기일은 업그레이드 요청일보다 빠를 수 없습니다.')) return;

    const days = daysInclusive(req,end);
    const monthlyDelta = refundMonthly(target) - refundMonthly(cur);
    const daily = monthlyDelta / 30;
    const beforeDiscount = daily * days;
    const factor = partner ? 1 - Number($('#upgrade-discount').value)/100 : 1;
    const amount = beforeDiscount * factor;
    const final = floor100(amount);

    $('#validation').textContent = '';
    $('#main-result').textContent = money(final);
    $('#main-result').style.color = '#ffffff';
    $('#result-note').textContent = partner
      ? `파트너 ${$('#upgrade-discount').value}% 할인을 적용했습니다.`
      : '만기일까지 남은 기간을 30일 기준으로 일할 계산했습니다.';

    $('#d-days').textContent = days + '일';
    $('#d-monthly').textContent = money(monthlyDelta);
    $('#d-daily').textContent = money(daily);
    $('#d-work').textContent = money(amount);
    $('#d-floor').textContent = money(final);

    $('#cs-text').value =
`[PV 업그레이드 계산]
회원구분: ${partner ? '일반 파트너회원' : '일반회원'}
변경: ${labelPv(cur)} → ${labelPv(target)}${partner ? `\n파트너 할인율: ${$('#upgrade-discount').value}%` : ''}
만기일까지 남은 기간: ${days}일
월 추가요금: ${money(monthlyDelta)}
최종 추가 결제금액(100원 단위 절삭): ${money(final)}`;
  }

  $('#calc-form').addEventListener('submit', e => {
    e.preventDefault();
    mode === 'refund' ? calculateRefund() : calculateUpgrade();
  });

  $('#tab-refund').addEventListener('click', () => { mode='refund'; syncUI(); });
  $('#tab-upgrade').addEventListener('click', () => { mode='upgrade'; syncUI(); });
  $('#member').addEventListener('change', syncUI);

  $('#refund-pv').addEventListener('change', () => { updatePrices(); clearResults(); });
  $('#general-months').addEventListener('change', () => { updatePrices(); clearResults(); });
  $('#discount').addEventListener('change', () => { updatePrices(); clearResults(); });
  $('#months').addEventListener('change', () => { updatePrices(); clearResults(); });

  $('#current-pv').addEventListener('change', () => {
    const partner = $('#member').value === 'partner';
    const cur = Number($('#current-pv').value);
    const targets = (partner ? partnerPvs : generalPvs).filter(v => v > cur);
    fillSelect($('#target-pv'), targets.length ? targets : [cur], targets[0]);
    clearResults();
  });

  $('#reset-btn').addEventListener('click', () => {
    $('#calc-form').reset();
    mode='refund';
    syncUI();
  });

  $('#copy-btn').addEventListener('click', async () => {
    const text = $('#cs-text').value.trim();
    if(!text){
      $('#copy-status').textContent = '먼저 계산을 실행해 주세요.';
      return;
    }
    try{
      await navigator.clipboard.writeText(text);
      $('#copy-status').textContent = '계산 문구를 복사했습니다.';
    }catch(e){
      $('#cs-text').focus();
      $('#cs-text').select();
      $('#copy-status').textContent = '문구가 선택되었습니다. Ctrl+C로 복사해 주세요.';
    }
  });

  renderVersion();
  syncUI();
})();
