"use strict";

const byId = (id) => document.getElementById(id);
document.querySelectorAll(".compare input").forEach((slider) => {
  const frame = slider.closest(".compare");
  function updateSplit() {
    frame.style.setProperty("--split", slider.value + "%");
    slider.setAttribute("aria-valuetext", slider.value + "% measurement");
  }
  slider.addEventListener("input", updateSplit);
  updateSplit();
});

const viewerRow = byId("viewer-row");
const galleryControls = document.querySelector(".gallery-controls");
const back = galleryControls.querySelector('[data-browse="-1"]');
const next = galleryControls.querySelector('[data-browse="1"]');
const cards = Array.from(viewerRow.children);
function firstVisibleCard() {
  const left = viewerRow.getBoundingClientRect().left;
  return cards.reduce((nearest, card, index) =>
    Math.abs(card.getBoundingClientRect().left - left) <
    Math.abs(cards[nearest].getBoundingClientRect().left - left) ? index : nearest, 0);
}
function updateGalleryControls() {
  const remaining = viewerRow.scrollWidth - viewerRow.clientWidth - viewerRow.scrollLeft;
  galleryControls.hidden = viewerRow.scrollWidth <= viewerRow.clientWidth + 1;
  back.disabled = viewerRow.scrollLeft < 1;
  next.disabled = remaining < 1;
}
galleryControls.addEventListener("click", (event) => {
  const button = event.target.closest("[data-browse]");
  if (!button) return;
  const index = Math.max(0, Math.min(cards.length - 1, firstVisibleCard() + Number(button.dataset.browse)));
  const offset = cards[index].getBoundingClientRect().left - viewerRow.getBoundingClientRect().left;
  viewerRow.scrollBy({left: offset, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"});
});
viewerRow.addEventListener("scroll", updateGalleryControls, {passive: true});
window.addEventListener("resize", updateGalleryControls);
updateGalleryControls();

const figures = {
  natural: {
    path: "assets/pivot-reconstructions.png", width: 2000, height: 895,
    title: "Natural-image reconstructions",
    alt: "Measurements, competing reconstructions, PIVOT, and ground truth for four pixel and latent inverse problems",
    caption: "Pixel-space random inpainting and phase retrieval (left), and latent-space motion and nonlinear deblurring (right). Red boxes mark the enlarged regions."
  },
  mri: {
    path: "assets/mri-comparison.webp", width: 1971, height: 478,
    title: "Accelerated knee MRI",
    alt: "Target, PIVOT, DPS, DAPS, DDS, and FAST-DIPS reconstructions of the same knee, with PSNR annotations and matching magnified regions",
    caption: "Multi-coil fastMRI knee reconstruction at 8× acceleration. Green boxes mark the enlarged regions in the target and reconstructions."
  }
};

const figureButtons = document.querySelectorAll("[data-figure]");
figureButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const figure = figures[button.dataset.figure];
    const link = byId("paper-figure").querySelector("a");
    const image = link.querySelector("img");
    link.href = image.src = figure.path;
    image.alt = figure.alt;
    image.width = figure.width;
    image.height = figure.height;
    link.dataset.title = figure.title;
    link.setAttribute("aria-label", "Enlarge " + figure.title);
    byId("figure-caption").textContent = figure.caption;
    figureButtons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
  });
});

const dialog = byId("lightbox");
const zoom = byId("zoom-figure");
function setZoom(actualSize) {
  dialog.classList.toggle("actual-size", actualSize);
  zoom.setAttribute("aria-pressed", String(actualSize));
  zoom.textContent = actualSize ? "Fit to screen" : "Actual size";
}
document.querySelectorAll("[data-enlarge]").forEach((link) => {
  link.addEventListener("click", (event) => {
    if (!dialog.showModal || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const image = byId("lightbox-image");
    image.src = link.href;
    image.alt = link.querySelector("img").alt;
    byId("lightbox-title").textContent = link.dataset.title;
    setZoom(false);
    dialog.showModal();
    byId("close-lightbox").focus();
  });
});
zoom.addEventListener("click", () => setZoom(!dialog.classList.contains("actual-size")));
byId("close-lightbox").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});

const filters = ["dataset", "prior", "task"].map(byId);
function updateResults() {
  const [dataset, prior, task] = filters.map((field) => field.value);
  const data = window.PIVOT_BENCHMARKS[dataset][prior][task];
  const fragment = document.createDocumentFragment();
  for (const [method, ...metrics] of data) {
    const row = document.createElement("tr");
    if (method === "PIVOT") row.className = "pivot-row";
    const label = document.createElement("th");
    label.scope = "row";
    label.textContent = method;
    row.append(label);
    for (const value of metrics) {
      const cell = document.createElement("td");
      cell.textContent = value === null ? "—" : value.toFixed(3);
      row.append(cell);
    }
    fragment.append(row);
  }
  byId("bench-body").replaceChildren(fragment);
  const label = filters.map((field) => field.selectedOptions[0].textContent).join(", ");
  byId("result-caption").textContent = label;
  byId("table-announcement").textContent = label + ". " + data.length + " methods.";
}
filters.forEach((field) => field.addEventListener("change", updateResults));
updateResults();

function copyUsingSelection(text) {
  const helper = document.createElement("textarea");
  helper.value = text;
  helper.className = "sr-only";
  document.body.append(helper);
  helper.select();
  const copied = document.execCommand("copy");
  helper.remove();
  byId("copy").focus();
  return copied;
}
let resetCopy;
byId("copy").addEventListener("click", async () => {
  const text = byId("bib").textContent;
  let copied = false;
  try {
    await navigator.clipboard.writeText(text);
    copied = true;
  } catch {
    try { copied = copyUsingSelection(text); } catch { copied = false; }
  }
  if (!copied) {
    const range = document.createRange();
    range.selectNodeContents(byId("bib"));
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }
  byId("copy").textContent = copied ? "Copied" : "Citation selected";
  byId("copy-status").textContent = copied ? "BibTeX citation copied." : "BibTeX selected. Use your device’s copy command.";
  clearTimeout(resetCopy);
  resetCopy = setTimeout(() => {
    byId("copy").textContent = "Copy citation";
    byId("copy-status").textContent = "";
  }, 2200);
});
