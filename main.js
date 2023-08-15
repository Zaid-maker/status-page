/* This is the maximum number of days that will be displayed in the report. */
const maxDays = 30;

/**
 * It fetches a log file, normalizes the data, and then constructs a status stream.
 * @param container - the div element that will contain the status stream
 * @param key - the key of the report
 * @param url - The URL of the website to be tested
 */
async function genReportLog(container, key, url) {
  const response = await fetch("logs/" + key + "_report.log");
  let statusLines = "";
  if (response.ok) {
    statusLines = await response.text();
  }

  const normalized = normalizeData(statusLines);
  const statusStream = constructStatusStream(key, url, normalized);
  container.appendChild(statusStream);
}

/**
 * It takes a key, a url, and an array of uptime data, and returns a DOM element that contains a status
 * stream.
 * @param key - The name of the service
 * @param url - the url of the website
 * @param uptimeData - an array of objects, each object has a "status" property, which is either "up"
 * or "down"
 * @returns A DOM element.
 */
function constructStatusStream(key, url, uptimeData) {
  let streamContainer = templatize("statusStreamContainerTemplate");
  for (var ii = maxDays - 1; ii >= 0; ii--) {
    let line = constructStatusLine(key, ii, uptimeData[ii]);
    streamContainer.appendChild(line);
  }

  const lastSet = uptimeData[0];
  const color = getColor(lastSet);

  const container = templatize("statusContainerTemplate", {
    title: key,
    url: url,
    color: color,
    status: getStatusText(color),
    upTime: uptimeData.upTime,
  });

  container.appendChild(streamContainer);
  return container;
}

/**
 * It takes a key, a relative day, and an array of up times and returns a status square.
 * @param key - the key of the object in the array
 * @param relDay - The number of days ago the date is.
 * @param upTimeArray - [{date: "2019-01-01", upTime: "100"}, {date: "2019-01-02", upTime: "100"},
 * {date: "2019-01-03", upTime: "100"}, {date: "2019-01-04", up
 * @returns A string of HTML code.
 */
function constructStatusLine(key, relDay, upTimeArray) {
  let date = new Date();
  date.setDate(date.getDate() - relDay);

  return constructStatusSquare(key, date, upTimeArray);
}

/**
 * If the uptime value is null, return "nodata"; if it's 1, return "success"; if it's less than 0.3,
 * return "failure"; otherwise, return "partial"
 * @param uptimeVal - The uptime value for the current row.
 * @returns a string.
 */
function getColor(uptimeVal) {
  return uptimeVal == null
    ? "nodata"
    : uptimeVal == 1
    ? "success"
    : uptimeVal < 0.3
    ? "failure"
    : "partial";
}

/**
 * It creates a square with a tooltip
 * @param key - the key of the object in the data array
 * @param date - "2020-01-01"
 * @param uptimeVal - a number between 0 and 1
 * @returns A function that takes in a key, date, and uptimeVal.
 */
function constructStatusSquare(key, date, uptimeVal) {
  const color = getColor(uptimeVal);
  let square = templatize("statusSquareTemplate", {
    color: color,
    tooltip: getTooltip(key, date, color),
  });

  const show = () => {
    showTooltip(square, key, date, color);
  };
  square.addEventListener("mouseover", show);
  square.addEventListener("mousedown", show);
  square.addEventListener("mouseout", hideTooltip);
  return square;
}

/* A variable that is used to generate unique IDs for the cloned elements. */
let cloneId = 0;

/**
 * It takes a template element and a set of parameters, and returns a clone of the template element
 * with the parameters applied.
 * 
 * The function is pretty simple. It takes a template element and a set of parameters, and returns a
 * clone of the template element with the parameters applied.
 * 
 * The first thing it does is clone the template element. This is important because we don't want to
 * modify the original template element.
 * 
 * Next, it checks to see if there are any parameters. If there aren't, it just returns the clone.
 * 
 * If there are parameters, it calls applyTemplateSubstitutions to apply the parameters to the clone.
 * 
 * Finally, it returns the clone.
 * @param templateId - The id of the template to clone.
 * @param parameters - {
 * @returns A clone of the template with the id of the template and the parameters applied.
 */
function templatize(templateId, parameters) {
  let clone = document.getElementById(templateId).cloneNode(true);
  clone.id = "template_clone_" + cloneId++;
  if (!parameters) {
    return clone;
  }

  applyTemplateSubstitutions(clone, parameters);
  return clone;
}

/**
 * It takes a DOM node and a set of parameters, and it replaces all the template strings in the node
 * with the values from the parameters.
 * 
 * The function is recursive, so it will work on any node, and it will work on all the child nodes of
 * that node.
 * 
 * The function is also smart enough to know that if a node has no child nodes, then it should replace
 * the innerText of the node.
 * 
 * The function is also smart enough to know that if a node has child nodes, then it should recursively
 * call itself on each of the child nodes.
 * 
 * The function is also smart enough to know that it should replace template strings in the attributes
 * of the node.
 * 
 * The function is also smart enough to know that it should replace template strings in the innerText
 * of the node.
 * 
 * The function is also smart enough to know that it should replace template strings in
 * @param node - the node to apply the template substitutions to
 * @param parameters - {
 */
function applyTemplateSubstitutions(node, parameters) {
  const attributes = node.getAttributeNames();
  for (var ii = 0; ii < attributes.length; ii++) {
    const attr = attributes[ii];
    const attrVal = node.getAttribute(attr);
    node.setAttribute(attr, templatizeString(attrVal, parameters));
  }

  if (node.childElementCount == 0) {
    node.innerText = templatizeString(node.innerText, parameters);
  } else {
    const children = Array.from(node.children);
    children.forEach((n) => {
      applyTemplateSubstitutions(n, parameters);
    });
  }
}

/**
 * It takes a string and replaces all instances of `` with the value of `parameters[key]`.
 * 
 * Here's an example of how to use it:
 * @param text - The string to be templatized.
 * @param parameters - {
 * @returns The text with the parameters replaced.
 */
function templatizeString(text, parameters) {
  if (parameters) {
    for (const [key, val] of Object.entries(parameters)) {
      text = text.replaceAll("$" + key, val);
    }
  }
  return text;
}

/**
 * If the color is "nodata", return "No Data Available", else if the color is "success", return "Fully
 * Operational", else if the color is "failure", return "Major Outage", else if the color is "partial",
 * return "Partial Outage", else return "Unknown"
 * @param color - The color of the status indicator.
 * @returns the value of the variable "color"
 */
function getStatusText(color) {
  if (color === "nodata") {
    return "No Data Available";
  } else if (color === "success") {
    return "Fully Operational";
  } else if (color === "failure") {
    return "Major Outage";
  } else if (color === "partial") {
    return "Partial Outage";
  } else {
    return "Unknown";
  }
}

/**
 * If the color is "nodata", return "No Data Available: Health check was not performed.". Otherwise, if
 * the color is "success", return "No downtime recorded on this day.". Otherwise, if the color is
 * "failure", return "Major outages recorded on this day.". Otherwise, if the color is "partial",
 * return "Partial outages recorded on this day.". Otherwise, return "Unknown"
 * @param color - The color of the cell.
 * @returns the value of the variable color.
 */
function getStatusDescriptiveText(color) {
  return color == "nodata"
    ? "No Data Available: Health check was not performed."
    : color == "success"
    ? "No downtime recorded on this day."
    : color == "failure"
    ? "Major outages recorded on this day."
    : color == "partial"
    ? "Partial outages recorded on this day."
    : "Unknown";
}

/**
 * It takes a key, a date, a quartile, and a color, and returns a string that looks like this: "key |
 * date : quartile : statusText"
 * @param key - The key of the data point.
 * @param date - The date of the data point
 * @param quartile - The quartile value of the data point.
 * @param color - the color of the bar
 * @returns A string.
 */
function getTooltip(key, date, quartile, color) {
  let statusText = getStatusText(color);
  return `${key} | ${date.toDateString()} : ${quartile} : ${statusText}`;
}

/**
 * Create a new element with the given tag and class name.
 * @param tag - The tag name of the element you want to create.
 * @param className - The class name of the element you want to create.
 * @returns the element.
 */
function create(tag, className) {
  let element = document.createElement(tag);
  element.className = className;
  return element;
}

/**
 * It takes a string of data, splits it into rows, splits the rows into days, averages the data for
 * each day, and returns an object with the average data for each day.
 * @param statusLines - The output of the command
 * @returns An object with the following structure:
 * {
 *   "0": {
 *     "cpu": "0.00",
 *     "mem": "0.00",
 *     "net": "0.00"
 *   },
 *   "1": {
 *     "cpu": "0.00",
 *     "mem": "0.00",
 *     "net": "
 */
function normalizeData(statusLines) {
  const rows = statusLines.split("\n");
  const dateNormalized = splitRowsByDate(rows);

  let relativeDateMap = {};
  const now = Date.now();
  for (const [key, val] of Object.entries(dateNormalized)) {
    if (key == "upTime") {
      continue;
    }

    const relDays = getRelativeDays(now, new Date(key).getTime());
    relativeDateMap[relDays] = getDayAverage(val);
  }

  relativeDateMap.upTime = dateNormalized.upTime;
  return relativeDateMap;
}

/**
 * If the value is not null or empty, return the average of the values in the array.
 * @param val - The array of values to be averaged.
 * @returns The average of the values in the array.
 */
function getDayAverage(val) {
  if (!val || val.length == 0) {
    return null;
  } else {
    return val.reduce((a, v) => a + v) / val.length;
  }
}

/**
 * It takes two dates and returns the number of days between them
 * @param date1 - The date you want to compare to.
 * @param date2 - The date to compare to.
 * @returns The number of days between the two dates.
 */
function getRelativeDays(date1, date2) {
  return Math.floor(Math.abs((date1 - date2) / (24 * 3600 * 1000)));
}

/**
 * It takes a list of strings, each of which is a date and a result, and returns an object with the
 * results grouped by date.
 * 
 * The function is called like this:
 * @param rows - an array of strings, each string is a row of data
 * @returns An object with the following properties:
 */
function splitRowsByDate(rows) {
  let dateValues = {};
  let sum = 0,
    count = 0;
  for (var ii = 0; ii < rows.length; ii++) {
    const row = rows[ii];
    if (!row) {
      continue;
    }

    const [dateTimeStr, resultStr] = row.split(",", 2);
    const dateTime = new Date(
      Date.parse(dateTimeStr.replace(/-/g, "/") + " GMT")
    );
    const dateStr = dateTime.toDateString();

    let resultArray = dateValues[dateStr];
    if (!resultArray) {
      resultArray = [];
      dateValues[dateStr] = resultArray;
      if (dateValues.length > maxDays) {
        break;
      }
    }

    let result = 0;
    if (resultStr.trim() == "success") {
      result = 1;
    }
    sum += result;
    count++;

    resultArray.push(result);
  }

  const upTime = count ? ((sum / count) * 100).toFixed(2) + "%" : "--%";
  dateValues.upTime = upTime;
  return dateValues;
}

/* Declaring a variable called tooltipTimeout and assigning it the value of null. */
let tooltipTimeout = null;

/**
 * It takes in an element, a key, a date, and a color, and then it sets the inner text of the
 * tooltipDateTime element to the date, the inner text of the tooltipDescription element to the color,
 * the inner text of the tooltipStatus element to the color, and the class of the tooltipStatus element
 * to the color. 
 * 
 * Then it sets the top of the toolTipDiv element to the offsetTop of the element plus the offsetHeight
 * of the element plus 10, and the left of the toolTipDiv element to the offsetLeft of the element plus
 * the offsetWidth of the element divided by 2 minus the offsetWidth of the toolTipDiv element divided
 * by 2. 
 * 
 * Then it sets the opacity of the toolTipDiv element to 1.
 * @param element - the element that the mouse is over
 * @param key - the key of the data point
 * @param date - the date of the event
 * @param color - the color of the status
 */
function showTooltip(element, key, date, color) {
  clearTimeout(tooltipTimeout);
  const toolTipDiv = document.getElementById("tooltip");

  document.getElementById("tooltipDateTime").innerText = date.toDateString();
  document.getElementById("tooltipDescription").innerText =
    getStatusDescriptiveText(color);

  const statusDiv = document.getElementById("tooltipStatus");
  statusDiv.innerText = getStatusText(color);
  statusDiv.className = color;

  toolTipDiv.style.top = element.offsetTop + element.offsetHeight + 10;
  toolTipDiv.style.left =
    element.offsetLeft + element.offsetWidth / 2 - toolTipDiv.offsetWidth / 2;
  toolTipDiv.style.opacity = "1";
}

/**
 * If the user hovers over the tooltip, don't hide it. If the user doesn't hover over the tooltip, hide
 * it after 1 second.
 */
function hideTooltip() {
  tooltipTimeout = setTimeout(() => {
    const toolTipDiv = document.getElementById("tooltip");
    toolTipDiv.style.opacity = "0";
  }, 1000);
}

/**
 * It reads a configuration file, then for each line in the configuration file, it calls a function to
 * generate a report.
 * 
 * The configuration file is a simple text file with one line per report. Each line has a key and a URL
 * separated by an equals sign. The key is used to name the report. The URL is used to fetch the
 * report.
 * 
 * The function genReportLog() is called for each line in the configuration file. It takes three
 * parameters:
 * 
 * The first parameter is the HTML element where the report will be placed.
 * The second parameter is the key from the configuration file.
 * The third parameter is the URL from the configuration file.
 * The function genReportLog() calls the function genReport() to generate the report.
 * 
 * The function genReport() takes three parameters:
 * 
 * The first parameter is the HTML element where the report will be placed.
 */
async function genAllReports() {
  const response = await fetch("urls.cfg");
  const configText = await response.text();
  const configLines = configText.split("\n");
  for (let ii = 0; ii < configLines.length; ii++) {
    const configLine = configLines[ii];
    const [key, url] = configLine.split("=");
    if (!key || !url) {
      continue;
    }

    await genReportLog(document.getElementById("reports"), key, url);
  }
}

/**
 * It fetches the contents of the incident report from the Cloudflare Worker, sanitizes the markdown,
 * and then inserts it into the HTML
 */
async function genIncidentReport() {
  const response = await fetch(
    "https://incidents.statsig.workers.dev/contents"
  );
  if (response.ok) {
    const json = await response.json();
    try {
      const activeDom = DOMPurify.sanitize(
        marked.parse(json.active ? json.active : "No active Incidents")
      );
      const inactiveDom = DOMPurify.sanitize(marked.parse(json.inactive));

      document.getElementById("activeIncidentReports").innerHTML = activeDom;
      document.getElementById("pastIncidentReports").innerHTML = inactiveDom;
    } catch (e) {
      console.log(e.message);
    }
  }
}
