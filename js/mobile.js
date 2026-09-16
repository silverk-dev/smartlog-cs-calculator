const HEADERS=["방문시간","IP","통신사","클릭유형","광고종류","광고사이트","키워드","체류시간","GPS"];
let resultRows=[];

const $=id=>document.getElementById(id);
const source=$("source");
const body=$("resultBody");
const empty=$("empty");
const notice=$("notice");

function clean(v){
  return String(v??"")
    .replace(/\u00a0/g," ")
    .replace(/\r/g,"")
    .trim();
}

function cleanIp(v){
  return clean(v).replace(/\s*signal_cellular_alt\s*$/i,"").trim();
}

function isHeader(cells){
  return cells[0]==="방문시간" || cells.join("").includes("광고사이트키워드");
}

function parseRecordChunk(chunk){
  const normalized=chunk.replace(/\s+/g," ").trim();

  const dtMatch=normalized.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+/);
  if(!dtMatch) return null;

  const visitTime=dtMatch[1];
  let rest=normalized.slice(dtMatch[0].length).trim();

  const ipMatch=rest.match(/^((?:\d{1,3}\.){3}\d{1,3})(?:\s+signal_cellular_alt)?\s+/i);
  if(!ipMatch) return null;
  const ip=ipMatch[1];
  rest=rest.slice(ipMatch[0].length).trim();

  const clickMatch=rest.match(/\s+(유효|무효)\s+/);
  if(!clickMatch) return null;

  const isp=rest.slice(0,clickMatch.index).trim();
  const clickType=clickMatch[1];
  rest=rest.slice(clickMatch.index+clickMatch[0].length).trim();

  const domainMatch=rest.match(/\s+((?:m\.)?(?:ad\.)?search\.naver\.com)\s+/i);
  if(!domainMatch) return null;

  const adType=rest.slice(0,domainMatch.index).trim();
  const adSite=domainMatch[1];
  rest=rest.slice(domainMatch.index+domainMatch[0].length).trim();

  const gpsMatch=rest.match(/\s*(\(\d+\))\s*$/);
  if(!gpsMatch) return null;
  const gps=gpsMatch[1];
  rest=rest.slice(0,gpsMatch.index).trim();

  let stayTime="";
  let keyword=rest;

  const stayMatch=rest.match(/\s+((?:(?:\d{1,3}분)\s*)?(?:\d{1,3}초))$/);
  if(stayMatch){
    stayTime=stayMatch[1].trim();
    keyword=rest.slice(0,stayMatch.index).trim();
  }

  return [visitTime,ip,isp,clickType,adType,adSite,keyword,stayTime,gps];
}

function parseWhitespaceBlob(text){
  const normalized=text.replace(/\r/g," ").replace(/\n/g," ").replace(/\s+/g," ").trim();
  const starts=[...normalized.matchAll(/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/g)];

  if(!starts.length) return {rows:[],sourceRows:0};

  const rows=[];
  for(let i=0;i<starts.length;i++){
    const start=starts[i].index;
    const end=i+1<starts.length ? starts[i+1].index : normalized.length;
    const chunk=normalized.slice(start,end).trim();
    const row=parseRecordChunk(chunk);
    if(row) rows.push(row);
  }

  return {rows,sourceRows:starts.length};
}

function cleanMarkdownCell(v){
  return clean(v)
    .replace(/\\_/g,"_")
    .replace(/\[([^\]]+)\]\([^)]+\)/g,"$1")
    .replace(/\s+/g," ")
    .trim();
}

function parseMarkdownTable(text){
  const lines=text.split(/\n/).map(v=>v.trim()).filter(Boolean);
  const rows=[];

  for(const line of lines){
    if(!line.includes("|")) continue;

    // 구분선 행 제거
    if(/^\|?\s*:?-{3,}/.test(line)) continue;

    let cells=line.split("|").map(v=>cleanMarkdownCell(v));

    // 시작/끝 파이프 때문에 생긴 빈 셀 제거
    if(cells.length && cells[0]==="") cells.shift();
    if(cells.length && cells[cells.length-1]==="") cells.pop();

    if(cells.length<9) continue;

    cells=cells.slice(0,9);
    if(isHeader(cells)) continue;

    cells[1]=cleanIp(cells[1].replace(/\\_/g,"_"));

    // 광고종류에서 마크다운 이미지/링크 제거 후 텍스트만 유지
    cells[4]=cleanMarkdownCell(cells[4]);

    rows.push(cells);
  }

  return {rows,sourceRows:rows.length};
}

function parse(text){
  const trimmed=text.trim();
  if(!trimmed) return {rows:[],sourceRows:0};

  // 1) 마크다운 표 우선 인식
  if(trimmed.includes("|")){
    const md=parseMarkdownTable(trimmed);
    if(md.rows.length) return md;
  }

  // 2) 탭(TSV) 형식
  const lines=trimmed.split(/\n/).map(v=>v.trimEnd()).filter(v=>v.trim()!=="");
  const rows=[];

  for(const line of lines){
    let cells=line.split("\t");

    if(cells.length<9) continue;
    if(cells.length>9){
      cells=[...cells.slice(0,7),cells.slice(7,-1).join(" "),cells[cells.length-1]];
    }

    cells=cells.slice(0,9).map(cleanMarkdownCell);
    if(isHeader(cells)) continue;

    cells[1]=cleanIp(cells[1].replace(/\\_/g,"_"));

    if(!cells[0] && !cells[1]) continue;
    rows.push(cells);
  }

  return {rows,sourceRows:lines.length};
}
function render(){
  body.innerHTML="";
  resultRows.forEach(row=>{
    const tr=document.createElement("tr");
    row.forEach(v=>{
      const td=document.createElement("td");
      td.textContent=v;
      tr.appendChild(td);
    });
    body.appendChild(tr);
  });

  empty.style.display=resultRows.length?"none":"block";
  $("resultCount").textContent=resultRows.length.toLocaleString();
}

function setNotice(msg,type=""){
  notice.textContent=msg;
  notice.className="notice"+(type?" "+type:"");
}

function convert(){
  if(!source.value.trim()){
    resultRows=[];
    render();
    $("sourceCount").textContent="0";
    return setNotice("원본 데이터를 먼저 붙여넣어 주세요.","err");
  }

  const parsed=parse(source.value);
  resultRows=parsed.rows;

  $("sourceCount").textContent=parsed.sourceRows.toLocaleString();
  render();

  if(!resultRows.length){
    setNotice("9개 컬럼 형식의 로그를 찾지 못했습니다.","err");
  }else{
    setNotice(resultRows.length.toLocaleString()+"건을 정상적으로 추출했습니다.","ok");
  }
}

function toTsv(){
  const lines=[HEADERS.join("\t")];
  resultRows.forEach(row=>lines.push(row.join("\t")));
  return lines.join("\n");
}

async function copyResult(){
  if(!resultRows.length) return setNotice("복사할 결과가 없습니다.","err");

  try{
    await navigator.clipboard.writeText(toTsv());
  }catch(e){
    const t=document.createElement("textarea");
    t.value=toTsv();
    document.body.appendChild(t);
    t.select();
    document.execCommand("copy");
    t.remove();
  }
  setNotice("엑셀에 바로 붙여넣을 수 있는 TSV 형식으로 복사했습니다.","ok");
}

function csvEscape(v){
  return `"${String(v??"").replace(/"/g,'""')}"`;
}

function downloadBlob(blob,name){
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function downloadCsv(){
  if(!resultRows.length) return setNotice("다운로드할 결과가 없습니다.","err");

  const lines=[HEADERS.map(csvEscape).join(",")];
  resultRows.forEach(row=>lines.push(row.map(csvEscape).join(",")));

  downloadBlob(
    new Blob(["\uFEFF"+lines.join("\r\n")],{type:"text/csv;charset=utf-8;"}),
    "단말기세션_로그_추출결과.csv"
  );

  setNotice("CSV 파일을 다운로드했습니다.","ok");
}

function downloadXlsx(){
  if(!resultRows.length) return setNotice("다운로드할 결과가 없습니다.","err");
  if(typeof XLSX==="undefined") return setNotice("XLSX 라이브러리를 불러오지 못했습니다.","err");

  const data=resultRows.map(row=>{
    const obj={};
    HEADERS.forEach((h,i)=>obj[h]=row[i]??"");
    return obj;
  });

  const ws=XLSX.utils.json_to_sheet(data,{header:HEADERS});
  ws["!cols"]=[
    {wch:21},{wch:18},{wch:24},{wch:10},{wch:42},
    {wch:25},{wch:24},{wch:14},{wch:10}
  ];

  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,"로그");
  XLSX.writeFile(wb,"단말기세션_로그_추출결과.xlsx");

  setNotice("XLSX 파일을 다운로드했습니다.","ok");
}

function putExample(){
  source.value=
`2024-05-21 15:56:16\t118.235.83.28 signal_cellular_alt\t주식회사 케이티\t유효\t네이버 파워링크 - 네이버 통합검색 - 모바일\tm.search.naver.com\t구미누수\t\t(0)
2024-05-02 09:31:49\t118.235.81.100 signal_cellular_alt\t주식회사 케이티\t유효\t네이버 파워링크 - 네이버 통합검색 - 모바일\tm.search.naver.com\t구미누수\t\t(0)
2024-01-26 08:01:32\t121.182.247.151\t주식회사 케이티\t유효\t네이버 파워링크 - 네이버 통합검색 - 모바일\tm.search.naver.com\t구미누수\t30초\t(0)`;

  setNotice("예시 데이터를 넣었습니다. 변환하기를 눌러 확인해 보세요.");
}

function clearAll(){
  source.value="";
  resultRows=[];
  $("sourceCount").textContent="0";
  render();
  setNotice("");
  source.focus();
}

$("convertBtn").addEventListener("click",convert);
$("copyBtn").addEventListener("click",copyResult);
$("csvBtn").addEventListener("click",downloadCsv);
$("xlsxBtn").addEventListener("click",downloadXlsx);
$("exampleBtn").addEventListener("click",putExample);
$("clearBtn").addEventListener("click",clearAll);

source.addEventListener("keydown",e=>{
  if((e.ctrlKey||e.metaKey)&&e.key==="Enter") convert();
});
