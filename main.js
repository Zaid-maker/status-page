// File: /main.js

const maxDays = 30;  // Max days displayed in the report
let cloneId = 0;     // Unique ID generator for clones
let tooltipTimeout = null;  // Tooltip timeout handler

// Main function to generate reports from log files
async function genReportLog(container, key, url) {
  const statusLines = await fetchLog(key);
  const normalizedData = normalizeData(statusLines);
  const statusStream = constructStatusStream(key, url, normalizedData);
  container.appendChild(statusStream);
}

// Fetch log data for a specific report
async function fetchLog(key) {
  const response = await fetch(`logs/${key}_report.log`);
  return response.ok ? await response.text() : "";
}

// Build the status stream for a given key and URL
function constructStatusStream(key, url, uptimeData) {
  const streamContainer = buildStreamContainer(key, uptimeData);
  const container = buildStatusContainer(key, url, uptimeData.upTime, uptimeData[0]);

  container.appendChild(streamContainer);
  return container;
}

// Build the status stream container for displaying daily statuses
function buildStreamContainer(key, uptimeData) {
  const streamContainer = templatize("statusStreamContainerTemplate");

  for (let day = maxDays - 1; day >= 0; day--) {
    const statusLine = constructStatusLine(key, day, uptimeData[day]);
    streamContainer.appendChild(statusLine);
  }
  
  return streamContainer;
}

// Build the main status container with title, URL, color, and status
function buildStatusContainer(key, url, upTime, lastSet) {
  const color = getColor(lastSet);
  return templatize("statusContainerTemplate", {
    title: key,
    url: url,
    color: color,
    status: getStatusText(color),
    upTime: upTime,
  });
}

// Construct individual status line for each day
function constructStatusLine(key, relDay, upTimeArray) {
  const date = new Date();
  date.setDate(date.getDate() - relDay);
  return constructStatusSquare(key, date, upTimeArray);
}

// Get color based on uptime value
function getColor(uptimeVal) {
  if (uptimeVal == null) return "nodata";
  if (uptimeVal === 1) return "success";
  if (uptimeVal < 0.3) return "failure";
  return "partial";
}

// Construct a status square with hover tooltip
function constructStatusSquare(key, date, uptimeVal) {
  const color = getColor(uptimeVal);
  const square = templatize("statusSquareTemplate", {
    color: color,
    tooltip: getTooltip(key, date, color),
  });

  addTooltipEvents(square, key, date, color);
  return square;
}

// Add tooltip events to a status square
function addTooltipEvents(square, key, date, color) {
  const show = () => showTooltip(square, key, date, color);
  
  square.addEventListener("mouseover", show);
  square.addEventListener("mousedown", show);
  square.addEventListener("mouseout", hideTooltip);
}

// Template creation and substitution
function templatize(templateId, parameters) {
  const clone = document.getElementById(templateId).cloneNode(true);
  clone.id = `template_clone_${cloneId++}`;

  if (parameters) applyTemplateSubstitutions(clone, parameters);
  return clone;
}

// Apply substitutions for template placeholders
function applyTemplateSubstitutions(node, parameters) {
  const attributes = node.getAttributeNames();
  attributes.forEach(attr => {
    const attrVal = node.getAttribute(attr);
    node.setAttribute(attr, templatizeString(attrVal, parameters));
  });

  if (node.childElementCount === 0) {
    node.innerText = templatizeString(node.innerText, parameters);
  } else {
    Array.from(node.children).forEach(child => {
      applyTemplateSubstitutions(child, parameters);
    });
  }
}

// Substitute template variables in a string
function templatizeString(text, parameters) {
  if (parameters) {
    for (const [key, val] of Object.entries(parameters)) {
      text = text.replaceAll(`$${key}`, val);
    }
  }
  return text;
}

// Display tooltip with status information
function showTooltip(element, key, date, color) {
  clearTimeout(tooltipTimeout);
  const tooltip = document.getElementById("tooltip");

  document.getElementById("tooltipDateTime").innerText = date.toDateString();
  document.getElementById("tooltipDescription").innerText = getStatusDescriptiveText(color);
  const statusDiv = document.getElementById("tooltipStatus");
  statusDiv.innerText = getStatusText(color);
  statusDiv.className = color;

  tooltip.style.top = `${element.offsetTop + element.offsetHeight + 10}px`;
  tooltip.style.left = `${element.offsetLeft + element.offsetWidth / 2 - tooltip.offsetWidth / 2}px`;
  tooltip.style.opacity = "1";
}

// Hide tooltip after 1 second
function hideTooltip() {
  tooltipTimeout = setTimeout(() => {
    const tooltip = document.getElementById("tooltip");
    tooltip.style.opacity = "0";
  }, 1000);
}

// Get the appropriate status text based on color
function getStatusText(color) {
  switch (color) {
    case "nodata":
      return "No Data Available";
    case "success":
      return "Fully Operational";
    case "failure":
      return "Major Outage";
    case "partial":
      return "Partial Outage";
    default:
      return "Unknown";
  }
}

// Get descriptive status text for tooltip
function getStatusDescriptiveText(color) {
  switch (color) {
    case "nodata":
      return "No Data Available: Health check was not performed.";
    case "success":
      return "No downtime recorded on this day.";
    case "failure":
      return "Major outages recorded on this day.";
    case "partial":
      return "Partial outages recorded on this day.";
    default:
      return "Unknown";
  }
}

// Tooltip generator function
function getTooltip(key, date, color) {
  const statusText = getStatusText(color);
  return `${key} | ${date.toDateString()} : ${statusText}`;
}

// Normalize log data into a more structured format
function normalizeData(statusLines) {
  const rows = statusLines.split("\n");
  const dateNormalized = splitRowsByDate(rows);

  let relativeDateMap = {};
  const now = Date.now();

  Object.entries(dateNormalized).forEach(([key, val]) => {
    if (key !== "upTime") {
      const relDays = getRelativeDays(now, new Date(key).getTime());
      relativeDateMap[relDays] = getDayAverage(val);
    }
  });

  relativeDateMap.upTime = dateNormalized.upTime;
  return relativeDateMap;
}

// Calculate relative days between two dates
function getRelativeDays(date1, date2) {
  return Math.floor(Math.abs((date1 - date2) / (24 * 3600 * 1000)));
}

// Get average uptime for a given day
function getDayAverage(values) {
  if (!values || values.length === 0) return null;
  return values.reduce((a, v) => a + v) / values.length;
}

// Split log data by date
function splitRowsByDate(rows) {
  let dateValues = {};
  let sum = 0, count = 0;

  for (let row of rows) {
    if (!row) continue;
    
    const [dateTimeStr, resultStr] = row.split(",", 2);
    const dateTime = new Date(Date.parse(dateTimeStr.replace(/-/g, "/") + " GMT"));
    const dateStr = dateTime.toDateString();

    if (!dateValues[dateStr]) dateValues[dateStr] = [];
    const result = resultStr.trim() === "success" ? 1 : 0;

    sum += result;
    count++;
    dateValues[dateStr].push(result);

    if (Object.keys(dateValues).length > maxDays) break;
  }

  dateValues.upTime = count ? `${((sum / count) * 100).toFixed(2)}%` : "--%";
  return dateValues;
}
