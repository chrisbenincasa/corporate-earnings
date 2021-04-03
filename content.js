// default settings
var ms_style_output = true;
var limit_num_qtr = true;
var hide_extra = false;

chrome.storage.local.get(
  ["ms_style_output", "limit_num_qtr"],
  function (options) {
    if (isDefined(options.ms_style_output)) {
      ms_style_output = options.ms_style_output;
    }
    if (isDefined(options.limit_num_qtr)) {
      limit_num_qtr = options.limit_num_qtr;
    }
    if (isDefined(options.hide_extra)) {
      hide_extra = options.hide_extra;
    }
  }
);

var epsDates = [];
var annualEst = [];

prepare();
displayWaiting();

var numChecks = 0;
var pollDelay = 100; // ms
var timeout = 3000; // ms
displayWhenReady();

function displayWhenReady() {
  // Bail out if ticker has no earnings data
  const noData = $(document).find("#history .no-data").length == 1;
  if (noData) {
    $("#waiting").hide();
    $("body").prepend(
      '<div class="mymsg">No earnings data available for this symbol.</div>'
    );
    return;
  }

  // Wait for earnings to appear
  const earningsCount = $(document).find("div.earning-title").length;
  if (earningsCount > 0) {
    // At least one row, wait a moment to allow all rows to be populated
    // before extracting and displaying
    setTimeout(function () {
      extractContent();
      displayContent();
    }, 250);
    return;
  }

  // Check if we timed out
  if (numChecks * 100 > timeout) {
    $("#waiting").hide();
    $("body").prepend('<div class="mymsg">No data found.</div>');
    return;
  }

  // Wait some more before checking again
  ++numChecks;
  setTimeout(displayWhenReady, 100);
}

function displayWaiting() {
  $("body").prepend(
    '<div class="container" id="waiting"><p class="loading_msg">Loading earnings data</p></div>'
  );
}

function prepare() {
  const css = `<style>
    .mymsg, #waiting {
       padding: 20px;
       font-size: 1em;
       font-style: italic;
    }
    .myt {
       float: left;
       border-collapse: collapse;
       margin: 25px 50px 25px 0px;
       padding-left: 15px;
       font-family: sans-serif;
       min-width: 400px;
       box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
    }
    .myt thead tr {
       background-color: #333333;
       color: #ffffff;
       text-align: left;
    }
    .myt th,
    .myt td {
       padding: 12px 15px;
    }
    .myt tbody tr {
      border-bottom: 1px solid #dddddd;
    }
    .myt tbody tr:nth-of-type(even) {
       background-color: #f3f3f3;
    }
    .myt tbody tr:last-of-type {
        /*border-bottom: 2px solid #009879;*/
    }
    .myt tbody tr .sgreen {
        color: #0000FF;
        font-weight: bold;
    }
    .myt tbody tr .wgreen {
        color: #0000FF;
    }
    .myt tbody tr .sred {
        color: #FF0000;
        font-weight: bold;
    }
    .myt tbody tr .wred {
        color: #FF0000;
    }     
    .myd {
        text-align: right;
    }
    .container {
        overflow: hidden;
        margin-bottom: 50px;
        margin-top: 6px;
    }
    .column {
        float: left;
        margin: 10px;
        padding-bottom: 100%;
        margin-bottom: -100%;
    }
    .loading_msg:after {
        content: '.';
        animation: dots 1s steps(1, end) infinite;
    }
    @keyframes dots {
        0%, 12.5% {
            opacity: 0;
        }
        25% {
            opacity: 1;
        }
        37.5% {
            text-shadow: .5em 0;
        }
        50% {
            text-shadow: .5em 0, 1em 0;
        }
        62.5% {
            text-shadow: .5em 0, 1em 0, 1.5em 0;
        }
        75% {
            text-shadow: .5em 0, 1em 0, 1.5em 0, 2em 0;
        }
        87.5%, 100%{
            text-shadow: .5em 0, 1em 0, 1.5em 0, 2em 0, 2.5em;
        }
    }   

    .earnings-table {
        z-index: 1000;
        background: white;
        width: auto;
        display: flex;
        flex-direction: column;
        right: 0;
        flex: 1;
    }

    .symbol_page {
        flex: 2;
        padding: 30px;
        width: auto;
    }
    </style>`;

  hideExtraContent();
  $("head").prepend(css);
}

function displayContent() {
  $("#waiting").hide();
  $("#page_content_wrapper")
    .css({
      display: "flex",
      "flex-direction": "row-reverse",
    })
    .prepend(
      '<div class="earnings-table"><div class="column">' +
        yearlyToHtml(annualEst) +
        "</div>" +
        '<div class="column">' +
        epsDatesToHtml(epsDates) +
        "</div></div>"
    );
}

function epsDatesToHtml(epsDates) {
  let html = `
    <table class="myt">
        <thead>
            <tr><th colspan="6">Quarterly EPS</th></tr>
            <tr class="myd">
                <td class="myd">Quarter</td>
                <td class="myd">EPS (est.)</td>
                <td class="myd">EPS (act.)</td>
                <td class="myd">YOY %</td>
                <td class="myd">Rev (Mil)</td>
                <td class="myd">YOY %</td>
            </tr>
        </thead>
         <tbody>`;

  if (epsDates.length == 0) {
    html +=
      '<tr class="myd"><td class="myd" colspan="6">No data found.</td></tr>';
    html += "</tbody></table>";
    return html;
  }

  epsDates.forEach(function (item, index) {
    // skip all but the last 8 qtrs if option is enabled
    if (limit_num_qtr && index < epsDates.length - 8) {
      return;
    }

    let epsPerf = "-";
    if (typeof item.eps.perf !== "undefined") {
      if (ms_style_output && item.eps.negativeCompQtr) {
        epsPerf = "N/A";
      } else {
        if (ms_style_output && item.eps.perf >= 1000) {
          epsPerf = "999";
        } else {
          epsPerf = item.eps.perf;
        }
        if (item.eps.perf > 0) {
          epsPerf = "+" + epsPerf;
        }
        if (ms_style_output && item.eps.negativeTurnaround) {
          epsPerf = "#" + epsPerf;
        }
      }
    }
    let revPerf = "-";
    if (typeof item.rev.perf !== "undefined") {
      if (ms_style_output && item.rev.perf >= 1000) {
        revPerf = "999";
      } else {
        revPerf = item.rev.perf;
      }
      if (item.rev.perf > 0) {
        revPerf = "+" + revPerf;
      }
    }

    html += `
        <tr class="myd">
            <td class="myd">${getDisplayQuarter(item.name)}</td>
            <td class="myd">${item.eps.consensus}</td>
            <td class="myd">${item.eps.eps}</td>
            <td class="myd ${getHighlightClass(
              item.eps.perf,
              epsPerf
            )}">${epsPerf}</td>
            <td class="myd">$${numberWithCommas(item.rev.rev)}</td>
            <td class="myd ${getHighlightClass(
              item.rev.perf,
              revPerf
            )}">${revPerf}</td>
        </tr>
    `;
  });
  html += "</tbody></table>";
  return html;
}

function yearlyToHtml(annualEst) {
  let html = `
  <table class="myt">
    <thead>
        <tr><th colspan="5">Annual</th></tr>
        <tr class="myd">
            <td class="myd">Year</td>
            <td class="myd">EPS</td>
            <td class="myd">%YOY Chg</td>
            <td class="myd">Revenue(Mil)</td>
            <td class="myd">%YOY Chg</td>
        </tr>
    </thead>
    <tbody>`;

  if (annualEst.length == 0) {
    html +=
      '<tr class="myd"><td class="myd" colspan="5">No data found.</td></tr>';
    html += "</tbody></table>";
    return html;
  }

  annualEst.forEach(function (item, index) {
    let yearlyEps = "-";
    if (typeof item.eps !== "undefined") {
      yearlyEps = item.eps.toString();
    }
    let yearlyRev = "-";
    if (typeof item.rev !== "undefined") {
      yearlyRev = item.rev.toString();
    }
    let epsPerf = "-";
    if (typeof item.epsPerf !== "undefined") {
      epsPerf = item.epsPerf > 0 ? "+" + item.epsPerf : item.epsPerf;
    }
    let revPerf = "-";
    if (typeof item.revPerf !== "undefined") {
      revPerf = item.revPerf > 0 ? "+" + item.revPerf : item.revPerf;
    }

    html += '<tr class="myd"><td class="myd">' + item.name + "</td>";
    html += '<td class="myd">' + yearlyEps + "</td>";
    html +=
      '<td class="myd' +
      getHighlightClass(item.epsPerf, epsPerf) +
      '">' +
      epsPerf +
      "</td>";
    html += '<td class="myd">' + numberWithCommas(yearlyRev) + "</td>";
    html +=
      '<td class="myd' +
      getHighlightClass(item.revPerf, revPerf) +
      '">' +
      revPerf +
      "</td></tr>";
  });
  html += "</tbody></table>";
  return html;
}

function toNum(str) {
  let num = parseFloat(str);
  if (str.endsWith("M")) {
    num *= 1000000;
  } else if (str.endsWith("B")) {
    num *= 1000000000;
  }
  return num;
}

function fromNum(num) {
  let str = num.toFixed(2);
  return str;
}

// to calculate eps performance (%Chg), compare with entry 4 qtrs back
function calculateEpsPerf(dates) {
  dates.map(function (qtr, index) {
    if (index - 4 >= 0 && dates[index - 4].eps.eps != 0) {
      qtr.eps.negativeCompQtr = false;
      qtr.eps.negativeTurnaround = false;
      qtr.eps.perf = Math.round(
        100 *
          ((qtr.eps.eps - dates[index - 4].eps.eps) /
            Math.abs(dates[index - 4].eps.eps))
      );
      if (qtr.eps.eps < 0 && dates[index - 4].eps.eps) {
        qtr.eps.negativeCompQtr = true;
      } else if (dates[index - 4].eps.eps < 0) {
        qtr.eps.negativeTurnaround = true;
      }
    }
  });
}

// TO calculate annual performance (%Chg), compare with previous year
function calculateAnnualPerf(dates) {
  dates.map(function (item, index) {
    if (index - 1 >= 0) {
      if (dates[index - 1].eps != 0) {
        item.epsPerf = Math.round(
          100 *
            ((item.eps - dates[index - 1].eps) / Math.abs(dates[index - 1].eps))
        );
      }
      if (dates[index - 1].rev != 0) {
        item.revPerf = Math.round(
          100 *
            ((item.rev - dates[index - 1].rev) / Math.abs(dates[index - 1].rev))
        );
      }
    }
  });
}

/*
   Parse quaterly EPS string. String can be in the form:

   Q2 2020 (Jun 2020) EPS of -$0.31 beat by $0.05/missed by $0.05
   Q2 2020 (Jun 2020) GAAP EPS of $0.01

*/
function parseQtrEps(str) {
  let eps = {};
  let dPos = str.indexOf("$");

  if (dPos > -1) {
    let sign = "";
    if (str.substr(dPos - 1, 1) == "-") {
      sign = "-";
    }

    let sPos = str.indexOf(" ", dPos);
    if (sPos == -1) {
      eps.eps = parseFloat((sign + str.substr(dPos + 1)).trim());
    } else {
      eps.eps = parseFloat((sign + str.substr(dPos + 1, sPos - dPos)).trim());
      eps.beat = str.substr(sPos + 1).trim();
      if (eps.beat) {
        let positive = eps.beat.startsWith("beat");
        const diff = parseFloat(eps.beat.substr(eps.beat.indexOf("$") + 1));
        eps.consensus =
          Math.round((positive ? eps.eps - diff : eps.eps + diff) * 100) / 100;
      }
    }
  }
  return eps;
}

/*
   Parse quaterly revenue string. String can be in the form:

   Revenue of $112.33M (54.30% YoY) beat by $8.47M
   Revenue of $112.33M beat by $8.47M
   Revenue of $112.33M
*/
function parseQtrRev(str) {
  let rev = {};
  rev.rev = 0;
  let revStr = "";

  let pos = str.indexOf("(");
  if (pos == -1) {
    let sPos = str.indexOf(" ", 13);
    if (sPos == -1) {
      revStr = str.substr(13).trim();
    } else {
      revStr = str.substr(13, sPos - 13).trim();
      rev.beat = str.substr(sPos + 1).trim();
    }
  } else {
    revStr = str.substr(12 + 1, pos - 12 - 1).trim();
    rev.perf = Math.round(
      parseFloat(str.substr(pos + 1, str.indexOf("%") - 1 - pos))
    );
    rev.beat = str.substr(str.indexOf(")") + 1).trim();
  }

  rev.rev = normalizeRevenue(revStr);
  return rev;
}

function normalizeRevenue(revStr) {
  revStr = revStr.trim();
  if (revStr.endsWith("M")) {
    return parseFloat(parseFloat(revStr).toFixed(1));
  } else if (revStr.endsWith("K")) {
    return parseFloat((parseFloat(revStr) / 1000).toFixed(2));
  } else if (revStr.endsWith("B")) {
    return Math.round(parseFloat(revStr) * 1000);
  } else {
    return parseFloat((parseFloat(revStr) / 1000).toFixed(2));
  }
}

function normalizeQtrName(str) {
  let start = str.indexOf("(") + 1;
  return str.substr(start, str.indexOf(")") - start);
}

/*
   Returns appropriate highlight class for EPS and revenue values
   >= 30 : strong green
   >0 && < 30 : weak green
   <0 && >-20 : weak read
   < -20 : strong red
*/
function getHighlightClass(num, str) {
  let hclass = "";
  if (str === "N/A") {
    return hclass;
  }
  if (typeof num !== "undefined") {
    if (num >= 30) {
      hclass = " sgreen";
    } else if (num > 0 && num < 30) {
      hclass = " wgreen";
    } else if (num < 0 && num > -20) {
      hclass = " wred";
    } else if (num <= -20) {
      hclass = " sred";
    }
  }
  return hclass;
}

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getAnnualEstimateName(str) {
  let start = str.indexOf(" ");
  if (start > -1) {
    return str.substr(start + 1);
  }
  return start;
}

function hideExtraContent() {
  if (hide_extra) {
    $("#main-nav-wrapper-row").hide();
    $("#tab-content-header").hide();
    $("#sp-center-menu").hide();

    $(".symbol_title").hide();

    $("#estimates").hide();
    $("#cresscap").hide();

    $(".panel-body").hide();
    $("#breaking-news").hide();
    $(".col-xs-3").hide();
  }
}

function extractContent() {
  // add quarters
  $(".panel-title.earning-title").each(function () {
    let epsItem = {};
    epsItem.name = normalizeQtrName($(this).find(".title-period").text());
    epsItem.eps = parseQtrEps(
      $(this)
        .find(".eps")
        .text()
        .trim()
        .replace(/(\r\n|\n|\r)/gm, "")
    );
    epsItem.rev = parseQtrRev(
      $(this)
        .find(".revenue")
        .contents()
        .text()
        .trim()
        .replace(/(\r\n|\n|\r)/gm, "")
    );

    if (
      !(
        epsItem.name === undefined ||
        epsItem.name.length == 0 ||
        epsItem.eps.eps === undefined ||
        isNaN(epsItem.eps.eps)
      )
    ) {
      epsDates.unshift(epsItem);
    }
  });
  calculateEpsPerf(epsDates);

  // add annual eps estimates
  $("#annual-eps-esimates-tbl tbody .row-content").each(function () {
    let annualItem = {};
    $(this)
      .children()
      .each(function (index) {
        if (index == 0) {
          annualItem.name = "*" + getAnnualEstimateName($(this).text().trim());
        } else if (index == 1) {
          annualItem.eps = $(this).text().trim();
        }
      });
    annualEst.push(annualItem);
  });

  // add annual revenue estimates
  $("#annual-rev-esimates-tbl tbody .row-content").each(function (index) {
    $(this)
      .children()
      .each(function (index2) {
        if (index2 == 1) {
          annualEst[index].rev = normalizeRevenue($(this).text().trim());
        }
      });
  });

  // calculate eps/revenue for previous years using existing quaterly data
  // getLatestYear to get year for latest quarter available (e.g. 2020)
  // attempt to find all quarters for given year
  // if found 0 quarters, exit
  let numAttempts = 0;
  if (epsDates.length > 0) {
    let year = getLatestQtrYear(epsDates);
    while (true) {
      let annualItem = {};
      annualItem.name = year;
      annualItem.eps = 0;
      annualItem.rev = 0;
      let foundQtrs4Year = 0;

      epsDates.forEach(function (qtr) {
        if (qtr.name.indexOf(year.toString()) > -1) {
          annualItem.eps += qtr.eps.eps;
          annualItem.rev += qtr.rev.rev;
          ++foundQtrs4Year;
        }
      });

      if (foundQtrs4Year == 0) {
        break;
      }

      annualItem.eps = +annualItem.eps.toFixed(2);
      annualItem.rev = +annualItem.rev.toFixed(1);
      annualEst.unshift(annualItem);
      --year;
    }
  }
  calculateAnnualPerf(annualEst);
}

function getLatestQtrYear(epsDates) {
  if (epsDates.length == 0) {
    return undefined;
  }
  let lastQtrName = epsDates[epsDates.length - 1].name;
  let year = parseInt(lastQtrName.substr(lastQtrName.indexOf(" ") + 1));
  return year;
}

function getDisplayQuarter(qtr) {
  return qtr.substr(0, 3) + "-" + qtr.substr(6);
}

function isDefined(smth) {
  return typeof smth !== "undefined";
}
