(() => {
  // 버전 정보는 version.js 한 곳에서만 관리합니다.
  const APP_META = window.APP_META || {
    version: '0.0.0',
    releaseDate: '',
    pricingYear: ''
  };
  const APP_VERSION = APP_META.version;
  const RELEASE_DATE = APP_META.releaseDate;
  const PRICING_YEAR = APP_META.pricingYear;

  const $ = s => document.querySelector(s);
  let mode = 'refund';

  function renderVersion(){
    const versionText = `v${APP_VERSION}`;
    const headerVersion = $('#app-version');
    const footerVersion = $('#footer-version');
    const pricingYear = $('#pricing-year');

    if (headerVersion) headerVersion.textContent = versionText;
    if (footerVersion) footerVersion.textContent = versionText;
    if (pricingYear) pricingYear.textContent = PRICING_YEAR;

    document.title = `스마트로그 CX 전용 계산기 ${versionText}`;

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

  function partnerEffectiveDiscount(){
    const selectedDiscount = Number($('#discount').value);
    const months = Number($('#months').value);

    // 24개월 상품은 기본 30% 할인이 적용됩니다.
    // 선택한 파트너 할인율이 30%보다 낮으면 30%를 우선 적용하고,
    // 30%보다 높은 할인율(예: 36%, 42.5%, 43%)은 그대로 적용합니다.
    return months === 24 ? Math.max(selectedDiscount, 30) : selectedDiscount;
  }

  function updatePartnerMonthLabel(){
    const selectedDiscount = Number($('#discount').value);
    const month24Option = [...$('#months').options].find(option => Number(option.value) === 24);

    if (!month24Option) return;

    month24Option.textContent = selectedDiscount === 25
      ? '24개월 · 최소 30% 할인'
      : '24개월';
  }

  function partnerTotal(){
    const pv = Number($('#refund-pv').value);
    const months = Number($('#months').value);
    const effectiveDiscount = partnerEffectiveDiscount();
    return floor100(refundMonthly(pv) * (1 - effectiveDiscount / 100) * months);
  }

  function dateUTC(value){
    if (!value) return null;
    const trimmed = value.trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (!match) return null;

    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    const date = new Date(Date.UTC(y, m - 1, d));

    if (
      date.getUTCFullYear() !== y ||
      date.getUTCMonth() !== m - 1 ||
      date.getUTCDate() !== d
    ) return null;

    return date;
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

  function upgradeHistoryRows(){
    return [...document.querySelectorAll('.upgrade-history-row')];
  }

  function createUpgradeHistoryRow(values = {}){
    const row = document.createElement('div');
    row.className = 'upgrade-history-row';

    const dateValue = values.date || '';

    const isPartner = $('#member').value === 'partner';
    const availablePvs = isPartner ? partnerPvs : generalPvs;
    const currentPv = Number($('#refund-pv').value) || 10;
    const defaultPv =
      availablePvs.find(pv => pv > currentPv) ||
      availablePvs[availablePvs.length - 1];

    const pvValue = availablePvs.includes(Number(values.pv))
      ? Number(values.pv)
      : defaultPv;

    const amountValue = values.amount ?? '';

    row.innerHTML = `
      <div class="field">
        <label>업그레이드일</label>
        <input class="history-date" type="date" value="${dateValue}">
      </div>
      <div class="field">
        <label>변경 후 PV</label>
        <select class="history-pv"></select>
      </div>
      <div class="field">
        <label>추가 결제금액</label>
        <div class="money-input-wrap">
          <input class="history-amount" type="number" inputmode="numeric" min="0" step="100" placeholder="예: 22300" value="${amountValue}">
          <span>원</span>
        </div>
      </div>
      <button type="button" class="remove-history" aria-label="업그레이드 이력 삭제">삭제</button>
    `;

    const select = row.querySelector('.history-pv');
    availablePvs.forEach(pv => {
      const option = document.createElement('option');
      option.value = String(pv);
      option.textContent = labelPv(pv);
      if (pv === pvValue) option.selected = true;
      select.appendChild(option);
    });

    row.querySelectorAll('input,select').forEach(el => {
      el.addEventListener('input', () => { updateUpgradeRefundSummary(); clearResults(); });
      el.addEventListener('change', () => { updateUpgradeRefundSummary(); clearResults(); });
    });

    row.querySelector('.remove-history').addEventListener('click', () => {
      row.remove();
      if (!upgradeHistoryRows().length && $('#has-upgrade-history').checked) {
        createUpgradeHistoryRow();
      }
      updateUpgradeRefundSummary();
      clearResults();
    });

    $('#upgrade-history-list').appendChild(row);
    updateUpgradeRefundSummary();
  }

  function refreshUpgradeHistoryPvOptions(){
    const isPartner = $('#member').value === 'partner';
    const availablePvs = isPartner ? partnerPvs : generalPvs;

    upgradeHistoryRows().forEach(row => {
      const select = row.querySelector('.history-pv');
      const current = Number(select.value);

      select.innerHTML = '';

      availablePvs.forEach(pv => {
        const option = document.createElement('option');
        option.value = String(pv);
        option.textContent = labelPv(pv);
        select.appendChild(option);
      });

      select.value = String(
        availablePvs.includes(current)
          ? current
          : availablePvs[availablePvs.length - 1]
      );
    });
  }

  function getUpgradeHistory(){
    return upgradeHistoryRows().map((row, index) => ({
      index,
      dateText: row.querySelector('.history-date').value,
      date: dateUTC(row.querySelector('.history-date').value),
      pv: Number(row.querySelector('.history-pv').value),
      amount: Number(row.querySelector('.history-amount').value)
    }));
  }

  function getFinalUpgradePv(history){
    const withValidDates = history.filter(item => item.date);
    if (!withValidDates.length) return null;
    withValidDates.sort((a,b) => a.date - b.date || a.index - b.index);
    return withValidDates[withValidDates.length - 1].pv;
  }

  function getUpgradeExtraPaid(history){
    return history.reduce((sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0), 0);
  }

  function updateUpgradeRefundSummary(){
    const partner = $('#member').value === 'partner';
    const basePaid = partner ? partnerTotal() : generalTotal();
    const history = getUpgradeHistory();
    const extraPaid = getUpgradeExtraPaid(history);
    $('#upgrade-base-paid').textContent = basePaid === null ? '-' : money(basePaid);
    $('#upgrade-extra-paid').textContent = money(extraPaid);
    $('#upgrade-total-paid').textContent = basePaid === null ? '-' : money(basePaid + extraPaid);
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
      updateUpgradeRefundSummary();
    } else {
      updatePartnerMonthLabel();
      $('#partner-total').textContent = money(partnerTotal());
      const months = Number($('#months').value);
      const selectedDiscount = Number($('#discount').value);
      const effectiveDiscount = partnerEffectiveDiscount();
      const helper = $('#partner-price-box .helper');
      if (helper) {
        helper.textContent = months === 24 && effectiveDiscount !== selectedDiscount
          ? `24개월 기본 30% 할인 적용 · 선택 할인율 ${selectedDiscount}% 대신 실제 ${effectiveDiscount}% 적용`
          : `선택한 페이지뷰 · 할인율 · 결제 기간 기준입니다.${months === 24 ? ` 실제 적용 할인율 ${effectiveDiscount}%` : ''}`;
      }
      updateUpgradeRefundSummary();
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
    ['#d-days','#d-final-pv','#d-paid','#d-monthly','#d-daily','#d-work','#d-floor'].forEach(s => $(s).textContent = '-');
    $('#cs-text').value = '';
    $('#validation').textContent = '';
    $('#copy-status').textContent = '';
  }

  function syncUI(){
    const partner = $('#member').value === 'partner';
    const upgradeRefundSection = $('#upgrade-refund-section');
    const priceBox = partner ? $('#partner-price-box') : $('#general-price-box');
    priceBox.after(upgradeRefundSection);

    $('#refund-fields').classList.toggle('hidden', mode !== 'refund');
    $('#upgrade-fields').classList.toggle('hidden', mode !== 'upgrade');

    $('#general-month-wrap').classList.toggle('hidden', partner);
    $('#general-price-box').classList.toggle('hidden', partner);
    $('#partner-refund-options').classList.toggle('hidden', !partner);
    $('#partner-price-box').classList.toggle('hidden', !partner);
    $('#upgrade-partner-options').classList.toggle('hidden', !partner);
    $('#upgrade-refund-toggle-wrap').classList.toggle('hidden', mode !== 'refund');
    $('#upgrade-refund-section').classList.toggle('hidden', mode !== 'refund' || !$('#has-upgrade-history').checked);

    $('#result-label').textContent = mode === 'refund' ? '최종 환불금액' : '최종 추가 결제금액';
    $('#d-work-label').textContent = mode === 'refund' ? '사용금액' : '추가금액';

    $('#tab-refund').classList.toggle('active', mode === 'refund');
    $('#tab-upgrade').classList.toggle('active', mode === 'upgrade');

    refreshUpgradeHistoryPvOptions();
    updatePvOptions();
    clearResults();
  }

  function validDates(a,b,msg){
    if(!a || !b){
      $('#validation').textContent = '서비스 시작일과 환불 요청일을 YYYY-MM-DD 형식으로 입력해 주세요. 예: 2026-10-10';
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
    let paid, monthly, daily, used, usedFloor, period, finalPv = pv;
    const hasUpgradeHistory = $('#has-upgrade-history').checked;

    if(hasUpgradeHistory){
      period = partner ? Number($('#months').value) : Number($('#general-months').value);
      const basePaid = partner ? partnerTotal() : generalTotal();

      if(basePaid === null){
        $('#validation').textContent = '300만PV는 1개월 선불제만 선택할 수 있습니다.';
        return;
      }

      const history = getUpgradeHistory();
      if(!history.length){
        $('#validation').textContent = '업그레이드 결제 이력을 1건 이상 입력해 주세요.';
        return;
      }

      for(const item of history){
        if(!item.date){
          $('#validation').textContent = '모든 업그레이드일을 입력해 주세요.';
          return;
        }
        if(item.date < start || item.date > end){
          $('#validation').textContent = '업그레이드일은 서비스 시작일 이후, 환불 요청일 이전이어야 합니다.';
          return;
        }
        if(!Number.isFinite(item.amount) || item.amount <= 0){
          $('#validation').textContent = '모든 업그레이드 추가 결제금액을 입력해 주세요.';
          return;
        }
      }

      finalPv = getFinalUpgradePv(history);
      const extraPaid = getUpgradeExtraPaid(history);
      paid = basePaid + extraPaid;

      if(partner){
        // 파트너 업그레이드 환불은 최종 PV 요금을 다시 계산하지 않고,
        // 최초 결제 + 업그레이드 추가 결제 총액을 최초 계약 개월 수로 나눠 일할 계산합니다.
        monthly = paid / period;
      } else {
        // 일반회원은 기존 정책대로 최종 이용 PV의 정가를 전체 사용기간에 적용합니다.
        monthly = refundMonthly(finalPv);
      }

      daily = monthly / 30;
      used = daily * days;
      usedFloor = floor100(used);
    } else if(partner){
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
      : hasUpgradeHistory
          ? (partner
              ? `업그레이드 포함 총 결제금액을 ${period}개월로 나눠 일할 계산했습니다.`
              : `업그레이드 후 최종 ${labelPv(finalPv)} 정가를 전체 사용기간에 적용했습니다.`)
          : partner
              ? (Number($('#months').value) === 24
                  ? `24개월 기본 할인 정책을 반영했습니다. 실제 적용 할인율: ${partnerEffectiveDiscount()}%`
                  : '파트너 결제기간 기준으로 계산된 환불금액입니다.')
              : '실제 결제금액에서 월 정가 기준 사용요금을 차감했습니다.';

    $('#d-days').textContent = days + '일';
    $('#d-final-pv').textContent = labelPv(finalPv);
    $('#d-paid').textContent = money(paid);
    $('#d-monthly').textContent = money(monthly);
    $('#d-daily').textContent = money(daily);
    $('#d-work').textContent = money(used);
    $('#d-floor').textContent = money(usedFloor);

    if(hasUpgradeHistory){
      $('#cs-text').value = partner
        ?
`1:1)서비스 환불 요청
${Math.round(paid).toLocaleString('ko-KR')}원/${period}개월=${Math.round(monthly).toLocaleString('ko-KR')}원/30일=${Math.round(daily).toLocaleString('ko-KR')}원*${days}일 사용=${Math.round(usedFloor).toLocaleString('ko-KR')}원(10원 단위 절사)
${Math.round(paid).toLocaleString('ko-KR')}-${Math.round(usedFloor).toLocaleString('ko-KR')}=${Math.round(refund).toLocaleString('ko-KR')}원 환불`
        :
`1:1)서비스 환불 요청
총 ${Math.round(paid).toLocaleString('ko-KR')}원 결제. ${Math.round(daily).toLocaleString('ko-KR')}원(${labelPv(finalPv)} 하루 요금)*${days}일 사용=${Math.round(usedFloor).toLocaleString('ko-KR')}원(10원 단위 절사)
${Math.round(paid).toLocaleString('ko-KR')}-${Math.round(usedFloor).toLocaleString('ko-KR')}=${Math.round(refund).toLocaleString('ko-KR')}원 환불`;
    } else {
      $('#cs-text').value =
`1:1)서비스 환불 요청
${Math.round(paid).toLocaleString('ko-KR')}원/${period}개월=${Math.round(monthly).toLocaleString('ko-KR')}원/30일=${Math.round(daily).toLocaleString('ko-KR')}원*${days}일 사용=${Math.round(usedFloor).toLocaleString('ko-KR')}원(10원 단위 절사)
${Math.round(paid).toLocaleString('ko-KR')}-${Math.round(usedFloor).toLocaleString('ko-KR')}=${Math.round(refund).toLocaleString('ko-KR')}원 환불`;
    }
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
    $('#d-final-pv').textContent = labelPv(target);
    $('#d-paid').textContent = '-';
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
최종 추가 결제금액(10원 단위 절사): ${money(final)}`;
  }

  function bindEditableDate(input){
    input.addEventListener('blur', () => {
      const digits = input.value.replace(/\D/g, '');
      if (digits.length === 8) {
        input.value = digits.slice(0,4) + '-' + digits.slice(4,6) + '-' + digits.slice(6,8);
      }
    });
  }

  bindEditableDate($('#start-date'));
  bindEditableDate($('#refund-date'));

  function bindCalendarPicker(button){
    const target = $('#' + button.dataset.target);
    const picker = $('#' + button.dataset.picker);
    if (!target || !picker) return;

    button.addEventListener('click', () => {
      const current = target.value.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(current)) {
        picker.value = current;
      }

      if (typeof picker.showPicker === 'function') {
        picker.showPicker();
      } else {
        picker.focus();
        picker.click();
      }
    });

    picker.addEventListener('change', () => {
      if (picker.value) {
        target.value = picker.value;
        target.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }

  document.querySelectorAll('.calendar-btn').forEach(bindCalendarPicker);

  $('#has-upgrade-history').addEventListener('change', () => {
    const enabled = $('#has-upgrade-history').checked;
    $('#upgrade-refund-section').classList.toggle('hidden', !enabled || mode !== 'refund');
    if(enabled && !upgradeHistoryRows().length) createUpgradeHistoryRow();
    updateUpgradeRefundSummary();
    clearResults();
  });

  $('#add-upgrade-history').addEventListener('click', () => {
    createUpgradeHistoryRow();
    clearResults();
  });

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
    $('#upgrade-history-list').innerHTML = '';
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
