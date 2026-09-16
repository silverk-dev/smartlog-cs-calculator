(() => {
  const calculatorView = document.getElementById('calculator-view');
  const smsView = document.getElementById('sms-view');
  const mobileView = document.getElementById('mobile-view');
  const sessionidView = document.getElementById('sessionid-view');

  function showSmsView(){
    calculatorView.classList.add('hidden');
    mobileView.classList.add('hidden');
    sessionidView.classList.add('hidden');
    smsView.classList.remove('hidden');
  }

  function showCalculatorView(){
    smsView.classList.add('hidden');
    mobileView.classList.add('hidden');
    sessionidView.classList.add('hidden');
    calculatorView.classList.remove('hidden');
  }

  function showMobileView(){
    calculatorView.classList.add('hidden');
    smsView.classList.add('hidden');
    sessionidView.classList.add('hidden');
    mobileView.classList.remove('hidden');
  }

  function showSessionidView(){
    calculatorView.classList.add('hidden');
    smsView.classList.add('hidden');
    mobileView.classList.add('hidden');
    sessionidView.classList.remove('hidden');
  }

  document.getElementById('sms-toggle').addEventListener('click', showSmsView);
  document.getElementById('calculator-toggle').addEventListener('click', showCalculatorView);
  document.getElementById('mobile-tool-btn').addEventListener('click', showMobileView);
  document.getElementById('mobile-back-btn').addEventListener('click', showCalculatorView);
  document.getElementById('sessionid-tool-btn').addEventListener('click', showSessionidView);
  document.getElementById('sessionid-back-btn').addEventListener('click', showCalculatorView);
})();