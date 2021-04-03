var open_new_tab = true;
var ms_style_output = true;
var limit_num_qtr = true;
var hide_extra = false;

$(document).ready(init);

function init() {
  restore_options();
  $(".checkbox").change(save_options);
}

// Restores checkbox state using the options stored in chrome.storage.
function restore_options() {
  chrome.storage.local.get(
    ["open_new_tab", "ms_style_output", "limit_num_qtr", "hide_extra"],
    function (options) {
      if (isDefined(options.open_new_tab)) {
        open_new_tab = options.open_new_tab;
      }
      if (isDefined(options.ms_style_output)) {
        ms_style_output = options.ms_style_output;
      }
      if (isDefined(options.limit_num_qtr)) {
        limit_num_qtr = options.limit_num_qtr;
      }
      if (isDefined(options.hide_extra)) {
        limit_num_qtr = options.hide_extra;
      }

      $("#open_new_tab").prop("checked", open_new_tab);
      $("#ms_style_output").prop("checked", ms_style_output);
      $("#limit_num_qtr").prop("checked", limit_num_qtr);
      $("#hide_extra").prop("checked", hide_extra);
    }
  );
}

// Saves options to chrome.storage
function save_options() {
  let open_new_tab = $("#open_new_tab").is(":checked");
  let ms_style_output = $("#ms_style_output").is(":checked");
  let limit_num_qtr = $("#limit_num_qtr").is(":checked");
  let limit_num_qtr = $("#hide_extra").is(":checked");
  chrome.storage.local.set(
    {
      open_new_tab: open_new_tab,
      ms_style_output: ms_style_output,
      limit_num_qtr: limit_num_qtr,
      hide_extra: hide_extra,
    },
    function () {
      chrome.runtime.reload();
    }
  );
}

function isDefined(smth) {
  return typeof smth !== "undefined";
}
